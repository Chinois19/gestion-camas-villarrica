import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
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

async function restoreProduction(backupFilePath) {
  const backupDir = path.resolve('backups');
  if (!backupFilePath) {
    const latestPath = path.join(backupDir, 'backup_produccion_LATEST.json');
    if (fs.existsSync(latestPath)) {
      backupFilePath = latestPath;
    } else {
      const files = fs.readdirSync(backupDir).filter(f => f.startsWith('backup_produccion_FULL_') && f.endsWith('.json'));
      if (files.length === 0) {
        console.error('❌ No se encontraron archivos de respaldo en la carpeta backups/');
        process.exit(1);
      }
      files.sort().reverse();
      backupFilePath = path.join(backupDir, files[0]);
    }
  }

  console.log(`=== RESTAURANDO PRODUCCIÓN DESDE: ${path.basename(backupFilePath)} ===\n`);
  const rawData = fs.readFileSync(backupFilePath, 'utf-8');
  const backup = JSON.parse(rawData);

  console.log('Metadatos del respaldo:');
  console.log(`  • Creado: ${backup.metadata?.createdAt}`);
  console.log(`  • Por: ${backup.metadata?.creator}`);
  console.log(`  • Descripción: ${backup.metadata?.description}`);

  const app = initializeApp(firebaseConfigProd, 'prodRestore');
  const db = getFirestore(app);
  const auth = getAuth(app);

  console.log('\n1. Autenticando en producción como administrador...');
  await signInWithEmailAndPassword(auth, 'admin@hospitalvillarrica.cl', 'admin0');
  console.log('✅ Autenticado con éxito.');

  // 1. Restaurar colecciones granulares
  if (backup.collections) {
    for (const [colName, docsList] of Object.entries(backup.collections)) {
      console.log(`\nRestaurando colección '${colName}' (${docsList.length} documentos)...`);
      let restoredCount = 0;
      for (const item of docsList) {
        const docId = item._docId || item.id || item.canonicalId;
        if (!docId) continue;
        const { _docId, ...cleanData } = item;
        await setDoc(doc(db, colName, String(docId)), cleanData);
        restoredCount++;
      }
      console.log(`  ✅ ${restoredCount} documentos restaurados en '${colName}'.`);
    }
  }

  // 2. Restaurar appState
  if (backup.appState) {
    console.log('\nRestaurando documentos de appState...');
    for (const [docName, docData] of Object.entries(backup.appState)) {
      await setDoc(doc(db, 'appState', docName), docData);
      console.log(`  ✅ Documento appState/'${docName}' restaurado.`);
    }
  }

  console.log('\n🎉 ¡RESTAURACIÓN DE PRODUCCIÓN COMPLETADA EXITOSAMENTE!');
}

const targetFile = process.argv[2] || null;
restoreProduction(targetFile).then(() => process.exit(0)).catch(e => { console.error('Error restaurando:', e); process.exit(1); });
