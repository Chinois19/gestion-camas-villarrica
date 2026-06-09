import fs from 'fs';

const dumpFile = 'c:\\Users\\Minsal\\OneDrive\\Aplicaciones Antigravity\\gestion-camas-villarrica\\firestore_dump.json';

if (fs.existsSync(dumpFile)) {
  const stat = fs.statSync(dumpFile);
  console.log("File exists!");
  console.log("Size:", stat.size, "bytes");
  console.log("Created/Modified:", stat.mtime.toISOString());
  
  const content = JSON.parse(fs.readFileSync(dumpFile, 'utf-8'));
  console.log("Keys in dump:", Object.keys(content));
  if (content.bedsData) {
    console.log("bedsData keys/floors:", Object.keys(content.bedsData));
  }
} else {
  console.log("File does not exist.");
}
process.exit(0);
