import fs from 'fs';
const dump = JSON.parse(fs.readFileSync('firestore_dump.json', 'utf-8'));
console.log("Users in dump:", dump.users);
process.exit(0);
