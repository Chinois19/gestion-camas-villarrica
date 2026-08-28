import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Hook genérico para sincronizar estado con documentos de Cloud Firestore.
 * 
 * @param {string} collectionName - Nombre de la colección (ej. 'appState').
 * @param {string} documentId - ID del documento (ej. 'bedsData', 'users').
 * @param {any} initialData - Valor inicial por defecto en caso de no existir o antes de cargar.
 * @param {object} options - Opciones de configuración:
 *    - {boolean} realtime: Si es true (default), escucha cambios en tiempo real vía onSnapshot.
 *    - {boolean} enabled: Si es false, no inicia la sincronización (default true).
 *    - {function} validate: (newData, prevData) => boolean. Función opcional de validación previa a la escritura.
 */
export function useFirebaseSync(collectionName, documentId, initialData, options = {}) {
  const { realtime = true, enabled = true, validate } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(() => enabled);

  // Mantenemos una referencia al dato más reciente para updaters y sincronización
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (!initializedRef.current) {
      setLoading(true);
    }

    const docRef = doc(db, collectionName, documentId);

    if (realtime) {
      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const firestoreData = docSnap.data().data;
            setData(firestoreData);
            dataRef.current = firestoreData;
          } else {
            console.warn(
              `[useFirebaseSync] Documento "${collectionName}/${documentId}" no existe en Firestore. Usando estado inicial.`
            );
          }
          initializedRef.current = true;
          setLoading(false);
        },
        (error) => {
          console.error(`[useFirebaseSync] Error al escuchar ${collectionName}/${documentId}:`, error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      let active = true;
      getDoc(docRef)
        .then((docSnap) => {
          if (!active) return;
          if (docSnap.exists()) {
            const firestoreData = docSnap.data().data;
            setData(firestoreData);
            dataRef.current = firestoreData;
          } else {
            console.warn(
              `[useFirebaseSync] Documento "${collectionName}/${documentId}" no existe en Firestore.`
            );
          }
          initializedRef.current = true;
          setLoading(false);
        })
        .catch((error) => {
          if (!active) return;
          console.error(`[useFirebaseSync] Error al cargar ${collectionName}/${documentId}:`, error);
          setLoading(false);
        });

      return () => {
        active = false;
      };
    }
  }, [collectionName, documentId, realtime, enabled]);

  const updateData = useCallback(
    async (newDataOrUpdater) => {
      const currentData = dataRef.current;
      const localNewData =
        typeof newDataOrUpdater === 'function'
          ? newDataOrUpdater(currentData)
          : newDataOrUpdater;

      // Validación opcional si se proporcionó en las opciones
      if (typeof validate === 'function') {
        const isValid = validate(localNewData, currentData);
        if (!isValid) {
          console.warn(`[useFirebaseSync] Validación fallida para ${collectionName}/${documentId}. Operación cancelada.`);
          return false;
        }
      }

      // Actualización optimista del estado local
      setData(localNewData);
      dataRef.current = localNewData;

      const docRef = doc(db, collectionName, documentId);

      // Reintentos automáticos (máximo 3 intentos con backoff exponencial)
      let attempts = 0;
      let writeSuccess = false;

      while (attempts < 3 && !writeSuccess) {
        try {
          attempts++;
          await setDoc(docRef, { data: localNewData });
          writeSuccess = true;
        } catch (err) {
          console.warn(`[useFirebaseSync] Reintento ${attempts}/3 para "${documentId}":`, err);
          if (attempts >= 3) {
            console.error(`[useFirebaseSync] Falló escritura definitiva en ${documentId}:`, err);
            // Revertir estado local en caso de error crítico
            setData(currentData);
            dataRef.current = currentData;
            return false;
          }
          await new Promise((res) => setTimeout(res, 300 * attempts));
        }
      }

      return true;
    },
    [collectionName, documentId, validate]
  );

  return [data, updateData, loading];
}
