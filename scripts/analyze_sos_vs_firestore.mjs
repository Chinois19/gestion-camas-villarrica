import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBIdM0cYhzO03k4nGjJH3W906R2xeRBpso",
  authDomain: "gestion-camas-villarrica.firebaseapp.com",
  projectId: "gestion-camas-villarrica",
  storageBucket: "gestion-camas-villarrica.firebasestorage.app",
  messagingSenderId: "224302432807",
  appId: "1:224302432807:web:ef62069f0b1e4b64298402"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function cleanRut(rut) {
  if (!rut) return '';
  return String(rut).replace(/[^0-9kK]/g, '').toUpperCase();
}

async function analyze() {
  const sosFile = 'C:\\Users\\Minsal\\Desktop\\Actualización de aplicativo Gestión de camas\\PLANILLA HOSPITALIZADOS SOS 2026 .xlsx';
  const buf = fs.readFileSync(sosFile);
  const wb = XLSX.read(buf, { type: 'buffer' });

  // Hoja más reciente
  const targetSheetName = '27-09 N ';
  const sheet = wb.Sheets[targetSheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`Analizando hoja: "${targetSheetName}" (Total filas: ${rawRows.length})`);
  console.log(`Encabezado Turno: ${rawRows[0] ? rawRows[0][0] : ''}`);
  console.log(`Columnas Fila 1:`, rawRows[1]);

  // Cabeceras esperadas:
  // [0] SERVICIO DE ACUESTE, [1] SALA, [2] CAMA, [3] FECHA INGRESO, [4] NOMBRE, [5] RUN, [6] EDAD, [7] DIAGNÓSTICOS, [8] ESPECIALIDADES, [9] ACTUALIZACIÓN, [10] ESTADA, [11] PRECAUCIONES, [12] COMUNA

  const sosPatients = [];
  let currentService = '';

  for (let i = 2; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const serv = row[0] ? String(row[0]).trim() : '';
    if (serv) currentService = serv;

    const sala = row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : '';
    const cama = row[2] !== undefined && row[2] !== null ? String(row[2]).trim() : '';
    const fechaIngreso = row[3] !== undefined && row[3] !== null ? String(row[3]).trim() : '';
    const nombre = row[4] ? String(row[4]).trim() : '';
    const run = row[5] ? String(row[5]).trim() : '';
    const edad = row[6] ? String(row[6]).trim() : '';
    const diag = row[7] ? String(row[7]).trim() : '';
    const especialidad = row[8] ? String(row[8]).trim() : '';
    const actualizacion = row[9] ? String(row[9]).trim() : '';
    const estada = row[10] ? String(row[10]).trim() : '';
    const precauciones = row[11] ? String(row[11]).trim() : '';
    const comuna = row[12] ? String(row[12]).trim() : '';

    if (sala || cama || nombre || run) {
      sosPatients.push({
        rowIndex: i + 1,
        service: currentService,
        sala,
        cama,
        fechaIngreso,
        nombre,
        run,
        edad,
        diagnostico: diag,
        especialidad,
        actualizacion,
        estada,
        precauciones,
        comuna,
        isOccupied: Boolean(run || nombre)
      });
    }
  }

  console.log(`Total registros en SOS: ${sosPatients.length}`);
  const occupiedInSos = sosPatients.filter(p => p.isOccupied);
  console.log(`Pacientes ocupando cama en SOS: ${occupiedInSos.length}`);

  // Mostrar muestra de pacientes
  console.log('\n--- Muestra de primeros 10 pacientes SOS ---');
  occupiedInSos.slice(0, 10).forEach(p => {
    console.log(`[Fila ${p.rowIndex}] Servicio: ${p.service} | Sala: ${p.sala} | Cama: ${p.cama} | RUN: ${p.run} | Nombre: ${p.nombre}`);
  });

  // Consultar Firestore
  console.log('\nConsultando Firestore "beds"...');
  await signInWithEmailAndPassword(auth, 'admin@hospitalvillarrica.cl', 'admin0');
  const snap = await getDocs(collection(db, 'beds'));
  const firestoreBeds = [];
  snap.forEach(doc => firestoreBeds.push({ id: doc.id, ...doc.data() }));
  console.log(`Total camas en Firestore: ${firestoreBeds.length}`);

  const occupiedInFirestore = firestoreBeds.filter(b => b.status === 'occupied');
  console.log(`Camas ocupadas en Firestore: ${occupiedInFirestore.length}`);

  // Comparación básica
  const fsByRut = new Map();
  occupiedInFirestore.forEach(b => {
    if (b.rut) fsByRut.set(cleanRut(b.rut), b);
  });

  const sosByRut = new Map();
  occupiedInSos.forEach(p => {
    if (p.run) sosByRut.set(cleanRut(p.run), p);
  });

  console.log(`\n--- PACIENTES EN SOS QUE NO ESTÁN EN FIRESTORE ---`);
  let countMissingInFs = 0;
  for (const [rut, p] of sosByRut.entries()) {
    if (!fsByRut.has(rut)) {
      countMissingInFs++;
      console.log(`- SOS: Sala ${p.sala}, Cama ${p.cama} (${p.service}) | RUN: ${p.run} | ${p.nombre} | Dg: ${p.diagnostico}`);
    }
  }
  console.log(`Total pacientes en SOS faltantes en Firestore: ${countMissingInFs}`);

  console.log(`\n--- PACIENTES OCUPADOS EN FIRESTORE QUE NO ESTÁN EN SOS ---`);
  let countExtraInFs = 0;
  for (const [rut, b] of fsByRut.entries()) {
    if (!sosByRut.has(rut)) {
      countExtraInFs++;
      console.log(`- FIRESTORE: Sala ${b.roomId}, Cama ${b.bedNumber} (${b.service}) | RUN: ${b.rut} | ${b.patientName} | Dg: ${b.diagnosis}`);
    }
  }
  console.log(`Total pacientes en Firestore que no aparecen en SOS: ${countExtraInFs}`);
}

analyze().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
