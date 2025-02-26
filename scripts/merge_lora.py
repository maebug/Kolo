from transformers import AutoModelForCausalLM, AutoTokenizer

import os
import argparse

def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lora_model", type=str, required=True)
    parser.add_argument("--merged_model", type=str, required=True)
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

def main():
    args = get_args()

    # Rename the adapter configuration file (if present).
    rename_adapter_config(args.lora_model)

    base_model = AutoModelForCausalLM.from_pretrained(
        args.lora_model
    )

    tokenizer = AutoTokenizer.from_pretrained(args.lora_model)

    merged_output = f"{args.merged_model}"
    base_model.save_pretrained(merged_output)
    tokenizer.save_pretrained(merged_output)
    print(f"Model saved to {merged_output}")

if __name__ == "__main__":
    main()
