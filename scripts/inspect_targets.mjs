import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDoYbGq5_sWpLqLC3smvJyofAzVON2L23M",
  authDomain: "desarrollo-df407.firebaseapp.com",
  projectId: "desarrollo-df407",
  storageBucket: "desarrollo-df407.firebasestorage.app",
  messagingSenderId: "787990754227",
  appId: "1:787990754227:web:21d68d328220fffd3c11c6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectTargetBeds() {
  console.log('=== INSPECCIONANDO ESTADO ACTUAL EN DESARROLLO (desarrollo-df407) ===\n');

  const bedsCol = collection(db, 'beds');
  const snap = await getDocs(bedsCol);
  
  const targets = ['403_1', '403_2', '404_2', '304_3', '304_5'];
  const foundBeds = [];

  snap.forEach(d => {
    const data = d.data();
    for (const t of targets) {
      if (d.id.includes(t)) {
        foundBeds.push({ docId: d.id, ...data });
      }
    }
  });

  console.log(`Encontradas ${foundBeds.length} camas objetivo:`);
  for (const b of foundBeds) {
    console.log(`\n-----------------------------------------`);
    console.log(`ID: ${b.docId}`);
    console.log(`Piso: ${b.floor} | Sector: ${b.sector} | Sala: ${b.roomId} | Cama: ${b.bedNumber || b.id}`);
    console.log(`Status: ${b.status}`);
    console.log(`Paciente: ${b.patient} | RUT: ${b.rut}`);
    console.log(`assignedAt: ${b.assignedAt}`);
    console.log(`Diagnóstico: ${JSON.stringify(b.diagnosis || b.dxPrincipal)}`);
    console.log(`Interconsultas: ${JSON.stringify(b.interconsultas || [])}`);
    console.log(`Evoluciones: ${(b.evolutions || []).length}`);
  }
}

inspectTargetBeds().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
