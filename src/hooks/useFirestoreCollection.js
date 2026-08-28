import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy as firestoreOrderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Hook para sincronizar y gestionar colecciones en Cloud Firestore.
 * 
 * @param {string} collectionName - Nombre de la colección (ej. 'discharges', 'transfers', 'blockLogs', 'hodomRequests')
 * @param {object} options - Opciones de configuración:
 *    - {boolean} realtime: Si es true (default), escucha cambios en tiempo real vía onSnapshot.
 *    - {boolean} enabled: Si es false, no inicia la sincronización (default true).
 *    - {string} orderByField: Campo por el cual ordenar los documentos.
 *    - {string} orderDirection: 'asc' | 'desc' (default 'desc').
 *    - {any[]} initialData: Arreglo inicial por defecto.
 */
export function useFirestoreCollection(collectionName, options = {}) {
  const {
    realtime = true,
    enabled = true,
    orderByField = null,
    orderDirection = 'desc',
    initialData = []
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(() => enabled);
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

    const colRef = collection(db, collectionName);
    let q = colRef;
    if (orderByField) {
      q = query(colRef, firestoreOrderBy(orderByField, orderDirection));
    }

    if (realtime) {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = [];
          snapshot.forEach((d) => {
            docs.push({ id: d.id, ...d.data() });
          });
          setData(docs);
          dataRef.current = docs;
          initializedRef.current = true;
          setLoading(false);
        },
        (error) => {
          console.error(`[useFirestoreCollection] Error al escuchar ${collectionName}:`, error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } else {
      let active = true;
      getDocs(q)
        .then((snapshot) => {
          if (!active) return;
          const docs = [];
          snapshot.forEach((d) => {
            docs.push({ id: d.id, ...d.data() });
          });
          setData(docs);
          dataRef.current = docs;
          initializedRef.current = true;
          setLoading(false);
        })
        .catch((error) => {
          if (!active) return;
          console.error(`[useFirestoreCollection] Error al cargar ${collectionName}:`, error);
          setLoading(false);
        });

      return () => {
        active = false;
      };
    }
  }, [collectionName, realtime, enabled, orderByField, orderDirection]);

  /**
   * Agrega o reemplaza un documento con un ID específico o generado automáticamente.
   */
  const addItem = useCallback(
    async (item) => {
      try {
        const itemId = String(item.id || item._logId || (Date.now().toString() + '_' + Math.random().toString(36).substr(2, 6)));
        const itemWithId = { ...item, id: itemId };
        const docRef = doc(db, collectionName, itemId);
        await setDoc(docRef, itemWithId);
        return itemWithId;
      } catch (error) {
        console.error(`[useFirestoreCollection] Error al agregar documento en ${collectionName}:`, error);
        throw error;
      }
    },
    [collectionName]
  );

  /**
   * Actualiza parcialmente un documento existente por su ID.
   */
  const updateItem = useCallback(
    async (id, updates) => {
      try {
        const docRef = doc(db, collectionName, String(id));
        await updateDoc(docRef, updates);
        return true;
      } catch (error) {
        console.error(`[useFirestoreCollection] Error al actualizar documento ${id} en ${collectionName}:`, error);
        throw error;
      }
    },
    [collectionName]
  );

  /**
   * Elimina un documento por su ID.
   */
  const removeItem = useCallback(
    async (id) => {
      try {
        const docRef = doc(db, collectionName, String(id));
        await deleteDoc(docRef);
        return true;
      } catch (error) {
        console.error(`[useFirestoreCollection] Error al eliminar documento ${id} en ${collectionName}:`, error);
        throw error;
      }
    },
    [collectionName]
  );

  /**
   * Agrega múltiples documentos en lotes (batch) para alta eficiencia.
   */
  const bulkAdd = useCallback(
    async (items) => {
      if (!Array.isArray(items) || items.length === 0) return 0;
      try {
        const BATCH_SIZE = 450;
        let count = 0;
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          const chunk = items.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach((item) => {
            const itemId = String(item.id || item._logId || (Date.now() + '_' + Math.random().toString(36).substr(2, 6)));
            const docRef = doc(db, collectionName, itemId);
            batch.set(docRef, { ...item, id: itemId });
            count++;
          });
          await batch.commit();
        }
        return count;
      } catch (error) {
        console.error(`[useFirestoreCollection] Error en inserción masiva en ${collectionName}:`, error);
        throw error;
      }
    },
    [collectionName]
  );

  return {
    data,
    setData,
    loading,
    addItem,
    updateItem,
    removeItem,
    bulkAdd
  };
}
