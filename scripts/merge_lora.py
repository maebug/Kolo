from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

import os
import argparse

def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lora_model", type=str, required=True)
    parser.add_argument("--merged_model", type=str, required=True)

    return parser.parse_args()

def main():
    args = get_args()

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

    model.save_pretrained(f"{args.merged_model}-merged")
    tokenizer.save_pretrained(f"{args.merged_model}-merged")
    print(f"Model saved to {args.merged_model}-merged")

if __name__ == "__main__" :
    main()