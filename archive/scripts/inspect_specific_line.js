import fs from 'fs';
const file = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\cec4339c-a0b9-497f-868e-319e0b464289\\.system_generated\\logs\\transcript.jsonl';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');
const line = lines[1539];
console.log("Line length:", line.length);
try {
  const parsed = JSON.parse(line);
  console.log("Parsed keys:", Object.keys(parsed));
  if (parsed.tool_calls) {
    parsed.tool_calls.forEach((tc, idx) => {
      console.log(`Tool call ${idx}: name=${tc.name}`);
      console.log("Arguments:", JSON.stringify(tc.args, null, 2));
    });
  }
} catch(e) {
  console.error("Failed parsing line:", e);
}
process.exit(0);
