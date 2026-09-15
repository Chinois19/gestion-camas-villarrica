import { useState, useMemo, useCallback } from 'react';
import { Database, Search, Download, Filter, Printer, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
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
  } catch (e) { }
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

export default function DatabasePanel({ bedsData, procedures = [], blockLog = [], onUpdateBlockLog, userRole }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null); // { fixed, total }

  /* ── Obtener todas las camas actualmente bloqueadas en bedsData ── */
  const activeBedIds = useMemo(() => {
    const ids = new Set();
    Object.values(bedsData || {}).forEach(floor => {
      if (typeof floor !== 'object' || Array.isArray(floor)) return;
      Object.values(floor).forEach(sector => {
        if (!Array.isArray(sector)) return;
        sector.forEach(room => {
          (room.beds || []).forEach(bed => {
            if (bed.status === 'blocked') {
              // Registrar tanto el blockLogId guardado como el nombre de cama
              if (bed.blockLogId) ids.add(bed.blockLogId);
              ids.add(`Hab. ${room.roomId} — Cama ${bed.id}`);
            }
          });
        });
      });
    });
    return ids;
  }, [bedsData]);

  /* ── Detectar registros huérfanos ── */
  const orphanCount = useMemo(() => {
    return (blockLog || []).filter(r => !r.unblockedAt && !activeBedIds.has(r.id) && !activeBedIds.has(r.cama)).length;
  }, [blockLog, activeBedIds]);

  /* ── Limpiar registros huérfanos ── */
  const handleCleanupOrphans = useCallback(async () => {
    if (!onUpdateBlockLog) return;
    const orphans = (blockLog || []).filter(r => !r.unblockedAt && !activeBedIds.has(r.id) && !activeBedIds.has(r.cama));
    if (orphans.length === 0) {
      setCleanupResult({ fixed: 0, total: 0 });
      return;
    }
    setCleanupRunning(true);
    setCleanupResult(null);
    const now = new Date().toISOString();
    let fixed = 0;
    for (const r of orphans) {
      try {
        await onUpdateBlockLog(r.id, { unblockedAt: now, _autoFixed: true, _autoFixedAt: now });
        fixed++;
      } catch (e) {
        console.error('[DatabasePanel] Error cerrando registro huérfano', r.id, e);
      }
    }
    setCleanupRunning(false);
    setCleanupResult({ fixed, total: orphans.length });
    toast.success(`Limpieza completada: ${fixed} de ${orphans.length} registros huérfanos cerrados`);
  }, [blockLog, activeBedIds, onUpdateBlockLog]);

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
                } catch (e) { }
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
                const patientName = (p.patient || p.patientName || p.nombre || '').toLowerCase().trim();
                const admDate = p.admissionDate || p.assignedAt;

                const matchedProcs = procedures.filter(pr => {
                  const prRut = (pr.rut || '').replace(/[^0-9kK]/g, '').toLowerCase();
                  const prName = (pr.patientName || pr.nombre || '').toLowerCase().trim();

                  // 1. Coincidencia por RUN exacto del paciente
                  if (patientRut && prRut && patientRut === prRut) return true;

                  // 2. Coincidencia por nombre exacto del paciente
                  if (patientName && prName && patientName === prName) return true;

                  // 3. Coincidencia por sala y cama: solo si ocurrió durante la estadía del paciente actual
                  if (pr.bedId && pr.bedId === bed.id && (!pr.roomId || String(pr.roomId) === String(room.roomId))) {
                    if (admDate) {
                      const procDate = new Date(pr.createdAt || pr.fecha);
                      const admDateTime = new Date(admDate);
                      if (!isNaN(procDate.getTime()) && !isNaN(admDateTime.getTime())) {
                        return procDate >= admDateTime;
                      }
                    }
                  }

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

              data.push({
                servicio: servicioAcueste,
                estada: estada,
                sala: room.roomId,
                cama: bed.id,
                fechaIngreso: formatDateTime(admDate),
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
  }, [bedsData, procedures]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return patientsData;
    return patientsData.filter(row =>
      Object.entries(row).some(([key, val]) => {
        if (key === 'actualizacion' && Array.isArray(val)) {
          return val.some(act =>
            matchesSearch(act.texto, searchTerm) ||
            matchesSearch(act.fecha, searchTerm)
          );
        }
        return matchesSearch(String(val), searchTerm);
      })
    );
  }, [patientsData, searchTerm]);

  const handleExportExcel = () => {
    if (filteredData.length === 0) return;

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
            <p className="db-subtitle">Exportación y revisión de pacientes actualmente en cama ({filteredData.length} registros)</p>
          </div>
        </div>

        <div className="db-actions hide-on-print">
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
          <button className="glass-button primary" onClick={handleExportExcel}>
            <Download size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* ── Sección de limpieza de base de datos — solo visible para superadmin ── */}
      {userRole === 'superadmin' && onUpdateBlockLog && (
        <div className="hide-on-print" style={{
          margin: '0 0 16px 0',
          padding: '14px 18px',
          borderRadius: 12,
          background: orphanCount > 0 ? 'rgba(239,68,68,0.07)' : 'rgba(34,197,94,0.05)',
          border: `1px solid ${orphanCount > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {orphanCount > 0
              ? <AlertTriangle size={18} color="#ef4444" />
              : <CheckCircle size={18} color="#22c55e" />}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: orphanCount > 0 ? '#fca5a5' : '#86efac' }}>
                {orphanCount > 0
                  ? `${orphanCount} registro${orphanCount !== 1 ? 's' : ''} de bloqueo huérfano${orphanCount !== 1 ? 's' : ''} detectado${orphanCount !== 1 ? 's' : ''}`
                  : 'Base de datos de bloqueos íntegra'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {orphanCount > 0
                  ? 'Camas que figuran bloqueadas en el registro pero ya están disponibles en el sistema. Corrija para limpiar el informe.'
                  : 'No se detectaron bloqueos sin cerrar para camas actualmente disponibles.'}
              </div>
            </div>
          </div>
          {cleanupResult && (
            <div style={{ fontSize: '0.78rem', color: '#86efac', fontWeight: 600 }}>
              ✔ {cleanupResult.fixed}/{cleanupResult.total} corregidos
            </div>
          )}
          {orphanCount > 0 && (
            <button
              className="glass-button"
              onClick={handleCleanupOrphans}
              disabled={cleanupRunning}
              style={{
                marginLeft: 'auto',
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(239,68,68,0.12)',
                color: '#fca5a5',
                border: '1px solid rgba(239,68,68,0.3)',
                opacity: cleanupRunning ? 0.6 : 1,
                cursor: cleanupRunning ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem', fontWeight: 700, padding: '8px 16px', borderRadius: 8
              }}
            >
              <Wrench size={14} />
              {cleanupRunning ? 'Limpiando...' : 'Limpiar Registros Huérfanos'}
            </button>
          )}
        </div>
      )}
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
            ) : (
              <tr>
                <td colSpan="13" className="db-empty">
                  No se encontraron pacientes que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
