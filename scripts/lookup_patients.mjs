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

async function searchInFiles() {
  console.log('=== BÚSQUEDA CLÍNICA DE LOS 4 PACIENTES ===\n');

  // Primero consultar Censo API completa
  console.log('>>> Consultando API Censo (todos los registros, incluidos egresados)...');
  const censoUrl = 'https://controgestion.pythonanywhere.com/api/exportarDataRegistroCenso/';
  const basicAuth = 'Basic ' + Buffer.from('admin:Controldegestion2025').toString('base64');
  try {
    const censoRes = await fetch(censoUrl, { headers: { 'Authorization': basicAuth } });
    const censoData = await censoRes.json();
    console.log(`Total registros en Censo API: ${censoData.length}`);

    for (const rut of targetRuts) {
      const matches = censoData.filter(d => cleanRut(d.rut_paciente) === rut);
      console.log(`\n[CENSO API] RUT ${rut} (${matches.length} registros):`);
      matches.forEach(m => {
        console.log(`  - Paciente: ${m.nombre_completo}`);
        console.log(`    Hab: ${m.habitacion} Cama: ${m.numero_cama} Sector: ${m.sector || m.servicio}`);
        console.log(`    F. Ingreso: ${m.fecha_ingreso} | F. Egreso: ${m.fecha_egreso}`);
        console.log(`    Tipo Egreso: ${m.tipo_egreso || m.motivo_egreso || m.destino || '—'}`);
        console.log(`    Diagnóstico: ${m.diagnostico || m.diagnostico_cie10 || '—'}`);
        console.log(`    Médico: ${m.medico || m.medico_tratante || '—'}`);
      });
    }
  } catch (err) {
    console.error('Error consultando API Censo:', err.message);
  }

  // Ahora leer archivos Excel
  const dataDir = path.join(rootDir, 'src', 'data');
  const dirFiles = fs.readdirSync(dataDir);

  for (const f of dirFiles) {
    if (!f.endsWith('.xlsx') && !f.endsWith('.xls')) continue;
    const fullPath = path.join(dataDir, f);
    console.log(`\n>>> Leyendo ${f}...`);
    try {
      const wb = XLSX.readFile(fullPath);
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
            console.log(`  [MATCH] RUT ${rut} en ${f} [Hoja: ${sheetName}] (${matches.length} coincidencia(s)):`);
            matches.slice(0, 3).forEach(m => console.log('   ', JSON.stringify(m)));
          }
        }
      }
    } catch (e) {
      console.error(`Error leyendo ${f}:`, e.message);
    }
  }
}

searchInFiles().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
