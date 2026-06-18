import { useState, useEffect } from 'react';
import { X, Save, Clock, Calendar, Activity, ChevronRight, AlertCircle, TrendingDown, AlertTriangle, User, Stethoscope, ArrowRightLeft, Heart } from 'lucide-react';
import { GRD_DATA, calculateProjectedDays, getGrdLimit } from '../data/grd';
import SearchableSelect from './SearchableSelect';
import MultiSearchableSelect from './MultiSearchableSelect';
import { CIE10_OPTIONS } from '../data/cie10Options';
import { formatAgeDetailed } from '../utils/age';

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

export default function AssignmentModal({ patient, bed, user, onConfirm, onClose }) {
  // Reconstruir diagnóstico CIE-10 priorizando los campos codificados del formulario de solicitud.
  // patient.dxCie10 y patient.secondaryCodes son los campos guardados por SolicitudForm con los
  // códigos reales. Solo usamos patient.diagnosis como fallback (puede ser texto libre como "ICC").
  const buildDiagnosisCodes = () => {
    const cie10Regex = /^[A-Z]\d{2}(\.\d+)?/; // detecta formato CIE-10 real
    // Si existe dxCie10 en el paciente, reconstruir desde esos campos
    if (patient.dxCie10) {
      const codes = [patient.dxCie10 + (patient.dxCie10.includes(' - ') ? '' : '')];
      // Buscar descripción completa desde CIE10_OPTIONS
      const mainOption = CIE10_OPTIONS.find(o => o.value.startsWith(patient.dxCie10));
      const mainCode = mainOption ? mainOption.value : patient.dxCie10;
      const result = [mainCode];
      if (Array.isArray(patient.secondaryCodes)) {
        patient.secondaryCodes.forEach(sc => {
          const opt = CIE10_OPTIONS.find(o => o.value.startsWith(sc));
          result.push(opt ? opt.value : sc);
        });
      }
      return result;
    }
    // Si diagnosis ya es un array, filtrar solo los que tengan formato CIE-10 real
    if (Array.isArray(patient.diagnosis)) {
      const cie10Entries = patient.diagnosis.filter(d => cie10Regex.test(d));
      if (cie10Entries.length > 0) return cie10Entries;
    }
    // Si diagnosis es string con formato CIE-10, usarlo
    if (typeof patient.diagnosis === 'string' && cie10Regex.test(patient.diagnosis)) {
      return [patient.diagnosis];
    }
    // Fallback: devolver vacío para que el usuario lo complete en el modal
    return [];
  };

  const [formData, setFormData] = useState({
    patientName: patient.name || '',
    diagnosis: buildDiagnosisCodes(),
    origin: patient.origin || '',
    bedTypeRequired: patient.bedTypeRequired || '',
    grdId: '',
    severity: 1
  });

  const [projectedDays, setProjectedDays] = useState(0);
  const [limitDays, setLimitDays] = useState(0);
  
  const canEditRetroactive = user?.role === 'superadmin' || user?.role === 'gestor_camas';

  const [customDate, setCustomDate] = useState(() => {
    const d = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  const [customTime, setCustomTime] = useState(() => {
    const d = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const getParsedAssignTime = () => {
    if (!canEditRetroactive) {
      return new Date();
    }
    if (!customDate || !customTime) {
      return new Date();
    }
    const parsed = new Date(`${customDate}T${customTime}:00`);
    if (isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  };

  const requestTime = new Date(patient.requestedAt);
  const assignTime = getParsedAssignTime();
  
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
    
    if (canEditRetroactive) {
      const selectedTime = getParsedAssignTime();
      if (selectedTime < requestTime) {
        alert('La fecha y hora del acueste no puede ser anterior a la fecha de la solicitud.');
        return;
      }
      const now = new Date();
      if (selectedTime > now) {
        alert('La fecha y hora del acueste no puede ser posterior a la fecha y hora actual.');
        return;
      }
    }

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
        <div className="modal-header grd-modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', padding: '20px 24px', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar" style={{ background: 'rgba(255, 255, 255, 0.18)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.25)' }}>
              <Activity size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '0.02em' }}>Asignación Clínica de Cama</h2>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.85)', marginTop: '3px', marginBottom: 0, fontWeight: 500 }}>
                Validación de solicitud y clasificación GRD
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="close-btn" 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              transition: 'all 0.2s ease',
              width: '36px',
              height: '36px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.45)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.color = '#ffffff';
            }}
          >
            <X size={20} />
          </button>
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
                  {canEditRetroactive ? (
                    <>
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }}>
                          Fecha Asignación (Editable):
                        </label>
                        <input
                          type="date"
                          value={customDate}
                          onChange={e => setCustomDate(e.target.value)}
                          className="glass-input"
                          style={{
                            width: '100%',
                            background: 'rgba(245,158,11,0.05)',
                            border: '1px solid rgba(245,158,11,0.4)',
                            borderRadius: '8px',
                            color: '#f59e0b',
                            fontFamily: 'var(--font)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            padding: '8px 12px',
                            boxSizing: 'border-box',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }}>
                          Hora Asignación (Editable):
                        </label>
                        <input
                          type="time"
                          value={customTime}
                          onChange={e => setCustomTime(e.target.value)}
                          className="glass-input"
                          style={{
                            width: '100%',
                            background: 'rgba(245,158,11,0.05)',
                            border: '1px solid rgba(245,158,11,0.4)',
                            borderRadius: '8px',
                            color: '#f59e0b',
                            fontFamily: 'var(--font)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            padding: '8px 12px',
                            boxSizing: 'border-box',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="trace-item" style={{ marginBottom: '8px' }}>
                      <span className="label" style={{ fontSize: '0.65rem' }}>Asignación:</span>
                      <span className="value" style={{ fontSize: '0.85rem' }}>{assignTime.toLocaleString('es-CL')}</span>
                    </div>
                  )}
                  <div className="trace-item highlight" style={{ 
                    marginBottom: '8px', 
                    background: assignTime < requestTime ? 'rgba(239,68,68,0.05)' : 'rgba(0,212,255,0.05)', 
                    padding: '8px', 
                    borderRadius: '8px', 
                    border: assignTime < requestTime ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(0,212,255,0.2)' 
                  }}>
                    <span className="label" style={{ fontSize: '0.65rem', color: assignTime < requestTime ? '#ef4444' : 'var(--accent-color)' }}>Tiempo Total de Espera:</span>
                    <span className="value" style={{ fontSize: '1.2rem', color: assignTime < requestTime ? '#ef4444' : 'var(--accent-color)' }}>
                      {assignTime < requestTime ? 'Inválido (menor a solicitud)' : `${waitHours}h ${waitMinutes % 60}m`}
                    </span>
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
                    <ReadOnlyField label="Edad / Sexo" value={`${formatAgeDetailed(patient.fechaNacimiento, patient.age || patient.edad)} · ${patient.sex || patient.sexo || '—'}`} />
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
                    <ReadOnlyField 
                      label="Aislamiento" 
                      value={
                        Array.isArray(patient.aislamiento) 
                          ? (patient.aislamiento.length > 0 ? patient.aislamiento.join(', ') : 'No especificado')
                          : patient.aislamiento === true 
                            ? 'Sí (Requiere Aislamiento) ⚠️' 
                            : patient.aislamiento === false 
                              ? 'No ✅' 
                              : 'No especificado'
                      } 
                      color={patient.aislamiento === true || (Array.isArray(patient.aislamiento) && patient.aislamiento.some(a => a !== 'Sin Precauciones')) ? '#ef4444' : ''} 
                    />
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
                            return (
                              <button 
                                key={level} 
                                type="button" 
                                className={`severity-btn ${isSelected ? `active s-${level}` : ''}`}
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
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
                    
                     <div className="projection-box glass-panel outlier-warning" style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', minHeight: '100px' }}>
                       <div className="projection-main" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <AlertTriangle size={28} />
                         <div className="projection-details" style={{ display: 'flex', flexDirection: 'column' }}>
                           <span className="label" style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>Límite Outliers</span>
                           <span className="value" style={{ fontSize: '1.8rem', fontWeight: 800 }}>{limitDays} Días</span>
                         </div>
                       </div>
                       <div className="projection-meta" style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px', opacity: 0.9 }}>
                         <span style={{ fontSize: '0.62rem', textTransform: 'uppercase' }}>Promedio días de estada Hospital de Villarrica</span>
                         <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{projectedDays} días <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>(histórico)</span></span>
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
