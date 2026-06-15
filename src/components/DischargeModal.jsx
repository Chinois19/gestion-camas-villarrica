import { useState } from 'react';
import { X, LogOut, HeartPulse, UserMinus, CheckSquare, Square, MapPin } from 'lucide-react';

const ESTABLECIMIENTOS_RED = {
  'Alta Complejidad': ['Hospital Dr. Hernán Henríquez Aravena (Temuco)'],
  'Hospitales Nodos (Mediana Complejidad)': [
    'Hospital de Villarrica', 'Hospital de Pitrufquén',
    'Hospital de Nueva Imperial', 'Hospital de Lautaro',
    'Complejo Asistencial de Padre las Casas'
  ],
  'Hospitales de Familia y Comunidad': [
    'Hospital de Loncoche', 'Hospital de Cunco', 'Hospital de Galvarino',
    'Hospital de Carahue', 'Hospital de Saavedra', 'Hospital de Toltén',
    'Hospital de Gorbea', 'Hospital de Vilcún'
  ]
};

const DESTINOS = [
  { id: 'Domicilio',                      label: 'Domicilio',                      icon: '🏠' },
  { id: 'Hospitalización domiciliaria',   label: 'Hospitalización domiciliaria',   icon: '🏥' },
  { id: 'Otro establecimiento',           label: 'Otro establecimiento',           icon: '🏨' },
  { id: 'Red Privada',                    label: 'Red Privada',                    icon: '🏢' },
  { id: 'Alta administrativa',            label: 'Alta administrativa',            icon: '📋' },
  { id: 'Fuga',                           label: 'Fuga',                           icon: '🚶' },
  { id: 'Fallecido',                      label: 'Fallecido',                      icon: '✝️' },
];

// Terapia requirements only (removed "Paciente" and "Previsión" — those come from patient data)
const HODOM_TERAPIA = [
  { n: 1, requisito: 'Cuidador', condicion: 'Disponible y presente' },
  { n: 2, requisito: 'Servicios Básicos (Agua, Red eléctrica, Alcantarillado)', condicion: 'Disponibles en domicilio' },
  { n: 3, requisito: 'Consentimiento', condicion: 'Aprobado por pcte y cuidador' },
  { n: 4, requisito: 'Manejo terapéutico en caso de deterioro', condicion: 'Definido alcance previo al ingreso' },
  { n: 5, requisito: 'Antibióticos Endovenosos', condicion: 'Cada 24 o 12 hrs' },
  { n: 6, requisito: 'Infusión Sueros', condicion: 'BIC 24 hrs disponible' },
  { n: 7, requisito: 'Manejo de invasivos (CUP, SNG, GTT, SNY, TQT)', condicion: 'Sin restricción a lo disponible en HV (Sin Bomba Alimentación SNY)' },
  { n: 8, requisito: 'Oxigenoterapia', condicion: 'Hasta 3 litros por naricera (concentrador O2)' },
  { n: 9, requisito: 'Curaciones', condicion: 'Simples y avanzadas, uso de VAC inclusive' },
  { n: 10, requisito: 'Kinesioterapia', condicion: 'Motora, Respiratoria, Rehabilitación Neurológica' },
];

