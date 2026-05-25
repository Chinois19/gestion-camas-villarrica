import json

log_path = r"c:\Users\Minsal\.gemini\antigravity\brain\cec4339c-a0b9-497f-868e-319e0b464289\.system_generated\logs\transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out_lines = []
for idx, line in enumerate(lines):
    if '"name":"write_to_file"' in line or '"name":"write_file"' in line:
        if 'EditGrdModal' in line or 'PatientDetail' in line or 'AssignmentModal' in line or 'WaitingList' in line or 'Dashboard' in line:
            out_lines.append(f"STEP {idx}\n{line}\n")

with open('all_writes.txt', 'w', encoding='utf-8') as out:
    out.writelines(out_lines)
