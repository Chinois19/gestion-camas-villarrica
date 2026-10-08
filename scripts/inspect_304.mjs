import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

async function inspect304() {
  await signInWithEmailAndPassword(auth, 'admin@hospitalvillarrica.cl', 'admin0');
  const q = query(collection(db, 'beds'), where('roomId', '==', '304'));
  const snap = await getDocs(q);
  console.log(`Camas encontradas con roomId '304': ${snap.size}`);
  snap.forEach(d => {
    const data = d.data();
    console.log(`\nDoc ID: "${d.id}"`);
    console.log(`  canonicalId: "${data.canonicalId}" | roomId: "${data.roomId}" | bedNumber: "${data.bedNumber}" | id: "${data.id}"`);
    console.log(`  status: "${data.status}" | patient: "${data.patient}" | rut: "${data.rut}"`);
    console.log(`  floor: "${data.floor}" | sector: "${data.sector}"`);
  });

  const qAll = collection(db, 'beds');
  const snapAll = await getDocs(qAll);
  console.log('\n--- Buscando Isabella Sanhueza o RUT 29442568 en toda la colección beds ---');
  snapAll.forEach(d => {
    const data = d.data();
    if (JSON.stringify(data).includes('29442568') || JSON.stringify(data).toLowerCase().includes('sanhueza')) {
      console.log(`Encontrado en Doc ID: "${d.id}"`);
      console.log(`  canonicalId: "${data.canonicalId}" | roomId: "${data.roomId}" | bedNumber: "${data.bedNumber}" | status: "${data.status}"`);
      console.log(`  patient: "${data.patient}" | rut: "${data.rut}"`);
    }
  });
}

inspect304().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
