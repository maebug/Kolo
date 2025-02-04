#!/usr/bin/env python
"""
Description:
    This script fine-tunes a language model using PEFT LoRA on a dataset.
    The following command-line arguments can be adjusted:
        --epochs             Number of training epochs
        --learning_rate      Learning rate for training
        --train_data         Path to the training data file
        --base_model         Base model path or identifier
        --chat_template      Chat template identifier for tokenization
        --lora_rank                 LoRA rank parameter
        --lora_alpha         LoRA alpha parameter
        --lora_dropout       LoRA dropout probability
        --max_seq_length     Maximum sequence length
        --warmup_steps       Number of warmup steps
        --save_steps         Save checkpoint every N steps
        --save_total_limit   Maximum number of checkpoints to save
        --seed               Random seed
        --scheduler_type     Learning rate scheduler type
        --output_dir         Directory to output the training results
        --batch_size         Batch size for training.
        --quantization       Quantization type e.g. (q4_k_m)
"""

import argparse
import os

from unsloth import FastLanguageModel, is_bfloat16_supported
from unsloth.chat_templates import get_chat_template
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments


def parse_arguments():
    parser = argparse.ArgumentParser(description="Fine-tune a language model using PEFT LoRA.")

    parser.add_argument("--train_data", type=str, default="data.jsonl", help="Path to training data file.")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs.")
    parser.add_argument("--learning_rate", type=float, default=1e-4, help="Learning rate for training.")
    parser.add_argument("--base_model", type=str, default="unsloth/Llama-3.2-1B-Instruct-bnb-4bit", help="Base model path or identifier.")
    parser.add_argument("--chat_template", type=str, default="llama-3.1", help="Chat template identifier for tokenization.")
    parser.add_argument("--lora_rank", type=int, default=16, help="LoRA rank parameter.")
    parser.add_argument("--lora_alpha", type=int, default=16, help="LoRA alpha parameter.")
    parser.add_argument("--lora_dropout", type=float, default=0.0, help="LoRA dropout probability.")
    parser.add_argument("--max_seq_length", type=int, default=1024, help="Maximum sequence length.")
    parser.add_argument("--warmup_steps", type=int, default=20, help="Number of warmup steps.")
    parser.add_argument("--save_steps", type=int, default=500, help="Save checkpoint every N steps.")
    parser.add_argument("--save_total_limit", type=int, default=5, help="Maximum number of checkpoints to save.")
    parser.add_argument("--seed", type=int, default=1337, help="Random seed.")
    parser.add_argument("--scheduler_type", type=str, default="linear", help="Learning rate scheduler type.")
    parser.add_argument("--output_dir", type=str, default="outputs", help="Output directory for training results.")
    parser.add_argument("--batch_size", type=int, default=2, help="Batch size for training.")
    parser.add_argument("--quantization", type=str, default="", help="Quantization type e.g. (q4_k_m)")

    return parser.parse_args()


def formatting_prompts_func(examples, tokenizer):
    """
    Formats the prompts from the dataset by applying the chat template
    and tokenizing the resulting texts.

    Args:
        examples (dict): A dictionary with a key "messages" containing conversation data.
        tokenizer: The tokenizer that includes the chat template method.

    Returns:
        dict: A dictionary with tokenized texts under the key "text".
    """
    convos = examples["messages"]
    # Apply the chat template to each conversation without tokenizing yet.
    texts = [tokenizer.apply_chat_template(convo, tokenize=False, add_generation_prompt=False)
             for convo in convos]
    # Tokenize the texts.
    tokenized_texts = tokenizer(texts, padding=False, truncation=True, add_special_tokens=False)
    return {"text": texts, "input_ids": tokenized_texts["input_ids"]}

def main():
    args = parse_arguments()

    # Load the base model and tokenizer.
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.base_model,
        max_seq_length=args.max_seq_length,
        dtype=None,  # Auto detection of dtype.
        load_in_4bit=True,
    )

    # Convert the base model to PEFT LoRA format.
    model = FastLanguageModel.get_peft_model(
        model,
        r=args.lora_rank,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        bias="none",
        use_gradient_checkpointing=False,
        random_state=1337,
        use_rslora=False,
        loftq_config=None,
    )

    # Update the tokenizer with the chosen chat template.
    tokenizer = get_chat_template(tokenizer, chat_template=args.chat_template)

    # Data Preparation: Load dataset and format the prompts.
    dataset = load_dataset("json", data_files=args.train_data, split="train")
    # Use a lambda to pass the tokenizer into our formatting function.
    dataset = dataset.map(lambda ex: formatting_prompts_func(ex, tokenizer=tokenizer), batched=True)

    print("Sample data:", dataset[0])

    volume_output_dir = f"/var/kolo_data/{args.output_dir}"

    # Configure training arguments.
    training_args = TrainingArguments(
        per_device_train_batch_size=args.batch_size,
        warmup_steps=args.warmup_steps,
        num_train_epochs=args.epochs,
        learning_rate=args.learning_rate,
        fp16=not is_bfloat16_supported(),
        bf16=is_bfloat16_supported(),
        logging_steps=1,
        optim="adamw_8bit",
        save_strategy="steps",
        save_steps=args.save_steps,
        save_total_limit=args.save_total_limit,
        weight_decay=0,
        lr_scheduler_type=args.scheduler_type,
        seed=args.seed,
        output_dir=volume_output_dir,
        report_to="none",  # Disable reporting to third-party tools like WandB.
    )

    # Set up the trainer.
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="input_ids",
        max_seq_length=args.max_seq_length,
        dataset_num_proc=2,
        packing=False,
        args=training_args,
    )

    # Train the model.
    trainer_stats = trainer.train(resume_from_checkpoint=False)

    # Save the fine-tuned model and tokenizer.
    print("Saving fine-tuned model locally...")
    model.save_pretrained(volume_output_dir)
    tokenizer.save_pretrained(volume_output_dir)

    print(f"Saving fine-tuned model in GGUF format to {volume_output_dir}...")
    
    if args.quantization:
        model.save_pretrained_gguf(volume_output_dir, tokenizer, quantization_method=args.quantization.lower())
        ext = args.quantization.upper()
        filename = f"Modelfile{ext}"
        print(f"Creating quantized model file to {filename}")
        
        content = f"FROM ./unsloth.{ext}.gguf"

        with open(f"{volume_output_dir}/{filename}", "w") as file:
            file.write(content)

        print(f"File '{filename}' created successfully with contents:\n{content}")
    else:
        model.save_pretrained_gguf(volume_output_dir, tokenizer)


    print("Model saved successfully!")


if __name__ == "__main__":
    main()