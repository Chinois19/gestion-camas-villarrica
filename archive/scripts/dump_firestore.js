import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from 'fs';

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

async function dump() {
  const allData = {};
  for (const docId of ['bedsData', 'waitingList', 'hodomRequests', 'users']) {
    const docRef = doc(db, 'appState', docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      allData[docId] = snap.data().data;
    } else {
      allData[docId] = null;
    }
  }
  fs.writeFileSync('firestore_dump.json', JSON.stringify(allData, null, 2), 'utf-8');
  console.log("Dumped Firestore to firestore_dump.json");
  process.exit(0);
}
dump().catch(console.error);
