import { useState, useEffect } from 'react';
import { X, Save, Clock, Calendar, Activity, ChevronRight, AlertCircle, TrendingDown, AlertTriangle } from 'lucide-react';
import { GRD_DATA, calculateProjectedDays, getGrdLimit } from '../data/grd';
import SearchableSelect from './SearchableSelect';
import MultiSearchableSelect from './MultiSearchableSelect';
import { CIE10_OPTIONS } from '../data/cie10Options';

export default function AssignmentModal({ patient, bed, onConfirm, onClose }) {
  const [formData, setFormData] = useState({
    patientName: patient.name,
    diagnosis: Array.isArray(patient.diagnosis) ? patient.diagnosis : (patient.diagnosis ? [patient.diagnosis] : []),
    origin: patient.origin,
    bedTypeRequired: patient.bedTypeRequired,
    grdId: '',
    severity: 1
  });

  const [projectedDays, setProjectedDays] = useState(0);
  const [limitDays, setLimitDays] = useState(0);
  const requestTime = new Date(patient.requestedAt);
  const assignTime = new Date();
  
  // Cálculo de tiempo de espera en minutos
  const waitMinutes = Math.floor((assignTime - requestTime) / (1000 * 60));
  const waitHours = Math.floor(waitMinutes / 60);

  useEffect(() => {
    if (formData.grdId) {
      setProjectedDays(calculateProjectedDays(formData.grdId, parseInt(formData.severity)));
      setLimitDays(getGrdLimit(formData.grdId, parseInt(formData.severity)));
    }
  }, [formData.grdId, formData.severity]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    onConfirm({
      ...formData,
      waitMinutes,
      projectedDays,
      assignedAt: assignTime.toISOString(),
      projectedReleaseDate: new Date(assignTime.getTime() + (projectedDays * 24 * 60 * 60 * 1000)).toISOString()
    });
  };

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content assignment-form">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity className="icon-logo" size={24} />
            <h2 className="text-gradient">Asignación Clínica de Cama</h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="assignment-grid">
            {bed.serviceMismatch && (
              <div className="glass-panel" style={{ gridColumn: '1 / -1', background: 'rgba(255, 170, 0, 0.1)', border: '1px solid rgba(255, 170, 0, 0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ffaa00' }}>
                  <AlertTriangle size={24} />
                  <div>
                    <strong>Advertencia de Incompatibilidad:</strong> Está asignando un paciente que requiere cama <strong>{patient.bedTypeRequired}</strong> a una cama etiquetada como <strong>{bed.bedType}</strong>.
                  </div>
                </div>
              </div>
            )}
            
            {/* Resumen de Trazabilidad */}
            <div className="traceability-section glass-panel">
              <h3 className="section-title"><Clock size={16} /> Trazabilidad de Tiempo</h3>
              <div className="trace-item">
                <span className="label">Solicitud:</span>
                <span className="value">{requestTime.toLocaleString()}</span>
              </div>
              <div className="trace-item">
                <span className="label">Asignación:</span>
                <span className="value">{assignTime.toLocaleString()}</span>
              </div>
              <div className="trace-item highlight">
                <span className="label">Tiempo Total de Espera:</span>
                <span className="value">{waitHours}h {waitMinutes % 60}m</span>
              </div>
              <div className="trace-item">
                <span className="label">Destino:</span>
                <span className="value">Hab. {bed.roomId} - Cama {bed.bedId}</span>
              </div>
            </div>

            <form onSubmit={handleConfirm} className="assignment-fields">
              <div className="form-section">
                <h3 className="section-title">1. Validación de Solicitud (Médica)</h3>
                <div className="form-group">
                  <label>Nombre del Paciente</label>
                  <input type="text" name="patientName" value={formData.patientName} onChange={handleChange} className="glass-input" />
                </div>
                <div className="form-group">
                  <label>Diagnóstico de Ingreso (Hasta 5)</label>
                  <MultiSearchableSelect 
                    options={CIE10_OPTIONS}
                    value={formData.diagnosis}
                    onChange={(val) => setFormData(prev => ({ ...prev, diagnosis: val }))}
                    placeholder="Buscar diagnósticos CIE-10..."
                    maxSelections={5}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Origen</label>
                    <input type="text" name="origin" value={formData.origin} readOnly className="glass-input readonly" />
                  </div>
                  <div className="form-group">
                    <label>Tipo Cama</label>
                    <input type="text" name="bedTypeRequired" value={formData.bedTypeRequired} readOnly className="glass-input readonly" />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">2. Clasificación de Gestión (Enfermería / GRD)</h3>
                <div className="form-group">
                  <label>Grupo Diagnóstico (GRD)</label>
                  <SearchableSelect 
                    options={GRD_DATA.map(g => ({ value: g.id, label: `${g.id} - ${g.name}` }))}
                    value={formData.grdId}
                    onChange={(val) => {
                      const newDays = calculateProjectedDays(val, formData.severity);
                      setFormData(prev => ({ ...prev, grdId: val, projectedDays: newDays }));
                    }}
                    placeholder="Seleccione GRD..."
                  />
                </div>
                <div className="form-group">
                  <label>Nivel de Severidad</label>
                  <div className="severity-selector">
                    {[1, 2, 3].map(level => (
                      <button 
                        key={level} 
                        type="button" 
                        className={`severity-btn s-${level} ${parseInt(formData.severity) === level ? 'active' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, severity: level }))}
                      >
                        {level === 1 ? 'Menor' : level === 2 ? 'Moderada' : 'Mayor'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="projection-box glass-panel">
                  <div className="projection-main">
                    <TrendingDown size={24} color="var(--accent-color)" />
                    <div className="projection-details">
                      <span className="label">Proyección de Estada</span>
                      <span className="value">{projectedDays} Días</span>
                    </div>
                  </div>
                  <div className="projection-meta">
                    <Calendar size={14} /> Límite (Outlier): {limitDays} días
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="glass-button" onClick={onClose}>Cancelar</button>
                <button type="submit" className="glass-button primary">
                  <Save size={18} /> Confirmar Asignación Segura
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
