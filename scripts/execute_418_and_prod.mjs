import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
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

async function executeOperations(db, envName) {
  console.log(`\n--- Aplicando cambios en: ${envName.toUpperCase()} ---`);

  // 1. CAMPOS MORA EDITH ESTHER -> ALTA (Cama 418-1)
  console.log('1. Alta EDITH ESTHER CAMPOS MORA (Cama 418-1)...');
  const dischargeCampos = {
    id: `dis_${Date.now()}_campos`,
    _dischargeId: Date.now(),
    _logId: `log-${Date.now()}-campos`,
    _loggedAt: new Date().toISOString(),
    _source: 'censo_reconciliation_alta',
    piso: 'piso4',
    sector: 'oriente',
    habitacion: '418',
    cama: '1',
    patient: 'EDITH ESTHER CAMPOS MORA',
    nombre: 'EDITH ESTHER CAMPOS MORA',
    rut: '7065046-0',
    run: '7065046-0',
    fechaNacimiento: '1951-07-15',
    age: 75,
    sex: 'F',
    prevision: 'FONASA - B',
    comuna: 'Villarrica',
    diagnosticos: 'Síntomas que involucran sistema cognitivo',
    diagnosis: ['Síntomas que involucran sistema cognitivo'],
    dxPrincipal: 'Síntomas que involucran sistema cognitivo',
    medicoAlta: 'SAMUEL DOMÍNGUEZ ARÁNGUIZ (18403578-2)',
    especialidadTratante: 'Medicina Interna',
    fechaIngreso: '2026-09-24T02:30:00.000Z',
    dischargeAt: '2026-09-25T15:00:00.000Z',
    fechaAlta: '25-09-2026, 03:00 p. m.',
    destino: 'Domicilio',
    condicionEgreso: 'Vivo',
    observaciones: 'Alta médica registrada en auditoría de egresos el 25-09-2026.',
    source: 'discharges'
  };
  await setDoc(doc(db, 'discharges', dischargeCampos.id), dischargeCampos);
  await updateDoc(doc(db, 'beds', 'piso4_oriente_418_1'), {
    status: 'available',
    patient: null,
    rut: null,
    age: null,
    diagnosis: [],
    assignedAt: null,
    admissionDate: null,
    cleaningAt: null,
    previousPatient: {
      patient: 'EDITH ESTHER CAMPOS MORA',
      rut: '7065046-0',
      dischargeAt: '2026-09-25T15:00:00.000Z',
      dischargeDocId: dischargeCampos.id
    },
    _updatedAt: new Date().toISOString()
  });
  console.log('   ✅ Cama 418-1 disponible');

  // 2. LIDIA NIEVE TRECANAO CHAVEZ -> ACOSTAR EN 418-2
  console.log('2. Acostar LIDIA NIEVE TRECANAO CHAVEZ (Cama 418-2)...');
  await updateDoc(doc(db, 'beds', 'piso4_oriente_418_2'), {
    status: 'occupied',
    patient: 'LIDIA NIEVE TRECANAO CHAVEZ',
    nombre: 'LIDIA NIEVE TRECANAO CHAVEZ',
    rut: '10252916-2',
    run: '10252916-2',
    age: 52,
    fechaNacimiento: '1974-06-10',
    sex: 'F',
    prevision: 'FONASA - B',
    comuna: 'Villarrica',
    assignedAt: '2026-09-24T03:10:00.000Z',
    admissionDate: '2026-09-24T03:10:00.000Z',
    diagnosis: ['J189 - Bronconeumonía'],
    dxPrincipal: 'J189 - Bronconeumonía',
    especialidadTratante: 'Medicina Interna',
    medicoSol: 'JOAQUIN IGNACIO YOUNG OLMEDO (19429768-8)',
    origen: 'Unidad de Emergencia',
    interconsultas: [],
    evolutions: [{
      texto: 'Ingreso registrado en Censo Hospitalario',
      fecha: '24-09-2026',
      rawDate: new Date('2026-09-24T03:10:00.000Z')
    }],
    novedades: [],
    _updatedAt: new Date().toISOString()
  });
  console.log('   ✅ Cama 418-2 ocupada');

  // 3. VICTORIA DEL CARMEN ABARZUA ULLOA -> ALTA DEIS N° 10827 (Cama 418-3)
  console.log('3. Alta VICTORIA DEL CARMEN ABARZUA ULLOA (Cama 418-3)...');
  const dischargeAbarzua = {
    id: `dis_${Date.now()}_abarzua`,
    _dischargeId: Date.now(),
    _logId: `log-${Date.now()}-abarzua`,
    _loggedAt: new Date().toISOString(),
    _source: 'deis_egreso_hospitalario_10827',
    numEgreso: 10827,
    numAdmision: 626188,
    numHistoriaClinica: 16022,
    cuentaCorriente: 131864358,
    piso: 'piso4',
    sector: 'oriente',
    habitacion: '418',
    cama: '3',
    patient: 'VICTORIA DEL CARMEN ABARZUA ULLOA',
    nombre: 'VICTORIA DEL CARMEN ABARZUA ULLOA',
    rut: '8922084-K',
    run: '8922084-K',
    fechaNacimiento: '1961-07-23',
    age: '65 años',
    sex: 'F',
    prevision: 'FONASA - B',
    comuna: 'Villarrica',
    procedencia: 'Unidad de Emergencia (mismo establecimiento)',
    diagnosticos: 'I671 - Accidente Cerebrovascular / TIA ABCD2 / Hipoplasia Arteria Vertebral Izquierda / Lupus Eritematoso Sistémico / Hipertensión Arterial / Hipotiroidismo / Fibrilación Auricular Anticoagulada',
    diagnosis: ['I671 - Accidente Cerebrovascular', 'Lupus Eritematoso Sistémico', 'Fibrilación Auricular'],
    dxPrincipal: 'I671 - Accidente Cerebrovascular',
    dxCie10: 'I671',
    medicoAlta: 'MARIA TRINIDAD TRIAT CATALAN (19961702-8)',
    especialidadTratante: 'Neurología Adulto',
    fechaIngreso: '2026-09-09T06:20:00.000Z',
    dischargeAt: '2026-09-25T12:00:00.000Z',
    fechaAlta: '25-09-2026, 12:00 p. m.',
    destino: 'Domicilio',
    condicionEgreso: 'Vivo',
    diasEstada: 16,
    observaciones: 'Egreso formal DEIS N° 10827 adjuntado por jefatura clínica.',
    source: 'discharges'
  };
  await setDoc(doc(db, 'discharges', dischargeAbarzua.id), dischargeAbarzua);
  await updateDoc(doc(db, 'beds', 'piso4_oriente_418_3'), {
    status: 'available',
    patient: null,
    rut: null,
    age: null,
    diagnosis: [],
    assignedAt: null,
    admissionDate: null,
    cleaningAt: null,
    previousPatient: {
      patient: 'VICTORIA DEL CARMEN ABARZUA ULLOA',
      rut: '8922084-K',
      dischargeAt: '2026-09-25T12:00:00.000Z',
      dischargeDocId: dischargeAbarzua.id
    },
    _updatedAt: new Date().toISOString()
  });
  console.log('   ✅ Cama 418-3 disponible');

  // 4. MARIA TERESA OLAVARRIA PAVEZ -> ALTA (Cama 418-4)
  console.log('4. Alta MARIA TERESA OLAVARRIA PAVEZ (Cama 418-4)...');
  const dischargeOlavarria = {
    id: `dis_${Date.now()}_olavarria`,
    _dischargeId: Date.now(),
    _logId: `log-${Date.now()}-olavarria`,
    _loggedAt: new Date().toISOString(),
    _source: 'censo_reconciliation_alta',
    piso: 'piso4',
    sector: 'oriente',
    habitacion: '418',
    cama: '4',
    patient: 'MARIA TERESA OLAVARRIA PAVEZ',
    nombre: 'MARIA TERESA OLAVARRIA PAVEZ',
    rut: '10188073-7',
    run: '10188073-7',
    fechaNacimiento: '1965-03-27',
    age: 61,
    sex: 'F',
    prevision: 'FONASA - A',
    comuna: 'Villarrica',
    diagnosticos: 'Infección urinaria',
    diagnosis: ['Infección urinaria'],
    dxPrincipal: 'Infección urinaria',
    medicoAlta: 'SAMUEL DOMÍNGUEZ ARÁNGUIZ (18403578-2)',
    especialidadTratante: 'Medicina Interna',
    fechaIngreso: '2026-09-24T02:25:00.000Z',
    dischargeAt: '2026-09-25T09:00:00.000Z',
    fechaAlta: '25-09-2026, 09:00 a. m.',
    destino: 'Domicilio',
    condicionEgreso: 'Vivo',
    observaciones: 'Alta médica registrada en auditoría de egresos el 25-09-2026.',
    source: 'discharges'
  };
  await setDoc(doc(db, 'discharges', dischargeOlavarria.id), dischargeOlavarria);
  await updateDoc(doc(db, 'beds', 'piso4_oriente_418_4'), {
    status: 'available',
    patient: null,
    rut: null,
    age: null,
    diagnosis: [],
    assignedAt: null,
    admissionDate: null,
    cleaningAt: null,
    previousPatient: {
      patient: 'MARIA TERESA OLAVARRIA PAVEZ',
      rut: '10188073-7',
      dischargeAt: '2026-09-25T09:00:00.000Z',
      dischargeDocId: dischargeOlavarria.id
    },
    _updatedAt: new Date().toISOString()
  });
  console.log('   ✅ Cama 418-4 disponible');

  // Sincronizar respaldo pasivo en appState/bedsData
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
      console.log('   ✅ Respaldo pasivo bedsData sincronizado.');
    }
  } catch (err) {
    console.warn('   ⚠️ Error actualizando respaldo pasivo:', err.message);
  }
}

