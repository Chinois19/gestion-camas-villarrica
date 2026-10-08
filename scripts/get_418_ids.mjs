import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfigDev = {
  apiKey: "AIzaSyDoYbGq5_sWpLqLC3smvJyofAzVON2L23M",
  authDomain: "desarrollo-df407.firebaseapp.com",
  projectId: "desarrollo-df407",
  storageBucket: "desarrollo-df407.firebasestorage.app",
  messagingSenderId: "787990754227",
  appId: "1:787990754227:web:21d68d328220fffd3c11c6"
};

const app = initializeApp(firebaseConfigDev);
const db = getFirestore(app);

async function get418CanonicalIds() {
  const bedsSnap = await getDocs(collection(db, 'beds'));
  bedsSnap.forEach(d => {
    if (d.id.includes('418')) {
      console.log(`Doc ID: ${d.id}`, d.data().floor, d.data().sector, d.data().roomId, d.data().bedNumber, d.data().status);
    }
  });
}

get418CanonicalIds().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
