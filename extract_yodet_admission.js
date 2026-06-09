import fs from 'fs';
import path from 'path';

const tempMediaDir = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\722ed42e-297a-45ce-b1a5-1910ab0bf4b4\\.tempmediaStorage';

if (fs.existsSync(tempMediaDir)) {
  const files = fs.readdirSync(tempMediaDir).filter(f => f.startsWith('dom_') && f.endsWith('.txt'));
  files.forEach(file => {
    const full = path.join(tempMediaDir, file);
    const content = fs.readFileSync(full, 'utf8');
    if (content.toLowerCase().includes('yodet')) {
      console.log(`\nFile: ${file}`);
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes('yodet')) {
          console.log(`  Line ${idx}: ${line.trim()}`);
          // Print 15 lines before and after
          const start = Math.max(0, idx - 15);
          const end = Math.min(lines.length, idx + 15);
          console.log('  --- Context ---');
          for (let i = start; i < end; i++) {
            console.log(`  [${i}] ${lines[i]}`);
          }
          console.log('  ---------------');
        }
      });
    }
  });
}
process.exit(0);
