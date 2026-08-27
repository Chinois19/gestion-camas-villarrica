import json
import re

log_path = r"c:\Users\Minsal\.gemini\antigravity\brain\cec4339c-a0b9-497f-868e-319e0b464289\.system_generated\logs\transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Find all "ReplacementContent":"..."
matches = re.findall(r'"ReplacementContent":"(.*?)"', text)
with open('all_replacements.txt', 'w', encoding='utf-8') as out:
    for m in matches:
        out.write(m.replace('\\n', '\n').replace('\\r', '\r').replace('\\"', '"') + "\n\n-----------------\n\n")

print("Dumped", len(matches), "replacements")