async function main() {
  console.log('=== 1. APLICANDO EN DESARROLLO (desarrollo-df407) ===');
  const devApp = initializeApp(firebaseConfigDev, 'devApp');
  const devDb = getFirestore(devApp);
  await executeOperations(devDb, 'desarrollo');

  console.log('\n=== 2. APLICANDO EN PRODUCCIÓN (gestion-camas-villarrica) ===');
  const prodApp = initializeApp(firebaseConfigProd, 'prodApp');
  const prodDb = getFirestore(prodApp);
  const prodAuth = getAuth(prodApp);

  console.log('Autenticando en producción como admin@hospitalvillarrica.cl...');
  const userCred = await signInWithEmailAndPassword(prodAuth, 'admin@hospitalvillarrica.cl', 'admin0');
  console.log(`✅ Autenticado como ${userCred.user.email} (UID: ${userCred.user.uid})`);

  // Aplicar cambios de la 418 en producción usando la instancia prodDb autenticada
  await executeOperations(prodDb, 'produccion');

  // Sincronizar también las 4 camas anteriores en producción
  console.log('\n--- Sincronizando camas previas en PRODUCCIÓN ---');
  // 403-1: Juan Martínez -> Alta
  await updateDoc(doc(prodDb, 'beds', 'piso4_poniente_403_1'), {
    status: 'available',
    patient: null,
    rut: null,
    diagnosis: [],
    assignedAt: null,
    _updatedAt: new Date().toISOString()
  });
  console.log('✅ Prod 403-1: Disponible');

  // 403-2: Daniel Duque traslado -> Disponible
  await updateDoc(doc(prodDb, 'beds', 'piso4_poniente_403_2'), {
    status: 'available',
    patient: null,
    rut: null,
    diagnosis: [],
    assignedAt: null,
    _updatedAt: new Date().toISOString()
  });
  console.log('✅ Prod 403-2: Disponible');

  // 404-2: Daniel Duque -> Ocupada
  await updateDoc(doc(prodDb, 'beds', 'piso4_poniente_404_2'), {
    status: 'occupied',
    patient: 'DANIEL BENJAMIN DUQUE FONTECILLA',
    rut: '20782410-0',
    assignedAt: '2026-09-23T01:18:00.000Z',
    admissionDate: '2026-09-23T01:18:00.000Z',
    diagnosis: ['F322 - Episodio depresivo grave sin síntomas psicóticos'],
    especialidadTratante: 'Psiquiatría Adulto',
    _updatedAt: new Date().toISOString()
  });
  console.log('✅ Prod 404-2: Ocupada por Daniel Duque');

  // 304-3: Federico López -> Alta
  await updateDoc(doc(prodDb, 'beds', 'piso3_poniente_304_3'), {
    status: 'available',
    patient: null,
    rut: null,
    diagnosis: [],
    assignedAt: null,
    _updatedAt: new Date().toISOString()
  });
  console.log('✅ Prod 304-3: Disponible');

  // 304-5: Keydan Silva -> Alta
  await updateDoc(doc(prodDb, 'beds', 'piso3_poniente_304_5'), {
    status: 'available',
    patient: null,
    rut: null,
    diagnosis: [],
    assignedAt: null,
    _updatedAt: new Date().toISOString()
  });
  console.log('✅ Prod 304-5: Disponible');

  // 305-1: Pedro Monzo -> Alta
  await updateDoc(doc(prodDb, 'beds', 'piso3_poniente_305_1'), {
    status: 'available',
    patient: null,
    rut: null,
    diagnosis: [],
    assignedAt: null,
    _updatedAt: new Date().toISOString()
  });
  console.log('✅ Prod 305-1: Disponible');

  // Actualizar appState/bedsData en producción
  try {
    const bedsColRef = collection(prodDb, 'beds');
    const allBedsSnap = await getDocs(bedsColRef);
    const legacyDocRef = doc(prodDb, 'appState', 'bedsData');
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
      console.log('✅ Respaldo pasivo en producción sincronizado.');
    }
  } catch (err) {
    console.warn('⚠️ Error respaldo en prod:', err.message);
  }

  console.log('\n🎉 ¡SINCRONIZACIÓN EXITOSA TANTO EN DESARROLLO COMO EN PRODUCCIÓN!');
}

main().then(() => process.exit(0)).catch(e => { console.error('Error fatal:', e); process.exit(1); });
