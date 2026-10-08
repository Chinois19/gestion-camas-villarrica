import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfigDev = {
  apiKey: "AIzaSyDoYbGq5_sWpLqLC3smvJyofAzVON2L23M",
  authDomain: "desarrollo-df407.firebaseapp.com",
  projectId: "desarrollo-df407",
  storageBucket: "desarrollo-df407.firebasestorage.app",
  messagingSenderId: "787990754227",
  appId: "1:787990754227:web:21d68d328220fffd3c11c6"
};

const firebaseConfigProd = {
  apiKey: "AIzaSyBIdM0cYhzO03k4nGjJH3W906R2xeRBpso",
  authDomain: "gestion-camas-villarrica.firebaseapp.com",
  projectId: "gestion-camas-villarrica",
  storageBucket: "gestion-camas-villarrica.firebasestorage.app",
  messagingSenderId: "224302432807",
  appId: "1:224302432807:web:ef62069f0b1e4b64298402"
};

const diffIds = [
  'piso3_oriente_309_4',
  'piso3_oriente_310_2',
  'piso3_oriente_310_3',
  'piso3_oriente_311_2',
  'piso3_poniente_301_3',
  'piso3_poniente_302_3'
];

async function syncRemainingDiffs() {
  const devApp = initializeApp(firebaseConfigDev, 'devDiff');
  const devDb = getFirestore(devApp);

  const prodApp = initializeApp(firebaseConfigProd, 'prodDiff');
  const prodDb = getFirestore(prodApp);
  const prodAuth = getAuth(prodApp);
  await signInWithEmailAndPassword(prodAuth, 'admin@hospitalvillarrica.cl', 'admin0');

  console.log('Sincronizando las 6 camas en producción...');
  for (const id of diffIds) {
    const devSnap = await getDoc(doc(devDb, 'beds', id));
    if (devSnap.exists()) {
      const data = devSnap.data();
      if (data.especialidadTratante && !Array.isArray(data.especialidadTratante)) {
        data.especialidadTratante = [String(data.especialidadTratante).trim()];
      }
      await setDoc(doc(prodDb, 'beds', id), JSON.parse(JSON.stringify(data)));
      console.log(`✅ Cama ${id} sincronizada en prod: ${data.patient} (${data.status})`);
    }
  }

  // Y actualizar appState/bedsData de dev a prod
  const devLegacySnap = await getDoc(doc(devDb, 'appState', 'bedsData'));
  if (devLegacySnap.exists()) {
    await setDoc(doc(prodDb, 'appState', 'bedsData'), JSON.parse(JSON.stringify(devLegacySnap.data())));
    console.log('✅ appState/bedsData actualizado en prod');
  }
}

syncRemainingDiffs().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
