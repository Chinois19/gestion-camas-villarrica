import fs from 'fs';
const content = fs.readFileSync('C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\bab76e6a-2678-43d9-acba-16af3851da05\\.system_generated\\logs\\overview.txt', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('restoration') || line.toLowerCase().includes('restaurar')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
process.exit(0);
