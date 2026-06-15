import { useState, useEffect } from 'react';
import { Clock, TrendingUp, User, ArrowRight, AlertCircle, CheckCircle, Filter, LogOut } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { SERVICIOS_SOLICITANTES, ESPECIALIDADES } from '../data/formData';
import cie10Data from '../data/cie10.json';
import { matchesSearch } from '../utils/search';
import { formatAgeDetailed } from '../utils/age';

const calculateWaitTime = (requestedAt) => {
  const diff = Date.now() - new Date(requestedAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, totalHours: diff / (1000 * 60 * 60) };
};

const formatTime = (time) => {
  return `${time.hours}h ${time.minutes.toString().padStart(2, '0')}m`;
};

const getTierClass = (totalHours) => {
  if (totalHours >= 12) return 'tier-critical';
  if (totalHours >= 4) return 'tier-warning';
  return 'tier-standard';
};

function DraggablePatientCard({ patient, waitTime, isSelected, onSelect, onViewDetails, onEditPatient, onDischargeWaiting, isVisor }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `patient-${patient.id}`,
    data: { patient },
    disabled: isVisor
  });

  const handleCardClick = (e) => {
    e.stopPropagation();
    if (onSelect) onSelect(patient);
  };

  const handleCardDoubleClick = (e) => {
    e.stopPropagation();
    if (!isVisor && onEditPatient) onEditPatient(patient);
  };

  const tierClass = getTierClass(waitTime.totalHours);
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      onClick={handleCardClick}
      onDoubleClick={handleCardDoubleClick}
      className={`glass-panel waiting-card ${tierClass} ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
    >
      <div className="waiting-card-header" style={{ position: 'relative' }}>
        <div className="wait-timer">
          <Clock size={14} />
          <span>{formatTime(waitTime)}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className={`priority-badge p-${patient.priority}`}>
            P{patient.priority}
          </div>
        </div>
      </div>

      <div className="waiting-card-body">
        <div className="patient-main">
          <div className="patient-avatar-mini">
            <User size={14} />
          </div>
          <div className="patient-info-mini">
            <span className="p-name" style={{ marginRight: '4px' }}>{patient.name}</span>
            <span className="p-age">{formatAgeDetailed(patient.fechaNacimiento, patient.age)} • {patient.origin}</span>
          </div>
        </div>

        <div className="diagnosis-box">
          <p className="diagnosis-text">{Array.isArray(patient.diagnosis) ? patient.diagnosis.join(' • ') : patient.diagnosis}</p>
          {patient.especialidadTratante && patient.especialidadTratante.length > 0 && (
            <p className="diagnosis-text" style={{ marginTop: '4px', color: '#00d4ff', fontSize: '0.7rem', fontWeight: 600 }}>
              Tratante: {patient.especialidadTratante.join(' • ')}
            </p>
          )}
        </div>

        {(patient.dxCie10 || (patient.secondaryCodes && patient.secondaryCodes.length > 0)) && (
          <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 600, lineHeight: 1.3, marginBottom: '4px' }}>
            {[patient.dxCie10, ...(patient.secondaryCodes || [])].filter(Boolean).map(code => {
              const item = cie10Data.find(c => c.code === code);
              return item ? `${code} - ${item.desc}` : code;
            }).join(' • ')}
          </div>
        )}

        <div className="requirement-footer">
          <div className="bed-req">
            <span className="label">Requerido:</span>
            <span className="value">{patient.bedTypeRequired}</span>
          </div>
          {!isVisor && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="glass-button secondary" 
                style={{ padding: '4px 8px', fontSize: '0.75rem', position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '4px' }} 
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); if (onDischargeWaiting) onDischargeWaiting(patient); }}
              >
                <LogOut size={12} /> Dar Alta
              </button>
              <button 
                className="glass-button primary" 
                style={{ padding: '4px 8px', fontSize: '0.75rem', position: 'relative', zIndex: 10, background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.4)' }} 
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); if (onEditPatient) onEditPatient(patient); }}
              >
                Editar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WaitingList({ patients, onSelectPatient, onViewPatient, selectedPatientId, onEditPatient, onDischargeWaiting, userRole, searchQuery }) {
  const [timers, setTimers] = useState({});
  const isVisor = userRole === 'visor';
  const [activeTier, setActiveTier] = useState('todos'); // 'critical' | 'warning' | 'standard' | 'todos'
  const [filterServicio, setFilterServicio] = useState('todos');
  const [filterEspecialidad, setFilterEspecialidad] = useState('todos');

  useEffect(() => {
    const updateTimers = () => {
      const newTimers = {};
      patients.forEach(p => {
        newTimers[p.id] = calculateWaitTime(p.requestedAt);
      });
      setTimers(newTimers);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 60000);
    return () => clearInterval(interval);
  }, [patients]);

  const stats = patients.reduce((acc, p) => {
    const wait = timers[p.id] || calculateWaitTime(p.requestedAt);
    if (wait.totalHours >= 12) acc.critical++;
    else if (wait.totalHours >= 4) acc.warning++;
    else acc.standard++;
    return acc;
  }, { critical: 0, warning: 0, standard: 0 });

  const filteredPatients = patients.filter(p => {
    let matchSearch = true;
    if (searchQuery) {
      const pStr = [
        p.name, p.rut, p.diagnosis, p.origin, p.bedTypeRequired,
        ...(p.especialidadTratante || [])
      ].filter(Boolean).join(' ');
      matchSearch = matchesSearch(pStr, searchQuery);
    }
    if (!matchSearch) return false;

    if (filterServicio !== 'todos' && p.origin !== filterServicio) return false;
    
    if (filterEspecialidad !== 'todos') {
      if (!p.especialidadTratante || !p.especialidadTratante.includes(filterEspecialidad)) {
        return false;
      }
    }

    if (activeTier === 'todos') return true;
    const wait = timers[p.id] || calculateWaitTime(p.requestedAt);
    const tier = wait.totalHours >= 12 ? 'critical' : wait.totalHours >= 4 ? 'warning' : 'standard';
    return tier === activeTier;
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    const timeA = new Date(a.requestedAt).getTime();
    const timeB = new Date(b.requestedAt).getTime();
    return timeA - timeB;
  });

  const totalWaiting = patients.length;
  
  const reqStats = patients.reduce((acc, p) => {
    acc[p.bedTypeRequired] = (acc[p.bedTypeRequired] || 0) + 1;
    return acc;
  }, {});

  const originStats = patients.reduce((acc, p) => {
    acc[p.origin] = (acc[p.origin] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="waiting-list-panel">
      <div className="sidebar-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Pacientes en Espera ({filteredPatients.length})</span>
          {activeTier !== 'todos' && (
            <button 
              onClick={() => setActiveTier('todos')}
              style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Limpiar filtro"
            >
              <Filter size={14} />
            </button>
          )}
        </div>
        <TrendingUp size={16} />
      </div>

      {/* Resumen General Estadístico (Global) Compacto - SOBRE los filtros */}
      <div style={{ marginBottom: '16px', background: 'var(--panel-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Total Espera: <strong style={{ color: '#0ea5e9', fontSize: '0.9rem' }}>{totalWaiting}</strong> pacientes.
        </div>
        
        {totalWaiting > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--accent-color)', marginBottom: '4px', fontWeight: 700 }}>Req:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(reqStats).sort((a,b) => b[1]-a[1]).map(([req, count]) => (
                  <span key={req} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                    {req}: <strong style={{ color: 'var(--text-primary)' }}>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--accent-color)', marginBottom: '4px', fontWeight: 700 }}>Desde:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(originStats).sort((a,b) => b[1]-a[1]).slice(0, 3).map(([orig, count]) => (
                  <span key={orig} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                    {orig.length > 10 ? orig.substring(0, 8) + '..' : orig}: <strong style={{ color: 'var(--text-primary)' }}>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <select 
          className="glass-input" 
          style={{ width: '100%', fontSize: '0.75rem', padding: '6px 10px' }}
          value={filterServicio}
          onChange={e => setFilterServicio(e.target.value)}
        >
          <option value="todos">Todos los Servicios</option>
          {SERVICIOS_SOLICITANTES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select 
          className="glass-input" 
          style={{ width: '100%', fontSize: '0.75rem', padding: '6px 10px' }}
          value={filterEspecialidad}
          onChange={e => setFilterEspecialidad(e.target.value)}
        >
          <option value="todos">Todas las Especialidades</option>
          {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Resumen Estadístico Interactivo por Tiempos */}
      <div className="waiting-summary">
        <div 
          className={`summary-item tier-critical ${activeTier === 'critical' ? 'active-filter' : ''}`}
          onClick={() => setActiveTier(activeTier === 'critical' ? 'todos' : 'critical')}
          style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
        >
          <span className="count">{stats.critical}</span>
          <span className="label">&gt; 12 Horas</span>
          <AlertCircle size={12} style={{ marginTop: '4px', opacity: 0.6 }} />
        </div>
        <div 
          className={`summary-item tier-warning ${activeTier === 'warning' ? 'active-filter' : ''}`}
          onClick={() => setActiveTier(activeTier === 'warning' ? 'todos' : 'warning')}
          style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
        >
          <span className="count">{stats.warning}</span>
          <span className="label">4 - 12 Horas</span>
          <Clock size={12} style={{ marginTop: '4px', opacity: 0.6 }} />
        </div>
        <div 
          className={`summary-item tier-standard ${activeTier === 'standard' ? 'active-filter' : ''}`}
          onClick={() => setActiveTier(activeTier === 'standard' ? 'todos' : 'standard')}
          style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
        >
          <span className="count">{stats.standard}</span>
          <span className="label">&lt; 4 Horas</span>
          <CheckCircle size={12} style={{ marginTop: '4px', opacity: 0.6 }} />
        </div>
      </div>

      <div className="waiting-cards-container">
        {sortedPatients.map(patient => (
          <DraggablePatientCard 
            key={patient.id} 
            patient={patient} 
            waitTime={timers[patient.id] || calculateWaitTime(patient.requestedAt)}
            isSelected={selectedPatientId === patient.id}
            onSelect={onSelectPatient}
            onViewDetails={onViewPatient}
            onEditPatient={onEditPatient}
            onDischargeWaiting={onDischargeWaiting}
            isVisor={isVisor}
          />
        ))}
      </div>
    </div>
  );
}
