import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

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
        // Document doesn't exist yet — initialize it with the default data
        setDoc(docRef, { data: initialData }).catch(err =>
          console.error("Error initializing document:", err)
        );
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

    // Immediately update local state + ref for responsive UI
    setData(newData);
    dataRef.current = newData;

    try {
      const docRef = doc(db, collectionName, documentId);
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
