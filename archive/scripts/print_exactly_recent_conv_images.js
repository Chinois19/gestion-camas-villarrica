import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain';
const convs = ['722ed42e-297a-45ce-b1a5-1910ab0bf4b4', '6f1a8f0c-53ab-4c18-95e0-d2cca9c61b54'];

convs.forEach(convId => {
  const p = path.join(brainDir, convId);
  if (!fs.existsSync(p)) return;
  console.log(`\n=== CONV: ${convId} ===`);
  const list = fs.readdirSync(p);
  list.forEach(file => {
    const full = path.join(p, file);
    const stat = fs.statSync(full);
    if (!stat.isDirectory()) {
      if (['.png', '.webp', '.jpg'].includes(path.extname(file).toLowerCase())) {
        console.log(` - ${file} (${(stat.size/1024).toFixed(1)} KB)`);
      }
    }
  });
});
process.exit(0);
