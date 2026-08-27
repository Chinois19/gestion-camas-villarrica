import fs from 'fs';
import path from 'path';

const srcDir = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\6f1a8f0c-53ab-4c18-95e0-d2cca9c61b54';
const destDir = 'c:\\Users\\Minsal\\OneDrive\\Aplicaciones Antigravity\\gestion-camas-villarrica\\temp_screenshots';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

if (fs.existsSync(srcDir)) {
  const files = fs.readdirSync(srcDir);
  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (['.png', '.webp', '.jpg', '.jpeg'].includes(ext)) {
      const srcFile = path.join(srcDir, file);
      const destFile = path.join(destDir, 'june4_' + file);
      fs.copyFileSync(srcFile, destFile);
      console.log(`Copied ${file} to june4_${file}`);
    }
  });
} else {
  console.log("June 4th conv dir does not exist.");
}
process.exit(0);
