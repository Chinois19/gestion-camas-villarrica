import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targetRuts = [
  '125658210',
  '207824100',
  '294446974',
  '294451749'
];

function cleanRut(r) {
  if (!r) return '';
  return String(r).replace(/[^0-9kK]/g, '').toUpperCase();
}

async function readExcelFiles() {
  const dataDir = path.join(rootDir, 'src', 'data');
  const dirFiles = fs.readdirSync(dataDir);

  for (const f of dirFiles) {
    if (!f.endsWith('.xlsx') && !f.endsWith('.xls')) continue;
    const fullPath = path.join(dataDir, f);
    try {
      const buffer = fs.readFileSync(fullPath);
      const wb = XLSX.read(buffer, { type: 'buffer' });
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        
        for (const rut of targetRuts) {
          const matches = rows.filter(row => {
            const str = JSON.stringify(row);
            return cleanRut(row.RUT || row.rut || row.RUN || row.run || row['RUT PACIENTE'] || row['Run Paciente']) === rut ||
                   str.includes(rut) ||
                   (rut.length >= 8 && str.includes(rut.slice(0, -1)));
          });

          if (matches.length > 0) {
            console.log(`\n[MATCH] RUT ${rut} en ${f} [Hoja: ${sheetName}]:`);
            matches.forEach(m => console.log('  ', JSON.stringify(m, null, 2)));
          }
        }
      }
    } catch (e) {
      console.error(`Error leyendo ${f}:`, e.message);
    }
  }
}

readExcelFiles().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
