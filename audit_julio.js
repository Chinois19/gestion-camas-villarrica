/**
 * audit_julio.js
 * Analiza TODAS las fuentes de datos para encontrar episodios de julio 2026
 * que no hayan sido capturados en el dischargesLog.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase_config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const isJuly = (ts) => {
  if (!ts) return false;
  try { const d = new Date(ts); return d.getFullYear() === 2026 && d.getMonth() === 6; } // mes 6 = julio
  catch { return false; }
};
const isJune = (ts) => {
  if (!ts) return false;
  try { const d = new Date(ts); return d.getFullYear() === 2026 && d.getMonth() === 5; }
  catch { return false; }
};
const fmtDate = (ts) => {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('es-CL', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  catch { return ts; }
};

async function audit() {
  console.log('\n🔍 AUDITORÍA JULIO 2026 — Búsqueda exhaustiva\n');
  console.log('='.repeat(70));

  const [bedsSnap, wldSnap, transferSnap, logSnap, hodomSnap] = await Promise.all([
    getDoc(doc(db, 'appState', 'bedsData')),
    getDoc(doc(db, 'appState', 'waitingListDischarges')),
    getDoc(doc(db, 'appState', 'transferHistory')),
    getDoc(doc(db, 'appState', 'dischargesLog')),
    getDoc(doc(db, 'appState', 'hodomRequests'))
  ]);

  const bedsData    = bedsSnap.exists()    ? bedsSnap.data().data    : {};
  const wld         = wldSnap.exists()     ? wldSnap.data().data     : [];
  const transfers   = transferSnap.exists()? transferSnap.data().data: [];
  const logData     = logSnap.exists()     ? logSnap.data().data     : [];
  const hodom       = hodomSnap.exists()   ? hodomSnap.data().data   : [];

  // ── 1. dischargesLog actual ───────────────────────────────────────────────
  const logJulio = logData.filter(r =>
    isJuly(r.cleaningAt || r.dischargeAt)
  );
  console.log(`\n📋 1. dischargesLog — registros en julio: ${logJulio.length}`);
  const logJunio = logData.filter(r => isJune(r.cleaningAt || r.dischargeAt));
  console.log(`   dischargesLog — registros en junio:  ${logJunio.length}`);
  console.log(`   dischargesLog — total:               ${logData.length}`);

  // ── 2. Camas actualmente ocupadas (admitidas en julio) ───────────────────
  const activasJulio = [];
  const activasJunio = [];
  const activasOtro  = [];
  for (const floor of Object.keys(bedsData)) {
    if (typeof bedsData[floor] !== 'object' || Array.isArray(bedsData[floor])) continue;
    for (const sector of Object.keys(bedsData[floor])) {
      for (const room of (bedsData[floor][sector] || [])) {
        for (const bed of (room.beds || [])) {
          if (bed.status === 'occupied' && bed.patient) {
            const ts = bed.assignedAt || bed.admissionDate;
            const entry = {
              paciente: bed.patient,
              rut: bed.rut || '—',
              cama: `${floor} Hab.${room.roomId} C${bed.id}`,
              ingreso: fmtDate(ts),
              ts,
              diagnostico: Array.isArray(bed.diagnosis) ? bed.diagnosis.join(', ') : (bed.diagnosis || bed.dxPrincipal || '—')
            };
            if (isJuly(ts)) activasJulio.push(entry);
            else if (isJune(ts)) activasJunio.push(entry);
            else activasOtro.push(entry);
          }
        }
      }
    }
  }
  console.log(`\n🛏️  2. Pacientes ACTIVOS (en camas ahora) admitidos en:`);
  console.log(`   Julio 2026: ${activasJulio.length} pacientes (aún hospitalizados)`);
  console.log(`   Junio 2026: ${activasJunio.length} pacientes (aún hospitalizados)`);
  console.log(`   Otro mes:   ${activasOtro.length} pacientes`);

  // ── 3. Camas en cleaning/pending con previousPatient en julio ─────────────
  const cleaningJulio = [];
  const recurseAll = (obj, floor, sector, roomId, bedId, depth = 0, results = []) => {
    if (!obj || depth > 10) return results;
    const pp = obj.previousPatient || obj.lastDischarge;
    if (pp) {
      const ts = pp.cleaningAt || pp.dischargeAt;
      if (isJuly(ts)) {
        results.push({
          paciente: pp.patient || pp.patientName || '?',
          rut: pp.rut || '—',
          cama: `${floor} Hab.${roomId} C${bedId}`,
          alta: fmtDate(ts),
          destino: pp.destino || '—',
          depth
        });
      }
      recurseAll(pp, floor, sector, roomId, bedId, depth + 1, results);
    }
    if (Array.isArray(obj.dischargeHistory)) {
      obj.dischargeHistory.forEach(r => {
        const ts = r.cleaningAt || r.dischargeAt;
        if (isJuly(ts)) {
          results.push({
            paciente: r.patient || r.patientName || '?',
            rut: r.rut || '—',
            cama: `${floor} Hab.${roomId} C${bedId}`,
            alta: fmtDate(ts),
            destino: r.destino || '—',
            depth: 0,
            fromHistory: true
          });
        }
      });
    }
    return results;
  };

  for (const floor of Object.keys(bedsData)) {
    if (typeof bedsData[floor] !== 'object' || Array.isArray(bedsData[floor])) continue;
    for (const sector of Object.keys(bedsData[floor])) {
      for (const room of (bedsData[floor][sector] || [])) {
        for (const bed of (room.beds || [])) {
          recurseAll(bed, floor, sector, room.roomId, bed.id, 0, cleaningJulio);
        }
      }
    }
  }

  // Filtrar los que ya están en el log
  const logKeys = new Set(logData.map(r => {
    const n = (r.patient || r.patientName || '').toLowerCase().trim();
    const t = r.cleaningAt || r.dischargeAt || '';
    return `${n}|${t}`;
  }));
  const notInLog = cleaningJulio.filter(r => {
    const k = `${(r.paciente || '').toLowerCase().trim()}|`;
    // verificar si algún registro del log tiene este paciente en julio
    return !logData.some(l =>
      (l.patient || l.patientName || '').toLowerCase().trim() === (r.paciente || '').toLowerCase().trim() &&
      isJuly(l.cleaningAt || l.dischargeAt)
    );
  });

  console.log(`\n🔎 3. Episodios en bedsData con fecha de alta en julio:`);
  console.log(`   Total encontrados: ${cleaningJulio.length}`);
  console.log(`   Ya en dischargesLog: ${cleaningJulio.length - notInLog.length}`);
  console.log(`   FALTANTES (no en log): ${notInLog.length}`);
  if (notInLog.length > 0) {
    console.log('\n   Detalle de faltantes:');
    notInLog.forEach(r => console.log(`   - ${r.paciente.padEnd(30)} | ${r.alta} | ${r.cama} | ${r.destino}`));
  }

  // ── 4. transferHistory con eventos en julio ───────────────────────────────
  const transfersJulio = (Array.isArray(transfers) ? transfers : []).filter(t =>
    isJuly(t.timestamp || t.transferredAt || t.date)
  );
  console.log(`\n🔄 4. Traslados en julio: ${transfersJulio.length}`);

  // ── 5. HODOM aprobados en julio ───────────────────────────────────────────
  const hodomJulio = (Array.isArray(hodom) ? hodom : []).filter(h =>
    isJuly(h.aprobadoAt || h.solicitadaAt)
  );
  console.log(`\n🏥 5. HODOM en julio: ${hodomJulio.length}`);

  // ── 6. waitingListDischarges en julio (fuera del log) ─────────────────────
  const wldJulio = (Array.isArray(wld) ? wld : []).filter(p => isJuly(p.dischargeAt));
  const wldJulioFaltantes = wldJulio.filter(p =>
    !logData.some(l =>
      (l.patient || l.patientName || '').toLowerCase().trim() === (p.patient || p.patientName || '').toLowerCase().trim() &&
      (l.cleaningAt || l.dischargeAt) === (p.dischargeAt || p.cleaningAt)
    )
  );
  console.log(`\n📝 6. waitingListDischarges en julio: ${wldJulio.length}`);
  console.log(`   Ya en dischargesLog: ${wldJulio.length - wldJulioFaltantes.length}`);
  console.log(`   FALTANTES: ${wldJulioFaltantes.length}`);

  // ── RESUMEN FINAL ─────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMEN PARA JULIO 2026:');
  console.log(`   Episodios ya en dischargesLog:        ${logJulio.length}`);
  console.log(`   Pacientes activos admitidos en julio: ${activasJulio.length} (AÚN en camas)`);
  console.log(`   Episodios en bedsData no capturados:  ${notInLog.length}`);
  console.log(`   Traslados (pueden ser altas externas): ${transfersJulio.length}`);
  console.log(`   HODOM aprobados:                      ${hodomJulio.length}`);
  console.log('\n   TOTAL episodios recuperables adicionales:', notInLog.length + wldJulioFaltantes.length);

  // Guardar detalle en JSON
  const report = {
    generadoEn: new Date().toISOString(),
    julio_en_dischargesLog: logJulio.length,
    julio_pacientes_activos: activasJulio,
    julio_en_bedsData_no_en_log: notInLog,
    julio_transfers: transfersJulio.slice(0, 20),
    julio_hodom: hodomJulio,
    julio_wld_faltantes: wldJulioFaltantes
  };
  fs.writeFileSync('audit_julio_2026.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Reporte completo guardado en: audit_julio_2026.json');
  process.exit(0);
}

audit().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
