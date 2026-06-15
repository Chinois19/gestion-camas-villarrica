import { useState, useRef, useEffect } from 'react';
import { X, Stethoscope, Plus, Search } from 'lucide-react';
import { CIE10_OPTIONS } from '../data/cie10Options';
import MultiSearchableSelect from './MultiSearchableSelect';
import { MEDICOS } from '../data/medicos';
import { ESPECIALIDADES } from '../data/formData';
import { matchesSearch } from '../utils/search';
import { formatAgeDetailed } from '../utils/age';

/* ── SearchableSelect ─────────────────────────────── */
function SearchableSelect({ name, value, onChange, options, placeholder, allowFreeText }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Keep query in sync if value changed externally
  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const filtered = query.trim() === ''
    ? options
    : options.filter(o => matchesSearch(o, query));

  const handleInput = e => {
    setQuery(e.target.value);
    setOpen(true);
    if (allowFreeText) {
      onChange({ target: { name, value: e.target.value } });
    } else if (!e.target.value) {
      onChange({ target: { name, value: '' } });
    }
  };

  const handleSelect = opt => {
    setQuery(opt);
    onChange({ target: { name, value: opt } });
    setOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onChange({ target: { name, value: '' } });
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={13} style={{ position: 'absolute', left: 11, color: 'var(--text-muted)', pointerEvents: 'none', flexShrink: 0 }} />
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || 'Buscar...'}
          autoComplete="off"
          style={{
            width: '100%', background: 'var(--inset-bg)', border: '1px solid var(--border-subtle)',
            borderRadius: 10, padding: '10px 32px 10px 32px', color: 'var(--text-primary)',
            fontFamily: 'var(--font)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
            borderColor: open ? 'var(--accent-border)' : 'var(--border-subtle)',
            transition: 'border-color 0.2s',
          }}
        />
        {query && (
          <button type="button" onClick={handleClear} style={{
            position: 'absolute', right: 10, background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 2,
          }}><X size={13} /></button>
        )}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 99999,
          background: 'var(--bg-color)', border: '1px solid var(--border-subtle)',
          borderRadius: 10, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin resultados</div>
          ) : filtered.slice(0, 60).map((opt, i) => (
            <div key={i} onClick={() => handleSelect(opt)}
              style={{
                padding: '9px 14px', cursor: 'pointer', fontSize: '0.85rem',
                borderBottom: i < Math.min(filtered.length, 60) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                color: opt === value ? 'var(--accent)' : 'var(--text-primary)',
                background: opt === value ? 'rgba(0,212,255,0.06)' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--border-subtle)'}
              onMouseOut={e => e.currentTarget.style.background = opt === value ? 'rgba(0,212,255,0.06)' : 'transparent'}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InterconsultaModal({ bed, currentUser, onConfirm, onClose }) {
  const now = new Date();

  const [formData, setFormData] = useState({
    // Pre-filled from patient data
    nombrePaciente: bed.patient || '',
    rut: bed.rut || '',
    edad: formatAgeDetailed(bed.fechaNacimiento, bed.age),
    profesionalDeriva: currentUser?.name || '',
    fecha: now.toLocaleDateString('es-CL'),
    hora: now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    cama: `Hab. ${bed.roomId} — Cama ${bed.id}`,
    // Diagnósticos arrastrados del paciente
    diagnosticos: Array.isArray(bed.diagnosis) ? bed.diagnosis : (bed.diagnosis ? [bed.diagnosis] : []),
    // A completar
    especialidadDestino: '',
    tipoRequerimiento: '',
    priorizacion: '',
    otroRequerimiento: '',
    resumenHistoria: '',
    examenesRealizados: '',
    seRequiere: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.especialidadDestino || !formData.tipoRequerimiento || !formData.priorizacion) return;
    onConfirm({
      ...formData,
      id: `IC-${Date.now()}`,
      solicitadaAt: now.toISOString(),
      estado: 'pendiente',
      roomId: bed.roomId,
      bedId: bed.id,
    });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div className="glass-panel modal-content" style={{ maxWidth: '1100px', width: '95%', maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden', padding: 0 }}>

        {/* Header */}
        <div className="modal-header" style={{ background: 'rgba(168,85,247,0.08)', borderColor: 'rgba(168,85,247,0.25)', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Stethoscope size={22} color="#a855f7" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg,#a855f7,#e879f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Solicitud de Interconsulta
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {formData.cama}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ padding: '32px 24px', background: 'var(--bg-color)' }}>
          <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '32px' }}>

            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* 1. Identificación del Paciente */}
              <div className="detail-panel" style={{ padding: '24px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <Stethoscope size={18} color="#a855f7" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a855f7' }}>Identificación</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Nombre del Paciente</label>
                    <input type="text" name="nombrePaciente" value={formData.nombrePaciente} readOnly className="glass-input readonly" style={{ opacity: 0.8 }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">RUT</label>
                    <input type="text" name="rut" value={formData.rut} onChange={handleChange} className="glass-input" placeholder="Sin RUT" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Edad</label>
                    <input type="text" name="edad" value={formData.edad} onChange={handleChange} className="glass-input" placeholder="—" />
                  </div>
                  <div className="form-group" style={{ position: 'relative', zIndex: 90 }}>
                    <label className="form-label">Profesional que Deriva</label>
                    <SearchableSelect
                      name="profesionalDeriva"
                      value={formData.profesionalDeriva}
                      onChange={handleChange}
                      options={MEDICOS}
                      placeholder="Nombre Dr./Dra."
                      allowFreeText={true}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha y Hora Interconsulta</label>
                    <input type="text" value={`${formData.fecha} - ${formData.hora}`} readOnly className="glass-input readonly" style={{ opacity: 0.8 }} />
                  </div>
                </div>
              </div> {/* Close glass-panel */}

              {/* 2. Diagnósticos */}
              <div className="detail-panel" style={{ padding: '24px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '16px', position: 'relative', zIndex: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📋</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a855f7' }}>Diagnósticos (CIE-10)</span>
                </div>
              <div className="form-group">
                <label className="form-label">Diagnóstico(s) de Origen y/o Actuales (hasta 8)</label>
                <MultiSearchableSelect
                  options={CIE10_OPTIONS}
                  value={formData.diagnosticos}
                  onChange={(val) => setFormData(prev => ({ ...prev, diagnosticos: val }))}
                  placeholder="Buscar diagnóstico CIE-10..."
                  maxSelections={8}
                />
              </div>
            </div>

            </div> {/* END LEFT COLUMN */}

            {/* RIGHT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* 3. Tipo de Requerimiento */}
              <div className="detail-panel" style={{ padding: '24px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🔘</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a855f7' }}>Tipo de Requerimiento</span>
                </div>
              <div className="form-group">
                <label className="form-label">Seleccione el objetivo de la solicitud *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  {[
                    'EVALUAR', 'AJUSTAR TRATAMIENTO', 'PROCEDIMIENTO',
                    'SEGUIMIENTO', 'CAMBIO DE TRATANCIA', 'OTRO'
                  ].map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      className={`choice-btn ${formData.tipoRequerimiento === tipo ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, tipoRequerimiento: tipo }))}
                      style={{
                        padding: '10px 6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        background: formData.tipoRequerimiento === tipo ? 'rgba(168,85,247,0.1)' : 'transparent',
                        color: formData.tipoRequerimiento === tipo ? '#a855f7' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
                {formData.tipoRequerimiento === 'OTRO' && (
                  <input
                    type="text"
                    name="otroRequerimiento"
                    value={formData.otroRequerimiento}
                    onChange={handleChange}
                    placeholder="Especifique otro requerimiento (Texto Libre)..."
                    className="glass-input animate-slide-down"
                    style={{ marginTop: '4px' }}
                    required
                  />
                )}
              </div>
            </div>

            {/* Priorización de la Interconsulta */}
            <div className="detail-panel" style={{ padding: '24px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a855f7' }}>Priorización de la Interconsulta</span>
              </div>
              <div className="form-group">
                <label className="form-label">Seleccione el nivel de prioridad *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {['URGENTE', 'DIFERIDA'].map(prio => (
                    <button
                      key={prio}
                      type="button"
                      className={`choice-btn ${formData.priorizacion === prio ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, priorizacion: prio }))}
                      style={{
                        padding: '10px 6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: '1px solid var(--glass-border)',
                        borderRadius: '8px',
                        background: formData.priorizacion === prio ? (prio === 'URGENTE' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168,85,247,0.1)') : 'transparent',
                        color: formData.priorizacion === prio ? (prio === 'URGENTE' ? '#ef4444' : '#a855f7') : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        borderColor: formData.priorizacion === prio && prio === 'URGENTE' ? 'rgba(239, 68, 68, 0.5)' : ''
                      }}
                    >
                      {prio}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Especialidad de Destino */}
            <div className="detail-panel" style={{ padding: '24px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎯</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a855f7' }}>Especialidad de Destino</span>
              </div>
              <div className="form-group" style={{ position: 'relative', zIndex: 85 }}>
                <label className="form-label">Especialidad Médica / Odontológica *</label>
                <SearchableSelect
                  name="especialidadDestino"
                  value={formData.especialidadDestino}
                  onChange={handleChange}
                  options={ESPECIALIDADES}
                  placeholder="Buscar especialidad..."
                  allowFreeText={false}
                />
              </div>
            </div>

            {/* 5. Información Clínica */}
            <div className="detail-panel" style={{ padding: '24px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ fontSize: '1.2rem' }}>📝</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a855f7' }}>Información Clínica</span>
              </div>
              <div className="form-group">
                <label className="form-label">Resumen Historia Clínica</label>
                <textarea
                  name="resumenHistoria"
                  value={formData.resumenHistoria}
                  onChange={handleChange}
                  className="glass-input"
                  rows={3}
                  placeholder="Motivo de hospitalización, evolución clínica relevante, antecedentes..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Exámenes Realizados</label>
                <textarea
                  name="examenesRealizados"
                  value={formData.examenesRealizados}
                  onChange={handleChange}
                  className="glass-input"
                  rows={2}
                  placeholder="Laboratorio, imágenes, otros exámenes pertinentes..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Se Requiere</label>
                <textarea
                  name="seRequiere"
                  value={formData.seRequiere}
                  onChange={handleChange}
                  required
                  className="glass-input"
                  rows={2}
                  placeholder="Evaluación, procedimiento, opinión especializada, indicación..."
                />
              </div>
            </div>

            </div> {/* END RIGHT COLUMN */}

            {/* Acciones */}
            <div className="modal-actions" style={{ gridColumn: '1 / -1', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(168,85,247,0.2)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="glass-button" style={{ background: '#4c1d95', color: '#fff', border: 'none', fontWeight: 600 }} onClick={onClose}>Cancelar</button>
              <button type="submit" className="glass-button primary" style={{ background: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.4)', color: '#a855f7', fontWeight: 600 }}>
                <Stethoscope size={16} /> Enviar Interconsulta
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
