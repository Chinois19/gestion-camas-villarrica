/**
 * Script de restauración de usuarios desde firestore_dump.json
 * 
 * USO: node restore_users.js
 * 
 * Este script lee los usuarios del dump del 18/06/2026 y los restaura
 * en el documento appState/users de Firestore.
 * 
 * IMPORTANTE: Ejecutar solo UNA VEZ para restaurar los usuarios perdidos.
 * Antes de ejecutar, verifica el estado actual de usuarios en la consola de Firebase.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

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

async function restoreUsers() {
  try {
    // 1. Leer el dump
    console.log('📂 Leyendo firestore_dump.json...');
    const dump = JSON.parse(readFileSync('./firestore_dump.json', 'utf8'));
    const backupUsers = dump.users;
    
    if (!backupUsers || !Array.isArray(backupUsers)) {
      console.error('❌ No se encontraron usuarios en el dump.');
      process.exit(1);
    }
    
    console.log(`✅ Encontrados ${backupUsers.length} usuarios en el backup del 18/06/2026:`);
    backupUsers.forEach(u => {
      console.log(`   - [${u.id}] ${u.name} (${u.username}) — ${u.role}`);
    });

    // 2. Leer estado actual de Firestore
    console.log('\n🔍 Consultando estado actual en Firestore...');
    const docRef = doc(db, 'appState', 'users');
    const docSnap = await getDoc(docRef);
    
    let currentUsers = [];
    if (docSnap.exists()) {
      currentUsers = docSnap.data().data || [];
      console.log(`📊 Firestore tiene actualmente ${currentUsers.length} usuarios.`);
    } else {
      console.log('⚠️ El documento appState/users NO existe en Firestore.');
    }

    // 3. Merge: mantener usuarios actuales + agregar los que faltan del backup
    const currentUsernames = new Set(currentUsers.map(u => u.username));
    const missingUsers = backupUsers.filter(u => !currentUsernames.has(u.username));
    
    if (missingUsers.length === 0) {
      console.log('\n✅ Todos los usuarios del backup ya están en Firestore. No hay nada que restaurar.');
      process.exit(0);
    }

    console.log(`\n🔄 Se restaurarán ${missingUsers.length} usuarios faltantes:`);
    missingUsers.forEach(u => {
      console.log(`   + [${u.id}] ${u.name} (${u.username}) — ${u.role}`);
    });

    const mergedUsers = [...currentUsers, ...missingUsers];
    console.log(`\n📝 Total después del merge: ${mergedUsers.length} usuarios`);

    // 4. Crear backup antes de escribir
    console.log('\n💾 Creando backup en appState/users_lastBackup...');
    const backupRef = doc(db, 'appState', 'users_lastBackup');
    await setDoc(backupRef, {
      data: currentUsers,
      backedUpAt: new Date().toISOString(),
      userCount: currentUsers.length,
      reason: 'manual_backup_before_restore'
    });
    console.log('✅ Backup creado.');

    // 5. Escribir usuarios restaurados
    console.log('\n✍️ Escribiendo usuarios restaurados en Firestore...');
    await setDoc(docRef, { data: mergedUsers });
    console.log(`✅ ¡Restauración exitosa! ${mergedUsers.length} usuarios en Firestore.`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
    process.exit(1);
  }
}

restoreUsers();
