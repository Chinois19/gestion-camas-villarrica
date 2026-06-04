import { useState, useMemo } from 'react';
import { Database, Search, Download, Filter, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import './DatabasePanel.css';
import { matchesSearch } from '../utils/search';

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

export default function DatabasePanel({ bedsData }) {
  const [searchTerm, setSearchTerm] = useState('');

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
                edad: p.age || '—',
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
      'ESTADA',
      'FECHA INGRESO',
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
    XLSX.utils.book_append_sheet(wb, ws, "Entrega de Turnos");
    
    // Auto-ajuste de ancho de columnas básico
    const wscols = headers.map(() => ({ wch: 20 }));
    wscols[6].wch = 35; // Nombre
    wscols[9].wch = 50; // Diagnósticos
    wscols[10].wch = 30; // Especialidades
    wscols[11].wch = 60; // Actualización
    ws['!cols'] = wscols;

    // Exportar archivo físico
    XLSX.writeFile(wb, `Entrega_de_Turnos_${new Date().toISOString().split('T')[0]}.xlsx`);
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
