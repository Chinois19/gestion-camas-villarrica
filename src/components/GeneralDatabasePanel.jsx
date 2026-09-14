import { useState, useCallback } from 'react';
import { Database, Search, Download, Calendar, Filter, RefreshCw, FileSpreadsheet, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import './DatabasePanel.css';

// ── Constantes ─────────────────────────────────────────────────────────────
const DEFAULT_START_DATE = '2025-08-01';

const SERVICES = [
  'todos',
  'UCI', 'UTI', 'Cuidados Medios', 'Básico',
  'GINE/PUERPERIO', 'Neonatología', 'Infantil',
  'Medicina Interna', 'Cirugía'
];

// ── Helpers ─────────────────────────────────────────────────────────────────
// Los campos vacíos devuelven siempre cadena vacía '' (en blanco)
const fmtDateTime = (val) => {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return String(val); }
};

const fmtDate = (val) => {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return String(val); }
};

const diffHours = (start, end) => {
  if (!start || !end) return '';
  try {
    const diff = new Date(end) - new Date(start);
    if (isNaN(diff) || diff < 0) return '';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  } catch { return ''; }
};

const diffDays = (start, end) => {
  if (!start || !end) return '';
  try {
    const diff = new Date(end) - new Date(start);
    if (isNaN(diff) || diff < 0) return '';
    return Math.ceil(diff / 86400000);
  } catch { return ''; }
};

const joinArr = (val) => {
  if (!val) return '';
  if (Array.isArray(val)) return val.filter(Boolean).join(' | ') || '';
  return String(val) || '';
};

const cleanRut = (r) => (r || '').replace(/[^0-9kK]/g, '').toLowerCase();

// Cálculo numérico exacto de edad en años enteros
const getAgeYears = (birthDateStr, fallbackAge) => {
  if (birthDateStr) {
    try {
      const parts = String(birthDateStr).split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const b = new Date(y, m, d);
        if (!isNaN(b.getTime())) {
          const today = new Date();
          let age = today.getFullYear() - b.getFullYear();
          const monthDiff = today.getMonth() - b.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < b.getDate())) {
            age--;
          }
          if (age >= 0) return age;
        }
      }
    } catch { }
  }
  if (fallbackAge !== undefined && fallbackAge !== null && fallbackAge !== '' && fallbackAge !== '—') {
    const num = parseInt(fallbackAge, 10);
    if (!isNaN(num)) return num;
  }
  return '';
};

// ── Fusión inteligente y desduplicación de eventos clínicos ────────────────
function mergeEvent(existing, incoming) {
  const result = { ...existing };
  for (const [key, val] of Object.entries(incoming)) {
    if (val != null && val !== '—' && val !== '') {
      const cur = result[key];
      if (cur == null || cur === '—' || cur === '') {
        result[key] = val;
      }
    }
  }
  if (!result.originalWaitingRequest && incoming.originalWaitingRequest) {
    result.originalWaitingRequest = incoming.originalWaitingRequest;
  }
  return result;
}

