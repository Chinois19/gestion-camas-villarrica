import fs from 'fs';
const content = fs.readFileSync('src/components/EditGrdModal.jsx', 'utf8');
const lines = content.split('\n');
for (let i = 48; i < 110; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);
