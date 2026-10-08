import { useState, useMemo, useCallback } from 'react';
import { Database, Search, Download, Calendar, Filter, RefreshCw, FileSpreadsheet, AlertCircle, Clock, Bed, CheckCircle2, ArrowRightLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import './DatabasePanel.css';
import { formatAgeDetailed } from '../utils/age';
import ActualizacionPill from './ActualizacionPill';

// ── Constantes ─────────────────────────────────────────────────────────────
const DEFAULT_START_DATE = '2025-08-01';

const SERVICES = [
  'todos',
  'UCI', 'UTI', 'Cuidados Medios', 'Básico',
  'GINE/PUERPERIO', 'Neonatología', 'Infantil',
  'Medicina Interna', 'Cirugía'
];

const ESTADOS_APLICATIVO = [
  { id: 'todos', label: 'Todos los estados' },
  { id: 'Lista de espera de cama', label: 'Lista de espera de cama' },
  { id: 'Ingreso con acueste', label: 'Ingreso con acueste' },
  { id: 'Alta', label: 'Alta' }
];

// ── Helpers de Formato y Fechas ─────────────────────────────────────────────
const cleanRut = (r) => (r || '').replace(/[^0-9kK]/g, '').toLowerCase();

const formatDateToDDMMYYYY = (dateVal) => {
  if (!dateVal) return '—';
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch { }
  return '—';
};

const fmtDateTime = (val) => {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return String(val); }
};

const parseEntryDate = (entry) => {
  const idNum = Number(entry?.id);
  if (!isNaN(idNum) && idNum > 1000000000000) {
    return new Date(idNum);
  }
  const dateStr = entry?.fecha || entry?.timestamp || entry?.solicitadaAt || entry?.createdAt;
  if (dateStr) {
    const cleaned = String(dateStr).replace(/-/g, '/');
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
};

// Formato de tiempo transcurrido en hh:mm
const formatHHMM = (start, end) => {
  if (!start) return '—';
  try {
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return '—';
    const diffMs = e.getTime() - s.getTime();
    if (diffMs < 0) return '00:00';
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  } catch {
    return '—';
  }
};

// Días de estada desde acueste hasta alta o momento actual
const calculateDiasEstada = (acuesteAt, altaAt, isWaiting) => {
  if (isWaiting || !acuesteAt) return '—';
  try {
    const s = new Date(acuesteAt);
    if (isNaN(s.getTime())) return '—';
    const e = altaAt ? new Date(altaAt) : new Date();
    if (isNaN(e.getTime())) return '—';
    const diffMs = e.getTime() - s.getTime();
    if (diffMs < 0) return '0 días';
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `${days} ${days === 1 ? 'día' : 'días'}`;
  } catch {
    return '—';
  }
};

// Extraer hasta 2 especialidades tratantes
const getEspecialidadesTratanteHasta2 = (val1, val2) => {
  const list = [];
  const add = (v) => {
    if (!v) return;
    if (Array.isArray(v)) {
      v.forEach(item => add(item));
    } else if (typeof v === 'string') {
      v.split(/[,|/]/).forEach(item => {
        const trimmed = item.trim();
        if (trimmed && !list.includes(trimmed)) {
          list.push(trimmed);
        }
      });
    }
  };
  add(val1);
  add(val2);
  const top2 = list.slice(0, 2);
  return top2.length > 0 ? top2.join(', ') : 'No asignada';
};

// Extraer precauciones / aislamiento limpio
const getAislamientoLimpio = (p, orig) => {
  const val = p.aislamiento || orig?.aislamiento || p.precautions || p.precauciones;
  if (!val) return 'Ninguna';
  if (Array.isArray(val)) {
    const filtered = val.filter(a => a && a !== 'Sin Precauciones' && a !== 'Requiere Aislamiento');
    return filtered.length > 0 ? filtered.join(', ') : 'Ninguna';
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return (trimmed && trimmed !== 'Sin Precauciones' && trimmed !== 'Requiere Aislamiento') ? trimmed : 'Ninguna';
  }
  return 'Ninguna';
};

// Extraer diagnóstico CIE-10 (Código o Glosa)
const getDiagnosticoCIE10 = (p, orig) => {
  const dxs = [];
  const add = (v) => {
    if (!v) return;
    if (Array.isArray(v)) {
      v.forEach(item => add(item));
    } else if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed && !dxs.includes(trimmed)) dxs.push(trimmed);
    }
  };
  add(p.dxPrincipal);
  add(p.dxCie10);
  add(orig?.dxPrincipal);
  add(orig?.dxCie10);
  add(p.diagnosis);
  add(orig?.diagnosis);
  add(orig?.secondaryCodes);
  add(p.secondaryCodes);
  return dxs.length > 0 ? dxs.join(' | ') : 'No registrado';
};

