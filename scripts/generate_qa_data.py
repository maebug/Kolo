import os
import re
import yaml
import argparse
import json
import requests
from openai import OpenAI

# --- Helper Function to Call the API ---

def call_api(provider, model, prompt, ollama_config=None):
    """
    Calls the appropriate API (OpenAI or Ollama) using the selected model and prompt.
    For OpenAI, uses the provided API key.
    For Ollama, makes an HTTP request to the local or cloud endpoint.
    """
    if provider == "openai":
        # Use the OpenAI client.
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"OpenAI API error: {e}")
            return None

    elif provider == "ollama":

        url = ollama_config.get("url")
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,  # Disable streaming responses.
            "options": {}  # Include any additional options if needed.
        }
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            # Use the "response" key, as non-streaming returns a single JSON with "response"
            return result.get("response", "").strip()
        except Exception as e:
            print(f"Ollama API error: {e}")
            return None


    else:
        print("Unknown provider specified.")
        return None

# --- Utility Functions ---

def find_file_in_subdirectories(full_base_dir, file_relative_path):
    """
    Attempts to find a file starting from full_base_dir:
      1. Check if the file exists at full_base_dir joined with the given relative path.
      2. If not, search recursively through subdirectories for a file matching the basename.
    Returns the full path if found; otherwise, returns None.
    """
    possible_path = os.path.join(full_base_dir, file_relative_path)
    if os.path.exists(possible_path):
        return possible_path

    target = os.path.basename(file_relative_path)
    for root, dirs, files in os.walk(full_base_dir):
        if target in files:
            return os.path.join(root, target)
    return None

def parse_questions(question_text):
    """
    Parses GPT response containing questions.
    Expected format: numbered questions (one per line).
    Returns a list of question strings.
    """
    pattern = re.compile(r"^\s*\d+\.\s*(.+)$")
    questions = []
    for line in question_text.splitlines():
        match = pattern.match(line)
        if match:
            question = match.group(1).strip()
            if question:
                questions.append(question)
    return questions

# --- Main Processing Function ---

def process_file_group(group_name, group_config, full_base_dir, base_output_path,
                         header_prompt, footer_prompt, default_individual_prompt,
                         default_group_prompt, default_answer_prompt,
                         provider, openai_models, ollama_config):
    file_list = group_config.get("files", [])
    group_prompts = group_config.get("prompts", {})

    # Retrieve prompts for this file group, falling back to defaults.
    group_prompt_template = group_prompts.get("group", default_group_prompt)
    individual_prompt_template = group_prompts.get("individual", default_individual_prompt)
    answer_prompt_template = group_prompts.get("answer", default_answer_prompt)

    combined_files_with_prompts = ""
    combined_files = ""
    for rel_path in file_list:
        file_path = find_file_in_subdirectories(full_base_dir, rel_path)
        if file_path and os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            # Build prompt for question generation.
            combined_files_with_prompts += f"{individual_prompt_template.format(file_name=rel_path)}\n\nFile: {rel_path}\n\n{content}\n\n"
            # Build combined file content for answer generation.
            combined_files += f"File: {rel_path}\n\n{content}\n\n"
        else:
            print(f"Warning: {rel_path} not found in {full_base_dir} or its subdirectories.")

    if not combined_files:
        print(f"No valid files found for group {group_name}. Skipping.")
        return

    # Prepare output directories.
    safe_group_name = group_name.replace(" ", "_")
    base_group_output = os.path.join(base_output_path, "qa_generation_output")
    os.makedirs(base_group_output, exist_ok=True)
    questions_dir = os.path.join(base_group_output, "questions")
    answers_dir = os.path.join(base_group_output, "answers")
    debug_dir = os.path.join(base_group_output, "debug")
    os.makedirs(questions_dir, exist_ok=True)
    os.makedirs(answers_dir, exist_ok=True)
    os.makedirs(debug_dir, exist_ok=True)

    # Build prompt for generating questions.
    files_content = combined_files_with_prompts  
    question_list_prompt = f"{header_prompt}\n\n{files_content}\n\n{footer_prompt}"
    
    question_file_name = f"questions_{safe_group_name}.txt"
    question_file_path = os.path.join(questions_dir, question_file_name)
    debug_file_name = f"debug_{safe_group_name}_questions.txt"
    debug_file_path = os.path.join(debug_dir, debug_file_name)

    # Determine which model to use for question generation.
    if provider == "openai":
        question_model = openai_models.get("question_model")
    else:  # provider == "ollama"
        question_model = ollama_config.get("question_model")

    # Generate questions if they don't already exist.
    if os.path.exists(question_file_path):
        with open(question_file_path, 'r', encoding='utf-8') as q_f:
            question_list_text = q_f.read().strip()
        print(f"Questions file already exists for group {group_name}. Skipping question generation.")
    else:
        question_list_text = call_api(provider, question_model, question_list_prompt, ollama_config=ollama_config)
        if not question_list_text:
            print(f"Failed to generate questions for group {group_name}.")
            return
        with open(question_file_path, 'w', encoding='utf-8') as q_f:
            q_f.write(question_list_text)
        with open(debug_file_path, 'w', encoding='utf-8') as debug_f:
            debug_f.write(question_list_prompt)
        print(f"Processed group {group_name} -> Questions saved to {question_file_path}")
        print(f"Debug info saved to {debug_file_path}")

    # Parse questions.
    questions = parse_questions(question_list_text)
    if not questions:
        print(f"No valid questions found in group {group_name} output.")
        return

    # Process each question to generate an answer.
    for idx, question in enumerate(questions, start=1):
        answer_file_name = f"answer_{safe_group_name}_{idx}.txt"
        answer_file_path = os.path.join(answers_dir, answer_file_name)
        debug_answer_file_name = f"debug_{safe_group_name}_answer_{idx}.txt"
        debug_answer_file_path = os.path.join(debug_dir, debug_answer_file_name)
        
        if os.path.exists(answer_file_path):
            print(f"Answer for question {idx} in group {group_name} already exists. Skipping.")
            continue

        # Build the prompt for answer generation.
        individual_answer_prompt = f"{combined_files}\n\n{answer_prompt_template.format(file_name='[customizable]')}\n\n{question}"
        
        # Determine which model to use for answer generation.
        if provider == "openai":
            answer_model = openai_models.get("answer_model")
        else:  # provider == "ollama"
            answer_model = ollama_config.get("answer_model")

        answer_text = call_api(provider, answer_model, individual_answer_prompt, ollama_config=ollama_config)
        if not answer_text:
            print(f"Failed to generate answer for question {idx} in group {group_name}.")
            continue

        with open(answer_file_path, 'w', encoding='utf-8') as answer_f:
            answer_f.write(answer_text)
        with open(debug_answer_file_path, 'w', encoding='utf-8') as debug_ans_f:
            debug_ans_f.write(individual_answer_prompt)
        print(f"Saved answer for question {idx} in group {group_name} -> {answer_file_path}")

