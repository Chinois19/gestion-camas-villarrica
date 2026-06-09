import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

async function main() {
  const docRef = doc(db, 'appState', 'bedsData');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const beds = snap.data().data;
    console.log("=== PISO 4 ===");
    console.log(JSON.stringify(beds.piso4, null, 2));
  } else {
    console.log("No bedsData document found!");
  }
}

main().then(() => process.exit(0));
