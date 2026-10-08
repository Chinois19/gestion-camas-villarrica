import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfigDev = {
  apiKey: "AIzaSyDoYbGq5_sWpLqLC3smvJyofAzVON2L23M",
  authDomain: "desarrollo-df407.firebaseapp.com",
  projectId: "desarrollo-df407",
  storageBucket: "desarrollo-df407.firebasestorage.app",
  messagingSenderId: "787990754227",
  appId: "1:787990754227:web:21d68d328220fffd3c11c6"
};

const firebaseConfigProd = {
  apiKey: "AIzaSyBIdM0cYhzO03k4nGjJH3W906R2xeRBpso",
  authDomain: "gestion-camas-villarrica.firebaseapp.com",
  projectId: "gestion-camas-villarrica",
  storageBucket: "gestion-camas-villarrica.firebasestorage.app",
  messagingSenderId: "224302432807",
  appId: "1:224302432807:web:ef62069f0b1e4b64298402"
};

async function sanitizeEspecialidadTratante(db, envName) {
  console.log(`\nSaneando especialidadTratante en ${envName.toUpperCase()}...`);
  const bedsColRef = collection(db, 'beds');
  const snap = await getDocs(bedsColRef);
  let fixedCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.especialidadTratante && !Array.isArray(data.especialidadTratante)) {
      const arr = [String(data.especialidadTratante).trim()];
      await updateDoc(docSnap.ref, {
        especialidadTratante: arr,
        _updatedAt: new Date().toISOString()
      });
      console.log(`  -> Cama ${docSnap.id}: "${data.especialidadTratante}" convertido a array [${arr.join(', ')}]`);
      fixedCount++;
    }
  }

  // También sanear en appState/bedsData
  const legacyRef = doc(db, 'appState', 'bedsData');
  const legacySnap = await getDoc(legacyRef);
  if (legacySnap.exists()) {
    const tree = legacySnap.data().data || {};
    let treeFixed = 0;
    for (const f in tree) {
      if (typeof tree[f] !== 'object' || Array.isArray(tree[f])) continue;
      for (const s in tree[f]) {
        if (!Array.isArray(tree[f][s])) continue;
        for (const r of tree[f][s]) {
          for (const b of (r.beds || [])) {
            if (b.especialidadTratante && !Array.isArray(b.especialidadTratante)) {
              b.especialidadTratante = [String(b.especialidadTratante).trim()];
              treeFixed++;
            }
          }
        }
      }
    }
    if (treeFixed > 0) {
      await setDoc(legacyRef, { data: tree, updatedAt: new Date().toISOString() });
      console.log(`  -> appState/bedsData saneado: ${treeFixed} camas corregidas`);
    }
  }

  console.log(`✅ ${envName.toUpperCase()}: ${fixedCount} camas convertidas a array.`);
}

async function main() {
  // 1. Desarrollo
  const devApp = initializeApp(firebaseConfigDev, 'devSanitize');
  const devDb = getFirestore(devApp);
  await sanitizeEspecialidadTratante(devDb, 'desarrollo');

  // 2. Producción
  const prodApp = initializeApp(firebaseConfigProd, 'prodSanitize');
  const prodDb = getFirestore(prodApp);
  const prodAuth = getAuth(prodApp);
  console.log('\nAutenticando en producción...');
  await signInWithEmailAndPassword(prodAuth, 'admin@hospitalvillarrica.cl', 'admin0');
  console.log('✅ Autenticado en producción.');
  await sanitizeEspecialidadTratante(prodDb, 'produccion');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
