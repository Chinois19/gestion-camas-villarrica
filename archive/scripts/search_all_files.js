import fs from 'fs';
import path from 'path';

const srcDir = 'c:\\Users\\Minsal\\OneDrive\\Aplicaciones Antigravity\\gestion-camas-villarrica\\src';

function searchDir(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else {
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.toLowerCase().includes('camaño') || content.toLowerCase().includes('iturra')) {
        console.log(`Found match in file: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes('camaño') || line.toLowerCase().includes('iturra')) {
            console.log(`  L${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  });
}

searchDir(srcDir);
process.exit(0);
