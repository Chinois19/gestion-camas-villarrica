const fs = require('fs');
const file = 'src/components/SolicitudForm.jsx';
let content = fs.readFileSync(file, 'utf8');

// Normalize to LF
content = content.replace(/\r\n/g, '\n');

const s1Match = content.match(/(\s*\{\/\* 1\. DATOS DEL PACIENTE \*\/\}[\s\S]*?)(?=\s*\{\/\* 2\. DIAGNÓSTICO CLÍNICO \*\/\}|$)/);
const s2Match = content.match(/(\s*\{\/\* 2\. DIAGNÓSTICO CLÍNICO \*\/\}[\s\S]*?)(?=\s*\{\/\* 3\. GESTIÓN DE LA DERIVACIÓN \*\/\}|$)/);
const s3Match = content.match(/(\s*\{\/\* 3\. GESTIÓN DE LA DERIVACIÓN \*\/\}[\s\S]*?)(?=\s*<\/div>\n\n\s*\{\/\* Columna Derecha|$)/);

const rightColStartStr = "          {/* Columna Derecha: Signos Vitales, Requerimientos Clínicos, Evoluciones Clínicas */}\n          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>";
const s4Start = content.indexOf("{/* 4. REQUERIMIENTOS CLÍNICOS */}");
const s5Start = content.indexOf("{/* 5. REGISTRO DE EVOLUCIONES CLÍNICAS */}");
const rightColEnd = content.indexOf("          </div>\n\n        </div>\n\n        {/* Footer */}");

if (!s1Match || !s2Match || !s3Match || s4Start === -1 || s5Start === -1 || rightColEnd === -1) {
    console.error("Failed to parse");
    process.exit(1);
}

const s1Code = s1Match[0];
const s2Code = s2Match[0];
const s3Code = s3Match[0];

// S4 ends right before S5
const s4Code = content.substring(content.lastIndexOf('\n', s4Start) + 1, content.lastIndexOf('\n', s5Start) + 1);

// S5 ends at rightColEnd
const s5Code = content.substring(content.lastIndexOf('\n', s5Start) + 1, rightColEnd);

// Find the start of the whole grid
const gridStartIdx = content.indexOf("        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>");

const beforeGrid = content.substring(0, gridStartIdx);
const afterGrid = content.substring(rightColEnd + "          </div>\n\n        </div>\n\n".length);

const newGrid = '        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>\n' +
'          {/* Fila 1: 1. Datos del Paciente | 3. Gestión de la Derivación */}\n' +
'          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>\n' +
s1Code + s3Code + '          </div>\n\n' +
'          {/* Fila 2: 2. Diagnóstico Clínico | 4. Requerimientos Clínicos */}\n' +
'          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>\n' +
s2Code + s4Code + '          </div>\n\n' +
s5Code + '        </div>\n\n';

fs.writeFileSync(file, beforeGrid + newGrid + afterGrid);
console.log("Restructure successful!");
