import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ruts418 = ['7065046-0', '10252916-2', '10188073-7'];

function cleanRut(r) {
  if (!r) return '';
  return String(r).replace(/[^0-9kK]/g, '').toUpperCase();
}

async function verifyInAllDataFiles() {
  const dataDir = path.join(rootDir, 'src', 'data');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

  for (const fileName of files) {
    const fullPath = path.join(dataDir, fileName);
    try {
      const buffer = fs.readFileSync(fullPath);
      const wb = XLSX.read(buffer, { type: 'buffer' });
      console.log(`\n======================================================`);
      console.log(`ARCHIVO: ${fileName}`);
      console.log(`======================================================`);

      for (const sheetName of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
        if (rows.length === 0) continue;
        const headers = rows[0];

        // Buscar filas que contengan los RUTs
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rowStr = JSON.stringify(row);
          for (const rut of ruts418) {
            const cleanTarget = cleanRut(rut);
            if (rowStr.includes(rut) || rowStr.includes(cleanTarget)) {
              console.log(`\n  ✅ ENCONTRADO en [Hoja: ${sheetName}] Fila #${i + 1}:`);
              // Mostrar pares header -> valor
              const record = {};
              headers.forEach((h, idx) => {
                if (row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== '') {
                  record[h || `Col_${idx}`] = row[idx];
                }
              });
              console.log(JSON.stringify(record, null, 2));
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error procesando ${fileName}:`, err.message);
    }
  }
}

verifyInAllDataFiles().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
