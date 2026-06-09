import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain';
const recentConversations = [
  '73013e1d-adb2-488a-8136-ae64c1a87170',
  '6d625e59-27aa-4588-800f-7cc72ecc0b2b',
  '6f1a8f0c-53ab-4c18-95e0-d2cca9c61b54',
  '722ed42e-297a-45ce-b1a5-1910ab0bf4b4',
  '157ee9ec-922f-47a8-94f9-c135b9115289',
  '8af0aefd-9456-498a-b1f6-2472a306fdd5'
];

recentConversations.forEach(convId => {
  const convPath = path.join(brainDir, convId);
  if (!fs.existsSync(convPath)) return;

  console.log(`\nImages in conversation ${convId}:`);

  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scan(full);
      } else {
        const ext = path.extname(f).toLowerCase();
        if (['.png', '.webp', '.jpg', '.jpeg'].includes(ext)) {
          console.log(`  - ${path.relative(convPath, full)} (${(stat.size / 1024).toFixed(1)} KB)`);
        }
      }
    });
  }
  scan(convPath);
});
process.exit(0);
