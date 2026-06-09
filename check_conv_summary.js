import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\73013e1d-adb2-488a-8136-ae64c1a87170\\.system_generated\\logs\\overview.txt';
if (fs.existsSync(file)) {
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  console.log(`overview.txt has ${lines.length} lines.`);
  // Print the first 200 lines to see what happened
  console.log("=== FIRST 200 LINES ===");
  console.log(lines.slice(0, 200).join('\n'));
} else {
  console.log("File does not exist.");
}
process.exit(0);
