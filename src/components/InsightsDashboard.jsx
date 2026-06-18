import React, { useState, useMemo } from 'react';
import { 
  BarChart2, Activity, Clock, Download, TrendingUp, Users, AlertTriangle, 
  Bed, CheckCircle, FileText, PieChart, ShieldAlert, ArrowRightLeft, 
  ArrowUpRight, AlertCircle, Lock, Unlock, Layers, CheckSquare, RefreshCw
} from 'lucide-react';

export default function InsightsDashboard({ bedsData = {}, waitingList = [], transferHistory = [] }) {
  const [activeTab, setActiveTab] = useState('summary'); // summary, traceability, audit
  const [auditFilter, setAuditFilter] = useState('all'); // all, long_stay, waiting_risk, blocked
  const [searchTerm, setSearchTerm] = useState('');

  // 1. CALCULATE CORE STATS FROM BEDS DATA & WAITING LIST
  const stats = useMemo(() => {
    let totalBeds = 0;
    let availableBeds = 0;
    let occupiedBeds = 0;
    let cleaningBeds = 0;
    let blockedBeds = 0;
    let longStayPatientsCount = 0;

    // Bed categories definition
    const categories = {
      upc: { id: 'upc', name: 'Camas Críticas (UPC)', total: 0, available: 0, occupied: 0, cleaning: 0, blocked: 0, required: 0 },
      medios: { id: 'medios', name: 'Cuidados Medios', total: 0, available: 0, occupied: 0, cleaning: 0, blocked: 0, required: 0 },
      basicos: { id: 'basicos', name: 'Cuidados Básicos', total: 0, available: 0, occupied: 0, cleaning: 0, blocked: 0, required: 0 },
      gine_puerperio: { id: 'gine_puerperio', name: 'GINE/PUERPERIO', total: 0, available: 0, occupied: 0, cleaning: 0, blocked: 0, required: 0 },
      infantil: { id: 'infantil', name: 'Infantil / Neo', total: 0, available: 0, occupied: 0, cleaning: 0, blocked: 0, required: 0 },
    };

    const bedList = [];
    const patientList = [];
    const blockedBedList = [];
    let totalCleaningWaitMins = 0;
    let cleaningCount = 0;

    const icStats = {
      total: 0,
      pendientes: 0,
      totalWaitMins: 0,
      especialidades: {}
    };

    const getBedCategory = (tagOrType) => {
      const type = (tagOrType || '').toLowerCase();
      if (type.includes('uci') || type.includes('uti') || type.includes('upc') || type.includes('crítica') || type.includes('critica')) return 'upc';
      if (type.includes('medio') || type.includes('medios')) return 'medios';
      if (type.includes('basico') || type.includes('básico') || type.includes('básicos')) return 'basicos';
      if (type.includes('gine') || type.includes('puerperio')) return 'gine_puerperio';
      if (type.includes('infantil') || type.includes('neonatolog') || type.includes('neo')) return 'infantil';
      return 'basicos';
    };

    // Traverse the floors and sectors to extract metrics
    Object.keys(bedsData || {}).forEach(floor => {
      Object.keys(bedsData[floor] || {}).forEach(sector => {
        (bedsData[floor][sector] || []).forEach(room => {
          room.beds.forEach(bed => {
            totalBeds++;
            const catKey = getBedCategory(bed.tag || bed.type);
            categories[catKey].total++;

            if (bed.status === 'available') {
              availableBeds++;
              categories[catKey].available++;
            } else if (bed.status === 'occupied' || bed.status === 'pending_hodom') {
              occupiedBeds++;
              categories[catKey].occupied++;
            } else if (bed.status === 'cleaning') {
              cleaningBeds++;
              categories[catKey].cleaning++;
              if (bed.cleaningAt) {
                const waitMins = Math.floor((new Date() - new Date(bed.cleaningAt)) / 60000);
                if (!isNaN(waitMins) && waitMins >= 0) {
                  totalCleaningWaitMins += waitMins;
                  cleaningCount++;
                }
              }
            } else if (bed.status === 'blocked') {
              blockedBeds++;
              categories[catKey].blocked++;
              blockedBedList.push({
                id: bed.id,
                roomId: room.roomId,
                floor,
                sector,
                reason: bed.blockReason || 'Mantención general / Recursos Humanos',
                observation: bed.blockObservation || 'Sin observación adicional',
                blockedAt: bed.blockedAt || bed.assignedAt || new Date().toISOString()
              });
            }

            // Patients with stays exceeding standard projection
            if (bed.patient && bed.assignedAt && bed.projectedDays) {
              const elapsedDays = (new Date() - new Date(bed.assignedAt)) / (1000 * 60 * 60 * 24);
              if (elapsedDays > bed.projectedDays) {
                longStayPatientsCount++;
              }
            }

            // Active Interconsultas
            if (bed.interconsultas) {
              bed.interconsultas.forEach(ic => {
                icStats.total++;
                if (ic.estado === 'pendiente') {
                  icStats.pendientes++;
                  if (ic.solicitadaAt) {
                    const waitMins = Math.floor((new Date() - new Date(ic.solicitadaAt)) / 60000);
                    if (!isNaN(waitMins) && waitMins >= 0) icStats.totalWaitMins += waitMins;
                  }
                  icStats.especialidades[ic.especialidadDestino] = (icStats.especialidades[ic.especialidadDestino] || 0) + 1;
                }
              });
            }

            bedList.push({ ...bed, roomId: room.roomId, floor, sector });
            
            if (bed.patient) {
              patientList.push({
                name: bed.patient,
                rut: bed.rut || '—',
                bedId: bed.id,
                roomId: room.roomId,
                floor,
                sector,
                status: bed.status,
                assignedAt: bed.assignedAt,
                projectedDays: bed.projectedDays || 5,
                elapsedDays: bed.assignedAt ? Math.max(0, Math.round((new Date() - new Date(bed.assignedAt)) / (1000 * 60 * 60 * 24))) : 0,
                diagnosis: bed.diagnosis || bed.dxPrincipal || 'No registrado',
                category: categories[catKey].name,
                grdId: bed.grdId || '—'
              });
            }
          });
        });
      });
    });

    // Process the waiting list requirements
    const waitingTotal = waitingList.length;
    let totalWaitHours = 0;
    let maxWaitHours = 0;
    let waitCount = 0;
    let patientsOver12h = 0;
    let patientsOver24h = 0;

    const formattedWaitingList = waitingList.map(p => {
      const catKey = getBedCategory(p.bedTypeRequired);
      categories[catKey].required++;

      let waitHours = 0;
      if (p.requestedAt) {
        const diffMs = new Date() - new Date(p.requestedAt);
        const diffHours = diffMs / (1000 * 60 * 60);
        if (!isNaN(diffHours) && diffHours >= 0) {
          waitHours = diffHours;
          totalWaitHours += diffHours;
          waitCount++;
          if (diffHours > maxWaitHours) maxWaitHours = diffHours;
          if (diffHours > 12) patientsOver12h++;
          if (diffHours > 24) patientsOver24h++;
        }
      }

      return {
        ...p,
        waitHours,
        category: categories[catKey].name
      };
    });

    // Mismatch evaluation (Demand > Offer)
    let totalMismatchDeficit = 0;
    let hasCriticalMismatch = false;
    const mismatches = Object.keys(categories).map(key => {
      const cat = categories[key];
      const deficit = Math.max(0, cat.required - cat.available);
      totalMismatchDeficit += deficit;
      if (key === 'upc' && deficit > 0) hasCriticalMismatch = true;
      return {
        key,
        name: cat.name,
        available: cat.available,
        required: cat.required,
        deficit,
        occupancy: cat.total ? Math.round((cat.occupied / cat.total) * 100) : 0
      };
    });

    // Decidir el "Estado Negro" o alerta operativa basado en evidencia
    const activeBeds = totalBeds - blockedBeds;
    const globalOccupancy = activeBeds > 0 ? Math.round((occupiedBeds / activeBeds) * 100) : 0;
    const blockedRate = totalBeds > 0 ? Math.round((blockedBeds / totalBeds) * 100) : 0;
    const upcStats = categories.upc;
    const upcOccupancy = upcStats.total ? Math.round((upcStats.occupied / upcStats.total) * 100) : 0;

    let alertScore = 0;
    const alertReasons = [];

    // Ocupación global ponderada (Máximo 55 puntos)
    alertScore += globalOccupancy * 0.55;
    if (globalOccupancy >= 85) {
      alertScore += 10;
      alertReasons.push(`Ocupación global supera el umbral crítico de saturación del 85% (Actual: ${globalOccupancy}%)`);
    }
    if (globalOccupancy >= 95) {
      alertScore += 10;
      alertReasons.push(`Establecimiento en saturación general severa de camas habilitadas (Actual: ${globalOccupancy}%)`);
    }
    // Camas críticas saturadas (UPC) (Máximo 15 puntos)
    if (upcOccupancy >= 95) {
      alertScore += 10;
      alertReasons.push(`Área de Cuidados Críticos (UPC/UCI/UTI) saturada al ${upcOccupancy}%`);
    }
    if (hasCriticalMismatch) {
      alertScore += 10;
      alertReasons.push(`Déficit de camas de Cuidados Críticos: pacientes esperando UCI/UTI sin camas disponibles`);
    }
    // Camas bloqueadas (inhabilitadas) (Máximo 5 puntos)
    if (blockedRate >= 10) {
      alertScore += 5;
      alertReasons.push(`Tasa elevada de camas inhabilitadas: ${blockedRate}% del inventario fuera de servicio (${blockedBeds} camas bloqueadas)`);
    }
    // Demora en lista de espera (Trazabilidad) (Máximo 10 puntos)
    if (patientsOver24h > 0) {
      alertScore += 10;
      alertReasons.push(`Cuello de botella: ${patientsOver24h} paciente(s) en lista de espera superan las 24 horas de demora de acueste`);
    }
    if (totalMismatchDeficit > 3) {
      alertScore += 5;
      alertReasons.push(`Mismatch de oferta vs demanda: hay un déficit acumulado de ${totalMismatchDeficit} camas por especialidad`);
    }

    alertScore = Math.min(100, Math.round(alertScore));

    // Determinar la clasificación clínica de la alerta
    let alertLevel = 'NORMAL';
    if (alertScore >= 80 || globalOccupancy >= 95) {
      alertLevel = 'ESTADO NEGRO';
    } else if (alertScore >= 60 || globalOccupancy >= 85) {
      alertLevel = 'NARANJA';
    } else if (alertScore >= 35) {
      alertLevel = 'AMARILLA';
    }

    return {
      totalBeds, availableBeds, occupiedBeds, cleaningBeds, blockedBeds, activeBeds,
      globalOccupancy, blockedRate,
      longStayPatientsCount,
      waitingTotal,
      avgWaitHours: waitCount ? (totalWaitHours / waitCount).toFixed(1) : 0,
      longestWaitHours: maxWaitHours.toFixed(1),
      patientsOver12h, patientsOver24h,
      categories,
      mismatches,
      totalMismatchDeficit,
      alertScore,
      alertLevel,
      alertReasons,
      avgCleaningWait: cleaningCount ? Math.round(totalCleaningWaitMins / cleaningCount) : 0,
      avgIcWait: icStats.pendientes ? Math.round(icStats.totalWaitMins / icStats.pendientes / 60) : 0,
      icPendientes: icStats.pendientes,
      topIcs: Object.entries(icStats.especialidades).sort((a,b) => b[1] - a[1]).slice(0, 3),
      bedList, 
      patientList,
      blockedBedList,
      formattedWaitingList
    };
  }, [bedsData, waitingList]);

  // 2. CALCULATE HISTORICAL TRANSFER METRICS (PROCESS TRACEABILITY)
  const transferStats = useMemo(() => {
    const totalTransfers = (transferHistory || []).length;
    if (totalTransfers === 0) {
      return {
        total: 0,
        topRoutes: [],
        avgPreStayDays: 0,
        recentTransfers: []
      };
    }

    let totalDays = 0;
    let parsedCount = 0;
    const routes = {};

    transferHistory.forEach(t => {
      // Pre-transfer stay parsing
      if (t.estada) {
        const days = parseInt(t.estada);
        if (!isNaN(days)) {
          totalDays += days;
          parsedCount++;
        }
      }

      // Route mapping
      const route = `${t.servicioOrigen} → ${t.servicioDestino}`;
      routes[route] = (routes[route] || 0) + 1;
    });

    const topRoutes = Object.entries(routes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / totalTransfers) * 100)
      }));

    return {
      total: totalTransfers,
      topRoutes,
      avgPreStayDays: parsedCount ? (totalDays / parsedCount).toFixed(1) : '—',
      recentTransfers: [...transferHistory].slice(0, 5)
    };
  }, [transferHistory]);

  // 3. EXPORT EXCEL/CSV DATA
  const handleExportCSV = () => {
    const headers = [
      'Tipo Registro', 'Paciente RUT', 'Nombre', 'Servicio/Cama', 'Estado', 'Fecha/Hora Ingreso', 'Dias Estadia', 'Diagnostico', 'GRD'
    ];
    
    const rows = [];
    
    stats.formattedWaitingList.forEach(p => {
      rows.push([
        'Lista de Espera', 
        p.rut || '—', 
        p.name || '—', 
        p.bedTypeRequired || '—', 
        'En Espera', 
        p.requestedAt || '—', 
        Math.round(p.waitHours / 24) + ' dias en espera', 
        p.diagnosis || '—', 
        '—'
      ]);
    });

    stats.patientList.forEach(p => {
      rows.push([
        'Hospitalizado', 
        p.rut, 
        p.name, 
        `${p.category} - Cama ${p.bedId}`, 
        p.status, 
        p.assignedAt || '—', 
        p.elapsedDays, 
        p.diagnosis, 
        p.grdId
      ]);
    });

    stats.blockedBedList.forEach(b => {
      rows.push([
        'Cama Bloqueada', 
        '—', 
        '—', 
        `Hab ${b.roomId} - Cama ${b.id}`, 
        'Bloqueada', 
        b.blockedAt || '—', 
        '—', 
        `Motivo: ${b.reason}`, 
        '—'
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n" 
      + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_insights_clinicos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. FILTER AUDIT DATA
  const filteredAuditData = useMemo(() => {
    let baseData = [];
    
    if (auditFilter === 'all' || auditFilter === 'long_stay') {
      const longStays = stats.patientList
        .filter(p => p.elapsedDays > p.projectedDays)
        .map(p => ({
          type: 'Larga Estadía',
          patient: p.name,
          rut: p.rut,
          location: `${p.category} - Cama ${p.bedId} (Hab ${p.roomId})`,
          timeStr: `${p.elapsedDays} días internado`,
          projected: `Proyectado: ${p.projectedDays} días`,
          detail: p.diagnosis,
          badgeColor: '#ef4444',
          severity: 'Crítico'
        }));
      baseData = [...baseData, ...longStays];
    }
    
    if (auditFilter === 'all' || auditFilter === 'waiting_risk') {
      const waitingRisk = stats.formattedWaitingList
        .filter(p => p.waitHours > 12)
        .map(p => ({
          type: 'Espera Prolongada',
          patient: p.name,
          rut: p.rut || '—',
          location: `Req: ${p.bedTypeRequired} (Origen: ${p.origin || '—'})`,
          timeStr: `${p.waitHours.toFixed(1)} horas en espera`,
          projected: `Prioridad: ${p.priority || 'Normal'}`,
          detail: p.diagnosis || 'Sin diagnóstico registrado',
          badgeColor: '#f97316',
          severity: p.waitHours > 24 ? 'Crítico' : 'Moderado'
        }));
      baseData = [...baseData, ...waitingRisk];
    }

    if (auditFilter === 'all' || auditFilter === 'blocked') {
      const blocked = stats.blockedBedList.map(b => ({
        type: 'Cama Bloqueada',
        patient: `Cama ${b.id} (Habitación ${b.roomId})`,
        rut: 'Cama Inhabilitada',
        location: `${b.floor.replace('piso', 'Piso ')} - Sector ${b.sector}`,
        timeStr: `Inactiva desde: ${new Date(b.blockedAt).toLocaleDateString('es-CL')}`,
        projected: `Motivo: ${b.reason}`,
        detail: b.observation,
        badgeColor: '#a855f7',
        severity: 'Bloqueo'
      }));
      baseData = [...baseData, ...blocked];
    }

    if (searchTerm) {
      return baseData.filter(row => 
        String(row.patient).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(row.detail).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(row.location).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(row.type).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return baseData;
  }, [auditFilter, stats, searchTerm]);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* CSS STYLING OVERRIDES */}
      <style>{`
        .insights-tab-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 12px 20px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .insights-tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255,255,255,0.02);
        }
        .insights-tab-btn.active {
          color: var(--accent);
          border-bottom-color: var(--accent);
          background: var(--accent-dim);
        }
        
        .alert-card {
          border-radius: 16px;
          padding: 24px;
          box-shadow: var(--shadow-float);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .alert-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 60%);
          pointer-events: none;
        }

        .alert-card-negro {
          border: 1px solid rgba(239, 68, 68, 0.4);
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(10, 5, 5, 0.5) 100%);
          box-shadow: 0 0 25px rgba(239, 68, 68, 0.18);
          animation: pulse-red-border 2.5s infinite;
        }
        @keyframes pulse-red-border {
          0%, 100% { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 20px rgba(239, 68, 68, 0.15); }
          50% { border-color: rgba(239, 68, 68, 0.85); box-shadow: 0 0 35px rgba(239, 68, 68, 0.3); }
        }

        .alert-card-naranja {
          border: 1px solid rgba(249, 115, 22, 0.4);
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(15, 8, 5, 0.5) 100%);
        }

        .alert-card-amarilla {
          border: 1px solid rgba(234, 179, 8, 0.4);
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(12, 10, 5, 0.5) 100%);
        }

        .alert-card-normal {
          border: 1px solid rgba(34, 197, 94, 0.4);
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(5, 10, 5, 0.5) 100%);
        }

        .stats-badge-danger {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          font-weight: 700;
          font-size: 0.72rem;
          padding: 3px 8px;
          border-radius: 6px;
          animation: blink-soft 2s infinite;
        }
        @keyframes blink-soft {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.45; }
        }

        .stats-badge-warning {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #f59e0b;
          font-weight: 600;
          font-size: 0.72rem;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .stats-badge-success {
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
          font-weight: 600;
          font-size: 0.72rem;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .demand-offer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        
        .progress-bar-track {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 6px;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Timeline Styles */
        .timeline-container {
          display: flex;
          justify-content: space-between;
          position: relative;
          padding: 20px 0;
          margin: 10px 0;
        }
        .timeline-container::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 5%;
          right: 5%;
          height: 2px;
          background: rgba(255,255,255,0.08);
          z-index: 1;
          transform: translateY(-50%);
        }
        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          z-index: 2;
          width: 18%;
          text-align: center;
        }
        .timeline-node {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.9);
          border: 2px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: all 0.3s ease;
          box-shadow: var(--shadow-float);
        }
        .timeline-step.active .timeline-node {
          border-color: var(--accent);
          color: var(--accent);
          box-shadow: var(--shadow-glow);
          transform: scale(1.1);
        }
        .timeline-step.danger .timeline-node {
          border-color: #ef4444;
          color: #ef4444;
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
        }
      `}</style>

      {/* HEADER SECTION */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="avatar" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
            <BarChart2 size={24} />
          </div>
          <div>
            <h2 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Insights Clínicos</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Evaluación de oferta vs demanda, cuellos de botella y alertas del establecimiento</p>
          </div>
        </div>
        
        {/* TAB NAVIGATION */}
        <div className="glass-panel" style={{ display: 'flex', padding: '3px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px' }}>
          <button 
            onClick={() => setActiveTab('summary')} 
            className={`insights-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            style={{ borderRadius: '9px' }}
          >
            <Layers size={16} />
            Capacidad y Alertas
          </button>
          <button 
            onClick={() => setActiveTab('traceability')} 
            className={`insights-tab-btn ${activeTab === 'traceability' ? 'active' : ''}`}
            style={{ borderRadius: '9px' }}
          >
            <Clock size={16} />
            Trazabilidad de Tiempos
          </button>
          <button 
            onClick={() => setActiveTab('audit')} 
            className={`insights-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            style={{ borderRadius: '9px' }}
          >
            <FileText size={16} />
            Auditoría Operativa
          </button>
        </div>

        <button onClick={handleExportCSV} className="glass-button primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={16} />
          Exportar Reporte
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: CAPACIDAD Y ALERTAS (GENERAL)                       */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SEMÁFORO DE ESTADO DEL HOSPITAL */}
          <div className={`alert-card ${
            stats.alertLevel === 'ESTADO NEGRO' ? 'alert-card-negro' :
            stats.alertLevel === 'NARANJA' ? 'alert-card-naranja' :
            stats.alertLevel === 'AMARILLA' ? 'alert-card-amarilla' : 'alert-card-normal'
          }`}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ 
                background: 
                  stats.alertLevel === 'ESTADO NEGRO' ? 'rgba(239, 68, 68, 0.15)' :
                  stats.alertLevel === 'NARANJA' ? 'rgba(249, 115, 22, 0.15)' :
                  stats.alertLevel === 'AMARILLA' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                color: 
                  stats.alertLevel === 'ESTADO NEGRO' ? '#ef4444' :
                  stats.alertLevel === 'NARANJA' ? '#f97316' :
                  stats.alertLevel === 'eab308' ? '#eab308' : '#22c55e',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {stats.alertLevel === 'ESTADO NEGRO' ? <ShieldAlert size={32} /> :
                 stats.alertLevel === 'NARANJA' || stats.alertLevel === 'AMARILLA' ? <AlertTriangle size={32} /> : 
                 <CheckCircle size={32} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', fontWeight: 600 }}>Estado Clínico del Establecimiento</span>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    padding: '4px 10px', 
                    borderRadius: '8px', 
                    fontWeight: 700,
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff'
                  }}>
                    Índice de Alerta: {stats.alertScore} / 100
                  </span>
                </div>
                
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', color: '#fff' }}>
                  {stats.alertLevel === 'ESTADO NEGRO' ? '⚠️ ESTADO NEGRO DETECTADO (Saturación Extrema)' :
                   stats.alertLevel === 'NARANJA' ? '⚡ ALERTA OPERATIVA NARANJA (Saturación Alta)' :
                   stats.alertLevel === 'AMARILLA' ? '⚠️ ALERTA PREVENTIVA AMARILLA (Saturación Media)' :
                   '✅ ESTADO OPERATIVO NORMAL (Estable)'}
                </h3>
                
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                  {stats.alertLevel === 'ESTADO NEGRO' ? 'El establecimiento experimenta un bloqueo crítico de flujo de camas. El índice de ocupación global supera el 95%, o se presentan demandas críticas imposibles de absorber. Se requiere activar protocolos de egresos rápidos (HODOM, derivaciones secundarias) y posponer ingresos selectivos.' :
                   stats.alertLevel === 'NARANJA' ? 'Capacidad de camas al límite crítico (>85% ocupación) o desajuste grave de tipos de camas. Riesgo de no disponibilidad inminente ante emergencias complejas. Monitorear altas y agilizar turnaround de aseo.' :
                   stats.alertLevel === 'AMARILLA' ? 'Carga operacional moderada. Se aconseja revisar los pacientes con criterios de egreso a Hospitalización Domiciliaria (HODOM) y dar seguimiento a las camas en limpieza.' :
                   'El establecimiento dispone de capacidad operativa óptima. El balance entre ingresos de urgencia y egresos se mantiene en rango de estabilidad.'}
                </p>

                {/* FACTORES DE EVIDENCIA EN TIEMPO REAL */}
                {stats.alertReasons.length > 0 && (
                  <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>Evidencia en Tiempo Real:</span>
                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {stats.alertReasons.map((reason, idx) => (
                        <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MAIN INDICATORS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            {/* CARD 1: GLOBAL OCCUPANCY */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '220px' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--border-subtle)" strokeWidth="8" />
                  <circle cx="60" cy="60" r="50" fill="transparent" 
                    stroke={
                      stats.globalOccupancy >= 95 ? '#ef4444' : 
                      stats.globalOccupancy >= 85 ? '#f97316' : 
                      stats.globalOccupancy >= 70 ? '#eab308' : '#22c55e'
                    } 
                    strokeWidth="8" 
                    strokeDasharray="314" 
                    strokeDashoffset={314 - (314 * stats.globalOccupancy) / 100} 
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }} 
                  />
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{stats.globalOccupancy}%</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ocupación</span>
                </div>
              </div>
              <span style={{ fontSize: '0.82rem', marginTop: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {stats.occupiedBeds} de {stats.activeBeds} camas activas ocupadas
              </span>
            </div>

            {/* CARD 2: DEMANDA (LISTA DE ESPERA) */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} color="var(--accent)" />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Demanda Esperando Cama</h4>
                </div>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>{stats.waitingTotal}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'var(--inset-bg)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Espera Crítica UPC:</span>
                  <strong style={{ color: stats.categories.upc.required > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                    {stats.categories.upc.required} paciente(s)
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Espera Medios/Básicos:</span>
                  <strong>
                    {stats.categories.medios.required + stats.categories.basicos.required} paciente(s)
                  </strong>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                <span>Tiempo de espera prom: <strong>{stats.avgWaitHours} hrs</strong></span>
              </div>
            </div>

            {/* CARD 3: CAMAS BLOQUEADAS (INHABILITADAS) */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={20} color="#a855f7" />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Camas Bloqueadas</h4>
                </div>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a855f7' }}>{stats.blockedBeds}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'var(--inset-bg)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tasa de Bloqueo:</span>
                  <strong style={{ color: stats.blockedRate > 10 ? '#a855f7' : 'var(--text-primary)' }}>{stats.blockedRate}% del total</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Camas en Aseo activo:</span>
                  <strong>{stats.cleaningBeds} cama(s)</strong>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} color="#a855f7" />
                <span>Causa principal: <strong>Infraestructura / RRHH</strong></span>
              </div>
            </div>

          </div>

          {/* REAL-TIME OFFER VS DEMAND MATCHER */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', fontSize: '1.05rem', fontWeight: 700 }}>
              <RefreshCw size={18} color="var(--accent)" />
              Contraste de Oferta vs Demanda en Tiempo Real (Mismatch de Camas)
            </h3>
            
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              La tabla compara las camas clínicamente disponibles en tiempo real (Oferta) contra las solicitudes ingresadas en lista de espera (Demanda). Un desajuste o mismatch ocurre cuando hay camas libres en el hospital, pero de un tipo o servicio que no coincide con las necesidades del paciente (ej: camas básicas libres pero demanda exclusiva de camas críticas).
            </p>

            <div className="demand-offer-grid">
              {stats.mismatches.map((m) => {
                const isDeficit = m.deficit > 0;
                const isSaturated = m.available === 0 && m.required > 0;
                
                return (
                  <div key={m.key} className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{m.name}</strong>
                      
                      {/* STATS BADGE */}
                      {isDeficit ? (
                        <span className="stats-badge-danger">Déficit: -{m.deficit}</span>
                      ) : isSaturated ? (
                        <span className="stats-badge-danger">Saturada (0 disp.)</span>
                      ) : m.required > 0 ? (
                        <span className="stats-badge-warning">Equilibrado</span>
                      ) : (
                        <span className="stats-badge-success">Disponible</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px', background: 'var(--inset-bg)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Oferta (Disp.)</span>
                        <strong style={{ fontSize: '1.1rem', color: m.available > 0 ? '#22c55e' : 'var(--text-muted)' }}>{m.available}</strong>
                      </div>
                      <div style={{ width: '1px', background: 'var(--border-subtle)' }}></div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Demanda (Req.)</span>
                        <strong style={{ fontSize: '1.1rem', color: m.required > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>{m.required}</strong>
                      </div>
                    </div>

                    {/* OCUPACIÓN EN ESTE SERVICIO */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Uso del Servicio:</span>
                        <strong>{m.occupancy}%</strong>
                      </div>
                      <div className="progress-bar-track">
                        <div 
                          className="progress-bar-fill" 
                          style={{ 
                            width: `${m.occupancy}%`, 
                            background: m.occupancy >= 95 ? '#ef4444' : m.occupancy >= 80 ? '#f97316' : 'var(--accent)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: TRAZABILIDAD DE TIEMPOS (PROCESOS)                  */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'traceability' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* PATIENT JOURNEY FLOW TIMELINE */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', fontSize: '1.05rem', fontWeight: 700 }}>
              <TrendingUp size={18} color="var(--accent)" />
              Flujo y Trazabilidad del Paciente en el Proceso de Hospitalización
            </h3>
            
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
              Trazabilidad longitudinal del ciclo de ingreso, asignación de cama, estadía clínica y flujo de egreso/traslado en el establecimiento.
            </p>

            <div className="timeline-container">
              {/* PASO 1 */}
              <div className="timeline-step active">
                <div className="timeline-node">
                  <FileText size={20} />
                </div>
                <strong style={{ fontSize: '0.85rem', marginTop: '10px', color: '#fff' }}>1. Solicitud</strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Ingreso Formulario</span>
              </div>

              {/* PASO 2 */}
              <div className={`timeline-step ${stats.waitingTotal > 4 ? 'danger' : 'active'}`}>
                <div className="timeline-node">
                  <Clock size={20} />
                </div>
                <strong style={{ fontSize: '0.85rem', marginTop: '10px', color: '#fff' }}>2. Espera de Cama</strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Promedio: {stats.avgWaitHours} hrs</span>
              </div>

              {/* PASO 3 */}
              <div className="timeline-step active">
                <div className="timeline-node">
                  <Bed size={20} />
                </div>
                <strong style={{ fontSize: '0.85rem', marginTop: '10px', color: '#fff' }}>3. Preparación</strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Turnaround Aseo: {stats.avgCleaningWait} min</span>
              </div>

              {/* PASO 4 */}
              <div className="timeline-step active">
                <div className="timeline-node">
                  <Activity size={20} />
                </div>
                <strong style={{ fontSize: '0.85rem', marginTop: '10px', color: '#fff' }}>4. Acueste / Estadía</strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>GRD Inlier / Outlier</span>
              </div>

              {/* PASO 5 */}
              <div className="timeline-step active">
                <div className="timeline-node">
                  <ArrowRightLeft size={20} />
                </div>
                <strong style={{ fontSize: '0.85rem', marginTop: '10px', color: '#fff' }}>5. Egresos / Traslados</strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Alta / HODOM / Interno</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            
            {/* COLUMN 1: DETALLES DE TIEMPOS DE LISTA DE ESPERA (ACUESTE) */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '0.95rem', fontWeight: 700 }}>
                <Clock size={16} color="var(--accent)" />
                Trazabilidad de Tiempos de Acueste (Lista de Espera)
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ padding: '14px', background: 'var(--inset-bg)', borderRadius: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Demora Promedio</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent)', marginTop: '4px' }}>{stats.avgWaitHours} hrs</div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Tiempo transcurrido desde ingreso</span>
                </div>
                <div style={{ padding: '14px', background: 'var(--inset-bg)', borderRadius: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Demora Máxima</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{stats.longestWaitHours} hrs</div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Paciente con mayor espera activa</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.85rem' }}>Pacientes con más de 12 horas en espera:</span>
                  <strong style={{ color: stats.patientsOver12h > 0 ? '#f97316' : 'var(--text-primary)' }}>{stats.patientsOver12h}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.85rem' }}>Pacientes con más de 24 horas en espera:</span>
                  <strong style={{ color: stats.patientsOver24h > 0 ? '#ef4444' : 'var(--text-primary)' }}>{stats.patientsOver24h}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.85rem' }}>Interconsultas activas pendientes:</span>
                  <strong style={{ color: stats.icPendientes > 0 ? '#eab308' : 'var(--text-primary)' }}>{stats.icPendientes}</strong>
                </div>
              </div>
            </div>

            {/* COLUMN 2: TRAZABILIDAD DE TRASLADOS Y EGRESOS */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '0.95rem', fontWeight: 700 }}>
                <ArrowRightLeft size={16} color="#8b5cf6" />
                Historial de Traslados y Turnaround
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ padding: '14px', background: 'var(--inset-bg)', borderRadius: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Traslados Registrados</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>{transferStats.total}</div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Movimientos en el periodo</span>
                </div>
                <div style={{ padding: '14px', background: 'var(--inset-bg)', borderRadius: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estada Pre-Traslado</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>{transferStats.avgPreStayDays} días</div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Tiempo promedio en cama origen</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                  Corredores de Traslado Principales:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {transferStats.topRoutes.length > 0 ? (
                    transferStats.topRoutes.map((route, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '6px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ArrowUpRight size={14} color="#8b5cf6" />
                          {route.name}
                        </span>
                        <strong>{route.count} casos ({route.percent}%)</strong>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin movimientos de traslados en este periodo.</div>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: AUDITORÍA DETALLADA (PARTICULAR)                    */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SEARCH & FILTERS IN AUDIT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <button 
                onClick={() => setAuditFilter('all')} 
                className={`glass-button ${auditFilter === 'all' ? 'primary' : 'secondary'}`}
                style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
              >
                Todos ({stats.longStayPatientsCount + stats.patientsOver12h + stats.blockedBeds})
              </button>
              <button 
                onClick={() => setAuditFilter('long_stay')} 
                className={`glass-button ${auditFilter === 'long_stay' ? 'primary' : 'secondary'}`}
                style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
              >
                Larga Estadía ({stats.longStayPatientsCount})
              </button>
              <button 
                onClick={() => setAuditFilter('waiting_risk')} 
                className={`glass-button ${auditFilter === 'waiting_risk' ? 'primary' : 'secondary'}`}
                style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
              >
                Espera Prolongada ({stats.patientsOver12h})
              </button>
              <button 
                onClick={() => setAuditFilter('blocked')} 
                className={`glass-button ${auditFilter === 'blocked' ? 'primary' : 'secondary'}`}
                style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
              >
                Bloqueadas ({stats.blockedBeds})
              </button>
            </div>

            <div className="search-container" style={{ margin: 0, width: '280px' }}>
              <BarChart2 size={16} color="var(--text-secondary)" />
              <input
                type="text"
                className="search-input"
                placeholder="Filtrar por paciente, diagnóstico o lugar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* AUDIT TABLE */}
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '12px', background: 'rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 16px', color: 'var(--accent)', fontWeight: 700 }}>Categoría Alerta</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Paciente / Objeto</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Identificación</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Servicio / Ubicación</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Trazabilidad Tiempo</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Criterio Alerta</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>Diagnóstico / Causal</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditData.length > 0 ? (
                  filteredAuditData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 700, 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          background: `${row.badgeColor}18`, 
                          border: `1px solid ${row.badgeColor}35`,
                          color: row.badgeColor 
                        }}>
                          {row.type}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#fff' }}>{row.patient}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{row.rut}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{row.location}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: row.severity === 'Crítico' ? '#ef4444' : 'var(--text-primary)' }}>
                        {row.timeStr}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{row.projected}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }} title={row.detail}>
                        <div style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.detail}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No se encontraron alertas críticas activas en esta sección bajo los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}
