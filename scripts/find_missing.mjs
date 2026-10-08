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

async function findMissing() {
  const censoUrl = 'https://controgestion.pythonanywhere.com/api/exportarDataRegistroCenso/';
  const basicAuth = 'Basic ' + Buffer.from('admin:Controldegestion2025').toString('base64');
  const censoRes = await fetch(censoUrl, { headers: { 'Authorization': basicAuth } });
  const censoAll = await censoRes.json();
  const censoActivos = censoAll.filter(d => !d.fecha_egreso || d.fecha_egreso.trim() === '');

  const bedsSnap = await getDocs(collection(db, 'beds'));
  const appBeds = [];
  bedsSnap.forEach(d => appBeds.push(d.data()));

  const appRuts = new Set(appBeds.filter(b => b.status === 'occupied' && b.rut).map(b => cleanRut(b.rut)));

  console.log(`Pacientes ocupados en App: ${appRuts.size}`);
  console.log(`Pacientes activos en Censo: ${censoActivos.length}`);

  const missingFromApp = censoActivos.filter(c => !appRuts.has(cleanRut(c.rut_paciente)));
  console.log(`\nPacientes activos en Censo que NO están en camas ocupadas de la App (${missingFromApp.length}):`);
  missingFromApp.forEach(c => {
    console.log(`- ${c.nombre_completo} | RUT: ${c.rut_paciente} | Hab: ${c.habitacion} Cama: ${c.numero_cama} | Ingreso: ${c.fecha_ingreso}`);
  });
}

findMissing().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
