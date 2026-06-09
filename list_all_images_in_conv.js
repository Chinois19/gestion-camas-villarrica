import fs from 'fs';
import path from 'path';

const baseDir = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\722ed42e-297a-45ce-b1a5-1910ab0bf4b4';

function findImages(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findImages(fullPath));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.png', '.webp', '.jpg', '.jpeg'].includes(ext)) {
        results.push({
          path: fullPath,
          size: stat.size,
          mtime: stat.mtime
        });
      }
    }
  });
  return results;
}

const images = findImages(baseDir);
console.log(`Found ${images.length} images:`);
images.forEach(img => {
  console.log(`- Path: ${img.path}`);
  console.log(`  Size: ${img.size} bytes`);
  console.log(`  Modified: ${img.mtime.toISOString()}`);
});
process.exit(0);
