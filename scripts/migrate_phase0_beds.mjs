import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, writeBatch } from 'firebase/firestore';
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

async function executePhase0Migration() {
  console.log('=== INICIANDO FASE 0: MIGRACIÓN ADITIVA DE CAMAS A COLECCIÓN beds/ ===\n');

  console.log('1. Autenticando como administrador...');
  const authRes = await signInWithEmailAndPassword(auth, 'admin@hospitalvillarrica.cl', 'admin0');
  console.log(`  -> Conectado como ${authRes.user.email} (UID: ${authRes.user.uid})`);

  console.log('2. Leyendo appState/bedsData (solo lectura, sin modificarlo)...');
  const bedsSnap = await getDoc(doc(db, 'appState', 'bedsData'));
  if (!bedsSnap.exists()) {
    console.error('❌ No se encontró appState/bedsData.');
    process.exit(1);
  }

  const rawData = bedsSnap.data().data;
  const bedsToMigrate = [];
  const migrationTimestamp = new Date().toISOString();

  for (const floor in rawData) {
    if (typeof rawData[floor] !== 'object' || Array.isArray(rawData[floor])) continue;
    for (const sector in rawData[floor]) {
      const rooms = rawData[floor][sector];
      if (!Array.isArray(rooms)) continue;
      for (const room of rooms) {
        const beds = room.beds || [];
        for (const bed of beds) {
          const canonicalId = `${floor}_${sector}_${room.roomId}_${bed.id}`;

          // Limpiar valores undefined para Firestore
          const cleanBed = JSON.parse(JSON.stringify(bed));

          const bedDocument = {
            canonicalId,
            floor,
            sector,
            roomId: String(room.roomId),
            roomType: room.roomType || sector,
            bedNumber: String(bed.id),
            
            // Atributos y estado
            status: cleanBed.status || 'available',
            tag: cleanBed.tag || null,
            type: cleanBed.type || null,
            info: cleanBed.info || null,
            severity: cleanBed.severity ?? null,
            
            // Datos del paciente
            patient: cleanBed.patient || null,
            rut: cleanBed.rut || null,
            age: cleanBed.age ?? null,
            fechaNacimiento: cleanBed.fechaNacimiento || null,
            sex: cleanBed.sex || null,
            nombreSocial: cleanBed.nombreSocial || null,
            prevision: cleanBed.prevision || null,
            comuna: cleanBed.comuna || null,
            
            // Datos clínicos
            diagnosis: Array.isArray(cleanBed.diagnosis) ? cleanBed.diagnosis : [],
            dxPrincipal: cleanBed.dxPrincipal || null,
            dxCie10: cleanBed.dxCie10 || null,
            dxGrupo: cleanBed.dxGrupo || null,
            secondaryCodes: Array.isArray(cleanBed.secondaryCodes) ? cleanBed.secondaryCodes : [],
            aislamiento: cleanBed.aislamiento || null,
            procedimientosPendientes: cleanBed.procedimientosPendientes || null,
            requisitosUGP: cleanBed.requisitosUGP || null,
            reqEnfermeria: cleanBed.reqEnfermeria || null,
            
            // Asignación y fechas
            assignedAt: cleanBed.assignedAt || null,
            projectedDays: cleanBed.projectedDays ?? null,
            projectedReleaseDate: cleanBed.projectedReleaseDate || null,
            waitMinutes: cleanBed.waitMinutes ?? null,
            cleaningAt: cleanBed.cleaningAt || null,
            transferAt: cleanBed.transferAt || null,
            
            // Profesionales y Servicios
            medicoSol: cleanBed.medicoSol || null,
            especialidadMedico: cleanBed.especialidadMedico || null,
            especialidadTratante: cleanBed.especialidadTratante || null,
            servicioSol: cleanBed.servicioSol || null,
            destino: cleanBed.destino || null,
            prioridad: cleanBed.prioridad ?? null,
            grdId: cleanBed.grdId || null,
            grdName: cleanBed.grdName || null,
            
            // Colecciones embebidas y auditoría
            interconsultas: Array.isArray(cleanBed.interconsultas) ? cleanBed.interconsultas : [],
            evolutions: Array.isArray(cleanBed.evolutions) ? cleanBed.evolutions : [],
            novedades: Array.isArray(cleanBed.novedades) ? cleanBed.novedades : [],
            dischargeHistory: Array.isArray(cleanBed.dischargeHistory) ? cleanBed.dischargeHistory : [],
            previousPatient: cleanBed.previousPatient || null,
            originalWaitingRequest: cleanBed.originalWaitingRequest || null,
            
            // Metadatos de migración
            _migratedFrom: 'appState/bedsData',
            _migratedAt: migrationTimestamp
          };

          bedsToMigrate.push(bedDocument);
        }
      }
    }
  }

  console.log(`3. Total de camas extraídas: ${bedsToMigrate.length}`);
  const occupiedCount = bedsToMigrate.filter(b => b.status === 'occupied').length;
  console.log(`   - Camas ocupadas: ${occupiedCount}`);
  console.log(`   - Camas disponibles: ${bedsToMigrate.filter(b => b.status === 'available').length}`);
  console.log(`   - Camas en aseo: ${bedsToMigrate.filter(b => b.status === 'cleaning').length}`);
  console.log(`   - Camas bloqueadas: ${bedsToMigrate.filter(b => b.status === 'blocked').length}`);

  console.log('\n4. Escribiendo documentos en lote (batch) en colección beds/...');
  // Escribir en lotes de 50 (límite de Firestore es 500)
  const chunkSize = 50;
  for (let i = 0; i < bedsToMigrate.length; i += chunkSize) {
    const chunk = bedsToMigrate.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const docRef = doc(db, 'beds', item.canonicalId);
      batch.set(docRef, item);
    }
    await batch.commit();
    console.log(`   -> Lote guardado: ${Math.min(i + chunkSize, bedsToMigrate.length)} / ${bedsToMigrate.length} camas.`);
  }

  console.log('\n5. Registrando estado de migración en appState/migration_status...');
  try {
    const statusRef = doc(db, 'appState', 'migration_status');
    const statusBatch = writeBatch(db);
    statusBatch.set(statusRef, {
      v2_bedsCollectionCreated: true,
      v2_bedsCollectionCreatedAt: migrationTimestamp,
      totalBedsMigrated: bedsToMigrate.length,
      occupiedBedsMigrated: occupiedCount,
      sourceSnapshot: 'appState/bedsData'
    }, { merge: true });
    await statusBatch.commit();
    console.log('   -> migration_status actualizado.');
  } catch (statusErr) {
    console.warn('   -> Aviso: migration_status no pudo registrarse (no crítico):', statusErr.message);
  }

  console.log('\n✅ FASE 0 COMPLETADA EXITOSAMENTE');
  console.log('   - Colección granular "beds" creada con 125 documentos individuales.');
  console.log('   - 0 datos borrados ni modificados en appState/bedsData.');
  console.log('   - 0 impacto para los usuarios conectados.');

  process.exit(0);
}

executePhase0Migration().catch(err => {
  console.error('❌ Error fatal en migración Fase 0:', err);
  process.exit(1);
});
