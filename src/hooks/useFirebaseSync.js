import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Cuenta la cantidad de camas ocupadas (con paciente) en una estructura bedsData.
 * Se usa para validación de integridad antes de cada escritura.
 */
function countOccupiedBeds(data) {
  let count = 0;
  if (!data || typeof data !== 'object') return 0;
  for (const floor in data) {
    if (typeof data[floor] !== 'object') continue;
    for (const sector in data[floor]) {
      if (!Array.isArray(data[floor][sector])) continue;
      data[floor][sector].forEach(room => {
        if (room.beds && Array.isArray(room.beds)) {
          room.beds.forEach(bed => {
            if (bed.status === 'occupied' && bed.patient) count++;
          });
        }
      });
    }
  }
  return count;
}

export function useFirebaseSync(collectionName, documentId, initialData) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);

  // Keep a ref to the latest data so updater functions always see the current value
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Track whether we've received the first snapshot from Firestore
  const initializedRef = useRef(false);

  useEffect(() => {
    const docRef = doc(db, collectionName, documentId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const firestoreData = docSnap.data().data;
        // Always trust Firestore as the single source of truth
        setData(firestoreData);
        dataRef.current = firestoreData;
      } else {
        // ═══════════════════════════════════════════════════════════════
        // PROTECCIÓN CAPA 1: NUNCA sobrescribir Firestore con datos dummy.
        // Si el documento no existe, usamos los datos iniciales SOLO como
        // estado local temporal. El documento se creará automáticamente
        // con la primera acción real del usuario (asignar paciente, etc.)
        // ═══════════════════════════════════════════════════════════════
        console.warn(
          `[useFirebaseSync] ⚠️ Documento "${collectionName}/${documentId}" no existe en Firestore. ` +
          `Usando datos locales de respaldo. Se creará automáticamente con la primera acción del usuario.`
        );
        // Keep the initialData as local state — do NOT write it to Firestore
      }
      initializedRef.current = true;
      setLoading(false);
    }, (error) => {
      console.error(`Error listening to ${collectionName}/${documentId}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, documentId]);

  const updateData = useCallback(async (newDataOrUpdater) => {
    // Always compute from the latest ref value, avoiding stale closures
    const currentData = dataRef.current;
    const newData = typeof newDataOrUpdater === 'function'
      ? newDataOrUpdater(currentData)
      : newDataOrUpdater;

    // ═══════════════════════════════════════════════════════════════
    // PROTECCIÓN CAPA 3: Validación de integridad para bedsData.
    // Detecta y bloquea escrituras que eliminarían masivamente pacientes.
    // ═══════════════════════════════════════════════════════════════
    if (documentId === 'bedsData') {
      const oldCount = countOccupiedBeds(currentData);
      const newCount = countOccupiedBeds(newData);

      // Bloquear si se eliminan TODOS los pacientes de golpe
      if (oldCount > 0 && newCount === 0) {
        console.error(
          `[PROTECCIÓN] ❌ ESCRITURA BLOQUEADA: Se intentó eliminar TODOS los pacientes ` +
          `(${oldCount} → 0). Esta operación no está permitida.`
        );
        return;
      }

      // Bloquear si se pierden más del 50% de pacientes en una sola operación
      if (oldCount > 3 && newCount < oldCount * 0.5) {
        console.error(
          `[PROTECCIÓN] ❌ ESCRITURA BLOQUEADA: Reducción sospechosa de pacientes ` +
          `(${oldCount} → ${newCount}, pérdida >${Math.round((1 - newCount/oldCount) * 100)}%). ` +
          `Posible corrupción de datos. Operación cancelada.`
        );
        return;
      }
    }

    // Immediately update local state + ref for responsive UI
    setData(newData);
    dataRef.current = newData;

    try {
      const docRef = doc(db, collectionName, documentId);

      // ═══════════════════════════════════════════════════════════════
      // PROTECCIÓN CAPA 2: Backup automático antes de cada escritura
      // a bedsData. Guarda el estado anterior para poder recuperar
      // en caso de cualquier problema.
      // ═══════════════════════════════════════════════════════════════
      if (documentId === 'bedsData' && currentData) {
        try {
          const backupRef = doc(db, collectionName, `${documentId}_lastBackup`);
          await setDoc(backupRef, {
            data: currentData,
            backedUpAt: new Date().toISOString(),
            occupiedBeds: countOccupiedBeds(currentData),
            reason: 'auto_backup_before_write'
          });
        } catch (backupErr) {
          console.warn('[Backup] No se pudo guardar respaldo automático:', backupErr);
          // Continue with the write even if backup fails
        }
      }

      await setDoc(docRef, { data: newData });
      // The onSnapshot listener will confirm this write and update all clients
    } catch (error) {
      console.error(`Error updating ${collectionName}/${documentId}:`, error);
      // Revert to the Firestore version on failure
      // The onSnapshot listener will auto-correct on reconnection
    }
  }, [collectionName, documentId]);

  return [data, updateData, loading];
}
