import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
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
const auth = getAuth(app);

// Normalizar RUT para comparaciones exactas
function cleanRut(rut) {
  if (!rut) return '';
  return String(rut).replace(/[^0-9kK]/g, '').toUpperCase();
}

async function runComparison() {
  console.log('1. Autenticando con Firebase Auth...');
  await signInWithEmailAndPassword(auth, 'admin@hospitalvillarrica.cl', 'admin0');
  console.log('   -> Autenticado como admin.');

  console.log('2. Consultando Censo en vivo...');
  const censoUrl = 'https://controgestion.pythonanywhere.com/api/exportarDataRegistroCenso/';
  const basicAuth = 'Basic ' + Buffer.from('admin:Controldegestion2025').toString('base64');
  const censoRes = await fetch(censoUrl, { headers: { 'Authorization': basicAuth } });
  const censoData = await censoRes.json();

  // Filtrar activos en Censo (sin egreso)
  const censoActivos = censoData.filter(d => !d.fecha_egreso || d.fecha_egreso.trim() === '');
  console.log(`   -> Total pacientes activos en Censo: ${censoActivos.length}`);

  console.log('3. Leyendo camas en Gestión de Camas (Firestore producción)...');
  const bedsSnap = await getDocs(collection(db, 'beds'));
  const appBeds = [];
  bedsSnap.forEach(d => appBeds.push(d.data()));
  console.log(`   -> Total camas en Gestión de Camas: ${appBeds.length}`);

  // Mapear por RUT en la App
  const appByRut = new Map();
  const appByBedKey = new Map(); // key: "habitacion_cama" -> bed

  for (const b of appBeds) {
    const bedKey = `${b.roomId}_${b.bedNumber}`;
    appByBedKey.set(bedKey, b);
    if (b.status === 'occupied' && b.rut) {
      appByRut.set(cleanRut(b.rut), { ...b, bedKey });
    }
  }

  // Mapear Censo por bedKey
  const censoByBedKey = new Map();
  const censoByRut = new Map();

  for (const c of censoActivos) {
    const bedKey = `${c.habitacion}_${c.numero_cama}`;
    censoByBedKey.set(bedKey, c);
    if (c.rut_paciente) {
      censoByRut.set(cleanRut(c.rut_paciente), { ...c, bedKey });
    }
  }

  // Comparar discrepancias
  const discrepancies = [];
  const coincidences = [];

  // Analizar cada paciente activo del Censo
  for (const c of censoActivos) {
    const bedKey = `${c.habitacion}_${c.numero_cama}`;
    const appBed = appByBedKey.get(bedKey);
    const censoRutClean = cleanRut(c.rut_paciente);

    if (!appBed) {
      discrepancies.push({
        type: 'SALA_O_CAMA_NO_EXISTE_EN_APP',
        bedKey,
        censo: c,
        app: null
      });
      continue;
    }

    const appRutClean = cleanRut(appBed.rut);

    if (appBed.status === 'occupied' && appRutClean === censoRutClean) {
      coincidences.push({ bedKey, patient: c.nombre_completo, rut: c.rut_paciente });
    } else {
      // Discrepancia: la cama en Censo tiene a alguien distinto que la App
      const censoPatientInOtherAppBed = appByRut.get(censoRutClean);

      discrepancies.push({
        type: censoPatientInOtherAppBed ? 'TRASLADO_INTERNO' : (appBed.status === 'occupied' ? 'CAMBIO_DE_PACIENTE' : 'CAMA_VACIA_EN_APP'),
        bedKey,
        canonicalId: appBed.canonicalId,
        habitacion: c.habitacion,
        cama: c.numero_cama,
        piso: c.piso,
        servicio: c.servicio_ingreso,
        censo: {
          nombre: c.nombre_completo,
          rut: c.rut_paciente,
          fechaNacimiento: c.fecha_nacimiento,
          edad: c.edad_años,
          ingreso: c.fecha_ingreso,
          cuentaCorriente: c.cuenta_corriente,
          dx: `${c.hipostesis_ingreso} - ${c.hipostesis_diagnostico}`
        },
        appCurrentInThisBed: appBed.status === 'occupied' ? {
          canonicalId: appBed.canonicalId,
          nombre: appBed.patient,
          rut: appBed.rut,
          ingreso: appBed.assignedAt,
          diagnosis: appBed.diagnosis,
          interconsultas: appBed.interconsultas || []
        } : null,
        // Dónde está el paciente del Censo actualmente en la App (si ya estaba en otra cama)
        censoPatientLocationInApp: censoPatientInOtherAppBed ? {
          canonicalId: censoPatientInOtherAppBed.canonicalId,
          bedKey: censoPatientInOtherAppBed.bedKey,
          roomId: censoPatientInOtherAppBed.roomId,
          bedNumber: censoPatientInOtherAppBed.bedNumber,
          assignedAt: censoPatientInOtherAppBed.assignedAt,
          interconsultas: censoPatientInOtherAppBed.interconsultas || [],
          evolutions: censoPatientInOtherAppBed.evolutions || []
        } : null
      });
    }
  }

  console.log(`\n=== RESULTADOS DE CUADRATURA ===`);
  console.log(`✅ Coincidencias exactas (misma cama, mismo paciente): ${coincidences.length}`);
  console.log(`⚠️ Discrepancias encontradas: ${discrepancies.length}\n`);

  // Agrupar discrepancias por tipo
  const traslados = discrepancies.filter(d => d.type === 'TRASLADO_INTERNO');
  const cambios = discrepancies.filter(d => d.type === 'CAMBIO_DE_PACIENTE');
  const vacias = discrepancies.filter(d => d.type === 'CAMA_VACIA_EN_APP');

  console.log(`- Traslados Internos detectados (paciente ya existe en otra cama de la app): ${traslados.length}`);
  console.log(`- Cambios de paciente (en Censo está X y en App está Y): ${cambios.length}`);
  console.log(`- Camas vacías en App que en Censo tienen paciente: ${vacias.length}`);

  // Guardar archivo JSON completo de discrepancias
  fs.writeFileSync('scripts/discrepancies_audit.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    totalCensoActivos: censoActivos.length,
    totalCoincidencias: coincidences.length,
    totalDiscrepancias: discrepancies.length,
    discrepancies
  }, null, 2));

  console.log(`\n✅ Detalle completo guardado en scripts/discrepancies_audit.json`);
  process.exit(0);
}

runComparison().catch(e => {
  console.error(e);
  process.exit(1);
});
