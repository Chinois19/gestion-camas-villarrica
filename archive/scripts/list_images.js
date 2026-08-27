import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const images = [];
walkDir(brainDir, (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (['.png', '.webp', '.jpg', '.jpeg'].includes(ext)) {
    const stats = fs.statSync(filePath);
    images.push({ filePath, size: stats.size, mtime: stats.mtime });
  }
});

// Sort by modification time descending (newest first)
images.sort((a, b) => b.mtime - a.mtime);

console.log(`Found ${images.length} images:`);
images.forEach(img => {
  console.log(`- ${img.filePath} (${(img.size/1024).toFixed(1)} KB) - Modified: ${img.mtime.toISOString()}`);
});

process.exit(0);
