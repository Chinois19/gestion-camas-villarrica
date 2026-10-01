import { useState, useMemo, useCallback } from 'react';
import { Database, Search, Download, Filter, Printer, Calendar, Edit2, RotateCcw, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import './DatabasePanel.css';
import { matchesSearch } from '../utils/search';
import { formatAgeDetailed } from '../utils/age';
import { deleteFirestoreDoc, addFirestoreDoc, updateFirestoreDoc } from '../hooks/useFirestoreCollection';
import { toast } from 'sonner';
import ActualizacionPill from './ActualizacionPill';

const formatDateToDDMMYYYY = (dateVal) => {
  if (!dateVal) return '—';
  if (typeof dateVal === 'string') {
    const match = dateVal.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch (e) { }
  return '—';
};

const parseEntryDate = (entry) => {
  const idNum = Number(entry.id);
  if (!isNaN(idNum) && idNum > 1000000000000) {
    return new Date(idNum);
  }
  const dateStr = entry.fecha || entry.timestamp || entry.solicitadaAt || entry.cleaningAt || entry.assignedAt;
  if (dateStr) {
    const cleaned = dateStr.replace(/-/g, '/');
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
};

const ESTABLECIMIENTOS_RED = {
  'Alta Complejidad': ['Hospital Dr. Hernán Henríquez Aravena (Temuco)'],
  'Hospitales Nodos (Mediana Complejidad)': [
    'Hospital de Villarrica', 'Hospital de Pitrufquén',
    'Hospital de Nueva Imperial', 'Hospital de Lautaro',
    'Complejo Asistencial de Padre las Casas'
  ],
  'Hospitales de Familia y Comunidad': [
    'Hospital de Loncoche', 'Hospital de Cunco', 'Hospital de Galvarino',
    'Hospital de Carahue', 'Hospital de Saavedra', 'Hospital de Toltén',
    'Hospital de Gorbea', 'Hospital de Vilcún'
  ]
};

const DESTINOS = [
  { id: 'Domicilio', label: 'Domicilio', icon: '🏠' },
  { id: 'Hospitalización domiciliaria', label: 'Hospitalización domiciliaria', icon: '🏥' },
  { id: 'Otro establecimiento', label: 'Otro establecimiento', icon: '🏨' },
  { id: 'Red Privada', label: 'Red Privada', icon: '🏢' },
  { id: 'Alta administrativa', label: 'Alta administrativa', icon: '📋' },
  { id: 'Fuga', label: 'Fuga', icon: '🚶' },
  { id: 'Fallecido', label: 'Fallecido', icon: '✝️' },
];

import { ESPECIALIDADES } from '../data/formData';

const EditAltaModal = ({ row, onClose, onSave }) => {
  const p = row.rawBedData || {};

  const parseDateTimeParts = (isoOrStr) => {
    if (!isoOrStr || isoOrStr === '—') return { date: '', time: '' };
    try {
      if (typeof isoOrStr === 'string' && isoOrStr.includes('/')) {
        const parts = isoOrStr.trim().split(/[\s,]+/);
        if (parts.length >= 1) {
          const datePart = parts[0].split('/');
          if (datePart.length === 3) {
            const day = datePart[0].padStart(2, '0');
            const month = datePart[1].padStart(2, '0');
            const year = datePart[2];
            const timePart = parts[1] || '00:00';
            return {
              date: `${year}-${month}-${day}`,
              time: timePart.slice(0, 5)
            };
          }
        }
      }
      const d = new Date(isoOrStr);
      if (isNaN(d.getTime())) return { date: '', time: '' };
      const pad = (num) => String(num).padStart(2, '0');
      return {
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
      };
    } catch {
      return { date: '', time: '' };
    }
  };

  const rawDischarge = p.dischargeAt || p.cleaningAt || p.fechaAlta || row.rawBedData?.dischargeAt || row.rawBedData?.cleaningAt || row.fechaAlta;
  const initialDischargeDT = parseDateTimeParts(rawDischarge);

  const rawAdmission = p.assignedAt || p.admissionDate || p.fechaIngreso || row.rawBedData?.assignedAt || row.rawBedData?.admissionDate || row.fechaIngreso;
  const initialAdmissionDT = parseDateTimeParts(rawAdmission);

  const [dischargeDate, setDischargeDate] = useState(initialDischargeDT.date);
  const [dischargeTime, setDischargeTime] = useState(initialDischargeDT.time);

  const [admissionDate, setAdmissionDate] = useState(initialAdmissionDT.date);
  const [admissionTime, setAdmissionTime] = useState(initialAdmissionDT.time);

  const [formData, setFormData] = useState({
    nombre: p.patient || p.patientName || p.nombre || row.nombre || '',
    run: p.rut || row.run || '',
    diagnosticos: Array.isArray(p.diagnosis) ? p.diagnosis.join(' | ') : (p.diagnosis || row.diagnosticos || ''),
    especialidadTratante: Array.isArray(p.especialidadTratante)
      ? p.especialidadTratante.join(', ')
      : (p.especialidadTratante || p.especialidad || (row.especialidades !== 'No asignada' ? row.especialidades : '') || ''),
    destino: p.destino || '',
    establecimientoRed: p.establecimientoRed || '',
    otroEstablecimientoDetalle: p.otroEstablecimientoDetalle || '',
    redPrivadaDetalle: p.redPrivadaDetalle || '',
    observaciones: p.observaciones || ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSaveClick = () => {
    let finalDischargeIso = null;
    if (dischargeDate && dischargeTime) {
      const d = new Date(`${dischargeDate}T${dischargeTime}:00`);
      if (!isNaN(d.getTime())) finalDischargeIso = d.toISOString();
    } else if (dischargeDate) {
      const d = new Date(`${dischargeDate}T12:00:00`);
      if (!isNaN(d.getTime())) finalDischargeIso = d.toISOString();
    }

    let finalAdmissionIso = null;
    if (admissionDate && admissionTime) {
      const d = new Date(`${admissionDate}T${admissionTime}:00`);
      if (!isNaN(d.getTime())) finalAdmissionIso = d.toISOString();
    } else if (admissionDate) {
      const d = new Date(`${admissionDate}T12:00:00`);
      if (!isNaN(d.getTime())) finalAdmissionIso = d.toISOString();
    }

    onSave({
      ...formData,
      dischargeAt: finalDischargeIso,
      cleaningAt: finalDischargeIso,
      fechaAlta: finalDischargeIso,
      assignedAt: finalAdmissionIso,
      admissionDate: finalAdmissionIso,
      fechaIngreso: finalAdmissionIso
    });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-content glass-panel" style={{ width: 'min(96vw, 640px)', maxHeight: '90vh', overflowY: 'auto', padding: 24, background: 'var(--panel-bg)', border: '1px solid var(--glass-border)', borderRadius: 16 }}>
        <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Editar Registro de Alta</h3>
        <p style={{ fontSize: '0.85rem', color: '#10b981', margin: '0 0 16px 0', fontWeight: 600 }}>Hab {row.sala} - Cama {row.cama}</p>

        {/* Sección de Fechas y Horas Clínicas (Retroactivo) */}
        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            📅 Tiempos Clínicos de Hospitalización (Editable)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#38bdf8', display: 'block', marginBottom: 3 }}>Fecha Ingreso</label>
              <input
                type="date"
                className="glass-input"
                style={{ width: '100%', boxSizing: 'border-box', color: '#38bdf8', fontWeight: 600, padding: '6px 8px' }}
                value={admissionDate}
                onChange={e => setAdmissionDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#38bdf8', display: 'block', marginBottom: 3 }}>Hora Ingreso</label>
              <input
                type="time"
                className="glass-input"
                style={{ width: '100%', boxSizing: 'border-box', color: '#38bdf8', fontWeight: 600, padding: '6px 8px' }}
                value={admissionTime}
                onChange={e => setAdmissionTime(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#10b981', display: 'block', marginBottom: 3 }}>Fecha Alta</label>
              <input
                type="date"
                className="glass-input"
                style={{ width: '100%', boxSizing: 'border-box', color: '#10b981', fontWeight: 600, padding: '6px 8px' }}
                value={dischargeDate}
                onChange={e => setDischargeDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#10b981', display: 'block', marginBottom: 3 }}>Hora Alta</label>
              <input
                type="time"
                className="glass-input"
                style={{ width: '100%', boxSizing: 'border-box', color: '#10b981', fontWeight: 600, padding: '6px 8px' }}
                value={dischargeTime}
                onChange={e => setDischargeTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre</label>
            <input className="glass-input" name="nombre" value={formData.nombre} onChange={handleChange} style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>RUN</label>
            <input className="glass-input" name="run" value={formData.run} onChange={handleChange} style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Diagnósticos</label>
            <input className="glass-input" name="diagnosticos" value={formData.diagnosticos} onChange={handleChange} style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Especialidad Tratante</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: 4 }}>
              <input
                className="glass-input"
                name="especialidadTratante"
                value={formData.especialidadTratante}
                onChange={handleChange}
                placeholder="Ej: Medicina Interna, Cirugía General..."
                style={{ flex: 1, boxSizing: 'border-box' }}
              />
              <select
                className="glass-input"
                onChange={(e) => {
                  if (e.target.value) {
                    setFormData(prev => ({
                      ...prev,
                      especialidadTratante: prev.especialidadTratante
                        ? `${prev.especialidadTratante}, ${e.target.value}`
                        : e.target.value
                    }));
                  }
                }}
                style={{ width: '180px', boxSizing: 'border-box' }}
                value=""
              >
                <option value="">+ Añadir especialidad</option>
                {ESPECIALIDADES.map(esp => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Destino (Servicio de Destino)</label>
            <select className="glass-input" name="destino" value={formData.destino} onChange={handleChange} style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}>
              <option value="">-- Seleccione destino --</option>
              {DESTINOS.map(d => <option key={d.id} value={d.id}>{d.icon} {d.label}</option>)}
            </select>
          </div>

          {formData.destino === 'Otro establecimiento' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Establecimiento en Red</label>
              <select
                className="glass-input"
                name="establecimientoRed"
                value={formData.establecimientoRed}
                onChange={e => {
                  const val = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    establecimientoRed: val,
                    otroEstablecimientoDetalle: val === 'Otro' ? prev.otroEstablecimientoDetalle : ''
                  }));
                }}
                style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
              >
                <option value="">-- Seleccione establecimiento --</option>
                {Object.entries(ESTABLECIMIENTOS_RED).map(([cat, list]) => (
                  <optgroup key={cat} label={cat}>
                    {list.map(h => <option key={h} value={h}>{h}</option>)}
                  </optgroup>
                ))}
                <option value="Otro">Otro establecimiento (Especificar)</option>
              </select>
            </div>
          )}

          {formData.destino === 'Otro establecimiento' && formData.establecimientoRed === 'Otro' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Especifique el Establecimiento</label>
              <input className="glass-input" name="otroEstablecimientoDetalle" value={formData.otroEstablecimientoDetalle} onChange={handleChange} placeholder="Ej: Hospital de Valdivia" style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
            </div>
          )}

          {formData.destino === 'Red Privada' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Establecimiento Privado</label>
              <input className="glass-input" name="redPrivadaDetalle" value={formData.redPrivadaDetalle} onChange={handleChange} placeholder="Ej: Clínica Alemana" style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
            </div>
          )}

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Observaciones Adicionales</label>
            <textarea className="glass-input" name="observaciones" value={formData.observaciones} onChange={handleChange} rows={2} style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button className="glass-button" onClick={onClose} style={{ padding: '8px 16px' }}>Cancelar</button>
          <button className="glass-button primary" onClick={handleSaveClick} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #10b981, #059669)' }}>Guardar Cambios</button>
        </div>
      </div>
    </div>
  );
};

export default function DischargesDatabasePanel({
  discharges = [],
  procedures = [],
  onUpdateDischarge,
  onDeleteDischarge,
  onRevertDischarge,
  bedsData,
  setBedsData,
  waitingListDischarges,
  setWaitingListDischarges,
  dischargesLog,
  setDischargesLog,
  setWaitingList,
  userRole
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  // IDs de altas revocadas en esta sesión — se eliminan de la vista de inmediato
  // sin que el usuario deba reseleccionar filtros de fecha.
  const [revokedIds, setRevokedIds] = useState(new Set());

  const hasDateRange = Boolean(startDate && endDate);

  const isAdmin = userRole === 'superadmin' || userRole === 'administrador' || userRole === 'admin';
  const isAdminOrGestor = isAdmin || userRole === 'gestor_camas' || userRole === 'gestora_servicio';

  // Usar discharges prioritariamente, con fallback a dischargesLog
  const rawDischargesList = (Array.isArray(discharges) && discharges.length > 0)
    ? discharges
    : (Array.isArray(dischargesLog) ? dischargesLog : []);

  const patientsData = useMemo(() => {
    const data = [];
    const seenLogIds = new Set();
    const seenKeys = new Set();
    const dupKey = (nombre, fecha) => `${(nombre || '').toLowerCase().trim()}|${fecha || ''}`;

    const formatDateTime = (isoString) => {
      if (!isoString) return '—';
      try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;
        return date.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch { return isoString; }
    };

    const buildRow = (p, meta) => {
      let dxList = [];
      if (p.diagnosis) {
        if (Array.isArray(p.diagnosis)) dxList = [...dxList, ...p.diagnosis];
        else dxList.push(p.diagnosis);
      }
      if (p.dxPrincipal) dxList.push(p.dxPrincipal);
      if (p.diagnostics && Array.isArray(p.diagnostics)) dxList = [...dxList, ...p.diagnostics];
      const uniqueDx = [...new Set(dxList.filter(Boolean))].join(' | ');

      let specs = [];
      if (p.especialidadTratante) {
        if (Array.isArray(p.especialidadTratante)) specs = [...specs, ...p.especialidadTratante];
        else specs.push(p.especialidadTratante);
      }
      if (p.especialidad) {
        if (Array.isArray(p.especialidad)) specs = [...specs, ...p.especialidad];
        else specs.push(p.especialidad);
      }
      const uniqueSpecs = [...new Set(specs.filter(Boolean))].join(', ');

      let precautions = [];
      if (p.aislamiento) {
        if (Array.isArray(p.aislamiento)) precautions = [...p.aislamiento];
        else precautions = [p.aislamiento];
      }
      const precStr = precautions.length > 0 ? precautions.join(', ') : 'Ninguna';

      const dischargeTimestamp = p.cleaningAt || p.dischargeAt || null;
      const dischargeDateObj = dischargeTimestamp ? new Date(dischargeTimestamp) : null;
      const fechaAlta = formatDateTime(dischargeTimestamp);
      const admDate = p.admissionDate || p.assignedAt || p.createdAt;

      let estada = meta.estada || '—';
      if (admDate && dischargeDateObj && !meta.estada) {
        try {
          const d = new Date(admDate);
          if (!isNaN(d.getTime()) && !isNaN(dischargeDateObj.getTime()))
            estada = Math.ceil(Math.abs(dischargeDateObj - d) / 86400000) + ' días';
        } catch (e) { }
      }

      let updates = [];
      (p.evolutions || []).forEach(ev => {
        if (ev.note) updates.push({ texto: `Evolución: ${ev.note}`, fecha: formatDateToDDMMYYYY(ev.timestamp), rawDate: parseEntryDate(ev) });
      });
      // De la colección procedures
      if (Array.isArray(procedures)) {
        const patientRut = (p.rut || p.run || '').replace(/[^0-9kK]/g, '').toLowerCase();
        const patientName = (p.patient || p.patientName || p.nombre || '').toLowerCase().trim();
        const admDate = p.admissionDate || p.assignedAt;
        const disDate = p.cleaningAt || p.dischargeAt;

        const matchedProcs = procedures.filter(pr => {
          const prRut = (pr.rut || '').replace(/[^0-9kK]/g, '').toLowerCase();
          const prName = (pr.patientName || pr.nombre || '').toLowerCase().trim();

          // 1. Coincidencia por RUN exacto del paciente
          if (patientRut && prRut && patientRut === prRut) return true;

          // 2. Coincidencia por nombre exacto del paciente
          if (patientName && prName && patientName === prName) return true;

          // 3. Coincidencia por cama: solo si ocurrió durante la hospitalización de este paciente
          if (p.bedId && pr.bedId && pr.bedId === p.bedId) {
            const procDate = new Date(pr.createdAt || pr.fecha);
            if (!isNaN(procDate.getTime())) {
              if (admDate && procDate < new Date(admDate)) return false;
              if (disDate && procDate > new Date(disDate)) return false;
              return true;
            }
          }
          return false;
        });
        matchedProcs.forEach(nov => {
          if (nov.contenido || nov.procedimiento) {
            updates.push({ texto: nov.contenido || nov.procedimiento, fecha: formatDateToDDMMYYYY(nov.fecha || nov.createdAt), rawDate: parseEntryDate(nov) });
          }
        });
      }
      // Fallback retrocompatible
      (p.novedades || []).forEach(nov => {
        if (nov.contenido && !updates.some(u => u.texto === nov.contenido)) {
          updates.push({ texto: nov.contenido, fecha: formatDateToDDMMYYYY(nov.fecha), rawDate: parseEntryDate(nov) });
        }
      });
      updates.sort((a, b) => b.rawDate - a.rawDate);
      if (updates.length === 0) {
        const fallbackDate = p.updatedAt || p.assignedAt;
        updates.push({ texto: 'Ingreso registrado', fecha: formatDateToDDMMYYYY(fallbackDate), rawDate: fallbackDate ? new Date(fallbackDate) : new Date() });
      }

      let servicioAcueste = p.destino || meta.bedType || 'No definido';
      if (p.destino === 'Otro establecimiento') {
        const hosp = p.establecimientoRed === 'Otro' ? (p.otroEstablecimientoDetalle || 'Otro') : p.establecimientoRed;
        servicioAcueste = `Traslado: ${hosp || 'Otro establecimiento'}`;
      } else if (p.destino === 'Red Privada' && p.redPrivadaDetalle) {
        servicioAcueste = `Privado: ${p.redPrivadaDetalle}`;
      }

      return {
        id: p.id || p._logId,
        rawBedData: p,
        rawDischargeDate: dischargeDateObj,
        servicio: servicioAcueste,
        estada,
        sala: meta.sala || p.habitacion || p.roomId || '—',
        cama: meta.cama || p.cama || p.bedId || '—',
        fechaIngreso: formatDateTime(admDate),
        fechaAlta,
        precauciones: precStr,
        nombre: p.patient || p.patientName || p.nombre || 'Desconocido',
        run: p.rut || p.run || '—',
        edad: formatAgeDetailed(p.fechaNacimiento, p.age || p.edad),
        diagnosticos: uniqueDx || 'No registrado',
        especialidades: uniqueSpecs || 'No asignada',
        actualizacion: updates,
        comuna: p.comuna || '—',
        isWaitingListDischarge: meta.isWaiting || p._source === 'waitingList' || false,
        _source: meta.source || p._source || 'discharges_collection'
      };
    };

    rawDischargesList.forEach(p => {
      if (p._reverted) return;
      const nombre = p.patient || p.patientName || p.nombre || '';
      const ts = p.cleaningAt || p.dischargeAt || '';
      const key = dupKey(nombre, ts);
      if (p._logId) seenLogIds.add(p._logId);
      if (p.id) seenLogIds.add(p.id);
      seenKeys.add(key);

      data.push(buildRow(p, {
        sala: p.habitacion || p.roomId || '—',
        cama: p.cama || p.bedId || '—',
        bedType: p.bedType || '—',
        isWaiting: p._source === 'waitingList' || p.isWaitingListDischarge,
        source: 'discharges',
        estada: (p._source === 'waitingList' || p.isWaitingListDischarge) ? 'Alta previa a asignación' : undefined
      }));
    });

    const floors = Object.keys(bedsData || {}).filter(key =>
      key !== 'waitingListDischarges' &&
      bedsData[key] && typeof bedsData[key] === 'object' && !Array.isArray(bedsData[key])
    ).sort((a, b) => a.localeCompare(b));

    floors.forEach(floor => {
      Object.keys(bedsData[floor] || {}).forEach(sector => {
        (bedsData[floor][sector] || []).forEach(room => {
          (room.beds || []).forEach(bed => {
            const extractAll = (bedObj, depth = 0) => {
              if (!bedObj || depth > 8) return [];
              const recs = [];
              if (Array.isArray(bedObj.dischargeHistory) && bedObj.dischargeHistory.length > 0) {
                bedObj.dischargeHistory.filter(r => !r._reverted).forEach(r => recs.push(r));
              }
              if (bedObj.previousPatient) {
                const pp = bedObj.previousPatient;
                if ((pp.cleaningAt || pp.dischargeAt) && !pp._reverted) {
                  const notDup = !recs.some(r =>
                    (r.cleaningAt || r.dischargeAt) === (pp.cleaningAt || pp.dischargeAt) &&
                    (r.patient || r.patientName) === (pp.patient || pp.patientName)
                  );
                  if (notDup) recs.push(pp);
                }
                extractAll(pp, depth + 1).forEach(r => {
                  const notDup = !recs.some(x =>
                    (x.cleaningAt || x.dischargeAt) === (r.cleaningAt || r.dischargeAt) &&
                    (x.patient || x.patientName) === (r.patient || r.patientName)
                  );
                  if (notDup) recs.push(r);
                });
              }
              if (bedObj.lastDischarge && !bedObj.previousPatient && !bedObj.lastDischarge._reverted) {
                recs.push(bedObj.lastDischarge);
              }
              return recs;
            };

            extractAll(bed).forEach(p => {
              const nombre = p.patient || p.patientName || p.nombre || '';
              const ts = p.cleaningAt || p.dischargeAt || '';
              const key = dupKey(nombre, ts);
              if (seenKeys.has(key)) return;
              seenKeys.add(key);
              data.push(buildRow(p, {
                sala: room.roomId,
                cama: bed.id,
                bedType: bed.tag || bed.type || '',
                source: 'legacy_bed'
              }));
            });
          });
        });
      });
    });

    if (Array.isArray(waitingListDischarges)) {
      waitingListDischarges.forEach(p => {
        const nombre = p.patient || p.patientName || p.nombre || '';
        const ts = p.dischargeAt || '';
        const key = dupKey(nombre, ts);
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        let servicioDischarge = p.destino || 'Lista de Espera';
        if (p.destino === 'Otro establecimiento') {
          const hosp = p.establecimientoRed === 'Otro' ? (p.otroEstablecimientoDetalle || 'Otro') : p.establecimientoRed;
          servicioDischarge = `Traslado: ${hosp || 'Otro establecimiento'}`;
        } else if (p.destino === 'Red Privada' && p.redPrivadaDetalle) {
          servicioDischarge = `Privado: ${p.redPrivadaDetalle}`;
        }

        const dischargeDateObj = p.dischargeAt ? new Date(p.dischargeAt) : null;
        let dxList = [];
        if (p.diagnosis) {
          if (Array.isArray(p.diagnosis)) dxList = [...dxList, ...p.diagnosis];
          else dxList.push(p.diagnosis);
        }
        const uniqueDx = [...new Set(dxList.filter(Boolean))].join(' | ');

        let specs = [];
        if (p.especialidadTratante) {
          if (Array.isArray(p.especialidadTratante)) specs = [...specs, ...p.especialidadTratante];
          else specs.push(p.especialidadTratante);
        }
        if (p.especialidad) {
          if (Array.isArray(p.especialidad)) specs = [...specs, ...p.especialidad];
          else specs.push(p.especialidad);
        }
        const uniqueSpecs = [...new Set(specs.filter(Boolean))].join(', ');

        data.push({
          id: p.id || p._logId,
          rawBedData: p,
          rawDischargeDate: dischargeDateObj,
          servicio: servicioDischarge,
          estada: 'Alta previa a asignación',
          sala: 'Espera',
          cama: '—',
          fechaIngreso: formatDateTime(p.requestedAt),
          fechaAlta: formatDateTime(p.dischargeAt),
          precauciones: 'Ninguna',
          nombre: nombre || 'Desconocido',
          run: p.rut || '—',
          edad: formatAgeDetailed(p.fechaNacimiento, p.age || p.edad),
          diagnosticos: uniqueDx || 'No registrado',
          especialidades: uniqueSpecs || 'No asignada',
          actualizacion: [{ texto: 'Alta previa a asignación de cama', fecha: formatDateToDDMMYYYY(p.dischargeAt), rawDate: p.dischargeAt ? new Date(p.dischargeAt) : new Date() }],
          comuna: p.comuna || '—',
          isWaitingListDischarge: true,
          _source: 'waitingListDischarges'
        });
      });
    }

    return data;
  }, [bedsData, waitingListDischarges, rawDischargesList]);

  const filteredData = useMemo(() => {
    if (!startDate || !endDate) return [];

    let result = patientsData;

    // Excluir inmediatamente registros ya revocados en esta sesión (sin recargar filtros)
    if (revokedIds.size > 0) {
      result = result.filter(row => !revokedIds.has(row.id));
    }

    const [sy, sm, sd] = startDate.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const [ey, em, ed] = endDate.split('-').map(Number);
    const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    result = result.filter(row => {
      const dDate = row.rawDischargeDate;
      if (!dDate) return false;
      return dDate >= start && dDate <= end;
    });

    if (searchTerm) {
      result = result.filter(row =>
        Object.entries(row).some(([key, val]) => {
          if (key === 'rawDischargeDate') return false;
          if (key === 'actualizacion' && Array.isArray(val)) {
            return val.some(act => matchesSearch(act.texto, searchTerm) || matchesSearch(act.fecha, searchTerm));
          }
          return matchesSearch(String(val), searchTerm);
        })
      );
    }
    return result.sort((a, b) => b.rawDischargeDate - a.rawDischargeDate);
  }, [patientsData, searchTerm, startDate, endDate, revokedIds]);


  const handleExportExcel = () => {
    if (filteredData.length === 0) return;
    const headers = [
      'SERVICIO', 'SALA', 'CAMA', 'ESTADA', 'FECHA INGRESO', 'FECHA ALTA', 'PRECAUCIONES', 'NOMBRE', 'RUN', 'EDAD', 'DIAGNÓSTICOS', 'ESPECIALIDAD TRATANTE', 'DESTINO', 'ESTABLECIMIENTO RED', 'RED PRIVADA DETALLE', 'OBSERVACIONES', 'ACTUALIZACIONES'
    ];
    const data = filteredData.map(row => {
      const p = row.rawBedData || {};
      const updatesStr = (row.actualizacion || []).map(u => `[${u.fecha}] ${u.texto}`).join(' || ');
      return [row.servicio, row.sala, row.cama, row.estada, row.fechaIngreso, row.fechaAlta, row.precauciones, row.nombre, row.run, row.edad, row.diagnosticos, row.especialidades, p.destino || '', p.establecimientoRed || p.otroEstablecimientoDetalle || '', p.redPrivadaDetalle || '', p.observaciones || '', updatesStr];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Altas");
    XLSX.writeFile(wb, `Base_de_Datos_Altas_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Base de datos de altas exportada a Excel');
  };

  /**
   * Revoca un alta médica y devuelve al paciente a su cama de procedencia.
   *
   * Reglas de negocio:
   *  A) Si la cama está en ASEO (cleaning): bloquea la revocación y avisa.
   *     NO se modifica nada en la cama actual.
   *  B) Si la cama está OCUPADA por otro paciente: bloquea la revocación y avisa.
   *     NO se modifica nada en la cama actual.
   *  C) Si la cama está DISPONIBLE (available): restaura al paciente, marca el
   *     alta como _reverted en Firestore y elimina la fila de la vista al instante.
   *  D) Si el alta proviene de la Lista de Espera: restaura en waitingList.
   *  E) Si no hay sala/cama válida: ofrece enviar a Lista de Espera.
   */
  const handleRevokeDischarge = useCallback(async (roomId, bedId, row) => {
    const docId = row?.id || row?.rawBedData?.id || row?.rawBedData?._logId;
    const patientName = row.nombre || row?.rawBedData?.patient || 'el paciente';

    // ── Helper para reconstruir fielmente un paciente de lista de espera ──
    const buildRestoredWaitingPatient = (waitIdFallback) => {
      const raw = row?.rawBedData || {};
      const orig = raw.originalWaitingRequest || {};
      const rawId = raw.id;
      const waitId = orig.id || ((typeof rawId === 'string' && rawId.startsWith('wait_dis_'))
        ? rawId.replace('wait_dis_', '')
        : (rawId && rawId !== '—' ? rawId : waitIdFallback));

      const {
        _logId, _loggedAt, _source, _reverted, _revertedAt,
        dischargeAt, cleaningAt, destino, establecimientoRed,
        otroEstablecimientoDetalle, redPrivadaDetalle, observaciones,
        isWaitingListDischarge, piso, sector, habitacion, cama,
        ...restRaw
      } = raw;

      // Limpiar edad si viene formateada como "45 años"
      const parsedAge = parseInt(
        orig.age ?? raw.age ?? (typeof row.edad === 'string' ? row.edad.replace(/[^0-9]/g, '') : row.edad)
      ) || 0;

      // Normalizar diagnósticos como array
      let parsedDiagnosis = orig.diagnosis || raw.diagnosis;
      if (!parsedDiagnosis || (Array.isArray(parsedDiagnosis) && parsedDiagnosis.length === 0)) {
        if (row.diagnosticos && row.diagnosticos !== 'No registrado') {
          parsedDiagnosis = [row.diagnosticos];
        } else {
          parsedDiagnosis = ['Sin diagnóstico principal'];
        }
      } else if (!Array.isArray(parsedDiagnosis)) {
        parsedDiagnosis = [String(parsedDiagnosis)];
      }

      const returnEvolution = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('es-CL'),
        user: 'Sistema',
        role: 'Gestor',
        note: '↩️ Alta revocada (previa a asignación de cama) - Solicitud de cama restaurada en lista de espera'
      };

      const existingEvolutions = Array.isArray(orig.evolutions) && orig.evolutions.length > 0
        ? orig.evolutions
        : (Array.isArray(raw.evolutions) ? raw.evolutions : []);

      return {
        ...restRaw,
        ...orig,
        id: waitId,
        name: orig.name || orig.patient || patientName,
        nombreSocial: orig.nombreSocial || raw.nombreSocial || '',
        rut: orig.rut || row.run || raw.rut || '',
        diagnosis: parsedDiagnosis,
        dxPrincipal: orig.dxPrincipal || raw.dxPrincipal || null,
        dxCie10: orig.dxCie10 || raw.dxCie10 || null,
        dxGrupo: orig.dxGrupo || raw.dxGrupo || null,
        secondaryCodes: orig.secondaryCodes || raw.secondaryCodes || [],
        age: parsedAge,
        fechaNacimiento: orig.fechaNacimiento || raw.fechaNacimiento || null,
        sexo: orig.sexo || orig.sex || raw.sex || raw.sexo || '',
        prevision: orig.prevision || raw.prevision || '',
        comuna: orig.comuna || raw.comuna || '',
        priority: orig.priority || raw.priority || raw.prioridad || 3,
        origin: orig.origin || orig.servicioSol || raw.origin || raw.servicioSol || 'Urgencia',
        bedTypeRequired: orig.bedTypeRequired || orig.destino || raw.bedTypeRequired || raw.destino || 'Cuidados Medios',
        ticket: orig.ticket || raw.ticket || `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900) + 100}`,
        medicoSol: orig.medicoSol || raw.medicoSol || '',
        especialidadMedico: orig.especialidadMedico || raw.especialidadMedico || '',
        especialidadTratante: orig.especialidadTratante || raw.especialidadTratante || [],
        requisitosUGP: orig.requisitosUGP || raw.requisitosUGP || '',
        reqEnfermeria: orig.reqEnfermeria || raw.reqEnfermeria || '',
        procedimientosPendientes: orig.procedimientosPendientes || raw.procedimientosPendientes || '',
        hodom: orig.hodom || raw.hodom || false,
        trr: orig.trr || raw.trr || false,
        hfc: orig.hfc || raw.hfc || false,
        ugcc: orig.ugcc || raw.ugcc || false,
        paSist: orig.paSist || raw.paSist || '',
        paDiast: orig.paDiast || raw.paDiast || '',
        frecCard: orig.frecCard || raw.frecCard || '',
        frecResp: orig.frecResp || raw.frecResp || '',
        temp: orig.temp || raw.temp || '',
        satO2: orig.satO2 || raw.satO2 || '',
        glicemia: orig.glicemia || raw.glicemia || '',
        evaDolor: orig.evaDolor || raw.evaDolor || '',
        aislamiento: orig.aislamiento || raw.aislamiento || null,
        evolutions: [...existingEvolutions, returnEvolution],
        status: 'waiting',
        requestedAt: orig.requestedAt || raw.requestedAt || new Date().toISOString()
      };
    };

    // ── CASO D: Alta desde Lista de Espera ─────────────────────────────────
    const isWaitingDischarge = roomId === 'Espera' || roomId === 'Lista de Espera' || row?.isWaitingListDischarge || row?._source === 'waitingList' || row?.rawBedData?._source === 'waitingList';
    if (isWaitingDischarge) {
      if (!window.confirm(
        `¿Estás seguro de que deseas revocar el alta de ${patientName} y volver a colocarle en la lista de espera?`
      )) return;

      if (docId && onUpdateDischarge) {
        try { await onUpdateDischarge(docId, { _reverted: true, _revertedAt: new Date().toISOString() }); }
        catch (e) { console.warn('[RevocarAlta] No se pudo marcar _reverted en discharges:', e); }
      }
      if (setWaitingListDischarges) {
        setWaitingListDischarges(prev => Array.isArray(prev) ? prev.filter(p => (p.id || p._logId) !== docId) : prev);
      }

      const restoredPatient = buildRestoredWaitingPatient(`wait_${Date.now()}`);

      await addFirestoreDoc('waitingList', restoredPatient).catch(e => console.warn('[RevocarAlta] Error al agregar a waitingList:', e));
      if (setWaitingList) {
        setWaitingList(prev => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some(p => p.id === restoredPatient.id)) return list;
          return [...list, restoredPatient];
        });
      }
      // Eliminar de la vista inmediatamente
      if (docId) setRevokedIds(prev => new Set([...prev, docId]));
      toast.success(`Alta revocada. ${patientName} devuelto/a a la Lista de Espera con todos sus datos.`);
      return;
    }

    // ── Resolver sala y cama de destino ────────────────────────────────────
    const raw = row?.rawBedData || {};
    const targetRoomId = String(roomId || raw.habitacion || raw.roomId || '').trim();
    const targetBedId  = String(bedId  || raw.cama       || raw.bedNumber || '').trim();
    const hasValidBed  = targetRoomId && targetRoomId !== '—' && targetBedId && targetBedId !== '—';

    // ── CASO E: Sin sala/cama válida ───────────────────────────────────────
    if (!hasValidBed) {
      if (!window.confirm(
        `Este registro de alta no especifica sala/cama física.\n¿Deseas revocar el alta de ${patientName} y colocarle en la Lista de Espera?`
      )) return;
      if (docId && onUpdateDischarge) {
        try { await onUpdateDischarge(docId, { _reverted: true, _revertedAt: new Date().toISOString() }); }
        catch (e) { console.warn('[RevocarAlta] No se pudo marcar _reverted en discharges:', e); }
      }
      if (setWaitingListDischarges) {
        setWaitingListDischarges(prev => Array.isArray(prev) ? prev.filter(p => (p.id || p._logId) !== docId) : prev);
      }

      const restoredPatient = buildRestoredWaitingPatient(`wait_${Date.now()}`);

      await addFirestoreDoc('waitingList', restoredPatient).catch(e => console.warn('[RevocarAlta] Error al agregar a waitingList:', e));
      if (setWaitingList) {
        setWaitingList(prev => {
          const list = Array.isArray(prev) ? prev : [];
          if (list.some(p => p.id === restoredPatient.id)) return list;
          return [...list, restoredPatient];
        });
      }
      if (docId) setRevokedIds(prev => new Set([...prev, docId]));
      toast.success(`Alta revocada. ${patientName} enviado/a a la Lista de Espera con todos sus datos.`);
      return;
    }

    // ── Buscar la cama de destino en el árbol actual de camas ──────────────
    let existingBed = null;
    let existingBedCanonicalId = null;
    if (bedsData) {
      for (const f in bedsData) {
        if (!bedsData[f] || typeof bedsData[f] !== 'object' || Array.isArray(bedsData[f])) continue;
        for (const s in bedsData[f]) {
          if (!Array.isArray(bedsData[f][s])) continue;
          const room = bedsData[f][s].find(r => String(r.roomId) === targetRoomId);
          if (room) {
            const foundBed = room.beds?.find(b => String(b.id) === targetBedId);
            if (foundBed) {
              existingBed = foundBed;
              // canonicalId real almacenado en el documento de la cama
              existingBedCanonicalId = foundBed.canonicalId || `${f}_${s}_${targetRoomId}_${targetBedId}`;
              break;
            }
          }
        }
        if (existingBed) break;
      }
    }

    // ── CASO A: Cama en ASEO — BLOQUEO TOTAL ──────────────────────────────
    // No se puede revocar: interrumpiría un proceso de limpieza activo y
    // podría mezclar datos de dos pacientes en la misma cama.
    if (existingBed && existingBed.status === 'cleaning') {
      toast.error(
        `⚠️ No se puede revocar el alta.\n\nLa Sala ${targetRoomId} - Cama ${targetBedId} se encuentra actualmente en proceso de ASEO. ` +
        `Finalice el aseo antes de intentar revocar el alta de ${patientName}.`,
        { duration: 7000 }
      );
      return; // No se modifica absolutamente nada
    }

    // ── CASO B: Cama OCUPADA por otro paciente — BLOQUEO TOTAL ────────────
    const myRutClean  = (row.run  || raw.rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
    const bedRutClean = (existingBed?.rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
    const isOccupiedByOther = existingBed &&
      existingBed.status === 'occupied' &&
      existingBed.patient &&
      !(myRutClean && bedRutClean && myRutClean === bedRutClean);

    if (isOccupiedByOther) {
      toast.error(
        `⚠️ No se puede revocar el alta.\n\nLa Sala ${targetRoomId} - Cama ${targetBedId} se encuentra OCUPADA por ` +
        `${existingBed.patient}.\n\nNo es posible revocar el alta de ${patientName} en esta cama sin desplazar al paciente actual. ` +
        `Consulte con el equipo clínico para reasignar una cama disponible.`,
        { duration: 9000 }
      );
      return; // No se modifica absolutamente nada
    }

    // ── CASO C: Cama DISPONIBLE — Confirmar y restaurar ───────────────────
    if (!window.confirm(
      `¿Está seguro de que desea revocar el alta de ${patientName} y volver a acostarle en la Cama ${targetBedId} de la Sala ${targetRoomId}?`
    )) return;

    // 1. Marcar alta como revocada en Firestore (colección discharges)
    if (docId && onUpdateDischarge) {
      try { await onUpdateDischarge(docId, { _reverted: true, _revertedAt: new Date().toISOString() }); }
      catch (e) { console.warn('[RevocarAlta] No se pudo marcar _reverted en discharges:', e); }
    }

    // 2. Construir datos limpios del paciente para restaurar en la cama
    //    Excluimos todos los campos que pertenecen al registro de alta
    //    y los que son metadatos del documento Firestore.
    const {
      id: _ignoredDischargeId, _dischargeId, _logId, _loggedAt, _source,
      _reverted: _r, _revertedAt: _ra,
      destino, establecimientoRed, otroEstablecimientoDetalle, redPrivadaDetalle,
      observaciones, dischargeAt, cleaningAt: _dischargeCleaningAt,
      isWaitingListDischarge, habitacion, cama: _camaField, piso: _pisoField,
      sector: _sectorField, migratedAt, bedType, bedNumber: _bnum,
      roomType: _rt, roomId: _rm, floor: _fl, canonicalId: _cid,
      ...cleanPatientData
    } = raw;

    const especialidadArr = row.especialidades
      ? [String(row.especialidades).trim()]
      : (Array.isArray(cleanPatientData.especialidadTratante)
          ? cleanPatientData.especialidadTratante
          : (cleanPatientData.especialidadTratante ? [String(cleanPatientData.especialidadTratante)] : []));

    const restoredBedPayload = {
      ...cleanPatientData,
      patient: patientName,
      rut: row.run || cleanPatientData.rut,
      diagnosis: row.diagnosticos
        ? [row.diagnosticos]
        : (Array.isArray(cleanPatientData.diagnosis)
            ? cleanPatientData.diagnosis
            : (cleanPatientData.diagnosis ? [cleanPatientData.diagnosis] : [])),
      especialidadTratante: especialidadArr,
      status: 'occupied',
      assignedAt: raw.assignedAt || raw.fechaIngreso || cleanPatientData.assignedAt || new Date().toISOString(),
      cleaningAt: null,
      previousPatient: null,
      lastDischarge: null,
      dischargeHistory: [],
      _updatedAt: new Date().toISOString()
    };

    // 3. Escribir quirúrgicamente SOLO la cama afectada en Firestore
    //    mediante updateFirestoreDoc (merge) para no tocar ninguna otra cama.
    if (existingBedCanonicalId) {
      try {
        await updateFirestoreDoc('beds', existingBedCanonicalId, restoredBedPayload);
      } catch (err) {
        console.error('[RevocarAlta] Error al restaurar cama en Firestore:', err);
        toast.error('Error al restaurar la cama en la base de datos. Intente nuevamente.');
        return;
      }
    }

    // 4. Actualizar árbol local de camas (para reflejo inmediato en Dashboard)
    if (setBedsData) {
      setBedsData(prev => {
        const next = JSON.parse(JSON.stringify(prev));
        for (const f in next) {
          if (!next[f] || typeof next[f] !== 'object' || Array.isArray(next[f])) continue;
          for (const s in next[f]) {
            if (!Array.isArray(next[f][s])) continue;
            next[f][s] = next[f][s].map(room => {
              if (String(room.roomId) !== targetRoomId) return room;
              return {
                ...room,
                beds: room.beds.map((b, idx) => {
                  if (String(b.id) !== targetBedId) return b;
                  const cleanBedId = (typeof b.id === 'string' && !b.id.startsWith('dis_') && !b.id.startsWith('wait_'))
                    ? b.id
                    : (b.cama || targetBedId || String(idx + 1));
                  return { ...b, ...restoredBedPayload, id: cleanBedId };
                })
              };
            });
          }
        }
        return next;
      });
    }

    // 5. Eliminar registro de la vista al instante (sin recargar filtros)
    if (docId) setRevokedIds(prev => new Set([...prev, docId]));

    toast.success(`✅ Alta de ${patientName} revocada. Paciente reacostado/a en Sala ${targetRoomId} - Cama ${targetBedId}.`);
  }, [bedsData, setBedsData, onUpdateDischarge, setWaitingList, setWaitingListDischarges]);



  const handleSaveEdit = async (roomId, bedId, updatedData) => {
    const docId = editingRow?.id;
    const especialidadList = updatedData.especialidadTratante
      ? updatedData.especialidadTratante.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const patchPayload = {
      patient: updatedData.nombre, patientName: updatedData.nombre, nombre: updatedData.nombre,
      rut: updatedData.run, run: updatedData.run,
      diagnosis: updatedData.diagnosticos,
      especialidadTratante: especialidadList,
      destino: updatedData.destino,
      establecimientoRed: updatedData.establecimientoRed,
      otroEstablecimientoDetalle: updatedData.otroEstablecimientoDetalle || '',
      redPrivadaDetalle: updatedData.redPrivadaDetalle || '',
      observaciones: updatedData.observaciones || '',
      _editedAt: new Date().toISOString()
    };

    if (updatedData.dischargeAt) {
      patchPayload.dischargeAt = updatedData.dischargeAt;
      patchPayload.cleaningAt = updatedData.dischargeAt;
      patchPayload.fechaAlta = updatedData.dischargeAt;
    }
    if (updatedData.assignedAt) {
      patchPayload.assignedAt = updatedData.assignedAt;
      patchPayload.admissionDate = updatedData.assignedAt;
      patchPayload.fechaIngreso = updatedData.assignedAt;
    }

    if (docId && onUpdateDischarge) {
      await onUpdateDischarge(docId, patchPayload);
    }
    if (setWaitingListDischarges) {
      setWaitingListDischarges(prev => prev.map(p => (p.id === docId) ? { ...p, ...patchPayload, especialidadTratante: especialidadList } : p));
    }
    if (setDischargesLog) {
      setDischargesLog(prev => prev.map(p => (p.id === docId) ? { ...p, ...patchPayload, especialidadTratante: especialidadList } : p));
    }
    toast.success('Registro de alta actualizado correctamente');
    setEditingRow(null);
  };

  const handleDeleteDischarge = async (roomId, bedId, row) => {
    const patientName = row?.nombre || row?.rawBedData?.patient || 'este paciente';
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el registro de alta de "${patientName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    const docId = row?.id || row?.rawBedData?.id || row?.rawBedData?._logId;

    try {
      if (docId) {
        if (onDeleteDischarge) {
          await onDeleteDischarge(docId);
        } else {
          await deleteFirestoreDoc('discharges', docId);
        }
      }

      if (setWaitingListDischarges && (row?.isWaitingListDischarge || row?._source === 'waitingListDischarges')) {
        setWaitingListDischarges(prev => Array.isArray(prev) ? prev.filter(p => (p.id || p._logId) !== docId) : prev);
      }

      if (setDischargesLog) {
        setDischargesLog(prev => Array.isArray(prev) ? prev.filter(p => (p.id || p._logId) !== docId) : prev);
      }

      // Si el registro proviene de bedsData legacy, limpiar las referencias
      if (setBedsData && bedsData) {
        const raw = row?.rawBedData || {};
        const dischargeTs = raw.cleaningAt || raw.dischargeAt;
        const rawName = (raw.patient || raw.patientName || row.nombre || '').toLowerCase().trim();

        setBedsData(prev => {
          if (!prev || typeof prev !== 'object') return prev;
          const next = JSON.parse(JSON.stringify(prev));
          let modified = false;

          for (const f in next) {
            if (!next[f] || typeof next[f] !== 'object' || Array.isArray(next[f])) continue;
            for (const s in next[f]) {
              if (!Array.isArray(next[f][s])) continue;
              next[f][s] = next[f][s].map(room => {
                let roomChanged = false;
                const newBeds = (room.beds || []).map(b => {
                  let bedChanged = false;
                  const newBed = { ...b };

                  if (Array.isArray(newBed.dischargeHistory)) {
                    const filtered = newBed.dischargeHistory.filter(dh => {
                      if (dh.id && docId && String(dh.id) === String(docId)) return false;
                      const dhTs = dh.cleaningAt || dh.dischargeAt;
                      const dhName = (dh.patient || dh.patientName || '').toLowerCase().trim();
                      if (dischargeTs && dhTs === dischargeTs && rawName && dhName === rawName) return false;
                      return true;
                    });
                    if (filtered.length !== newBed.dischargeHistory.length) {
                      newBed.dischargeHistory = filtered;
                      bedChanged = true;
                    }
                  }

                  if (newBed.previousPatient) {
                    const pp = newBed.previousPatient;
                    const ppTs = pp.cleaningAt || pp.dischargeAt;
                    const ppName = (pp.patient || pp.patientName || '').toLowerCase().trim();
                    if ((pp.id && docId && String(pp.id) === String(docId)) ||
                      (dischargeTs && ppTs === dischargeTs && rawName && ppName === rawName)) {
                      newBed.previousPatient = null;
                      bedChanged = true;
                    }
                  }

                  if (newBed.lastDischarge) {
                    const ld = newBed.lastDischarge;
                    const ldTs = ld.cleaningAt || ld.dischargeAt;
                    const ldName = (ld.patient || ld.patientName || '').toLowerCase().trim();
                    if ((ld.id && docId && String(ld.id) === String(docId)) ||
                      (dischargeTs && ldTs === dischargeTs && rawName && ldName === rawName)) {
                      newBed.lastDischarge = null;
                      bedChanged = true;
                    }
                  }

                  if (bedChanged) roomChanged = true;
                  return newBed;
                });

                if (roomChanged) {
                  modified = true;
                  return { ...room, beds: newBeds };
                }
                return room;
              });
            }
          }
          return modified ? next : prev;
        });
      }

      toast.success('Registro de alta eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar registro de alta:', error);
      toast.error('Error al eliminar el registro de alta');
    }
  };

  return (
    <div className="database-panel-container printable-area">
      <div className="database-header hide-on-print" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(52, 211, 153, 0.1) 100%)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="db-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Calendar size={24} color="#10b981" />
          </div>
          <div>
            <h2 className="db-title" style={{ color: '#10b981' }}>Base de Datos de Altas</h2>
            <p className="db-subtitle">
              {hasDateRange
                ? `Exportación y revisión de pacientes con alta previa (${filteredData.length} registros cargados)`
                : 'Seleccione un periodo de fechas (Desde - Hasta) para consultar los registros'}
            </p>
          </div>
        </div>

        <div className="db-actions hide-on-print" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="date-filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Periodo:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}
            />
            <span style={{ color: 'var(--text-muted)' }}>-</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none' }}
            />
            <span style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />
            <button
              onClick={() => { setStartDate(todayStr); setEndDate(todayStr); }}
              title="Ver solo las altas de hoy"
              style={{
                background: startDate === todayStr && endDate === todayStr
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'rgba(16,185,129,0.12)',
                color: '#10b981',
                border: '1px solid rgba(16,185,129,0.35)',
                borderRadius: '6px',
                padding: '2px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              Hoy
            </button>
            <button
              onClick={() => {
                const now = new Date();
                const y = now.getFullYear();
                const m = String(now.getMonth() + 1).padStart(2, '0');
                const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
                setStartDate(`${y}-${m}-01`);
                setEndDate(`${y}-${m}-${lastDay}`);
              }}
              title="Ver altas de este mes"
              style={{
                background: 'rgba(16,185,129,0.08)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '2px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              Este mes
            </button>
            {hasDateRange && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                title="Limpiar periodo"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Limpiar
              </button>
            )}
          </div>
          <div className="search-container" style={{ margin: 0 }}>
            <Search size={16} color="var(--text-secondary)" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar en altas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className="glass-button primary"
            onClick={handleExportExcel}
            disabled={!hasDateRange || filteredData.length === 0}
            style={{
              background: (!hasDateRange || filteredData.length === 0) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #10b981, #059669)',
              opacity: (!hasDateRange || filteredData.length === 0) ? 0.5 : 1,
              cursor: (!hasDateRange || filteredData.length === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            <Download size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="database-table-wrapper glass-panel printable-table-wrapper">
        <table className="db-table">
          <thead>
            <tr>
              <th>SERVICIO</th>
              <th>SALA</th>
              <th>CAMA</th>
              <th>ESTADA</th>
              <th>FECHA INGRESO</th>
              <th style={{ color: '#10b981' }}>FECHA ALTA</th>
              <th>PRECAUCIONES</th>
              <th>NOMBRE</th>
              <th>RUN</th>
              <th>EDAD</th>
              <th>DIAGNÓSTICOS</th>
              <th>ESPECIALIDAD TRATANTE</th>
              <th>ACTUALIZACIÓN</th>
              <th>COMUNA</th>
              {isAdminOrGestor && <th style={{ textAlign: 'center' }}>ACCIONES</th>}
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{row.servicio}</td>
                  <td>{row.sala}</td>
                  <td>{row.cama}</td>
                  <td style={{ fontWeight: 700, color: '#10b981' }}>{row.estada}</td>
                  <td>{row.fechaIngreso}</td>
                  <td style={{ fontWeight: 700, color: '#10b981' }}>{row.fechaAlta}</td>
                  <td>
                    {row.precauciones !== 'Ninguna' ? (
                      <span className="badge-precaucion">{row.precauciones}</span>
                    ) : 'Ninguna'}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {row.nombre}
                    {row.isWaitingListDischarge && (
                      <span className="badge-prev-discharge" style={{
                        marginLeft: '8px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        display: 'inline-block',
                        whiteSpace: 'nowrap'
                      }}>
                        alta previa a asignación de cama
                      </span>
                    )}
                  </td>
                  <td>{row.run}</td>
                  <td>{row.edad}</td>
                  <td className="cell-truncate" title={row.diagnosticos}>{row.diagnosticos}</td>
                  <td>{row.especialidades}</td>
                  <td className="cell-actualizacion">
                    <ActualizacionPill actualizacion={row.actualizacion} />
                  </td>
                  <td>{row.comuna}</td>
                  {isAdminOrGestor && (
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        className="glass-button secondary"
                        onClick={() => setEditingRow(row)}
                        style={{ padding: '4px 8px', marginRight: '4px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                        title="Editar Alta"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="glass-button secondary"
                        onClick={() => handleRevokeDischarge(row.sala, row.cama, row)}
                        style={{ padding: '4px 8px', marginRight: isAdmin ? '4px' : '0', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                        title="Revocar Alta (Deshacer)"
                      >
                        <RotateCcw size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          className="glass-button secondary"
                          onClick={() => handleDeleteDischarge(row.sala, row.cama, row)}
                          style={{ padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                          title="Eliminar Registro de Alta"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            ) : !hasDateRange ? (
              <tr>
                <td colSpan={isAdminOrGestor ? 15 : 14} className="db-empty" style={{ padding: '60px 16px', textAlign: 'center' }}>
                  <Calendar size={42} color="#10b981" style={{ opacity: 0.6, margin: '0 auto 14px', display: 'block' }} />
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                    Seleccione un periodo de fechas
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.5 }}>
                    Ingrese la fecha <strong>Desde</strong> y <strong>Hasta</strong> en el panel superior (o use los accesos rápidos como "Hoy" o "Este mes") para cargar y consultar los registros de altas.
                  </div>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={isAdminOrGestor ? 15 : 14} className="db-empty" style={{ padding: '40px 16px', textAlign: 'center' }}>
                  No se encontraron registros de altas para el periodo seleccionado ({startDate} al {endDate}).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingRow && (
        <EditAltaModal
          row={editingRow}
          onClose={() => setEditingRow(null)}
          onSave={(data) => handleSaveEdit(editingRow.sala, editingRow.cama, data)}
        />
      )}
    </div>
  );
}
