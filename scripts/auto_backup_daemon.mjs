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

const MAX_DAILY_BACKUPS = 30; // Mantener hasta 30 días de respaldos diarios rotativos

export async function executeBackupCycle() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const nowISO = now.toISOString();
  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const logPrefix = `[AutoBackup ${now.toLocaleTimeString('es-CL')}]`;
  console.log(`${logPrefix} Iniciando ciclo de respaldo automático diario de producción...`);

  try {
    const app = initializeApp(firebaseConfigProd, `autoBackup_${Date.now()}`);
    const db = getFirestore(app);
    const auth = getAuth(app);

    // Autenticación silenciosa de servicio
    await signInWithEmailAndPassword(auth, 'admin@hospitalvillarrica.cl', 'admin0');

    const backupData = {
      metadata: {
        createdAt: nowISO,
        timestamp,
        projectId: firebaseConfigProd.projectId,
        type: 'daily_backup',
        description: 'Respaldo automático diario de producción (madrugada)'
      },
      collections: {},
      appState: {}
    };

    const collections = [
      'beds',
      'discharges',
      'transfers',
      'waitingList',
      'blockLogs',
      'hodomRequests',
      'procedures'
    ];

    for (const col of collections) {
      try {
        const snap = await getDocs(collection(db, col));
        backupData.collections[col] = [];
        snap.forEach(d => backupData.collections[col].push({ _docId: d.id, ...d.data() }));
      } catch (err) {
        console.warn(`${logPrefix} Aviso en colección ${col}:`, err.message);
        backupData.collections[col] = [];
      }
    }

    const appStateDocs = ['bedsData', 'bedsData_lastBackup', 'infrastructureConfig', 'dischargesLog'];
    for (const d of appStateDocs) {
      try {
        const snap = await getDoc(doc(db, 'appState', d));
        if (snap.exists()) backupData.appState[d] = snap.data();
      } catch (e) {
        // Ignorar
      }
    }

    // 1. Guardar archivo con timestamp
    const fileName = `backup_produccion_FULL_${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');

    // 2. Guardar copia fija LATEST para restauración instantánea
    const latestPath = path.join(backupDir, 'backup_produccion_LATEST.json');
    fs.writeFileSync(latestPath, JSON.stringify(backupData, null, 2), 'utf-8');

    // 3. Guardar snapshot en Cloud Firestore
    try {
      await setDoc(doc(db, 'appState', 'backup_full_snapshot'), {
        savedAt: nowISO,
        timestamp,
        type: 'daily_snapshot',
        bedsCount: backupData.collections.beds?.length || 0,
        dischargesCount: backupData.collections.discharges?.length || 0,
        transfersCount: backupData.collections.transfers?.length || 0,
        waitingListCount: backupData.collections.waitingList?.length || 0,
        bedsData: backupData.appState.bedsData || null
      });
    } catch (cloudErr) {
      console.warn(`${logPrefix} Aviso al guardar snapshot en Firestore:`, cloudErr.message);
    }

    // 4. Rotación automática de respaldos antiguos (mantener los últimos 30 días)
    const allBackups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_produccion_FULL_') && f.endsWith('.json'))
      .sort();

    if (allBackups.length > MAX_DAILY_BACKUPS) {
      const toDelete = allBackups.slice(0, allBackups.length - MAX_DAILY_BACKUPS);
      for (const oldFile of toDelete) {
        try {
          fs.unlinkSync(path.join(backupDir, oldFile));
        } catch (_) {}
      }
      console.log(`${logPrefix} Rotación: ${toDelete.length} respaldos antiguos depurados.`);
    }

    const sizeKB = (fs.statSync(filePath).size / 1024).toFixed(2);
    console.log(`${logPrefix} ✅ Respaldo diario completado con éxito (${sizeKB} KB, LATEST actualizado).`);
  } catch (error) {
    console.error(`${logPrefix} ❌ Error en ciclo de respaldo:`, error.message);
  }
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TARGET_HOUR = 2; // 02:00 AM (horario de mínimo impacto hospitalario)

function getMsUntilNextTargetHour(targetHour = 2, targetMinute = 0) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(targetHour, targetMinute, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function startDaemon() {
  console.log('=== DEMONIO DE RESPALDO DIARIO DE PRODUCCIÓN INICIADO ===');
  console.log(`Frecuencia: 1 vez al día (02:00 AM) | Retención: ${MAX_DAILY_BACKUPS} días (1 mes)`);

  const forceNow = process.argv.includes('--now');
  const backupDir = path.resolve('backups');
  let needsInitial = forceNow;

  if (!needsInitial && fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_produccion_FULL_') && f.endsWith('.json'))
      .sort();
    if (files.length === 0) {
      needsInitial = true;
    } else {
      const latestFile = files[files.length - 1];
      const stats = fs.statSync(path.join(backupDir, latestFile));
      const hoursSinceLast = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
      if (hoursSinceLast > 24) {
        console.log(`[AutoBackup] Último respaldo hace ${hoursSinceLast.toFixed(1)} hrs (> 24 hrs). Ejecutando respaldo preventivo inicial...`);
        needsInitial = true;
      }
    }
  }

  if (needsInitial) {
    await executeBackupCycle();
  }

  const msUntilNext = getMsUntilNextTargetHour(TARGET_HOUR, 0);
  const hoursUntil = (msUntilNext / (1000 * 60 * 60)).toFixed(1);
  const nextDate = new Date(Date.now() + msUntilNext);

  console.log(`[AutoBackup] ⏰ Próximo respaldo programado para: ${nextDate.toLocaleString('es-CL')} (en ~${hoursUntil} horas).`);

  setTimeout(async () => {
    await executeBackupCycle();
    // Programar repetición diaria cada 24 horas a las 02:00 AM
    setInterval(async () => {
      await executeBackupCycle();
    }, ONE_DAY_MS);
  }, msUntilNext);
}

// Comprobar si se llama directamente
if (process.argv[1] && process.argv[1].endsWith('auto_backup_daemon.mjs')) {
  startDaemon().catch(e => console.error(e));
}

