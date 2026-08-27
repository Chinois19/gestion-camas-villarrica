import fs from 'fs';
import path from 'path';

const baseDir = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain';

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
        // filter by modification date (June 4th or June 5th, 2026)
        const dateStr = stat.mtime.toISOString();
        if (dateStr.startsWith('2026-06-04') || dateStr.startsWith('2026-06-05')) {
          results.push({
            path: fullPath,
            size: stat.size,
            mtime: stat.mtime
          });
        }
      }
    }
  });
  return results;
}

const images = findImages(baseDir);
console.log(`Found ${images.length} recent images:`);
images.sort((a,b) => b.mtime - a.mtime);
images.forEach(img => {
  console.log(`- Path: ${img.path}`);
  console.log(`  Size: ${img.size} bytes`);
  console.log(`  Modified: ${img.mtime.toISOString()}`);
});
process.exit(0);
