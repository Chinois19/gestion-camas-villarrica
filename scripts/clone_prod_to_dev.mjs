import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
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

async function cloneProdToDev() {
  console.log('===============================================================');
  console.log('=== CLONANDO PACIENTES REALES DE PRODUCCIÓN A DESARROLLO (DEV) ===');
  console.log('===============================================================\n');

  // 1. Inicializar Prod
  const prodApp = initializeApp(firebaseConfigProd, `prodClone_${Date.now()}`);
  const prodDb = getFirestore(prodApp);
  const prodAuth = getAuth(prodApp);

  console.log('1. Autenticando en PRODUCCIÓN...');
  const userCred = await signInWithEmailAndPassword(prodAuth, 'admin@hospitalvillarrica.cl', 'admin0');
  console.log(`✅ Conectado a producción como ${userCred.user.email}`);

  // 2. Inicializar Dev
  const devApp = initializeApp(firebaseConfigDev, `devClone_${Date.now()}`);
  const devDb = getFirestore(devApp);
  const devAuth = getAuth(devApp);

  console.log('2. Autenticando en DESARROLLO...');
  await signInWithEmailAndPassword(devAuth, 'admin@hospitalvillarrica.cl', 'admin0');
  console.log(`✅ Conectado a desarrollo.`);

  // 3. Clonar colección 'beds' (todas las camas con sus pacientes reales)
  console.log('\n3. Leyendo y clonando 125 camas reales...');
  const prodBedsSnap = await getDocs(collection(prodDb, 'beds'));
  console.log(`   -> Leídas ${prodBedsSnap.size} camas de producción.`);

  let batch = writeBatch(devDb);
  let batchCount = 0;
  let totalBeds = 0;

  for (const bedDoc of prodBedsSnap.docs) {
    const bedData = bedDoc.data();
    batch.set(doc(devDb, 'beds', bedDoc.id), JSON.parse(JSON.stringify(bedData)));
    batchCount++;
    totalBeds++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = writeBatch(devDb);
      batchCount = 0;
    }
  }
  if (batchCount > 0) {
    await batch.commit();
  }
  console.log(`✅ ${totalBeds} camas reales clonadas en desarrollo.`);

  // 4. Clonar colección 'waitingList'
  console.log('\n4. Leyendo y clonando pacientes en lista de espera...');
  const prodWlSnap = await getDocs(collection(prodDb, 'waitingList'));
  console.log(`   -> Leídos ${prodWlSnap.size} pacientes en lista de espera.`);

  batch = writeBatch(devDb);
  batchCount = 0;
  let totalWl = 0;

  for (const wlDoc of prodWlSnap.docs) {
    batch.set(doc(devDb, 'waitingList', wlDoc.id), JSON.parse(JSON.stringify(wlDoc.data())));
    batchCount++;
    totalWl++;
    if (batchCount >= 400) {
      await batch.commit();
      batch = writeBatch(devDb);
      batchCount = 0;
    }
  }
  if (batchCount > 0) {
    await batch.commit();
  }
  console.log(`✅ ${totalWl} pacientes de lista de espera clonados en desarrollo.`);

  // 5. Clonar colección 'procedures'
  console.log('\n5. Leyendo y clonando procedimientos e interconsultas...');
  const prodProcSnap = await getDocs(collection(prodDb, 'procedures'));
  console.log(`   -> Leídos ${prodProcSnap.size} procedimientos de producción.`);

  batch = writeBatch(devDb);
  batchCount = 0;
  let totalProc = 0;

  for (const procDoc of prodProcSnap.docs) {
    batch.set(doc(devDb, 'procedures', procDoc.id), JSON.parse(JSON.stringify(procDoc.data())));
    batchCount++;
    totalProc++;
    if (batchCount >= 400) {
      await batch.commit();
      batch = writeBatch(devDb);
      batchCount = 0;
    }
  }
  if (batchCount > 0) {
    await batch.commit();
  }
  console.log(`✅ ${totalProc} procedimientos clonados en desarrollo.`);

  // 6. Clonar appState esencial (bedsData, etc.)
  console.log('\n6. Clonando documentos de appState (bedsData, etc.)...');
  const appStateDocs = ['bedsData', 'infrastructureConfig', 'users'];
  for (const docName of appStateDocs) {
    try {
      const snap = await getDoc(doc(prodDb, 'appState', docName));
      if (snap.exists()) {
        await setDoc(doc(devDb, 'appState', docName), JSON.parse(JSON.stringify(snap.data())));
        console.log(`   -> appState/${docName} clonado.`);
      }
    } catch (e) {
      console.warn(`   Aviso en appState/${docName}:`, e.message);
    }
  }

  console.log('\n===============================================================');
  console.log('🎉 CLONACIÓN COMPLETADA CON ÉXITO');
  console.log('Ahora tu entorno local (desarrollo-df407) tiene los pacientes');
  console.log('100% idénticos a los que están actualmente en producción.');
  console.log('===============================================================');
  process.exit(0);
}

cloneProdToDev().catch(err => {
  console.error('❌ Error en clonación:', err);
  process.exit(1);
});
