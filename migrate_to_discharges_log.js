/**
 * migrate_to_discharges_log.js
 * ─────────────────────────────────────────────────────────────────────────────
 * MIGRACIÓN ÚNICA: mueve todos los episodios históricos de alta al documento
 * permanente `appState/dischargesLog` en Firebase.
 *
 * Fuentes de datos:
 *   1. bedsData → previousPatient anidado (todos los niveles) + dischargeHistory[]
 *   2. waitingListDischarges → altas desde lista de espera
 *
 * El script es SEGURO: solo AGREGA registros nuevos, nunca modifica ni borra
 * los que ya existen en dischargesLog.
 *
 * Ejecutar UNA SOLA VEZ:  node migrate_to_discharges_log.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';

// ── Firebase config ──────────────────────────────────────────────────────────
const firebaseConfig = JSON.parse(
  fs.readFileSync('./firebase_config.json', 'utf8')
);

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);

// ── Helpers ──────────────────────────────────────────────────────────────────

const dupKey = (nombre, ts) =>
  `${(nombre || '').toLowerCase().trim()}|${ts || ''}`;

/**
 * Extrae recursivamente TODOS los episodios de alta de una cama,
 * incluyendo todos los niveles de previousPatient anidado.
 * Devuelve objetos enriquecidos con piso/sector/habitacion/cama.
 */
function extractAllFromBed(bed, floor, sector, roomId, seenKeys) {
  const results = [];

  const recurse = (obj, depth = 0) => {
    if (!obj || depth > 10) return;

    // dischargeHistory[] — formato acumulativo nuevo
    if (Array.isArray(obj.dischargeHistory)) {
      obj.dischargeHistory
        .filter(r => !r._reverted)
        .forEach(r => {
          const nombre = r.patient || r.patientName || r.nombre || '';
          const ts     = r.cleaningAt || r.dischargeAt || '';
          const key    = dupKey(nombre, ts);
          if (!seenKeys.has(key) && (r.cleaningAt || r.dischargeAt)) {
            seenKeys.add(key);
            results.push(enrichRecord(r, floor, sector, roomId, bed));
          }
        });
    }

    // previousPatient — formato legacy
    if (obj.previousPatient) {
      const pp     = obj.previousPatient;
      const nombre = pp.patient || pp.patientName || pp.nombre || '';
      const ts     = pp.cleaningAt || pp.dischargeAt || '';
      const key    = dupKey(nombre, ts);
      if (!pp._reverted && (pp.cleaningAt || pp.dischargeAt) && !seenKeys.has(key)) {
        seenKeys.add(key);
        results.push(enrichRecord(pp, floor, sector, roomId, bed));
      }
      recurse(pp, depth + 1);
    }

    // lastDischarge — alias legacy
    if (obj.lastDischarge && !obj.previousPatient) {
      const ld     = obj.lastDischarge;
      const nombre = ld.patient || ld.patientName || ld.nombre || '';
      const ts     = ld.cleaningAt || ld.dischargeAt || '';
      const key    = dupKey(nombre, ts);
      if (!ld._reverted && (ld.cleaningAt || ld.dischargeAt) && !seenKeys.has(key)) {
        seenKeys.add(key);
        results.push(enrichRecord(ld, floor, sector, roomId, bed));
      }
    }
  };

  recurse(bed);
  return results;
}

