import { useState, useEffect } from 'react';
import { X, Save, Clock, Calendar, Activity, ChevronRight, AlertCircle, TrendingDown, AlertTriangle, User, Stethoscope, ArrowRightLeft, Heart } from 'lucide-react';
import { GRD_DATA, calculateProjectedDays, getGrdLimit } from '../data/grd';
import SearchableSelect from './SearchableSelect';
import MultiSearchableSelect from './MultiSearchableSelect';
import { CIE10_OPTIONS } from '../data/cie10Options';

function ReadOnlyField({ label, value, color }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700, letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', color: color || 'var(--text-primary)', minHeight: '36px', display: 'flex', alignItems: 'center' }}>
        {value || '—'}
      </div>
    </div>
  );
}

export default function AssignmentModal({ patient, bed, onConfirm, onClose }) {
  const [formData, setFormData] = useState({
    patientName: patient.name || '',
    diagnosis: Array.isArray(patient.diagnosis) ? patient.diagnosis : (patient.diagnosis ? [patient.diagnosis] : []),
    origin: patient.origin || '',
    bedTypeRequired: patient.bedTypeRequired || '',
    grdId: '',
    severity: 1
  });

  const [projectedDays, setProjectedDays] = useState(0);
  const [limitDays, setLimitDays] = useState(0);
  const requestTime = new Date(patient.requestedAt);
  const assignTime = new Date();
  
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

  // Helper arrays for conditional rendering
  const vitalSigns = [
    { label: 'PA Sistólica', val: patient.paSist, unit: 'mmHg' },
    { label: 'PA Diastólica', val: patient.paDiast, unit: 'mmHg' },
    { label: 'Frec. Cardíaca', val: patient.frecCard, unit: 'lpm' },
    { label: 'Frec. Respiratoria', val: patient.frecResp, unit: 'rpm' },
    { label: 'Temperatura', val: patient.temp, unit: '°C' },
    { label: 'Saturación O₂', val: patient.satO2, unit: '%' },
    { label: 'Glicemia', val: patient.glicemia, unit: 'mg/dL' },
    { label: 'EVA Dolor', val: patient.evaDolor, unit: '0-10' },
  ].filter(v => v.val);

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="glass-panel modal-content assignment-form" style={{ maxWidth: '1200px', width: 'min(98vw, 1200px)', height: 'min(95vh, 850px)', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ background: 'var(--panel-bg)', borderBottom: '1px solid var(--glass-border)', padding: '20px 24px', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--accent-color)' }}>
              <Activity size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Asignación Clínica de Cama</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Validación de solicitud y clasificación GRD
              </p>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          
          {/* Modal Body */}
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            
            {bed.serviceMismatch && (
              <div className="glass-panel" style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px solid rgba(255, 170, 0, 0.5)', padding: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ffaa00' }}>
                  <AlertTriangle size={24} />
                  <div>
                    <strong>Advertencia de Incompatibilidad:</strong> Está asignando un paciente que requiere cama <strong>{patient.bedTypeRequired}</strong> a una cama etiquetada como <strong>{bed.bedType || bed.tag || 'Básica'}</strong>.
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
              
              {/* Left Column (Sidebar) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="traceability-section glass-panel" style={{ padding: '16px' }}>
                  <h3 className="section-title" style={{ fontSize: '0.8rem', color: 'var(--accent-color)', borderColor: 'var(--glass-border)', paddingBottom: '8px', marginBottom: '12px' }}>
                    <Clock size={16} /> Trazabilidad de Tiempo
                  </h3>
                  <div className="trace-item" style={{ marginBottom: '8px' }}>
                    <span className="label" style={{ fontSize: '0.65rem' }}>Solicitud:</span>
                    <span className="value" style={{ fontSize: '0.85rem' }}>{requestTime.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="trace-item" style={{ marginBottom: '8px' }}>
                    <span className="label" style={{ fontSize: '0.65rem' }}>Asignación:</span>
                    <span className="value" style={{ fontSize: '0.85rem' }}>{assignTime.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="trace-item highlight" style={{ marginBottom: '8px', background: 'rgba(0,212,255,0.05)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(0,212,255,0.2)' }}>
                    <span className="label" style={{ fontSize: '0.65rem', color: 'var(--accent-color)' }}>Tiempo Total de Espera:</span>
                    <span className="value" style={{ fontSize: '1.2rem', color: 'var(--accent-color)' }}>{waitHours}h {waitMinutes % 60}m</span>
                  </div>
                  <div className="trace-item" style={{ marginTop: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
                    <span className="label" style={{ fontSize: '0.65rem' }}>Destino de Asignación:</span>
                    <span className="value" style={{ fontSize: '0.9rem', fontWeight: 700 }}>Hab. {bed.roomId} — Cama {bed.id || bed.bedId}</span>
                  </div>
                </div>
              </div>

              {/* Right Column (Clinical Data & GRD) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. Validación de Solicitud */}
                <div className="glass-panel" style={{ padding: '20px', position: 'relative', zIndex: 30 }}>
                  <h3 className="section-title" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderColor: 'var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>
                    1. Validación de Solicitud (Médica)
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Nombre del Paciente</label>
                      <input type="text" name="patientName" value={formData.patientName} onChange={handleChange} className="glass-input" />
                    </div>
                    
                    <ReadOnlyField label="RUT" value={patient.rut} />
                    <ReadOnlyField label="Edad / Sexo" value={`${patient.age || patient.edad || '—'} años · ${patient.sex || patient.sexo || '—'}`} />
                    <ReadOnlyField label="Previsión" value={patient.prevision} />
                    <ReadOnlyField label="Comuna" value={patient.comuna} />
                    
                    <ReadOnlyField label="Médico Solicitante" value={patient.medicoSol} />
                    <ReadOnlyField label="Especialidad" value={patient.especialidadMedico} />
                    
                    <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                      <label>Diagnóstico de Ingreso (Validación CIE-10)</label>
                      <MultiSearchableSelect 
                        options={CIE10_OPTIONS}
                        value={formData.diagnosis}
                        onChange={(val) => setFormData(prev => ({ ...prev, diagnosis: val }))}
                        placeholder="Buscar diagnósticos CIE-10..."
                        maxSelections={5}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Servicio Origen</label>
                      <input type="text" name="origin" value={formData.origin} onChange={handleChange} className="glass-input" />
                    </div>
                    <div className="form-group">
                      <label>Tipo de Cama Requerida</label>
                      <input type="text" name="bedTypeRequired" value={formData.bedTypeRequired} onChange={handleChange} className="glass-input" />
                    </div>
                  </div>
                </div>

                {/* 2. Requerimientos y Vitales */}
                <div className="glass-panel" style={{ padding: '20px', position: 'relative', zIndex: 20 }}>
                  <h3 className="section-title" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderColor: 'var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>
                    2. Resumen Clínico
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <ReadOnlyField label="Requisitos UGP" value={patient.requisitosUGP} />
                    <ReadOnlyField label="Req. Enfermería" value={patient.reqEnfermeria} />
                    <ReadOnlyField label="Procedimientos Pendientes" value={patient.procedimientosPendientes} />
                    <ReadOnlyField label="Aislamiento" value={Array.isArray(patient.aislamiento) ? patient.aislamiento.join(', ') : patient.aislamiento} color={patient.aislamiento ? '#ef4444' : ''} />
                  </div>
                  
                  {vitalSigns.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.05em' }}>Signos Vitales</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {vitalSigns.map((v, i) => (
                          <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{v.label}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{v.val} <span style={{ fontSize: '0.6rem', fontWeight: 400 }}>{v.unit}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Clasificación GRD */}
                <div className="glass-panel" style={{ padding: '20px', position: 'relative', zIndex: 10 }}>
                  <h3 className="section-title" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderColor: 'var(--glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>
                    3. Clasificación de Gestión (Enfermería / GRD)
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                        <div className="severity-selector" style={{ display: 'flex', gap: '8px' }}>
                          {[1, 2, 3].map(level => {
                            const isSelected = parseInt(formData.severity) === level;
                            const colors = level === 1 
                              ? { bg: 'rgba(34,197,94,0.15)', border: '#22c55e', text: '#22c55e' }
                              : level === 2 
                              ? { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#f59e0b' }
                              : { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#ef4444' };
                            return (
                              <button 
                                key={level} 
                                type="button" 
                                style={{
                                  flex: 1, padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, borderRadius: '8px',
                                  border: `1px solid ${isSelected ? colors.border : 'var(--glass-border)'}`,
                                  background: isSelected ? colors.bg : 'var(--inset-bg)',
                                  color: isSelected ? colors.text : 'var(--text-secondary)',
                                  cursor: 'pointer', transition: 'all 0.2s ease',
                                  boxShadow: isSelected ? 'var(--shadow-glow)' : 'none'
                                }}
                                onClick={() => setFormData(prev => ({ ...prev, severity: level }))}
                              >
                                {level === 1 ? 'Menor' : level === 2 ? 'Moderada' : 'Mayor'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="projection-box glass-panel" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', minHeight: '100px' }}>
                      <div className="projection-main" style={{ marginBottom: '4px' }}>
                        <TrendingDown size={28} color="var(--accent-color)" />
                        <div className="projection-details">
                          <span className="label" style={{ fontSize: '0.7rem' }}>Proyección de Estada</span>
                          <span className="value" style={{ fontSize: '2rem' }}>{projectedDays} Días</span>
                        </div>
                      </div>
                      <div className="projection-meta" style={{ marginTop: '8px', borderTop: '1px solid rgba(0,212,255,0.2)', paddingTop: '8px' }}>
                        <Calendar size={14} /> Límite (Outlier): {limitDays} días
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions" style={{ background: 'var(--panel-bg)', borderTop: '1px solid var(--glass-border)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', margin: 0 }}>
            <button type="button" className="glass-button" onClick={onClose} style={{ background: '#4c1d95', color: '#fff', border: 'none' }}>Cancelar</button>
            <button type="submit" className="glass-button primary" style={{ background: '#0891b2', color: '#fff', border: 'none' }}>
              <Save size={18} /> Confirmar Asignación Segura
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
