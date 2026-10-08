import * as XLSX from 'xlsx';
import fs from 'fs';

const file = 'C:\\Users\\Minsal\\Desktop\\Actualización de aplicativo Gestión de camas\\Reporte de ingresos (2).xlsx';
const buf = fs.readFileSync(file);
const wb = XLSX.read(buf, { type: 'buffer' });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { range: 1 });

console.log(`Total ingresos en Reporte de ingresos (2).xlsx: ${rows.length}`);
console.log('Columnas detectadas:', Object.keys(rows[0] || {}));

const rutsInteres = [
  '12670119-5', // Guillermo Fuentealba
  '29442568-3', // Isabella Sanhueza
  '60905273-2', // Vicente Castillo
  '20055786-7', // Catalina Marilef
  '5711859-8',  // Elizabeth Jeria
  '21300439-5', // Catalina Urra
  '6442314-2',  // Yolanda Ruiz
  '10417169-9', // Walter Barrera
  '29417429-K', // Madelin Quintoman
  '22113560-1', // Javier Alarcon
  '20611409-6', // Jose Meza
  '20904500-1', // Juan Ñanco
  '23395586-8', // Arlethe Acevedo
  '10797999-9', // Mario Rubilar
  '5942531-5',  // Santiago Muñoz
  '3789846-5'   // Keller Kaba
];

function cleanRut(r) {
  if (!r) return '';
  return String(r).replace(/[^0-9kK]/g, '').toUpperCase();
}

console.log('\n--- MATCHES EN REPORTE DE INGRESOS ---');
for (const row of rows) {
  const rClean = cleanRut(row['RUN del paciente'] || row.RUT || row.RUN);
  for (const t of rutsInteres) {
    if (cleanRut(t) === rClean) {
      console.log(`\n[MATCH] ${row['RUN del paciente']} - ${row['Nombre del paciente']}`);
      console.log(`  Ficha: ${row['N° de ficha']} | F.Nac: ${row['Fecha de nacimiento']} | Admisión: ${row['Fecha y hora de admisión']}`);
      console.log(`  Procedencia: ${row['Procedencia']} | Previsión: ${row['Previsión']}`);
      console.log(`  Diagnóstico acueste: ${row['Glosa diagnóstico de acueste']}`);
      console.log(`  Médico acueste: ${row['Médico responsable del acueste']}`);
    }
  }
}
