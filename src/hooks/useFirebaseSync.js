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

  // Indica si hay una escritura en vuelo. Bloquea a onSnapshot de pisar
  // el estado optimista y evita que el efecto de sanitización dispare
  // una escritura con datos obsoletos durante la operación.
  const isWritingRef = useRef(false);

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
          // Si hay una escritura activa, ignorar este evento de Firestore
          // para no pisar el estado optimista local con datos potencialmente
          // desactualizados (el eco de una escritura anterior o de otro cliente).
          if (isWritingRef.current) {
            initializedRef.current = true;
            setLoading(false);
            return;
          }
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
      // Señalizar escritura activa ANTES de cualquier operación asíncrona.
      // Esto evita que onSnapshot pise el estado optimista durante el vuelo.
      isWritingRef.current = true;

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
          isWritingRef.current = false;
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
            // ⚠️ NO revertir estado local: hacerlo dispararía el efecto de
            // sanitización en App.jsx que escribiría datos obsoletos en Firestore,
            // causando pérdida masiva de acuestes. Se deja el estado optimista
            // intacto; onSnapshot reconciliará con Firestore cuando vuelva
            // la conectividad.
            isWritingRef.current = false;
            return false;
          }
          await new Promise((res) => setTimeout(res, 300 * attempts));
        }
      }

      // Liberar el bloqueo solo después de confirmar la escritura.
      // El próximo evento de onSnapshot ya tendrá el estado correcto del servidor.
      isWritingRef.current = false;
      return true;
    },
    [collectionName, documentId, validate]
  );

  // isWritingRef se expone para que los efectos externos (ej. sanitizeBedsStructure
  // en App.jsx) puedan evitar escribir sobre Firestore mientras hay una
  // operación activa y prevenir así la sobreescritura de acuestes recientes.
  return [data, updateData, loading, isWritingRef];
}
