import os
import re
import yaml
import argparse
import requests
import hashlib
import logging
import random
import time
from pathlib import Path
from typing import Optional, List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

# Initialize logging.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None
    logger.warning("OpenAI package not installed; openai provider will not work.")

# --- Helper Functions ---
def call_api(
    provider: str,
    model: str,
    prompt: str,
    global_ollama_url: Optional[str] = None,
    client: Optional[Any] = None
) -> Optional[str]:
    """
    Calls the appropriate API (OpenAI or Ollama) using the selected model and prompt.
    Implements an exponential backoff strategy for handling transient failures.
    """
    max_retries = 5
    backoff_factor = 1  # Base backoff time in seconds

    if provider.lower() == "openai":
        if client is None:
            logger.error("OpenAI client is not initialized.")
            return None

        attempt = 0
        while attempt <= max_retries:
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                )
                return response.choices[0].message.content.strip()
            except Exception as e:
                logger.error(f"OpenAI API error on attempt {attempt+1}/{max_retries}: {e}")
                if attempt == max_retries:
                    return None
                sleep_time = backoff_factor * (2 ** attempt) + random.uniform(0, 1)
                logger.info(f"Retrying OpenAI API call in {sleep_time:.2f} seconds...")
                time.sleep(sleep_time)
                attempt += 1

    elif provider.lower() == "ollama":
        if not global_ollama_url:
            logger.error("Global Ollama URL is not provided.")
            return None

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {}
        }
        attempt = 0
        while attempt <= max_retries:
            try:
                response = requests.post(global_ollama_url, json=payload)
                response.raise_for_status()
                result = response.json()
                return result.get("response", "").strip()
            except Exception as e:
                logger.error(f"Ollama API error on attempt {attempt+1}/{max_retries}: {e}")
                if attempt == max_retries:
                    return None
                sleep_time = backoff_factor * (2 ** attempt) + random.uniform(0, 1)
                logger.info(f"Retrying Ollama API call in {sleep_time:.2f} seconds...")
                time.sleep(sleep_time)
                attempt += 1

    else:
        logger.error("Unknown provider specified.")
        return None

def find_file_in_subdirectories(base_dir: Path, relative_path: str) -> Optional[Path]:
    """
    Attempts to locate a file by its relative path in base_dir or its subdirectories.
    """
    possible_path = base_dir / relative_path
    if possible_path.exists():
        return possible_path

    target = Path(relative_path).name
    for path in base_dir.rglob(target):
        if path.is_file():
            return path
    return None

def parse_questions(question_text: str) -> List[str]:
    questions = []
    for line in question_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        # Remove leading numbering or bullets (like "1.", "-", "+", or "*")
        cleaned = re.sub(r'^[\d\.\-\+\*]+\s*', '', stripped)
        # Remove extra asterisks used for formatting
        cleaned = re.sub(r'\*+', '', cleaned).strip()
        # Check if this looks like a question
        if '?' in cleaned:
            questions.append(cleaned)
    return questions

def get_hash(text: str) -> str:
    """Returns the SHA-256 hash of the given text."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def write_text_to_file(file_path: Path, text: str) -> None:
    """Writes text to a file ensuring the parent directory exists."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(text, encoding="utf-8")

def read_text_from_file(file_path: Path) -> str:
    """Reads and returns text from a file."""
    return file_path.read_text(encoding="utf-8")

def build_files_prompt(file_list: List[str], base_dir: Path, template: str) -> str:
    """
    Build a combined prompt string for question generation by iterating over a list of files
    using the provided individual prompt template.
    """
    combined = ""
    for rel_path in file_list:
        file_path = find_file_in_subdirectories(base_dir, rel_path)
        if file_path and file_path.exists():
            content = file_path.read_text(encoding="utf-8")
            combined += f"{template.format(file_name=rel_path)}\n\n{content}\n\n"
        else:
            logger.warning(f"{rel_path} not found in {base_dir} or its subdirectories.")
    return combined

def build_files_content(file_list: List[str], base_dir: Path) -> str:
    """
    Build a combined content string for answer generation by iterating over a list of files.
    """
    combined = ""
    for rel_path in file_list:
        file_path = find_file_in_subdirectories(base_dir, rel_path)
        if file_path and file_path.exists():
            content = file_path.read_text(encoding="utf-8")
            combined += f"File: {rel_path}\n\n{content}\n\n"
        else:
            logger.warning(f"{rel_path} not found in {base_dir} or its subdirectories.")
    return combined

