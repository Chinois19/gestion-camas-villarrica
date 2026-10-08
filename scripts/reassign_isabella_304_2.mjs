import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteField } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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

async function reassignIsabella() {
  console.log('Autenticando...');
  await signInWithEmailAndPassword(auth, 'admin@hospitalvillarrica.cl', 'admin0');
  console.log('Autenticado como admin.');

  // 1. Cama 304_1: Limpiar completamente y dejar como disponible (sin dischargeHistory residual)
  const bed304_1_Ref = doc(db, 'beds', 'piso3_poniente_304_1');
  const cleanBed1 = {
    canonicalId: "piso3_poniente_304_1",
    id: "1",
    bedNumber: "1",
    roomId: "304",
    floor: "piso3",
    sector: "poniente",
    roomType: "Poniente",
    type: "Cuidados Medios",
    tag: "Pediatría",
    status: "available",
    patient: null,
    nombreSocial: null,
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
    severity: null,
    projectedDays: null,
    assignedAt: null,
    projectedReleaseDate: null,
    waitMinutes: null,
    info: null,
    especialidadTratante: [],
    originalWaitingRequest: null,
    interconsultas: [],
    novedades: [],
    evolutions: [],
    previousPatient: null,
    cleaningAt: null,
    _updatedAt: new Date().toISOString()
  };
  await setDoc(bed304_1_Ref, cleanBed1);
  console.log('✅ Cama 304-1 limpiada y disponible en Firestore.');

  // 2. Cama 304_2: Acostar a ISABELLA SANHUEZA IBAÑEZ con toda su información
  const bed304_2_Ref = doc(db, 'beds', 'piso3_poniente_304_2');
  const isabellaBed = {
    canonicalId: "piso3_poniente_304_2",
    id: "2",
    bedNumber: "2",
    roomId: "304",
    floor: "piso3",
    sector: "poniente",
    roomType: "Poniente",
    type: "Cuidados Medios",
    tag: "Pediatría",
    status: "occupied",
    patient: "ISABELLA SANHUEZA IBAÑEZ",
    nombreSocial: null,
    rut: "29442568-3",
    age: "12 días",
    fechaNacimiento: "2026-09-16",
    sex: "Femenino",
    prevision: "FONASA B",
    comuna: "Villarrica",
    medicoSol: null,
    especialidadMedico: "Neonatología",
    requisitosUGP: null,
    reqEnfermeria: null,
    procedimientosPendientes: null,
    aislamiento: ["Precaución estándar"],
    servicioSol: "Neonatología",
    destino: "Pediatría",
    prioridad: 2,
    diagnosis: [
      "P923 - HIPOALIMENTACION DEL RECIEN NACIDO",
      "P741 - Deshidratación del recién nacido"
    ],
    dxPrincipal: "P923 - HIPOALIMENTACION DEL RECIEN NACIDO",
    dxCie10: "P923",
    dxGrupo: "Afecciones perinatales",
    secondaryCodes: ["P741"],
    grdId: null,
    grdName: null,
    severity: 1,
    projectedDays: 3,
    assignedAt: "2026-09-26T20:25:00.000Z",
    fechaIngreso: "2026-09-26T20:25:00.000Z",
    admissionDate: "2026-09-26T20:25:00.000Z",
    transferAt: "2026-09-28T12:58:23.966Z",
    projectedReleaseDate: null,
    waitMinutes: null,
    info: "Ingreso desde SUA - Reubicada a Cama 304-2",
    especialidadTratante: ["Neonatología", "Pediatría"],
    originalWaitingRequest: null,
    interconsultas: [],
    novedades: [
      {
        id: 1790600303966,
        fecha: "28/09/2026 09:58",
        usuario: "Gestor de Camas",
        rol: "Gestor de Camas",
        contenido: "🔄 Traslado de cama: Reubicada desde Cama 304-1 hacia Cama 304-2"
      }
    ],
    evolutions: [
      {
        id: "1790600303966",
        timestamp: "28/09/2026, 09:58:23",
        user: "Gestor de Camas",
        role: "Gestor de Camas",
        note: "🔄 Traslado interno desde Sala 304 Cama 1 hacia Sala 304 Cama 2"
      },
      {
        id: "1790454300000",
        timestamp: "26/09/2026, 17:25:00",
        user: "Admisión SUA",
        role: "Admisión",
        note: "25/09 INGRESA DESDE SUA - Hipoalimentación del recién nacido"
      }
    ],
    previousPatient: null,
    cleaningAt: null,
    _updatedAt: new Date().toISOString()
  };

  await setDoc(bed304_2_Ref, isabellaBed);
  console.log('✅ Paciente ISABELLA SANHUEZA IBAÑEZ acostada con éxito en Sala 304 Cama 2.');
}

reassignIsabella().then(() => process.exit(0)).catch(e => { console.error('Error:', e); process.exit(1); });
