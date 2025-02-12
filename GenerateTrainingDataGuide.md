# Generate Training Data Guide

## Overview

The **Kolo** project uses the following scripts and configuration file to generate and process QA data:

Copy over all your documents and files.

1. \*\*`copy_qa_input_generation.ps1 {directory}`
   Copies all files and subfolders in the specified directory into `/var/kolo_data/qa_generation_input`

2. **`generate_qa_config.yaml`**  
   Modify the config file to specify file groups, custom prompts and number of iterations. Open the config file to see an example which uses the Kolo project itself!

3. **`generate_qa_data.ps1 -OPENAI_API_KEY {your key}`**  
   This will generate QA data using Open AI's GPT-4o-mini

4. **`convert_qa_output.ps1`**  
   After generating the QA prompts. This command will convert the text files inside `/var/kolo_data/qa_generation_output` into training data JSON and JSONL format in `/app/`

5. You are now ready to run the `train_model_torchtune` or `train_model_unsloth` continue from the README guide.

### `generate_qa_config.yaml`

This YAML configuration file controls various aspects of the QA generation process.

#### **Directories:**

- `base_dir`: Location of the QA generation input files.
- `output_dir`: Directory where QA generation output and debug files are saved.

#### **Prompts:**

- `header_prompt`: Main prompt for instructions to generate QA data.
- `footer_prompt`: Promp that specifies the expected output format. DO NOT CHANGE THIS UNLESS YOU KNOW WHAT YOU ARE DOING!

#### **File Groups:**

Defines multiple file groups (e.g., `UninstallModel`, `BuildImage`, etc.) with:

- `iterations` The number of times you want GPT to generate QA data for the group.
- `files` The list of files you want to be sent to GPT for QA generation.
- `group_prompt` The unique prompt you want to be sent along with the group.
- `individual` The unique prompt you want to be sent for each file in the group. Mostly used to specify what you want GPT to do with the {file_name}