function enrichRecord(record, floor, sector, roomId, bedObj) {
  // Eliminar campos de anidamiento para evitar ciclos
  // eslint-disable-next-line no-unused-vars
  const { dischargeHistory: _dh, previousPatient: _pp, lastDischarge: _ld, ...clean } = record;
  return {
    _logId:     `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    _loggedAt:  new Date().toISOString(),
    _source:    'migration_bedsData',
    piso:       floor,
    sector:     sector,
    habitacion: roomId,
    cama:       bedObj.id,
    bedType:    bedObj.tag || bedObj.type || '',
    ...clean
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('\n🚀 Iniciando migración al dischargesLog permanente...\n');

  // Cargar documentos desde Firebase
  const [bedsSnap, wldSnap, logSnap] = await Promise.all([
    getDoc(doc(db, 'appState', 'bedsData')),
    getDoc(doc(db, 'appState', 'waitingListDischarges')),
    getDoc(doc(db, 'appState', 'dischargesLog'))
  ]);

  const bedsData             = bedsSnap.exists()  ? bedsSnap.data().data  : {};
  const waitingListDischarges = wldSnap.exists()   ? wldSnap.data().data   : [];
  const existingLog          = logSnap.exists()    ? (logSnap.data().data || []) : [];

  console.log(`📋 dischargesLog existente: ${existingLog.length} registros`);
  console.log(`🛏️  bedsData cargado`);
  console.log(`📝 waitingListDischarges: ${waitingListDischarges.length} registros\n`);

  // Construir set de claves ya existentes en el log
  const seenKeys = new Set();
  existingLog.forEach(r => {
    const nombre = r.patient || r.patientName || r.nombre || '';
    const ts     = r.cleaningAt || r.dischargeAt || '';
    seenKeys.add(dupKey(nombre, ts));
  });

  const newEntries = [];

  // ── FUENTE 1: bedsData ────────────────────────────────────────────────────
  let bedCount = 0;
  for (const floor of Object.keys(bedsData)) {
    if (typeof bedsData[floor] !== 'object' || Array.isArray(bedsData[floor])) continue;
    for (const sector of Object.keys(bedsData[floor])) {
      const rooms = bedsData[floor][sector];
      if (!Array.isArray(rooms)) continue;
      for (const room of rooms) {
        if (!Array.isArray(room.beds)) continue;
        for (const bed of room.beds) {
          const extracted = extractAllFromBed(bed, floor, sector, room.roomId, seenKeys);
          extracted.forEach(e => {
            newEntries.push(e);
            bedCount++;
          });
        }
      }
    }
  }
  console.log(`✅ Episodios extraídos desde bedsData: ${bedCount}`);

  // ── FUENTE 2: waitingListDischarges ───────────────────────────────────────
  let wldCount = 0;
  if (Array.isArray(waitingListDischarges)) {
    waitingListDischarges.forEach(p => {
      const nombre = p.patient || p.patientName || p.nombre || '';
      const ts     = p.dischargeAt || p.cleaningAt || '';
      const key    = dupKey(nombre, ts);
      if (seenKeys.has(key)) return;
      if (!ts) return; // sin fecha no tiene sentido almacenar
      seenKeys.add(key);

      // eslint-disable-next-line no-unused-vars
      const { dischargeHistory: _dh, previousPatient: _pp, lastDischarge: _ld, ...clean } = p;
      newEntries.push({
        _logId:     `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        _loggedAt:  new Date().toISOString(),
        _source:    'migration_waitingListDischarges',
        piso:       '—',
        sector:     '—',
        habitacion: 'Lista de Espera',
        cama:       '—',
        bedType:    '—',
        ...clean
      });
      wldCount++;
    });
  }
  console.log(`✅ Episodios extraídos desde waitingListDischarges: ${wldCount}`);

  // ── Combinar y guardar ────────────────────────────────────────────────────
  const totalNew = newEntries.length;
  if (totalNew === 0) {
    console.log('\n✅ No hay nuevos registros para migrar. dischargesLog ya está al día.');
    process.exit(0);
  }

  // El log final = entradas existentes + entradas nuevas, ordenadas por fecha desc
  const mergedLog = [...newEntries, ...existingLog].sort((a, b) => {
    const ta = new Date(a.cleaningAt || a.dischargeAt || a._loggedAt || 0).getTime();
    const tb = new Date(b.cleaningAt || b.dischargeAt || b._loggedAt || 0).getTime();
    return tb - ta;
  });

  console.log(`\n📊 RESUMEN:`);
  console.log(`   Registros previos en dischargesLog: ${existingLog.length}`);
  console.log(`   Nuevos episodios a migrar:          ${totalNew} (${bedCount} camas + ${wldCount} lista espera)`);
  console.log(`   Total final en dischargesLog:       ${mergedLog.length}`);

  // Guardar en Firebase
  console.log('\n⏳ Escribiendo en Firebase...');
  await setDoc(doc(db, 'appState', 'dischargesLog'), { data: mergedLog });
  console.log('✅ dischargesLog actualizado en Firebase con éxito.');
  console.log('\n🎉 Migración completada. Ahora el Informe de Altas mostrará todos los episodios históricos.');

  // Guardar también un JSON local para referencia
  fs.writeFileSync('dischargesLog_migrado.json', JSON.stringify(mergedLog, null, 2));
  console.log(`📄 JSON de respaldo guardado: dischargesLog_migrado.json`);

  process.exit(0);
}

migrate().catch(err => {
  console.error('\n❌ Error durante la migración:', err);
  process.exit(1);
});
