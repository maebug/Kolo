from transformers import AutoModelForCausalLM, AutoTokenizer
import os
import argparse

def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lora_model", type=str, required=True)
    parser.add_argument("--merged_model", type=str, required=True)
    # Optional quantization parameter; if provided, a separate model file is created.
    parser.add_argument("--quantization", type=str, default="")
    return parser.parse_args()

def rename_adapter_config(lora_model_path):
    original_config_path = os.path.join(lora_model_path, "adapter_config.json")
    new_config_path = os.path.join(lora_model_path, "adapter.config.invalidateCauseHuggingFaceABitch")
    
    if os.path.exists(original_config_path):
        try:
            os.rename(original_config_path, new_config_path)
            print(f"Renamed '{original_config_path}' to '{new_config_path}'.")
        except Exception as e:
            print(f"Error renaming the adapter config file: {e}")
    else:
        print(f"No adapter_config.json found at '{original_config_path}'. Skipping rename.")

def create_modelfile(file_path, from_line):
    # Define the template block to be added.
    template = '''TEMPLATE """{{- if .System }}<|start_header_id|>system<|end_header_id|>

{{ .System }}<|eot_id|>
{{- end }}
{{- range .Messages }}<|start_header_id|>{{ .Role }}<|end_header_id|>

{{ .Content }}<|eot_id|>
{{- end }}<|start_header_id|>assistant<|end_header_id|>

"""'''
    try:
        with open(file_path, "w") as f:
            f.write(f"FROM {from_line}\n")
            f.write(template)
        print(f"Created modelfile at {file_path}")
    except Exception as e:
        print(f"Error creating modelfile at {file_path}: {e}")

def main():
    args = get_args()

    # Rename the adapter configuration file (if present).
    rename_adapter_config(args.lora_model)

    # Merge LoRA model into a base model and save the merged model.
    base_model = AutoModelForCausalLM.from_pretrained(args.lora_model)
    tokenizer = AutoTokenizer.from_pretrained(args.lora_model)

    merged_output = args.merged_model
    base_model.save_pretrained(merged_output)
    tokenizer.save_pretrained(merged_output)
    print(f"Model saved to {merged_output}")

    # Get the parent directory (one level higher than merged_output)
    parent_dir = os.path.dirname(merged_output)

    # Create the model file for the unquantized model in the parent directory.
    modelfile_path = os.path.join(parent_dir, "Modelfile")
    create_modelfile(modelfile_path, "Merged.gguf")

    # If a quantization string is provided, create a second model file for the quantized model.
    if args.quantization:
        modelfile_quant_path = os.path.join(parent_dir, f"Modelfile{args.quantization}")
        create_modelfile(modelfile_quant_path, f"Merged{args.quantization}.gguf")

if __name__ == "__main__":
    main()
