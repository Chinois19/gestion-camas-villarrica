import { useState, useEffect } from 'react';
import { Clock, TrendingUp, User, ArrowRight, AlertCircle, CheckCircle, Filter } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

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

function DraggablePatientCard({ patient, waitTime, isSelected, onSelect, onViewDetails }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `patient-${patient.id}`,
    data: { patient }
  });

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
      onClick={() => { if (onSelect) onSelect(patient); }}
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
            <span className="p-name">{patient.name}</span>
            <span className="p-age">{patient.age} años • {patient.origin}</span>
          </div>
        </div>

        <div className="diagnosis-box">
          <p className="diagnosis-text">{Array.isArray(patient.diagnosis) ? patient.diagnosis.join(' • ') : patient.diagnosis}</p>
        </div>

        <div className="requirement-footer">
          <div className="bed-req">
            <span className="label">Requerido:</span>
            <span className="value">{patient.bedTypeRequired}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="glass-button secondary" 
              style={{ padding: '4px 8px', fontSize: '0.75rem', position: 'relative', zIndex: 10 }} 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); if (onViewDetails) onViewDetails(patient); }}
            >
              Ver Detalles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WaitingList({ patients, onSelectPatient, onViewPatient, selectedPatientId }) {
  const [timers, setTimers] = useState({});
  const [activeTier, setActiveTier] = useState('todos'); // 'critical' | 'warning' | 'standard' | 'todos'

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

      {/* Resumen Estadístico Interactivo */}
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
          />
        ))}
        {sortedPatients.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No hay pacientes en esta categoría.
          </div>
        )}
      </div>
    </div>
  );
}
