/**
 * audit_full_history.js
 * Análisis completo de la trazabilidad disponible en el dump de Firestore.
 * Ejecutar: node audit_full_history.js
 */
import fs from 'fs';

const dump = JSON.parse(fs.readFileSync('firestore_dump.json', 'utf-8'));

const results = {
  occupiedBeds: [],
  cleaningBeds: [],
  availableWithHistory: [],
  blockedBeds: [],
  pendingHodom: [],
  legacyPreviousPatient: [],   // tienen previousPatient (legacy 1 nivel)
  legacyNestedPrevious: [],    // tienen previousPatient.previousPatient (2 niveles)
  legacyTripleNested: [],      // 3+ niveles de anidación
  withDischargeHistory: [],    // tienen dischargeHistory[] (nuevo)
  lostRecords: [],             // previousPatient: null y sin dischargeHistory (alta perdida)
};

const floors = Object.keys(dump.bedsData || {});

floors.forEach(floor => {
  if (!dump.bedsData[floor] || typeof dump.bedsData[floor] !== 'object') return;
  const sectors = Object.keys(dump.bedsData[floor]);
  sectors.forEach(sector => {
    const rooms = dump.bedsData[floor][sector] || [];
    rooms.forEach(room => {
      (room.beds || []).forEach(bed => {
        const base = { floor, sector, room: room.roomId, bed: bed.id, status: bed.status };

        if (bed.status === 'occupied') results.occupiedBeds.push({ ...base, patient: bed.patient });
        else if (bed.status === 'cleaning') results.cleaningBeds.push({ ...base });
        else if (bed.status === 'available') results.availableWithHistory.push({ ...base });
        else if (bed.status === 'blocked') results.blockedBeds.push({ ...base });
        else if (bed.status === 'pending_hodom') results.pendingHodom.push({ ...base, patient: bed.patient });

        // Detectar dischargeHistory (nuevo formato)
        if (Array.isArray(bed.dischargeHistory) && bed.dischargeHistory.length > 0) {
          results.withDischargeHistory.push({
            ...base,
            count: bed.dischargeHistory.length,
            records: bed.dischargeHistory.map(r => ({
              patient: r.patient || r.patientName,
              destino: r.destino,
              assignedAt: r.assignedAt,
              cleaningAt: r.cleaningAt,
              reverted: r._reverted || false
            }))
          });
        }

        // Detectar previousPatient legacy (1 nivel)
        if (bed.previousPatient) {
          const pp = bed.previousPatient;
          const entry = {
            ...base,
            legacyPatient: pp.patient || pp.patientName,
            destino: pp.destino,
            assignedAt: pp.assignedAt,
            cleaningAt: pp.cleaningAt,
          };
          results.legacyPreviousPatient.push(entry);

          // Detectar 2do nivel
          if (pp.previousPatient) {
            const pp2 = pp.previousPatient;
            results.legacyNestedPrevious.push({
              ...base,
              level2Patient: pp2.patient || pp2.patientName,
              level2Destino: pp2.destino,
              level2AssignedAt: pp2.assignedAt,
              level2CleaningAt: pp2.cleaningAt,

              // 3er nivel
              hasLevel3: !!(pp2.previousPatient)
            });

            if (pp2.previousPatient) {
              results.legacyTripleNested.push({
                ...base,
                level3Patient: pp2.previousPatient.patient || pp2.previousPatient.patientName
              });
            }
          }
        }
      });
    });
  });
});

// Calcular altas perdidas: camas sin previousPatient y sin dischargeHistory
// (solo las que claramente tuvieron actividad y ahora no tienen nada)
const allBeds = [];
floors.forEach(floor => {
  if (!dump.bedsData[floor] || typeof dump.bedsData[floor] !== 'object') return;
  Object.keys(dump.bedsData[floor]).forEach(sector => {
    (dump.bedsData[floor][sector] || []).forEach(room => {
      (room.beds || []).forEach(bed => {
        allBeds.push({ floor, sector, room: room.roomId, bed: bed.id, bedObj: bed });
      });
    });
  });
});

// Summary
console.log("\n========================================");
console.log("  AUDITORÍA DE TRAZABILIDAD - FIRESTORE ");
console.log("========================================\n");

