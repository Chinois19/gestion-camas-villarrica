/**
 * rescue_missing.js
 * Rescata los 2 episodios de julio que quedaron fuera del dischargesLog
 * por colisión de clave de deduplicación (misma timestamp exacta).
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase_config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const fmtDate = (ts) => {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('es-CL', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  catch { return ts; }
};

// Camas con episodios faltantes detectados en auditoría
const TARGETS = [
  { floor: 'piso3', roomId: '301', bedId: '1'  },
  { floor: 'piso3', roomId: '302', bedId: '3'  }
];

async function rescue() {
  console.log('\n🚑 Rescatando episodios faltantes...\n');

  const [bedsSnap, logSnap] = await Promise.all([
    getDoc(doc(db, 'appState', 'bedsData')),
    getDoc(doc(db, 'appState', 'dischargesLog'))
  ]);

  const bedsData = bedsSnap.data().data;
  const logData  = Array.isArray(logSnap.data()?.data) ? logSnap.data().data : [];

  console.log(`dischargesLog actual: ${logData.length} registros`);

  const toAdd = [];

  const extractAll = (obj, floor, sector, roomId, bedId, depth = 0) => {
    if (!obj || depth > 10) return;

    const addRecord = (r, source) => {
      // Usar _dischargeId como clave más precisa para evitar falsos duplicados
      const existsById = r._dischargeId && logData.some(l => l._dischargeId === r._dischargeId);
      if (existsById) { console.log(`  Saltando (ya en log por _dischargeId): ${r.patient}`); return; }

      // Verificar por nombre+timestamp (con tolerancia de 1 segundo)
      const ts = new Date(r.cleaningAt || r.dischargeAt || 0).getTime();
      const nombre = (r.patient || r.patientName || '').toLowerCase().trim();
      const existsByKey = logData.some(l => {
        const lts = new Date(l.cleaningAt || l.dischargeAt || 0).getTime();
        const ln  = (l.patient || l.patientName || '').toLowerCase().trim();
        return Math.abs(lts - ts) < 2000 && ln === nombre;
      });
      if (existsByKey) { console.log(`  Saltando (ya en log por nombre+fecha): ${r.patient}`); return; }

      const { dischargeHistory: _dh, previousPatient: _pp, lastDischarge: _ld, ...clean } = r;
      toAdd.push({
        _logId:     `log-rescue-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        _loggedAt:  new Date().toISOString(),
        _source:    'rescue_bedsData',
        piso:       floor,
        sector:     sector,
        habitacion: roomId,
        cama:       bedId,
        bedType:    '',
        ...clean
      });
      console.log(`  ✅ Rescatado: ${r.patient} | ${fmtDate(r.cleaningAt || r.dischargeAt)} | ${r.destino || '—'}`);
    };

    if (Array.isArray(obj.dischargeHistory)) {
      obj.dischargeHistory.filter(r => !r._reverted).forEach(r => addRecord(r, 'dischargeHistory'));
    }

    if (obj.previousPatient && !obj.previousPatient._reverted) {
      const pp = obj.previousPatient;
      if (pp.cleaningAt || pp.dischargeAt) addRecord(pp, 'previousPatient');
      extractAll(pp, floor, sector, roomId, bedId, depth + 1);
    }

    if (obj.lastDischarge && !obj.previousPatient && !obj.lastDischarge._reverted) {
      addRecord(obj.lastDischarge, 'lastDischarge');
    }
  };

  for (const target of TARGETS) {
    console.log(`\nBuscando ${target.floor} Hab.${target.roomId} C${target.bedId}...`);
    const floor  = bedsData[target.floor];
    if (!floor) { console.log('  Piso no encontrado'); continue; }

    let found = false;
    for (const sector of Object.keys(floor)) {
      const room = floor[sector].find(r => String(r.roomId) === String(target.roomId));
      if (!room) continue;
      const bed = room.beds?.find(b => String(b.id) === String(target.bedId));
      if (!bed)  { console.log('  Cama no encontrada en sector', sector); continue; }
      found = true;
      console.log(`  Cama encontrada en sector: ${sector}`);
      console.log(`  Estado actual: ${bed.status} | Paciente actual: ${bed.patient || '(vacía)'}`);
      extractAll(bed, target.floor, sector, target.roomId, target.bedId);
      break;
    }
    if (!found) console.log('  ❌ Cama no encontrada en ningún sector');
  }

  if (toAdd.length === 0) {
    console.log('\n✅ No hay registros adicionales que rescatar. El log está completo.');
    process.exit(0);
  }

  const merged = [...toAdd, ...logData].sort((a, b) => {
    const ta = new Date(a.cleaningAt || a.dischargeAt || a._loggedAt || 0).getTime();
    const tb = new Date(b.cleaningAt || b.dischargeAt || b._loggedAt || 0).getTime();
    return tb - ta;
  });

  console.log(`\n📊 Rescatados: ${toAdd.length} | Total nuevo: ${merged.length}`);
  console.log('⏳ Escribiendo en Firebase...');
  await setDoc(doc(db, 'appState', 'dischargesLog'), { data: merged });
  console.log('✅ dischargesLog actualizado.');
  process.exit(0);
}

rescue().catch(err => { console.error('❌', err); process.exit(1); });
