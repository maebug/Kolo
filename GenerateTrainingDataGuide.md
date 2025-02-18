# Generate Synthetic Training Data Guide

## Overview

The **Kolo** project uses the following scripts and configuration file to generate and process QA data:

1. The following command will copy over all subfolders, documents and files into `/var/kolo_data/qa_generation_input`.

   ```bash
   ./copy_qa_input_generation.ps1 "directory"
   ```

   If you are testing for the first time. Try copying the entire Kolo project by running this command.

   ```bash
   ./copy_qa_input_generation.ps1 "../"
   ```

1. Modify the [config file](https://github.com/MaxHastings/Kolo/blob/main/scripts/generate_qa_config.yaml) to specify file groups, custom prompts, and the number of iterations. If you are testing with Kolo project, leave the config file untouched.

1. Run the copy all scripts command. This will move the configuration file into Kolo.

   ```bash
   ./copy_scripts.ps1
   ```

1. This will generate QA data using the LLM provider and model you choose. In the config file you can choose whether to use `openai` or `ollama` and the specified model name. By default we use `openai` and the model `gpt-4o-mini`. When using the OpenAI provider you must pass in your API key when running the generating script.

   ```bash
   ./generate_qa_data.ps1 -OPENAI_API_KEY "your key"
   ```

1. After generating the QA prompts, this command converts the question and answer text files inside  
   `/var/kolo_data/qa_generation_output` into training data: `data.jsonl` and `data.json` in `/app/`.

   ```bash
   ./convert_qa_output.ps1
   ```

1. Your training data is now ready; continue by training your LLM using `./train_model_torchtune.ps1` or `./train_model_unsloth.ps1`.  
   Follow the README guide after this step.

---

# Config File Details

This YAML configuration file controls various aspects of the QA generation process.

## Global Settings

### Directories & Paths

- **`base_dir`**: Location of the QA generation input files.  
- **`output_dir`**: Directory where QA generation output and debug files are saved.  
- **`output_base_path`**: The base path for output files (e.g., `/var/kolo_data`).  

### Service Endpoints

- **`ollama_url`**: URL endpoint for the Ollama API (if used).  

## Providers

Define the API providers for generating both questions and answers. Each provider block specifies:

- **`provider`**: The service to use (e.g., OpenAI or Ollama).  
- **`model`**: The model to be used (e.g., `gpt-4o-mini`).  

## Prompts
All prompts are now organized under a single prompts section. They control the instructions provided to the LLM during QA generation.

Question Prompts
- **`question_prompt_header`**: The main header prompt instructing the LLM on how to generate a list of questions.
- **`question_prompt_footer`**: Defines the expected output format for questions.
NOTE: Changing this may break the conversion script.
- **`individual_question_prompt`**: A prompt that is used for each file in a group. Typically includes a `{file_name}` placeholder to refer to the specific file.
- **`group_question_prompt`**: A prompt that includes the `{files_content}` variable. You can place additional information around the file content if needed.
- **`answer_prompt_header`**: The prompt header instructing the LLM how to generate an answer based on each question.

See [generate_qa_config.yaml](https://github.com/MaxHastings/Kolo/blob/main/scripts/generate_qa_config.yaml) for a full config example.

## Debugging

If you run into issues, you can look at the debug folder inside `kolo_container` at `/var/kolo_data/qa_generation_output` using WinSCP. The debug text files will show you exactly what is being sent to the LLM during generation.
