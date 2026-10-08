import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfigDev = {
  apiKey: "AIzaSyDoYbGq5_sWpLqLC3smvJyofAzVON2L23M",
  authDomain: "desarrollo-df407.firebaseapp.com",
  projectId: "desarrollo-df407",
  storageBucket: "desarrollo-df407.firebasestorage.app",
  messagingSenderId: "787990754227",
  appId: "1:787990754227:web:21d68d328220fffd3c11c6"
};

const app = initializeApp(firebaseConfigDev);
const db = getFirestore(app);

function cleanRut(rut) {
  if (!rut) return '';
  return String(rut).replace(/[^0-9kK]/g, '').toUpperCase();
}

async function checkPatient119() {
  const censoUrl = 'https://controgestion.pythonanywhere.com/api/exportarDataRegistroCenso/';
  const basicAuth = 'Basic ' + Buffer.from('admin:Controldegestion2025').toString('base64');
  const censoRes = await fetch(censoUrl, { headers: { 'Authorization': basicAuth } });
  const censoAll = await censoRes.json();
  const censoActivos = censoAll.filter(d => !d.fecha_egreso || d.fecha_egreso.trim() === '');

  const bedsSnap = await getDocs(collection(db, 'beds'));
  const appBeds = [];
  bedsSnap.forEach(d => appBeds.push(d.data()));

  const appBedsMap = new Map();
  appBeds.forEach(b => {
    const k = `${b.roomId}_${b.bedNumber || b.id}`;
    appBedsMap.set(k, b);
  });

  console.log(`Analizando los ${censoActivos.length} activos de Censo...`);
  censoActivos.forEach(c => {
    const k = `${c.habitacion}_${c.numero_cama}`;
    const b = appBedsMap.get(k);
    if (!b) {
      console.log(`\n[PACIENTE EN CAMA QUE NO EXISTE EN APP]`);
      console.log(`Paciente: ${c.nombre_completo} | RUT: ${c.rut_paciente}`);
      console.log(`Habitación: ${c.habitacion} | Cama: ${c.numero_cama}`);
    }
  });

  // Ver detalles de Sala 418 en App
  console.log('\n--- Camas en Sala 418 en App ---');
  appBeds.filter(b => String(b.roomId) === '418').forEach(b => {
    console.log(`Cama ${b.bedNumber || b.id}: Status=${b.status} | Paciente=${b.patient || 'libre'} | RUT=${b.rut || '—'}`);
  });
}

checkPatient119().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
