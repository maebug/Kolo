import os
import re
import yaml
from openai import OpenAI

# Load configuration from YAML.
CONFIG_FILE = "generate_qa_config.yaml"
with open(CONFIG_FILE, "r", encoding="utf-8") as f:
    config = yaml.safe_load(f)

# Read values from the config.
base_dir = config.get("base_dir", "")
full_base_dir = f"/var/kolo_data/{base_dir}"
output_dir = config.get("output_dir", "output")
header_prompt = config.get("header_prompt", "")
footer_prompt = config.get("footer_prompt", "")
file_groups_config = config.get("file_groups", {})

# Initialize the OpenAI client (ensure your OPENAI_API_KEY environment variable is set)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Build allowed_file_groups with numeric suffixes for each group based on its own iterations.
allowed_file_groups = {}
for group_name, group_config in file_groups_config.items():
    iterations = group_config.get("iterations", 1)  # Default to 1 if not specified.
    for i in range(1, iterations + 1):
        key = f"{group_name}_{i}"
        allowed_file_groups[key] = group_config

print("File Groups:")
print(list(file_groups_config.items()))

def find_file_in_subdirectories(full_base_dir, file_relative_path):
    """
    Attempts to find a file starting from full_base_dir:
      1. First, check if the file exists at full_base_dir joined with the given relative path.
      2. If not found, search recursively through all subdirectories for a file matching the basename.
    Returns the full path if found; otherwise, returns None.
    """
    possible_path = os.path.join(full_base_dir, file_relative_path)
    if os.path.exists(possible_path):
        return possible_path

    # Search all subdirectories for the file (by matching its basename).
    target = os.path.basename(file_relative_path)
    for root, dirs, files in os.walk(full_base_dir):
        if target in files:
            return os.path.join(root, target)
    return None

def parse_questions(question_text):
    """
    Parses the GPT response containing questions. The expected format is:
    
    Some header text (possibly multiple lines)
    1. First question?
    2. Second question?
    ...
    
    This function uses a regular expression to extract the question text.
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

def process_file_group(group_name, group_config, full_base_dir, output_dir, header_prompt, footer_prompt):
    file_list = group_config.get("files", [])
    group_prompt = group_config.get("group_prompt", "")
    individual_prompt = group_config.get("individual_prompt", "")
    combined_files_with_prompts = ""
    combined_files = ""
    for rel_path in file_list:
        file_path = find_file_in_subdirectories(full_base_dir, rel_path)
        if file_path and os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            # For the first GPT call, include the individual prompt (with file name) in front.
            combined_files_with_prompts += f"{individual_prompt.format(file_name=rel_path)}\n\nFile: {rel_path}\n\n{content}\n\n"
            # For the second GPT call, prepend the file name before the content.
            combined_files += f"File: {rel_path}\n\n{content}\n\n"
        else:
            print(f"Warning: {rel_path} not found in {full_base_dir} or its subdirectories.")

    if not combined_files:
        print(f"No valid files found for group {group_name}. Skipping.")
        return

    # Prepare safe group name and base output paths.
    safe_group_name = group_name.replace(" ", "_")
    base_output_path = os.path.join("/var/kolo_data", output_dir)
    os.makedirs(base_output_path, exist_ok=True)

    # Define subdirectories.
    questions_dir = os.path.join(base_output_path, "questions")
    answers_dir = os.path.join(base_output_path, "answers")
    debug_dir = os.path.join(base_output_path, "debug")
    os.makedirs(questions_dir, exist_ok=True)
    os.makedirs(answers_dir, exist_ok=True)
    os.makedirs(debug_dir, exist_ok=True)

    # Build prompt to generate the list of questions.
    question_list_prompt = f"{header_prompt}\n\n{combined_files_with_prompts}\n\n{footer_prompt}"
    
    # Define file paths for storing questions and debug info.
    question_file_name = f"questions_{safe_group_name}.txt"
    question_file_path = os.path.join(questions_dir, question_file_name)
    debug_file_name = f"debug_{safe_group_name}_questions.txt"
    debug_file_path = os.path.join(debug_dir, debug_file_name)

    # Check if the questions file already exists.
    if os.path.exists(question_file_path):
        with open(question_file_path, 'r', encoding='utf-8') as q_f:
            question_list_text = q_f.read().strip()
        print(f"Questions file already exists for group {group_name}. Skipping question generation.")
    else:
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": question_list_prompt}],
            )
        except Exception as e:
            print(f"Error during QA call for group {group_name}: {e}")
            return

        question_list_text = response.choices[0].message.content.strip()

        # Save the full question output in the questions folder.
        with open(question_file_path, 'w', encoding='utf-8') as q_f:
            q_f.write(question_list_text)

        # Save debug information (the exact prompt sent) to the debug folder.
        with open(debug_file_path, 'w', encoding='utf-8') as debug_f:
            debug_f.write(question_list_prompt)

        print(f"Processed group {group_name} -> Questions saved to {question_file_path}")
        print(f"Debug info saved to {debug_file_path}")

    # --- Process each question individually ---
    questions = parse_questions(question_list_text)
    if not questions:
        print(f"No valid questions found in group {group_name} output.")
        return

    for idx, question in enumerate(questions, start=1):
        answer_file_name = f"answer_{safe_group_name}_{idx}.txt"
        answer_file_path = os.path.join(answers_dir, answer_file_name)
        debug_answer_file_name = f"debug_{safe_group_name}_answer_{idx}.txt"
        debug_answer_file_path = os.path.join(debug_dir, debug_answer_file_name)
        
        # Skip generating answer if it already exists.
        if os.path.exists(answer_file_path):
            print(f"Answer for question {idx} in group {group_name} already exists. Skipping.")
            continue

        # Create a new prompt that includes only the file contents (with file names) and the individual question.
        individual_question_prompt = f"{combined_files}\n\n{question}"
        try:
            answer_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": individual_question_prompt}],
            )
        except Exception as e:
            print(f"Error during answer call for question {idx} in group {group_name}: {e}")
            continue

        answer_text = answer_response.choices[0].message.content.strip()
        with open(answer_file_path, 'w', encoding='utf-8') as answer_f:
            answer_f.write(answer_text)

        # Save the individual prompt for debugging.
        with open(debug_answer_file_path, 'w', encoding='utf-8') as debug_ans_f:
            debug_ans_f.write(individual_question_prompt)

        print(f"Saved answer for question {idx} in group {group_name} -> {answer_file_path}")

def main():
    # Process each allowed file group from the configuration.
    for group_name, group_config in allowed_file_groups.items():
        print(f"\nProcessing group: {group_name}")
        process_file_group(group_name, group_config, full_base_dir, output_dir, header_prompt, footer_prompt)

if __name__ == "__main__":
    main()
