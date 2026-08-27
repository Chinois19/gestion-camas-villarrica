/**
 * extract_episodes.js
 * Extrae TODOS los episodios de hospitalización disponibles en Firebase
 * y los exporta a JSON + Excel.
 * Ejecutar: node extract_episodes.js
 */
import fs from 'fs';
import * as XLSX from 'xlsx';

// ── Cargar datos ──────────────────────────────────────────────────────────────
const allDocs = JSON.parse(fs.readFileSync('all_appstate_docs.json', 'utf-8'));
const bedsData   = allDocs.bedsData?.data || {};
const waitingListDischarges = allDocs.waitingListDischarges?.data || [];
const transferHistory       = allDocs.transferHistory?.data || [];
const hodomRequests         = allDocs.hodomRequests?.data || [];
const blockLog              = allDocs.blockLog?.data || [];

let episodeCounter = 1;

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return iso; }
};

const diffDays = (start, end) => {
  if (!start || !end) return '';
  try {
    const ms = new Date(end) - new Date(start);
    if (isNaN(ms) || ms < 0) return '';
    return Math.ceil(ms / 86400000);
  } catch { return ''; }
};

const joinArr = (val) => {
  if (!val) return '';
  if (Array.isArray(val)) return val.filter(Boolean).join(' | ');
  return String(val);
};

// ── Construir episodio normalizado desde un objeto "cama/paciente" ────────────
function buildEpisode(bedObj, meta, fuente) {
  const p = bedObj;
  const orig = p.originalWaitingRequest || {};

  // Fechas clave
  const fechaSolicitud = orig.requestedAt || '';
  const fechaAcueste   = p.assignedAt || '';
  const fechaAlta      = p.cleaningAt || p.dischargeAt || '';

  // Destino
  let destino = p.destino || '';
  if (destino === 'Otro establecimiento') {
    const hosp = p.establecimientoRed === 'Otro'
      ? (p.otroEstablecimientoDetalle || 'Otro')
      : (p.establecimientoRed || 'Otro establecimiento');
    destino = `Traslado: ${hosp}`;
  } else if (destino === 'Red Privada' && p.redPrivadaDetalle) {
    destino = `Privado: ${p.redPrivadaDetalle}`;
  }

  return {
    'N°':              episodeCounter++,
    'FUENTE':          fuente,
    'PISO':            meta.floor || '',
    'SECTOR':          meta.sector || '',
    'HABITACIÓN':      meta.room || '',
    'CAMA':            meta.bed || '',
    'TICKET':          orig.ticket || '',
    'FECHA SOLICITUD': fmtDate(fechaSolicitud),
    'FECHA ACUESTE':   fmtDate(fechaAcueste),
    'FECHA ALTA':      fmtDate(fechaAlta),
    'ESTADA (días)':   diffDays(fechaAcueste, fechaAlta),
    'ESPERA (min)':    p.waitMinutes ?? '',
    'DESTINO ALTA':    destino,
    'NOMBRE':          p.patient || p.patientName || p.nombre || '',
    'RUT':             p.rut || '',
    'EDAD':            p.age || p.edad || '',
    'SEXO':            p.sex || p.sexo || '',
    'PREVISIÓN':       p.prevision || '',
    'COMUNA':          p.comuna || '',
    'DIAGNÓSTICOS':    joinArr(p.diagnosis) || joinArr(orig.diagnosis) || '',
    'CIE-10':          orig.dxCie10 || '',
    'GRUPO DX':        orig.dxGrupo || '',
    'GRD ID':          p.grdId || '',
    'GRD NOMBRE':      p.grdName || '',
    'SEVERIDAD GRD':   p.severity || '',
    'DÍAS PROYECTADOS':p.projectedDays || '',
    'ESPECIALIDADES':  joinArr(p.especialidadTratante),
    'MÉDICO SOL.':     p.medicoSol || orig.medicoSol || '',
    'SERVICIO ORIGEN': p.servicioSol || orig.origin || orig.servicioSol || '',
    'TIPO CAMA':       p.tag || p.type || meta.bedType || '',
    'AISLAMIENTO':     joinArr(p.aislamiento),
    'OBSERVACIONES':   p.observaciones || '',
    'N° INTERCONSULTAS': Array.isArray(p.interconsultas) ? p.interconsultas.length : 0,
    'N° NOVEDADES':    Array.isArray(p.novedades) ? p.novedades.length : 0,
    'N° EVOLUCIONES':  Array.isArray(p.evolutions) ? p.evolutions.length : (Array.isArray(orig.evolutions) ? orig.evolutions.length : 0),
  };
}

// ── FUENTE 1: bedsData — recorrer todas las camas y extraer historial ──────────
const episodes = [];

