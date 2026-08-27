import fs from 'fs';
const content = fs.readFileSync('src/components/Dashboard.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('AssignmentModal') || line.includes('onConfirm')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
process.exit(0);
