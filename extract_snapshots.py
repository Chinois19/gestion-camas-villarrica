import json
import os

log_path = r"c:\Users\Minsal\.gemini\antigravity\brain\cec4339c-a0b9-497f-868e-319e0b464289\.system_generated\logs\transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def extract_file(filename):
    # Search for all Get-Content outputs or write_to_file outputs
    content_snapshots = []
    for line in lines:
        if 'Get-Content' in line and filename in line:
            content_snapshots.append(line)
        if 'cat ' in line and filename in line:
            content_snapshots.append(line)
    
    with open(f"snapshots_{filename.split('/')[-1]}.txt", "w", encoding='utf-8') as f:
        for s in content_snapshots:
            f.write(s + "\n---\n")

extract_file("Dashboard.jsx")
extract_file("EditGrdModal.jsx")
