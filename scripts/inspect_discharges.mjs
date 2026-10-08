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

async function inspectDischarges() {
  const snap = await getDocs(collection(db, 'discharges'));
  console.log(`Total documentos en discharges: ${snap.size}`);
  snap.docs.slice(0, 5).forEach(d => {
    const data = d.data();
    console.log(`\nDoc ID: ${d.id}`);
    console.log(`  patient: ${data.patient || data.nombre}`);
    console.log(`  rut: ${data.rut || data.run}`);
    console.log(`  piso: ${data.piso} | sector: ${data.sector} | habitacion: ${data.habitacion} | sala: ${data.sala} | cama: ${data.cama}`);
    console.log(`  dischargeAt: ${data.dischargeAt || data.fechaAlta}`);
  });
}

inspectDischarges().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
