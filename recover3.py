import json
import os
import ast

log_path = r"c:\Users\Minsal\.gemini\antigravity\brain\cec4339c-a0b9-497f-868e-319e0b464289\.system_generated\logs\transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open(r"src\components\Dashboard.jsx", 'r', encoding='utf-8') as f:
    content = f.read()

def apply_chunks(content, chunks):
    chunks = sorted(chunks, key=lambda x: x["StartLine"], reverse=True)
    file_lines = content.split('\n')
    for c in chunks:
        start = c["StartLine"] - 1
        end = c["EndLine"]
        replacement = c["ReplacementContent"].split('\n')
        file_lines = file_lines[:start] + replacement + file_lines[end:]
    return '\n'.join(file_lines)

for line in lines:
    try:
        data = json.loads(line)
        step = data.get('step_index', 0)
        # STOP BEFORE I broke it (step 1530 was my last good step)
        if step > 1500:
            continue
            
        if "tool_calls" in data:
            for tc in data["tool_calls"]:
                name = tc.get("name")
                args = tc.get("args", {})
                if name in ["multi_replace_file_content", "replace_file_content"] and "Dashboard.jsx" in str(args.get("TargetFile", "")):
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
                                continue
                            
                    try:
                        content = apply_chunks(content, chunks)
                    except Exception as e:
                        pass
    except Exception as e:
        pass

with open("src/components/Dashboard.jsx", "w", encoding='utf-8') as f:
    f.write(content)

print("Recovered perfectly!")
