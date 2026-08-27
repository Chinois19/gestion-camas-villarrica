import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain';

function findTranscriptFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findTranscriptFiles(fullPath));
    } else {
      if (file === 'transcript.jsonl' || file === 'overview.txt') {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const allLogs = findTranscriptFiles(brainDir);
console.log(`Found ${allLogs.length} log files. Scanning for patients...`);

allLogs.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.toLowerCase().includes('camaño') || content.toLowerCase().includes('iturra')) {
    console.log(`\nMatch found in file: ${file}`);
    // Let's print out lines containing the matches or find if there is a large JSON block.
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes('camaño') || line.toLowerCase().includes('iturra')) {
        console.log(`  Line ${idx} (length ${line.length}):`);
        // If line is very long, print a snippet around the match
        if (line.length > 500) {
          const matchIdx = line.toLowerCase().indexOf('camaño');
          const start = Math.max(0, matchIdx - 200);
          const end = Math.min(line.length, matchIdx + 800);
          console.log(`    Snippet: ...${line.substring(start, end)}...`);
        } else {
          console.log(`    Content: ${line}`);
        }
      }
    });
  }
});
process.exit(0);
