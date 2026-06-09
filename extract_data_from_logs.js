import fs from 'fs';
import path from 'path';

const files = [
  'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\157ee9ec-922f-47a8-94f9-c135b9115289\\.system_generated\\logs\\overview.txt',
  'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\21673a45-9446-4c0a-8442-8534ae3ef033\\.system_generated\\logs\\overview.txt',
  'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\2c32f0b3-e241-47da-b51d-ac032f3cf17b\\.system_generated\\logs\\transcript.jsonl',
  'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\6f1a8f0c-53ab-4c18-95e0-d2cca9c61b54\\.system_generated\\logs\\overview.txt',
  'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\722ed42e-297a-45ce-b1a5-1910ab0bf4b4\\.system_generated\\logs\\overview.txt',
  'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\a782d4d0-85cd-414c-ad81-f684cba57b52\\.system_generated\\logs\\overview.txt',
  'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\cec4339c-a0b9-497f-868e-319e0b464289\\.system_generated\\logs\\transcript.jsonl'
];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`File does not exist: ${file}`);
    return;
  }
  const content = fs.readFileSync(file, 'utf-8');
  console.log(`\nScanning ${file}...`);
  
  // Look for JSON-like strings that contain 'bedsData' or 'piso4'
  // Or match occurrences of something like '"piso4":' or 'initialBedsData'
  
  // Let's do a simple count of occurrences of some patient names or structural terms
  const occurrences = {
    'piso4': (content.match(/piso4/gi) || []).length,
    'piso3': (content.match(/piso3/gi) || []).length,
    'piso2': (content.match(/piso2/gi) || []).length,
    'occupied': (content.match(/occupied/gi) || []).length,
    'bedsData': (content.match(/bedsData/gi) || []).length
  };
  console.log('Occurrences:', occurrences);

  // Let's find any large JSON object (like starting with { and having piso4, piso3)
  // Let's write a simple regex or check
  const regex = /\{[^{}]*"piso4"[^{}]*\}/g; // this is too simple, but let's see
  
  // Let's try to extract JSON-like substrings
  // Since we want to find if there's a dump, we can search for a pattern where there's a huge block of text starting with '{' or '['
  // Let's do a quick scan for lines that are very long and contain JSON
  const lines = content.split('\n');
  let foundBigLine = false;
  lines.forEach((line, idx) => {
    if (line.length > 5000 && (line.includes('piso4') || line.includes('bedsData'))) {
      console.log(`Line ${idx} is long (${line.length} chars) and contains piso4/bedsData!`);
      foundBigLine = true;
      // Print first 200 chars of this line
      console.log(`  Preview: ${line.substring(0, 300)}...`);
    }
  });
});
