import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const folder = 'C:\\Users\\Minsal\\Desktop\\Actualización de aplicativo Gestión de camas';

const files = fs.readdirSync(folder);
console.log('Archivos encontrados:', files);

for (const file of files) {
  if (!file.endsWith('.xlsx') && !file.endsWith('.xls') && !file.endsWith('.csv')) continue;
  const filePath = path.join(folder, file);
  console.log(`\n======================================================`);
  console.log(`ANALIZANDO ARCHIVO: ${file}`);
  console.log(`======================================================`);
  try {
    const buffer = fs.readFileSync(filePath);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    console.log(`Hojas (${wb.SheetNames.length}):`, wb.SheetNames);
    
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`\n-- Hoja: "${sheetName}" | Total filas raw: ${rows.length}`);
      
      // Mostrar las primeras 5 filas no vacías
      const sample = rows.filter(r => r && r.length > 0).slice(0, 6);
      console.log('Primeras filas de muestra:');
      sample.forEach((row, idx) => {
        console.log(`  Fila ${idx}:`, JSON.stringify(row.slice(0, 15)));
      });
    }
  } catch (err) {
    console.error(`Error leyendo ${file}:`, err.message);
  }
}
