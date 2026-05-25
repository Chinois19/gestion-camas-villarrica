import json

log_path = r"c:\Users\Minsal\.gemini\antigravity\brain\cec4339c-a0b9-497f-868e-319e0b464289\.system_generated\logs\transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in reversed(lines):
    try:
        data = json.loads(line)
        if "tool_calls" in data:
            for tc in data["tool_calls"]:
                if tc.get("name") == "multi_replace_file_content" or tc.get("name") == "replace_file_content":
                    args = tc.get("args", {})
                    if "Dashboard.jsx" in args.get("TargetFile", ""):
                        print("Found replace for Dashboard.jsx at step", data.get("step_index"))
    except:
        pass
