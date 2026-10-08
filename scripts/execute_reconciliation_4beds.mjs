import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDoYbGq5_sWpLqLC3smvJyofAzVON2L23M",
  authDomain: "desarrollo-df407.firebaseapp.com",
  projectId: "desarrollo-df407",
  storageBucket: "desarrollo-df407.firebasestorage.app",
  messagingSenderId: "787990754227",
  appId: "1:787990754227:web:21d68d328220fffd3c11c6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function executeReconciliation() {
  console.log('=== EJECUTANDO ACCIONES PARA LAS 4 CAMAS EN DESARROLLO (desarrollo-df407) ===\n');

  // 1. Hab. 403 - Cama 1: JUAN CARLOS MARTINEZ MANQUENAHUEL -> ALTA
  console.log('1. Procesando Hab. 403 - Cama 1 (Juan Martínez Manquenahuel)...');
  const bed403_1_Ref = doc(db, 'beds', 'piso4_poniente_403_1');
  const snap403_1 = await getDoc(bed403_1_Ref);
  const bed403_1_Data = snap403_1.exists() ? snap403_1.data() : {};

  const dischargeMartinez = {
    id: `dis_${Date.now()}_martinez`,
    _dischargeId: Date.now(),
    _logId: `log-${Date.now()}-martinez`,
    _loggedAt: new Date().toISOString(),
    _source: 'censo_reconciliation_alta',
    piso: 'piso4',
    sector: 'poniente',
    habitacion: '403',
    cama: '1',
    patient: 'JUAN CARLOS MARTINEZ MANQUENAHUEL',
    nombre: 'JUAN CARLOS MARTINEZ MANQUENAHUEL',
    rut: '12565821-0',
    run: '12565821-0',
    fechaNacimiento: '1974-05-21',
    age: 52,
    sex: 'M',
    prevision: 'FONASA - A (PRAIS)',
    comuna: 'Villarrica',
    diagnosticos: 'F251 - Alucinosis en estudio / Trastorno esquizoafectivo / Psicosis',
    diagnosis: ['F29 - Psicosis de origen no orgánico, no especificada', 'F251 - Trastorno esquizoafectivo'],
    dxPrincipal: 'F251 - Trastorno esquizoafectivo',
    medicoAlta: 'CAMILA IGNACIA VILLEGAS SILVA (19308241-6)',
    especialidadTratante: 'Psiquiatría Adulto',
    fechaIngreso: '2026-09-22T00:22:00.000Z',
    dischargeAt: '2026-09-24T13:40:00.000Z',
    fechaAlta: '24-09-2026, 01:40 p. m.',
    destino: 'Domicilio',
    condicionEgreso: 'Vivo',
    observaciones: 'Alta médica registrada en auditoría SS y censo hospitalario el 24-09-2026.',
    source: 'discharges'
  };

  const disMartinezRef = doc(db, 'discharges', dischargeMartinez.id);
  await setDoc(disMartinezRef, dischargeMartinez);
  console.log(`   ✅ Alta registrada en discharges/${dischargeMartinez.id}`);

  // Cama 403-1 pasa a disponible
  await updateDoc(bed403_1_Ref, {
    status: 'available',
    patient: null,
    rut: null,
    age: null,
    fechaNacimiento: null,
    sex: null,
    prevision: null,
    comuna: null,
    medicoSol: null,
    especialidadMedico: null,
    requisitosUGP: null,
    reqEnfermeria: null,
    procedimientosPendientes: null,
    aislamiento: null,
    servicioSol: null,
    destino: null,
    prioridad: null,
    diagnosis: [],
    dxPrincipal: null,
    dxCie10: null,
    dxGrupo: null,
    secondaryCodes: [],
    grdId: null,
    grdName: null,
    admissionDate: null,
    assignedAt: null,
    cleaningAt: null,
    novedades: [],
    evolutions: [],
    interconsultas: [],
    previousPatient: {
      patient: 'JUAN CARLOS MARTINEZ MANQUENAHUEL',
      rut: '12565821-0',
      dischargeAt: '2026-09-24T13:40:00.000Z',
      dischargeDocId: dischargeMartinez.id
    },
    _updatedAt: new Date().toISOString()
  });
  console.log('   ✅ Cama piso4_poniente_403_1 actualizada a AVAILABLE');


  // 2. Hab. 403 - Cama 2 -> TRASLADADO A Hab. 404 Cama 2 (DANIEL DUQUE FONTECILLA)
  console.log('\n2. Verificando traslado de Hab. 403 - Cama 2 a Hab. 404 - Cama 2 (Daniel Duque Fontecilla)...');
  const bed403_2_Ref = doc(db, 'beds', 'piso4_poniente_403_2');
  const bed404_2_Ref = doc(db, 'beds', 'piso4_poniente_404_2');

  // Asegurar que 403-2 esté disponible
  await updateDoc(bed403_2_Ref, {
    status: 'available',
    patient: null,
    rut: null,
    age: null,
    diagnosis: [],
    assignedAt: null,
    interconsultas: [],
    evolutions: [],
    novedades: [],
    _updatedAt: new Date().toISOString()
  });

  // Asegurar que 404-2 tenga a Daniel Duque Fontecilla con nombre en MAYÚSCULAS y datos enriquecidos
  await updateDoc(bed404_2_Ref, {
    status: 'occupied',
    patient: 'DANIEL BENJAMIN DUQUE FONTECILLA',
    rut: '20782410-0',
    age: 25,
    fechaNacimiento: '2001-06-28',
    sex: 'M',
    prevision: 'FONASA - B',
    comuna: 'Villarrica',
    assignedAt: '2026-09-23T01:18:00.000Z',
    admissionDate: '2026-09-23T01:18:00.000Z',
    diagnosis: ['F322 - Episodio depresivo grave sin síntomas psicóticos'],
    dxPrincipal: 'F322 - Episodio depresivo grave sin síntomas psicóticos',
    especialidadTratante: 'Psiquiatría Adulto',
    medicoSol: 'CAMILA IGNACIA VILLEGAS SILVA (19308241-6)',
    origenTraslado: 'Hab. 403 Cama 2',
    _updatedAt: new Date().toISOString()
  });
  console.log('   ✅ Cama 403-2 disponible y Cama 404-2 confirmada para DANIEL BENJAMIN DUQUE FONTECILLA');


  // 3. Hab. 304 - Cama 3: FEDERICO LOPEZ SALVADOR -> ALTA
  console.log('\n3. Procesando Hab. 304 - Cama 3 (Federico López Salvador)...');
  const bed304_3_Ref = doc(db, 'beds', 'piso3_poniente_304_3');

  const dischargeLopez = {
    id: `dis_${Date.now()}_lopez`,
    _dischargeId: Date.now(),
    _logId: `log-${Date.now()}-lopez`,
    _loggedAt: new Date().toISOString(),
    _source: 'censo_reconciliation_alta',
    piso: 'piso3',
    sector: 'poniente',
    habitacion: '304',
    cama: '3',
    patient: 'FEDERICO MATIAS LOPEZ SALVADOR',
    nombre: 'FEDERICO MATIAS LOPEZ SALVADOR',
    rut: '29444697-4',
    run: '29444697-4',
    fechaNacimiento: '2026-09-18',
    age: '6 días',
    sex: 'M',
    prevision: 'FONASA - B',
    comuna: 'Villarrica',
    diagnosticos: 'P599 - Ictericia neonatal, no especificada',
    diagnosis: ['P599 - Ictericia neonatal, no especificada'],
    dxPrincipal: 'P599 - Ictericia neonatal, no especificada',
    medicoAlta: 'PAOLA PAZ RONCAGLIOLO CORTÍNEZ (15371456-8)',
    especialidadTratante: 'Neonatología',
    fechaIngreso: '2026-09-23T06:00:00.000Z',
    dischargeAt: '2026-09-24T14:00:00.000Z',
    fechaAlta: '24-09-2026, 02:00 p. m.',
    destino: 'Domicilio',
    condicionEgreso: 'Vivo',
    observaciones: 'Alta médica registrada en Censo hospitalario el 24-09-2026.',
    source: 'discharges'
  };

  const disLopezRef = doc(db, 'discharges', dischargeLopez.id);
  await setDoc(disLopezRef, dischargeLopez);
  console.log(`   ✅ Alta registrada en discharges/${dischargeLopez.id}`);

  await updateDoc(bed304_3_Ref, {
    status: 'available',
    patient: null,
    rut: null,
    age: null,
    fechaNacimiento: null,
    sex: null,
    prevision: null,
    comuna: null,
    medicoSol: null,
    especialidadMedico: null,
    requisitosUGP: null,
    reqEnfermeria: null,
    procedimientosPendientes: null,
    aislamiento: null,
    servicioSol: null,
    destino: null,
    prioridad: null,
    diagnosis: [],
    dxPrincipal: null,
    dxCie10: null,
    dxGrupo: null,
    secondaryCodes: [],
    grdId: null,
    grdName: null,
    admissionDate: null,
    assignedAt: null,
    cleaningAt: null,
    novedades: [],
    evolutions: [],
    interconsultas: [],
    previousPatient: {
      patient: 'FEDERICO MATIAS LOPEZ SALVADOR',
      rut: '29444697-4',
      dischargeAt: '2026-09-24T14:00:00.000Z',
      dischargeDocId: dischargeLopez.id
    },
    _updatedAt: new Date().toISOString()
  });
  console.log('   ✅ Cama piso3_poniente_304_3 actualizada a AVAILABLE');


  // 4. Hab. 304 - Cama 5: KEYDAN SILVA MONSALVES -> ALTA
  console.log('\n4. Procesando Hab. 304 - Cama 5 (Keydan Silva Monsalves)...');
  const bed304_5_Ref = doc(db, 'beds', 'piso3_poniente_304_5');

  const dischargeSilva = {
    id: `dis_${Date.now()}_silva`,
    _dischargeId: Date.now(),
    _logId: `log-${Date.now()}-silva`,
    _loggedAt: new Date().toISOString(),
    _source: 'censo_reconciliation_alta',
    piso: 'piso3',
    sector: 'poniente',
    habitacion: '304',
    cama: '5',
    patient: 'KEYDAN ALESSANDRO SILVA MONSALVES',
    nombre: 'KEYDAN ALESSANDRO SILVA MONSALVES',
    rut: '29445174-9',
    run: '29445174-9',
    fechaNacimiento: '2026-09-19',
    age: '5 días',
    sex: 'M',
    prevision: 'FONASA - C',
    comuna: 'Villarrica',
    diagnosticos: 'R001 - Bradicardia, no especificada',
    diagnosis: ['R001 - Bradicardia, no especificada'],
    dxPrincipal: 'R001 - Bradicardia, no especificada',
    medicoAlta: 'CAROLINA ANDREA CIFUENTES PAZ (13688945-1)',
    especialidadTratante: 'Neonatología',
    fechaIngreso: '2026-09-21T20:50:00.000Z',
    dischargeAt: '2026-09-23T20:40:00.000Z',
    fechaAlta: '23-09-2026, 08:40 p. m.',
    destino: 'Domicilio',
    condicionEgreso: 'Vivo',
    observaciones: 'Egreso registrado en aplicativo de altas y censo hospitalario el 23-09-2026.',
    source: 'discharges'
  };

  const disSilvaRef = doc(db, 'discharges', dischargeSilva.id);
  await setDoc(disSilvaRef, dischargeSilva);
  console.log(`   ✅ Alta registrada en discharges/${dischargeSilva.id}`);

  await updateDoc(bed304_5_Ref, {
    status: 'available',
    patient: null,
    rut: null,
    age: null,
    fechaNacimiento: null,
    sex: null,
    prevision: null,
    comuna: null,
    medicoSol: null,
    especialidadMedico: null,
    requisitosUGP: null,
    reqEnfermeria: null,
    procedimientosPendientes: null,
    aislamiento: null,
    servicioSol: null,
    destino: null,
    prioridad: null,
    diagnosis: [],
    dxPrincipal: null,
    dxCie10: null,
    dxGrupo: null,
    secondaryCodes: [],
    grdId: null,
    grdName: null,
    admissionDate: null,
    assignedAt: null,
    cleaningAt: null,
    novedades: [],
    evolutions: [],
    interconsultas: [],
    previousPatient: {
      patient: 'KEYDAN ALESSANDRO SILVA MONSALVES',
      rut: '29445174-9',
      dischargeAt: '2026-09-23T20:40:00.000Z',
      dischargeDocId: dischargeSilva.id
    },
    _updatedAt: new Date().toISOString()
  });
  console.log('   ✅ Cama piso3_poniente_304_5 actualizada a AVAILABLE');

  // 5. Sincronizar respaldo pasivo en appState/bedsData
  console.log('\n5. Sincronizando respaldo en appState/bedsData...');
  try {
    const bedsColRef = collection(db, 'beds');
    const allBedsSnap = await getDocs(bedsColRef);
    const legacyDocRef = doc(db, 'appState', 'bedsData');
    const legacySnap = await getDoc(legacyDocRef);
    if (legacySnap.exists()) {
      const tree = JSON.parse(JSON.stringify(legacySnap.data().data || {}));
      
      allBedsSnap.forEach(d => {
        const b = d.data();
        if (tree[b.floor] && tree[b.floor][b.sector]) {
          const room = tree[b.floor][b.sector].find(r => String(r.roomId) === String(b.roomId));
          if (room && Array.isArray(room.beds)) {
            const bedIdx = room.beds.findIndex(bedItem => String(bedItem.id) === String(b.bedNumber || b.id));
            if (bedIdx >= 0) {
              room.beds[bedIdx] = { ...room.beds[bedIdx], ...b };
            }
          }
        }
      });

      await setDoc(legacyDocRef, { data: tree, updatedAt: new Date().toISOString() });
      console.log('   ✅ Respaldo pasivo appState/bedsData sincronizado.');
    }
  } catch (err) {
    console.warn('   ⚠️ Error actualizando respaldo pasivo:', err.message);
  }

  console.log('\n=== RECONCILIACIÓN COMPLETADA CON ÉXITO ===\n');
}

executeReconciliation().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
