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

    let totalDocsRead = 0;
    for (const col of collections) {
      const count = backupData.collections[col]?.length || 0;
      totalDocsRead += count;
    }
    backupData.metadata.totalDocsRead = totalDocsRead;

    const collectionsSummary = Object.fromEntries(
      collections.map(col => [col, backupData.collections[col]?.length || 0])
    );
    console.log(`${logPrefix} Documentos respaldados por colección:`, JSON.stringify(collectionsSummary));
    console.log(`${logPrefix} Total lecturas consumidas en este ciclo: ${totalDocsRead} docs.`);

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
        totalDocsRead,
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
    return { success: true, totalDocsRead, filePath };
  } catch (error) {
    console.error(`${logPrefix} ❌ Error en ciclo de respaldo:`, error.message);
    return { success: false, error: error.message };
  }
}

const TARGET_HOUR = 2; // 02:00 AM (horario de mínimo impacto hospitalario)
const TARGET_MINUTE = 0;
const PID_FILE = path.resolve('.backup_daemon.pid');

function getMsUntilNextTargetHour(targetHour = TARGET_HOUR, targetMinute = TARGET_MINUTE) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(targetHour, targetMinute, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

function acquireLock() {
  if (fs.existsSync(PID_FILE)) {
    try {
      const existingPid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
      if (existingPid && !isNaN(existingPid)) {
        try {
          process.kill(existingPid, 0);
          console.error(`[AutoBackup] ⚠️ Ya existe una instancia activa del demonio en ejecución (PID ${existingPid}).`);
          process.exit(0);
        } catch (_) {
          console.log(`[AutoBackup] Limpiando archivo PID huérfano de sesión anterior (PID ${existingPid}).`);
        }
      }
    } catch (_) {}
  }

  try {
    fs.writeFileSync(PID_FILE, String(process.pid), 'utf-8');
  } catch (err) {
    console.warn('[AutoBackup] No se pudo escribir PID lock:', err.message);
  }

  const cleanUp = () => {
    try {
      if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    } catch (_) {}
  };

  process.on('exit', cleanUp);
  process.on('SIGINT', () => { cleanUp(); process.exit(0); });
  process.on('SIGTERM', () => { cleanUp(); process.exit(0); });
}

let isCycleRunning = false;
let lastBackupCalendarDate = null;

function scheduleNextRun() {
  const msUntilNext = getMsUntilNextTargetHour(TARGET_HOUR, TARGET_MINUTE);
  const nextDate = new Date(Date.now() + msUntilNext);
  const hoursUntil = (msUntilNext / (1000 * 60 * 60)).toFixed(1);

  console.log(`[AutoBackup] ⏰ Próximo respaldo programado para: ${nextDate.toLocaleString('es-CL')} (en ~${hoursUntil} horas).`);

  setTimeout(async () => {
    const todayStr = new Date().toLocaleDateString('es-CL');
    if (lastBackupCalendarDate !== todayStr && !isCycleRunning) {
      isCycleRunning = true;
      try {
        console.log(`[AutoBackup] 🔔 Ejecutando respaldo nocturno programado de las 02:00 AM (${todayStr})...`);
        await executeBackupCycle();
        lastBackupCalendarDate = todayStr;
      } catch (err) {
        console.error('[AutoBackup] Error en ciclo programado:', err.message);
      } finally {
        isCycleRunning = false;
      }
    }
    // Programación dinámica y recursiva del siguiente ciclo (inmune a desviaciones de reloj y cambios de huso horario)
    scheduleNextRun();
  }, msUntilNext);
}

async function startDaemon() {
  console.log('================================================================');
  console.log('=== DEMONIO DE RESPALDO DIARIO DE PRODUCCIÓN INICIADO ===');
  console.log(`Frecuencia: Estrictamente 1 vez al día (02:00 AM)`);
  console.log(`Retención: ${MAX_DAILY_BACKUPS} días (1 mes)`);
  console.log('================================================================');

  const forceNow = process.argv.includes('--now');
  const onceOnly = process.argv.includes('--once');

  if (onceOnly) {
    console.log('[AutoBackup] Modo ejecución única forzada (--once).');
    await executeBackupCycle();
    console.log('[AutoBackup] Proceso finalizado exitosamente.');
    process.exit(0);
  }

  acquireLock();

  const backupDir = path.resolve('backups');
  let needsInitial = forceNow;

  if (forceNow) {
    console.log('[AutoBackup] Bandera --now detectada: ejecutando respaldo manual inicial...');
  } else if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_produccion_FULL_') && f.endsWith('.json'))
      .sort();
    if (files.length === 0) {
      needsInitial = true;
    } else {
      const latestFile = files[files.length - 1];
      const stats = fs.statSync(path.join(backupDir, latestFile));
      const hoursSinceLast = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
      if (hoursSinceLast > 36) {
        console.log(`[AutoBackup] Último respaldo hace ${hoursSinceLast.toFixed(1)} hrs (> 36 hrs). Ejecutando respaldo preventivo inicial...`);
        needsInitial = true;
      } else {
        console.log(`[AutoBackup] Respaldo reciente detectado (${hoursSinceLast.toFixed(1)} hrs atrás). No se requiere ejecución inicial anticipada.`);
      }
    }
  }

  if (needsInitial) {
    isCycleRunning = true;
    try {
      await executeBackupCycle();
      lastBackupCalendarDate = new Date().toLocaleDateString('es-CL');
    } finally {
      isCycleRunning = false;
    }
  }

  // Iniciar la planificación recursiva para las 02:00 AM
  scheduleNextRun();
}

// Comprobar si se llama directamente
if (process.argv[1] && process.argv[1].endsWith('auto_backup_daemon.mjs')) {
  startDaemon().catch(e => console.error(e));
}


