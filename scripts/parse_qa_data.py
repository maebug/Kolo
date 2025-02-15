import os
import json
import re

# Adjust these paths as needed.
BASE_OUTPUT_DIR = "/var/kolo_data/qa_generation_output"
QUESTIONS_DIR = os.path.join(BASE_OUTPUT_DIR, "questions")
ANSWERS_DIR = os.path.join(BASE_OUTPUT_DIR, "answers")
OUTPUT_FILE = "/app/data.jsonl"

def parse_questions_from_file(filepath):
    """
    Reads a question file and extracts questions that are numbered.
    Returns a list of question strings.
    """
    pattern = re.compile(r"^\s*\d+\.\s*(.+)$")
    questions = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            match = pattern.match(line)
            if match:
                question = match.group(1).strip()
                if question:
                    questions.append(question)
    return questions

def pair_questions_and_answers():
    """
    Looks for all question files in the QUESTIONS_DIR and then for each question,
    pairs it with the corresponding answer file from ANSWERS_DIR.
    Assumes the naming convention:
      - Questions: questions_<group>.txt
      - Answers: answer_<group>_<index>.txt
    Returns a list of dictionaries with the conversation messages.
    """
    qa_pairs = []
    
    # Process each question file.
    for q_filename in os.listdir(QUESTIONS_DIR):
        if not q_filename.startswith("questions_") or not q_filename.endswith(".txt"):
            continue
        
        # Extract group name from filename, e.g. "questions_group_foo.txt" => "group_foo"
        group_name = q_filename[len("questions_"):-len(".txt")]
        q_filepath = os.path.join(QUESTIONS_DIR, q_filename)
        questions = parse_questions_from_file(q_filepath)
        
        # For each question, look for a corresponding answer file.
        for idx, question in enumerate(questions, start=1):
            answer_filename = f"answer_{group_name}_{idx}.txt"
            answer_filepath = os.path.join(ANSWERS_DIR, answer_filename)
            if not os.path.exists(answer_filepath):
                print(f"Warning: Answer file {answer_filename} not found for group {group_name} question {idx}.")
                continue

            with open(answer_filepath, 'r', encoding='utf-8') as af:
                answer = af.read().strip()
            
            qa_pair = {
                "messages": [
                    {"role": "user", "content": question},
                    {"role": "assistant", "content": answer}
                ]
            }
            qa_pairs.append(qa_pair)
    
    return qa_pairs

def main():
    qa_pairs = pair_questions_and_answers()
    
    if not qa_pairs:
        print("No QA pairs found.")
        return

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out_f:
        for pair in qa_pairs:
            json_line = json.dumps(pair, ensure_ascii=False)
            out_f.write(json_line + "\n")
    
    print(f"QA pairs saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
