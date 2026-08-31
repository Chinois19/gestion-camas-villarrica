import { useState, useMemo } from 'react';
import { Database, Search, Download, Filter, Printer, Calendar, Edit2, RotateCcw, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import './DatabasePanel.css';
import { matchesSearch } from '../utils/search';
import { formatAgeDetailed } from '../utils/age';
import { deleteFirestoreDoc } from '../hooks/useFirestoreCollection';
import { toast } from 'sonner';

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
  } catch (e) {}
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
  { id: 'Domicilio',                      label: 'Domicilio',                      icon: '🏠' },
  { id: 'Hospitalización domiciliaria',   label: 'Hospitalización domiciliaria',   icon: '🏥' },
  { id: 'Otro establecimiento',           label: 'Otro establecimiento',           icon: '🏨' },
  { id: 'Red Privada',                    label: 'Red Privada',                    icon: '🏢' },
  { id: 'Alta administrativa',            label: 'Alta administrativa',            icon: '📋' },
  { id: 'Fuga',                           label: 'Fuga',                           icon: '🚶' },
  { id: 'Fallecido',                      label: 'Fallecido',                      icon: '✝️' },
];

const EditAltaModal = ({ row, onClose, onSave }) => {
  const p = row.rawBedData || {};
  const [formData, setFormData] = useState({
    nombre: p.patient || p.patientName || p.nombre || row.nombre || '',
    run: p.rut || row.run || '',
    diagnosticos: Array.isArray(p.diagnosis) ? p.diagnosis.join(' | ') : (p.diagnosis || row.diagnosticos || ''),
    destino: p.destino || '',
    establecimientoRed: p.establecimientoRed || '',
    otroEstablecimientoDetalle: p.otroEstablecimientoDetalle || '',
    redPrivadaDetalle: p.redPrivadaDetalle || '',
    observaciones: p.observaciones || ''
  });

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-content glass-panel" style={{ width: 'min(96vw, 600px)', maxHeight: '90vh', overflowY: 'auto', padding: 24, background: 'var(--panel-bg)', border: '1px solid var(--glass-border)', borderRadius: 16 }}>
        <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Editar Registro de Alta</h3>
        <p style={{ fontSize: '0.85rem', color: '#10b981', margin: '0 0 16px 0', fontWeight: 600 }}>Hab {row.sala} - Cama {row.cama}</p>
        
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
          <button className="glass-button primary" onClick={() => onSave(formData)} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #10b981, #059669)' }}>Guardar Cambios</button>
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
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [editingRow, setEditingRow] = useState(null);

  const isAdmin = userRole === 'superadmin' || userRole === 'administrador' || userRole === 'admin';
  const isAdminOrGestor = isAdmin || userRole === 'gestor_camas';

  // Usar discharges prioritariamente, con fallback a dischargesLog
  const rawDischargesList = (Array.isArray(discharges) && discharges.length > 0)
    ? discharges
    : (Array.isArray(dischargesLog) ? dischargesLog : []);

  const patientsData = useMemo(() => {
    const data = [];
    const seenLogIds = new Set();
    const seenKeys  = new Set();
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
      const uniqueSpecs = [...new Set(specs.filter(Boolean))].join(', ');

      let precautions = [];
      if (p.aislamiento) {
        if (Array.isArray(p.aislamiento)) precautions = [...p.aislamiento];
        else precautions = [p.aislamiento];
      }
      const precStr = precautions.length > 0 ? precautions.join(', ') : 'Ninguna';

      const dischargeTimestamp = p.cleaningAt || p.dischargeAt || null;
      const dischargeDateObj   = dischargeTimestamp ? new Date(dischargeTimestamp) : null;
      const fechaAlta          = formatDateTime(dischargeTimestamp);
      const admDate            = p.admissionDate || p.assignedAt || p.createdAt;

      let estada = meta.estada || '—';
      if (admDate && dischargeDateObj && !meta.estada) {
        try {
          const d = new Date(admDate);
          if (!isNaN(d.getTime()) && !isNaN(dischargeDateObj.getTime()))
            estada = Math.ceil(Math.abs(dischargeDateObj - d) / 86400000) + ' días';
        } catch (e) {}
      }

      let updates = [];
      (p.evolutions || []).forEach(ev => {
        if (ev.note) updates.push({ texto: `Evolución: ${ev.note}`, fecha: formatDateToDDMMYYYY(ev.timestamp), rawDate: parseEntryDate(ev) });
      });
      // De la colección procedures
      if (Array.isArray(procedures)) {
        const patientRut = (p.rut || p.run || '').replace(/[^0-9kK]/g, '').toLowerCase();
        const matchedProcs = procedures.filter(pr => {
          if (p.bedId && pr.bedId && pr.bedId === p.bedId) return true;
          const prRut = (pr.rut || '').replace(/[^0-9kK]/g, '').toLowerCase();
          if (patientRut && prRut && patientRut === prRut) return true;
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
      const ts     = p.cleaningAt || p.dischargeAt || '';
      const key    = dupKey(nombre, ts);
      if (p._logId) seenLogIds.add(p._logId);
      if (p.id) seenLogIds.add(p.id);
      seenKeys.add(key);

      data.push(buildRow(p, {
        sala:    p.habitacion || p.roomId || '—',
        cama:    p.cama || p.bedId || '—',
        bedType: p.bedType || '—',
        isWaiting: p._source === 'waitingList' || p.isWaitingListDischarge,
        source:  'discharges',
        estada:  (p._source === 'waitingList' || p.isWaitingListDischarge) ? 'Alta previa a asignación' : undefined
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
              const ts     = p.cleaningAt || p.dischargeAt || '';
              const key    = dupKey(nombre, ts);
              if (seenKeys.has(key)) return;
              seenKeys.add(key);
              data.push(buildRow(p, {
                sala:    room.roomId,
                cama:    bed.id,
                bedType: bed.tag || bed.type || '',
                source:  'legacy_bed'
              }));
            });
          });
        });
      });
    });

    if (Array.isArray(waitingListDischarges)) {
      waitingListDischarges.forEach(p => {
        const nombre = p.patient || p.patientName || p.nombre || '';
        const ts     = p.dischargeAt || '';
        const key    = dupKey(nombre, ts);
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
          if (Array.isArray(p.diagnosis)) dxList = [...p.diagnosis];
          else dxList.push(p.diagnosis);
        }
        const uniqueDx = [...new Set(dxList.filter(Boolean))].join(' | ');

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
          especialidades: 'No asignada',
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
    let result = patientsData;
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(row => {
        const dDate = row.rawDischargeDate;
        if (!dDate) return true;
        return dDate >= start && dDate <= end;
      });
    }
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
  }, [patientsData, searchTerm, startDate, endDate]);

  const handleExportExcel = () => {
    if (filteredData.length === 0) return;
    const headers = [
      'SERVICIO', 'SALA', 'CAMA', 'ESTADA', 'FECHA INGRESO', 'FECHA ALTA', 'PRECAUCIONES', 'NOMBRE', 'RUN', 'EDAD', 'DIAGNÓSTICOS', 'ESPECIALIDADES', 'DESTINO', 'ESTABLECIMIENTO RED', 'RED PRIVADA DETALLE', 'OBSERVACIONES', 'ACTUALIZACIONES'
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

  const handleRevokeDischarge = async (roomId, bedId, row) => {
    const docId = row?.id || row?.rawBedData?.id || row?.rawBedData?._logId;
    if (roomId === 'Espera' || row?.isWaitingListDischarge) {
      if (!window.confirm(`¿Estás seguro de que deseas revocar el alta y volver a colocar al paciente en la lista de espera?`)) return;
      if (docId && onUpdateDischarge) await onUpdateDischarge(docId, { _reverted: true, _revertedAt: new Date().toISOString() });
      if (setWaitingListDischarges) setWaitingListDischarges(prev => prev.filter(p => (p.id || p._logId) !== docId));
      if (setWaitingList) {
        setWaitingList(prev => {
          const rawId = row?.rawBedData?.id;
          const waitId = (typeof rawId === 'string' && rawId.startsWith('wait_dis_'))
            ? rawId.replace('wait_dis_', '')
            : (rawId || bedId || `wait_${Date.now()}`);
          if (prev.some(p => p.id === waitId || p.id === rawId || p.id === bedId)) return prev;
          return [...prev, {
            id: waitId,
            name: row.nombre || row?.rawBedData?.patient || 'Paciente',
            rut: row.run || row?.rawBedData?.rut || '',
            diagnosis: row.diagnosticos || row?.rawBedData?.diagnosis || '',
            age: row.edad || row?.rawBedData?.age || '',
            status: 'waiting'
          }];
        });
      }
      toast.success(`Alta revocada`);
      return;
    }
    if (!window.confirm(`¿Estás seguro de que deseas revocar el alta y volver a acostar al paciente en la cama ${bedId}?`)) return;
    if (docId && onUpdateDischarge) await onUpdateDischarge(docId, { _reverted: true, _revertedAt: new Date().toISOString() });

    // Filtrar campos de alta para no contaminar el objeto cama ni sobreescribir el id de la cama
    const raw = row?.rawBedData || {};
    const {
      id: _ignoredDischargeId,
      _dischargeId,
      _logId,
      _loggedAt,
      _source,
      _reverted,
      _revertedAt,
      destino,
      establecimientoRed,
      otroEstablecimientoDetalle,
      redPrivadaDetalle,
      observaciones,
      dischargeAt,
      isWaitingListDischarge,
      habitacion,
      cama,
      piso,
      sector,
      migratedAt,
      ...cleanPatientData
    } = raw;

    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const f in next) {
        if (!next[f] || typeof next[f] !== 'object' || Array.isArray(next[f])) continue;
        for (const s in next[f]) {
          if (!Array.isArray(next[f][s])) continue;
          next[f][s] = next[f][s].map(room => {
            if (String(room.roomId) === String(roomId)) {
              return {
                ...room,
                beds: room.beds.map((b, idx) => {
                  const isTarget = String(b.id) === String(bedId) ||
                    (b.cama && String(b.cama) === String(bedId)) ||
                    (docId && String(b.id) === String(docId));
                  if (!isTarget) return b;

                  // Preservar ID real de la cama (no usar dis_...)
                  const cleanBedId = (typeof b.id === 'string' && !b.id.startsWith('dis_') && !b.id.startsWith('wait_'))
                    ? b.id
                    : (b.cama || bedId || String(idx + 1));

                  return {
                    ...b,
                    ...cleanPatientData,
                    id: cleanBedId,
                    patient: row.nombre || cleanPatientData.patient || cleanPatientData.patientName,
                    rut: row.run || cleanPatientData.rut,
                    status: 'occupied',
                    cleaningAt: null,
                    previousPatient: null,
                    lastDischarge: null,
                    dischargeHistory: []
                  };
                })
              };
            }
            return room;
          });
        }
      }
      return next;
    });
    toast.success(`Alta de la cama ${bedId} revocada`);
  };

  const handleSaveEdit = async (roomId, bedId, updatedData) => {
    const docId = editingRow?.id;
    if (docId && onUpdateDischarge) {
      await onUpdateDischarge(docId, {
        patient: updatedData.nombre, patientName: updatedData.nombre, nombre: updatedData.nombre,
        rut: updatedData.run, run: updatedData.run,
        diagnosis: updatedData.diagnosticos,
        destino: updatedData.destino,
        establecimientoRed: updatedData.establecimientoRed,
        otroEstablecimientoDetalle: updatedData.otroEstablecimientoDetalle || '',
        redPrivadaDetalle: updatedData.redPrivadaDetalle || '',
        observaciones: updatedData.observaciones || '',
        _editedAt: new Date().toISOString()
      });
    }
    if (setWaitingListDischarges) setWaitingListDischarges(prev => prev.map(p => (p.id === docId) ? {...p, ...updatedData} : p));
    if (setDischargesLog) setDischargesLog(prev => prev.map(p => (p.id === docId) ? {...p, ...updatedData} : p));
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
            <p className="db-subtitle">Exportación y revisión de pacientes con alta previa ({filteredData.length} registros)</p>
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
          <button className="glass-button primary" onClick={handleExportExcel} style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
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
              <th>ESPECIALIDADES</th>
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
                  <td className="cell-actualizacion" title={
                    Array.isArray(row.actualizacion)
                      ? row.actualizacion.map(act => `${act.texto} [${act.fecha}]`).join('\n')
                      : row.actualizacion
                  }>
                    {Array.isArray(row.actualizacion) ? (
                      row.actualizacion.map((act, idx) => (
                        <div key={idx} className="actualizacion-row">
                          <span className="actualizacion-text">{act.texto}</span>
                          <span className="actualizacion-date">{act.fecha}</span>
                        </div>
                      ))
                    ) : (
                      row.actualizacion
                    )}
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
            ) : (
              <tr>
                <td colSpan={isAdminOrGestor ? 15 : 14} className="db-empty">
                  No se encontraron registros de altas para este periodo o búsqueda.
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