// Extraer procedimientos y novedades clínicas unificadas
const getPatientUpdates = (p, orig, procedures = []) => {
  const updates = [];

  // 1. Evoluciones en el registro del paciente
  const evols = p.evolutions || orig?.evolutions;
  if (Array.isArray(evols)) {
    evols.forEach(ev => {
      if (ev.note) {
        updates.push({
          texto: `Evolución: ${ev.note}`,
          fecha: formatDateToDDMMYYYY(ev.timestamp || ev.date),
          rawDate: parseEntryDate(ev)
        });
      }
    });
  }

  // 2. Novedades en el registro del paciente
  const novs = p.novedades || orig?.novedades;
  if (Array.isArray(novs)) {
    novs.forEach(nov => {
      if (nov.contenido) {
        updates.push({
          texto: nov.contenido,
          fecha: formatDateToDDMMYYYY(nov.fecha || nov.createdAt),
          rawDate: parseEntryDate(nov)
        });
      }
    });
  }

  // 3. Procedimientos en colección independiente de Firestore
  if (Array.isArray(procedures) && procedures.length > 0) {
    const pRut = cleanRut(p.rut || p.run || orig?.rut || orig?.run || '');
    const pName = (p.patient || p.patientName || p.nombre || p.name || orig?.name || orig?.nombre || '').toLowerCase().trim();
    const admDate = p.assignedAt || p.admissionDate || p.fechaIngreso || null;
    const disDate = p.cleaningAt || p.dischargeAt || p.fechaAlta || null;

    const matched = procedures.filter(pr => {
      const prRut = cleanRut(pr.rut || pr.run || '');
      const prName = (pr.patientName || pr.nombre || '').toLowerCase().trim();

      const matchRut = Boolean(pRut && prRut && pRut === prRut);
      const matchName = Boolean(pName && prName && pName === prName);
      const matchBed = Boolean(p.bedId && pr.bedId && String(pr.bedId) === String(p.bedId));

      if (!matchRut && !matchName && !matchBed) return false;

      // Validar ventana temporal del acueste y estadía
      const procDate = new Date(pr.createdAt || pr.fecha);
      if (!isNaN(procDate.getTime())) {
        if (admDate && procDate < new Date(new Date(admDate).getTime() - 60000)) return false;
        if (disDate && procDate > new Date(new Date(disDate).getTime() + 60000)) return false;
      }
      return true;
    });

    matched.forEach(pr => {
      const txt = pr.contenido || pr.procedimiento;
      if (txt && !updates.some(u => u.texto === txt)) {
        updates.push({
          texto: txt,
          fecha: formatDateToDDMMYYYY(pr.fecha || pr.createdAt),
          rawDate: parseEntryDate(pr)
        });
      }
    });
  }

  // Ordenar descendente (más reciente primero)
  updates.sort((a, b) => b.rawDate - a.rawDate);

  if (updates.length === 0) {
    const fallbackDate = p.updatedAt || p.assignedAt || p.requestedAt || orig?.requestedAt;
    updates.push({
      texto: 'Ingreso registrado en el sistema',
      fecha: formatDateToDDMMYYYY(fallbackDate),
      rawDate: fallbackDate ? new Date(fallbackDate) : new Date()
    });
  }

  return updates;
};

// Extraer hasta 5 traslados de un paciente
const getPatientTransfers = (p, orig, transferHistory = []) => {
  const pRut = cleanRut(p.rut || p.run || orig?.rut || orig?.run || '');
  const pName = (p.patient || p.patientName || p.nombre || p.name || orig?.name || orig?.nombre || '').toLowerCase().trim();

  if (!pRut && !pName) return [];

  const matched = (Array.isArray(transferHistory) ? transferHistory : []).filter(t => {
    const tRut = cleanRut(t.run || t.rut || '');
    if (pRut && tRut && pRut === tRut) return true;
    const tName = (t.nombre || '').toLowerCase().trim();
    if (pName && tName && pName === tName) return true;
    return false;
  });

  // Ordenar cronológicamente (más antiguo al más reciente para secuencia 1 a 5)
  matched.sort((a, b) => new Date(a.fechaTraslado || a.timestamp || 0) - new Date(b.fechaTraslado || b.timestamp || 0));

  return matched.slice(0, 5);
};

