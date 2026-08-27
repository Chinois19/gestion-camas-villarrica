import json
import os

log_path = r"c:\Users\Minsal\.gemini\antigravity\brain\cec4339c-a0b9-497f-868e-319e0b464289\.system_generated\logs\transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Get base content
with open(r"src\components\Dashboard.jsx", 'r', encoding='utf-8') as f:
    content = f.read()

def apply_chunks(content, chunks):
    # Sort chunks by start line descending to avoid offset issues
    chunks = sorted(chunks, key=lambda x: x["StartLine"], reverse=True)
    file_lines = content.split('\n')
    for c in chunks:
        start = c["StartLine"] - 1
        end = c["EndLine"]
        replacement = c["ReplacementContent"].split('\n')
        # Replace the lines
        file_lines = file_lines[:start] + replacement + file_lines[end:]
    return '\n'.join(file_lines)

for line in lines:
    try:
        data = json.loads(line)
        if "tool_calls" in data:
            for tc in data["tool_calls"]:
                name = tc.get("name")
                args = tc.get("args", {})
                if name in ["multi_replace_file_content", "replace_file_content"] and "Dashboard.jsx" in str(args.get("TargetFile", "")):
                    try:
                        if name == "replace_file_content":
                            chunks = [args]
                        else:
                            chunks = args.get("ReplacementChunks", [])
                        
                        if type(chunks) == str:
                            chunks = json.loads(chunks)
                            
                        content = apply_chunks(content, chunks)
                    except Exception as e:
                        print(f"Error applying chunks at step {data.get('step_index')}: {e}")
    except Exception as e:
        pass

with open("Dashboard_recovered.jsx", "w", encoding='utf-8') as f:
    f.write(content)

print("Recovered to Dashboard_recovered.jsx")
