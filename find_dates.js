import fs from 'fs';

const data = JSON.parse(fs.readFileSync('firestore_dump.json', 'utf8'));

const datePatterns = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/
];

const paths = [];

function searchDates(obj, path = '') {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'string') {
    if (datePatterns.some(p => p.test(obj))) {
      paths.push(`${path} = ${obj}`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => searchDates(item, `${path}[${index}]`));
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      searchDates(obj[key], `${path}.${key}`);
    }
  }
}

searchDates(data);

console.log("Found dates:");
paths.slice(0, 50).forEach(p => console.log(p));
console.log(`Total dates found: ${paths.length}`);
