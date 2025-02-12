import os
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

def process_file_group(group_name, group_config, full_base_dir, output_dir, header_prompt, footer_prompt):
    file_list = group_config.get("files", [])
    group_prompt = group_config.get("group_prompt", "")
    individual_prompt = group_config.get("individual_prompt", "")
    combined_files = ""
    for rel_path in file_list:
        file_path = find_file_in_subdirectories(full_base_dir, rel_path)
        if file_path and os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            # Note both the original name and the location where the file was found.
            combined_files += (
                f"{individual_prompt.format(file_name=rel_path)}\n\nFilename: {rel_path} (found at {file_path})\n{'-' * 20}\n{content}\n\n"
            )
        else:
            print(f"Warning: {rel_path} not found in {full_base_dir} or its subdirectories.")

    if not combined_files:
        print(f"No valid files found for group {group_name}. Skipping.")
        return

    # Determine output file name and path.
    safe_group_name = group_name.replace(" ", "_")
    output_file_name = f"group_{safe_group_name}.txt"
    full_output_dir = f"/var/kolo_data/{output_dir}"
    output_file_path = os.path.join(full_output_dir, output_file_name)

    # Create the necessary directories if they do not exist.
    os.makedirs(full_output_dir, exist_ok=True)

    # If the output file already exists, skip processing this group.
    if os.path.exists(output_file_path):
        print(f"Output file {output_file_path} already exists for group {group_name}. Skipping QA generation.")
        return

    # Build the QA prompt using the new configuration structure.
    qa_prompt = f"{header_prompt}\n\n{group_prompt.format(files_content=combined_files)}\n\n{footer_prompt}"

    try:
        qa_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": qa_prompt}],
        )
    except Exception as e:
        print(f"Error during QA call for group {group_name}: {e}")
        return

    qa_text = qa_response.choices[0].message.content.strip()

    # Save the QA output.
    with open(output_file_path, 'w', encoding='utf-8') as out_f:
        out_f.write(qa_text)

    # Save debug information (the exact prompt sent) to a separate file.
    debug_dir = os.path.join(full_output_dir, "debug")
    os.makedirs(debug_dir, exist_ok=True)
    debug_file_name = f"debug_group_{safe_group_name}.txt"
    debug_file_path = os.path.join(debug_dir, debug_file_name)
    with open(debug_file_path, 'w', encoding='utf-8') as debug_f:
        debug_f.write(qa_prompt)

    print(f"Processed group {group_name} -> {output_file_path}")
    print(f"Debug info saved to {debug_file_path}")

def main():
    # Process each allowed file group from the configuration.
    for group_name, group_config in allowed_file_groups.items():
        print(f"\nProcessing group: {group_name}")
        process_file_group(group_name, group_config, full_base_dir, output_dir, header_prompt, footer_prompt)

if __name__ == "__main__":
    main()