console.log(`📊 ESTADO ACTUAL DE CAMAS:`);
console.log(`  • Camas ocupadas (pacientes activos):   ${results.occupiedBeds.length}`);
console.log(`  • Camas en aseo:                        ${results.cleaningBeds.length}`);
console.log(`  • Camas disponibles:                    ${results.availableWithHistory.length}`);
console.log(`  • Camas bloqueadas:                     ${results.blockedBeds.length}`);
console.log(`  • Pendientes HODOM:                     ${results.pendingHodom.length}`);
console.log(`  • TOTAL camas en sistema:               ${allBeds.length}`);

console.log(`\n📋 TRAZABILIDAD RECUPERABLE:`);
console.log(`  • Camas con dischargeHistory[] (nuevo): ${results.withDischargeHistory.length}`);
console.log(`  • Camas con previousPatient legacy:     ${results.legacyPreviousPatient.length}`);
console.log(`  • Camas con 2 niveles de historial:     ${results.legacyNestedPrevious.length}`);
console.log(`  • Camas con 3+ niveles de historial:    ${results.legacyTripleNested.length}`);

// Contar registros únicos de altas
let totalDischargeRecords = 0;
results.withDischargeHistory.forEach(b => totalDischargeRecords += b.count);
const legacyLevel1 = results.legacyPreviousPatient.length;
const legacyLevel2 = results.legacyNestedPrevious.length;
const legacyLevel3 = results.legacyTripleNested.length;

console.log(`\n🏥 EPISODIOS DE HOSPITALIZACIÓN RECUPERABLES:`);
console.log(`  • Registros en dischargeHistory[]:      ${totalDischargeRecords}`);
console.log(`  • Registros legacy nivel 1 (recientes): ${legacyLevel1}`);
console.log(`  • Registros legacy nivel 2 (anteriores):${legacyLevel2}`);
console.log(`  • Registros legacy nivel 3 (antiguos):  ${legacyLevel3}`);
console.log(`  • ESTIMADO TOTAL EPISODIOS:             ${totalDischargeRecords + legacyLevel1 + legacyLevel2 + legacyLevel3}`);
console.log(`  • Pacientes activos (no dados de alta): ${results.occupiedBeds.length}`);

console.log(`\n📝 LISTA DE ESPERA:`);
console.log(`  • Pacientes en espera activos:          ${(dump.waitingList || []).length}`);
console.log(`  • Altas desde lista de espera:          ${(dump.waitingListDischarges || []).length || 'N/A'}`);

console.log(`\n🏠 HODOM:`);
console.log(`  • Solicitudes HODOM activas:            ${(dump.hodomRequests || []).length}`);
console.log(`  • Pendientes HODOM en camas:            ${results.pendingHodom.length}`);

// Mostrar ejemplos de registros con más trazabilidad
console.log(`\n🔍 CAMAS CON MÁS HISTORIAL (muestras):`);
results.legacyNestedPrevious.slice(0, 5).forEach(b => {
  console.log(`  Piso ${b.floor} | Sect ${b.sector} | Hab ${b.room} | Cama ${b.bed}`);
  console.log(`    └── Alta anterior: ${b.level2Patient} → ${b.level2Destino}`);
});

// Exportar datos para siguiente script
const auditReport = {
  summary: {
    totalBeds: allBeds.length,
    occupied: results.occupiedBeds.length,
    cleaning: results.cleaningBeds.length,
    available: results.availableWithHistory.length,
    blocked: results.blockedBeds.length,
    pendingHodom: results.pendingHodom.length,
    dischargeHistoryRecords: totalDischargeRecords,
    legacyLevel1: legacyLevel1,
    legacyLevel2: legacyLevel2,
    legacyLevel3: legacyLevel3,
    estimatedTotalEpisodes: totalDischargeRecords + legacyLevel1 + legacyLevel2 + legacyLevel3,
    waitingList: (dump.waitingList || []).length,
    hodomRequests: (dump.hodomRequests || []).length,
  },
  withDischargeHistory: results.withDischargeHistory,
  legacyPreviousPatient: results.legacyPreviousPatient,
  legacyNestedPrevious: results.legacyNestedPrevious,
  legacyTripleNested: results.legacyTripleNested,
};

fs.writeFileSync('audit_report.json', JSON.stringify(auditReport, null, 2));
console.log(`\n✅ Reporte guardado en audit_report.json`);
process.exit(0);
