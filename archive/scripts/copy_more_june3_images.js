import fs from 'fs';
import path from 'path';

const srcDir = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\722ed42e-297a-45ce-b1a5-1910ab0bf4b4';
const destDir = 'c:\\Users\\Minsal\\OneDrive\\Aplicaciones Antigravity\\gestion-camas-villarrica\\temp_screenshots';

const imagesToCopy = [
  'after_close_click_1780510280134.png',
  'media__1780513048404.png',
  'media__1780513233960.png',
  'media__1780517814826.png'
];

imagesToCopy.forEach(imgName => {
  const srcFile = path.join(srcDir, imgName);
  const destFile = path.join(destDir, 'june3_' + imgName);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, destFile);
    console.log(`Copied ${imgName} successfully.`);
  } else {
    console.log(`Source image ${imgName} does not exist.`);
  }
});

process.exit(0);
