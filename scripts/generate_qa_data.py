import os
import re
import yaml
import argparse
import requests
from openai import OpenAI

# --- Helper Function to Call the API ---

def call_api(provider, model, prompt, global_ollama_url=None):
    """
    Calls the appropriate API (OpenAI or Ollama) using the selected model and prompt.
    For OpenAI, uses the provided API key.
    For Ollama use global_ollama_url.
    """
    if provider == "openai":
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
        url = global_ollama_url
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {}
        }
        try:
            response = requests.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            return result.get("response", "").strip()
        except Exception as e:
            print(f"Ollama API error: {e}")
            return None

    else:
        print("Unknown provider specified.")
        return None

# --- Utility Functions ---

def find_file_in_subdirectories(full_base_dir, file_relative_path):
    possible_path = os.path.join(full_base_dir, file_relative_path)
    if os.path.exists(possible_path):
        return possible_path

    target = os.path.basename(file_relative_path)
    for root, dirs, files in os.walk(full_base_dir):
        if target in files:
            return os.path.join(root, target)
    return None

def parse_questions(question_text):
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
                         question_provider_config, answer_provider_config,
                         global_ollama_url):
    file_list = group_config.get("files", [])
    group_prompts = group_config.get("prompts", {})

    # Use defaults if not overridden
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
            combined_files_with_prompts += f"{individual_prompt_template.format(file_name=rel_path)}\n\nFile: {rel_path}\n\n{content}\n\n"
            combined_files += f"File: {rel_path}\n\n{content}\n\n"
        else:
            print(f"Warning: {rel_path} not found in {full_base_dir} or its subdirectories.")

    if not combined_files:
        print(f"No valid files found for group {group_name}. Skipping.")
        return

    # Prepare output directories.
    base_group_output = os.path.join(base_output_path, "qa_generation_output")
    questions_dir = os.path.join(base_group_output, "questions")
    answers_dir = os.path.join(base_group_output, "answers")
    debug_dir = os.path.join(base_group_output, "debug")
    os.makedirs(questions_dir, exist_ok=True)
    os.makedirs(answers_dir, exist_ok=True)
    os.makedirs(debug_dir, exist_ok=True)

    # Build prompt for generating questions.
    files_content = combined_files_with_prompts  
    question_list_prompt = f"{header_prompt}\n\n{files_content}\n\n{footer_prompt}"

    # Hard-coded file naming conventions.
    question_group_filename = f"questions_{group_name}.txt"
    question_debug_filename = f"debug_{group_name}_questions.txt"
    question_file_path = os.path.join(questions_dir, question_group_filename)
    question_debug_path = os.path.join(debug_dir, question_debug_filename)

    # Generate questions if they don't already exist.
    if os.path.exists(question_file_path):
        with open(question_file_path, 'r', encoding='utf-8') as q_f:
            question_list_text = q_f.read().strip()
        print(f"Questions file already exists for group {group_name}. Skipping question generation.")
    else:
        question_list_text = call_api(
            question_provider_config["provider"],
            question_provider_config["model"],
            question_list_prompt,
            global_ollama_url=global_ollama_url
        )
        if not question_list_text:
            print(f"Failed to generate questions for group {group_name}.")
            return
        with open(question_file_path, 'w', encoding='utf-8') as q_f:
            q_f.write(question_list_text)
        with open(question_debug_path, 'w', encoding='utf-8') as debug_f:
            debug_f.write(question_list_prompt)
        print(f"Processed group {group_name} -> Questions saved to {question_file_path}")
        print(f"Debug info saved to {question_debug_path}")

    # Parse questions.
    questions = parse_questions(question_list_text)
    if not questions:
        print(f"No valid questions found in group {group_name} output.")
        return

    # Process each question to generate an answer.
    for idx, question in enumerate(questions, start=1):
        answer_filename = f"answer_{group_name}_{idx}.txt"
        answer_debug_filename = f"debug_{group_name}_answer_{idx}.txt"
        answer_file_path = os.path.join(answers_dir, answer_filename)
        answer_debug_path = os.path.join(debug_dir, answer_debug_filename)
        
        if os.path.exists(answer_file_path):
            print(f"Answer for question {idx} in group {group_name} already exists. Skipping.")
            continue

        individual_answer_prompt = f"{combined_files}\n\n{answer_prompt_template.format(file_name='[customizable]')}\n\n{question}"

        answer_text = call_api(
            answer_provider_config["provider"],
            answer_provider_config["model"],
            individual_answer_prompt,
            global_ollama_url=global_ollama_url
        )
        if not answer_text:
            print(f"Failed to generate answer for question {idx} in group {group_name}.")
            continue

        with open(answer_file_path, 'w', encoding='utf-8') as answer_f:
            answer_f.write(answer_text)
        with open(answer_debug_path, 'w', encoding='utf-8') as debug_ans_f:
            debug_ans_f.write(individual_answer_prompt)
        print(f"Saved answer for question {idx} in group {group_name} -> {answer_file_path}")

# --- Main Script ---

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate QA data for LLM fine-tuning.")
    parser.add_argument("--config", default="generate_qa_config.yaml", help="Path to configuration YAML file")
    args = parser.parse_args()

    with open(args.config, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # Global settings.
    global_config = config.get("global", {})
    base_dir = global_config.get("base_dir", "")
    output_dir = global_config.get("output_dir", "output")
    output_base_path = global_config.get("output_base_path", "/var/kolo_data")
    full_base_dir = os.path.join(output_base_path, base_dir)
    global_ollama_url = global_config.get("ollama_url", "http://localhost:11434/api/generate")

    # Provider settings.
    question_provider_config = config.get("providers", {}).get("question", {})
    answer_provider_config = config.get("providers", {}).get("answer", {})

    # Prompt templates.
    prompts_config = config.get("prompts", {})
    header_prompt = prompts_config.get("header", "")
    footer_prompt = prompts_config.get("footer", "")
    default_individual_prompt = prompts_config.get("individual", "")
    default_group_prompt = prompts_config.get("group", "")
    default_answer_prompt = prompts_config.get("answer", "Based on the content provided, answer the following question in detail.")

    # File groups.
    file_groups_config = config.get("file_groups", {})

    # Initialize OpenAI client if needed.
    if (question_provider_config.get("provider") == "openai" or 
        answer_provider_config.get("provider") == "openai"):
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # Expand file groups by iterations.
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
            question_provider_config=question_provider_config,
            answer_provider_config=answer_provider_config,
            global_ollama_url=global_ollama_url
        )
