#!/usr/bin/env python3
import os
import re
import json

def extract_qa_pairs(text):
    qa_pairs = []
    
    # ----------------------------------------------------------
    # Pattern 1: Bold FAQ Format
    # ----------------------------------------------------------
    # Example:
    # **Q1: What is the purpose of TrainTorchTune?**
    # **A1:** TrainTorchTune is designed to help users fine-tune a machine learning model...
    #
    # This pattern now allows an optional digit after both Q and A.
    pattern_bold = re.compile(
        r'\*\*Q(?:\d+)?\:\s*(?P<question>.+?)\*\*\s*\n+' 
        r'(?:\*\*)?A(?:\d+)?\:\s*(?P<answer>.*?)(?=\n\s*(?:---|\*\*Q(?:\d+)?\:|#+\s*Q(?:\d+)?\:)|\Z)',
        re.DOTALL | re.IGNORECASE
    )
    
    # ----------------------------------------------------------
    # Pattern 2: Markdown Header FAQ Format
    # ----------------------------------------------------------
    # Example:
    # ## Q: What is Unsloth?
    # A: Unsloth is an open-source tool integrated into Kolo...
    pattern_header = re.compile(
        r'^\s*#+\s*Q(?:\d+)?\:\s*(?P<question>.+?)\s*$\n+'   # Header question line (supports one or more '#' symbols)
        r'^(?:\*\*)?A:(?:\*\*)?\s*(?P<answer>.*?)(?=\n\s*#+\s*Q(?:\d+)?\:|\Z)',
        re.DOTALL | re.IGNORECASE | re.MULTILINE
    )
    
    # ----------------------------------------------------------
    # Pattern 3: Plain FAQ Format
    # ----------------------------------------------------------
    # Example:
    # Q: What does the `-it -d` option mean in the Docker run command?
    # A: The `-it` option allows you to run the container interactively...
    pattern_plain = re.compile(
        r'^Q(?:\d+)?\:\s*(?P<question>.+?)\s*$\n+'   # Question line starting with "Q:" (optional number)
        r'^A:\s*(?P<answer>.*?)(?=\n^Q(?:\d+)?\:|\Z)',  # Answer until the next "Q:" or end-of-text
        re.MULTILINE | re.DOTALL
    )
    
    # Extract FAQ pairs using the Bold FAQ Format
    for m in pattern_bold.finditer(text):
        question = m.group("question").strip()
        answer = m.group("answer").strip()
        qa_pairs.append((question, answer))
    
    # Extract FAQ pairs using the Markdown Header FAQ Format
    for m in pattern_header.finditer(text):
        question = m.group("question").strip()
        answer = m.group("answer").strip()
        qa_pairs.append((question, answer))
    
    # Extract FAQ pairs using the Plain FAQ Format
    for m in pattern_plain.finditer(text):
        question = m.group("question").strip()
        answer = m.group("answer").strip()
        qa_pairs.append((question, answer))
    
    return qa_pairs

def main():
    input_dir = "output"
    output_file = "training_data.jsonl"
    qa_messages = []

    # Process each file in the input directory.
    for filename in os.listdir(input_dir):
        file_path = os.path.join(input_dir, filename)
        if os.path.isfile(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            pairs = extract_qa_pairs(content)
            print(f"Found {len(pairs)} Q/A pair(s) in {file_path}")
            for question, answer in pairs:
                entry = {
                    "messages": [
                        {"role": "user", "content": question},
                        {"role": "assistant", "content": answer}
                    ]
                }
                qa_messages.append(entry)

    # Write each entry as one JSON object per line.
    with open(output_file, "w", encoding="utf-8") as out_f:
        for entry in qa_messages:
            json_line = json.dumps(entry)
            out_f.write(json_line + "\n")

    print(f"Converted {len(qa_messages)} Q/A pair(s) to {output_file}")

if __name__ == "__main__":
    main()
