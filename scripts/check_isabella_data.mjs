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

async function checkTransfersAndBackups() {
  await signInWithEmailAndPassword(auth, 'admin@hospitalvillarrica.cl', 'admin0');
  
  // Buscar en transfers
  const trSnap = await getDocs(collection(db, 'transfers'));
  console.log(`Total transfers en Firestore: ${trSnap.size}`);
  trSnap.forEach(d => {
    const data = d.data();
    if (JSON.stringify(data).includes('29442568') || JSON.stringify(data).toLowerCase().includes('sanhueza')) {
      console.log('Encontrado en transfers:', JSON.stringify(data, null, 2));
    }
  });

  // Buscar en appState/bedsData
  const appStateSnap = await getDoc(doc(db, 'appState', 'bedsData'));
  if (appStateSnap.exists()) {
    const str = JSON.stringify(appStateSnap.data());
    if (str.includes('29442568') || str.toLowerCase().includes('sanhueza')) {
      console.log('Encontrado en appState/bedsData!');
      // extraer datos
      const data = appStateSnap.data();
      const p3 = data?.piso3?.poniente || [];
      const r304 = p3.find(r => String(r.roomId) === '304');
      console.log('304 en appState/bedsData:', JSON.stringify(r304, null, 2));
    } else {
      console.log('No está en appState/bedsData');
    }
  }
}

checkTransfersAndBackups().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