// ── Componente Principal ───────────────────────────────────────────────────
export default function GeneralDatabasePanel({
  dischargesLog = [],
  transferHistory = [],
  bedsData = {},
  waitingList = [],
  procedures = []
}) {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState(today);
  const [serviceFilter, setServiceFilter] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [rows, setRows] = useState(null); // null = sin consultar aún
  const [loading, setLoading] = useState(false);

  // Consulta y generación de filas
  const handleQuery = useCallback(() => {
    if (!startDate || !endDate) {
      toast.error('Selecciona un rango de fechas válido.');
      return;
    }
    if (startDate > endDate) {
      toast.error('La fecha de inicio no puede ser mayor a la fecha de término.');
      return;
    }
    setLoading(true);

    setTimeout(() => {
      try {
        const [sy, sm, sd] = startDate.split('-').map(Number);
        const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
        const [ey, em, ed] = endDate.split('-').map(Number);
        const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);

        const allItems = [];

        // 1. LISTA DE ESPERA DE CAMA (Pacientes en espera actual)
        (Array.isArray(waitingList) ? waitingList : []).forEach((w) => {
          if (!w) return;
          allItems.push({
            raw: w,
            orig: w,
            estadoApp: 'Lista de espera de cama',
            isWaiting: true,
            isAdmitted: false,
            isDischarged: false,
            solicitudAt: w.requestedAt || w.solicitadaAt || w.createdAt || w.timestamp || null,
            acuesteAt: null,
            altaAt: null,
            sala: 'Lista de Espera',
            cama: 'Sin Cama Asignada'
          });
        });

        // 2. INGRESO CON ACUESTE (Pacientes actualmente hospitalizados en camas)
        const floors = Object.keys(bedsData || {}).filter(
          (key) => key !== 'waitingListDischarges' && typeof bedsData[key] === 'object' && !Array.isArray(bedsData[key])
        );

        floors.forEach((floor) => {
          Object.keys(bedsData[floor] || {}).forEach((sector) => {
            (bedsData[floor][sector] || []).forEach((room) => {
              (room.beds || []).forEach((bed) => {
                if (bed.status === 'occupied' && (bed.patient || bed.nombre)) {
                  const orig = bed.originalWaitingRequest || bed.rawBedData?.originalWaitingRequest || bed;
                  allItems.push({
                    raw: bed,
                    orig: orig,
                    estadoApp: 'Ingreso con acueste',
                    isWaiting: false,
                    isAdmitted: true,
                    isDischarged: false,
                    solicitudAt: orig.requestedAt || orig.solicitadaAt || bed.requestedAt || bed.assignedAt || null,
                    acuesteAt: bed.assignedAt || bed.admissionDate || bed.fechaIngreso || null,
                    altaAt: null,
                    sala: room.roomId || bed.roomId || '—',
                    cama: bed.id || '—'
                  });
                }

                // 2.1 Historial de altas legacy dentro de camas
                if (Array.isArray(bed.dischargeHistory)) {
                  bed.dischargeHistory
                    .filter((r) => !r._reverted && (r.patient || r.patientName || r.nombre))
                    .forEach((p) => {
                      const orig = p.originalWaitingRequest || p.rawBedData?.originalWaitingRequest || p;
                      allItems.push({
                        raw: p,
                        orig: orig,
                        estadoApp: 'Alta',
                        isWaiting: false,
                        isAdmitted: false,
                        isDischarged: true,
                        solicitudAt: orig.requestedAt || orig.solicitadaAt || p.requestedAt || p.admissionDate || null,
                        acuesteAt: p.assignedAt || p.admissionDate || p.fechaIngreso || null,
                        altaAt: p.cleaningAt || p.dischargeAt || p.fechaAlta || p.fecha || null,
                        sala: room.roomId || p.roomId || '—',
                        cama: bed.id || p.bedId || '—'
                      });
                    });
                }
              });
            });
          });
        });

        // 3. ALTAS DE FIRESTORE (Colección discharges)
        (Array.isArray(dischargesLog) ? dischargesLog : []).forEach((d) => {
          if (!d) return;
          const orig = d.originalWaitingRequest || d.rawBedData?.originalWaitingRequest || d;
          const isWaitingDischarge = Boolean(
            d._source === 'waitingList' ||
            d.isWaitingListDischarge ||
            (d.habitacion === 'Lista de Espera' && !d.assignedAt && !d.admissionDate)
          );

          allItems.push({
            raw: d,
            orig: orig,
            estadoApp: 'Alta',
            isWaiting: false,
            isAdmitted: false,
            isDischarged: true,
            isWaitingDischarge,
            solicitudAt: orig.requestedAt || orig.solicitadaAt || d.requestedAt || d.admissionDate || null,
            acuesteAt: isWaitingDischarge ? null : (d.assignedAt || d.admissionDate || d.fechaIngreso || orig.assignedAt || null),
            altaAt: d.cleaningAt || d.dischargeAt || d.fechaAlta || d.fecha || d._loggedAt || null,
            sala: isWaitingDischarge ? 'Lista de Espera (Sin Cama)' : (d.roomId || d.habitacion || d.sala || '—'),
            cama: isWaitingDischarge ? '—' : (d.bedId || d.cama || '—')
          });
        });

        // 4. Desduplicación inteligente entre colecciones (mismo ID o mismo evento clínico)
        const dedupedItems = [];
        const seenKeys = new Set();

        allItems.forEach((item) => {
          const rawId = item.raw?.id || item.raw?._id || item.raw?._dischargeId || item.raw?._logId;
          const rutKey = cleanRut(item.raw?.rut || item.raw?.run || item.orig?.rut || item.orig?.run || '');
          const nameKey = (item.raw?.patient || item.raw?.patientName || item.raw?.nombre || item.orig?.name || '').toLowerCase().trim();
          const altaKey = item.altaAt ? new Date(item.altaAt).toISOString().slice(0, 10) : '';
          const acuesteKey = item.acuesteAt ? new Date(item.acuesteAt).toISOString().slice(0, 10) : '';
          const statusKey = item.estadoApp;

          // Clave única compuesta para evitar duplicar el mismo evento clínico exacto
          const compositeKey = rawId
            ? `${statusKey}::id::${rawId}`
            : `${statusKey}::${rutKey || nameKey}::${acuesteKey || altaKey || item.solicitudAt}`;

          if (seenKeys.has(compositeKey)) return;
          seenKeys.add(compositeKey);
          dedupedItems.push(item);
        });

        // 5. Filtrar por rango de fechas
        const dateFiltered = dedupedItems.filter((item) => {
          const dates = [item.solicitudAt, item.acuesteAt, item.altaAt]
            .map((s) => (s ? new Date(s) : null))
            .filter((dt) => dt && !isNaN(dt.getTime()));

          if (dates.length > 0) {
            return dates.some((dt) => dt >= start && dt <= end);
          }
          // Si es paciente activo actual sin fecha parseable
          return true;
        });

        // 6. Construir filas estructuradas según especificación exacta
        const builtRows = dateFiltered.map((item) => {
          const p = item.raw;
          const orig = item.orig;
          const estadoApp = item.estadoApp;

          // Nombre Completo
          const nombreCompleto = p.patient || p.patientName || p.nombre || p.name || orig.name || orig.nombre || '—';

          // Rut
          const rut = p.rut || p.run || orig.rut || orig.run || '—';

          // Edad Calculada
          const edadCalculada = formatAgeDetailed(
            p.fechaNacimiento || orig.fechaNacimiento,
            p.age || p.edad || orig.age || orig.edad
          ) || '—';

          // Sexo
          const sexo = p.sex || p.sexo || orig.sex || orig.sexo || '—';

          // Previsión del Paciente
          const prevision = p.prevision || orig.prevision || '—';

          // Comuna de Residencia
          const comuna = p.comuna || orig.comuna || '—';

          // DIAGNÓSTICO CIE-10 (CÓDIGO O GLOSA)
          const diagnosticoCIE10 = getDiagnosticoCIE10(p, orig);

          // Servicio Solicitante
          const servicioSolicitante = orig.servicioSol || orig.origin || p.servicioSol || p.origin || p.servicioOrigen || '—';

          // Destino (Unidad Requerida)
          const destinoUnidadRequerida = orig.destino || orig.bedTypeRequired || p.destino || p.bedTypeRequired || p.servicio || '—';

          // Médico Solicitante / Tratante
          const medicoSolicitanteTratante = p.medicoTratante || orig.medicoTratante || p.medicoSol || orig.medicoSol || p.solicitadoPor || orig.solicitadoPor || '—';

          // Especialidad del Médico
          const especialidadDelMedico = orig.especialidadMedico || p.especialidadMedico || '—';

          // Especialidad Tratante (Hasta 2)
          const especialidadTratanteHasta2 = getEspecialidadesTratanteHasta2(
            p.especialidadTratante || p.specialties || p.specialty,
            orig.especialidadTratante
          );

          // Aislamiento / Precauciones
          const aislamientoPrecauciones = getAislamientoLimpio(p, orig);

          // Tiempo transcurrido en hh:mm desde solicitud hasta acueste (o hasta la fecha de descarga/informe si no está acostado)
          let tiempoSolicitudAcueste = '—';
          if (item.solicitudAt) {
            if (item.acuesteAt) {
              tiempoSolicitudAcueste = formatHHMM(item.solicitudAt, item.acuesteAt);
            } else {
              // En caso de no estar acostado: tiempo al momento de la descarga / informe
              tiempoSolicitudAcueste = formatHHMM(item.solicitudAt, item.altaAt || new Date());
            }
          }

          // Días de estada al momento del alta o al momento del informe respecto de su fecha y hora de acueste
          const diasDeEstada = calculateDiasEstada(item.acuesteAt, item.altaAt, item.isWaiting);

          // Procedimientos y Novedades (pill para vista web, casilla unificada desajustada con separador para excel)
          const updatesList = getPatientUpdates(p, orig, procedures);
          const procedimientosNovedadesExcel = updatesList
            .map((u) => `${u.fecha ? `[${u.fecha}] ` : ''}${u.texto}`)
            .join(' /// ');

          // Traslados (hasta 5)
          const transfersList = getPatientTransfers(p, orig, transferHistory);
          const transferCols = {};
          for (let i = 1; i <= 5; i++) {
            const tr = transfersList[i - 1];
            if (tr) {
              transferCols[`FECHA Y HORA TRASLADO ${i}`] = fmtDateTime(tr.fechaTraslado || tr.timestamp);
              transferCols[`SERVICIO DE TRASLADO ${i}`] = tr.servicioDestino || (tr.salaDestino ? `Sala ${tr.salaDestino} / Cama ${tr.camaDestino || ''}` : '—');
            } else {
              transferCols[`FECHA Y HORA TRASLADO ${i}`] = '';
              transferCols[`SERVICIO DE TRASLADO ${i}`] = '';
            }
          }

          // Destino Inmediato del Paciente
          let destinoInmediato = '—';
          let hospitalDestinoRedPrivada = '';
          let observacionesDestino = p.observaciones || orig.observaciones || p.obsAlta || '';

          if (estadoApp === 'Lista de espera de cama') {
            destinoInmediato = 'En lista de espera';
            hospitalDestinoRedPrivada = '';
          } else if (estadoApp === 'Ingreso con acueste') {
            destinoInmediato = 'Hospitalizado (Cama activa)';
            hospitalDestinoRedPrivada = '';
          } else {
            // Alta
            destinoInmediato = p.destino || 'Alta médica';
            if (p.destino === 'Otro establecimiento') {
              hospitalDestinoRedPrivada = p.establecimientoRed === 'Otro'
                ? (p.otroEstablecimientoDetalle || 'Otro establecimiento')
                : (p.establecimientoRed || p.otroEstablecimientoDetalle || 'Otro establecimiento');
            } else if (p.destino === 'Red Privada') {
              hospitalDestinoRedPrivada = p.redPrivadaDetalle || 'Red Privada';
            } else {
              hospitalDestinoRedPrivada = p.establecimientoRed || p.otroEstablecimientoDetalle || p.redPrivadaDetalle || '';
            }
          }

          return {
            // Columnas según requerimiento exacto
            'ESTADO ACTUAL EN EL APLICATIVO': estadoApp,
            'NOMBRE COMPLETO DEL PACIENTE': nombreCompleto,
            'RUT': rut,
            'EDAD CALCULADA': edadCalculada,
            'SEXO': sexo,
            'PREVISIÓN DEL PACIENTE': prevision,
            'COMUNA DE RESIDENCIA': comuna,
            'DIAGNÓSTICO CIE-10 (CÓDIGO O GLOSA)': diagnosticoCIE10,
            'SERVICIO SOLICITANTE': servicioSolicitante,
            'DESTINO (UNIDAD REQUERIDA)': destinoUnidadRequerida,
            'MÉDICO SOLICITANTE / TRATANTE': medicoSolicitanteTratante,
            'ESPECIALIDAD DEL MÉDICO': especialidadDelMedico,
            'ESPECIALIDAD TRATANTE (HASTA 2)': especialidadTratanteHasta2,
            'AISLAMIENTO / PRECAUCIONES': aislamientoPrecauciones,
            'TIEMPO TRANSCURRIDO (SOLICITUD A ACUESTE / DESCARGA)': tiempoSolicitudAcueste,
            'DÍAS DE ESTADA': diasDeEstada,
            'PROCEDIMIENTOS Y NOVEDADES': procedimientosNovedadesExcel,
            ...transferCols,
            'DESTINO INMEDIATO DEL PACIENTE': destinoInmediato,
            'HOSPITAL DE DESTINO / RED PRIVADA': hospitalDestinoRedPrivada,
            'OBSERVACIONES DE DESTINO': observacionesDestino,

            // Columnas de contexto
            'FECHA Y HORA SOLICITUD': fmtDateTime(item.solicitudAt),
            'FECHA Y HORA ACUESTE': fmtDateTime(item.acuesteAt),
            'FECHA Y HORA ALTA': fmtDateTime(item.altaAt),
            'SALA': item.sala,
            'CAMA': item.cama,

            // Metadatos para vista interactiva
            _actualizacionRaw: updatesList,
            _transfersList: transfersList,
            _estadoApp: estadoApp,
            _solicitudAt: item.solicitudAt,
            _acuesteAt: item.acuesteAt,
            _altaAt: item.altaAt,
            _servicioSol: servicioSolicitante,
            _especialidadTratante: especialidadTratanteHasta2
          };
        });

        // 7. Filtrar por Estado Actual
        let result = builtRows;
        if (estadoFilter !== 'todos') {
          result = result.filter((r) => r._estadoApp === estadoFilter);
        }

        // 8. Filtrar por Servicio
        if (serviceFilter !== 'todos') {
          const sLower = serviceFilter.toLowerCase();
          result = result.filter((r) =>
            (r._servicioSol || '').toLowerCase().includes(sLower) ||
            (r['DESTINO (UNIDAD REQUERIDA)'] || '').toLowerCase().includes(sLower) ||
            (r._especialidadTratante || '').toLowerCase().includes(sLower)
          );
        }

        // 9. Filtrar por Búsqueda General
        if (searchTerm.trim()) {
          const q = searchTerm.trim().toLowerCase();
          result = result.filter((r) =>
            Object.entries(r).some(([k, v]) => {
              if (k.startsWith('_')) return false;
              return String(v || '').toLowerCase().includes(q);
            })
          );
        }

        // 10. Ordenar descendente por fecha más reciente
        result.sort((a, b) => {
          const dateA = new Date(a._altaAt || a._acuesteAt || a._solicitudAt || 0);
          const dateB = new Date(b._altaAt || b._acuesteAt || b._solicitudAt || 0);
          return dateB - dateA;
        });

        setRows(result);
        toast.success(`${result.length} registro(s) encontrado(s)`);
      } catch (err) {
        console.error('[GeneralDatabasePanel] Error al generar reporte:', err);
        toast.error('Error al generar el reporte. Intente nuevamente.');
      } finally {
        setLoading(false);
      }
    }, 60);
  }, [startDate, endDate, estadoFilter, serviceFilter, searchTerm, dischargesLog, transferHistory, bedsData, waitingList, procedures]);

  // Exportar a Excel con formato desajustado y columnas completas
  const handleExport = () => {
    if (!rows || rows.length === 0) {
      toast.error('No hay datos para exportar. Realice una consulta primero.');
      return;
    }

    // Limpiar claves internas que comienzan con '_'
    const exportRows = rows.map((r) => {
      const clean = {};
      Object.entries(r).forEach(([k, v]) => {
        if (!k.startsWith('_')) {
          clean[k] = v !== null && v !== undefined ? v : '';
        }
      });
      return clean;
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);

    // Ajuste de ancho de columnas y formato desajustado sin salto vertical
    const colWidths = Object.keys(exportRows[0] || {}).map((key) => {
      if (key === 'PROCEDIMIENTOS Y NOVEDADES') return { wch: 60 };
      if (key === 'DIAGNÓSTICO CIE-10 (CÓDIGO O GLOSA)') return { wch: 45 };
      if (key === 'NOMBRE COMPLETO DEL PACIENTE') return { wch: 32 };
      if (key === 'OBSERVACIONES DE DESTINO') return { wch: 40 };
      if (key.includes('TRASLADO')) return { wch: 25 };
      return { wch: Math.max(key.length, 16) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Base General');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `base_datos_general_${dateStr}.xlsx`);
    toast.success('Archivo Excel exportado exitosamente');
  };

  // Badge para Estado Actual en el aplicativo
  const renderEstadoBadge = (estado) => {
    if (estado === 'Lista de espera de cama') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700,
          background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.35)', whiteSpace: 'nowrap'
        }}>
          <Clock size={12} /> {estado}
        </span>
      );
    }
    if (estado === 'Ingreso con acueste') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700,
          background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4',
          border: '1px solid rgba(6, 182, 212, 0.35)', whiteSpace: 'nowrap'
        }}>
          <Bed size={12} /> {estado}
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700,
        background: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
        border: '1px solid rgba(16, 185, 129, 0.35)', whiteSpace: 'nowrap'
      }}>
        <CheckCircle2 size={12} /> {estado}
      </span>
    );
  };

  return (
    <div className="database-panel" style={{ padding: '24px' }}>
      {/* ── Encabezado ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,0.35)'
          }}>
            <FileSpreadsheet size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Base de Datos General</h2>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Reestructuración unificada: Lista de espera de cama · Ingreso con acueste · Alta
            </p>
          </div>
        </div>

        {rows !== null && (
          <div style={{
            marginLeft: 'auto', padding: '6px 16px', borderRadius: '20px',
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-color)'
          }}>
            {rows.length} registros encontrados
          </div>
        )}
      </div>

      {/* ── Filtros y Parámetros de Consulta ──────────────────── */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Filter size={15} style={{ color: 'var(--accent-color)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-color)' }}>
            Filtros de Consulta
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          {/* Fecha Desde */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <Calendar size={11} style={{ marginRight: '4px' }} />Fecha Desde
            </label>
            <input
              type="date"
              className="glass-input"
              value={startDate}
              max={today}
              style={{ width: '100%', fontSize: '0.85rem' }}
              onChange={(e) => {
                setStartDate(e.target.value);
                setRows(null);
              }}
            />
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="glass-button"
                style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                onClick={() => { setStartDate('2025-08-01'); setRows(null); }}
              >
                01/08/2025
              </button>
              <button
                type="button"
                className="glass-button"
                style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 30);
                  setStartDate(d.toISOString().split('T')[0]);
                  setRows(null);
                }}
              >
                30 días
              </button>
              <button
                type="button"
                className="glass-button"
                style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                onClick={() => {
                  const y = new Date().getFullYear();
                  setStartDate(`${y}-01-01`);
                  setRows(null);
                }}
              >
                Año {new Date().getFullYear()}
              </button>
              <button
                type="button"
                className="glass-button"
                style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                onClick={() => { setStartDate('2024-01-01'); setRows(null); }}
              >
                Todo
              </button>
            </div>
          </div>

          {/* Fecha Hasta */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <Calendar size={11} style={{ marginRight: '4px' }} />Fecha Hasta
            </label>
            <input
              type="date"
              className="glass-input"
              value={endDate}
              max={today}
              style={{ width: '100%', fontSize: '0.85rem' }}
              onChange={(e) => { setEndDate(e.target.value); setRows(null); }}
            />
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="glass-button"
                style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                onClick={() => { setEndDate(today); setRows(null); }}
              >
                Hoy
              </button>
            </div>
          </div>

          {/* Estado actual en el aplicativo */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Estado Actual en el Aplicativo
            </label>
            <select
              className="glass-input"
              value={estadoFilter}
              style={{ width: '100%', fontSize: '0.85rem' }}
              onChange={(e) => { setEstadoFilter(e.target.value); setRows(null); }}
            >
              {ESTADOS_APLICATIVO.map((est) => (
                <option key={est.id} value={est.id}>{est.label}</option>
              ))}
            </select>
          </div>

          {/* Servicio Clínico */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Servicio Clínico
            </label>
            <select
              className="glass-input"
              value={serviceFilter}
              style={{ width: '100%', fontSize: '0.85rem' }}
              onChange={(e) => { setServiceFilter(e.target.value); setRows(null); }}
            >
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s === 'todos' ? 'Todos los servicios' : s}</option>
              ))}
            </select>
          </div>

          {/* Búsqueda por Nombre o RUT */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <Search size={11} style={{ marginRight: '4px' }} />Buscar Paciente / RUT / Diagnóstico
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="glass-input"
                placeholder="Nombre, RUT, diagnóstico..."
                value={searchTerm}
                style={{ width: '100%', paddingLeft: '32px', fontSize: '0.85rem' }}
                onChange={(e) => { setSearchTerm(e.target.value); setRows(null); }}
              />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="glass-button primary"
            onClick={handleQuery}
            disabled={loading}
            style={{
              padding: '10px 24px', fontWeight: 700, fontSize: '0.88rem',
              background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            {loading ? (
              <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />Consultando Base de Datos...</>
            ) : (
              <><Database size={15} />Consultar Base de Datos</>
            )}
          </button>

          <button
            className="glass-button"
            onClick={handleExport}
            disabled={!rows || rows.length === 0}
            style={{
              padding: '10px 20px', fontWeight: 700, fontSize: '0.88rem',
              display: 'flex', alignItems: 'center', gap: '8px',
              opacity: (!rows || rows.length === 0) ? 0.45 : 1,
              background: 'linear-gradient(135deg, #059669, #10b981)'
            }}
          >
            <Download size={15} />Exportar Excel (.xlsx)
          </button>

          {rows !== null && (
            <button
              className="glass-button"
              onClick={() => setRows(null)}
              style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
            >
              <RefreshCw size={13} />Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Estado Inicial: Sin Consultar ─────────────────────── */}
      {rows === null && !loading && (
        <div className="glass-panel" style={{
          padding: '60px 24px', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FileSpreadsheet size={32} style={{ color: '#6366f1', opacity: 0.8 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
              Base de Datos General Reestructurada
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: 1.5 }}>
              Selecciona el rango de fechas y presiona <strong>Consultar Base de Datos</strong> para generar la sábana completa con todos los pacientes clasificados por: <strong>Lista de espera de cama</strong>, <strong>Ingreso con acueste</strong> y <strong>Alta</strong>.
            </div>
          </div>
        </div>
      )}

      {/* ── Sin Resultados ────────────────────────────────────── */}
      {rows !== null && rows.length === 0 && (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Database size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontWeight: 700 }}>Sin resultados en el período y filtros seleccionados</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Ajusta el rango de fechas o los filtros y vuelve a consultar.
          </div>
        </div>
      )}

      {/* ── Vista Previa de la Tabla ─────────────────────────── */}
      {rows !== null && rows.length > 0 && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px'
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              VISTA GENERAL ({rows.length} registros) · La exportación a Excel incluye todas las columnas con hasta 5 traslados detallados
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Mostrando {rows.length} registros
            </span>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '560px', overflowY: 'auto' }}>
            <table className="db-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.14)', position: 'sticky', top: 0, zIndex: 3 }}>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>ESTADO ACTUAL</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>NOMBRE COMPLETO</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>RUT</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>EDAD</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>SEXO</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>PREVISIÓN</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>COMUNA</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>DIAGNÓSTICO CIE-10</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>SERVICIO SOLICITANTE</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>DESTINO REQUERIDO</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>MÉDICO SOLICITANTE / TRATANTE</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>ESP. MÉDICO</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>ESP. TRATANTE (HASTA 2)</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>AISLAMIENTO / PRECAUCIONES</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>TIEMPO SOLICITUD → ACUESTE</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>DÍAS ESTADA</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>PROCEDIMIENTOS Y NOVEDADES</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>TRASLADOS</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>DESTINO INMEDIATO</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>HOSPITAL DESTINO / RED PRIVADA</th>
                  <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>OBSERVACIONES DESTINO</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                  }}>
                    {/* Estado actual */}
                    <td style={{ padding: '8px 12px' }}>
                      {renderEstadoBadge(row['ESTADO ACTUAL EN EL APLICATIVO'])}
                    </td>

                    {/* Nombre */}
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {row['NOMBRE COMPLETO DEL PACIENTE']}
                    </td>

                    {/* RUT */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row['RUT']}
                    </td>

                    {/* Edad */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row['EDAD CALCULADA']}
                    </td>

                    {/* Sexo */}
                    <td style={{ padding: '8px 12px' }}>
                      {row['SEXO']}
                    </td>

                    {/* Previsión */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row['PREVISIÓN DEL PACIENTE']}
                    </td>

                    {/* Comuna */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row['COMUNA DE RESIDENCIA']}
                    </td>

                    {/* Diagnóstico CIE-10 */}
                    <td style={{ padding: '8px 12px', maxWidth: '240px' }} className="cell-truncate" title={row['DIAGNÓSTICO CIE-10 (CÓDIGO O GLOSA)']}>
                      {row['DIAGNÓSTICO CIE-10 (CÓDIGO O GLOSA)']}
                    </td>

                    {/* Servicio Solicitante */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row['SERVICIO SOLICITANTE']}
                    </td>

                    {/* Destino Requerido */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row['DESTINO (UNIDAD REQUERIDA)']}
                    </td>

                    {/* Médico Solicitante / Tratante */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row['MÉDICO SOLICITANTE / TRATANTE']}
                    </td>

                    {/* Especialidad Médico */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row['ESPECIALIDAD DEL MÉDICO']}
                    </td>

                    {/* Especialidad Tratante (Hasta 2) */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row['ESPECIALIDAD TRATANTE (HASTA 2)']}
                    </td>

                    {/* Aislamiento / Precauciones */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row['AISLAMIENTO / PRECAUCIONES'] !== 'Ninguna' ? (
                        <span className="badge-precaucion">{row['AISLAMIENTO / PRECAUCIONES']}</span>
                      ) : 'Ninguna'}
                    </td>

                    {/* Tiempo Solicitud a Acueste */}
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--accent-color)', whiteSpace: 'nowrap' }}>
                      {row['TIEMPO TRANSCURRIDO (SOLICITUD A ACUESTE / DESCARGA)']}
                    </td>

                    {/* Días Estada */}
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {row['DÍAS DE ESTADA']}
                    </td>

                    {/* Procedimientos y Novedades con ActualizacionPill */}
                    <td style={{ padding: '8px 12px' }} className="cell-actualizacion">
                      <ActualizacionPill actualizacion={row._actualizacionRaw} />
                    </td>

                    {/* Traslados (hasta 5) */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row._transfersList && row._transfersList.length > 0 ? (
                        <span
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600,
                            background: 'rgba(99,102,241,0.12)', color: '#818cf8',
                            border: '1px solid rgba(99,102,241,0.25)', cursor: 'help'
                          }}
                          title={row._transfersList.map((tr, i) =>
                            `Traslado ${i + 1}: ${fmtDateTime(tr.fechaTraslado)} → ${tr.servicioDestino || '—'}`
                          ).join('\n')}
                        >
                          <ArrowRightLeft size={11} /> {row._transfersList.length} traslado{row._transfersList.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>—</span>
                      )}
                    </td>

                    {/* Destino Inmediato */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {row['DESTINO INMEDIATO DEL PACIENTE']}
                    </td>

                    {/* Hospital Destino / Red Privada */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {row['HOSPITAL DE DESTINO / RED PRIVADA'] || '—'}
                    </td>

                    {/* Observaciones Destino */}
                    <td style={{ padding: '8px 12px', maxWidth: '200px' }} className="cell-truncate" title={row['OBSERVACIONES DE DESTINO']}>
                      {row['OBSERVACIONES DE DESTINO'] || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
