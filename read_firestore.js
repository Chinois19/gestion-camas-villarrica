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
  const documents = ['bedsData', 'waitingList', 'hodomRequests', 'activeUsers'];
  for (const docId of documents) {
    try {
      const docRef = doc(db, 'appState', docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        console.log(`\n=== Document: appState/${docId} ===`);
        console.log("Keys in data:", Object.keys(data));
        if (data.data) {
          console.log("Type of data.data:", typeof data.data);
          if (Array.isArray(data.data)) {
            console.log(`Array length: ${data.data.length}`);
            console.log("Preview:", JSON.stringify(data.data.slice(0, 3), null, 2));
          } else {
            console.log("Keys in data.data:", Object.keys(data.data));
            // Let's print out the first floor info if it exists
            const firstFloorKey = Object.keys(data.data)[0];
            if (firstFloorKey) {
              console.log(`Preview floor [${firstFloorKey}]:`, JSON.stringify(data.data[firstFloorKey], null, 2));
            }
          }
        } else {
          console.log("Full data:", JSON.stringify(data, null, 2));
        }
      } else {
        console.log(`\nDocument appState/${docId} does not exist.`);
      }
    } catch (e) {
      console.error(`Error reading ${docId}:`, e);
    }
  }
}

main().then(() => process.exit(0));
