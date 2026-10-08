import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfigDev = {
  apiKey: "AIzaSyDoYbGq5_sWpLqLC3smvJyofAzVON2L23M",
  authDomain: "desarrollo-df407.firebaseapp.com",
  projectId: "desarrollo-df407",
  storageBucket: "desarrollo-df407.firebasestorage.app",
  messagingSenderId: "787990754227",
  appId: "1:787990754227:web:21d68d328220fffd3c11c6"
};

const app = initializeApp(firebaseConfigDev);
const db = getFirestore(app);

function cleanRut(rut) {
  if (!rut) return '';
  return String(rut).replace(/[^0-9kK]/g, '').toUpperCase();
}

async function auditCensoVsApp() {
  console.log('1. Consultando Censo Hospitalario en tiempo real...');
  const censoUrl = 'https://controgestion.pythonanywhere.com/api/exportarDataRegistroCenso/';
  const basicAuth = 'Basic ' + Buffer.from('admin:Controldegestion2025').toString('base64');
  const censoRes = await fetch(censoUrl, { headers: { 'Authorization': basicAuth } });
  const censoAll = await censoRes.json();

  // Filtrar activos en censo (sin fecha de egreso)
  const censoActivos = censoAll.filter(d => !d.fecha_egreso || d.fecha_egreso.trim() === '');
  console.log(`   -> Total registros en Censo: ${censoAll.length} | Activos actuales: ${censoActivos.length}`);

  console.log('2. Leyendo camas en Gestión de Camas (desarrollo-df407)...');
  const bedsSnap = await getDocs(collection(db, 'beds'));
  const appBeds = [];
  bedsSnap.forEach(d => appBeds.push({ docId: d.id, ...d.data() }));
  console.log(`   -> Total camas en App: ${appBeds.length}`);

  // Indexar camas de la App por `sala_cama` y por RUT
  const appByBedKey = new Map(); // "403_1" -> bed
  const appByRut = new Map();    // cleanRut -> bed

  for (const b of appBeds) {
    const bedKey = `${b.roomId}_${b.bedNumber || b.id}`;
    appByBedKey.set(bedKey, b);
    if (b.status === 'occupied' && b.rut) {
      appByRut.set(cleanRut(b.rut), { ...b, bedKey });
    }
  }

  // Indexar Censo por `sala_cama` y por RUT
  const censoByBedKey = new Map();
  const censoByRut = new Map();

  for (const c of censoActivos) {
    const bedKey = `${c.habitacion}_${c.numero_cama}`;
    censoByBedKey.set(bedKey, c);
    if (c.rut_paciente) {
      censoByRut.set(cleanRut(c.rut_paciente), { ...c, bedKey });
    }
  }

  // Clasificación de hallazgos
  const exactMatches = [];
  const pendingDischarges = [];  // Cama ocupada en App, pero en Censo está egresado o cama libre
  const internalTransfers = [];  // Paciente está en Censo en Sala X Cama Y, pero en App está en Sala A Cama B
  const missingInApp = [];       // Paciente en Censo, pero en App la cama está vacía y el paciente no está en ninguna otra cama
  const occupiedMismatch = [];   // Dos pacientes distintos en la misma cama (uno en App, otro en Censo)

  // 1. Revisar camas ocupadas en la App
  for (const b of appBeds) {
    if (b.status !== 'occupied') continue;
    const bedKey = `${b.roomId}_${b.bedNumber || b.id}`;
    const appRutClean = cleanRut(b.rut);
    const censoPatientInThisBed = censoByBedKey.get(bedKey);

    if (censoPatientInThisBed) {
      const censoRutClean = cleanRut(censoPatientInThisBed.rut_paciente);
      if (censoRutClean === appRutClean) {
        exactMatches.push({
          bedKey,
          patient: b.patient,
          rut: b.rut,
          floor: b.floor,
          sector: b.sector
        });
      } else {
        // En esta cama hay alguien en App y alguien distinto en Censo
        // ¿Dónde está el paciente de la App en Censo?
        const appPatientInCenso = censoByRut.get(appRutClean);
        occupiedMismatch.push({
          bedKey,
          appPatient: { name: b.patient, rut: b.rut },
          censoPatient: { name: censoPatientInThisBed.nombre_completo, rut: censoPatientInThisBed.rut_paciente },
          appPatientLocationInCenso: appPatientInCenso ? appPatientInCenso.bedKey : 'NO_ACTIVO_EN_CENSO'
        });
      }
    } else {
      // La cama en Censo está libre / no activa
      // ¿El paciente de la App está en otra cama de Censo?
      const appPatientInCenso = censoByRut.get(appRutClean);
      if (appPatientInCenso) {
        internalTransfers.push({
          type: 'APP_HAS_OLD_BED',
          patient: b.patient,
          rut: b.rut,
          appBedKey: bedKey,
          censoBedKey: appPatientInCenso.bedKey
        });
      } else {
        pendingDischarges.push({
          bedKey,
          patient: b.patient,
          rut: b.rut,
          floor: b.floor,
          sector: b.sector,
          assignedAt: b.assignedAt
        });
      }
    }
  }

  // 2. Revisar pacientes activos en Censo que no coinciden
  for (const c of censoActivos) {
    const bedKey = `${c.habitacion}_${c.numero_cama}`;
    const censoRutClean = cleanRut(c.rut_paciente);
    const appBed = appByBedKey.get(bedKey);

    if (!appBed) {
      console.warn(`[AVISO] Cama en Censo ${bedKey} no existe en catálogo de la App`);
      continue;
    }

    if (appBed.status === 'available') {
      // En App está vacía, pero en Censo está este paciente
      // ¿Está este paciente en otra cama de la App?
      const patientInOtherAppBed = appByRut.get(censoRutClean);
      if (!patientInOtherAppBed) {
        missingInApp.push({
          bedKey,
          patient: c.nombre_completo,
          rut: c.rut_paciente,
          fechaIngreso: c.fecha_ingreso,
          sala: c.habitacion,
          cama: c.numero_cama
        });
      }
    }
  }

  console.log('\n=================================================================');
  console.log('                      RESULTADOS DE AUDITORÍA');
  console.log('=================================================================');
  console.log(`✅ Coincidencias Exactas (100% Cuadradas): ${exactMatches.length}`);
  console.log(`🔴 Altas Pendientes en App (Ocupadas en App, pero Egresadas en Censo): ${pendingDischarges.length}`);
  console.log(`🔄 Traslados Internos Pendientes (Paciente en cama distinta): ${internalTransfers.length}`);
  console.log(`⚠️ Pacientes en Censo con Cama Vacía en App (Pendientes de Asignar/Ingresar): ${missingInApp.length}`);
  console.log(`🔀 Conflictos de Ocupación (Dos pacientes diferentes): ${occupiedMismatch.length}`);

  console.log('\n--- 1. ALTAS PENDIENTES EN APP ---');
  pendingDischarges.forEach(p => console.log(`• Sala ${p.bedKey} | ${p.patient} (${p.rut})`));

  console.log('\n--- 2. TRASLADOS INTERNOS PENDIENTES ---');
  internalTransfers.forEach(t => console.log(`• ${t.patient} (${t.rut}): Está en App en Hab. ${t.appBedKey} -> Debe estar en Hab. ${t.censoBedKey}`));

  console.log('\n--- 3. CONFLICTOS DE OCUPACIÓN ---');
  occupiedMismatch.forEach(m => console.log(`• Sala ${m.bedKey}: App tiene a ${m.appPatient.name} (${m.appPatient.rut}) [En Censo: ${m.appPatientLocationInCenso}] vs Censo tiene a ${m.censoPatient.name} (${m.censoPatient.rut})`));

  console.log('\n--- 4. PACIENTES ACTIVOS EN CENSO CON CAMA DISPONIBLE EN APP ---');
  missingInApp.forEach(m => console.log(`• Sala ${m.bedKey} | ${m.patient} (${m.rut}) - Ingreso Censo: ${m.fechaIngreso}`));
}

auditCensoVsApp().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
