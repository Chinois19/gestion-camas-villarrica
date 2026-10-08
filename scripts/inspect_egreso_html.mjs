import fs from 'fs';
import path from 'path';

const file = 'C:\\Users\\Minsal\\Desktop\\Actualización de aplicativo Gestión de camas\\EGRESO_HOSPITALARIO.xls';
const html = fs.readFileSync(file, 'utf8');

// Extraer filas tr y td/th
const rows = [];
const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
let trMatch;

while ((trMatch = trRegex.exec(html)) !== null) {
  const trContent = trMatch[1];
  const cells = [];
  const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let cellMatch;
  while ((cellMatch = cellRegex.exec(trContent)) !== null) {
    cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
  }
  if (cells.length > 0) rows.push(cells);
}

console.log(`Total filas encontradas en EGRESO_HOSPITALARIO.xls: ${rows.length}`);
if (rows.length > 0) {
  console.log('Cabeceras:', rows[0].slice(0, 15));
  for (let i = 1; i < Math.min(rows.length, 10); i++) {
    console.log(`Fila ${i}:`, rows[i].slice(0, 12));
  }
}
