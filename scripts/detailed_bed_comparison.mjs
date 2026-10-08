import * as XLSX from 'xlsx';
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

function cleanBedNumber(b) {
  if (!b) return '';
  return String(b).replace(/[^0-9]/g, '');
}

async function detailedCompare() {
  const sosFile = 'C:\\Users\\Minsal\\Desktop\\Actualización de aplicativo Gestión de camas\\PLANILLA HOSPITALIZADOS SOS 2026 .xlsx';
  const buf = fs.readFileSync(sosFile);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheet = wb.Sheets['27-09 N '];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const sosBedMap = new Map(); // key: "room_bed" -> data
  let currentService = '';

  for (let i = 2; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const serv = row[0] ? String(row[0]).trim() : '';
    if (serv) currentService = serv;

    const sala = row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : '';
    const camaRaw = row[2] !== undefined && row[2] !== null ? String(row[2]).trim() : '';
    const cama = cleanBedNumber(camaRaw);

    if (!sala || !cama) continue; // SAIP o cabeceras sin cama física fija

    const key = `${sala}_${cama}`;
    sosBedMap.set(key, {
      row: i + 1,
      service: currentService,
      sala,
      cama,
      fechaIngreso: row[3] || '',
      nombre: row[4] ? String(row[4]).trim() : '',
      run: row[5] ? String(row[5]).trim() : '',
      edad: row[6] ? String(row[6]).trim() : '',
      diagnostico: row[7] ? String(row[7]).trim() : '',
      especialidad: row[8] ? String(row[8]).trim() : '',
      actualizacion: row[9] ? String(row[9]).trim() : '',
      estada: row[10] ? String(row[10]).trim() : '',
      precauciones: row[11] ? String(row[11]).trim() : '',
      comuna: row[12] ? String(row[12]).trim() : ''
    });
  }

  console.log(`Camas mapeadas en SOS: ${sosBedMap.size}`);

  await signInWithEmailAndPassword(auth, 'admin@hospitalvillarrica.cl', 'admin0');
  const snap = await getDocs(collection(db, 'beds'));
  const fsBedMap = new Map();

  snap.forEach(doc => {
    const d = doc.data();
    const key = `${d.roomId}_${d.bedNumber}`;
    fsBedMap.set(key, { docId: doc.id, ...d });
  });
  console.log(`Camas en Firestore: ${fsBedMap.size}`);

  const diffs = [];
  const matches = [];

  for (const [key, sos] of sosBedMap.entries()) {
    const fsBed = fsBedMap.get(key);
    const sosRutClean = cleanRut(sos.run);
    const fsRutClean = fsBed ? cleanRut(fsBed.rut) : '';
    const isSosOccupied = Boolean(sosRutClean);
    const isFsOccupied = fsBed && fsBed.status === 'occupied' && Boolean(fsRutClean);

    if (!fsBed) {
      diffs.push({
        key,
        type: 'CAMA_NO_EXISTE_EN_APP',
        sos,
        fs: null
      });
      continue;
    }

    if (!isSosOccupied && !isFsOccupied) {
      // Ambas libres
      matches.push({ key, type: 'AMBAS_DISPONIBLES' });
    } else if (isSosOccupied && isFsOccupied && (sosRutClean === fsRutClean || (sosRutClean.slice(0, -1) === fsRutClean.slice(0, -1)))) {
      // Mismo paciente
      matches.push({ key, type: 'COINCIDE_PACIENTE', rut: sos.run, name: sos.nombre });
    } else if (isSosOccupied && !isFsOccupied) {
      // Ocupada en SOS pero libre en Firestore
      diffs.push({
        key,
        type: 'OCUPADA_EN_SOS_PERO_LIBRE_EN_APP',
        sos,
        fs: fsBed
      });
    } else if (!isSosOccupied && isFsOccupied) {
      // Libre en SOS pero ocupada en Firestore (egreso no registrado en App)
      diffs.push({
        key,
        type: 'LIBRE_EN_SOS_PERO_OCUPADA_EN_APP',
        sos,
        fs: fsBed
      });
    } else {
      // Distinto paciente
      diffs.push({
        key,
        type: 'DISTINTO_PACIENTE',
        sos,
        fs: fsBed
      });
    }
  }

  console.log(`\n======================================================`);
  console.log(`RESUMEN COMPARATIVO CAMA POR CAMA (SOS vs FIRESTORE)`);
  console.log(`======================================================`);
  console.log(`Coincidencias perfectas: ${matches.length}`);
  console.log(`Discrepancias encontradas: ${diffs.length}`);

  console.log('\n--- DETALLE DE DISCREPANCIAS ---');
  diffs.forEach(d => {
    console.log(`\n[${d.type}] Cama: ${d.key}`);
    if (d.sos) {
      console.log(`  SOS: RUN=${d.sos.run || 'VACIA'} | Nombre=${d.sos.nombre} | Dg=${d.sos.diagnostico} | Esp=${d.sos.especialidad}`);
      if (d.sos.actualizacion) console.log(`       Evolución SOS: ${d.sos.actualizacion.replace(/\n/g, ' ')}`);
    }
    if (d.fs) {
      console.log(`  APP: Status=${d.fs.status} | RUN=${d.fs.rut || 'VACIA'} | Nombre=${d.fs.patientName} | Dg=${d.fs.diagnosis}`);
    }
  });
}

detailedCompare().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
