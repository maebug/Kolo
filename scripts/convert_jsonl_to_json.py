import json
import argparse

def convert_jsonl(input_file, output_file):
    conversations_list = []
    
    # Define a mapping from input roles to the desired output roles.
    role_map = {
        "system": "system",
        "user": "human",
        "assistant": "gpt"
    }
    
    with open(input_file, "r", encoding="utf-8") as fin:
        for line in fin:
            line = line.strip()
            if not line:
                continue  # skip empty lines
            try:
                # Load each line as a JSON object
                data = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON for line: {line}\nError: {e}")
                continue
            
            # Extract messages and convert their roles
            messages = data.get("messages", [])
            converted_messages = []
            for message in messages:
                role = message.get("role", "")
                content = message.get("content", "")
                new_role = role_map.get(role, role)
                converted_messages.append({"from": new_role, "value": content})
            
            # Filter out only "human" and "gpt" messages for alternating check.
            filtered_messages = [msg for msg in converted_messages if msg["from"] in {"human", "gpt"}]
            
            # Validate that the conversation strictly alternates:
            # - Must start with a "human" message.
            # - Must have an even number of messages (to form complete pairs).
            # - Every even-indexed message must be from "human" and every odd-indexed from "gpt".
            if not filtered_messages or len(filtered_messages) % 2 != 0:
                continue  # Toss out conversation if it does not have complete alternating pairs.
            
            valid = True
            for i, msg in enumerate(filtered_messages):
                expected = "human" if i % 2 == 0 else "gpt"
                if msg["from"] != expected:
                    valid = False
                    break
            
            if not valid:
                # Skip this conversation if it doesn't strictly alternate
                continue
            
            # Append the validated conversation. Note: This output includes only the alternating messages.
            conversations_list.append({"conversations": filtered_messages})
    
    # Write the list of valid conversations to the output JSON file.
    with open(output_file, "w", encoding="utf-8") as fout:
        json.dump(conversations_list, fout, indent=4, ensure_ascii=False)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Convert a JSONL file of ShareGPT-style messages to a JSON file with 'conversations' key, ensuring strict user-assistant alternation."
    )
    parser.add_argument("input_file", help="Path to the input JSONL file")
    parser.add_argument("output_file", help="Path to the output JSON file")
    args = parser.parse_args()
    
    convert_jsonl(args.input_file, args.output_file)