# --- Main Processing Function ---
def process_file_group(
    group_name: str,
    group_config: Dict[str, Any],
    full_base_dir: Path,
    base_output_path: Path,
    question_prompt_headers: List[str],
    global_footer_prompt: str,
    default_individual_prompt: str,
    default_group_prompt: str,
    default_answer_prompt: str,
    question_provider_config: Dict[str, Any],
    answer_provider_config: Dict[str, Any],
    global_ollama_url: Optional[str],
    openai_client: Optional[Any] = None,
    answer_workers: int = 1  # New parameter for answer generation concurrency.
) -> None:
    """
    Processes a group of files to generate questions and answers using LLM providers.
    Selects a header prompt based on the iteration number extracted from the group name.
    """
    file_list: List[str] = group_config.get("files", [])
    group_prompts = group_config.get("prompts", {})

    # Use the individual prompt template from config.
    individual_prompt_template = group_prompts.get("individual_question_prompt", default_individual_prompt)
    group_prompt_template = group_prompts.get("group_question_prompt", default_group_prompt)
    answer_prompt_template = group_prompts.get("answer_prompt", default_answer_prompt)

    # --- Determine header prompt based on iteration ---
    try:
        iteration = int(group_name.split('_')[-1])
        header_prompt = question_prompt_headers[(iteration - 1) % len(question_prompt_headers)]
    except Exception as e:
        logger.warning(f"Could not determine iteration for group {group_name}: {e}")
        header_prompt = question_prompt_headers[0] if question_prompt_headers else ""

    # --- Randomize file order for question generation ---
    file_list_for_questions = file_list.copy()
    random.shuffle(file_list_for_questions)
    logger.info(f"[Group: {group_name}] File order for question generation: {file_list_for_questions}")
    combined_files_with_prompts = build_files_prompt(file_list_for_questions, full_base_dir, individual_prompt_template)

    # Compute file references for use in the footer prompt.
    file_references = ', '.join(f'"{f}"' for f in file_list_for_questions)

    # Use group-level footer override if provided, otherwise use global footer prompt.
    footer_prompt_template = group_config.get("question_prompt_footer", global_footer_prompt)
    formatted_footer_prompt = footer_prompt_template.format(file_references=file_references)

    # Build the final prompt for generating questions.
    question_list_prompt = (
        f"{header_prompt}\n\n"
        f"{group_prompt_template.format(files_content=combined_files_with_prompts)}\n\n"
        f"{formatted_footer_prompt}"
    )

    # Define directories.
    output_dir = base_output_path / "qa_generation_output"
    questions_dir = output_dir / "questions"
    answers_dir = output_dir / "answers"
    debug_dir = output_dir / "debug"
    questions_dir.mkdir(parents=True, exist_ok=True)
    answers_dir.mkdir(parents=True, exist_ok=True)
    debug_dir.mkdir(parents=True, exist_ok=True)

    question_file_path = questions_dir / f"questions_{group_name}.txt"
    question_debug_path = debug_dir / f"debug_{group_name}_questions.txt"

    # Generate questions if they don't already exist.
    if question_file_path.exists():
        question_list_text = read_text_from_file(question_file_path).strip()
        logger.info(f"[Group: {group_name}] Questions file already exists. Using existing questions.")
    else:
        question_list_text = call_api(
            provider=question_provider_config["provider"],
            model=question_provider_config["model"],
            prompt=question_list_prompt,
            global_ollama_url=global_ollama_url,
            client=openai_client,
        )
        if not question_list_text:
            logger.error(f"[Group: {group_name}] Failed to generate questions.")
            return
        write_text_to_file(question_file_path, question_list_text)
        write_text_to_file(question_debug_path, question_list_prompt)
        logger.info(f"[Group: {group_name}] Questions saved to {question_file_path}")
        logger.info(f"[Group: {group_name}] Debug info saved to {question_debug_path}")

    # Parse questions.
    questions = parse_questions(question_list_text)
    if not questions:
        logger.error(f"[Group: {group_name}] No valid questions found in output.")
        return

    total_questions = len(questions)
    logger.info(f"[Group: {group_name}] Found {total_questions} questions. Beginning answer generation...")

    # --- Multi-threaded answer generation ---
    def process_question(idx: int, question: str) -> None:
        logger.info(f"[Group: {group_name}] Processing question {idx}/{total_questions}: {question}")

        answer_filename = f"answer_{group_name}_{idx}.txt"
        answer_debug_filename = f"debug_{group_name}_answer_{idx}.txt"
        meta_filename = f"answer_{group_name}_{idx}.meta"

        answer_file_path = answers_dir / answer_filename
        answer_debug_path = debug_dir / answer_debug_filename
        meta_file_path = answers_dir / meta_filename

        current_hash = get_hash(question)
        regenerate = True

        if answer_file_path.exists():
            if meta_file_path.exists():
                stored_hash = read_text_from_file(meta_file_path).strip()
                if stored_hash == current_hash:
                    logger.info(f"[Group: {group_name}] Answer {idx} is up-to-date. Skipping regeneration.")
                    regenerate = False
                else:
                    logger.info(f"[Group: {group_name}] Question {idx} has changed. Regenerating answer.")
            else:
                write_text_to_file(meta_file_path, current_hash)
                logger.info(f"[Group: {group_name}] Meta file created for answer {idx}. Skipping regeneration.")
                regenerate = False

        if not answer_file_path.exists():
            logger.info(f"[Group: {group_name}] Generating answer for question {idx}.")

        if not regenerate:
            return

        # --- Randomize file order for answer generation ---
        file_list_for_answers = file_list.copy()
        random.shuffle(file_list_for_answers)
        logger.info(f"[Group: {group_name}] File order for answer generation (question {idx}): {file_list_for_answers}")
        combined_files = build_files_content(file_list_for_answers, full_base_dir)

        individual_answer_prompt = (
            f"{combined_files}\n\n"
            f"{answer_prompt_template.format(question=question)}"
        )

        answer_text = call_api(
            provider=answer_provider_config["provider"],
            model=answer_provider_config["model"],
            prompt=individual_answer_prompt,
            global_ollama_url=global_ollama_url,
            client=openai_client,
        )
        if not answer_text:
            logger.error(f"[Group: {group_name}] Failed to generate answer for question {idx}.")
            return

        write_text_to_file(answer_file_path, answer_text)
        write_text_to_file(answer_debug_path, individual_answer_prompt)
        write_text_to_file(meta_file_path, current_hash)
        logger.info(f"[Group: {group_name}] Saved answer for question {idx} -> {answer_file_path}")

    # Use a ThreadPoolExecutor for answer generation with configurable workers.
    with ThreadPoolExecutor(max_workers=answer_workers) as executor:
        futures = [
            executor.submit(process_question, idx, question)
            for idx, question in enumerate(questions, start=1)
        ]
        for future in as_completed(futures):
            future.result()