const floors = Object.keys(bedsData);
floors.forEach(floor => {
  if (!bedsData[floor] || typeof bedsData[floor] !== 'object' || Array.isArray(bedsData[floor])) return;
  Object.keys(bedsData[floor]).forEach(sector => {
    if (!Array.isArray(bedsData[floor][sector])) return;
    bedsData[floor][sector].forEach(room => {
      (room.beds || []).forEach(bed => {
        const meta = { floor, sector, room: room.roomId, bed: bed.id, bedType: bed.tag || bed.type };

        // 1a. dischargeHistory[] (nuevo acumulativo, puede ser vacío)
        if (Array.isArray(bed.dischargeHistory) && bed.dischargeHistory.length > 0) {
          bed.dischargeHistory
            .filter(r => !r._reverted)
            .forEach(rec => {
              episodes.push(buildEpisode({ ...rec, interconsultas: rec.interconsultas || [], novedades: rec.novedades || [], evolutions: rec.evolutions || [] }, meta, 'Alta desde cama (dischargeHistory)'));
            });
        }

        // 1b. Extraer previousPatient de forma recursiva (legacy anidado)
        const extractLegacy = (obj, depth) => {
          if (!obj || depth > 5) return;
          // Solo agregar si tiene fecha de alta (cleaningAt) para evitar duplicados con dischargeHistory
          if (obj.cleaningAt || obj.dischargeAt) {
            // Evitar duplicar si ya está en dischargeHistory
            const alreadyIn = episodes.some(e =>
              e['NOMBRE'] === (obj.patient || obj.patientName) &&
              e['FECHA ALTA'] === fmtDate(obj.cleaningAt || obj.dischargeAt)
            );
            if (!alreadyIn) {
              episodes.push(buildEpisode(obj, meta, `Alta desde cama (legacy lvl${depth})`));
            }
          }
          if (obj.previousPatient) extractLegacy(obj.previousPatient, depth + 1);
        };

        if (bed.previousPatient) extractLegacy(bed.previousPatient, 1);

        // 1c. Paciente actualmente acostado (episodio abierto)
        if (bed.status === 'occupied' && bed.patient) {
          episodes.push(buildEpisode({
            ...bed,
            cleaningAt: null,
            dischargeAt: null,
            destino: null,
          }, meta, 'Episodio activo (hospitalizado)'));
        }

        // 1d. Cama en aseo (alta muy reciente, aún no limpia)
        if (bed.status === 'cleaning' && bed.previousPatient) {
          // Ya fue capturado por legacy, solo agregar si no tiene cleaningAt en previousPatient
        }
      });
    });
  });
});

console.log(`✅ Episodios desde bedsData: ${episodes.length}`);

// ── FUENTE 2: waitingListDischarges — 323 altas desde lista de espera ─────────
const wlEpisodes = [];
waitingListDischarges.forEach(p => {
  const meta = { floor: '—', sector: '—', room: 'Espera', bed: '—', bedType: '—' };
  let destino = p.destino || 'No definido';
  if (destino === 'Otro establecimiento') {
    const h = p.establecimientoRed === 'Otro' ? (p.otroEstablecimientoDetalle || 'Otro') : (p.establecimientoRed || '');
    destino = `Traslado: ${h}`;
  } else if (destino === 'Red Privada' && p.redPrivadaDetalle) {
    destino = `Privado: ${p.redPrivadaDetalle}`;
  }

  wlEpisodes.push({
    'N°':              episodeCounter++,
    'FUENTE':          'Alta previa a asignación de cama',
    'PISO':            '—',
    'SECTOR':          '—',
    'HABITACIÓN':      'Lista de Espera',
    'CAMA':            '—',
    'TICKET':          '',
    'FECHA SOLICITUD': fmtDate(p.requestedAt),
    'FECHA ACUESTE':   '—',
    'FECHA ALTA':      fmtDate(p.dischargeAt),
    'ESTADA (días)':   '—',
    'ESPERA (min)':    '',
    'DESTINO ALTA':    destino,
    'NOMBRE':          p.patient || p.patientName || p.nombre || '',
    'RUT':             p.rut || '',
    'EDAD':            p.age || p.edad || '',
    'SEXO':            p.sex || p.sexo || '',
    'PREVISIÓN':       p.prevision || '',
    'COMUNA':          p.comuna || '',
    'DIAGNÓSTICOS':    joinArr(p.diagnosis),
    'CIE-10':          '',
    'GRUPO DX':        '',
    'GRD ID':          '',
    'GRD NOMBRE':      '',
    'SEVERIDAD GRD':   '',
    'DÍAS PROYECTADOS':'',
    'ESPECIALIDADES':  '',
    'MÉDICO SOL.':     '',
    'SERVICIO ORIGEN': '',
    'TIPO CAMA':       '—',
    'AISLAMIENTO':     '',
    'OBSERVACIONES':   p.observaciones || '',
    'N° INTERCONSULTAS': 0,
    'N° NOVEDADES':    0,
    'N° EVOLUCIONES':  0,
  });
});