function HodomModal({ bed, onConfirm, onClose }) {
  const now = new Date();
  const initialChecks = {};
  HODOM_TERAPIA.forEach((_, i) => { initialChecks[i] = false; });

  const [checks, setChecks] = useState(initialChecks);
  const [extraData, setExtraData] = useState({
    profesionalRequiere: '',
    direccion: '',
    observaciones: '',
  });

  const toggle = (key) => setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  const checkedCount = Object.values(checks).filter(Boolean).length;
  const total = HODOM_TERAPIA.length;

  const handleConfirm = () => {
    if (!extraData.profesionalRequiere || !extraData.direccion) return;
    onConfirm({
      id: `HODOM-${Date.now()}`,
      estado: 'pendiente',
      solicitadaAt: now.toISOString(),
      fecha: now.toLocaleDateString('es-CL'),
      hora: now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      // Patient data from bed
      patientName: bed.patient,
      rut: bed.rut || '—',
      edad: bed.age || bed.edad || '—',
      sexo: bed.sex || bed.sexo || '—',
      prevision: bed.prevision || '—',
      diagnostico: bed.diagnosis,
      roomId: bed.roomId,
      bedId: bed.id || bed.bedId,
      // Extra HODOM data
      profesionalRequiere: extraData.profesionalRequiere,
      direccion: extraData.direccion,
      hodomObservaciones: extraData.observaciones,
      hodomChecks: checks,
      cumplidos: checkedCount,
      total,
    });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 4000 }}>
      <div className="glass-panel modal-content" style={{ width: 'min(95vw, 720px)', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>

        {/* Header */}
        <div className="modal-header" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
              <HeartPulse size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg,#22c55e,#4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Formulario de Ingreso HODOM
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Hospitalización Domiciliaria · {checkedCount}/{total} requisitos marcados
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Progress */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(checkedCount / total) * 100}%`, background: 'linear-gradient(90deg,#22c55e,#4ade80)', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          <div className="assignment-fields">
            {/* 1. Datos del Paciente */}
            <div>
              <h3 className="section-title" style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}>
                👤 1. Datos del Paciente
              </h3>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Nombre', value: bed.patient },
                  { label: 'RUT', value: bed.rut || '—' },
                  { label: 'Edad', value: bed.age ? `${bed.age} años` : (bed.edad ? `${bed.edad} años` : '—') },
                  { label: 'Sexo', value: bed.sex || bed.sexo || '—' },
                  { label: 'Previsión', value: bed.prevision || '—' },
                  { label: 'Diagnóstico Ingreso', value: Array.isArray(bed.diagnosis) ? bed.diagnosis.join(' | ') : (bed.diagnosis || '—') },
                ].map(({ label, value }) => (
                  <div key={label} style={label === 'Diagnóstico Ingreso' ? { gridColumn: '1 / -1' } : {}}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Datos Domiciliarios */}
            <div>
              <h3 className="section-title" style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}>
                🏠 2. Datos Domiciliarios y Solicitante
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Dirección del Paciente *</label>
                  <input
                    type="text"
                    className="glass-input"
                    autoComplete="off"
                  placeholder="Ej: Av. Valentín Letelier 123, Villarrica"
                    required
                    value={extraData.direccion}
                    onChange={e => setExtraData(p => ({ ...p, direccion: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Profesional que Requiere HODOM *</label>
                  <input
                    type="text"
                    className="glass-input"
                    autoComplete="off"
                  placeholder="Nombre del médico / enfermero(a) solicitante"
                    required
                    value={extraData.profesionalRequiere}
                    onChange={e => setExtraData(p => ({ ...p, profesionalRequiere: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* 3. Verificación de Requisitos */}
            <div>
              <h3 className="section-title" style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}>
                ✅ 3. Verificación de Requisitos HODOM
              </h3>
              <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1.4fr 72px', padding: '8px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>#</span><span>Requisito</span><span>Condición</span><span style={{ textAlign: 'center' }}>Cumple</span>
                </div>
                {HODOM_TERAPIA.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => toggle(i)}
                    style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1.4fr 72px', padding: '13px 16px', borderBottom: i < HODOM_TERAPIA.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer', background: checks[i] ? 'rgba(34,197,94,0.05)' : 'transparent', transition: 'background 0.2s', alignItems: 'center' }}
                  >
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.n}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', paddingRight: '12px', lineHeight: 1.4 }}>{item.requisito}</span>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', paddingRight: '12px', lineHeight: 1.4 }}>{item.condicion}</span>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {checks[i]
                        ? <CheckSquare size={20} color="#22c55e" />
                        : <Square size={20} color="var(--text-secondary)" style={{ opacity: 0.35 }} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Observaciones */}
            <div>
              <h3 className="section-title" style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}>
                📝 4. Observaciones (Opcional)
              </h3>
              <div className="form-group">
                <textarea
                  className="glass-input"
                  rows={3}
                  placeholder="Cuidador, instrucciones especiales, contacto..."
                  value={extraData.observaciones}
                  onChange={e => setExtraData(p => ({ ...p, observaciones: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="glass-button" onClick={onClose} style={{ background: '#4c1d95', color: '#fff', border: 'none' }}>Cancelar</button>
              <button
                type="button"
                className="glass-button primary"
                disabled={!extraData.profesionalRequiere || !extraData.direccion}
                onClick={handleConfirm}
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', borderColor: '#22c55e', color: '#fff', opacity: (extraData.profesionalRequiere && extraData.direccion) ? 1 : 0.5 }}
              >
                <HeartPulse size={16} /> Enviar Solicitud HODOM ({checkedCount}/{total})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DischargeModal({ bed, onConfirm, onHodomSubmit, onClose }) {
  const [formData, setFormData] = useState({
    destino: '',
    establecimientoRed: '',
    otroEstablecimientoDetalle: '',
    redPrivadaDetalle: '',
    observaciones: '',
    hodomData: null,
  });
  const [showHodom, setShowHodom] = useState(false);

  const handleHodomConfirm = (hodomData) => {
    setFormData(prev => ({ ...prev, destino: 'Hospitalización domiciliaria', hodomData }));
    // Submit HODOM request to the global panel
    if (onHodomSubmit) onHodomSubmit(hodomData);
    setShowHodom(false);
  };

  const handleHodomClose = () => {
    // If no hodomData was confirmed yet, reset the destination to avoid stuck state
    if (!formData.hodomData) {
      setFormData(prev => ({ ...prev, destino: '' }));
    }
    setShowHodom(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.destino) return;
    onConfirm({
      ...formData,
      bedId: bed.id,
      roomId: bed.roomId,
      patientName: bed.patient,
      fechaAlta: new Date().toISOString()
    });
  };

  return (
    <>
      {showHodom && (
        <HodomModal bed={bed} onConfirm={handleHodomConfirm} onClose={handleHodomClose} />
      )}

      <div className="modal-overlay" style={{ zIndex: 3000 }}>
        <div className="glass-panel modal-content" style={{ width: 'min(96vw, 920px)', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}>

          {/* Header */}
          <div className="modal-header discharge-modal-header" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="avatar header-avatar">
                <LogOut size={20} style={{ transform: 'rotate(180deg)' }} />
              </div>
              <div>
                <h2 className="header-title" style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Alta Médica
                </h2>
                <p className="header-subtitle" style={{ fontSize: '0.75rem', marginTop: '2px', marginBottom: 0 }}>
                  Finalización de hospitalización y destino del paciente
                </p>
              </div>
            </div>
            <button className="close-btn" onClick={onClose}><X size={20} /></button>
          </div>

          <div className="modal-body">
            <form onSubmit={handleSubmit} autoComplete="off" className="assignment-fields">
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                
                {/* Columna Izquierda */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* 1. Datos del Paciente */}
                  <div>
                    <h3 className="section-title" style={{ color: 'var(--accent-color)', borderColor: 'var(--glass-border)', margin: 0, paddingBottom: '8px' }}>
                      👤 1. Datos del Paciente
                    </h3>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                      {[
                        { label: 'Paciente', value: bed.patient },
                        { label: 'Ubicación', value: `Hab ${bed.roomId} — Cama ${bed.id}` },
                        { label: 'RUT', value: bed.rut || '—' },
                        { label: 'Edad / Sexo', value: `${bed.age || '—'} años · ${bed.sex || bed.sexo || '—'}` },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{label}</div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2. Destino Inmediato del Paciente */}
                  <div>
                    <h3 className="section-title" style={{ color: 'var(--accent-color)', borderColor: 'var(--glass-border)', margin: 0, paddingBottom: '8px' }}>
                      🗺️ 2. Destino Inmediato del Paciente
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                      {DESTINOS.map(({ id, label, icon }) => {
                        const isSelected = formData.destino === id;
                        const isHodom = id === 'Hospitalización domiciliaria';
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, destino: id }));
                              if (isHodom) setShowHodom(true);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              padding: '10px 12px', border: `1px solid ${isSelected ? 'var(--accent-color)' : 'var(--glass-border)'}`,
                              borderRadius: '10px', background: isSelected ? 'rgba(59,130,246,0.1)' : 'var(--inset-bg)',
                              color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)', cursor: 'pointer',
                              fontFamily: 'var(--font-family)', fontSize: '0.78rem', fontWeight: isSelected ? 700 : 400,
                              textAlign: 'left', transition: 'all 0.2s ease',
                              boxShadow: isSelected ? 'var(--shadow-glow)' : 'var(--shadow-drop)',
                            }}
                          >
                            <span style={{ fontSize: '0.9rem' }}>{icon}</span>
                            <span style={{ flex: 1, lineHeight: 1.2 }}>{label}</span>
                            {isHodom && formData.hodomData && (
                              <span style={{ fontSize: '0.6rem', background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>
                                ✓ {formData.hodomData.cumplidos}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Columna Derecha */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* ── Pending IC warning ─────────────────────────────────── */}
                  {(() => {
                    const pendingICs = (bed.interconsultas || []).filter(ic => ic.estado === 'pendiente');
                    if (pendingICs.length === 0) return null;
                    const isHodom = formData.destino === 'Hospitalización domiciliaria';
                    return (
                      <div style={{
                        padding: '12px 14px',
                        background: isHodom ? 'rgba(34,197,94,0.04)' : 'rgba(245,158,11,0.06)',
                        border: `1px solid ${isHodom ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.25)'}`,
                        borderRadius: '10px',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start'
                      }}>
                        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{isHodom ? '🏥' : '⚠️'}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: isHodom ? '#22c55e' : '#f59e0b', marginBottom: '2px' }}>
                            {pendingICs.length} interconsulta{pendingICs.length > 1 ? 's' : ''} pendiente{pendingICs.length > 1 ? 's' : ''}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {isHodom
                              ? 'Este paciente será derivado a HODOM. Las interconsultas pendientes quedarán canceladas en el visor de IC al confirmar el alta. El caso HODOM quedará activo en su propio panel hasta su recepción.'
                              : 'Al confirmar el alta, las siguientes interconsultas pendientes serán canceladas automáticamente del visor de ICs:'
                            }
                          </div>
                          {!isHodom && (
                            <ul style={{ margin: '6px 0 0 0', padding: '0 0 0 14px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                              {pendingICs.map((ic, i) => (
                                <li key={i} style={{ marginBottom: '1px' }}>
                                  <strong style={{ color: 'var(--text-primary)' }}>{ic.especialidadDestino}</strong>
                                  {ic.tipoRequerimiento ? ` — ${ic.tipoRequerimiento}` : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Condicionales */}
                  {formData.destino === 'Otro establecimiento' && (
                    <div>
                      <h3 className="section-title" style={{ color: 'var(--accent-color)', borderColor: 'var(--glass-border)', margin: 0, paddingBottom: '8px' }}>
                        🏨 3. Establecimiento SSAS
                      </h3>
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label>Seleccione Hospital de Destino *</label>
                        <select 
                          className="glass-input" 
                          required 
                          value={formData.establecimientoRed} 
                          onChange={e => {
                            const val = e.target.value;
                            setFormData(prev => ({ 
                              ...prev, 
                              establecimientoRed: val,
                              otroEstablecimientoDetalle: val === 'Otro' ? prev.otroEstablecimientoDetalle : ''
                            }));
                          }}
                        >
                          <option value="">-- Seleccione establecimiento --</option>
                          {Object.entries(ESTABLECIMIENTOS_RED).map(([cat, list]) => (
                            <optgroup key={cat} label={cat}>
                              {list.map(h => <option key={h} value={h}>{h}</option>)}
                            </optgroup>
                          ))}
                          <option value="Otro">Otro establecimiento (Especificar)</option>
                        </select>
                      </div>

                      {formData.establecimientoRed === 'Otro' && (
                        <div className="form-group" style={{ marginTop: '12px' }}>
                          <label>Especifique el Establecimiento *</label>
                          <input 
                            type="text" 
                            className="glass-input" 
                            placeholder="Ej: Hospital de Valdivia" 
                            required 
                            value={formData.otroEstablecimientoDetalle} 
                            onChange={e => setFormData(prev => ({ ...prev, otroEstablecimientoDetalle: e.target.value }))} 
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {formData.destino === 'Red Privada' && (
                    <div>
                      <h3 className="section-title" style={{ color: 'var(--accent-color)', borderColor: 'var(--glass-border)', margin: 0, paddingBottom: '8px' }}>
                        🏢 3. Establecimiento Privado
                      </h3>
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label>Nombre del Establecimiento *</label>
                        <input type="text" className="glass-input" placeholder="Ej: Clínica Alemana Temuco" required value={formData.redPrivadaDetalle} onChange={e => setFormData(prev => ({ ...prev, redPrivadaDetalle: e.target.value }))} />
                      </div>
                    </div>
                  )}

                  {/* Observaciones */}
                  <div>
                    <h3 className="section-title" style={{ color: 'var(--accent-color)', borderColor: 'var(--glass-border)', margin: 0, paddingBottom: '8px' }}>
                      📝 3. Observaciones Adicionales (Opcional)
                    </h3>
                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <textarea className="glass-input" rows={2} placeholder="Detalles del alta, traslados pendientes, instrucciones de seguimiento..." value={formData.observaciones} onChange={e => setFormData(prev => ({ ...prev, observaciones: e.target.value }))} />
                    </div>
                  </div>
                </div>

              </div>

              <div className="modal-actions" style={{ margin: 0, marginTop: '20px' }}>
                <button type="button" className="glass-button" onClick={onClose} style={{ background: '#4c1d95', color: '#fff', border: 'none' }}>Cancelar</button>
                <button
                  type="submit"
                  className="glass-button primary"
                  disabled={!formData.destino || (formData.destino === 'Hospitalización domiciliaria' && !formData.hodomData)}
                  style={{ 
                    background: formData.destino === 'Hospitalización domiciliaria' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'var(--accent-color)', 
                    borderColor: formData.destino === 'Hospitalización domiciliaria' ? '#22c55e' : 'var(--accent-color)', 
                    color: '#fff',
                    opacity: (!formData.destino || (formData.destino === 'Hospitalización domiciliaria' && !formData.hodomData)) ? 0.5 : 1
                  }}
                >
                  {formData.destino === 'Hospitalización domiciliaria' ? (
                    formData.hodomData 
                      ? <><HeartPulse size={16} /> Confirmar Pendiente HODOM</>
                      : <><HeartPulse size={16} /> Complete el formulario HODOM</>
                  ) : (
                    <><UserMinus size={16} /> Confirmar Alta Médica</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
