import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
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

export function useFirebaseSync(collectionName, documentId, initialData, options = {}) {
  const { realtime = true, enabled = true } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);

  if (!enabled && loading) {
    setLoading(false);
  }

  // Keep a ref to the latest data so updater functions always see the current value
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Track whether we've received the first snapshot from Firestore
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    const docRef = doc(db, collectionName, documentId);

    if (realtime) {
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
    } else {
      let active = true;
      getDoc(docRef).then((docSnap) => {
        if (!active) return;
        if (docSnap.exists()) {
          const firestoreData = docSnap.data().data;
          setData(firestoreData);
          dataRef.current = firestoreData;
        } else {
          console.warn(
            `[useFirebaseSync] ⚠️ Documento "${collectionName}/${documentId}" no existe en Firestore.`
          );
        }
        initializedRef.current = true;
        setLoading(false);
      }).catch((error) => {
        if (!active) return;
        console.error(`Error loading ${collectionName}/${documentId}:`, error);
        setLoading(false);
      });

      return () => {
        active = false;
      };
    }
  }, [collectionName, documentId, realtime, enabled]);

  const updateData = useCallback(async (newDataOrUpdater) => {
    // 1. Compute local update immediately for responsive UI
    const currentData = dataRef.current;
    const localNewData = typeof newDataOrUpdater === 'function'
      ? newDataOrUpdater(currentData)
      : newDataOrUpdater;

    // ═══════════════════════════════════════════════════════════════════════
    // PROTECCIÓN CAPA 3 — bedsData: Validación de integridad de pacientes
    // ═══════════════════════════════════════════════════════════════════════
    if (documentId === 'bedsData') {
      const oldCount = countOccupiedBeds(currentData);
      const newCount = countOccupiedBeds(localNewData);

      // Block if all patients are deleted at once
      if (oldCount > 0 && newCount === 0) {
        console.error(
          `[PROTECCIÓN] ❌ ESCRITURA BLOQUEADA: Se intentó eliminar TODOS los pacientes ` +
          `(${oldCount} → 0). Esta operación no está permitida.`
        );
        return false;
      }

      // Block if more than 50% of patients are lost in a single operation
      if (oldCount > 3 && newCount < oldCount * 0.5) {
        console.error(
          `[PROTECCIÓN] ❌ ESCRITURA BLOQUEADA: Reducción sospechosa de pacientes ` +
          `(${oldCount} → ${newCount}, pérdida >${Math.round((1 - newCount/oldCount) * 100)}%). ` +
          `Posible corrupción de datos. Operación cancelada.`
        );
        return false;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PROTECCIÓN CAPA 3 — users: Validación de integridad de usuarios
    // Previene que los 6 defaultUsers sobrescriban el listado real cuando
    // hay una race condition entre el montaje del componente y la respuesta
    // de Firestore (onSnapshot).
    // ═══════════════════════════════════════════════════════════════════════
    if (documentId === 'users') {
      const oldCount = Array.isArray(currentData) ? currentData.length : 0;
      const newCount = Array.isArray(localNewData) ? localNewData.length : 0;

      // Block if replacing real users with defaultUsers (6 hardcoded)
      if (oldCount > 6 && newCount <= 6) {
        console.error(
          `[PROTECCIÓN USUARIOS] ❌ ESCRITURA BLOQUEADA: Se intentó reducir de ` +
          `${oldCount} a ${newCount} usuarios. Posible sobrescritura con defaultUsers.`
        );
        return false;
      }

      // Block if more than 30% of users are lost in a single operation
      if (oldCount > 3 && newCount < oldCount * 0.7) {
        console.error(
          `[PROTECCIÓN USUARIOS] ❌ ESCRITURA BLOQUEADA: Reducción sospechosa ` +
          `(${oldCount} → ${newCount}, pérdida >${Math.round((1 - newCount/oldCount) * 100)}%). ` +
          `Operación cancelada.`
        );
        return false;
      }

      // Extra safety: verify against Firestore before writing
      // If Firestore has significantly more users, abort to prevent overwrite
      try {
        const verifyRef = doc(db, collectionName, documentId);
        const verifySnap = await getDoc(verifyRef);
        if (verifySnap.exists()) {
          const firestoreUsers = verifySnap.data().data;
          if (Array.isArray(firestoreUsers) && firestoreUsers.length > newCount + 1) {
            console.error(
              `[PROTECCIÓN USUARIOS] ❌ ESCRITURA BLOQUEADA: Firestore tiene ${firestoreUsers.length} ` +
              `usuarios pero se intentó escribir solo ${newCount}. Sincronizando datos reales.`
            );
            // Re-sync local state with Firestore truth
            setData(firestoreUsers);
            dataRef.current = firestoreUsers;
            return false;
          }
        }
      } catch (verifyErr) {
        console.warn('[PROTECCIÓN USUARIOS] No se pudo verificar Firestore pre-escritura:', verifyErr);
        // If we can't verify and the count drop is suspicious, block anyway
        if (oldCount > 6 && newCount < oldCount) {
          console.error('[PROTECCIÓN USUARIOS] ❌ Sin verificación posible + reducción detectada. Bloqueando.');
          return false;
        }
      }
    }

    // Immediately update local state + ref for a fast UI response
    setData(localNewData);
    dataRef.current = localNewData;

    const docRef = doc(db, collectionName, documentId);

    // ═══════════════════════════════════════════════════════════════════════
    // PROTECCIÓN CAPA 2 — Auto-backup antes de cada escritura
    // ═══════════════════════════════════════════════════════════════════════

    // Auto-backup para bedsData — fire-and-forget, no bloquea la escritura principal
    if (documentId === 'bedsData' && currentData) {
      const backupRef = doc(db, collectionName, `${documentId}_lastBackup`);
      setDoc(backupRef, {
        data: currentData,
        backedUpAt: new Date().toISOString(),
        occupiedBeds: countOccupiedBeds(currentData),
        reason: 'auto_backup_before_write'
      }).catch(backupErr => {
        console.warn('[Backup] No se pudo guardar respaldo automático:', backupErr);
      });
    }

    // Auto-backup para users — guarda el estado previo antes de cada modificación
    if (documentId === 'users' && currentData && Array.isArray(currentData) && currentData.length > 6) {
      const backupRef = doc(db, collectionName, `${documentId}_lastBackup`);
      setDoc(backupRef, {
        data: currentData,
        backedUpAt: new Date().toISOString(),
        userCount: currentData.length,
        reason: 'auto_backup_before_write'
      }).catch(backupErr => {
        console.warn('[Backup Users] No se pudo guardar respaldo automático:', backupErr);
      });
    }

    // Escritura directa con setDoc — más rápido que runTransaction (evita round-trip de lectura).
    // Los checks de integridad arriba ya validan con datos locales frescos del onSnapshot.
    try {
      await setDoc(docRef, { data: localNewData });
      return true;
    } catch (writeError) {
      console.error(`[useFirebaseSync] Error al sincronizar ${documentId}:`, writeError);
      // Revert local state on critical failure
      setData(currentData);
      dataRef.current = currentData;
      return false;
    }
  }, [collectionName, documentId]);


  return [data, updateData, loading];
}
