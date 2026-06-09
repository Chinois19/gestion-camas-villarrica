import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain';
const searchTerms = ['mora', 'ingrid', 'pancreatitis', 'claudio', 'camaño', 'iturra'];

function scan(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scan(full);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.txt', '.json', '.jsonl', '.js', '.html'].includes(ext)) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          const lower = content.toLowerCase();
          const matches = searchTerms.filter(term => lower.includes(term));
          if (matches.length > 0) {
            console.log(`\nMatch [${matches.join(', ')}] in: ${full}`);
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              const matchedTerms = searchTerms.filter(t => line.toLowerCase().includes(t));
              if (matchedTerms.length > 0) {
                console.log(`  Line ${idx}: ${line.trim().substring(0, 150)}`);
              }
            });
          }
        } catch (e) {
          // ignore
        }
      }
    }
  });
}

scan(brainDir);
process.exit(0);
