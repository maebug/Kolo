from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

import os
import json
import argparse

def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lora_model", type=str, required=True)
    parser.add_argument("--merged_model", type=str, required=True)
    return parser.parse_args()

def update_adapter_config(lora_model_path):
    config_path = os.path.join(lora_model_path, "adapter_config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
            # Update the base_model_name_or_path field to the lora_model directory path.
            config["base_model_name_or_path"] = lora_model_path
            with open(config_path, "w") as f:
                json.dump(config, f, indent=2)
            print(f"Updated adapter_config.json with base_model_name_or_path = '{lora_model_path}'")
        except Exception as e:
            print(f"Error updating adapter_config.json: {e}")
    else:
        print(f"No adapter_config.json found at {config_path}. Skipping update.")

def main():
    args = get_args()

    # Update the adapter_config.json file (if present) to use the lora_model path.
    update_adapter_config(args.lora_model)

    base_model = AutoModelForCausalLM.from_pretrained(
        args.lora_model,
        return_dict=True,
        torch_dtype=torch.float16,
        local_files_only=True
    )

    model = PeftModel.from_pretrained(base_model, args.lora_model)
    model = model.merge_and_unload()
    model._hf_peft_config_loaded = False
    tokenizer = AutoTokenizer.from_pretrained(args.lora_model)

    merged_output = f"{args.merged_model}"
    model.save_pretrained(merged_output)
    tokenizer.save_pretrained(merged_output)
    print(f"Model saved to {merged_output}")

if __name__ == "__main__":
    main()
