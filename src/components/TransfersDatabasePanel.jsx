import { useState, useMemo } from 'react';
import { Database, Search, Download, Calendar, ArrowRight, Activity, TrendingUp, Home, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import './DatabasePanel.css';
import { matchesSearch } from '../utils/search';

const SERVICES = ['UCI', 'UTI', 'Cuidados Medios', 'Maternidad', 'Neonatología', 'Infantil', 'Básico'];

export default function TransfersDatabasePanel({ transferHistory = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('2026-05-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [originService, setOriginService] = useState('todos');
  const [destinationService, setDestinationService] = useState('todos');

  // Filter and compute data
  const filteredData = useMemo(() => {
    let result = [...transferHistory];

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      result = result.filter(row => {
        const tDate = new Date(row.fechaTraslado);
        return tDate >= start && tDate <= end;
      });
    }

    // Filter by origin service
    if (originService !== 'todos') {
      result = result.filter(row => row.servicioOrigen === originService);
    }

    // Filter by destination service
    if (destinationService !== 'todos') {
      result = result.filter(row => row.servicioDestino === destinationService);
    }

    // Filter by search term
    if (searchTerm) {
      result = result.filter(row => 
        Object.entries(row).some(([key, val]) => {
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

    // Sort descending by transfer date
    return result.sort((a, b) => new Date(b.fechaTraslado) - new Date(a.fechaTraslado));
  }, [transferHistory, searchTerm, startDate, endDate, originService, destinationService]);

  // Compute insights
  const insights = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) {
      return {
        total: 0,
        topOrigin: 'Ninguno',
        topDest: 'Ninguno',
        avgEstada: 0,
        topComuna: 'Ninguna'
      };
    }

    const originCounts = {};
    const destCounts = {};
    const comunaCounts = {};
    let totalEstadaDays = 0;
    let estadaCount = 0;

    filteredData.forEach(row => {
      // Origin Service
      const o = row.servicioOrigen || 'No definido';
      originCounts[o] = (originCounts[o] || 0) + 1;

      // Destination Service
      const d = row.servicioDestino || 'No definido';
      destCounts[d] = (destCounts[d] || 0) + 1;

      // Comuna
      const c = row.comuna || 'No definido';
      if (c !== '—' && c !== 'No definido') {
        comunaCounts[c] = (comunaCounts[c] || 0) + 1;
      }

      // Estada days calculation (parse "X días" or number)
      if (row.estada && typeof row.estada === 'string') {
        const match = row.estada.match(/(\d+)/);
        if (match) {
          totalEstadaDays += parseInt(match[1]);
          estadaCount++;
        }
      } else if (typeof row.estada === 'number') {
        totalEstadaDays += row.estada;
        estadaCount++;
      }
    });

    const getTopKey = (countsObj) => {
      let topKey = 'Ninguno';
      let maxVal = 0;
      Object.entries(countsObj).forEach(([key, val]) => {
        if (val > maxVal) {
          maxVal = val;
          topKey = key;
        }
      });
      return { key: topKey, count: maxVal };
    };

    const topOrigin = getTopKey(originCounts);
    const topDest = getTopKey(destCounts);
    const topComuna = getTopKey(comunaCounts);
    const avgEstada = estadaCount > 0 ? (totalEstadaDays / estadaCount).toFixed(1) : 0;

    return {
      total,
      topOrigin: `${topOrigin.key} (${Math.round((topOrigin.count / total) * 100)}%)`,
      topDest: `${topDest.key} (${Math.round((topDest.count / total) * 100)}%)`,
      avgEstada: `${avgEstada} días`,
      topComuna: topComuna.key !== 'Ninguno' ? `${topComuna.key} (${topComuna.count} casos)` : 'Ninguna'
    };
  }, [filteredData]);

  // Format date time helper
  const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleString('es-CL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return isoString;
    }
  };

  const handleExportExcel = () => {
    if (filteredData.length === 0) return;

    const headers = [
      'FECHA TRASLADO',
      'NOMBRE PACIENTE',
      'RUN',
      'EDAD',
      'SERVICIO ORIGEN',
      'SALA ORIGEN',
      'CAMA ORIGEN',
      'SERVICIO DESTINO',
      'SALA DESTINO',
      'CAMA DESTINO',
      'ESTADA PRE-TRASLADO',
      'FECHA INGRESO',
      'PRECAUCIONES',
      'DIAGNÓSTICOS',
      'ESPECIALIDADES',
      'COMUNA',
      'ACTUALIZACIÓN'
    ];

    const rows = filteredData.map(row => [
      formatDateTime(row.fechaTraslado),
      row.nombre || '',
      row.run || '',
      row.edad || '',
      row.servicioOrigen || '',
      row.salaOrigen || '',
      row.camaOrigen || '',
      row.servicioDestino || '',
      row.salaDestino || '',
      row.camaDestino || '',
      row.estada || '',
      formatDateTime(row.fechaIngreso),
      row.precauciones || '',
      row.diagnosticos || '',
      row.especialidades || '',
      row.comuna || '',
      Array.isArray(row.actualizacion)
        ? row.actualizacion.map(act => `${act.texto}   ${act.fecha}`).join('\n')
        : (row.actualizacion || '')
    ]);

    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Traslados");

    // Adjust column widths basic
    const wscols = headers.map(() => ({ wch: 15 }));
    wscols[0].wch = 20; // Fecha Traslado
    wscols[1].wch = 35; // Nombre
    wscols[11].wch = 20; // Fecha Ingreso
    wscols[13].wch = 50; // Diagnósticos
    wscols[14].wch = 30; // Especialidades
    wscols[16].wch = 60; // Actualizaciones
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `Base_de_Datos_Traslados_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="database-panel-container printable-area">
      {/* Header */}
      <div className="database-header hide-on-print" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(167, 139, 250, 0.1) 100%)', borderBottom: '1px solid rgba(139, 92, 246, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="db-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <Database size={24} color="#8b5cf6" />
          </div>
          <div>
            <h2 className="db-title" style={{ color: '#8b5cf6' }}>Base de Datos de Traslados</h2>
            <p className="db-subtitle">Monitoreo histórico de movimientos de pacientes entre servicios ({filteredData.length} registros)</p>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Origen:</span>
            <select 
              value={originService} 
              onChange={e => setOriginService(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="todos" style={{ background: '#1e1b4b', color: '#fff' }}>Todos</option>
              {SERVICES.map(s => <option key={s} value={s} style={{ background: '#1e1b4b', color: '#fff' }}>{s}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Destino:</span>
            <select 
              value={destinationService} 
              onChange={e => setDestinationService(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="todos" style={{ background: '#1e1b4b', color: '#fff' }}>Todos</option>
              {SERVICES.map(s => <option key={s} value={s} style={{ background: '#1e1b4b', color: '#fff' }}>{s}</option>)}
            </select>
          </div>

          <div className="search-container" style={{ margin: 0 }}>
            <Search size={16} color="var(--text-secondary)" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar en traslados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button className="glass-button primary" onClick={handleExportExcel} style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            <Download size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Dynamic Insights Grid */}
      <div className="insights-container hide-on-print" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '4px',
        padding: '0 10px' 
      }}>
        {/* Card 1: Total de Traslados */}
        <div className="glass-panel" style={{ 
          padding: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          background: 'rgba(255,255,255,0.02)',
          borderLeft: '4px solid #8b5cf6',
          borderRadius: '12px'
        }}>
          <div style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', padding: '10px', borderRadius: '10px' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Traslados</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{insights.total}</div>
          </div>
        </div>

        {/* Card 2: Servicio Origen Principal */}
        <div className="glass-panel" style={{ 
          padding: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          background: 'rgba(255,255,255,0.02)',
          borderLeft: '4px solid #ec4899',
          borderRadius: '12px'
        }}>
          <div style={{ background: 'rgba(236,72,153,0.1)', color: '#ec4899', padding: '10px', borderRadius: '10px' }}>
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Origen Principal</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{insights.topOrigin}</div>
          </div>
        </div>

        {/* Card 3: Servicio Destino Principal */}
        <div className="glass-panel" style={{ 
          padding: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          background: 'rgba(255,255,255,0.02)',
          borderLeft: '4px solid #3b82f6',
          borderRadius: '12px'
        }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '10px', borderRadius: '10px' }}>
            <ArrowRight size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Destino Principal</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{insights.topDest}</div>
          </div>
        </div>

        {/* Card 4: Estada Promedio Pre-Traslado */}
        <div className="glass-panel" style={{ 
          padding: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          background: 'rgba(255,255,255,0.02)',
          borderLeft: '4px solid #10b981',
          borderRadius: '12px'
        }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Estada Pre-Traslado</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{insights.avgEstada}</div>
          </div>
        </div>

        {/* Card 5: Comuna Mayor Frecuencia */}
        <div className="glass-panel" style={{ 
          padding: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          background: 'rgba(255,255,255,0.02)',
          borderLeft: '4px solid #f59e0b',
          borderRadius: '12px'
        }}>
          <div style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '10px', borderRadius: '10px' }}>
            <Home size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Comuna de Origen</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{insights.topComuna}</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="database-table-wrapper glass-panel printable-table-wrapper" style={{ marginTop: '10px' }}>
        <table className="db-table">
          <thead>
            <tr>
              <th style={{ color: '#8b5cf6' }}>FECHA TRASLADO</th>
              <th>NOMBRE</th>
              <th>RUN</th>
              <th>EDAD</th>
              <th>SERV. ORIGEN</th>
              <th>SALA ORIGEN</th>
              <th>CAMA ORIGEN</th>
              <th>SERV. DESTINO</th>
              <th>SALA DESTINO</th>
              <th>CAMA DESTINO</th>
              <th>ESTADA PRE-TRASLADO</th>
              <th>FECHA INGRESO</th>
              <th>PRECAUCIONES</th>
              <th>DIAGNÓSTICOS</th>
              <th>ESPECIALIDADES</th>
              <th>COMUNA</th>
              <th>ACTUALIZACIÓN</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((row, i) => (
                <tr key={row.id || i}>
                  <td style={{ fontWeight: 700, color: '#8b5cf6' }}>{formatDateTime(row.fechaTraslado)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.nombre}</td>
                  <td>{row.run}</td>
                  <td>{row.edad}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{row.servicioOrigen}</td>
                  <td>{row.salaOrigen}</td>
                  <td>{row.camaOrigen}</td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.servicioDestino}</td>
                  <td>{row.salaDestino}</td>
                  <td>{row.camaDestino}</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{row.estada}</td>
                  <td>{formatDateTime(row.fechaIngreso)}</td>
                  <td>
                    {row.precauciones !== 'Ninguna' && row.precauciones !== 'Sin Precauciones' ? (
                      <span className="badge-precaucion">{row.precauciones}</span>
                    ) : 'Ninguna'}
                  </td>
                  <td className="cell-truncate" title={row.diagnosticos}>{row.diagnosticos}</td>
                  <td>{row.especialidades}</td>
                  <td>{row.comuna}</td>
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
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="17" className="db-empty">
                  No se encontraron registros de traslados para este periodo, filtros o búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
