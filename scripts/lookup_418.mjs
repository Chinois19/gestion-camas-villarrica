import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const ruts418 = ['70650460', '102529162', '101880737'];

function cleanRut(r) {
  if (!r) return '';
  return String(r).replace(/[^0-9kK]/g, '').toUpperCase();
}

async function lookup418() {
  const dataDir = path.join(rootDir, 'src', 'data');
  const buffer = fs.readFileSync(path.join(dataDir, 'Reporte de ingresos (1).xlsx'));
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

  for (const r of ruts418) {
    const m = rows.filter(row => cleanRut(row.__EMPTY_3) === r || JSON.stringify(row).includes(r));
    console.log(`\n=== PACIENTE RUT ${r} (${m.length} matches en Ingresos) ===`);
    m.forEach(row => {
      console.log({
        nombre: row.__EMPTY_2,
        rut: row.__EMPTY_3,
        fnac: row.__EMPTY_4,
        fIngreso: row.__EMPTY_5,
        prevision: row.__EMPTY_8,
        diagnostico: row.__EMPTY_12,
        medicoTratante: row.__EMPTY_13,
        especialidad: row.__EMPTY_14,
        camaAsignada: row.__EMPTY_16
      });
    });
  }
}

lookup418().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
