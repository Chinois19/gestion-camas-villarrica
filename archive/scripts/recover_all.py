import json
import ast

log_path = r"c:\Users\Minsal\.gemini\antigravity\brain\cec4339c-a0b9-497f-868e-319e0b464289\.system_generated\logs\transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def apply_chunks(content, chunks):
    chunks = sorted(chunks, key=lambda x: x["StartLine"], reverse=True)
    file_lines = content.split('\n')
    for c in chunks:
        start = c["StartLine"] - 1
        end = c["EndLine"]
        replacement = c["ReplacementContent"].split('\n')
        file_lines = file_lines[:start] + replacement + file_lines[end:]
    return '\n'.join(file_lines)

files = ["src/components/EditGrdModal.jsx", "src/components/PatientDetailModal.jsx"]

for target_file in files:
    with open(target_file, 'r', encoding='utf-8') as f:
        content = f.read()

    print("Recovering", target_file)
    for line in lines:
        try:
            data = json.loads(line)
            if "tool_calls" in data:
                for tc in data["tool_calls"]:
                    name = tc.get("name")
                    args = tc.get("args", {})
                    # Stop if we reach a broken step or don't want to apply
                    if name in ["multi_replace_file_content", "replace_file_content"]:
                        tfile = str(args.get("TargetFile", ""))
                        if target_file.split('/')[-1] in tfile:
                            if name == "replace_file_content":
                                chunks = [args]
                            else:
                                chunks = args.get("ReplacementChunks", [])
                            
                            if type(chunks) == str:
                                try:
                                    chunks = json.loads(chunks)
                                except:
                                    try:
                                        chunks = ast.literal_eval(chunks)
                                    except:
                                        print("FAILED TO PARSE CHUNKS FOR", target_file)
                                        continue
                            
                            try:
                                content = apply_chunks(content, chunks)
                            except Exception as e:
                                print("Error applying chunk", e)
        except Exception as e:
            pass

    with open(target_file, 'w', encoding='utf-8') as f:
        f.write(content)
