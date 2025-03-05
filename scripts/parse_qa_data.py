import os
import json
import re
import glob
from typing import List

# Adjust these paths as needed.
BASE_OUTPUT_DIR = "/var/kolo_data/qa_generation_output"
QUESTIONS_DIR = os.path.join(BASE_OUTPUT_DIR, "questions")
ANSWERS_DIR = os.path.join(BASE_OUTPUT_DIR, "answers")
OUTPUT_FILE = "/app/data.jsonl"

def parse_questions_from_file(filepath: str) -> List[str]:
    """
    Reads file content and extracts question texts from a wide range of formats.
    Processes the file line by line, removing numbering, bullet symbols, and markdown formatting,
    and only returns lines containing a '?'.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    questions = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue

        # Remove leading numbering or bullet symbols (like "1.", "-", "+", or "*")
        cleaned = re.sub(r'^[\d\.\-\+\*]+\s*', '', stripped)
        # Remove extra asterisks used for markdown formatting
        cleaned = re.sub(r'\*+', '', cleaned).strip()

        if '?' in cleaned:
            questions.append(cleaned)

    return questions

def pair_questions_and_answers():
    """
    Looks for all question files in the QUESTIONS_DIR and then for each question,
    pairs it with the corresponding answer files from ANSWERS_DIR.

    Assumes the new naming convention:
      - Questions: questions_{group_name}_seed{q_seed_idx}_instr{instr_idx}.txt
      - Answers:   answer_{group_name}_seed{q_seed_idx}_instr{instr_idx}_q{question_number}_{hash}.txt

    If there are multiple answer files for a given question, they are all included as separate
    assistant messages in the output.
    """
    qa_pairs = []
    group_stats = {}  # { identifier: {'questions': count, 'answers': count} }

    # Process each question file.
    for q_filename in os.listdir(QUESTIONS_DIR):
        # Expect filenames like: questions_{group_name}_seed{q_seed_idx}_instr{instr_idx}.txt
        m = re.match(r"questions_(.+)_seed(\d+)_instr(\d+)\.txt", q_filename)
        if not m:
            continue

        group_name = m.group(1)
        q_seed_idx = m.group(2)
        instr_idx = m.group(3)
        identifier = f"{group_name}_seed{q_seed_idx}_instr{instr_idx}"
        q_filepath = os.path.join(QUESTIONS_DIR, q_filename)
        questions = parse_questions_from_file(q_filepath)

        # Initialize stats for this identifier.
        group_stats[identifier] = {'questions': len(questions), 'answers': 0}

        # For each question, look for the corresponding answer files using a glob pattern.
        # Expected answer file format: answer_{group_name}_seed{q_seed_idx}_instr{instr_idx}_q{idx}_{hash}.txt
        for idx, question in enumerate(questions, start=1):
            pattern = os.path.join(
                ANSWERS_DIR,
                f"answer_{group_name}_seed{q_seed_idx}_instr{instr_idx}_q{idx}_*.txt"
            )
            matching_files = glob.glob(pattern)
            if not matching_files:
                print(f"Warning: No answer file found for identifier {identifier}, question {idx}.")
                continue

            answers = []
            for answer_filepath in matching_files:
                with open(answer_filepath, 'r', encoding='utf-8') as af:
                    answer = af.read().strip()
                    answers.append(answer)
            
            group_stats[identifier]['answers'] += len(matching_files)

            # Build the qa pair with one user message and one assistant message per answer.
            qa_pair = {
                "messages": [
                    {"role": "user", "content": question}
                ]
            }
            for answer in answers:
                qa_pair["messages"].append({"role": "assistant", "content": answer})
            qa_pairs.append(qa_pair)

    return qa_pairs, group_stats

def main():
    qa_pairs, group_stats = pair_questions_and_answers()

    if not qa_pairs:
        print("No QA pairs found.")
        return

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out_f:
        for pair in qa_pairs:
            json_line = json.dumps(pair, ensure_ascii=False)
            out_f.write(json_line + "\n")

    # Print summary statistics.
    total_questions = 0
    total_answers = 0
    print("Processing Summary:")
    for identifier, stats in group_stats.items():
        total_questions += stats['questions']
        total_answers += stats['answers']
        print(f"  Identifier '{identifier}': {stats['questions']} questions, {stats['answers']} answers processed.")

    print(f"Total: {total_questions} questions and {total_answers} answers processed.")
    print(f"Total pairs saved to {OUTPUT_FILE}: {len(qa_pairs)}")

if __name__ == "__main__":
    main()
