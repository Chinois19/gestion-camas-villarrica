import fs from 'fs';
import path from 'path';

const srcDir = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\722ed42e-297a-45ce-b1a5-1910ab0bf4b4';
const destDir = 'c:\\Users\\Minsal\\OneDrive\\Aplicaciones Antigravity\\gestion-camas-villarrica\\temp_screenshots';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

const imagesToCopy = [
  'database_table_1780511840283.png',
  'database_panel_view_1780515909415.png',
  'print_attempt_screenshot_1780516347722.png',
  'hover_row_light_mode_1780516264439.png'
];

imagesToCopy.forEach(imgName => {
  const srcFile = path.join(srcDir, imgName);
  const destFile = path.join(destDir, imgName);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, destFile);
    console.log(`Copied ${imgName} successfully.`);
  } else {
    console.log(`Source image ${imgName} does not exist.`);
  }
});

process.exit(0);
