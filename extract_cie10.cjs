const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const desktopPath = path.join(process.env.USERPROFILE, 'Desktop');
const files = fs.readdirSync(desktopPath);
const file = files.find(f => f.includes('HOSPITALIZADOS HV-2026'));

if (!file) {
  console.log('File not found');
  process.exit(1);
}

const fullPath = path.join(desktopPath, file);
const workbook = xlsx.readFile(fullPath);
const sheet = workbook.Sheets['CEREBRO_GRD'];
const data = xlsx.utils.sheet_to_json(sheet);

const getGroup = (code) => {
  const letter = code.charAt(0).toUpperCase();
  const numStr = code.substring(1, 3);
  const num = parseInt(numStr, 10);
  
  if (['A','B'].includes(letter)) return 'Ciertas enfermedades infecciosas y parasitarias';
  if (letter === 'C' || (letter === 'D' && num <= 48)) return 'Tumores (Neoplasias)';
  if (letter === 'D') return 'Enfermedades de la sangre y de los órganos hematopoyéticos';
  if (letter === 'E') return 'Enfermedades endocrinas, nutricionales y metabólicas';
  if (letter === 'F') return 'Trastornos mentales y del comportamiento';
  if (letter === 'G') return 'Enfermedades del sistema nervioso';
  if (letter === 'H' && num <= 59) return 'Enfermedades del ojo y sus anexos';
  if (letter === 'H') return 'Enfermedades del oído y de la apófisis mastoides';
  if (letter === 'I') return 'Enfermedades del sistema circulatorio';
  if (letter === 'J') return 'Enfermedades del sistema respiratorio';
  if (letter === 'K') return 'Enfermedades del sistema digestivo';
  if (letter === 'L') return 'Enfermedades de la piel y el tejido subcutáneo';
  if (letter === 'M') return 'Enfermedades del sistema osteomuscular y del tejido conectivo';
  if (letter === 'N') return 'Enfermedades del aparato genitourinario';
  if (letter === 'O') return 'Embarazo, parto y puerperio';
  if (letter === 'P') return 'Ciertas afecciones originadas en el período perinatal';
  if (letter === 'Q') return 'Malformaciones congénitas, deformidades y anomalías cromosómicas';
  if (letter === 'R') return 'Síntomas, signos y hallazgos anormales clínicos y de laboratorio';
  if (['S','T'].includes(letter)) return 'Traumatismos, envenenamientos y consecuencias de causa externa';
  if (['V','W','X','Y'].includes(letter)) return 'Causas externas de morbilidad y de mortalidad';
  if (letter === 'Z') return 'Factores que influyen en el estado de salud';
  if (letter === 'U') return 'Códigos para propósitos especiales';
  return 'Otros';
};

const output = data.map(row => {
  const code = row['Diagnósticos CIE-10'];
  if(!code) return null;
  return {
    code: code.toString(),
    desc: row['Descripción Diagnósticos CIE-10']?.toString() || '',
    group: getGroup(code.toString())
  };
}).filter(r => r !== null);

fs.writeFileSync('src/data/cie10.json', JSON.stringify(output));
console.log('Saved to src/data/cie10.json, total:', output.length);