function findMatchingEventIndex(events, incoming) {
  const inRut = cleanRut(incoming.rut || incoming.run || incoming.originalWaitingRequest?.rut || '');
  const inName = (incoming.patient || incoming.patientName || incoming.nombre || incoming.originalWaitingRequest?.name || '').toLowerCase().trim();
  const inAlta = incoming.cleaningAt || incoming.dischargeAt || incoming.fechaAlta || null;
  const inAcueste = incoming.assignedAt || incoming.admissionDate || incoming.fechaIngreso || null;
  const inAltaDay = inAlta ? new Date(inAlta).toISOString().slice(0, 10) : null;
  const inAcuesteDay = inAcueste ? new Date(inAcueste).toISOString().slice(0, 10) : null;

  return events.findIndex((ex) => {
    // 1. Mismo ID de documento o puntero de alta
    if (incoming.id && (ex.id === incoming.id || ex.dischargeDocId === incoming.id)) return true;
    if (incoming.dischargeDocId && ex.id === incoming.dischargeDocId) return true;
    if (incoming._dischargeId && ex._dischargeId && incoming._dischargeId === ex._dischargeId) return true;

    // 2. Mismo paciente por RUT o Nombre
    const exRut = cleanRut(ex.rut || ex.run || ex.originalWaitingRequest?.rut || '');
    const exName = (ex.patient || ex.patientName || ex.nombre || ex.originalWaitingRequest?.name || '').toLowerCase().trim();
    const samePerson = (inRut && exRut && inRut === exRut) || (inName && exName && inName === exName);
    if (!samePerson) return false;

    // 3. Mismo evento clínico (mismo día de alta o mismo día de acueste)
    const exAlta = ex.cleaningAt || ex.dischargeAt || ex.fechaAlta || null;
    const exAcueste = ex.assignedAt || ex.admissionDate || ex.fechaIngreso || null;
    const exAltaDay = exAlta ? new Date(exAlta).toISOString().slice(0, 10) : null;
    const exAcuesteDay = exAcueste ? new Date(exAcueste).toISOString().slice(0, 10) : null;

    if (inAltaDay && exAltaDay && inAltaDay === exAltaDay) return true;
    if (inAcuesteDay && exAcuesteDay && inAcuesteDay === exAcuesteDay) return true;

    // Fechas cercanas dentro de 24 horas para el mismo paciente
    if (inAlta && exAlta) {
      const diff = Math.abs(new Date(inAlta) - new Date(exAlta));
      if (!isNaN(diff) && diff < 86400000) return true;
    }

    return false;
  });
}

// ── Extracción unificada de eventos desde Firestore y bedsData ──────────────
function getAllEvents(dischargesLog = [], bedsData = {}) {
  const events = [];

  const addOrMerge = (incoming) => {
    if (!incoming) return;
    const matchIdx = findMatchingEventIndex(events, incoming);
    if (matchIdx >= 0) {
      events[matchIdx] = mergeEvent(events[matchIdx], incoming);
    } else {
      events.push(incoming);
    }
  };

  // 1. Colección directa discharges de Firestore (altas con acueste y altas sin acueste)
  (Array.isArray(dischargesLog) ? dischargesLog : []).forEach((d) => {
    addOrMerge(d);
  });

  // 2. Altas directas legacy de lista de espera si existieran en bedsData
  if (Array.isArray(bedsData?.waitingListDischarges)) {
    bedsData.waitingListDischarges.forEach((d) => {
      addOrMerge({
        ...d,
        isWaitingListDischarge: true,
        _source: 'waitingList'
      });
    });
  }

  // 3. Historial de altas legacy en bedsData (dischargeHistory de camas)
  const floors = Object.keys(bedsData || {}).filter(
    (key) =>
      key !== 'waitingListDischarges' &&
      bedsData[key] &&
      typeof bedsData[key] === 'object' &&
      !Array.isArray(bedsData[key])
  );

  floors.forEach((floor) => {
    Object.keys(bedsData[floor] || {}).forEach((sector) => {
      (bedsData[floor][sector] || []).forEach((room) => {
        (room.beds || []).forEach((bed) => {
          // Historial de altas en esta cama
          if (Array.isArray(bed.dischargeHistory)) {
            bed.dischargeHistory
              .filter((r) => !r._reverted && (r.patient || r.patientName || r.nombre))
              .forEach((p) => {
                addOrMerge({
                  ...p,
                  roomId: p.roomId || room.roomId,
                  bedId: p.bedId || bed.id,
                  _source: 'legacy_bed'
                });
              });
          }

          // Paciente actualmente acostado en la cama (evento activo)
          if (bed.status === 'occupied' && (bed.patient || bed.nombre)) {
            addOrMerge({
              ...bed,
              roomId: room.roomId,
              bedId: bed.id,
              _status: 'occupied',
              _source: 'active_bed'
            });
          }
        });
      });
    });
  });

  return events;
}

