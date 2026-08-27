import { useState, useMemo } from 'react';
import { Database, Search, Download, Filter, Printer, Calendar, Edit2, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import './DatabasePanel.css';
import { matchesSearch } from '../utils/search';
import { formatAgeDetailed } from '../utils/age';
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

export default function DischargesDatabasePanel({ bedsData, setBedsData, waitingListDischarges, setWaitingListDischarges, dischargesLog, setDischargesLog, setWaitingList, userRole }) {
  const [searchTerm, setSearchTerm] = useState('');
  const currentYear = new Date().getFullYear();
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
  const [editingRow, setEditingRow] = useState(null);

  const isAdminOrGestor = userRole === 'superadmin' || userRole === 'administrador' || userRole === 'gestor_camas';

  const patientsData = useMemo(() => {
    const data = [];
    // Rastrear _logId y clave nombre+fecha para evitar duplicados entre fuentes
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
      const admDate            = p.admissionDate || p.assignedAt;

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
      (p.novedades || []).forEach(nov => {
        if (nov.contenido) updates.push({ texto: nov.contenido, fecha: formatDateToDDMMYYYY(nov.fecha), rawDate: parseEntryDate(nov) });
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
        rawBedData: p,
        rawDischargeDate: dischargeDateObj,
        servicio: servicioAcueste,
        estada,
        sala: meta.sala || '—',
        cama: meta.cama || '—',
        fechaIngreso: formatDateTime(admDate),
        fechaAlta,
        precauciones: precStr,
        nombre: p.patient || p.patientName || p.nombre || 'Desconocido',
        run: p.rut || '—',
        edad: formatAgeDetailed(p.fechaNacimiento, p.age || p.edad),
        diagnosticos: uniqueDx || 'No registrado',
        especialidades: uniqueSpecs || 'No asignada',
        actualizacion: updates,
        comuna: p.comuna || '—',
        isWaitingListDischarge: meta.isWaiting || false,
        _source: meta.source || 'legacy'
      };
    };

    // ── FUENTE 1: dischargesLog — log permanente (episodios desde alta confirmada) ──
    // Fuente de verdad para todos los episodios registrados a partir de ahora.
    const logArr = Array.isArray(dischargesLog) ? dischargesLog : [];
    logArr.forEach(p => {
      if (p._reverted) return;
      const nombre = p.patient || p.patientName || p.nombre || '';
      const ts     = p.cleaningAt || p.dischargeAt || '';
      const key    = dupKey(nombre, ts);
      if (p._logId) seenLogIds.add(p._logId);
      seenKeys.add(key);

      data.push(buildRow(p, {
        sala:    p.habitacion || '—',
        cama:    p.cama || '—',
        bedType: p.bedType || '—',
        isWaiting: p._source === 'waitingList',
        source:  'dischargesLog',
        estada:  p._source === 'waitingList' ? 'Alta previa a asignación' : undefined
      }));
    });

    // ── FUENTE 2: bedsData — backfill legacy (previousPatient recursivo + dischargeHistory) ──
    // Cubre todos los episodios anteriores a la implementación del log permanente.
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
              // Saltar si ya fue agregado desde dischargesLog
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

    // ── FUENTE 3: waitingListDischarges — altas desde lista de espera (legacy) ──
    // Las nuevas ya van al dischargesLog; esto cubre las anteriores.
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
  }, [bedsData, waitingListDischarges, dischargesLog]);

  const filteredData = useMemo(() => {
    let result = patientsData;

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter(row => {
        const dDate = row.rawDischargeDate;
        // Si no hay fecha de alta registrada, incluir el registro siempre (no filtrarlo)
        if (!dDate) return true;
        return dDate >= start && dDate <= end;
      });
    }

    // Filter by search term
    if (searchTerm) {
      result = result.filter(row => 
        Object.entries(row).some(([key, val]) => {
          if (key === 'rawDischargeDate') return false;
          if (key === 'actualizacion' && Array.isArray(val)) {
            return val.some(act => 
              matchesSearch(act.texto, searchTerm) || 
              matchesSearch(act.fecha, searchTerm)
            );
          }
          return matchesSearch(String(val), searchTerm);
        })
      );
    }
    
    // Sort descending by discharge date
    return result.sort((a, b) => b.rawDischargeDate - a.rawDischargeDate);
  }, [patientsData, searchTerm, startDate, endDate]);

  const handleExportExcel = () => {
    if (filteredData.length === 0) return;
    
    const headers = [
      'SERVICIO DE ACUESTE',
      'SALA',
      'CAMA',
      'ESTADA',
      'FECHA INGRESO',
      'FECHA ALTA',
      'PRECAUCIONES',
      'NOMBRE',
      'RUN',
      'EDAD',
      'DIAGNÓSTICOS',
      'ESPECIALIDADES',
      'ACTUALIZACIÓN',
      'COMUNA'
    ];
    
    const rows = filteredData.map(row => [
      row.servicio || '',
      row.sala || '',
      row.cama || '',
      row.estada || '',
      row.fechaIngreso || '',
      row.fechaAlta || '',
      row.precauciones || '',
      row.nombre + (row.isWaitingListDischarge ? ' (Alta previa a asignación de cama)' : ''),
      row.run || '',
      row.edad || '',
      row.diagnosticos || '',
      row.especialidades || '',
      Array.isArray(row.actualizacion)
        ? row.actualizacion.map(act => `${act.texto}   ${act.fecha}`).join('\n')
        : (row.actualizacion || ''),
      row.comuna || ''
    ]);
    
    // Crear la hoja y el libro de Excel
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Altas");
    
    // Auto-ajuste de ancho de columnas básico
    const wscols = headers.map(() => ({ wch: 20 }));
    wscols[7].wch = 35; // Nombre
    wscols[10].wch = 50; // Diagnósticos
    wscols[11].wch = 30; // Especialidades
    wscols[12].wch = 60; // Actualización
    ws['!cols'] = wscols;

    // Exportar archivo físico
    XLSX.writeFile(wb, `Base_de_Datos_Altas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleRevokeDischarge = (roomId, bedId) => {
    if (roomId === 'Espera') {
      if (!window.confirm(`¿Estás seguro de que deseas revocar el alta y volver a colocar al paciente en la lista de espera?`)) return;
      
      const targetDischarge = waitingListDischarges?.find(p => p.id === bedId);
      if (!targetDischarge) {
        alert("No se pudo encontrar el registro de alta para restaurar.");
        return;
      }

      // 1. Remove from waitingListDischarges
      if (setWaitingListDischarges) {
        setWaitingListDischarges(prev => {
          const arr = Array.isArray(prev) ? prev : [];
          return arr.filter(p => p.id !== bedId);
        });
      }

      // 2. Add back to waitingList
      if (setWaitingList) {
        setWaitingList(prev => {
          if (prev.some(p => p.id === bedId)) return prev;
          const restoredPatient = {
            id: targetDischarge.id,
            name: targetDischarge.patient,
            rut: targetDischarge.rut,
            age: targetDischarge.age,
            sexo: targetDischarge.sex,
            prevision: targetDischarge.prevision,
            diagnosis: targetDischarge.diagnosis,
            requestedAt: targetDischarge.requestedAt || new Date().toISOString(),
            status: 'waiting'
          };
          return [...prev, restoredPatient];
        });
      }
      toast.success(`Alta de ${targetDischarge.patient} revocada; paciente restaurado a lista de espera`);
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas revocar el alta y volver a acostar al paciente en la cama ${bedId}?`)) return;

    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let handled = false;
      for (const f of Object.keys(next)) {
        if (!next[f] || typeof next[f] !== 'object' || Array.isArray(next[f])) continue;
        for (const s in next[f]) {
          if (!Array.isArray(next[f][s])) continue;
          next[f][s] = next[f][s].map(room => {
            if (room.roomId === roomId) {
              return {
                ...room,
                beds: room.beds.map(b => {
                  if (b.id === bedId) {
                    if (b.patient) {
                      alert(`No se puede revocar el alta porque la cama ${bedId} ya está ocupada por otro paciente.`);
                      return b;
                    }
                    if (b.previousPatient || b.lastDischarge) {
                      const restoredBed = { ...(b.previousPatient || b.lastDischarge), status: 'occupied', cleaningAt: null };
                      delete restoredBed.previousPatient;
                      delete restoredBed.lastDischarge;
                      if (!restoredBed.interconsultas) restoredBed.interconsultas = [];
                      // Marcar el alta más reciente como revertida; el historial se conserva pero se oculta en el panel
                      restoredBed.dischargeHistory = (b.dischargeHistory || []).map((rec, idx) =>
                        idx === 0 ? { ...rec, _reverted: true, _revertedAt: new Date().toISOString() } : rec
                      );
                      handled = true;
                      return restoredBed;
                    }
                  }
                  return b;
                })
              };
            }
            return room;
          });
        }
      }
      if (!handled) {
        toast.error("No se pudo encontrar el registro de alta para restaurar.");
        alert("No se pudo encontrar el registro de alta para restaurar.");
      } else {
        toast.success(`Alta de la cama ${bedId} revocada; paciente restaurado`);
      }
      return next;
    });
  };

  const handleSaveEdit = (roomId, bedId, updatedData) => {
    if (roomId === 'Espera') {
      if (setWaitingListDischarges) {
        setWaitingListDischarges(prev => {
          const arr = Array.isArray(prev) ? prev : [];
          return arr.map(p => {
            if (p.id === bedId) {
              return {
                ...p,
                patient: updatedData.nombre,
                rut: updatedData.run,
                diagnosis: updatedData.diagnosticos,
                destino: updatedData.destino,
                establecimientoRed: updatedData.establecimientoRed,
                redPrivadaDetalle: updatedData.redPrivadaDetalle,
                observaciones: updatedData.observaciones
              };
            }
            return p;
          });
        });
      }
      toast.success('Registro de alta actualizado correctamente');
      setEditingRow(null);
      return;
    }

    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      // Identificar el _dischargeId del registro que se está editando (si tiene)
      const targetDischargeId = editingRow?.rawBedData?._dischargeId;

      for (const f of Object.keys(next)) {
        if (!next[f] || typeof next[f] !== 'object' || Array.isArray(next[f])) continue;
        for (const s in next[f]) {
          if (!Array.isArray(next[f][s])) continue;
          next[f][s] = next[f][s].map(room => {
            if (room.roomId === roomId) {
              return {
                ...room,
                beds: room.beds.map(b => {
                  if (b.id === bedId) {
                    const applyEdit = (rec) => ({
                      ...rec,
                      patient: updatedData.nombre,
                      rut: updatedData.run,
                      diagnosis: updatedData.diagnosticos,
                      destino: updatedData.destino,
                      establecimientoRed: updatedData.establecimientoRed,
                      otroEstablecimientoDetalle: updatedData.otroEstablecimientoDetalle || rec.otroEstablecimientoDetalle || '',
                      redPrivadaDetalle: updatedData.redPrivadaDetalle,
                      observaciones: updatedData.observaciones,
                    });

                    // 1. Actualizar dentro de dischargeHistory[] (formato acumulativo)
                    if (Array.isArray(b.dischargeHistory) && b.dischargeHistory.length > 0) {
                      b.dischargeHistory = b.dischargeHistory.map(rec => {
                        // Coincidir por _dischargeId si existe, de lo contrario actualizar el primero no revertido
                        if (targetDischargeId) {
                          return rec._dischargeId === targetDischargeId ? applyEdit(rec) : rec;
                        }
                        // Fallback: editar el primer registro no revertido
                        if (!rec._reverted && !rec._edited) {
                          rec._edited = true; // marcar para no editar dos veces en la misma pasada
                          return applyEdit(rec);
                        }
                        return rec;
                      });
                      // Limpiar la bandera temporal _edited
                      b.dischargeHistory = b.dischargeHistory.map(r => { delete r._edited; return r; });
                    }

                    // 2. Actualizar previousPatient / lastDischarge (formato legacy)
                    if (b.previousPatient) b.previousPatient = applyEdit(b.previousPatient);
                    if (b.lastDischarge)   b.lastDischarge   = applyEdit(b.lastDischarge);
                  }
                  return b;
                })
              };
            }
            return room;
          });
        }
      }
      return next;
    });

    toast.success('Registro de alta actualizado correctamente');
    setEditingRow(null);
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
                        onClick={() => handleRevokeDischarge(row.sala, row.cama)} 
                        style={{ padding: '4px 8px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                        title="Revocar Alta (Deshacer)"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="14" className="db-empty">
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
