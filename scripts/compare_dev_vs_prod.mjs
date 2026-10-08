import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
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

async function compareDevVsProd() {
  console.log('1. Leyendo camas de DESARROLLO (desarrollo-df407)...');
  const devApp = initializeApp(firebaseConfigDev, 'devApp');
  const devDb = getFirestore(devApp);
  const devBedsSnap = await getDocs(collection(devDb, 'beds'));
  const devBedsMap = new Map();
  devBedsSnap.forEach(d => devBedsMap.set(d.id, d.data()));

  console.log('2. Leyendo camas de PRODUCCIÓN (gestion-camas-villarrica)...');
  const prodApp = initializeApp(firebaseConfigProd, 'prodApp');
  const prodDb = getFirestore(prodApp);
  const prodAuth = getAuth(prodApp);
  await signInWithEmailAndPassword(prodAuth, 'admin@hospitalvillarrica.cl', 'admin0');
  const prodBedsSnap = await getDocs(collection(prodDb, 'beds'));
  const prodBedsMap = new Map();
  prodBedsSnap.forEach(d => prodBedsMap.set(d.id, d.data()));

  console.log(`\nTotal camas: Dev=${devBedsMap.size} | Prod=${prodBedsMap.size}`);

  // Revisar Hab 201 Cama 1 específicamente
  console.log('\n--- Comparando Habitación 201 Cama 1 ---');
  for (const id of devBedsMap.keys()) {
    if (id.includes('201_1')) {
      const devBed = devBedsMap.get(id);
      const prodBed = prodBedsMap.get(id);
      console.log(`ID: ${id}`);
      console.log(`  DEV:  Status=${devBed?.status} | Paciente=${devBed?.patient} | RUT=${devBed?.rut}`);
      console.log(`  PROD: Status=${prodBed?.status} | Paciente=${prodBed?.patient} | RUT=${prodBed?.rut}`);
    }
  }

  // Contar cuántas camas difieren entre dev y prod
  let diffCount = 0;
  const diffs = [];
  for (const [id, devBed] of devBedsMap.entries()) {
    const prodBed = prodBedsMap.get(id);
    if (!prodBed) {
      diffCount++;
      diffs.push({ id, reason: 'No existe en prod' });
      continue;
    }
    const isDiff = devBed.status !== prodBed.status ||
                   devBed.patient !== prodBed.patient ||
                   devBed.rut !== prodBed.rut;
    if (isDiff) {
      diffCount++;
      diffs.push({
        id,
        dev: { status: devBed.status, patient: devBed.patient, rut: devBed.rut },
        prod: { status: prodBed.status, patient: prodBed.patient, rut: prodBed.rut }
      });
    }
  }

  console.log(`\nTotal camas con diferencias entre Dev y Prod: ${diffCount}`);
  console.log('Primeras 10 diferencias:');
  diffs.slice(0, 10).forEach(d => {
    console.log(`\n• ${d.id}:`);
    console.log(`  DEV:  ${d.dev.patient} (${d.dev.rut}) [${d.dev.status}]`);
    console.log(`  PROD: ${d.prod.patient} (${d.prod.rut}) [${d.prod.status}]`);
  });
}

compareDevVsProd().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
