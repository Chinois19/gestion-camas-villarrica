import fs from 'fs';

const file = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\6d625e59-27aa-4588-800f-7cc72ecc0b2b\\.system_generated\\logs\\overview.txt';
if (fs.existsSync(file)) {
  const lines = fs.readFileSync(file, 'utf-8').split('\n');
  console.log(lines.slice(15, 40).join('\n'));
} else {
  console.log("File does not exist.");
}
process.exit(0);
