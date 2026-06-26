import { useState, useEffect } from 'react';
import { X, Save, Activity, ArrowRight, AlertTriangle, List, HeartPulse, User, LogOut, CheckCircle, Eye } from 'lucide-react';
import { GRD_DATA, calculateProjectedDays, getGrdLimit } from '../data/grd';
import SearchableSelect from './SearchableSelect';
import MultiSearchableSelect from './MultiSearchableSelect';
import { CIE10_OPTIONS } from '../data/cie10Options';
import { ESPECIALIDADES } from '../data/formData';
import { formatAgeDetailed } from '../utils/age';
import ViewInterconsultaModal from './ViewInterconsultaModal';

const formatRut = (val) => {
  if (!val) return '';
  const clean = val.replace(/[^0-9kK]/g, '');
  if (clean.length <= 1) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1).toUpperCase()}`;
};

export default function EditGrdModal({ bed, allBeds = [], user, onConfirm, onClose, onDischargeRequest, onRequestIC, onFinishCleaning, onSaveNovedad }) {
  // Reconstruir diagnóstico CIE-10 priorizando los campos codificados.
  // Puede venir de bed.dxCie10 + bed.secondaryCodes (si el paciente fue registrado con CIE-10)
  // o desde bed.originalWaitingRequest que guarda la solicitud original.
  const buildDiagnosisCodes = () => {
    const cie10Regex = /^[A-Z]\d{2}(\.\d+)?/;
    // Intentar desde los datos de la solicitud original guardada en la cama
    const orig = bed.originalWaitingRequest;
    const dxCie10 = bed.dxCie10 || orig?.dxCie10;
    const secondaryCodes = bed.secondaryCodes || orig?.secondaryCodes;

    if (dxCie10) {
      const mainOption = CIE10_OPTIONS.find(o => o.value.startsWith(dxCie10));
      const mainCode = mainOption ? mainOption.value : dxCie10;
      const result = [mainCode];
      if (Array.isArray(secondaryCodes)) {
        secondaryCodes.forEach(sc => {
          const opt = CIE10_OPTIONS.find(o => o.value.startsWith(sc));
          result.push(opt ? opt.value : sc);
        });
      }
      return result;
    }
    // Si bed.diagnosis ya es array con formato CIE-10 real, usarlo
    if (Array.isArray(bed.diagnosis)) {
      const cie10Entries = bed.diagnosis.filter(d => cie10Regex.test(d));
      if (cie10Entries.length > 0) return cie10Entries;
    }
    // Si es string con formato CIE-10
    if (typeof bed.diagnosis === 'string' && cie10Regex.test(bed.diagnosis)) {
      return [bed.diagnosis];
    }
    // Texto libre (ej "ICC"): devolver vacío para que el usuario complete
    return [];
  };

  const [formData, setFormData] = useState({
    grdId: bed.grdId || '',
    severity: bed.severity || 1,
    projectedDays: bed.projectedDays || 0,
    targetBedId: '',
    diagnosis: buildDiagnosisCodes(),
    rut: formatRut(bed.rut || '13.477.908-2'),
    age: bed.age || '58',
    fechaNacimiento: bed.fechaNacimiento || '',
    sex: bed.sex || bed.sexo || 'Femenino',
    comuna: bed.comuna || 'Gorbea',
    prevision: bed.prevision || 'DIPRECA',
    dxPrincipal: bed.dxPrincipal || bed.originalWaitingRequest?.dxPrincipal || '',
    especialidadTratante: Array.isArray(bed.especialidadTratante) ? bed.especialidadTratante : (bed.especialidadTratante ? [bed.especialidadTratante] : []),
    aislamiento: (() => {
      if (Array.isArray(bed.aislamiento)) {
        return bed.aislamiento;
      }
      if (bed.aislamiento === true) {
        return ['Requiere Aislamiento'];
      }
      if (bed.aislamiento === false || bed.aislamiento === 'Sin Precauciones') {
        return ['Sin Precauciones'];
      }
      if (typeof bed.aislamiento === 'string') {
        return [bed.aislamiento];
      }
      return ['Sin Precauciones'];
    })(),
    novedades: bed.novedades || [],
    destino: bed.destino || 'Cuidados Medios',
    showTransferPanel: false,
    transferType: 'libre'
  });

  const [limitDays, setLimitDays] = useState(0);
  const [newNovedadText, setNewNovedadText] = useState('');
  const [isSavingNovedad, setIsSavingNovedad] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingIC, setViewingIC] = useState(null);

  // Permisos del rol Gestora de Servicio Clínico
  const isGestoraServicio = user?.role === 'gestora_servicio';

  const assignedDate = bed.assignedAt ? new Date(bed.assignedAt) : null;
  const daysOfStay = assignedDate ? Math.max(1, Math.ceil((new Date() - assignedDate) / (1000 * 60 * 60 * 24))) : 1;

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

  const handleAddNovedad = async () => {
    if (!newNovedadText.trim() || isSavingNovedad) return;
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newEntry = {
      id: Date.now(),
      fecha: formattedDate,
      usuario: user?.name || user?.username || 'Médico de Turno',
      rol: user?.role || 'Clinico',
      contenido: newNovedadText.trim()
    };
    // 1. Actualizar estado local del modal (respuesta inmediata en UI)
    setFormData(prev => ({
      ...prev,
      novedades: [newEntry, ...prev.novedades]
    }));
    setNewNovedadText('');
    // 2. Persistir en Firebase y esperar confirmación antes de re-habilitar el botón
    if (onSaveNovedad) {
      setIsSavingNovedad(true);
      try {
        await onSaveNovedad(newEntry);
      } finally {
        setIsSavingNovedad(false);
      }
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    const grd = GRD_DATA.find(g => g.id === formData.grdId);

    let transferTarget = null;
    if (formData.showTransferPanel && formData.targetBedId) {
      const [roomId, bedId] = formData.targetBedId.split('|');
      transferTarget = { roomId, bedId, type: formData.transferType };
    }

    // Gestora de Servicio sólo persiste novedades (no puede cambiar GRD ni otros campos clínicos)
    setIsSaving(true);
    try {
      await onConfirm({
        grdId: formData.grdId,
        grdName: grd ? grd.name : '',
        severity: formData.severity,
        projectedDays: parseInt(formData.projectedDays) || 0,
        diagnosis: formData.diagnosis,
        dxPrincipal: formData.dxPrincipal,
        rut: formData.rut,
        age: formData.age,
        fechaNacimiento: formData.fechaNacimiento,
        comuna: formData.comuna,
        prevision: formData.prevision,
        especialidadTratante: formData.especialidadTratante,
        aislamiento: formData.aislamiento,
        novedades: formData.novedades,
        destino: formData.destino
      }, transferTarget);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="glass-panel modal-content" style={{ maxWidth: '1100px', width: 'min(98vw, 1100px)', height: 'min(95vh, 850px)', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div className="modal-header grd-modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', padding: '20px 24px', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar" style={{ background: 'rgba(255, 255, 255, 0.18)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.25)' }}>
              <Activity size={20} />
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '0.02em' }}>
                  Gestión de Caso
                </h2>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.85)', marginTop: '3px', marginBottom: 0, fontWeight: 500 }}>
                  Hab — Cama {bed.id} · {bed.tag || bed.type}
                </p>
              </div>
              {bed.assignedAt && (
                <div style={{
                  padding: '6px 16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff', fontSize: '0.85rem', fontWeight: 800,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
                }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.85)', textTransform: 'uppercase' }}>Días de Estada</span>
                  <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{daysOfStay}</span>
                </div>
              )}
            </div>
          </div>
          <button
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
                          onChange={e => setFormData(prev => ({ ...prev, rut: formatRut(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Fecha de Nacimiento</div>
                        <input
                          type="date"
                          className="glass-input"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', width: '100%' }}
                          value={formData.fechaNacimiento}
                          onChange={e => {
                            const val = e.target.value;
                            let computedAge = formData.age;
                            if (val) {
                              const birthDate = new Date(val);
                              const today = new Date();
                              let age = today.getFullYear() - birthDate.getFullYear();
                              const m = today.getMonth() - birthDate.getMonth();
                              if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                age--;
                              }
                              computedAge = age >= 0 ? age : 0;
                            }
                            setFormData(prev => ({ ...prev, fechaNacimiento: val, age: computedAge }));
                          }}
                          readOnly={isGestoraServicio}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Edad (Calculada) / Sexo</div>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', marginTop: '6px' }}>{formatAgeDetailed(formData.fechaNacimiento, formData.age)} · {formData.sex}</div>
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
                          readOnly={isGestoraServicio}
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
                          readOnly={isGestoraServicio}
                        />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Diagnóstico Principal Descriptivo (Texto Libre Opcional)</div>
                        <textarea
                          className="glass-input"
                          style={{ padding: '6px 8px', fontSize: '0.8rem', width: '100%', minHeight: '50px', resize: 'vertical', fontFamily: 'inherit' }}
                          value={formData.dxPrincipal || ''}
                          onChange={e => setFormData(prev => ({ ...prev, dxPrincipal: e.target.value }))}
                          readOnly={isGestoraServicio}
                          placeholder="Descripción clínica del cuadro principal..."
                          rows={2}
                        />
                      </div>

                    </div>

                    {!isGestoraServicio && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Destino (Unidad Requerida) / Serv. Acueste</div>
                        <select
                          className="glass-input"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%', background: 'var(--inset-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
                          value={formData.destino}
                          onChange={e => setFormData(prev => ({ ...prev, destino: e.target.value }))}
                        >
                          {['UCI', 'UTI', 'Cuidados Medios', 'GINE/PUERPERIO', 'Neonatología', 'Infantil', 'Básico'].map(d => (
                            <option key={d} value={d} style={{ background: '#1e1b4b', color: '#fff' }}>{d}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. ESPECIALIDAD TRATANTE ACTUAL - oculto para gestora_servicio */}
                {!isGestoraServicio && (
                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', zIndex: 30 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '1rem' }}>🩺</span>
                      <h4 style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-color)' }}>Especialidad Tratante</h4>
                    </div>
                    <MultiSearchableSelect
                      options={ESPECIALIDADES.map(e => ({ value: e, label: e }))}
                      value={formData.especialidadTratante}
                      onChange={(val) => setFormData(prev => ({ ...prev, especialidadTratante: val }))}
                      placeholder="Buscar especialidad..."
                      maxSelections={2}
                    />
                  </div>
                )}

                {/* 3. AISLAMIENTO (PRECAUCIONES) - oculto para gestora_servicio */}
                {!isGestoraServicio && (
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
                        { value: 'Precauciones Aéreas', label: 'Precauciones Aéreas' },
                        { value: 'Requiere Aislamiento', label: 'Requiere Aislamiento' },
                        { value: 'Neutropénico', label: 'Neutropénico' }
                      ]}
                      value={formData.aislamiento}
                      onChange={(val) => setFormData(prev => ({ ...prev, aislamiento: val }))}
                      placeholder="Seleccionar..."
                    />
                  </div>
                )}

                {/* 3.5 INTERCONSULTAS PENDIENTES */}
                {(() => {
                  const pendingICs = (bed.interconsultas || []).filter(ic => ic.estado === 'pendiente');
                  if (pendingICs.length === 0) return null;
                  return (
                    <div className="glass-panel" style={{ padding: '16px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', zIndex: 15 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(168, 85, 247, 0.2)', paddingBottom: '8px' }}>
                        <span style={{ fontSize: '1rem' }}>📋</span>
                        <h4 style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a855f7' }}>
                          IC Pendientes ({pendingICs.length})
                        </h4>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {pendingICs.map((ic, i) => (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{ic.especialidadDestino}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                              <span style={{ color: '#a855f7' }}>{ic.tipoRequerimiento}</span> {ic.priorizacion ? `· ${ic.priorizacion}` : ''}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              Sol: {new Date(ic.solicitadaAt).toLocaleString('es-CL')}
                            </div>
                            <button
                              type="button"
                              onClick={() => setViewingIC({
                                ...ic,
                                patientName: bed.patient,
                                patientRut: bed.rut,
                                edad: formatAgeDetailed(bed.fechaNacimiento, bed.age),
                                cama: `Hab. ${bed.roomId} — Cama ${bed.id}`
                              })}
                              style={{
                                marginTop: '8px',
                                width: '100%',
                                padding: '6px 12px',
                                background: 'rgba(168, 85, 247, 0.15)',
                                border: '1px solid rgba(168, 85, 247, 0.4)',
                                color: '#d8b4fe',
                                borderRadius: '6px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.25)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)'}
                            >
                              <Eye size={12} /> Ver Interconsulta
                            </button>
                            {(user?.role === 'administrador' || user?.role === 'Médico') && (
                              <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#f59e0b', fontStyle: 'italic', lineHeight: 1.2 }}>
                                Para resolver o desestimar, diríjase al <b>Panel de Interconsultas</b>.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

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

                    {/* Interconsulta y Traslado: ocultos para gestora_servicio */}
                    {!isGestoraServicio && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column - GRD oculto para gestora_servicio */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* A. GESTIÓN CLÍNICA (GRD) - solo visible para roles con permisos clínicos */}
                {!isGestoraServicio && (
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
                                  cursor: formData.grdId ? 'pointer' : 'not-allowed',
                                  opacity: formData.grdId ? 1 : 0.5,
                                  transition: 'all 0.2s ease'
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

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                        {/* Límite Outliers (Most Prominent) */}
                        {limitDays > 0 && (
                          <div className="outlier-warning">
                            🚨 Límite Outliers: {limitDays} días
                          </div>
                        )}

                        {/* Promedio días de estada Hospital de Villarrica (Less Prominent) */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                            Promedio días de estada Hospital de Villarrica
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="number"
                              value={formData.projectedDays}
                              onChange={handleChangeDays}
                              className="glass-input"
                              style={{ width: '70px', padding: '5px 8px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.08)' }}
                              min="0"
                            />
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>días (histórico referencial)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )} {/* fin !isGestoraServicio GRD */}

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
                          .filter(b => !(b.roomId === bed.roomId && b.id === bed.id) && (formData.transferType === 'libre' ? b.status === 'available' : b.status === 'occupied'))
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
                      disabled={isSavingNovedad}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !isSavingNovedad) {
                          e.preventDefault();
                          handleAddNovedad();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="glass-button primary"
                      style={{ padding: '0 16px', fontSize: '0.8rem', opacity: isSavingNovedad ? 0.6 : 1, cursor: isSavingNovedad ? 'not-allowed' : 'pointer' }}
                      onClick={handleAddNovedad}
                      disabled={isSavingNovedad}
                    >
                      {isSavingNovedad ? 'Guardando...' : 'Registrar'}
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
            <button type="button" className="glass-button" onClick={onClose} disabled={isSaving} style={{ background: '#4c1d95', color: '#fff', border: 'none', opacity: isSaving ? 0.5 : 1 }}>Cancelar</button>
            <button type="submit" className="glass-button primary" disabled={isSaving} style={{ background: '#0891b2', color: '#fff', border: 'none', opacity: isSaving ? 0.6 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
              <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

        </form>

      </div>
      {viewingIC && (
        <ViewInterconsultaModal
          ic={viewingIC}
          onClose={() => setViewingIC(null)}
        />
      )}
    </div>
  );
}
