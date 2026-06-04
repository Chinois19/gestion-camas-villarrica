import { useState, useMemo } from 'react';
import { Database, Search, Download, Filter, Printer, Calendar, Edit2, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import './DatabasePanel.css';

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
    'Hospital de Nueva Imperial', 'Hospital de Lautaro'
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
              <select className="glass-input" name="establecimientoRed" value={formData.establecimientoRed} onChange={handleChange} style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}>
                <option value="">-- Seleccione establecimiento --</option>
                {Object.entries(ESTABLECIMIENTOS_RED).map(([cat, list]) => (
                  <optgroup key={cat} label={cat}>
                    {list.map(h => <option key={h} value={h}>{h}</option>)}
                  </optgroup>
                ))}
              </select>
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

export default function DischargesDatabasePanel({ bedsData, setBedsData, userRole }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [editingRow, setEditingRow] = useState(null);

  const isAdminOrGestor = userRole === 'superadmin' || userRole === 'administrador' || userRole === 'gestor_camas';

  const patientsData = useMemo(() => {
    const data = [];
    const floors = Object.keys(bedsData || {}).sort((a, b) => a.localeCompare(b));
    floors.forEach(floor => {
      const sectors = Object.keys(bedsData[floor] || {}).sort((a, b) => {
        if (a.toLowerCase() === 'poniente') return -1;
        if (b.toLowerCase() === 'poniente') return 1;
        return a.localeCompare(b);
      });
      sectors.forEach(sector => {
        const rooms = [...(bedsData[floor][sector] || [])].sort((a, b) => 
          String(b.roomId).localeCompare(String(a.roomId), undefined, { numeric: true })
        );
        rooms.forEach(room => {
          const beds = [...(room.beds || [])].sort((a, b) => 
            String(b.id).localeCompare(String(a.id), undefined, { numeric: true })
          );
          beds.forEach(bed => {
            // Include patients who have a previous patient (an 'alta' logged)
            const p = bed.previousPatient || bed.lastDischarge;
            if (p) {
              // Normalize data
              
              // Helper for diagnoses
              let dxList = [];
              if (p.diagnosis) {
                if (Array.isArray(p.diagnosis)) {
                  dxList = [...dxList, ...p.diagnosis];
                } else {
                  dxList.push(p.diagnosis);
                }
              }
              if (p.dxPrincipal) dxList.push(p.dxPrincipal);
              if (p.diagnostics && Array.isArray(p.diagnostics)) {
                dxList = [...dxList, ...p.diagnostics];
              }
              const uniqueDx = [...new Set(dxList.filter(Boolean))].join(' | ');

              // Helper for specialties
              let specs = [];
              if (p.especialidadTratante) {
                if (Array.isArray(p.especialidadTratante)) {
                  specs = [...specs, ...p.especialidadTratante];
                } else {
                  specs.push(p.especialidadTratante);
                }
              }
              if (p.specialty) specs.push(p.specialty);
              if (p.specialties && Array.isArray(p.specialties)) {
                specs = [...specs, ...p.specialties];
              }
              const uniqueSpecs = [...new Set(specs.filter(Boolean))].join(', ');

              // Helper for precautions
              let precautions = [];
              if (p.aislamiento) {
                if (Array.isArray(p.aislamiento)) {
                  precautions = [...p.aislamiento];
                } else {
                  precautions = [p.aislamiento];
                }
              } else if (p.precautions) {
                if (Array.isArray(p.precautions)) {
                  precautions = p.precautions;
                } else if (typeof p.precautions === 'string') {
                  precautions = [p.precautions];
                }
              }
              const precStr = precautions.length > 0 ? precautions.join(', ') : 'Ninguna';

              // Format date
              const formatDateTime = (isoString) => {
                if (!isoString) return '—';
                try {
                  const date = new Date(isoString);
                  if (isNaN(date.getTime())) return isoString;
                  return date.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                } catch {
                  return isoString;
                }
              };

              // Discharge Date
              const dischargeDateObj = p.cleaningAt ? new Date(p.cleaningAt) : new Date();
              const fechaAlta = formatDateTime(p.cleaningAt || p.assignedAt);

              // Calculate LOS (Days of Stay)
              let estada = '—';
              const admDate = p.admissionDate || p.assignedAt;
              if (admDate) {
                try {
                  const date = new Date(admDate);
                  if (!isNaN(date.getTime())) {
                    const diffTime = Math.abs(dischargeDateObj - date);
                    estada = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + ' días';
                  }
                } catch (e) {}
              }

              // Build Actualizacion (Evoluciones + Novedades)
              let updates = [];
              if (p.evolutions && Array.isArray(p.evolutions)) {
                p.evolutions.forEach(ev => {
                  if (ev.note) {
                    updates.push({
                      texto: `Evolución: ${ev.note}`,
                      fecha: formatDateToDDMMYYYY(ev.timestamp),
                      rawDate: parseEntryDate(ev)
                    });
                  }
                });
              }
              if (p.novedades && Array.isArray(p.novedades)) {
                p.novedades.forEach(nov => {
                  if (nov.contenido) {
                    updates.push({
                      texto: nov.contenido,
                      fecha: formatDateToDDMMYYYY(nov.fecha),
                      rawDate: parseEntryDate(nov)
                    });
                  }
                });
              }
              // Sort descending by rawDate (newest first)
              updates.sort((a, b) => b.rawDate - a.rawDate);

              if (updates.length === 0) {
                const fallbackDate = p.updatedAt || p.assignedAt;
                updates.push({
                  texto: 'Ingreso registrado',
                  fecha: formatDateToDDMMYYYY(fallbackDate),
                  rawDate: fallbackDate ? new Date(fallbackDate) : new Date()
                });
              }

              // Servicio de acueste is destination unit requested/saved (bed.destino) falling back to bed tag/type
              const servicioAcueste = p.destino || bed.destino || bed.tag || bed.type || 'No definido';

              data.push({
                rawBedData: p,
                rawDischargeDate: dischargeDateObj,
                servicio: servicioAcueste,
                estada: estada,
                sala: room.roomId,
                cama: bed.id,
                fechaIngreso: formatDateTime(admDate),
                fechaAlta: fechaAlta,
                precauciones: precStr,
                nombre: p.patient || p.patientName || p.nombre || 'Desconocido',
                run: p.rut || '—',
                edad: p.age || p.edad || '—',
                diagnosticos: uniqueDx || 'No registrado',
                especialidades: uniqueSpecs || 'No asignada',
                actualizacion: updates,
                comuna: p.comuna || '—'
              });
            }
          });
        });
      });
    });
    return data;
  }, [bedsData]);

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
        return dDate >= start && dDate <= end;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(row => 
        Object.entries(row).some(([key, val]) => {
          if (key === 'rawDischargeDate') return false;
          if (key === 'actualizacion' && Array.isArray(val)) {
            return val.some(act => 
              act.texto.toLowerCase().includes(lowerSearch) || 
              act.fecha.toLowerCase().includes(lowerSearch)
            );
          }
          return String(val).toLowerCase().includes(lowerSearch);
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
      row.nombre || '',
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
    if (!window.confirm(`¿Estás seguro de que deseas revocar el alta y volver a acostar al paciente en la cama ${bedId}?`)) return;

    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let handled = false;
      for (const f of ['piso4', 'piso3', 'piso2']) {
        if (!next[f]) continue;
        for (const s in next[f]) {
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
      if (!handled) alert("No se pudo encontrar el registro de alta para restaurar.");
      return next;
    });
  };

  const handleSaveEdit = (roomId, bedId, updatedData) => {
    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const f of ['piso4', 'piso3', 'piso2']) {
        if (!next[f]) continue;
        for (const s in next[f]) {
          next[f][s] = next[f][s].map(room => {
            if (room.roomId === roomId) {
              return {
                ...room,
                beds: room.beds.map(b => {
                  if (b.id === bedId) {
                    const target = b.previousPatient || b.lastDischarge;
                    if (target) {
                       target.patient = updatedData.nombre;
                       target.rut = updatedData.run;
                       target.diagnosis = updatedData.diagnosticos;
                       target.destino = updatedData.destino;
                       target.establecimientoRed = updatedData.establecimientoRed;
                       target.redPrivadaDetalle = updatedData.redPrivadaDetalle;
                       target.observaciones = updatedData.observaciones;
                       if (b.previousPatient) b.previousPatient = target;
                       if (b.lastDischarge) b.lastDischarge = target;
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
      return next;
    });
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
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.nombre}</td>
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
