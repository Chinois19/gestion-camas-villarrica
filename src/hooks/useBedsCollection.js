import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';

/**
 * Reconstruye el árbol jerárquico { [floor]: { [sector]: [ { roomId, roomType, beds: [...] } ] } }
 * a partir de la lista plana de documentos de la colección granular 'beds'.
 */
export function reconstructBedsTree(bedsArray, fallbackTemplate) {
  if (!Array.isArray(bedsArray) || bedsArray.length === 0) {
    return fallbackTemplate || {};
  }

  // Estructura agrupada: tree[floor][sector][roomId] = roomObj
  const tree = {};

  // Si tenemos plantilla base, inicializarla para conservar el orden exacto de pisos, sectores y salas
  if (fallbackTemplate && typeof fallbackTemplate === 'object') {
    for (const floor in fallbackTemplate) {
      if (!tree[floor]) tree[floor] = {};
      for (const sector in fallbackTemplate[floor]) {
        if (!tree[floor][sector]) tree[floor][sector] = [];
        const templateRooms = fallbackTemplate[floor][sector];
        if (Array.isArray(templateRooms)) {
          for (const room of templateRooms) {
            tree[floor][sector].push({
              roomId: String(room.roomId),
              roomType: room.roomType || sector,
              beds: []
            });
          }
        }
      }
    }
  }

  // Insertar cada cama en su sala correspondiente
  for (const bedDoc of bedsArray) {
    const floor = bedDoc.floor;
    const sector = bedDoc.sector;
    const roomId = String(bedDoc.roomId);

    if (!floor || !sector || !roomId) continue;

    if (!tree[floor]) tree[floor] = {};
    if (!tree[floor][sector]) tree[floor][sector] = [];

    let room = tree[floor][sector].find(r => String(r.roomId) === roomId);
    if (!room) {
      room = {
        roomId,
        roomType: bedDoc.roomType || sector,
        beds: []
      };
      tree[floor][sector].push(room);
    }

    // Normalizar objeto de cama compatible con todos los componentes existentes
    const cleanBed = {
      ...bedDoc,
      id: String(bedDoc.bedNumber || bedDoc.id || bedDoc.canonicalId.split('_').pop())
    };

    // Evitar duplicados en la misma sala
    const existingIndex = room.beds.findIndex(b => String(b.id) === String(cleanBed.id));
    if (existingIndex >= 0) {
      room.beds[existingIndex] = cleanBed;
    } else {
      room.beds.push(cleanBed);
    }
  }

  // Ordenar camas por id numérico dentro de cada sala
  for (const floor in tree) {
    for (const sector in tree[floor]) {
      if (Array.isArray(tree[floor][sector])) {
        for (const room of tree[floor][sector]) {
          if (Array.isArray(room.beds)) {
            room.beds.sort((a, b) => {
              const numA = parseInt(a.id, 10);
              const numB = parseInt(b.id, 10);
              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
              return String(a.id).localeCompare(String(b.id));
            });
          }
        }
      }
    }
  }

  return tree;
}

/**
 * Hook para sincronizar la colección granular 'beds/' de Cloud Firestore con la UI.
 * - Lee cada cama como documento independiente en tiempo real.
 * - Reconstruye en memoria el árbol idéntico que esperan Dashboard, Insights, Aseo, etc.
 * - Al guardar, ejecuta updateDoc quirúrgico ÚNICAMENTE sobre las camas modificadas.
 */
