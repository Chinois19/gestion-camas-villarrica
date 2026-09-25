import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

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

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupData = {
    metadata: {
      createdAt: new Date().toISOString(),
      projectId: firebaseConfig.projectId,
      description: 'Respaldo completo preventivo de producción'
    },
    appState: {},
    waitingList: []
  };

  console.log('1. Respaldando appState/bedsData...');
  try {
    const bedsSnap = await getDoc(doc(db, 'appState', 'bedsData'));
    if (bedsSnap.exists()) {
      backupData.appState.bedsData = bedsSnap.data();
      console.log('  -> bedsData respaldado exitosamente.');
    } else {
      console.log('  -> bedsData no existe.');
    }
  } catch (err) {
    console.error('  -> Error leyendo bedsData:', err.message);
  }

  console.log('2. Respaldando appState/infrastructureConfig...');
  try {
    const infraSnap = await getDoc(doc(db, 'appState', 'infrastructureConfig'));
    if (infraSnap.exists()) {
      backupData.appState.infrastructureConfig = infraSnap.data();
      console.log('  -> infrastructureConfig respaldado exitosamente.');
    }
  } catch (err) {
    console.log('  -> Error / no existe infrastructureConfig:', err.message);
  }

  console.log('3. Respaldando waitingList...');
  try {
    const wlSnap = await getDocs(collection(db, 'waitingList'));
    wlSnap.forEach(d => {
      backupData.waitingList.push({ id: d.id, ...d.data() });
    });
    console.log(`  -> waitingList respaldado (${backupData.waitingList.length} registros).`);
  } catch (err) {
    console.error('  -> Error leyendo waitingList:', err.message);
  }

  const fileName = `backup_produccion_${timestamp}.json`;
  const filePath = path.join(backupDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`\n✅ Respaldo guardado exitosamente en: ${filePath}`);
  console.log(`Tamaño: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
  process.exit(0);
}

runBackup();