// ── Construcción de filas del reporte ────────────────────────────────────────
function buildRows(events, transfers) {
  const rows = [];

  events.forEach((d) => {
    const orig = d.originalWaitingRequest || d.rawBedData?.originalWaitingRequest || d;

    // ── Solicitud
    const solicitudAt = orig.requestedAt || orig.solicitadaAt || orig.createdAt || orig.timestamp || d.requestedAt || null;
    const nombre = d.patient || d.patientName || d.nombre || orig.name || orig.nombre || '';
    const rut = d.rut || d.run || orig.rut || orig.run || '';
    const edadNum = getAgeYears(d.fechaNacimiento || orig.fechaNacimiento, d.age || d.edad || orig.age || orig.edad);
    const sexo = d.sex || d.sexo || orig.sex || orig.sexo || '';
    const prevision = d.prevision || orig.prevision || '';
    const comuna = d.comuna || orig.comuna || '';
    const dxPrincipal = d.dxPrincipal || orig.dxPrincipal || joinArr(d.diagnosis) || joinArr(orig.diagnosis) || '';
    const dxSecundarios = joinArr(orig.secondaryCodes || d.secondaryCodes) || '';
    const servicioSol = orig.servicioSol || orig.origin || d.servicioSol || d.origin || '';
    const medicoSol = orig.medicoSol || d.medicoSol || '';
    const especialidadMedico = orig.especialidadMedico || d.especialidadMedico || '';
    const prioridad = orig.prioridad || orig.priority || d.prioridad || d.priority || '';
    const destinoSol = orig.destino || orig.bedTypeRequired || d.destino || d.bedTypeRequired || '';
    const requisitosUGP = orig.requisitosUGP || d.requisitosUGP || '';
    const reqEnfermeria = orig.reqEnfermeria || d.reqEnfermeria || '';

    // ── Detección de egreso sin acueste (alta directa desde lista de espera)
    const isWaitingDischarge = Boolean(
      d._source === 'waitingList' ||
      d.isWaitingListDischarge ||
      (d.habitacion === 'Lista de Espera' && !d.assignedAt && !d.admissionDate)
    );

    // ── Acueste
    const acuesteAt = isWaitingDischarge ? null : (d.assignedAt || d.admissionDate || d.fechaIngreso || orig.assignedAt || null);
    const tiempoEspera = isWaitingDischarge ? '' : diffHours(solicitudAt, acuesteAt);
    const especialidadTratante = joinArr(d.especialidadTratante || orig.especialidadTratante);
    const sala = isWaitingDischarge ? 'Lista de Espera (Sin Cama)' : (d.roomId || d.habitacion || d.sala || d.salaOrigen || '');
    const cama = isWaitingDischarge ? '' : (d.bedId || d.cama || d.camaOrigen || '');
    const aislamiento = joinArr(d.aislamiento || orig.aislamiento);

    // ── Alta
    const isCurrentlyAdmitted = !isWaitingDischarge && (d._status === 'occupied' || (!d.cleaningAt && !d.dischargeAt && (d.patient || d.nombre)));
    const altaAt = isCurrentlyAdmitted ? null : (d.cleaningAt || d.dischargeAt || d.fechaAlta || null);
    const diasEstadiaTotal = isWaitingDischarge
      ? ''
      : (altaAt ? diffDays(acuesteAt, altaAt) : (acuesteAt ? diffDays(acuesteAt, new Date()) : ''));

    const servicioAlta = isCurrentlyAdmitted
      ? (especialidadTratante || 'En hospitalización')
      : (joinArr(d.especialidadTratante) || '');
    const destinoAlta = isCurrentlyAdmitted
      ? 'En hospitalización (Cama activa)'
      : (d.destino || '');
    const establecimientoDestino = d.establecimientoRed || d.otroEstablecimientoDetalle || d.redPrivadaDetalle || '';

    // ── Tipo de Evento / Acueste
    const tipoEvento = isWaitingDischarge
      ? 'Alta directa sin acueste (Lista de Espera)'
      : (isCurrentlyAdmitted ? 'Hospitalizado activo' : 'Hospitalización con acueste');

    // ── Traslados del mismo paciente (por RUT o Nombre)
    const rutClean = cleanRut(rut);
    const pNombre = (nombre || '').toLowerCase().trim();
    const patientTransfers = (rutClean || pNombre)
      ? transfers
          .filter((t) => {
            const tRut = cleanRut(t.run || t.rut || '');
            if (tRut && rutClean && tRut === rutClean) return true;
            const tNombre = (t.nombre || '').toLowerCase().trim();
            return tNombre && pNombre && tNombre === pNombre;
          })
          .sort((a, b) => new Date(a.fechaTraslado) - new Date(b.fechaTraslado))
      : [];

    // Construir columnas de traslados (máx 5)
    const MAX_TRANSFERS = 5;
    const transferCols = {};
    for (let i = 1; i <= MAX_TRANSFERS; i++) {
      const t = patientTransfers[i - 1];
      if (t) {
        transferCols[`Traslado ${i} - Fecha`] = fmtDateTime(t.fechaTraslado);
        transferCols[`Traslado ${i} - Serv. Origen`] = t.servicioOrigen || '';
        transferCols[`Traslado ${i} - Cama Origen`] = (t.salaOrigen || t.camaOrigen) ? `${t.salaOrigen || ''}/${t.camaOrigen || ''}` : '';
        transferCols[`Traslado ${i} - Serv. Destino`] = t.servicioDestino || '';
        transferCols[`Traslado ${i} - Cama Destino`] = (t.salaDestino || t.camaDestino) ? `${t.salaDestino || ''}/${t.camaDestino || ''}` : '';
        transferCols[`Traslado ${i} - Días en Serv. Origen`] = t.estada || '';
      } else {
        transferCols[`Traslado ${i} - Fecha`] = '';
        transferCols[`Traslado ${i} - Serv. Origen`] = '';
        transferCols[`Traslado ${i} - Cama Origen`] = '';
        transferCols[`Traslado ${i} - Serv. Destino`] = '';
        transferCols[`Traslado ${i} - Cama Destino`] = '';
        transferCols[`Traslado ${i} - Días en Serv. Origen`] = '';
      }
    }

    rows.push({
      // IDENTIFICACIÓN DEL EVENTO
      'Tipo de Evento': tipoEvento,
      // SOLICITUD
      'Fecha/Hora Solicitud': fmtDateTime(solicitudAt),
      'Nombre Paciente': nombre,
      'RUT': rut,
      'Edad (Años)': edadNum !== '' ? edadNum : '',
      'Sexo': sexo,
      'Previsión': prevision,
      'Comuna': comuna,
      'Dx Principal (CIE-10)': dxPrincipal,
      'Dx Secundarios': dxSecundarios,
      'Servicio Solicitante': servicioSol,
      'Médico Solicitante': medicoSol,
      'Especialidad Solicitante': especialidadMedico,
      'Prioridad': prioridad,
      'Destino Solicitado': destinoSol,
      'Requisitos UGP': requisitosUGP,
      'Req. Enfermería': reqEnfermeria,
      // ACUESTE
      'Fecha/Hora Acueste': fmtDateTime(acuesteAt),
      'Tiempo de Espera (Solicitud→Acueste)': tiempoEspera,
      'Esp. Tratante (Acueste)': especialidadTratante,
      'Sala': sala,
      'Cama': cama,
      'Precaución Aislamiento': aislamiento,
      // TRASLADOS
      ...transferCols,
      // ALTA
      'Fecha/Hora Alta': fmtDateTime(altaAt),
      'Días Totales de Estadía': diasEstadiaTotal !== '' ? diasEstadiaTotal : '',
      'Servicio de Alta': servicioAlta,
      'Destino Alta': destinoAlta,
      'Establecimiento Destino': establecimientoDestino,
      // META INTERNA
      _rutClean: rutClean,
      _acuesteAt: acuesteAt,
      _solicitudAt: solicitudAt,
      _altaAt: altaAt,
      _isWaitingDischarge: isWaitingDischarge,
      _tipoEvento: tipoEvento,
    });
  });

  return rows;
}

