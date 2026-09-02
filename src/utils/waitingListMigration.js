import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Verifica si existen pacientes en el documento legacy 'appState/waitingList'
 * y los migra como documentos individuales a la colección 'waitingList' en Firestore.
 * Crea un respaldo de seguridad en 'appState/waitingList_legacy_backup'.
 */
export async function checkAndMigrateWaitingList() {
  try {
    const statusRef = doc(db, 'appState', 'migration_status');
    const statusSnap = await getDoc(statusRef);
    const statusData = statusSnap.exists() ? statusSnap.data() : {};

    if (statusData?.v1_waitingList_collection) {
      // Ya fue migrado previamente
      return { success: true, alreadyMigrated: true };
    }

    // 1. Revisar si hay pacientes en appState/waitingList
    const legacyDocRef = doc(db, 'appState', 'waitingList');
    const legacySnap = await getDoc(legacyDocRef);

    if (!legacySnap.exists()) {
      // No existe documento legacy, marcamos como completado
      await setDoc(statusRef, { v1_waitingList_collection: true }, { merge: true });
      return { success: true, count: 0 };
    }

    const legacyPatients = legacySnap.data()?.data || [];
    if (!Array.isArray(legacyPatients) || legacyPatients.length === 0) {
      await setDoc(statusRef, { v1_waitingList_collection: true }, { merge: true });
      return { success: true, count: 0 };
    }

    console.log(`[Migration WaitingList] Encontrados ${legacyPatients.length} pacientes legacy. Iniciando migración...`);

    // 2. Crear respaldo preventivo antes de migrar
    try {
      await setDoc(doc(db, 'appState', 'waitingList_legacy_backup'), {
        createdAt: new Date().toISOString(),
        patientCount: legacyPatients.length,
        patients: legacyPatients
      });
      console.log('[Migration WaitingList] Respaldo guardado en appState/waitingList_legacy_backup.');
    } catch (bErr) {
      console.warn('[Migration WaitingList] No se pudo guardar documento de respaldo:', bErr);
    }

    // 3. Revisar qué documentos ya existen en la colección 'waitingList' para no duplicar
    const colRef = collection(db, 'waitingList');
    const existingSnap = await getDocs(colRef);
    const existingIds = new Set();
    existingSnap.forEach(d => existingIds.add(d.id));

    // 4. Insertar por lotes (Batch)
    const BATCH_LIMIT = 400;
    const toMigrate = legacyPatients.filter(p => p && (p.id || p.rut));
    let migratedCount = 0;

    for (let i = 0; i < toMigrate.length; i += BATCH_LIMIT) {
      const chunk = toMigrate.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);

      chunk.forEach(p => {
        const pId = String(p.id || `wait_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);
        // Si ya existe en la colección, no sobreescribir
        if (!existingIds.has(pId)) {
          const docRef = doc(db, 'waitingList', pId);
          batch.set(docRef, {
            ...p,
            id: pId,
            migratedFromLegacy: true,
            migratedAt: new Date().toISOString()
          });
          migratedCount++;
        }
      });

      await batch.commit();
    }

    // 5. Marcar estado de migración como completado
    await setDoc(statusRef, {
      v1_waitingList_collection: true,
      waitingListMigratedAt: new Date().toISOString(),
      waitingListCount: migratedCount
    }, { merge: true });

    console.log(`[Migration WaitingList] ✅ Migración completada: ${migratedCount} pacientes migrados a la colección waitingList.`);
    return { success: true, count: migratedCount };
  } catch (error) {
    console.error('[Migration WaitingList] Error al migrar lista de espera:', error);
    return { success: false, error: error.message };
  }
}
