import fs from 'fs';
const content = fs.readFileSync('src/components/Dashboard.jsx', 'utf8');
const lines = content.split('\n');
let start = -1;
lines.forEach((line, idx) => {
  if (line.includes('<EditGrdModal')) {
    start = idx;
  }
});
if (start !== -1) {
  console.log(`Found EditGrdModal at line ${start + 1}`);
  for (let i = Math.max(0, start - 5); i < Math.min(lines.length, start + 20); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log('EditGrdModal not found');
}
process.exit(0);
