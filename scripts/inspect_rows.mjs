import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targetRows = [603, 727, 917];

async function inspectRows() {
  const dataDir = path.join(rootDir, 'src', 'data');
  const buffer = fs.readFileSync(path.join(dataDir, 'Reporte de ingresos (1).xlsx'));
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headers = rows[0];

  for (const rowIdx of targetRows) {
    const row = rows[rowIdx - 1];
    console.log(`\n================== FILA #${rowIdx} ==================`);
    const obj = {};
    row.forEach((val, i) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const h = headers[i] || `Col_${i}`;
        obj[h] = val;
      }
    });
    console.log(JSON.stringify(obj, null, 2));
  }
}

inspectRows().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
