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

async function check() {
  for (const docId of ['bedsData', 'waitingList', 'hodomRequests', 'users']) {
    const docRef = doc(db, 'appState', docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      console.log(`Document: ${docId} exists! Size of data:`, JSON.stringify(snap.data()).length);
      // Let's inspect some of the bed data
      if (docId === 'bedsData') {
        const data = snap.data().data;
        const floors = Object.keys(data || {});
        console.log(`BedsData floors:`, floors);
        if (data.piso4) {
          console.log(`Sample piso4 sectors:`, Object.keys(data.piso4));
        }
      }
    } else {
      console.log(`Document: ${docId} does NOT exist!`);
    }
  }
  process.exit(0);
}
check().catch(console.error);
