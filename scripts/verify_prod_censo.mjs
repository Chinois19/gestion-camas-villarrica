import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfigProd = {
  apiKey: "AIzaSyBIdM0cYhzO03k4nGjJH3W906R2xeRBpso",
  authDomain: "gestion-camas-villarrica.firebaseapp.com",
  projectId: "gestion-camas-villarrica",
  storageBucket: "gestion-camas-villarrica.firebasestorage.app",
  messagingSenderId: "224302432807",
  appId: "1:224302432807:web:ef62069f0b1e4b64298402"
};

const app = initializeApp(firebaseConfigProd);
const db = getFirestore(app);
const auth = getAuth(app);

function cleanRut(rut) {
  if (!rut) return '';
  return String(rut).replace(/[^0-9kK]/g, '').toUpperCase();
}

async function verifyProd() {
  console.log('1. Autenticando en PRODUCCIÓN...');
  await signInWithEmailAndPassword(auth, 'admin@hospitalvillarrica.cl', 'admin0');
  console.log('✅ Autenticado.');

  console.log('2. Consultando camas en PRODUCCIÓN...');
  const bedsSnap = await getDocs(collection(db, 'beds'));
  const appBeds = [];
  bedsSnap.forEach(d => appBeds.push(d.data()));

  const room418 = appBeds.filter(b => String(b.roomId) === '418');
  console.log('\n--- Estado de Habitación 418 en PRODUCCIÓN ---');
  room418.forEach(b => {
    console.log(`Cama ${b.bedNumber || b.id}: Status=${b.status} | Paciente=${b.patient || 'libre'} | RUT=${b.rut || '—'}`);
  });

  const room403 = appBeds.filter(b => String(b.roomId) === '403');
  console.log('\n--- Estado de Habitación 403 en PRODUCCIÓN ---');
  room403.forEach(b => {
    console.log(`Cama ${b.bedNumber || b.id}: Status=${b.status} | Paciente=${b.patient || 'libre'} | RUT=${b.rut || '—'}`);
  });

  const room404 = appBeds.filter(b => String(b.roomId) === '404');
  console.log('\n--- Estado de Habitación 404 en PRODUCCIÓN ---');
  room404.forEach(b => {
    console.log(`Cama ${b.bedNumber || b.id}: Status=${b.status} | Paciente=${b.patient || 'libre'} | RUT=${b.rut || '—'}`);
  });

  const room304 = appBeds.filter(b => String(b.roomId) === '304');
  console.log('\n--- Estado de Habitación 304 en PRODUCCIÓN ---');
  room304.forEach(b => {
    console.log(`Cama ${b.bedNumber || b.id}: Status=${b.status} | Paciente=${b.patient || 'libre'} | RUT=${b.rut || '—'}`);
  });

  const room305 = appBeds.filter(b => String(b.roomId) === '305');
  console.log('\n--- Estado de Habitación 305 en PRODUCCIÓN ---');
  room305.forEach(b => {
    console.log(`Cama ${b.bedNumber || b.id}: Status=${b.status} | Paciente=${b.patient || 'libre'} | RUT=${b.rut || '—'}`);
  });
}

verifyProd().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
