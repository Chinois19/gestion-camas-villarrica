import fs from 'fs';
const content = fs.readFileSync('src/components/EditGrdModal.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('novedades') || line.includes('Novedad')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
process.exit(0);
