import fs from 'fs';
const content = fs.readFileSync('src/components/Dashboard.jsx', 'utf8');
const lines = content.split('\n');
let start = -1;
lines.forEach((line, idx) => {
  if (line.includes('const confirmAssignment') || line.includes('function confirmAssignment')) {
    start = idx;
  }
});
if (start !== -1) {
  console.log(`Found confirmAssignment at line ${start + 1}`);
  for (let i = Math.max(0, start - 10); i < Math.min(lines.length, start + 80); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log('confirmAssignment not found');
}
process.exit(0);
