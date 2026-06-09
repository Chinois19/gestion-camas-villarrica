import fs from 'fs';
import path from 'path';

const dirPath = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\6f1a8f0c-53ab-4c18-95e0-d2cca9c61b54';

function listRecursive(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(listRecursive(full));
    } else {
      results.push({
        rel: path.relative(dirPath, full),
        size: stat.size
      });
    }
  });
  return results;
}

const files = listRecursive(dirPath);
console.log(`Found ${files.length} files in June 4th conv folder:`);
files.forEach(f => {
  console.log(`- ${f.rel} (${f.size} bytes)`);
});
process.exit(0);
