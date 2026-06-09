import fs from 'fs';

const srcFile = 'C:\\Users\\Minsal\\.gemini\\antigravity\\brain\\73013e1d-adb2-488a-8136-ae64c1a87170\\.system_generated\\logs\\overview.txt';
const destFile = 'c:\\Users\\Minsal\\OneDrive\\Aplicaciones Antigravity\\gestion-camas-villarrica\\overview_temp.txt';

if (fs.existsSync(srcFile)) {
  fs.copyFileSync(srcFile, destFile);
  console.log("Successfully copied to overview_temp.txt");
} else {
  console.log("Source file does not exist.");
}
process.exit(0);
