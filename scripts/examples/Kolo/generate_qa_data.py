import os
from openai import OpenAI

# Initialize the OpenAI client (make sure to replace the API key with your own)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Define the base file groups with their associated files.
base_file_groups = {
    "BuildImage": ["BuildImage.txt", "build_image.ps1", "dockerfile", "supervisord.conf"],
    "RunContainer": ["RunContainer.txt", "create_and_run_container.ps1", "run_container.ps1"],
    "TrainUnsloth": ["TrainUnsloth.txt", "train_model_unsloth.ps1", "train.py"],
    "TrainTorchTune": ["TrainTorchTune.txt", "train_model_torchtune.ps1", "merge_lora.py", "convert_jsonl_to_json.py"],
    "InstallModel": ["InstallModel.txt", "install_model.ps1"],
    "ListModels": ["ListModels.txt", "list_models.ps1"],
    "UninstallModel": ["UninstallModel.txt", "uninstall_model.ps1"],
    "DeleteModel": ["DeleteModel.txt", "delete_model.ps1"],
    "CopyScripts": ["CopyScripts.txt", "copy_scripts.ps1"],
    "ConnectSSH": ["ConnectSSH.txt", "connect.ps1"],
    "README" : ["README.md"],
    "FineTuningGuide" : ["FineTuningGuide.md"]
}

# Specify how many times you want to run (or repeat) each file group.
num_iterations = 72

# Dynamically generate the allowed file groups dictionary with numeric suffixes.
allowed_file_groups = {}
for group_name, file_list in base_file_groups.items():
    for i in range(1, num_iterations + 1):
        key = f"{group_name}{i}"
        allowed_file_groups[key] = file_list

print("Allowed File Groups:")
print(allowed_file_groups)


def find_file_in_subdirectories(base_dir, file_relative_path):
    """
    Attempts to find a file starting from base_dir:
    1. First, check if the file exists at base_dir joined with the given relative path.
    2. If not found, search recursively through all subdirectories for a file matching the basename.
    Returns the full path if found; otherwise, returns None.
    """
    # First try the provided relative path.
    possible_path = os.path.join(base_dir, file_relative_path)
    if os.path.exists(possible_path):
        return possible_path

    # Search all subdirectories for the file (by matching its basename).
    target = os.path.basename(file_relative_path)
    for root, dirs, files in os.walk(base_dir):
        if target in files:
            return os.path.join(root, target)
    return None


def process_file_group(group_name, file_list, base_dir, output_dir):
    combined_files = ""
    for rel_path in file_list:
        file_path = find_file_in_subdirectories(base_dir, rel_path)
        if file_path and os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            # Note both the original name and where the file was found.
            combined_files += (
                f"Filename: {rel_path} (found at {file_path})\n{'-'*20}\n{content}\n\n"
            )
        else:
            print(f"Warning: {rel_path} not found in {base_dir} or its subdirectories.")

    if not combined_files:
        print(f"No valid files found for group {group_name}. Skipping.")
        return

    qa_prompt = f"""
Generate a FAQ using the following File Content that will help the user learn how to use the associated features and inner workings.

--- Files Content ---

{combined_files}

---

--- Output ---

Q:
A:

Q:
A:

Q:
A:

... (continue as needed)

---
"""
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
    safe_group_name = group_name.replace(" ", "_")
    output_file_name = f"group_{safe_group_name}.txt"
    output_file_path = os.path.join(output_dir, output_file_name)
    with open(output_file_path, 'w', encoding='utf-8') as out_f:
        out_f.write(qa_text)

    # Save debug information (the exact prompts sent) to a separate file.
    debug_dir = os.path.join(output_dir, "debug")
    os.makedirs(debug_dir, exist_ok=True)
    debug_file_name = f"debug_group_{safe_group_name}.txt"
    debug_file_path = os.path.join(debug_dir, debug_file_name)
    with open(debug_file_path, 'w', encoding='utf-8') as debug_f:
        debug_f.write(qa_prompt)
    
    print(f"Processed group {group_name} -> {output_file_path}")
    print(f"Debug info saved to {debug_file_path}")


def main():
    base_dir = "../../../"
    output_dir = "output"
    os.makedirs(output_dir, exist_ok=True)

    # Process each allowed group.
    for group_name, file_list in allowed_file_groups.items():
        print(f"\nProcessing group: {group_name}")
        process_file_group(group_name, file_list, base_dir, output_dir)


if __name__ == "__main__":
    main()
