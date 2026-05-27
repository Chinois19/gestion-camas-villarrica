import React, { useState, useMemo } from 'react';
import { 
  BarChart2, Activity, Clock, Download, TrendingUp, Users, AlertTriangle, 
  Bed, CheckCircle, FileText, PieChart 
} from 'lucide-react';

export default function InsightsDashboard({ bedsData, waitingList }) {
  // Calculate Capacidad y Demanda
  const stats = useMemo(() => {
    let totalBeds = 0;
    let availableBeds = 0;
    let occupiedBeds = 0;
    let cleaningBeds = 0;
    let longStayPatients = 0;
    
    let uciUtiTotal = 0;
    let uciUtiAvailable = 0;
    let basicosTotal = 0;
    let basicosAvailable = 0;
    
    let totalCleaningWaitMins = 0;
    let cleaningCount = 0;
    
    const icStats = {
      total: 0,
      pendientes: 0,
      totalWaitMins: 0,
      especialidades: {}
    };

    const bedList = [];
    const patientList = [];

    Object.keys(bedsData || {}).forEach(floor => {
      Object.keys(bedsData[floor] || {}).forEach(sector => {
        (bedsData[floor][sector] || []).forEach(room => {
          room.beds.forEach(bed => {
            totalBeds++;
            const bType = (bed.tag || bed.type || '').toLowerCase();
            
            if (bType.includes('uci') || bType.includes('uti') || bType.includes('upc')) {
              uciUtiTotal++;
              if (bed.status === 'available') uciUtiAvailable++;
            } else {
              basicosTotal++;
              if (bed.status === 'available') basicosAvailable++;
            }

            if (bed.status === 'available') availableBeds++;
            if (bed.status === 'occupied' || bed.status === 'pending_hodom') occupiedBeds++;
            if (bed.status === 'cleaning') {
              cleaningBeds++;
              if (bed.cleaningAt) {
                const waitMins = Math.floor((new Date() - new Date(bed.cleaningAt)) / 60000);
                totalCleaningWaitMins += waitMins;
                cleaningCount++;
              }
            }

            if (bed.patient && bed.assignedAt && bed.projectedDays) {
              const elapsedDays = (new Date() - new Date(bed.assignedAt)) / (1000 * 60 * 60 * 24);
              if (elapsedDays > bed.projectedDays) {
                longStayPatients++;
              }
            }

            if (bed.interconsultas) {
              bed.interconsultas.forEach(ic => {
                icStats.total++;
                if (ic.estado === 'pendiente') {
                  icStats.pendientes++;
                  const waitMins = Math.floor((new Date() - new Date(ic.solicitadaAt)) / 60000);
                  icStats.totalWaitMins += waitMins;
                  icStats.especialidades[ic.especialidadDestino] = (icStats.especialidades[ic.especialidadDestino] || 0) + 1;
                }
              });
            }

            bedList.push({ ...bed, roomId: room.roomId, floor, sector });
            if (bed.patient) {
              patientList.push({
                name: bed.patient,
                rut: bed.rut,
                bedId: bed.id,
                roomId: room.roomId,
                status: bed.status,
                assignedAt: bed.assignedAt
              });
            }
          });
        });
      });
    });

    const waitingTotal = waitingList.length;
    const requiredUciUti = waitingList.filter(p => p.bedTypeRequired.toLowerCase().includes('uci') || p.bedTypeRequired.toLowerCase().includes('uti')).length;
    const requiredBasicos = waitingList.length - requiredUciUti;

    const originStats = {};
    waitingList.forEach(p => {
      originStats[p.origin] = (originStats[p.origin] || 0) + 1;
    });

    const topOrigins = Object.entries(originStats).sort((a,b) => b[1] - a[1]).slice(0, 3);
    const topIcs = Object.entries(icStats.especialidades).sort((a,b) => b[1] - a[1]).slice(0, 3);

    return {
      totalBeds, availableBeds, occupiedBeds, cleaningBeds, longStayPatients,
      uciUtiTotal, uciUtiAvailable, basicosTotal, basicosAvailable,
      waitingTotal, requiredUciUti, requiredBasicos,
      topOrigins, topIcs,
      avgCleaningWait: cleaningCount ? Math.round(totalCleaningWaitMins / cleaningCount) : 0,
      avgIcWait: icStats.pendientes ? Math.round(icStats.totalWaitMins / icStats.pendientes / 60) : 0,
      icPendientes: icStats.pendientes,
      bedList, patientList
    };
  }, [bedsData, waitingList]);

  const handleExportCSV = () => {
    // Generate CSV data from patients currently occupying beds + waiting list
    const headers = [
      'Tipo Registro', 'Paciente RUT', 'Nombre', 'Estado', 'Fecha Solicitud', 'Fecha Asignación', 'Especialidad / Origen', 'Cama Requerida/Asignada', 'Dias Estada'
    ];
    
    const rows = [];
    
    waitingList.forEach(p => {
      rows.push([
        'Lista de Espera', 
        p.rut || 'N/A', 
        p.name || 'N/A', 
        'En Espera', 
        p.requestedAt || 'N/A', 
        'N/A', 
        p.origin || 'N/A', 
        p.bedTypeRequired || 'N/A', 
        'N/A'
      ]);
    });

    stats.bedList.forEach(b => {
      if (b.patient) {
        const elapsedDays = b.assignedAt ? Math.round((new Date() - new Date(b.assignedAt)) / (1000 * 60 * 60 * 24)) : 0;
        rows.push([
          'Hospitalizado', 
          b.rut || 'N/A', 
          b.patient || 'N/A', 
          b.status, 
          b.assignedAt || 'N/A', 
          b.assignedAt || 'N/A', 
          'N/A', 
          b.type || 'N/A', 
          elapsedDays
        ]);
      } else if (b.status === 'cleaning') {
        rows.push([
          'Cama en Aseo', 
          'N/A', 
          'N/A', 
          'En Aseo', 
          b.cleaningAt || 'N/A', 
          'N/A', 
          'Aseo', 
          b.type || 'N/A', 
          'N/A'
        ]);
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `auditoria_operativa_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* HEADER */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="avatar" style={{ background: 'var(--panel-bg)', color: 'var(--accent-color)', border: '1px solid var(--accent-color)' }}>
            <BarChart2 size={24} />
          </div>
          <div>
            <h2 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dashboard de Insights Clínicos</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Diagnóstico crítico de la operación hospitalaria y toma de decisiones</p>
          </div>
        </div>
        <button onClick={handleExportCSV} className="glass-button primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={16} />
          Exportar Data Operativa
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* BLOQUE 1: Capacidad y Demanda */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
            <Activity size={18} color="var(--accent-color)" />
            1. Capacidad y Demanda Actual
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--inset-bg)', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pacientes en Espera</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-color)' }}>{stats.waitingTotal}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--inset-bg)', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Balance Camas Críticas (UPC)</span>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem' }}>Requeridas: <strong style={{ color: '#ef4444' }}>{stats.requiredUciUti}</strong></span>
                <span style={{ fontSize: '0.85rem' }}>Disponibles: <strong style={{ color: '#22c55e' }}>{stats.uciUtiAvailable}</strong></span>
              </div>
              <div className="los-progress-bar" style={{ height: '6px', marginTop: '4px' }}>
                <div className="progress-fill" style={{ width: `${Math.min((stats.requiredUciUti / (stats.uciUtiAvailable || 1)) * 100, 100)}%`, background: stats.requiredUciUti > stats.uciUtiAvailable ? '#ef4444' : '#22c55e' }}></div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--inset-bg)', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Balance Camas Medios/Básicos</span>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem' }}>Requeridas: <strong style={{ color: '#ef4444' }}>{stats.requiredBasicos}</strong></span>
                <span style={{ fontSize: '0.85rem' }}>Disponibles: <strong style={{ color: '#22c55e' }}>{stats.basicosAvailable}</strong></span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Top Servicios Requerientes</span>
              {stats.topOrigins.length > 0 ? stats.topOrigins.map((o, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px', padding: '4px 8px', background: 'var(--panel-bg)', borderRadius: '4px' }}>
                  <span>{o[0]}</span>
                  <strong>{o[1]}</strong>
                </div>
              )) : <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sin datos de demanda actual.</div>}
            </div>
          </div>
        </div>

        {/* BLOQUE 2: Flujos y Egresos */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
            <TrendingUp size={18} color="#8b5cf6" />
            2. Flujos, Traslados y Egresos
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <PieChart size={16} color="#8b5cf6" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#8b5cf6' }}>Distribución de Egresos (Simulado)</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Altas Médicas: <strong>65%</strong></li>
                <li>Hospitalización Domiciliaria (HODOM): <strong>15%</strong></li>
                <li>Traslados a otra Institución: <strong>12%</strong></li>
                <li>Fallecimientos: <strong>8%</strong></li>
              </ul>
              <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '8px' }}>*Datos históricos para análisis de tendencia</p>
            </div>

            <div style={{ padding: '12px', background: 'var(--inset-bg)', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Tasa de Ocupación Global</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stats.totalBeds ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0}%
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  ({stats.occupiedBeds} de {stats.totalBeds} camas)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE 3: Trazabilidad y Cuellos de Botella */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
            <Clock size={18} color="#eab308" />
            3. Diagnóstico de Cuellos de Botella
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} color="#ef4444" />
                <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>Pacientes Larga Estadía</span>
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444' }}>{stats.longStayPatients}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--inset-bg)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Turnaround Time (Aseo)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Promedio en camas sucias</span>
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-color)' }}>{stats.avgCleaningWait} min</span>
            </div>

            <div style={{ padding: '12px', background: 'var(--inset-bg)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Gestión de Interconsultas</span>
                <span className="status-pill" style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>{stats.icPendientes} pendientes</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Demora promedio estimativa: <strong>{stats.avgIcWait} horas</strong>
              </div>
              {stats.topIcs.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Mayores demoras por especialidad:</span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {stats.topIcs.map((ic, i) => (
                      <span key={i} style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--panel-bg)', borderRadius: '4px' }}>{ic[0]} ({ic[1]})</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
