import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import path from 'path';

const firebaseConfigProd = {
  apiKey: "AIzaSyBIdM0cYhzO03k4nGjJH3W906R2xeRBpso",
  authDomain: "gestion-camas-villarrica.firebaseapp.com",
  projectId: "gestion-camas-villarrica",
  storageBucket: "gestion-camas-villarrica.firebasestorage.app",
  messagingSenderId: "224302432807",
  appId: "1:224302432807:web:ef62069f0b1e4b64298402"
};

async function createCompleteBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const nowISO = new Date().toISOString();
  console.log('=== GENERANDO RESPALDO COMPLETO DE PRODUCCIÓN ===\n');

  const app = initializeApp(firebaseConfigProd, 'prodBackupComplete');
  const db = getFirestore(app);
  const auth = getAuth(app);

  console.log('1. Autenticando como administrador institucional...');
  const userCred = await signInWithEmailAndPassword(auth, 'admin@hospitalvillarrica.cl', 'admin0');
  console.log(`✅ Conectado como ${userCred.user.email} (UID: ${userCred.user.uid})`);

  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const completeBackup = {
    metadata: {
      createdAt: nowISO,
      timestamp,
      projectId: firebaseConfigProd.projectId,
      creator: userCred.user.email,
      description: 'Respaldo integral de producción post-conciliación con Censo Hospitalario oficial (incluye camas, altas, traslados, lista de espera, bloqueos, HODOM, procedimientos y appState).'
    },
    collections: {},
    appState: {}
  };

  const collectionsToBackup = [
    'beds',
    'discharges',
    'transfers',
    'waitingList',
    'blockLogs',
    'hodomRequests',
    'procedures'
  ];

  console.log('\n2. Respaldando colecciones granulares...');
  for (const colName of collectionsToBackup) {
    try {
      const snap = await getDocs(collection(db, colName));
      completeBackup.collections[colName] = [];
      snap.forEach(d => {
        completeBackup.collections[colName].push({
          _docId: d.id,
          ...d.data()
        });
      });
      console.log(`  -> Colección '${colName}': ${completeBackup.collections[colName].length} documentos respaldados.`);
    } catch (err) {
      console.warn(`  ⚠️ Aviso en colección '${colName}':`, err.message);
      completeBackup.collections[colName] = [];
    }
  }

  console.log('\n3. Respaldando documentos del estado global (appState)...');
  const appStateDocs = ['bedsData', 'bedsData_lastBackup', 'infrastructureConfig', 'dischargesLog', 'transfersLog'];
  for (const docName of appStateDocs) {
    try {
      const docSnap = await getDoc(doc(db, 'appState', docName));
      if (docSnap.exists()) {
        completeBackup.appState[docName] = docSnap.data();
        console.log(`  -> appState/'${docName}': Documento respaldado.`);
      } else {
        console.log(`  -> appState/'${docName}': No existe (omitido).`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Aviso en appState/'${docName}':`, err.message);
    }
  }

  // 4. Guardar archivo JSON local
  const fileName = `backup_produccion_FULL_${timestamp}.json`;
  const filePath = path.join(backupDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(completeBackup, null, 2), 'utf-8');
  const sizeKB = (fs.statSync(filePath).size / 1024).toFixed(2);

  console.log(`\n===============================================================`);
  console.log(`✅ ARCHIVO LOCAL GENERADO: ${fileName}`);
  console.log(`Ubicación: ${filePath}`);
  console.log(`Tamaño: ${sizeKB} KB`);
  console.log(`Resumen de contenidos:`);
  console.log(`  • Camas (beds/): ${completeBackup.collections.beds.length} documentos`);
  console.log(`  • Altas (discharges/): ${completeBackup.collections.discharges.length} registros`);
  console.log(`  • Traslados (transfers/): ${completeBackup.collections.transfers.length} registros`);
  console.log(`  • Lista de Espera (waitingList/): ${completeBackup.collections.waitingList.length} registros`);
  console.log(`  • Bloqueos (blockLogs/): ${completeBackup.collections.blockLogs.length} registros`);
  console.log(`  • Solicitudes HODOM (hodomRequests/): ${completeBackup.collections.hodomRequests.length} registros`);
  console.log(`  • Procedimientos (procedures/): ${completeBackup.collections.procedures.length} registros`);
  console.log(`  • Estado Global (appState): ${Object.keys(completeBackup.appState).length} documentos`);

  // 5. Guardar también un snapshot de seguridad en la nube (Firestore appState/backup_full_snapshot)
  console.log('\n4. Guardando snapshot pasivo en Cloud Firestore (appState/backup_full_snapshot)...');
  try {
    const cloudBackupDoc = {
      savedAt: nowISO,
      timestamp,
      bedsCount: completeBackup.collections.beds.length,
      dischargesCount: completeBackup.collections.discharges.length,
      transfersCount: completeBackup.collections.transfers.length,
      waitingListCount: completeBackup.collections.waitingList.length,
      bedsData: completeBackup.appState.bedsData || null
    };
    await setDoc(doc(db, 'appState', 'backup_full_snapshot'), cloudBackupDoc);
    console.log('✅ Snapshot de contingencia guardado exitosamente en Cloud Firestore.');
  } catch (err) {
    console.warn('⚠️ No se pudo guardar snapshot en Firestore:', err.message);
  }

  console.log(`\n🎉 RESPALDO INTEGRAL DE PRODUCCIÓN COMPLETADO AL 100%.`);
}

createCompleteBackup().then(() => process.exit(0)).catch(e => { console.error('Error fatal en respaldo:', e); process.exit(1); });