# --- Main Script ---
def main() -> None:
    parser = argparse.ArgumentParser(description="Generate QA data for LLM fine-tuning.")
    parser.add_argument("--config", default="generate_qa_config.yaml", help="Path to configuration YAML file")
    parser.add_argument("--group-workers", type=int, default=8, help="Max workers for processing file groups")
    parser.add_argument("--answer-workers", type=int, default=4, help="Max workers for answer generation")
    args = parser.parse_args()

    config_path = Path(args.config)
    if not config_path.exists():
        logger.error(f"Configuration file not found: {config_path}")
        return

    config = yaml.safe_load(config_path.read_text(encoding="utf-8"))

    # Global settings.
    global_config = config.get("global", {})
    base_dir = global_config.get("base_dir", "")
    output_dir = global_config.get("output_dir", "output")
    output_base_path = Path(global_config.get("output_base_path", "/var/kolo_data"))
    full_base_dir = output_base_path / base_dir
    global_ollama_url = global_config.get("ollama_url", "http://localhost:11434/api/generate")

    # Provider settings.
    question_provider_config = config.get("providers", {}).get("question", {})
    answer_provider_config = config.get("providers", {}).get("answer", {})

    # Prompt templates.
    prompts_config = config.get("prompts", {})
    # Load the list of question prompt headers.
    question_prompt_headers = prompts_config.get("question_prompt_headers", [])
    global_footer_prompt = prompts_config.get("question_prompt_footer", "")
    default_individual_prompt = prompts_config.get("individual_question_prompt", "")
    default_group_prompt = prompts_config.get("group_question_prompt", "{files_content}")
    default_answer_prompt = prompts_config.get(
        "answer_prompt",
        "Based on the file content provided, answer the following question in detail: {answer}"
    )

    # File groups.
    file_groups_config = config.get("file_groups", {})

    # Initialize OpenAI client if needed.
    openai_client = None
    if (question_provider_config.get("provider", "").lower() == "openai" or 
        answer_provider_config.get("provider", "").lower() == "openai"):
        if OpenAI is None:
            logger.error("OpenAI client cannot be initialized because the package is missing.")
        else:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                logger.error("OPENAI_API_KEY environment variable not set.")
            else:
                openai_client = OpenAI(api_key=api_key)

    # Expand file groups by iterations.
    allowed_file_groups = {}
    for group_name, group_config in file_groups_config.items():
        iterations = group_config.get("iterations", 1)
        for i in range(1, iterations + 1):
            key = f"{group_name}_{i}"
            allowed_file_groups[key] = group_config

    total_groups = len(allowed_file_groups)
    logger.info(f"Starting processing of {total_groups} file groups.")

    # Process each file group concurrently using the provided group_workers value.
    with ThreadPoolExecutor(max_workers=args.group_workers) as executor:
        futures = [
            executor.submit(
                process_file_group,
                group_name=group_name,
                group_config=group_config,
                full_base_dir=full_base_dir,
                base_output_path=output_base_path,
                question_prompt_headers=question_prompt_headers,
                global_footer_prompt=global_footer_prompt,
                default_individual_prompt=default_individual_prompt,
                default_group_prompt=default_group_prompt,
                default_answer_prompt=default_answer_prompt,
                question_provider_config=question_provider_config,
                answer_provider_config=answer_provider_config,
                global_ollama_url=global_ollama_url,
                openai_client=openai_client,
                answer_workers=args.answer_workers
            )
            for group_name, group_config in allowed_file_groups.items()
        ]
        for future in as_completed(futures):
            future.result()

    logger.info("All file groups have been processed.")

if __name__ == "__main__":
    main()
