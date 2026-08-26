/**
 * fetch_all_docs.js
 * Descarga TODOS los documentos de la colección appState (incluyendo backups).
 * Ejecutar: node fetch_all_docs.js
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyBIdM0cYhzO03k4nGjJH3W906R2xeRBpso",
  authDomain: "gestion-camas-villarrica.firebaseapp.com",
  projectId: "gestion-camas-villarrica",
  storageBucket: "gestion-camas-villarrica.firebasestorage.app",
  messagingSenderId: "224302432807",
  appId: "1:224302432807:web:ef62069f0b1e4b64298402"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fetchAll() {
  const colRef = collection(db, 'appState');
  const snap = await getDocs(colRef);
  
  const allDocs = {};
  console.log(`\nDocumentos encontrados en appState: ${snap.size}\n`);
  
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`📄 Documento: "${doc.id}"`);
    console.log(`   Keys: ${Object.keys(data).join(', ')}`);
    
    if (data.backedUpAt) console.log(`   Backup creado: ${data.backedUpAt}`);
    if (data.occupiedBeds !== undefined) console.log(`   Camas ocupadas en backup: ${data.occupiedBeds}`);
    if (data.data && data.data.piso3) {
      let count = 0;
      Object.keys(data.data).forEach(floor => {
        if (typeof data.data[floor] === 'object' && !Array.isArray(data.data[floor])) {
          Object.keys(data.data[floor]).forEach(sector => {
            (data.data[floor][sector] || []).forEach(room => {
              count += (room.beds || []).length;
            });
          });
        }
      });
      console.log(`   Total camas en este doc: ${count}`);
    }
    if (Array.isArray(data.data)) {
      console.log(`   Registros en array: ${data.data.length}`);
    }
    
    allDocs[doc.id] = data;
    console.log('');
  });
  
  fs.writeFileSync('all_appstate_docs.json', JSON.stringify(allDocs, null, 2));
  console.log(`\n✅ Todos los documentos guardados en all_appstate_docs.json`);
  process.exit(0);
}

fetchAll().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
