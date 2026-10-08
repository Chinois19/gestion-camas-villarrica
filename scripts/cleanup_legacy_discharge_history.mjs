import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteField, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBIdM0cYhzO03k4nGjJH3W906R2xeRBpso",
  authDomain: "gestion-camas-villarrica.firebaseapp.com",
  projectId: "gestion-camas-villarrica",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  await signInWithEmailAndPassword(auth, 'admin@hospitalvillarrica.cl', 'admin0');

  // 1. Migrar Monserrat e Isaac para no perder ningún dato histórico
  const bedDoc1 = await getDoc(doc(db, 'beds', 'piso3_poniente_304_4'));
  const bedDoc2 = await getDoc(doc(db, 'beds', 'piso3_poniente_304_5'));

  const mRec = bedDoc1.data()?.dischargeHistory?.find(r => (r.rut || '').includes('60904717'));
  const iRec = bedDoc2.data()?.dischargeHistory?.find(r => (r.rut || '').includes('60904768'));

  if (mRec) {
    const mId = 'legacy_dh_' + (mRec._dischargeId || '60904717');
    await setDoc(doc(db, 'discharges', mId), {
      ...mRec,
      floor: 'piso3',
      sector: 'poniente',
      roomId: '304',
      bedId: 'piso3_poniente_304_4',
      dischargeAt: mRec.cleaningAt || mRec.dischargeAt,
      migratedFrom: 'legacy_bed_dischargeHistory'
    });
    console.log('Migrado con éxito a discharges/: Monserrat Saavedra');
  }

  if (iRec) {
    const iId = 'legacy_dh_' + (iRec._dischargeId || '60904768');
    await setDoc(doc(db, 'discharges', iId), {
      ...iRec,
      floor: 'piso3',
      sector: 'poniente',
      roomId: '304',
      bedId: 'piso3_poniente_304_5',
      dischargeAt: iRec.cleaningAt || iRec.dischargeAt,
      migratedFrom: 'legacy_bed_dischargeHistory'
    });
    console.log('Migrado con éxito a discharges/: Isaac Mancilla');
  }

  // 2. Limpiar dischargeHistory de todas las camas
  const bedsSnap = await getDocs(collection(db, 'beds'));
  let cleanedCount = 0;
  for (const bDoc of bedsSnap.docs) {
    const data = bDoc.data();
    if (data.dischargeHistory !== undefined) {
      await updateDoc(doc(db, 'beds', bDoc.id), {
        dischargeHistory: deleteField()
      });
      cleanedCount++;
    }
  }
  console.log(`Eliminado dischargeHistory de ${cleanedCount} camas en Firestore.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error durante la limpieza:', err);
  process.exit(1);
});
