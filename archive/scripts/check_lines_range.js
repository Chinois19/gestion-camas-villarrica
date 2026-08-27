import fs from 'fs';

const file = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\6d625e59-27aa-4588-800f-7cc72ecc0b2b\\.system_generated\\logs\\overview.txt';
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  console.log("Total lines:", lines.length);
  console.log("--- First 15 lines ---");
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    console.log(`Line ${i}:`, lines[i]);
  }
} else {
  console.log("File does not exist.");
}
process.exit(0);
