import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function listAll() {
  // We can't easily list all collections in the web client SDK without admin SDK,
  // but we can query collections we know, and see if there are other known collections.
  // Wait! Let's try to list documents in 'appState' and any other collections.
  const collectionsToTry = ['appState', 'bedsData', 'patients', 'users', 'waitingList', 'hodomRequests'];
  for (const collName of collectionsToTry) {
    try {
      const colRef = collection(db, collName);
      const snap = await getDocs(colRef);
      console.log(`Collection '${collName}': ${snap.size} documents`);
      snap.forEach(doc => {
        console.log(`  - Doc ID: ${doc.id}, data keys:`, Object.keys(doc.data()));
      });
    } catch (e) {
      console.log(`Failed to list collection '${collName}':`, e.message);
    }
  }
  process.exit(0);
}
listAll().catch(console.error);
