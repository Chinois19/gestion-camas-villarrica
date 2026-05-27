import { useState, useEffect } from 'react';
import { X, Save, Activity, ArrowRight, AlertTriangle, List, HeartPulse, User, LogOut, CheckCircle } from 'lucide-react';
import { GRD_DATA, calculateProjectedDays, getGrdLimit } from '../data/grd';
import SearchableSelect from './SearchableSelect';
import MultiSearchableSelect from './MultiSearchableSelect';
import { CIE10_OPTIONS } from '../data/cie10Options';

export default function EditGrdModal({ bed, allBeds = [], user, onConfirm, onClose, onDischargeRequest, onRequestIC, onFinishCleaning }) {
  const [formData, setFormData] = useState({
    grdId: bed.grdId || '',
    severity: bed.severity || 1,
    projectedDays: bed.projectedDays || 0,
    targetBedId: '',
    diagnosis: Array.isArray(bed.diagnosis) ? bed.diagnosis : (bed.diagnosis ? [bed.diagnosis] : []),
    rut: bed.rut || '13.477.908-2',
    age: bed.age || '58',
    sex: bed.sex || bed.sexo || 'Femenino',
    comuna: bed.comuna || 'Gorbea',
    prevision: bed.prevision || 'DIPRECA',
    especialidadTratante: bed.especialidadTratante || 'Medicina Interna',
    aislamiento: Array.isArray(bed.aislamiento) ? bed.aislamiento : (bed.aislamiento ? [bed.aislamiento] : ['Precauciones de Contacto']),
    novedades: bed.novedades || [],
    showTransferPanel: false,
    transferType: 'libre'
  });

  const [limitDays, setLimitDays] = useState(0);
  const [newNovedadText, setNewNovedadText] = useState('');

  useEffect(() => {
    if (formData.grdId) {
      const defaultDays = calculateProjectedDays(formData.grdId, formData.severity);
      const limit = getGrdLimit(formData.grdId, formData.severity);
      setLimitDays(limit);
    }
  }, [formData.grdId, formData.severity]);

  const handleGrdChange = (val) => {
    const newGrdId = val;
    const newDays = calculateProjectedDays(newGrdId, formData.severity);
    setFormData(prev => ({ ...prev, grdId: newGrdId, projectedDays: newDays }));
  };

  const handleSeverityChange = (level) => {
    const newDays = calculateProjectedDays(formData.grdId, level);
    setFormData(prev => ({ ...prev, severity: level, projectedDays: newDays }));
  };

  const handleChangeDays = (e) => {
    setFormData(prev => ({ ...prev, projectedDays: e.target.value }));
  };

  const handleAddNovedad = () => {
    if (!newNovedadText.trim()) return;
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newEntry = {
      id: Date.now(),
      fecha: formattedDate,
      usuario: user?.name || user?.username || 'Médico de Turno',
      rol: user?.role || 'Clinico',
      contenido: newNovedadText.trim()
    };
    setFormData(prev => ({
      ...prev,
      novedades: [newEntry, ...prev.novedades]
    }));
    setNewNovedadText('');
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    const grd = GRD_DATA.find(g => g.id === formData.grdId);
    
    let transferTarget = null;
    if (formData.showTransferPanel && formData.targetBedId) {
      const [roomId, bedId] = formData.targetBedId.split('|');
      transferTarget = { roomId, bedId, type: formData.transferType };
    }

    onConfirm({
      grdId: formData.grdId,
      grdName: grd ? grd.name : '',
      severity: formData.severity,
      projectedDays: parseInt(formData.projectedDays) || 0,
      diagnosis: formData.diagnosis,
      rut: formData.rut,
      comuna: formData.comuna,
      prevision: formData.prevision,
      especialidadTratante: formData.especialidadTratante,
      aislamiento: formData.aislamiento,
      novedades: formData.novedades
    }, transferTarget);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="glass-panel modal-content" style={{ maxWidth: '1100px', width: 'min(98vw, 1100px)', height: 'min(95vh, 850px)', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* Header */}
        <div className="modal-header" style={{ background: 'var(--panel-bg)', borderBottom: '1px solid var(--glass-border)', padding: '20px 24px', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-color)' }}>
              <Activity size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Gestión de Caso
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Hab — Cama {bed.id} · {bed.tag || bed.type}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Modal Body */}
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
              
              {/* Left Column (Sidebar) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 1. IDENTIFICACIÓN */}
                <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', zIndex: 40 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '1rem' }}>👤</span>
                    <h4 style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-color)' }}>Identificación</h4>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Paciente</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{bed.patient}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>RUT</div>
                        <input 
                          type="text" 
                          className="glass-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', width: '100%' }}
                          value={formData.rut} 
                          onChange={e => setFormData(prev => ({ ...prev, rut: e.target.value }))} 
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Edad / Sexo</div>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', marginTop: '6px' }}>{formData.age} años · {formData.sex}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Comuna</div>
                        <input 
                          type="text" 
                          className="glass-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', width: '100%' }}
                          value={formData.comuna} 
                          onChange={e => setFormData(prev => ({ ...prev, comuna: e.target.value }))} 
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Previsión</div>
                        <input 
                          type="text" 
                          className="glass-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', width: '100%' }}
                          value={formData.prevision} 
                          onChange={e => setFormData(prev => ({ ...prev, prevision: e.target.value }))} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. ESPECIALIDAD TRATANTE ACTUAL */}
                <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', zIndex: 30 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '1rem' }}>🩺</span>
                    <h4 style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-color)' }}>Especialidad Tratante</h4>
                  </div>
                  <select 
                    className="glass-input" 
                    style={{ width: '100%', fontSize: '0.8rem' }}
                    value={formData.especialidadTratante}
                    onChange={e => setFormData(prev => ({ ...prev, especialidadTratante: e.target.value }))}
                  >
                    <option value="Medicina Interna">Medicina Interna</option>
                    <option value="Cirugía General">Cirugía General</option>
                    <option value="Pediatría">Pediatría</option>
                    <option value="Obstetricia y Ginecología">Obstetricia y Ginecología</option>
                    <option value="Traumatología">Traumatología</option>
                    <option value="Cardiología">Cardiología</option>
                  </select>
                </div>

                {/* 3. AISLAMIENTO (PRECAUCIONES) */}
                <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', zIndex: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '1rem' }}>🛡️</span>
                    <h4 style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-color)' }}>Aislamiento</h4>
                  </div>
                  <MultiSearchableSelect 
                    options={[
                      { value: 'Sin Precauciones', label: 'Sin Precauciones' },
                      { value: 'Precauciones de Contacto', label: 'Precauciones de Contacto' },
                      { value: 'Precauciones de Gotitas', label: 'Precauciones de Gotitas' },
                      { value: 'Precauciones Aéreas', label: 'Precauciones Aéreas' }
                    ]}
                    value={formData.aislamiento}
                    onChange={(val) => setFormData(prev => ({ ...prev, aislamiento: val }))}
                    placeholder="Seleccionar..."
                  />
                </div>

                {/* 4. ACCIONES RÁPIDAS */}
                <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', zIndex: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '1rem' }}>⚡</span>
                    <h4 style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-color)' }}>Acciones Rápidas</h4>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                      type="button" 
                      className="glass-button" 
                      style={{ 
                        justifyContent: 'space-between', 
                        padding: '10px 12px', 
                        fontSize: '0.78rem',
                        borderColor: 'rgba(168,85,247,0.3)',
                        background: 'rgba(168,85,247,0.03)'
                      }}
                      onClick={() => onDischargeRequest ? onDischargeRequest(bed) : null}
                    >
                      <span>🚪 Dar Alta Médica</span>
                      <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>➔</span>
                    </button>

                    <button 
                      type="button" 
                      className="glass-button" 
                      style={{ 
                        justifyContent: 'space-between', 
                        padding: '10px 12px', 
                        fontSize: '0.78rem',
                        borderColor: 'rgba(59,130,246,0.3)',
                        background: 'rgba(59,130,246,0.03)'
                      }}
                      onClick={() => onRequestIC ? onRequestIC(bed) : null}
                    >
                      <span>📋 Interconsulta</span>
                      <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>+</span>
                    </button>
                    
                    {/* Botón para alternar traslado */}
                    <button 
                      type="button" 
                      className="glass-button" 
                      style={{ 
                        justifyContent: 'space-between', 
                        padding: '10px 12px', 
                        fontSize: '0.78rem',
                        borderColor: formData.showTransferPanel ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                        background: formData.showTransferPanel ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)'
                      }}
                      onClick={() => setFormData(prev => ({ ...prev, showTransferPanel: !prev.showTransferPanel }))}
                    >
                      <span>🔄 Traslado de Paciente</span>
                      <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{formData.showTransferPanel ? '▼' : '▲'}</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column (Clinical Data & GRD / Logs) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* A. GESTIÓN CLÍNICA (GRD) */}
                <div className="glass-panel" style={{ padding: '20px', zIndex: 40 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                    <span style={{ fontSize: '1.1rem' }}>📋</span>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Gestión Clínica (GRD)</h3>
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Diagnóstico de Ingreso (Hasta 5)
                    </label>
                    <MultiSearchableSelect 
                      options={CIE10_OPTIONS}
                      value={formData.diagnosis}
                      onChange={(val) => setFormData(prev => ({ ...prev, diagnosis: val }))}
                      placeholder="Buscar diagnósticos CIE-10..."
                      maxSelections={5}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                      Grupo Diagnóstico (GRD)
                    </label>
                    <SearchableSelect 
                      options={GRD_DATA.map(g => ({ value: g.id, label: `${g.id} - ${g.name}` }))}
                      value={formData.grdId}
                      onChange={handleGrdChange}
                      placeholder="Seleccione GRD..."
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'end', marginTop: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                        Nivel de Severidad
                      </label>
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
                                flex: 1,
                                padding: '8px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                borderRadius: '8px',
                                border: `1px solid ${isSelected ? colors.border : 'var(--glass-border)'}`,
                                background: isSelected ? colors.bg : 'var(--inset-bg)',
                                color: isSelected ? colors.text : 'var(--text-secondary)',
                                cursor: formData.grdId ? 'pointer' : 'not-allowed',
                                opacity: formData.grdId ? 1 : 0.5,
                                transition: 'all 0.2s ease',
                                boxShadow: isSelected ? 'var(--shadow-glow)' : 'none'
                              }}
                              onClick={() => handleSeverityChange(level)}
                              disabled={!formData.grdId}
                            >
                              {level === 1 ? 'Menor' : level === 2 ? 'Moderada' : 'Mayor'}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                        Días de Estada Proyectada
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input 
                          type="number" 
                          value={formData.projectedDays} 
                          onChange={handleChangeDays} 
                          className="glass-input" 
                          style={{ width: '80px', padding: '6px 10px', textAlign: 'center', fontWeight: 700 }}
                          min="0"
                        />
                        {limitDays > 0 && (
                          <div style={{ 
                            padding: '6px 12px', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(245,158,11,0.3)', 
                            background: 'rgba(245,158,11,0.06)',
                            color: '#f59e0b',
                            fontSize: '0.72rem',
                            fontWeight: 600
                          }}>
                            ⚠️ Límite Outlier: {limitDays} días
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* B. SECCIÓN OPCIONAL: TRASLADO DE PACIENTE (COLLAPSIBLE) */}
                {formData.showTransferPanel && (
                  <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--accent-color)', boxShadow: 'var(--shadow-glow)', zIndex: 30 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <span style={{ fontSize: '1.1rem' }}>🔄</span>
                      <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-color)' }}>Traslado de Cama</h3>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: formData.transferType === 'libre' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        <input 
                          type="radio" 
                          name="transferType" 
                          value="libre" 
                          checked={formData.transferType === 'libre'} 
                          onChange={(e) => setFormData(prev => ({ ...prev, transferType: e.target.value, targetBedId: '' }))}
                        />
                        Cama Libre
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: formData.transferType === 'enroque' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        <input 
                          type="radio" 
                          name="transferType" 
                          value="enroque" 
                          checked={formData.transferType === 'enroque'} 
                          onChange={(e) => setFormData(prev => ({ ...prev, transferType: e.target.value, targetBedId: '' }))}
                        />
                        Coordinado (Enroque)
                      </label>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Seleccione Cama de Destino</label>
                      <select 
                        name="targetBedId" 
                        value={formData.targetBedId} 
                        onChange={(e) => setFormData(prev => ({ ...prev, targetBedId: e.target.value }))}
                        className="glass-input"
                        style={{ width: '100%', padding: '10px 12px' }}
                      >
                        <option value="">-- Mantener en cama actual --</option>
                        {allBeds
                          .filter(b => b.id !== bed.id && b.roomId !== bed.roomId && (formData.transferType === 'libre' ? b.status === 'available' : b.status === 'occupied'))
                          .map(b => (
                          <option key={`${b.roomId}|${b.id}`} value={`${b.roomId}|${b.id}`}>
                            {b.floor ? `${b.floor} - ` : ''}Hab {b.roomId} - Cama {b.id} ({b.tag || b.type}) {formData.transferType === 'enroque' && b.patient ? `- ${b.patient}` : ''}
                          </option>
                        ))}
                      </select>

                      {formData.targetBedId && (
                        (() => {
                          const [tRoomId, tBedId] = formData.targetBedId.split('|');
                          const tBed = allBeds.find(b => String(b.roomId) === tRoomId && String(b.id) === tBedId);
                          const currentTag = bed.tag || bed.type;
                          const targetTag = tBed?.tag || tBed?.type;
                          
                          if (tBed && currentTag !== targetTag) {
                            return (
                              <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '0.8rem' }}>
                                <span style={{ fontSize: '1rem' }}>⚠️</span>
                                Incompatibilidad: {bed.bedTypeRequired || currentTag} vs {targetTag}.
                              </div>
                            );
                          }
                          return null;
                        })()
                      )}
                    </div>
                  </div>
                )}

                {/* C. PROCEDIMIENTOS Y NOVEDADES */}
                <div className="glass-panel" style={{ padding: '20px', zIndex: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
                    <span style={{ fontSize: '1.1rem' }}>🏥</span>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Procedimientos y Novedades</h3>
                  </div>

                  {/* Input de Registro */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <input 
                      type="text" 
                      className="glass-input" 
                      style={{ flex: 1 }}
                      placeholder="Registrar nuevo procedimiento o novedad del estado del paciente..."
                      value={newNovedadText}
                      onChange={e => setNewNovedadText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNovedad();
                        }
                      }}
                    />
                    <button 
                      type="button" 
                      className="glass-button primary" 
                      style={{ padding: '0 16px', fontSize: '0.8rem' }}
                      onClick={handleAddNovedad}
                    >
                      Registrar
                    </button>
                  </div>

                  {/* Lista de Registros */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                    {formData.novedades && formData.novedades.length > 0 ? (
                      formData.novedades.map((nov) => (
                        <div 
                          key={nov.id} 
                          style={{ 
                            padding: '10px 12px', 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid var(--glass-border)', 
                            borderRadius: '10px', 
                            fontSize: '0.8rem' 
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.72rem', opacity: 0.8 }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>
                              👤 {nov.usuario} ({nov.rol})
                            </span>
                            <span style={{ color: 'var(--text-secondary)' }}>🕒 {nov.fecha}</span>
                          </div>
                          <div style={{ color: 'var(--text-primary)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                            {nov.contenido}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        No hay procedimientos registrados.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions" style={{ background: 'var(--panel-bg)', borderTop: '1px solid var(--glass-border)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="glass-button" onClick={onClose} style={{ background: '#4c1d95', color: '#fff', border: 'none' }}>Cancelar</button>
            <button type="submit" className="glass-button primary" style={{ background: '#0891b2', color: '#fff', border: 'none' }}>
              <Save size={18} /> Guardar Cambios
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
