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

async function cloneDevToProd() {
  console.log('=== CLONANDO BASE DE DATOS DE DESARROLLO A PRODUCCIÓN ===\n');

  // 1. Inicializar Dev
  const devApp = initializeApp(firebaseConfigDev, 'devClone');
  const devDb = getFirestore(devApp);

  // 2. Inicializar Prod con Auth
  const prodApp = initializeApp(firebaseConfigProd, 'prodClone');
  const prodDb = getFirestore(prodApp);
  const prodAuth = getAuth(prodApp);

  console.log('1. Autenticando en producción como administrador...');
  const userCred = await signInWithEmailAndPassword(prodAuth, 'admin@hospitalvillarrica.cl', 'admin0');
  console.log(`✅ Conectado a producción como ${userCred.user.email}`);

  // 3. Leer y clonar 125 camas de beds/
  console.log('\n2. Leyendo 125 camas de desarrollo...');
  const devBedsSnap = await getDocs(collection(devDb, 'beds'));
  console.log(`   -> Total camas leídas de desarrollo: ${devBedsSnap.size}`);

  console.log('   -> Escribiendo camas en producción (beds/)...');
  let bedsCount = 0;
  for (const bedDoc of devBedsSnap.docs) {
    const bedData = bedDoc.data();
    // Asegurar que especialidadTratante sea array si existe
    if (bedData.especialidadTratante && !Array.isArray(bedData.especialidadTratante)) {
      bedData.especialidadTratante = [String(bedData.especialidadTratante).trim()];
    }
    const cleanPayload = JSON.parse(JSON.stringify(bedData));
    await setDoc(doc(prodDb, 'beds', bedDoc.id), cleanPayload);
    bedsCount++;
  }
  console.log(`✅ ${bedsCount} camas clonadas exitosamente a producción.`);

  // 4. Clonar appState/bedsData
  console.log('\n3. Clonando árbol appState/bedsData de desarrollo a producción...');
  const devLegacySnap = await getDoc(doc(devDb, 'appState', 'bedsData'));
  if (devLegacySnap.exists()) {
    const treeData = devLegacySnap.data();
    await setDoc(doc(prodDb, 'appState', 'bedsData'), {
      ...treeData,
      clonedAt: new Date().toISOString()
    });
    console.log('✅ appState/bedsData clonado con éxito en producción.');
  }

  // 5. Clonar colección discharges/
  console.log('\n4. Clonando historial de altas (discharges/)...');
  const devDischargesSnap = await getDocs(collection(devDb, 'discharges'));
  let dischargesCount = 0;
  for (const d of devDischargesSnap.docs) {
    await setDoc(doc(prodDb, 'discharges', d.id), JSON.parse(JSON.stringify(d.data())));
    dischargesCount++;
  }
  console.log(`✅ ${dischargesCount} altas clonadas a producción.`);

  // 6. Clonar colección transfers/
  console.log('\n5. Clonando historial de traslados (transfers/)...');
  const devTransfersSnap = await getDocs(collection(devDb, 'transfers'));
  let transfersCount = 0;
  for (const t of devTransfersSnap.docs) {
    await setDoc(doc(prodDb, 'transfers', t.id), JSON.parse(JSON.stringify(t.data())));
    transfersCount++;
  }
  console.log(`✅ ${transfersCount} traslados clonados a producción.`);

  // 7. Verificación final: Habitación 201 Cama 1 en producción
  console.log('\n6. Verificando Habitación 201 Cama 1 en producción...');
  const prod201_1_Snap = await getDoc(doc(prodDb, 'beds', 'piso2_poniente_201_1'));
  if (prod201_1_Snap.exists()) {
    const b = prod201_1_Snap.data();
    console.log(`   Cama 201-1 en Producción: Paciente=${b.patient} | RUT=${b.rut} | Status=${b.status}`);
  }

  console.log('\n🎉 ¡PRODUCCIÓN TOTALMENTE SINCRONIZADA CON EL TRABAJO DE DESARROLLO!');
}

cloneDevToProd().then(() => process.exit(0)).catch(e => { console.error('Error clonando:', e); process.exit(1); });
