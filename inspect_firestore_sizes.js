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
  const documents = [
    'bedsData',
    'waitingList',
    'hodomRequests',
    'activeUsers',
    'transferHistory',
    'waitingListDischarges',
    'blockLog',
    'users'
  ];
  
  for (const docId of documents) {
    try {
      const docRef = doc(db, 'appState', docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const jsonStr = JSON.stringify(data);
        console.log(`Document: appState/${docId}`);
        console.log(`  - Size: ${(jsonStr.length / 1024).toFixed(2)} KB (${jsonStr.length} chars)`);
        if (data.data) {
          if (Array.isArray(data.data)) {
            console.log(`  - Type: Array of ${data.data.length} items`);
          } else {
            console.log(`  - Type: Object with keys:`, Object.keys(data.data));
          }
        }
      } else {
        console.log(`Document: appState/${docId} does not exist.`);
      }
    } catch (e) {
      console.error(`Error reading ${docId}:`, e);
    }
  }
}

main().then(() => process.exit(0));