console.log(`✅ Episodios desde waitingListDischarges: ${wlEpisodes.length}`);

// ── FUENTE 3: Traslados — hoja separada ───────────────────────────────────────
const transferRows = transferHistory.map((t, i) => ({
  'N°':               i + 1,
  'FECHA TRASLADO':   fmtDate(t.fechaTraslado),
  'NOMBRE':           t.nombre || '',
  'RUT':              t.run || '',
  'EDAD':             t.edad || '',
  'COMUNA':           t.comuna || '',
  'PREVISIÓN':        t.prevision || '',
  'SERVICIO ORIGEN':  t.servicioOrigen || '',
  'SALA ORIGEN':      t.salaOrigen || '',
  'CAMA ORIGEN':      t.camaOrigen || '',
  'SERVICIO DESTINO': t.servicioDestino || '',
  'SALA DESTINO':     t.salaDestino || '',
  'CAMA DESTINO':     t.camaDestino || '',
  'DIAGNÓSTICOS':     joinArr(t.diagnosticos),
  'ESPECIALIDADES':   joinArr(t.especialidades),
  'ESTADA':           t.estada || '',
  'PRECAUCIONES':     t.precauciones || '',
}));

// ── FUENTE 4: HODOM ───────────────────────────────────────────────────────────
const hodomRows = hodomRequests.map((h, i) => ({
  'N°':               i + 1,
  'ID HODOM':         h.id || '',
  'ESTADO':           h.estado || '',
  'FECHA SOLICITUD':  fmtDate(h.solicitadaAt),
  'PACIENTE':         h.patientName || '',
  'RUT':              h.rut || '',
  'EDAD':             h.edad || '',
  'SEXO':             h.sexo || '',
  'PREVISIÓN':        h.prevision || '',
  'DIAGNÓSTICO':      joinArr(h.diagnostico),
  'HABITACIÓN':       h.roomId || '',
  'CAMA':             h.bedId || '',
  'DIRECCIÓN':        h.direccion || '',
  'PROFESIONAL':      h.profesionalRequiere || '',
  'OBSERVACIONES':    h.hodomObservaciones || '',
  'CUMPLIDOS':        h.cumplidos || '',
}));

// ── Combinar episodios y ordenar por fecha ────────────────────────────────────
const allEpisodes = [...episodes, ...wlEpisodes];
// Ordenar: episodios activos al final, el resto por fecha de alta desc
allEpisodes.sort((a, b) => {
  if (a['FUENTE'].includes('activo') && !b['FUENTE'].includes('activo')) return 1;
  if (!a['FUENTE'].includes('activo') && b['FUENTE'].includes('activo')) return -1;
  return 0;
});

console.log(`\n📊 RESUMEN FINAL:`);
console.log(`   Episodios de hospitalización total: ${allEpisodes.length}`);
console.log(`   Traslados históricos:               ${transferRows.length}`);
console.log(`   Solicitudes HODOM:                  ${hodomRows.length}`);

// ── Exportar JSON ─────────────────────────────────────────────────────────────
fs.writeFileSync('episodios_hospitalizacion.json', JSON.stringify(allEpisodes, null, 2));
console.log(`\n✅ JSON guardado: episodios_hospitalizacion.json`);

// ── Exportar Excel ────────────────────────────────────────────────────────────
const wb = XLSX.utils.book_new();

// Hoja 1: Episodios
const ws1 = XLSX.utils.json_to_sheet(allEpisodes);
const colWidths = [
  4, 32, 8, 10, 10, 6, 18, 18, 18, 18, 10, 10, 30,
  40, 14, 6, 10, 12, 14, 50, 10, 20, 8, 40, 8, 8,
  30, 30, 16, 20, 30, 6, 6, 6
];
ws1['!cols'] = colWidths.map(w => ({ wch: w }));
XLSX.utils.book_append_sheet(wb, ws1, 'Episodios');

// Hoja 2: Traslados
const ws2 = XLSX.utils.json_to_sheet(transferRows);
ws2['!cols'] = [4,18,40,14,6,14,12,20,10,8,20,10,8,50,30,10,20].map(w => ({ wch: w }));
XLSX.utils.book_append_sheet(wb, ws2, 'Traslados');

// Hoja 3: HODOM
const ws3 = XLSX.utils.json_to_sheet(hodomRows);
ws3['!cols'] = [4,20,14,18,30,14,6,10,12,40,10,6,40,30,30,8].map(w => ({ wch: w }));
XLSX.utils.book_append_sheet(wb, ws3, 'HODOM');

const filename = `Base_Trazabilidad_HospitalVillarrica_${new Date().toISOString().split('T')[0]}.xlsx`;
const xlsBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync(filename, xlsBuf);
console.log(`✅ Excel guardado: ${filename}`);
console.log(`\n🎉 Extracción completada. Total episodios: ${allEpisodes.length}`);
process.exit(0);
