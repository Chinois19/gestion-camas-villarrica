import { useState, useMemo } from 'react';
import { Database, Search, Download, Filter, Printer, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import './DatabasePanel.css';
import { matchesSearch } from '../utils/search';
import { formatAgeDetailed } from '../utils/age';

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
  const dateStr = entry.fecha || entry.timestamp || entry.solicitadaAt;
  if (dateStr) {
    const cleaned = dateStr.replace(/-/g, '/');
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
};

export default function DatabasePanel({ bedsData, procedures = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const hasDateRange = Boolean(startDate && endDate);

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
          String(a.roomId).localeCompare(String(b.roomId), undefined, { numeric: true })
        );
        rooms.forEach(room => {
          const beds = [...(room.beds || [])].sort((a, b) => 
            String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
          );
          beds.forEach(bed => {
            if (bed.status === 'occupied' && bed.patient) {
              
              // Normalize data
              const p = bed;
              
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

              // Calculate LOS (Days of Stay)
              let estada = '—';
              const admDate = p.admissionDate || p.assignedAt;
              if (admDate) {
                try {
                  const date = new Date(admDate);
                  if (!isNaN(date.getTime())) {
                    const diffTime = Math.abs(new Date() - date);
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

              // Desde colección procedures
              if (Array.isArray(procedures)) {
                const patientRut = (p.rut || p.run || '').replace(/[^0-9kK]/g, '').toLowerCase();
                const matchedProcs = procedures.filter(pr => {
                  if (pr.bedId && pr.bedId === bed.id) return true;
                  const prRut = (pr.rut || '').replace(/[^0-9kK]/g, '').toLowerCase();
                  if (patientRut && prRut && patientRut === prRut) return true;
                  return false;
                });
                matchedProcs.forEach(nov => {
                  if (nov.contenido || nov.procedimiento) {
                    updates.push({
                      texto: nov.contenido || nov.procedimiento,
                      fecha: formatDateToDDMMYYYY(nov.fecha || nov.createdAt),
                      rawDate: parseEntryDate(nov)
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
              const servicioAcueste = bed.destino || bed.tag || bed.type || 'No definido';
              const admDateObj = admDate ? new Date(admDate) : null;

              data.push({
                servicio: servicioAcueste,
                estada: estada,
                sala: room.roomId,
                cama: bed.id,
                fechaIngreso: formatDateTime(admDate),
                rawAdmissionDate: admDateObj,
                precauciones: precStr,
                nombre: p.patient,
                run: p.rut || '—',
                edad: formatAgeDetailed(p.fechaNacimiento, p.age || p.edad),
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
    if (!startDate || !endDate) return [];

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let result = patientsData.filter(row => {
      const adm = row.rawAdmissionDate;
      if (adm && !isNaN(adm.getTime())) {
        return adm >= start && adm <= end;
      }
      if (row.actualizacion && Array.isArray(row.actualizacion)) {
        return row.actualizacion.some(act => act.rawDate && act.rawDate >= start && act.rawDate <= end);
      }
      return false;
    });

    if (searchTerm) {
      result = result.filter(row => 
        Object.entries(row).some(([key, val]) => {
          if (key === 'rawAdmissionDate') return false;
          if (key === 'actualizacion' && Array.isArray(val)) {
            return val.some(act => 
              matchesSearch(act.texto, searchTerm) || 
              matchesSearch(act.fecha, searchTerm)
            );
          }
          return matchesSearch(String(val || ''), searchTerm);
        })
      );
    }

    return result;
  }, [patientsData, searchTerm, startDate, endDate]);

  const handleExportExcel = () => {
    if (!hasDateRange || filteredData.length === 0) return;
    
    const headers = [
      'SERVICIO DE ACUESTE',
      'SALA',
      'CAMA',
      'FECHA INGRESO',
      'NOMBRE',
      'RUN',
      'DIAGNÓSTICOS',
      'ESPECIALIDADES',
      'ACTUALIZACIÓN',
      'ESTADA',
      'PRECAUCIONES',
      'EDAD',
      'COMUNA'
    ];
    
    const rows = filteredData.map(row => [
      row.servicio || '',
      row.sala || '',
      row.cama || '',
      row.fechaIngreso || '',
      row.nombre || '',
      row.run || '',
      row.diagnosticos || '',
      row.especialidades || '',
      Array.isArray(row.actualizacion)
        ? row.actualizacion.map(act => `${act.texto}   ${act.fecha}`).join('\n')
        : (row.actualizacion || ''),
      row.estada || '',
      row.precauciones || '',
      row.edad || '',
      row.comuna || ''
    ]);
    
    // Crear la hoja y el libro de Excel
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Entrega de Turnos");
    
    // Auto-ajuste de ancho de columnas básico
    const wscols = headers.map(() => ({ wch: 20 }));
    wscols[3].wch = 20; // Fecha Ingreso
    wscols[4].wch = 35; // Nombre
    wscols[5].wch = 35; // RUN
    wscols[6].wch = 50; // Diagnósticos
    wscols[7].wch = 30; // Especialidades
    wscols[8].wch = 60; // Actualización
    wscols[9].wch = 20; // Estada
    wscols[10].wch = 20; // Precauciones
    wscols[11].wch = 20; // Edad
    wscols[12].wch = 20; // Comuna
    ws['!cols'] = wscols;

    // Exportar archivo físico
    XLSX.writeFile(wb, `Entrega_de_Turnos_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Reporte de entrega de turnos exportado a Excel');
  };

  return (
    <div className="database-panel-container printable-area">
      <div className="database-header hide-on-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="db-icon-wrapper">
            <Database size={24} color="var(--accent)" />
          </div>
          <div>
            <h2 className="db-title">Base de Datos Entrega Turnos</h2>
            <p className="db-subtitle">
              {hasDateRange 
                ? `Exportación y revisión de pacientes actualmente en cama (${filteredData.length} registros cargados)`
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
              title="Ver ingresos de hoy"
              style={{
                background: startDate === todayStr && endDate === todayStr ? 'var(--accent)' : 'rgba(0,212,255,0.12)',
                color: startDate === todayStr && endDate === todayStr ? '#000' : 'var(--accent)',
                border: '1px solid var(--accent-border)',
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
              title="Ver ingresos de este mes"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '2px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Este mes
            </button>
            <button
              onClick={() => {
                const y = new Date().getFullYear();
                setStartDate(`${y}-01-01`);
                setEndDate(todayStr);
              }}
              title="Ver todos los pacientes ingresados este año"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '2px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Año Actual
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
              placeholder="Buscar en base de datos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className="glass-button primary" 
            onClick={handleExportExcel}
            disabled={!hasDateRange || filteredData.length === 0}
            style={{ 
              background: (!hasDateRange || filteredData.length === 0) ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
              color: (!hasDateRange || filteredData.length === 0) ? 'var(--text-muted)' : '#000',
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
              <th>SERVICIO DE ACUESTE</th>
              <th>SALA</th>
              <th>CAMA</th>
              <th>ESTADA</th>
              <th>FECHA INGRESO</th>
              <th>PRECAUCIONES</th>
              <th>NOMBRE</th>
              <th>RUN</th>
              <th>EDAD</th>
              <th>DIAGNÓSTICOS</th>
              <th>ESPECIALIDADES</th>
              <th>ACTUALIZACIÓN</th>
              <th>COMUNA</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{row.servicio}</td>
                  <td>{row.sala}</td>
                  <td>{row.cama}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{row.estada}</td>
                  <td>{row.fechaIngreso}</td>
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
                </tr>
              ))
            ) : !hasDateRange ? (
              <tr>
                <td colSpan="13" className="db-empty" style={{ padding: '60px 16px', textAlign: 'center' }}>
                  <Calendar size={42} color="var(--accent)" style={{ opacity: 0.6, margin: '0 auto 14px', display: 'block' }} />
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                    Seleccione un periodo de fechas
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto', lineHeight: 1.5 }}>
                    Ingrese la fecha <strong>Desde</strong> y <strong>Hasta</strong> en el panel superior (o use los accesos rápidos como "Hoy" o "Este mes") para cargar y consultar los registros de entrega de turnos.
                  </div>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan="13" className="db-empty" style={{ padding: '40px 16px', textAlign: 'center' }}>
                  No se encontraron pacientes con ingreso o actividad en el periodo seleccionado ({startDate} al {endDate}).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
