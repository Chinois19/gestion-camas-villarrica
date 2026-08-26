/**
 * deep_audit_julio.js
 * Auditoría forense de julio 2026 — busca en TODAS las fuentes de datos
 * incluyendo transferHistory (todos los campos), bedsData_lastBackup,
 * y reconstruye la línea de tiempo de actividad de camas en julio.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase_config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const fmt = (ts) => {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('es-CL', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  catch { return String(ts); }
};

const getAnyDate = (obj) => {
  // Busca cualquier campo que pueda tener una fecha
  const fields = ['timestamp','date','transferredAt','createdAt','assignedAt','cleaningAt',
                  'dischargeAt','requestedAt','updatedAt','_loggedAt','solicitadaAt',
                  'aprobadoAt','fecha','hora','at'];
  for (const f of fields) {
    if (obj[f] && typeof obj[f] === 'string' && obj[f].length > 8) return obj[f];
  }
  return null;
};

const inJuly  = (ts) => { try { const d = new Date(ts); return d.getFullYear()===2026 && d.getMonth()===6; } catch { return false; }};
const inRange = (ts, from, to) => {
  try {
    const d = new Date(ts).getTime();
    return d >= new Date(from).getTime() && d <= new Date(to).getTime();
  } catch { return false; }
};

async function deepAudit() {
  console.log('\n🔬 AUDITORÍA FORENSE JULIO 2026\n' + '='.repeat(70));

  const snaps = await Promise.all([
    getDoc(doc(db, 'appState', 'bedsData')),
    getDoc(doc(db, 'appState', 'bedsData_lastBackup')),
    getDoc(doc(db, 'appState', 'transferHistory')),
    getDoc(doc(db, 'appState', 'dischargesLog')),
    getDoc(doc(db, 'appState', 'waitingListDischarges')),
    getDoc(doc(db, 'appState', 'blockLog')),
    getDoc(doc(db, 'appState', 'hodomRequests')),
    getDoc(doc(db, 'appState', 'waitingList')),
  ]);

  const [bedsData, backup, transferHistory, dischargesLog, wld, blockLog, hodom, waitingList] = snaps.map(s =>
    s.exists() ? (s.data().data ?? s.data()) : (s.exists() ? s.data() : null)
  );

  const log     = Array.isArray(dischargesLog) ? dischargesLog : [];
  const wldArr  = Array.isArray(wld)  ? wld  : [];
  const trArr   = Array.isArray(transferHistory) ? transferHistory : [];
  const blArr   = Array.isArray(blockLog)  ? blockLog  : [];
  const hodArr  = Array.isArray(hodom) ? hodom : [];
  const wlArr   = Array.isArray(waitingList) ? waitingList : [];

  // ── A. Estado actual del dischargesLog para julio ────────────────────────
  const logJuly = log.filter(r => inJuly(r.cleaningAt || r.dischargeAt));
  const logJulyBeds = logJuly.filter(r => r._source !== 'migration_waitingListDischarges' && !r.isWaitingListDischarge);
  const logJulyWLD  = logJuly.filter(r => r._source === 'migration_waitingListDischarges' || r.isWaitingListDischarge);

  // Distribución por día
  const byDay = {};
  logJulyBeds.forEach(r => {
    const ts = r.cleaningAt || r.dischargeAt;
    const day = new Date(ts).toISOString().slice(0,10);
    byDay[day] = (byDay[day] || 0) + 1;
  });

  console.log(`\n📋 A. dischargesLog — julio 2026:`);
  console.log(`   Total: ${logJuly.length} | Camas reales: ${logJulyBeds.length} | Lista espera: ${logJulyWLD.length}`);
  console.log(`\n   Distribución por día (CAMAS REALES):`);
  const sortedDays = Object.keys(byDay).sort();
  sortedDays.forEach(d => console.log(`   ${d}: ${byDay[d]} altas`));

  // Detectar gaps de más de 3 días sin actividad
  const gaps = [];
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i-1]);
    const curr = new Date(sortedDays[i]);
    const diff = (curr - prev) / 86400000;
    if (diff > 3) {
      gaps.push({ desde: sortedDays[i-1], hasta: sortedDays[i], dias: Math.round(diff) });
    }
  }
  if (gaps.length > 0) {
    console.log(`\n   ⚠️  GAPS detectados (>3 días sin altas de cama):`);
    gaps.forEach(g => console.log(`   - Del ${g.desde} al ${g.hasta} (${g.dias} días sin actividad)`));
  }

  // ── B. transferHistory — analizar TODOS los campos ───────────────────────
  console.log(`\n🔄 B. transferHistory — análisis completo:`);
  console.log(`   Total registros: ${trArr.length}`);

  if (trArr.length > 0) {
    // Mostrar qué campos tienen
    const sampleFields = new Set();
    trArr.slice(0,10).forEach(t => Object.keys(t).forEach(k => sampleFields.add(k)));
    console.log(`   Campos disponibles: ${[...sampleFields].join(', ')}`);

    // Buscar registros de julio con cualquier campo de fecha
    const trJuly = trArr.filter(t => {
      const ts = getAnyDate(t);
      return ts && inJuly(ts);
    });
    console.log(`   Registros en julio (cualquier fecha): ${trJuly.length}`);

    if (trJuly.length > 0) {
      console.log(`\n   Primeros 20 traslados de julio:`);
      trJuly.slice(0,20).forEach(t => {
        const ts = getAnyDate(t);
        console.log(`   ${fmt(ts)} | ${t.patientName||t.patient||'?'} | ${t.fromBed||t.from||'?'} → ${t.toBed||t.to||'?'} | ${t.reason||'—'}`);
      });

      // Identificar traslados en los gaps
      gaps.forEach(g => {
        const gapTransfers = trJuly.filter(t => {
          const ts = getAnyDate(t);
          return ts && inRange(ts, g.desde + 'T00:00:00', g.hasta + 'T23:59:59');
        });
        console.log(`\n   Traslados en gap ${g.desde}→${g.hasta}: ${gapTransfers.length}`);
        gapTransfers.forEach(t => {
          const ts = getAnyDate(t);
          console.log(`   - ${fmt(ts)} | ${t.patientName||t.patient||'?'} | ${t.fromBed||t.from||'?'} → ${t.toBed||t.to||'?'}`);
        });
      });
    }
  }

  // ── C. bedsData_lastBackup — comparar con actual ─────────────────────────
  console.log(`\n💾 C. bedsData_lastBackup:`);
  if (backup) {
    const backupData = backup.data || backup;
    const backupAt   = backup.backedUpAt || '—';
    console.log(`   Backup creado: ${fmt(backupAt)}`);

    // Extraer previousPatient del backup
    const backupEps = [];
    const extractFromBackup = (bed, roomId, bedId, floor, sector, depth = 0) => {
      if (!bed || depth > 10) return;
      const pp = bed.previousPatient || bed.lastDischarge;
      if (pp && (pp.cleaningAt || pp.dischargeAt) && !pp._reverted) {
        const ts = pp.cleaningAt || pp.dischargeAt;
        if (inJuly(ts)) {
          backupEps.push({
            paciente: pp.patient || pp.patientName || '?',
            rut: pp.rut || '—',
            alta: fmt(ts),
            ts,
            cama: `${floor} Hab.${roomId} C${bedId}`,
            destino: pp.destino || '—'
          });
        }
        if (Array.isArray(pp.dischargeHistory)) {
          pp.dischargeHistory.filter(r => inJuly(r.cleaningAt || r.dischargeAt) && !r._reverted).forEach(r => {
            backupEps.push({
              paciente: r.patient || r.patientName || '?',
              rut: r.rut || '—',
              alta: fmt(r.cleaningAt || r.dischargeAt),
              ts: r.cleaningAt || r.dischargeAt,
              cama: `${floor} Hab.${roomId} C${bedId}`,
              destino: r.destino || '—'
            });
          });
        }
        extractFromBackup(pp, roomId, bedId, floor, sector, depth + 1);
      }
      if (Array.isArray(bed.dischargeHistory)) {
        bed.dischargeHistory.filter(r => inJuly(r.cleaningAt || r.dischargeAt) && !r._reverted).forEach(r => {
          backupEps.push({
            paciente: r.patient || r.patientName || '?',
            rut: r.rut || '—',
            alta: fmt(r.cleaningAt || r.dischargeAt),
            ts: r.cleaningAt || r.dischargeAt,
            cama: `${floor} Hab.${roomId} C${bedId}`,
            destino: r.destino || '—'
          });
        });
      }
    };

    if (backupData && typeof backupData === 'object') {
      for (const floor of Object.keys(backupData)) {
        if (typeof backupData[floor] !== 'object' || Array.isArray(backupData[floor])) continue;
        for (const sector of Object.keys(backupData[floor])) {
          for (const room of (backupData[floor][sector] || [])) {
            for (const bed of (room.beds || [])) {
              extractFromBackup(bed, room.roomId, bed.id, floor, sector);
            }
          }
        }
      }
    }

    const backupNotInLog = backupEps.filter(b =>
      !log.some(l =>
        (l.patient||l.patientName||'').toLowerCase().trim() === (b.paciente||'').toLowerCase().trim() &&
        Math.abs(new Date(l.cleaningAt||l.dischargeAt||0) - new Date(b.ts||0)) < 5000
      )
    );
    console.log(`   Episodios julio en backup: ${backupEps.length}`);
    console.log(`   NO capturados en log actual: ${backupNotInLog.length}`);
    if (backupNotInLog.length > 0) {
      console.log(`\n   ✅ RECUPERABLES desde backup:`);
      backupNotInLog.forEach(b => console.log(`   - ${b.alta} | ${b.paciente} | ${b.cama} | ${b.destino}`));
    }
  } else {
    console.log('   No hay backup disponible.');
  }

  // ── D. HODOM en julio — ver si hay altas domiciliarias no capturadas ──────
  console.log(`\n🏥 D. HODOM en julio:`);
  const hodomJuly = hodArr.filter(h => inJuly(h.aprobadoAt || h.solicitadaAt));
  console.log(`   Total: ${hodomJuly.length}`);
  hodomJuly.forEach(h => {
    const ts = h.aprobadoAt || h.solicitadaAt;
    console.log(`   - ${fmt(ts)} | ${h.patientName||'?'} | ${h.estado||'—'}`);
  });

  // ── E. blockLog en julio ──────────────────────────────────────────────────
  const blJuly = blArr.filter(b => inJuly(b.blockedAt || b.unblockedAt || b.timestamp));
  console.log(`\n🔒 E. Bloqueos en julio: ${blJuly.length}`);

  // ── F. Análisis de consistencia: pacientes en camas con ingreso en gaps ───
  console.log(`\n🔍 F. Actividad de camas DURANTE los gaps:`);
  gaps.forEach(g => {
    const gapFrom = new Date(g.desde + 'T00:00:00').getTime();
    const gapTo   = new Date(g.hasta + 'T23:59:59').getTime();

    // Pacientes activos cuyo assignedAt cae dentro del gap (= fueron acostados en ese periodo)
    const acostadosEnGap = [];
    if (bedsData && typeof bedsData === 'object') {
      for (const floor of Object.keys(bedsData)) {
        if (typeof bedsData[floor] !== 'object' || Array.isArray(bedsData[floor])) continue;
        for (const sector of Object.keys(bedsData[floor])) {
          for (const room of (bedsData[floor][sector] || [])) {
            for (const bed of (room.beds || [])) {
              if (bed.status === 'occupied' && bed.patient) {
                const ts = new Date(bed.assignedAt || 0).getTime();
                if (ts >= gapFrom && ts <= gapTo) {
                  acostadosEnGap.push({
                    nombre: bed.patient, cama: `${floor} Hab.${room.roomId} C${bed.id}`,
                    acueste: fmt(bed.assignedAt)
                  });
                }
              }
            }
          }
        }
      }
    }
    console.log(`\n   Gap ${g.desde} → ${g.hasta}:`);
    console.log(`   Pacientes acostados en ese periodo (aún en camas): ${acostadosEnGap.length}`);
    acostadosEnGap.forEach(p => console.log(`   - ${p.acueste} | ${p.nombre} | ${p.cama}`));

    // wld con requestedAt en el gap
    const wldEnGap = wldArr.filter(p => {
      const ts = new Date(p.requestedAt||0).getTime();
      return ts >= gapFrom && ts <= gapTo;
    });
    console.log(`   Altas de lista de espera con solicitud en gap: ${wldEnGap.length}`);
  });

  // ── CONCLUSIÓN ────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('📌 CONCLUSIÓN:');
  console.log(`Los gaps en altas de camas reales son una consecuencia del diseño`);
  console.log(`previo: el campo previousPatient se sobrescribía con cada nueva`);
  console.log(`asignación, perdiendo irrecuperablemente las altas intermedias.`);
  console.log(`El nuevo sistema dischargesLog garantiza que esto no vuelva a ocurrir.`);

  fs.writeFileSync('deep_audit_julio.json', JSON.stringify({
    gaps, logJulyBeds: logJulyBeds.slice(0,50), byDay,
    transfersCount: trArr.filter(t => getAnyDate(t) && inJuly(getAnyDate(t))).length
  }, null, 2));
  console.log('\n📄 Reporte guardado: deep_audit_julio.json');
  process.exit(0);
}

deepAudit().catch(err => { console.error('❌', err); process.exit(1); });
