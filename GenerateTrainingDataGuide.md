# Generate Training Data Guide

## Overview

The **Kolo** project uses the following scripts and configuration file to generate and process QA data:

Copy over all your documents and files.

1. Copies all files and subfolders in the specified directory into `/var/kolo_data/qa_generation_input`.
   ```bash
   ./copy_qa_input_generation.ps1 {directory}
   ```

2. Modify the config file to specify file groups, custom prompts, and the number of iterations.  
   Open the config file to see an example that uses the Kolo project itself!
   ```bash
   generate_qa_config.yaml
   ```

3. This will generate QA data using OpenAI's GPT-4o-mini. You must have a Open AI account and API key.
   ```bash
   ./generate_qa_data.ps1 -OPENAI_API_KEY {your key}
   ```

4. After generating the QA prompts, this command converts the text files inside  
   `/var/kolo_data/qa_generation_output` into training `data.jsonl` and `data.json` in `/app/`.
   ```bash
   convert_qa_output.ps1
   ```

5. You are now ready to run `train_model_torchtune` or `train_model_unsloth`.  
   Continue using the README guide.

---

## Generate QA Config File Details

This YAML configuration file controls various aspects of the QA generation process.

### **Directories:**

- `base_dir`: Location of the QA generation input files.
- `output_dir`: Directory where QA generation output and debug files are saved.

### **Prompts:**

- `header_prompt`: Main prompt for instructions to generate QA data.
- `footer_prompt`: Prompt that specifies the expected output format.  
  **DO NOT CHANGE FOOTER PROMPT UNLESS YOU KNOW WHAT YOU ARE DOING! IF YOU DO YOU MAY BREAK STEP (4) CONVERSION.**

### **File Groups:**

Defines multiple file groups with unique names. (e.g., `UninstallModel`, `BuildImage`, etc.):

- `iterations`: The number of times you want GPT to generate QA data for the group.
- `files`: The list of files you want to be sent to GPT for QA generation.
- `group_prompt`: The unique prompt you want to be sent along with the group.
- `individual`: The unique prompt you want to be sent for each file in the group.  
  Mostly used to specify what you want GPT to do with `{file_name}`.

See `generate_qa_config.yaml` for full config example.