export function useBedsCollection(options = {}) {
  const { enabled = true, initialData = {} } = options;
  const [bedsData, setBedsDataState] = useState(initialData);
  const [loading, setLoading] = useState(() => enabled);
  const isWritingRef = useRef(false);
  const bedsDataRef = useRef(bedsData);

  useEffect(() => {
    bedsDataRef.current = bedsData;
  }, [bedsData]);

  // Mapa plano de camas en memoria para detección rápida de cambios: canonicalId -> bedDoc
  const bedsMapRef = useRef(new Map());

  // 1. Escuchar la colección 'beds' en tiempo real
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const bedsColRef = collection(db, 'beds');
    const unsubscribe = onSnapshot(
      bedsColRef,
      (snapshot) => {
        if (isWritingRef.current) {
          // Si hay una escritura optimista local en vuelo, esperar al siguiente ciclo
          return;
        }

        const bedsList = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const canonicalId = docSnap.id;
          bedsList.push({ ...data, canonicalId });
          bedsMapRef.current.set(canonicalId, data);
        });

        if (bedsList.length > 0) {
          const reconstructed = reconstructBedsTree(bedsList, initialData);
          setBedsDataState(reconstructed);
          bedsDataRef.current = reconstructed;
        } else if (initialData && Object.keys(initialData).length > 0) {
          setBedsDataState(initialData);
          bedsDataRef.current = initialData;
        }
        setLoading(false);
      },
      (error) => {
        console.error('[useBedsCollection] Error al escuchar colección beds:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [enabled, initialData]);

  /**
   * Actualización quirúrgica directa de una sola cama
   */
  const updateSingleBed = useCallback(async (canonicalId, updates) => {
    try {
      const docRef = doc(db, 'beds', canonicalId);
      await updateDoc(docRef, {
        ...updates,
        _updatedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.error(`[useBedsCollection] Error actualizando cama ${canonicalId}:`, err);
      throw err;
    }
  }, []);

  /**
   * Adaptador transparente para componentes legados que llaman a setBedsData(updaterOrNext)
   * Detecta qué camas cambiaron y actualiza SOLO esas en Firestore con updateDoc atómico.
   */
  const setBedsData = useCallback(async (newDataOrUpdater) => {
    isWritingRef.current = true;
    const currentTree = bedsDataRef.current;
    const nextTree = typeof newDataOrUpdater === 'function'
      ? newDataOrUpdater(currentTree)
      : newDataOrUpdater;

    if (!nextTree || typeof nextTree !== 'object') {
      isWritingRef.current = false;
      return false;
    }

    // Actualización optimista local inmediata
    setBedsDataState(nextTree);
    bedsDataRef.current = nextTree;

    // Detectar camas que sufrieron cambios
    const changedBeds = [];

    for (const floor in nextTree) {
      if (typeof nextTree[floor] !== 'object' || Array.isArray(nextTree[floor])) continue;
      for (const sector in nextTree[floor]) {
        const rooms = nextTree[floor][sector];
        if (!Array.isArray(rooms)) continue;
        for (const room of rooms) {
          const beds = room.beds || [];
          for (const bed of beds) {
            const canonicalId = bed.canonicalId || `${floor}_${sector}_${room.roomId}_${bed.id}`;
            const prevBed = bedsMapRef.current.get(canonicalId);

            // Comparar si cambió status, patient, rut, assignedAt, diagnosis, etc.
            const hasChanged = !prevBed ||
              prevBed.status !== bed.status ||
              prevBed.patient !== bed.patient ||
              prevBed.rut !== bed.rut ||
              prevBed.assignedAt !== bed.assignedAt ||
              prevBed.cleaningAt !== bed.cleaningAt ||
              JSON.stringify(prevBed.diagnosis) !== JSON.stringify(bed.diagnosis) ||
              JSON.stringify(prevBed.interconsultas) !== JSON.stringify(bed.interconsultas) ||
              JSON.stringify(prevBed.novedades) !== JSON.stringify(bed.novedades) ||
              JSON.stringify(prevBed.evolutions) !== JSON.stringify(bed.evolutions);

            if (hasChanged) {
              changedBeds.push({
                canonicalId,
                floor,
                sector,
                roomId: String(room.roomId),
                roomType: room.roomType || sector,
                bedNumber: String(bed.id),
                ...bed,
                _updatedAt: new Date().toISOString()
              });
            }
          }
        }
      }
    }

    try {
      // Escribir en paralelo únicamente las camas modificadas en 'beds/{canonicalId}'
      const writePromises = changedBeds.map(async (bedItem) => {
        const docRef = doc(db, 'beds', bedItem.canonicalId);
        // Limpiar undefined para Firestore
        const cleanPayload = JSON.parse(JSON.stringify(bedItem));
        await setDoc(docRef, cleanPayload, { merge: true });
        bedsMapRef.current.set(bedItem.canonicalId, cleanPayload);
      });

      await Promise.all(writePromises);

      // Mantener sincronizado appState/bedsData en segundo plano como respaldo pasivo
      try {
        const legacyRef = doc(db, 'appState', 'bedsData');
        await setDoc(legacyRef, { data: nextTree, updatedAt: new Date().toISOString() });
      } catch (legacyErr) {
        console.warn('[useBedsCollection] Aviso: no se pudo escribir respaldo pasivo en appState/bedsData:', legacyErr.message);
      }

      isWritingRef.current = false;
      return true;
    } catch (error) {
      console.error('[useBedsCollection] Error en actualización quirúrgica de camas:', error);
      isWritingRef.current = false;
      return false;
    }
  }, []);

  return [bedsData, setBedsData, loading, isWritingRef, updateSingleBed];
}
