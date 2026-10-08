import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
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

async function inspectDocs() {
  await signInWithEmailAndPassword(auth, 'admin@hospitalvillarrica.cl', 'admin0');
  const d1 = await getDoc(doc(db, 'beds', 'piso3_poniente_304_1'));
  const d2 = await getDoc(doc(db, 'beds', 'piso3_poniente_304_2'));
  console.log('--- piso3_poniente_304_1 ---');
  console.log(JSON.stringify(d1.data(), null, 2));
  console.log('--- piso3_poniente_304_2 ---');
  console.log(JSON.stringify(d2.data(), null, 2));
}

inspectDocs().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