// ── Componente principal ────────────────────────────────────────────────────
export default function GeneralDatabasePanel({ dischargesLog = [], transferHistory = [], bedsData = {} }) {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState(today);
  const [serviceFilter, setServiceFilter] = useState('todos');
  const [eventTypeFilter, setEventTypeFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [rows, setRows] = useState(null); // null = sin consultar aún
  const [loading, setLoading] = useState(false);

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

        // 1. Extraer todos los eventos combinados de Firestore y camas
        const allEvents = getAllEvents(dischargesLog, bedsData);

        // 2. Filtrar por rango de fechas según las fechas del evento clínico
        const filteredEvents = allEvents.filter((d) => {
          const orig = d.originalWaitingRequest || d.rawBedData?.originalWaitingRequest || d;
          const solicitudAt = orig.requestedAt || orig.solicitadaAt || orig.createdAt || orig.timestamp || d.requestedAt || null;
          const acuesteAt = d.assignedAt || d.admissionDate || d.fechaIngreso || orig.assignedAt || null;
          const altaAt = d.cleaningAt || d.dischargeAt || d.fechaAlta || d.fecha || d._loggedAt || null;

          const dates = [solicitudAt, acuesteAt, altaAt]
            .map((s) => (s ? new Date(s) : null))
            .filter((dt) => dt && !isNaN(dt.getTime()));

          if (dates.length > 0) {
            return dates.some((dt) => dt >= start && dt <= end);
          }

          return true;
        });

        const built = buildRows(filteredEvents, transferHistory);

        let result = built;

        // Filtrar por tipo de evento (acueste vs sin acueste vs activos)
        if (eventTypeFilter !== 'todos') {
          if (eventTypeFilter === 'sin_acueste') {
            result = result.filter((r) => r._isWaitingDischarge);
          } else if (eventTypeFilter === 'con_acueste') {
            result = result.filter((r) => !r._isWaitingDischarge && r._tipoEvento === 'Hospitalización con acueste');
          } else if (eventTypeFilter === 'activos') {
            result = result.filter((r) => r._tipoEvento === 'Hospitalizado activo');
          }
        }

        // Filtrar por servicio
        if (serviceFilter !== 'todos') {
          result = result.filter((r) =>
            (r['Esp. Tratante (Acueste)'] || '').toLowerCase().includes(serviceFilter.toLowerCase()) ||
            (r['Servicio de Alta'] || '').toLowerCase().includes(serviceFilter.toLowerCase()) ||
            (r['Servicio Solicitante'] || '').toLowerCase().includes(serviceFilter.toLowerCase())
          );
        }

        // Filtrar por búsqueda de texto
        if (searchTerm.trim()) {
          const q = searchTerm.trim().toLowerCase();
          result = result.filter((r) =>
            Object.values(r).some((v) => String(v || '').toLowerCase().includes(q))
          );
        }

        // Ordenar descendentemente por fecha más reciente
        result.sort((a, b) => {
          const dateA = new Date(a._altaAt || a._acuesteAt || a._solicitudAt || 0);
          const dateB = new Date(b._altaAt || b._acuesteAt || b._solicitudAt || 0);
          return dateB - dateA;
        });

        setRows(result);
        toast.success(`${result.length} evento(s) encontrado(s)`);
      } catch (err) {
        console.error('[GeneralDatabasePanel] Error al generar reporte:', err);
        toast.error('Error al generar el reporte. Intente nuevamente.');
      } finally {
        setLoading(false);
      }
    }, 50);
  }, [startDate, endDate, eventTypeFilter, serviceFilter, searchTerm, dischargesLog, bedsData, transferHistory]);

  const handleExport = () => {
    if (!rows || rows.length === 0) {
      toast.error('No hay datos para exportar. Realice una consulta primero.');
      return;
    }

    // Eliminar campos internos (_) antes de exportar
    const exportRows = rows.map((r) => {
      const clean = {};
      Object.entries(r).forEach(([k, v]) => {
        if (!k.startsWith('_')) clean[k] = v !== null && v !== undefined ? v : '';
      });
      return clean;
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);

    // Ancho de columnas automático
    const colWidths = Object.keys(exportRows[0] || {}).map((key) => ({
      wch: Math.max(key.length, 14)
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Base Datos General');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `base_datos_general_${dateStr}.xlsx`);
    toast.success('Archivo .xlsx descargado correctamente');
  };

  // Columnas visibles en la tabla de vista previa
  const PREVIEW_COLS = [
    'Tipo de Evento',
    'Fecha/Hora Solicitud',
    'Nombre Paciente',
    'RUT',
    'Edad (Años)',
    'Dx Principal (CIE-10)',
    'Servicio Solicitante',
    'Fecha/Hora Acueste',
    'Tiempo de Espera (Solicitud→Acueste)',
    'Esp. Tratante (Acueste)',
    'Fecha/Hora Alta',
    'Días Totales de Estadía',
    'Destino Alta',
  ];

  return (
    <div className="database-panel" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,0.35)'
          }}>
            <FileSpreadsheet size={22} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Base de Datos General</h2>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Evento completo del paciente · Solicitud → Acueste / Lista de Espera → Traslados → Alta
            </p>
          </div>
        </div>

        {rows !== null && (
          <div style={{
            marginLeft: 'auto', padding: '6px 16px', borderRadius: '20px',
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-color)'
          }}>
            {rows.length} registros
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Filter size={15} style={{ color: 'var(--accent-color)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-color)' }}>
            Parámetros de Consulta
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '16px' }}>
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
                Últimos 30d
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
                Año actual
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

          {/* Tipo de Evento / Acueste */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Tipo de Evento
            </label>
            <select
              className="glass-input"
              value={eventTypeFilter}
              style={{ width: '100%', fontSize: '0.85rem' }}
              onChange={(e) => { setEventTypeFilter(e.target.value); setRows(null); }}
            >
              <option value="todos">Todos los eventos</option>
              <option value="sin_acueste">Alta sin acueste (Lista de Espera)</option>
              <option value="con_acueste">Hospitalización con acueste</option>
              <option value="activos">Hospitalizados activos</option>
            </select>
          </div>

          {/* Servicio */}
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

          {/* Búsqueda */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <Search size={11} style={{ marginRight: '4px' }} />Buscar Nombre / RUT
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="glass-input"
                placeholder="Nombre o RUT..."
                value={searchTerm}
                style={{ width: '100%', paddingLeft: '32px', fontSize: '0.85rem' }}
                onChange={(e) => { setSearchTerm(e.target.value); setRows(null); }}
              />
            </div>
          </div>
        </div>

        {/* Aviso informativo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
          borderRadius: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
          marginBottom: '16px'
        }}>
          <AlertCircle size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            La columna <strong>Tipo de Evento</strong> te permite distinguir inmediatamente entre <strong>Hospitalización con acueste</strong> y <strong>Alta directa sin acueste (Lista de Espera)</strong>.
          </span>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
              <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />Consultando...</>
            ) : (
              <><Database size={15} />Consultar</>
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
            <Download size={15} />Exportar .xlsx
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

      {/* Estado inicial — sin consultar */}
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
            <FileSpreadsheet size={30} style={{ color: '#6366f1', opacity: 0.7 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>
              Define el rango de fechas y presiona Consultar
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '420px' }}>
              Los datos se cargan bajo demanda. El reporte incluye el evento completo del paciente:
              solicitud, acueste o egreso de lista de espera, traslados y alta.
            </div>
          </div>
        </div>
      )}

      {/* Sin resultados */}
      {rows !== null && rows.length === 0 && (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Database size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div style={{ fontWeight: 700 }}>Sin resultados en el período seleccionado</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Ajusta el rango de fechas o los filtros y vuelve a consultar.
          </div>
        </div>
      )}

      {/* Tabla de vista previa */}
      {rows !== null && rows.length > 0 && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              VISTA PREVIA (columnas principales) · Para ver todas las columnas, exporta a .xlsx
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Mostrando {Math.min(rows.length, 100)} de {rows.length} registros
            </span>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.12)', position: 'sticky', top: 0, zIndex: 2 }}>
                  {PREVIEW_COLS.map((col) => (
                    <th key={col} style={{
                      padding: '10px 12px', textAlign: 'left', fontWeight: 700,
                      fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                      whiteSpace: 'nowrap', color: 'var(--accent-color)',
                      borderBottom: '1px solid var(--glass-border)'
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}
                  >
                    {PREVIEW_COLS.map((col) => (
                      <td key={col} style={{
                        padding: '8px 12px',
                        maxWidth: '220px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: col === 'Nombre Paciente' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: col === 'Nombre Paciente' || col === 'Tipo de Evento' ? 600 : 400
                      }}
                        title={String(row[col] || '')}
                      >
                        {row[col] !== null && row[col] !== undefined && row[col] !== '' ? row[col] : ''}
                      </td>
                    ))}
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
