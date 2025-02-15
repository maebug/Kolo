#!/usr/bin/env python3
"""
Usage:
    python3 parse_qa_data.py --input_dir INPUT_DIRECTORY --output_file OUTPUT_FILE

Description:
    This script processes each text file in the specified input directory and extracts FAQ Q/A pairs.
    It uses a state-machine style approach to handle many formatting variations including:
      - Bold markers (e.g. **Q:** or **Q1:**) or Markdown header markers (e.g. #### Q1: or ## 6.)
      - Optional digits after Q/A labels.
      - Multiline answers (including bullet lists).
      - Separator lines (e.g. ---) to delineate Q/A pairs.
    Each Q/A pair is then written as a JSON object (one per line) into the output file in JSONL format.

Arguments:
    --input_dir:   The directory containing text files to process.
    --output_file: The path (including filename) of the output JSONL file.

Example:
    python3 parse_qa_data.py --input_dir data --output_file output/training_data.jsonl
"""

import os
import random
import re
import json
import argparse

def extract_qa_pairs(text):
    qa_pairs = []
    current_question = None
    current_answer_lines = []

    # Updated regex for question lines:
    # Matches lines that start with an optional bold marker or markdown header,
    # followed by either a Q-label (like "Q:" or "Q1:") or a numbered header (like "6." or "6:"),
    # then captures the question text.
    question_pattern = re.compile(
        r'^\s*(?:\*\*|#{1,}\s*)?(?:(?:Q(?:\d+)?\s*[:\.])|(?:\d+\s*[.:]))\s*(.+?)\s*(?:\*\*)?\s*$',
        re.IGNORECASE
    )
    
    # Updated regex for answer label lines:
    # Matches lines starting with an optional bullet ("- "), optional bold/markdown marker,
    # followed by an A-label (like "A:" or "A1:") and captures the answer text.
    answer_pattern = re.compile(
        r'^\s*(?:-\s+)?(?:\*\*|#{1,}\s*)?A(?:\d+)?\s*[:\.]\s*(.+?)(?:\*\*)?\s*$',
        re.IGNORECASE
    )

    # Process the text line by line.
    lines = text.splitlines()

    for line in lines:
        stripped = line.strip()

        # If we hit a separator line, save the current Q/A pair (if any) and reset.
        if stripped == '---':
            if current_question is not None:
                answer_text = "\n".join(current_answer_lines).strip()
                qa_pairs.append((current_question, answer_text))
                current_question = None
                current_answer_lines = []
            continue

        # Check if the line is a question line.
        q_match = question_pattern.match(line)
        if q_match:
            # If a previous question is in progress, save its Q/A pair.
            if current_question is not None:
                answer_text = "\n".join(current_answer_lines).strip()
                qa_pairs.append((current_question, answer_text))
            current_question = q_match.group(1).strip()
            current_answer_lines = []  # Reset answer accumulator.
            continue

        # Check if the line is an answer label line.
        a_match = answer_pattern.match(line)
        if a_match:
            # Start the answer block with the text following the A label.
            current_answer_lines.append(a_match.group(1).strip())
            continue

        # Otherwise, if we're currently processing a Q/A pair, treat the line as part of the answer.
        if current_question is not None:
            current_answer_lines.append(line)

    # If there's a pending Q/A pair at the end of the file, add it.
    if current_question is not None:
        answer_text = "\n".join(current_answer_lines).strip()
        qa_pairs.append((current_question, answer_text))

    return qa_pairs

def main():
    parser = argparse.ArgumentParser(
        description="Extract FAQ Q/A pairs from text files and output them as JSONL."
    )
    parser.add_argument(
        "--input_dir",
        required=True,
        help="Directory containing text files to process."
    )
    parser.add_argument(
        "--output_file",
        required=True,
        help="Output file (JSONL format) to write the extracted Q/A pairs."
    )
    args = parser.parse_args()

    input_dir = args.input_dir
    output_file = args.output_file
    rows = []
    qa_count = 0

    # Process each file in the input directory.
    for filename in os.listdir(input_dir):
        file_path = os.path.join(input_dir, filename)
        if os.path.isfile(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            pairs = extract_qa_pairs(content)
            print(f"Found {len(pairs)} Q/A pair(s) in {file_path}")

            # Shuffle the pairs to randomize their order.
            random.shuffle(pairs)
            
            # Create a single messages array for all Q/A pairs in the file.
            messages = []
            for question, answer in pairs:
                messages.append({"role": "user", "content": question})
                messages.append({"role": "assistant", "content": answer})
                qa_count += 1
            
            # Append the entire messages array as one entry.
            rows.append({"messages": messages})


    # Write each entry as one JSON object per line.
    with open(output_file, "w", encoding="utf-8") as out_f:
        for entry in rows:
            json_line = json.dumps(entry)
            out_f.write(json_line + "\n")

    print(f"Converted {qa_count} Q/A pair(s) into {len(rows)} rows saved to {output_file}")

if __name__ == "__main__":
    main()
