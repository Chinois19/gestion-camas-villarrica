/**
 * add_hodom_to_log.js
 * Agrega los 14 pacientes HODOM de julio 2026 al dischargesLog permanente.
 * Los HODOM aprobados son altas domiciliarias reales — el paciente dejó la cama.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase_config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const fmt = (ts) => {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('es-CL', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  catch { return String(ts); }
};
const inJuly = (ts) => { try { const d = new Date(ts); return d.getFullYear()===2026 && d.getMonth()===6; } catch { return false; }};

async function addHodom() {
  console.log('\n🏥 Agregando pacientes HODOM de julio al dischargesLog...\n');

  const [hodomSnap, logSnap, bedsSnap] = await Promise.all([
    getDoc(doc(db, 'appState', 'hodomRequests')),
    getDoc(doc(db, 'appState', 'dischargesLog')),
    getDoc(doc(db, 'appState', 'bedsData')),
  ]);

  const hodom    = hodomSnap.exists()  ? hodomSnap.data().data  : [];
  const logData  = logSnap.exists()    ? (logSnap.data().data || []) : [];
  const bedsData = bedsSnap.exists()   ? bedsSnap.data().data   : {};

  // Solo HODOM aprobados en julio
  const hodomJulyApproved = hodom.filter(h =>
    (h.estado === 'aprobado') && inJuly(h.aprobadoAt || h.solicitadaAt)
  );

  console.log(`HODOM aprobados en julio: ${hodomJulyApproved.length}`);

  // Construir helper para buscar datos completos del paciente en bedsData
  const findPatientInBeds = (patientName, roomId, bedId) => {
    for (const floor of Object.keys(bedsData || {})) {
      if (typeof bedsData[floor] !== 'object' || Array.isArray(bedsData[floor])) continue;
      for (const sector of Object.keys(bedsData[floor])) {
        for (const room of (bedsData[floor][sector] || [])) {
          if (String(room.roomId) !== String(roomId)) continue;
          for (const bed of (room.beds || [])) {
            if (String(bed.id) !== String(bedId)) continue;
            // Buscar en previousPatient recursivo
            const findInChain = (obj, depth = 0) => {
              if (!obj || depth > 8) return null;
              const name = (obj.patient || obj.patientName || '').toLowerCase();
              const searchName = (patientName || '').toLowerCase();
              if (name && searchName && (name.includes(searchName.split(' ')[0]) || searchName.includes(name.split(' ')[0]))) {
                return obj;
              }
              if (obj.previousPatient) return findInChain(obj.previousPatient, depth + 1);
              return null;
            };
            const found = findInChain(bed);
            if (found) return { record: found, floor, sector, room: room.roomId, cama: bed.id, bedType: bed.tag || bed.type || '' };
          }
        }
      }
    }
    return null;
  };

  const toAdd = [];

  for (const h of hodomJulyApproved) {
    const ts     = h.aprobadoAt || h.solicitadaAt;
    const nombre = (h.patientName || '').trim();

    // Verificar si ya está en el log
    const alreadyInLog = logData.some(l => {
      const ln = (l.patient || l.patientName || '').toLowerCase().trim();
      const hn = nombre.toLowerCase();
      return ln === hn || ln.includes(hn.split(' ')[0]) || hn.includes(ln.split(' ')[0]);
    });

    if (alreadyInLog) {
      console.log(`  ⏭️  Ya en log: ${nombre}`);
      continue;
    }

    // Intentar encontrar datos completos en bedsData
    const bedInfo = h.roomId ? findPatientInBeds(nombre, h.roomId, h.bedId) : null;

    const baseRecord = {
      _logId:     `log-hodom-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      _loggedAt:  new Date().toISOString(),
      _source:    'rescue_hodom',
      piso:       bedInfo?.floor || '—',
      sector:     bedInfo?.sector || '—',
      habitacion: h.roomId || '—',
      cama:       h.bedId  || '—',
      bedType:    bedInfo?.bedType || '—',

      // Datos del paciente desde HODOM
      patient:    nombre,
      patientName: nombre,
      rut:        h.rut || '—',
      edad:       h.edad || '—',
      age:        h.edad || '—',
      prevision:  h.prevision || '—',
      diagnosis:  Array.isArray(h.diagnostico) ? h.diagnostico : [h.diagnostico || 'No registrado'],
      destino:    'Hospitalización domiciliaria',
      dischargeAt: ts,
      cleaningAt:  ts,
      requestedAt: h.solicitadaAt || ts,
      observaciones: h.hodomObservaciones || '',
      isHodom:    true,
      hodomEstado: h.estado,
      hodomId:    h.id,
      profesionalRequiere: h.profesionalRequiere || '—',

      // Si encontramos datos en bedsData, enriquecemos
      ...(bedInfo?.record ? (() => {
        const { dischargeHistory: _dh, previousPatient: _pp, lastDischarge: _ld, ...clean } = bedInfo.record;
        return clean;
      })() : {}),
    };

    toAdd.push(baseRecord);
    console.log(`  ✅ Preparado: ${nombre} | ${fmt(ts)} | Hab.${h.roomId||'?'} C${h.bedId||'?'}`);
  }

  if (toAdd.length === 0) {
    console.log('\n✅ Todos los HODOM de julio ya están en el dischargesLog.');
    process.exit(0);
  }

  // Merge y ordenar
  const merged = [...toAdd, ...logData].sort((a, b) => {
    const ta = new Date(a.cleaningAt || a.dischargeAt || a._loggedAt || 0).getTime();
    const tb = new Date(b.cleaningAt || b.dischargeAt || b._loggedAt || 0).getTime();
    return tb - ta;
  });

  console.log(`\n📊 Agregando ${toAdd.length} registros HODOM. Total nuevo: ${merged.length}`);
  console.log('⏳ Escribiendo en Firebase...');
  await setDoc(doc(db, 'appState', 'dischargesLog'), { data: merged });
  console.log('✅ dischargesLog actualizado con pacientes HODOM.');

  // También agregar los pacientes activos en camas desde los gaps
  // (aún hospitalizados — los registramos como "en curso" con su fecha de acueste)
  console.log('\n📋 Resumen HODOM agregados:');
  toAdd.forEach(r => {
    console.log(`  - ${fmt(r.cleaningAt)} | ${r.patient} | Hab.${r.habitacion} C${r.cama}`);
  });

  process.exit(0);
}

addHodom().catch(err => { console.error('❌', err); process.exit(1); });
