import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function useFirebaseSync(collectionName, documentId, initialData) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, collectionName, documentId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData(docSnap.data().data);
      } else {
        // Initialize the document with initialData if it doesn't exist
        setDoc(docRef, { data: initialData }).catch(err => console.error("Error initializing document:", err));
      }
      setLoading(false);
    }, (error) => {
      console.error(`Error listening to ${collectionName}/${documentId}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, documentId]); // Assuming initialData doesn't change reference unnecessarily

  const updateData = async (newDataOrUpdater) => {
    // This allows both `setBedsData(newData)` and `setBedsData(prev => newData)`
    const newData = typeof newDataOrUpdater === 'function' ? newDataOrUpdater(data) : newDataOrUpdater;
    
    // Optimistic update locally
    setData(newData);

    try {
      const docRef = doc(db, collectionName, documentId);
      await setDoc(docRef, { data: newData });
    } catch (error) {
      console.error(`Error updating ${collectionName}/${documentId}:`, error);
      // In a robust app, we might want to revert optimistic update here, 
      // but for simplicity and given the real-time nature, the snapshot will fix it if it fails.
    }
  };

  return [data, updateData, loading];
}
