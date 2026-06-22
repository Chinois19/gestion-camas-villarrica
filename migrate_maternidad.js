import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

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

async function run() {
  for (const docId of ['bedsData', 'waitingList', 'hodomRequests']) {
    const docRef = doc(db, 'appState', docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      console.log(`No ${docId} in firestore`);
      continue;
    }
    
    let dataStr = JSON.stringify(snap.data());
    dataStr = dataStr.replace(/"Maternidad"/g, '"GINE/PUERPERIO"');
    dataStr = dataStr.replace(/"maternidad"/g, '"gine/puerperio"');
    
    const newData = JSON.parse(dataStr);
    
    await updateDoc(docRef, newData);
    console.log(`Updated ${docId} successfully!`);
  }
  process.exit(0);
}

run().catch(console.error);
