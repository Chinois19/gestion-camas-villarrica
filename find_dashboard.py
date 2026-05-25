import json
import os

log_path = r"c:\Users\Minsal\.gemini\antigravity\brain\cec4339c-a0b9-497f-868e-319e0b464289\.system_generated\logs\transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Instead of applying diffs, let's just find the last FULL text of Dashboard.jsx from the transcript!
# When view_file was called on Dashboard.jsx, the stdout had "File Path: ... \nTotal Lines: ... \nShowing lines 1 to ...\nThe following code has been modified..."
# But wait, there is no view_file for Dashboard.jsx!
# Let's find the MOST RECENT valid Dashboard.jsx. We can do this by finding the last tool call to `write_to_file` for Dashboard.jsx? There was none, only replace.

# Ok, the IDE's Local History MUST have it. But VSCode local history is in `AppData\Roaming\Code\User\History`.
# Let's find all files in the History that contain "Dashboard".

import glob

history_dir = r"C:\Users\Minsal\AppData\Roaming\Code\User\History"
for root, dirs, files in os.walk(history_dir):
    for name in files:
        if name.endswith('.json'):
            continue
        try:
            with open(os.path.join(root, name), 'r', encoding='utf-8') as f:
                content = f.read()
                if "export default function Dashboard" in content and "icFilter" in content and "setEditingGrdBed" in content:
                    print("Found candidate in:", os.path.join(root, name))
                    print("Length:", len(content))
                    with open(f"candidate_{name}.jsx", 'w', encoding='utf-8') as out:
                        out.write(content)
        except:
            pass

