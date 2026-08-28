import { doc, getDoc, setDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Servicio de migración para convertir el esquema monolítico (documentos con arrays gigantes en appState)
 * a colecciones individuales de Firestore (discharges, transfers, blockLogs, hodomRequests, procedures) y sanear bedsData.
 */
export async function runCollectionsMigration() {
  try {
    const statusRef = doc(db, 'appState', 'migration_status');
    const statusSnap = await getDoc(statusRef);
    const statusData = statusSnap.exists() ? statusSnap.data() : {};

    const alreadyCollections = statusData?.v1_collections;
    const alreadyProcedures = statusData?.v1_procedures;

    if (alreadyCollections && alreadyProcedures) {
      // Todas las migraciones ya fueron completadas previamente
      return { success: true, alreadyMigrated: true };
    }

    console.log('[Migration] Iniciando verificación/migración de colecciones independientes de Firestore...');

    // 1. Cargar documentos legacy desde appState
    const dischargesLogSnap = await getDoc(doc(db, 'appState', 'dischargesLog'));
    const waitingDischargesSnap = await getDoc(doc(db, 'appState', 'waitingListDischarges'));
    const bedsDataSnap = await getDoc(doc(db, 'appState', 'bedsData'));
    const transferHistorySnap = await getDoc(doc(db, 'appState', 'transferHistory'));
    const blockLogSnap = await getDoc(doc(db, 'appState', 'blockLog'));
    const hodomRequestsSnap = await getDoc(doc(db, 'appState', 'hodomRequests'));

    const legacyDischargesLog = dischargesLogSnap.exists() ? (dischargesLogSnap.data()?.data || []) : [];
    const legacyWaitingDischarges = waitingDischargesSnap.exists() ? (waitingDischargesSnap.data()?.data || []) : [];
    const legacyBedsData = bedsDataSnap.exists() ? (bedsDataSnap.data()?.data || {}) : {};
    const legacyTransfers = transferHistorySnap.exists() ? (transferHistorySnap.data()?.data || []) : [];
    const legacyBlockLogs = blockLogSnap.exists() ? (blockLogSnap.data()?.data || []) : [];
    const legacyHodom = hodomRequestsSnap.exists() ? (hodomRequestsSnap.data()?.data || []) : [];

    // 2. Guardar backup preventivo en appState/legacy_migration_backup
    try {
      await setDoc(doc(db, 'appState', 'legacy_migration_backup'), {
        createdAt: new Date().toISOString(),
        dischargesLogCount: legacyDischargesLog.length,
        waitingDischargesCount: legacyWaitingDischarges.length,
        transfersCount: legacyTransfers.length,
        blockLogsCount: legacyBlockLogs.length,
        hodomCount: legacyHodom.length
      }, { merge: true });
    } catch (bkErr) {
      console.warn('[Migration] No se pudo escribir log de backup (no crítico):', bkErr);
    }

    const BATCH_LIMIT = 400;

    // 3. Consolidar Altas Médicas (discharges) y Procedimientos (procedures) desde camas
    const dischargesMap = new Map();
    const proceduresList = [];

    const addDischargeRecord = (rec, extra = {}) => {
      if (!rec || rec._reverted) return;
      const nombre = rec.patient || rec.patientName || rec.nombre || '';
      const ts = rec.cleaningAt || rec.dischargeAt || rec.fecha || '';
      const rut = rec.rut || rec.run || '';
      const key = `${nombre.trim().toLowerCase()}_${rut.trim()}_${ts}`;

      const recId = String(rec.id || rec._logId || (Date.now() + '_' + Math.random().toString(36).substr(2, 6)));

      if (!dischargesMap.has(key)) {
        dischargesMap.set(key, {
          id: recId,
          _logId: recId,
          ...rec,
          ...extra,
          migratedAt: new Date().toISOString()
        });
      }
    };

    // 3.1 Desde dischargesLog
    if (Array.isArray(legacyDischargesLog)) {
      legacyDischargesLog.forEach(r => addDischargeRecord(r, { source: r.source || 'dischargesLog' }));
    }

    // 3.2 Desde waitingListDischarges
    if (Array.isArray(legacyWaitingDischarges)) {
      legacyWaitingDischarges.forEach(r => addDischargeRecord(r, { source: 'waitingList' }));
    }

    // 3.3 Extraer dischargeHistory y novedades/procedimientos anidados en bedsData
    const cleanedBedsData = JSON.parse(JSON.stringify(legacyBedsData));
    const floors = Object.keys(cleanedBedsData || {}).filter(k =>
      cleanedBedsData[k] && typeof cleanedBedsData[k] === 'object' && !Array.isArray(cleanedBedsData[k])
    );

    floors.forEach(floor => {
      Object.keys(cleanedBedsData[floor] || {}).forEach(sector => {
        (cleanedBedsData[floor][sector] || []).forEach(room => {
          (room.beds || []).forEach(bed => {
            // Extraer dischargeHistory
            if (Array.isArray(bed.dischargeHistory)) {
              bed.dischargeHistory.forEach(r => addDischargeRecord(r, {
                sala: room.roomId,
                cama: bed.id,
                bedType: bed.tag || bed.type || '',
                source: 'legacy_bed'
              }));
              // SANEAR: Eliminar el array acumulado en la cama
              delete bed.dischargeHistory;
            }

            // Extraer previousPatient si existe
            if (bed.previousPatient) {
              const pp = bed.previousPatient;
              if (pp.cleaningAt || pp.dischargeAt) {
                addDischargeRecord(pp, {
                  sala: room.roomId,
                  cama: bed.id,
                  bedType: bed.tag || bed.type || '',
                  source: 'legacy_bed'
                });
              }
              // Limpiar nesting recursivo de previousPatient si lo tuviera
              if (pp.previousPatient) delete pp.previousPatient;
              if (pp.dischargeHistory) delete pp.dischargeHistory;
              if (pp.novedades) delete pp.novedades;
              if (pp.evolutions) delete pp.evolutions;
            }

            if (bed.lastDischarge) {
              delete bed.lastDischarge;
            }

            // Extraer PROCEDIMIENTOS / NOVEDADES incrustados en la cama
            if (Array.isArray(bed.novedades) && bed.novedades.length > 0) {
              bed.novedades.forEach((nov, idx) => {
                const pId = String(nov.id || `proc_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`);
                const createdAtIso = (nov.id && typeof nov.id === 'number' && nov.id > 1600000000000)
                  ? new Date(nov.id).toISOString()
                  : new Date().toISOString();

                proceduresList.push({
                  id: pId,
                  bedId: bed.id,
                  roomId: room.roomId,
                  floor,
                  sector,
                  patientName: bed.patient || bed.patientName || bed.nombre || '',
                  rut: bed.rut || bed.run || '',
                  fecha: nov.fecha || new Date().toLocaleString('es-CL'),
                  createdAt: nov.createdAt || createdAtIso,
                  usuario: nov.usuario || 'Personal Clínico',
                  rol: nov.rol || 'Clínico',
                  contenido: nov.contenido || nov.procedimiento || nov.note || '',
                  tipo: 'procedimiento',
                  migratedAt: new Date().toISOString()
                });
              });
              // SANEAR: Desacoplar array de novedades de la cama
              delete bed.novedades;
            }

            // Limpiar evoluciones antiguas anidadas si las hubiese
            if (Array.isArray(bed.evolutions)) {
              delete bed.evolutions;
            }
          });
        });
      });
    });

    // 4. Migrar a colecciones individuales si no se habían migrado antes
    const allDischarges = Array.from(dischargesMap.values());

    if (!alreadyCollections) {
      // 4.1 Colección 'discharges'
      console.log(`[Migration] Migrando ${allDischarges.length} altas a colección 'discharges'...`);
      for (let i = 0; i < allDischarges.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        allDischarges.slice(i, i + BATCH_LIMIT).forEach(d => {
          const dRef = doc(db, 'discharges', d.id);
          batch.set(dRef, d);
        });
        await batch.commit();
      }

      // 4.2 Colección 'transfers'
      if (Array.isArray(legacyTransfers) && legacyTransfers.length > 0) {
        console.log(`[Migration] Migrando ${legacyTransfers.length} traslados a colección 'transfers'...`);
        for (let i = 0; i < legacyTransfers.length; i += BATCH_LIMIT) {
          const batch = writeBatch(db);
          legacyTransfers.slice(i, i + BATCH_LIMIT).forEach((t, idx) => {
            const tId = String(t.id || `trans_${Date.now()}_${idx}`);
            const tRef = doc(db, 'transfers', tId);
            batch.set(tRef, { ...t, id: tId });
          });
          await batch.commit();
        }
      }

      // 4.3 Colección 'blockLogs'
      if (Array.isArray(legacyBlockLogs) && legacyBlockLogs.length > 0) {
        console.log(`[Migration] Migrando ${legacyBlockLogs.length} bloqueos a colección 'blockLogs'...`);
        for (let i = 0; i < legacyBlockLogs.length; i += BATCH_LIMIT) {
          const batch = writeBatch(db);
          legacyBlockLogs.slice(i, i + BATCH_LIMIT).forEach((b, idx) => {
            const bId = String(b.id || `block_${Date.now()}_${idx}`);
            const bRef = doc(db, 'blockLogs', bId);
            batch.set(bRef, { ...b, id: bId });
          });
          await batch.commit();
        }
      }

      // 4.4 Colección 'hodomRequests'
      if (Array.isArray(legacyHodom) && legacyHodom.length > 0) {
        console.log(`[Migration] Migrando ${legacyHodom.length} solicitudes HODOM a colección 'hodomRequests'...`);
        for (let i = 0; i < legacyHodom.length; i += BATCH_LIMIT) {
          const batch = writeBatch(db);
          legacyHodom.slice(i, i + BATCH_LIMIT).forEach((h, idx) => {
            const hId = String(h.id || `hodom_${Date.now()}_${idx}`);
            const hRef = doc(db, 'hodomRequests', hId);
            batch.set(hRef, { ...h, id: hId });
          });
          await batch.commit();
        }
      }
    }

    // 5. Migrar colección 'procedures'
    if (!alreadyProcedures && proceduresList.length > 0) {
      console.log(`[Migration] Migrando ${proceduresList.length} procedimientos/novedades a colección 'procedures'...`);
      for (let i = 0; i < proceduresList.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        proceduresList.slice(i, i + BATCH_LIMIT).forEach(p => {
          const pRef = doc(db, 'procedures', p.id);
          batch.set(pRef, p);
        });
        await batch.commit();
      }
    }

    // 6. Guardar bedsData saneado (sin historiales ni novedades anidadas infinitas)
    if (bedsDataSnap.exists()) {
      await setDoc(doc(db, 'appState', 'bedsData'), { data: cleanedBedsData });
      console.log('[Migration] bedsData saneado y actualizado con éxito.');
    }

    // 7. Marcar migración como completada
    await setDoc(statusRef, {
      v1_collections: true,
      v1_procedures: true,
      migratedAt: new Date().toISOString(),
      dischargesCount: allDischarges.length,
      transfersCount: legacyTransfers.length,
      blockLogsCount: legacyBlockLogs.length,
      hodomCount: legacyHodom.length,
      proceduresCount: proceduresList.length
    }, { merge: true });

    console.log('[Migration] ¡Migración de colecciones y procedimientos de Firestore completada con éxito!');
    return {
      success: true,
      dischargesCount: allDischarges.length,
      transfersCount: legacyTransfers.length,
      blockLogsCount: legacyBlockLogs.length,
      hodomCount: legacyHodom.length,
      proceduresCount: proceduresList.length
    };
  } catch (error) {
    console.error('[Migration] Error durante la migración de colecciones:', error);
    return { success: false, error: error.message };
  }
}

