import fs from 'fs';
const content = fs.readFileSync('src/components/Dashboard.jsx', 'utf8');
const lines = content.split('\n');
for (let i = 605; i < 665; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);
