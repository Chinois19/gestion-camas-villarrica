import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\Minsal\\.gemini\\antigravity';
const workspaceDir = 'c:\\Users\\Minsal\\OneDrive\\Aplicaciones Antigravity\\gestion-camas-villarrica';

function searchFile(dir, targetName) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        searchFile(full, targetName);
      }
    } else if (file.toLowerCase() === targetName.toLowerCase() || file.toLowerCase().includes('restoration')) {
      console.log(`Found: ${full}`);
    }
  });
}

console.log('Searching for restoration plan...');
searchFile(brainDir, 'restoration_plan.md');
searchFile(workspaceDir, 'restoration_plan.md');
console.log('Finished search!');
process.exit(0);