# --- Main Script ---

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate QA data for LLM fine-tuning.")
    parser.add_argument("--config", default="generate_qa_config.yaml", help="Path to configuration YAML file")
    args = parser.parse_args()

    # Load configuration.
    with open(args.config, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # Global settings.
    global_config = config.get("global", {})
    base_dir = global_config.get("base_dir", "")
    output_dir = global_config.get("output_dir", "output")
    output_base_path = global_config.get("output_base_path", "/var/kolo_data")
    full_base_dir = os.path.join(output_base_path, base_dir)

    provider = global_config.get("provider", "openai")
    openai_models = global_config.get("openai", {})
    ollama_config = global_config.get("ollama", {})

    # Load prompt templates.
    prompts_config = config.get("prompts", {})
    header_prompt = prompts_config.get("header", "")
    footer_prompt = prompts_config.get("footer", "")
    default_individual_prompt = prompts_config.get("default_individual", "")
    default_group_prompt = prompts_config.get("default_group", "")
    default_answer_prompt = prompts_config.get("default_answer", "Based on the content provided, answer the following question in detail.")

    # File groups.
    file_groups_config = config.get("file_groups", {})

    # Initialize OpenAI client if provider is OpenAI.
    if provider == "openai":
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # Build allowed file groups with numeric suffixes.
    allowed_file_groups = {}
    for group_name, group_config in file_groups_config.items():
        iterations = group_config.get("iterations", 1)
        for i in range(1, iterations + 1):
            key = f"{group_name}_{i}"
            allowed_file_groups[key] = group_config

    # Process each file group.
    for group_name, group_config in allowed_file_groups.items():
        print(f"\nProcessing group: {group_name}")
        process_file_group(
            group_name=group_name,
            group_config=group_config,
            full_base_dir=full_base_dir,
            base_output_path=output_base_path,
            header_prompt=header_prompt,
            footer_prompt=footer_prompt,
            default_individual_prompt=default_individual_prompt,
            default_group_prompt=default_group_prompt,
            default_answer_prompt=default_answer_prompt,
            provider=provider,
            openai_models=openai_models,
            ollama_config=ollama_config,
        )
