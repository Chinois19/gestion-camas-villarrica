import { useState, useEffect, useRef } from 'react';
import { Send, FileText, CheckCircle, User, Stethoscope, ArrowRightLeft, Activity, Heart, Thermometer, Droplets, Wind, Eye, BarChart2, Search, X } from 'lucide-react';
import { getHospitalStats } from '../data/dummy';
import cie10Data from '../data/cie10.json';
import { SERVICIOS_SOLICITANTES, PREVISIONES, ESPECIALIDADES, COMUNAS_CHILE } from '../data/formData';
import { MEDICOS } from '../data/medicos';
import MultiSearchableSelect from './MultiSearchableSelect';
import { matchesSearch } from '../utils/search';
import { calculateAgeDetailed } from '../utils/age';

const DESTINOS = ['UCI', 'UTI', 'Cuidados Medios', 'GINE/PUERPERIO', 'Neonatología', 'Infantil', 'Básico'];
const SEXOS = ['—', 'Masculino', 'Femenino', 'Otro'];

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

function SectionCard({ icon: Icon, title, children, color = 'var(--accent)', zIndex }) {
  return (
    <div style={{
      background: 'var(--panel-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid var(--border-light)',
      boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 var(--border-subtle), 0 0 16px ${color}0d`,
      borderRadius: 12,
      overflow: 'visible',
      marginBottom: 10,
      position: zIndex !== undefined ? 'relative' : undefined,
      zIndex: zIndex,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        background: `linear-gradient(90deg, ${color}08, transparent)`,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, borderRadius: '50%',
          background: `${color}15`, border: `1px solid ${color}33`,
          color: color, flexShrink: 0
        }}>
          <Icon size={12} />
        </div>
        <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>{title}</span>
      </div>
      <div style={{ padding: '12px 14px' }}>{children}</div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>{children}</div>;
}

function GInput({ placeholder, value, onChange, name, type = 'text', readOnly, style, required }) {
  return (
    <input
      type={type} name={name} value={value} onChange={onChange} readOnly={readOnly}
      placeholder={placeholder} required={required}
      style={{
        width: '100%', background: 'var(--inset-bg)', border: '1px solid var(--border-subtle)',
        borderRadius: 8, padding: '7px 11px', color: 'var(--text-primary)',
        fontFamily: 'var(--font)', fontSize: '0.82rem', outline: 'none',
        opacity: readOnly ? 0.6 : 1, cursor: readOnly ? 'not-allowed' : 'text', boxSizing: 'border-box',
        ...style,
      }}
    />
  );
}

function GTextarea({ placeholder, value, onChange, name, rows = 2 }) {
  return (
    <textarea
      name={name} value={value} onChange={onChange} rows={rows} placeholder={placeholder}
      style={{
        width: '100%', background: 'var(--inset-bg)', border: '1px solid var(--border-subtle)',
        borderRadius: 8, padding: '7px 11px', color: 'var(--text-primary)',
        fontFamily: 'var(--font)', fontSize: '0.82rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
      }}
    />
  );
}

function GSelect({ name, value, onChange, options, placeholder }) {
  return (
    <select name={name} value={value} onChange={onChange}
      style={{
        width: '100%', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-subtle)',
        borderRadius: 8, padding: '7px 11px', color: value ? 'var(--text-primary)' : 'var(--text-muted)',
        fontFamily: 'var(--font)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box',
        appearance: 'auto',
      }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{label}</span>
      <div onClick={onChange} style={{
        width: 42, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', flexShrink: 0,
        background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
        transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }} />
      </div>
    </label>
  );
}

function VitalInput({ icon: Icon, label, unit, name, value, onChange, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: '0.65rem', color }}>{unit}</div>
      </div>
      <input type="number" name={name} value={value} onChange={onChange}
        style={{
          width: 70, background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-subtle)',
          borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)',
          fontFamily: 'var(--font)', fontSize: '1rem', fontWeight: 700, outline: 'none', textAlign: 'center',
        }} />
    </div>
  );
}

/* ── ReadOnly display field ─── */
function ReadOnlyField({ label, value }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{
        background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)',
        borderRadius: 8, padding: '7px 11px', color: value ? 'var(--text-primary)' : 'var(--text-muted)',
        fontSize: '0.82rem', fontStyle: value ? 'normal' : 'italic', minHeight: 20,
      }}>{value || 'Sin datos'}</div>
    </div>
  );
}

export default function SolicitudForm({ onSubmit, editingPatient, viewingPatient, currentUser, onUpdatePatient, onClose, onSwitchToEdit, onRequestIC }) {
  const isVisor = currentUser?.role === 'visor';
  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isGestor = currentUser?.role === 'gestor_camas';
  const canEditDateTime = isSuperAdmin || isGestor;
  const patientData = editingPatient || viewingPatient;
  const isViewMode = !!viewingPatient && !editingPatient;
  const isEditMode = !!editingPatient;
  const isNewMode = !editingPatient && !viewingPatient;
  const [submitted, setSubmitted] = useState(false);

  // Superadmin: campos editables de fecha/hora para ingresos retroactivos
  const getInitialDateTime = () => {
    let d = new Date();
    if (patientData?.requestedAt) {
      const parsed = new Date(patientData.requestedAt);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
    }
    const pad = (num) => String(num).padStart(2, '0');
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
    };
  };

  const initialDT = getInitialDateTime();
  const [customDate, setCustomDate] = useState(initialDT.date);
  const [customTime, setCustomTime] = useState(initialDT.time);

  useEffect(() => {
    let d = new Date();
    if (patientData?.requestedAt) {
      const parsed = new Date(patientData.requestedAt);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
    }
    const pad = (num) => String(num).padStart(2, '0');
    setCustomDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setCustomTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);

    if (patientData) {
      setAislamiento(patientData.aislamiento !== undefined ? patientData.aislamiento : null);
      setSecondaryCodes(patientData.secondaryCodes || []);
      setEvolutions(patientData.evolutions || []);
      setFormData({
        nombre: patientData.name || '', rut: patientData.rut || '',
        edad: patientData.age || '', sexo: patientData.sexo || '',
        fechaNacimiento: patientData.fechaNacimiento || '',
        prevision: patientData.prevision || '', comuna: patientData.comuna || '',
        dxPrincipal: patientData.dxPrincipal || '',
        dxCie10: patientData.dxCie10 || '', dxGrupo: patientData.dxGrupo || '',
        servicioSol: patientData.origin || '', medicoSol: patientData.medicoSol || '',
        especialidadMedico: patientData.especialidadMedico || '',
        especialidadTratante: Array.isArray(patientData.especialidadTratante) ? patientData.especialidadTratante : (patientData.especialidadTratante ? [patientData.especialidadTratante] : []),
        destino: patientData.bedTypeRequired || 'Cuidados Medios',
        requisitosUGP: patientData.requisitosUGP || '',
        reqEnfermeria: patientData.reqEnfermeria || '',
        procedimientosPendientes: patientData.procedimientosPendientes || '',
        hodom: patientData.hodom || false, trr: patientData.trr || false,
        hfc: patientData.hfc || false, ugcc: patientData.ugcc || false,
        paSist: patientData.paSist || '', paDiast: patientData.paDiast || '',
        frecCard: patientData.frecCard || '', frecResp: patientData.frecResp || '',
        temp: patientData.temp || '', satO2: patientData.satO2 || '',
        glicemia: patientData.glicemia || '', evaDolor: patientData.evaDolor || '',
      });
    } else {
      setAislamiento(null);
      setSecondaryCodes([]);
      setEvolutions([]);
      setFormData({
        nombre: '', rut: '', edad: '', sexo: '', fechaNacimiento: '', prevision: '', comuna: '',
        dxPrincipal: '', dxCie10: '', dxGrupo: '',
        servicioSol: '', medicoSol: '', especialidadMedico: '', especialidadTratante: [], destino: 'Cuidados Medios',
        requisitosUGP: '', reqEnfermeria: '', procedimientosPendientes: '',
        hodom: false, trr: false, hfc: false, ugcc: false,
        paSist: '', paDiast: '', frecCard: '', frecResp: '', temp: '', satO2: '', glicemia: '', evaDolor: '',
      });
    }
  }, [patientData?.id]);
  const [ticketNumber, setTicketNumber] = useState('');
  const [aislamiento, setAislamiento] = useState(() => {
    if (patientData && patientData.aislamiento !== undefined) {
      if (typeof patientData.aislamiento === 'boolean') {
        return patientData.aislamiento ? ['Requiere Aislamiento'] : ['Sin Precauciones'];
      }
      return patientData.aislamiento;
    }
    return [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const autocompleteRef = useRef(null);
  const stats = getHospitalStats();

  const [formData, setFormData] = useState(() => patientData ? {
    nombre: patientData.name || '', rut: patientData.rut || '',
    edad: patientData.age || '', sexo: patientData.sexo || '',
    fechaNacimiento: patientData.fechaNacimiento || '',
    prevision: patientData.prevision || '', comuna: patientData.comuna || '',
    dxPrincipal: patientData.dxPrincipal || '',
    dxCie10: patientData.dxCie10 || '', dxGrupo: patientData.dxGrupo || '',
    servicioSol: patientData.origin || '', medicoSol: patientData.medicoSol || '',
    especialidadMedico: patientData.especialidadMedico || '',
    especialidadTratante: Array.isArray(patientData.especialidadTratante) ? patientData.especialidadTratante : (patientData.especialidadTratante ? [patientData.especialidadTratante] : []),
    destino: patientData.bedTypeRequired || 'Cuidados Medios',
    requisitosUGP: patientData.requisitosUGP || '',
    reqEnfermeria: patientData.reqEnfermeria || '',
    procedimientosPendientes: patientData.procedimientosPendientes || '',
    hodom: patientData.hodom || false, trr: patientData.trr || false,
    hfc: patientData.hfc || false, ugcc: patientData.ugcc || false,
    paSist: patientData.paSist || '', paDiast: patientData.paDiast || '',
    frecCard: patientData.frecCard || '', frecResp: patientData.frecResp || '',
    temp: patientData.temp || '', satO2: patientData.satO2 || '',
    glicemia: patientData.glicemia || '', evaDolor: patientData.evaDolor || '',
  } : {
    nombre: '', rut: '', edad: '', sexo: '', fechaNacimiento: '', prevision: '', comuna: '',
    dxPrincipal: '', dxCie10: '', dxGrupo: '',
    servicioSol: '', medicoSol: '', especialidadMedico: '', especialidadTratante: [], destino: 'Cuidados Medios',
    requisitosUGP: '', reqEnfermeria: '', procedimientosPendientes: '',
    hodom: false, trr: false, hfc: false, ugcc: false,
    paSist: '', paDiast: '', frecCard: '', frecResp: '', temp: '', satO2: '', glicemia: '', evaDolor: '',
  });
  // Secondary CIE-10 codes (up to 5)
  const [secondaryCodes, setSecondaryCodes] = useState(
    patientData?.secondaryCodes || []
  );
  const [secSearch, setSecSearch] = useState('');
  const [secSuggestions, setSecSuggestions] = useState([]);
  const [showSecSug, setShowSecSug] = useState(false);
  const secRef = useRef(null);
  // Clinical evolution log
  const [evolutions, setEvolutions] = useState(patientData?.evolutions || []);
  const [evolNote, setEvolNote] = useState('');

  useEffect(() => {
    const fn = e => { if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) setShowSuggestions(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleChange = e => {
    if (isViewMode) return;
    const { name, value, type, checked } = e.target;
    if (name === 'fechaNacimiento') {
      let calculatedYears = '';
      if (value) {
        const parts = value.split('-');
        if (parts.length === 3) {
          const birthYear = parseInt(parts[0], 10);
          const birthMonth = parseInt(parts[1], 10) - 1;
          const birthDay = parseInt(parts[2], 10);
          const birthDate = new Date(birthYear, birthMonth, birthDay);
          if (!isNaN(birthDate.getTime())) {
            const today = new Date();
            let years = today.getFullYear() - birthDate.getFullYear();
            let months = today.getMonth() - birthDate.getMonth();
            let days = today.getDate() - birthDate.getDate();
            if (days < 0) months -= 1;
            if (months < 0) years -= 1;
            calculatedYears = String(Math.max(0, years));
          }
        }
      }
      setFormData(prev => ({
        ...prev,
        fechaNacimiento: value,
        edad: calculatedYears
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleToggle = key => setFormData(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSearchCie10 = e => {
    if (isViewMode) return;
    const val = e.target.value;
    setSearchTerm(val);
    if (val.length > 2) {
      const lv = val.toLowerCase();
      const filtered = cie10Data.filter(i => matchesSearch(i.code, val) || matchesSearch(i.desc, val)).slice(0, 10);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else setShowSuggestions(false);
  };

  const handleSelectCie10 = item => {
    if (!formData.dxCie10) {
      setFormData(prev => ({ ...prev, dxCie10: item.code, dxGrupo: item.group }));
    } else if (secondaryCodes.length < 5 && !secondaryCodes.includes(item.code) && formData.dxCie10 !== item.code) {
      setSecondaryCodes(prev => [...prev, item.code]);
    }
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const removeDiagnosis = code => {
    if (code === formData.dxCie10) {
      if (secondaryCodes.length > 0) {
        const newPrincipal = secondaryCodes[0];
        const newGroup = cie10Data.find(c => c.code === newPrincipal)?.group || '';
        setFormData(prev => ({ ...prev, dxCie10: newPrincipal, dxGrupo: newGroup }));
        setSecondaryCodes(prev => prev.slice(1));
      } else {
        setFormData(prev => ({ ...prev, dxCie10: '', dxGrupo: '' }));
      }
    } else {
      setSecondaryCodes(prev => prev.filter(c => c !== code));
    }
  };

  const addEvolution = () => {
    if (!evolNote.trim()) return;
    const newEv = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('es-CL'),
      user: currentUser?.name || 'Dr(a). Tratante',
      role: currentUser?.role || 'Médico',
      note: evolNote.trim()
    };
    setEvolutions(prev => [newEv, ...prev]);
    setEvolNote('');
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (isViewMode) return;

    if (!formData.nombre?.trim() || !formData.rut?.trim()) {
      alert('Nombre Completo y RUT son campos obligatorios.');
      return;
    }

    // Helper para parsear la fecha de forma segura y evitar RangeError
    const getParsedEffectiveDate = () => {
      if (!canEditDateTime) {
        return (isEditMode && patientData?.requestedAt) ? new Date(patientData.requestedAt) : new Date();
      }
      if (!customDate || !customTime) {
        const fallback = (isEditMode && patientData?.requestedAt) ? new Date(patientData.requestedAt) : new Date();
        return isNaN(fallback.getTime()) ? new Date() : fallback;
      }
      const parsed = new Date(`${customDate}T${customTime}:00`);
      if (isNaN(parsed.getTime())) {
        const fallback = (isEditMode && patientData?.requestedAt) ? new Date(patientData.requestedAt) : new Date();
        return isNaN(fallback.getTime()) ? new Date() : fallback;
      }
      return parsed;
    };

    const effectiveDate = getParsedEffectiveDate();

    if (isEditMode && onUpdatePatient) {
      const evolWithSave = [{
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('es-CL'),
        user: currentUser?.name || 'Usuario',
        role: currentUser?.roleName || currentUser?.role || 'Profesional',
        note: '✏️ Datos de solicitud actualizados'
      }, ...evolutions];

      const updatedDiagnosisCodes = (() => {
        const codes = [];
        if (formData.dxCie10) {
          const desc = cie10Data.find(c => c.code === formData.dxCie10)?.desc || '';
          codes.push(`${formData.dxCie10} - ${desc}`);
        }
        secondaryCodes.forEach(code => {
          const desc = cie10Data.find(c => c.code === code)?.desc || '';
          codes.push(`${code} - ${desc}`);
        });
        return codes.length > 0 ? codes : (formData.dxPrincipal ? [formData.dxPrincipal] : patientData.diagnosis || []);
      })();

      onUpdatePatient({
        ...patientData, ...formData, secondaryCodes, evolutions: evolWithSave,
        name: formData.nombre, age: parseInt(formData.edad) || 0, origin: formData.servicioSol,
        bedTypeRequired: formData.destino, updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || 'Usuario',
        requestedAt: effectiveDate.toISOString(),
        diagnosis: updatedDiagnosisCodes,
        fechaNacimiento: formData.fechaNacimiento,
        aislamiento: aislamiento
      });
      return;
    }

    // Determine priority based on selected destination and conditions
    let calculatedPriority = 3;
    if (formData.destino === 'UCI') calculatedPriority = 1;
    else if (formData.destino === 'UTI') calculatedPriority = 2;

    const generatedTicket = `REQ-${effectiveDate.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900) + 100}`;
    setTicketNumber(generatedTicket);

    const newPatient = {
      id: `W-${Date.now()}`,
      name: formData.nombre || 'Paciente Sin Nombre',
      age: parseInt(formData.edad) || 0,
      fechaNacimiento: formData.fechaNacimiento,
      requestedAt: effectiveDate.toISOString(),
      diagnosis: (() => {
        const codes = [];
        if (formData.dxCie10) {
          const desc = cie10Data.find(c => c.code === formData.dxCie10)?.desc || '';
          codes.push(`${formData.dxCie10} - ${desc}`);
        }
        secondaryCodes.forEach(code => {
          const desc = cie10Data.find(c => c.code === code)?.desc || '';
          codes.push(`${code} - ${desc}`);
        });
        return codes.length > 0 ? codes : (formData.dxPrincipal ? [formData.dxPrincipal] : ['Sin diagnóstico principal']);
      })(),
      priority: calculatedPriority,
      origin: formData.servicioSol || 'Urgencia',
      bedTypeRequired: formData.destino || 'Cuidados Medios',
      ticket: generatedTicket,
      rut: formData.rut,
      sexo: formData.sexo,
      prevision: formData.prevision,
      comuna: formData.comuna,
      medicoSol: formData.medicoSol,
      especialidadMedico: formData.especialidadMedico,
      especialidadTratante: formData.especialidadTratante,
      requisitosUGP: formData.requisitosUGP,
      reqEnfermeria: formData.reqEnfermeria,
      procedimientosPendientes: formData.procedimientosPendientes,
      hodom: formData.hodom,
      trr: formData.trr,
      hfc: formData.hfc,
      ugcc: formData.ugcc,
      paSist: formData.paSist,
      paDiast: formData.paDiast,
      frecCard: formData.frecCard,
      frecResp: formData.frecResp,
      temp: formData.temp,
      satO2: formData.satO2,
      glicemia: formData.glicemia,
      evaDolor: formData.evaDolor,
      secondaryCodes: secondaryCodes,
      dxCie10: formData.dxCie10,
      dxGrupo: formData.dxGrupo,
      aislamiento: aislamiento,
      evolutions: [
        {
          id: Date.now().toString(),
          timestamp: (canEditDateTime ? effectiveDate : new Date()).toLocaleString('es-CL'),
          user: currentUser?.name || 'Sistema',
          role: currentUser?.role || 'Médico',
          note: canEditDateTime && effectiveDate.toDateString() !== new Date().toDateString()
            ? `🆕 Solicitud de cama ingresada al sistema (ingreso retroactivo: ${effectiveDate.toLocaleString('es-CL')})`
            : '🆕 Solicitud de cama ingresada al sistema.'
        }
      ]
    };

    if (onSubmit) {
      onSubmit(newPatient);
    }
    setSubmitted(true);
  };

  const now = new Date();
  const getDisplayDT = () => {
    let d = now;
    if (patientData?.requestedAt) {
      const parsed = new Date(patientData.requestedAt);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
    }
    return {
      date: d.toLocaleDateString('es-CL'),
      time: d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    };
  };
  const displayDT = getDisplayDT();
  const displayDate = displayDT.date;
  const displayTime = displayDT.time;

  if (submitted) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
          <CheckCircle size={64} color="#22c55e" style={{ margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: '2rem', marginBottom: 16 }} className="text-gradient">¡Solicitud Enviada!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Derivada a la <strong>Unidad de Gestión de Pacientes (UGP)</strong>.</p>
          <div className="glass-panel" style={{ background: 'rgba(0,212,255,0.05)', borderColor: 'rgba(0,212,255,0.2)', padding: 24, marginBottom: 32 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent)', textTransform: 'uppercase' }}>Número de Solicitud</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: 2, marginTop: 8 }}>{ticketNumber}</div>
          </div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
            <button className="glass-button primary" onClick={() => {
              setFormData({
                nombre: '', rut: '', edad: '', sexo: '', fechaNacimiento: '', prevision: '', comuna: '',
                dxPrincipal: '', dxCie10: '', dxGrupo: '',
                servicioSol: '', medicoSol: '', especialidadMedico: '',
                destino: 'Cuidados Medios', requisitosUGP: '', reqEnfermeria: '', procedimientosPendientes: '',
                hodom: false, trr: false, hfc: false, ugcc: false,
                paSist: '', paDiast: '', frecCard: '', frecResp: '', temp: '', satO2: '', glicemia: '', evaDolor: '',
              });
              setSecondaryCodes([]);
              setSearchTerm('');
              setSubmitted(false);
            }}>Registrar Nueva Solicitud</button>
            {onClose && <button className="glass-button" onClick={onClose}>Volver al Dashboard</button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1350, margin: '0 auto', padding: '0 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(10, 18, 30, 0.4)', border: '1px solid var(--border-light)',
        borderRadius: 16, padding: '16px 24px', marginBottom: 20,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)', borderRadius: 12, padding: 10, display: 'flex', boxShadow: '0 0 12px rgba(14, 165, 233, 0.3)' }}>
            <FileText size={22} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {isViewMode ? 'Detalles de Solicitud' : isEditMode ? 'Editar Solicitud' : 'Formulario de Solicitud de Cama'}
            </h2>
            {patientData && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>Ticket: {patientData.ticket || 'TKT-PENDIENTE'}</span>
                <span> • {formData.servicioSol || patientData.origin || 'Sin origen'}</span>
                {patientData.updatedBy && <span> • Últ. edición: {patientData.updatedBy}</span>}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isViewMode && onSwitchToEdit && !isVisor && (
            <button type="button" className="glass-button primary"
              style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.4)', boxShadow: '0 0 10px rgba(59,130,246,0.1)' }}
              onClick={onSwitchToEdit}>
              ✏️ Editar
            </button>
          )}
          {canEditDateTime && !isViewMode ? (
            /* Superadmin/Gestor: campos editables para ingreso retroactivo */
            <>
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 10, padding: '6px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b' }}>📅 FECHA (EDITABLE)</div>
                <input
                  type="date"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  style={{
                    background: 'transparent', border: 'none', color: '#f59e0b',
                    fontFamily: 'var(--font)', fontSize: '0.85rem', fontWeight: 700,
                    outline: 'none', textAlign: 'center', width: '100%', cursor: 'pointer',
                  }}
                />
              </div>
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 10, padding: '6px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f59e0b' }}>🕐 HORA (EDITABLE)</div>
                <input
                  type="time"
                  value={customTime}
                  onChange={e => setCustomTime(e.target.value)}
                  style={{
                    background: 'transparent', border: 'none', color: '#f59e0b',
                    fontFamily: 'var(--font)', fontSize: '0.85rem', fontWeight: 700,
                    outline: 'none', textAlign: 'center', width: '100%', cursor: 'pointer',
                  }}
                />
              </div>
            </>
          ) : (
            /* Otros roles: fecha/hora actual de solo lectura */
            [{label: 'FECHA', val: displayDate, icon: '📅'}, {label: 'HORA', val: displayTime, icon: '🕐'}].map(({label, val, icon}) => (
              <div key={label} style={{ background: 'var(--inset-bg)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '8px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#38bdf8', marginTop: 2 }}>{icon} {val}</div>
              </div>
            ))
          )}
          {onClose && (
            <button type="button" className="glass-button" onClick={onClose} style={{ padding: 8, borderRadius: '50%' }}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
          {/* Fila 1: 1. Datos del Paciente | 3. Gestión de la Derivación */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 1. DATOS DEL PACIENTE */}
            <SectionCard icon={User} title="1. Datos del Paciente" color="#06b6d4" zIndex={50}>
              {isViewMode ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 10, marginBottom: 10 }}>
                    <ReadOnlyField label="Nombre Completo" value={formData.nombre} />
                    <ReadOnlyField label="RUT" value={formData.rut} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: 10, marginBottom: 10 }}>
                    <ReadOnlyField label="Fecha de Nacimiento" value={formData.fechaNacimiento ? new Date(formData.fechaNacimiento).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : '—'} />
                    <ReadOnlyField label="Edad" value={calculateAgeDetailed(formData.fechaNacimiento) || (formData.edad ? `${formData.edad} años` : '—')} />
                    <ReadOnlyField label="Sexo" value={formData.sexo} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <ReadOnlyField label="Previsión del Paciente" value={formData.prevision} />
                    <ReadOnlyField label="Comuna de Residencia" value={formData.comuna} />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 10, marginBottom: 10 }}>
                    <div><FieldLabel>Nombre Completo <span style={{ color: '#ef4444' }}>*</span></FieldLabel><GInput name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej. Juan Pérez González" required /></div>
                    <div><FieldLabel>RUT <span style={{ color: '#ef4444' }}>*</span></FieldLabel><GInput name="rut" value={formData.rut} onChange={handleChange} placeholder="12.345.678-9" required /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <FieldLabel>Fecha de Nacimiento <span style={{ color: '#ef4444' }}>*</span></FieldLabel>
                      <GInput type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} required />
                    </div>
                    <div>
                      <FieldLabel>Edad Calculada</FieldLabel>
                      <GInput name="edadCalculada" value={calculateAgeDetailed(formData.fechaNacimiento) || (formData.edad ? `${formData.edad} años` : '')} readOnly placeholder="Se calcula desde F. Nacimiento" />
                    </div>
                    <div>
                      <FieldLabel>Sexo</FieldLabel>
                      <GSelect name="sexo" value={formData.sexo} onChange={handleChange} options={SEXOS} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><FieldLabel>Previsión del Paciente</FieldLabel><SearchableSelect name="prevision" value={formData.prevision} onChange={handleChange} options={PREVISIONES} placeholder="Buscar previsión..." /></div>
                    <div><FieldLabel>Comuna de Residencia</FieldLabel><SearchableSelect name="comuna" value={formData.comuna} onChange={handleChange} options={COMUNAS_CHILE} placeholder="Buscar comuna..." /></div>
                  </div>
                </>
              )}
            </SectionCard>

            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 3. GESTIÓN DE LA DERIVACIÓN */}
            <SectionCard icon={ArrowRightLeft} title="3. Gestión de la Derivación" color="#f59e0b" zIndex={30}>
              {isViewMode ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10, marginBottom: 10 }}>
                    <ReadOnlyField label="Servicio Solicitante" value={formData.servicioSol} />
                    <ReadOnlyField label="Destino (Unidad Requerida)" value={formData.destino} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10, marginBottom: 10 }}>
                    <ReadOnlyField label="Médico Solicitante / Tratante" value={formData.medicoSol} />
                    <ReadOnlyField label="Especialidad del Médico" value={formData.especialidadMedico} />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <ReadOnlyField label="Requisitos de UGP (Texto libre para gestión)" value={formData.requisitosUGP} />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <ReadOnlyField label="Especialidad Tratante" value={formData.especialidadTratante?.length > 0 ? formData.especialidadTratante.join(', ') : 'No especificada'} />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><FieldLabel>Servicio Solicitante</FieldLabel><SearchableSelect name="servicioSol" value={formData.servicioSol} onChange={handleChange} options={SERVICIOS_SOLICITANTES} placeholder="Buscar servicio..." /></div>
                    <div><FieldLabel>Destino (Unidad Requerida)</FieldLabel><GSelect name="destino" value={formData.destino} onChange={handleChange} options={DESTINOS} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><FieldLabel>Médico Solicitante / Tratante</FieldLabel><SearchableSelect name="medicoSol" value={formData.medicoSol} onChange={handleChange} options={MEDICOS} placeholder="Nombre Dr. / Dra." allowFreeText={true} /></div>
                    <div><FieldLabel>Especialidad del Médico</FieldLabel><SearchableSelect name="especialidadMedico" value={formData.especialidadMedico} onChange={handleChange} options={ESPECIALIDADES} placeholder="Buscar especialidad..." /></div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <FieldLabel>Requisitos de UGP (Texto libre para gestión)</FieldLabel>
                    <GTextarea name="requisitosUGP" value={formData.requisitosUGP} onChange={handleChange} placeholder="Ingrese requerimientos específicos de la unidad de gestión de camas..." rows={2} />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <FieldLabel>Especialidad Tratante (Hasta 2)</FieldLabel>
                    <MultiSearchableSelect
                      options={ESPECIALIDADES.map(e => ({ value: e, label: e }))}
                      value={formData.especialidadTratante}
                      onChange={(val) => setFormData(prev => ({ ...prev, especialidadTratante: val }))}
                      placeholder="Buscar especialidad..."
                      maxSelections={2}
                    />
                  </div>
                </>
              )}
            </SectionCard>

            </div>
          </div>

          {/* Fila 2: 2. Diagnóstico Clínico | 4. Requerimientos Clínicos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 2. DIAGNÓSTICO CLÍNICO */}
            <SectionCard icon={Stethoscope} title="2. Diagnóstico Clínico" color="#3b82f6" zIndex={40}>
              <div style={{ marginBottom: 10 }}>
                {isViewMode ? (
                  <ReadOnlyField label="Diagnóstico Principal Descriptivo (Texto Libre Opcional)" value={formData.dxPrincipal} />
                ) : (
                  <>
                    <FieldLabel>Diagnóstico Principal Descriptivo (Texto Libre Opcional)</FieldLabel>
                    <GTextarea name="dxPrincipal" value={formData.dxPrincipal} onChange={handleChange} placeholder="Descripción clínica del cuadro principal..." rows={2} />
                  </>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {!isViewMode && (
                  <div ref={autocompleteRef} style={{ position: 'relative' }}>
                    <FieldLabel>Buscador DIAGNÓSTICO CIE-10 (CÓDIGO O GLOSA)</FieldLabel>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Search size={14} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input value={searchTerm} onChange={handleSearchCie10} onFocus={() => setShowSuggestions(true)}
                        placeholder={secondaryCodes.length >= 5 && formData.dxCie10 ? 'Máximo 6 diagnósticos (1 principal + 5 sec) alcanzado' : 'Ej. J18 - Neumonía o \'cólera\''}
                        disabled={secondaryCodes.length >= 5 && !!formData.dxCie10} autoComplete="off"
                        style={{ width: '100%', background: 'var(--inset-bg)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '7px 11px 7px 32px', color: 'var(--text-primary)', fontFamily: 'var(--font)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', opacity: (secondaryCodes.length >= 5 && formData.dxCie10) ? 0.5 : 1 }} />
                    </div>
                    {showSuggestions && suggestions.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99999, background: 'var(--bg-color)', border: '1px solid #3b82f6', borderRadius: 8, maxHeight: 200, overflowY: 'auto', marginTop: 4, boxShadow: '0 16px 48px rgba(0,0,0,0.85)' }}>
                        {suggestions.map((item, idx) => (
                          <div key={idx} onMouseDown={(e) => { e.preventDefault(); handleSelectCie10(item); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem', borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <strong>{item.code}</strong> — {item.desc}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Renderización Unificada de Diagnósticos Seleccionados */}
                {(formData.dxCie10 || secondaryCodes.length > 0) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {formData.dxCie10 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ background: '#3b82f6', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.05em' }}>PRINCIPAL</span>
                          <span><strong>{formData.dxCie10}</strong> - {cie10Data.find(c => c.code === formData.dxCie10)?.desc || ''}</span>
                        </div>
                        {!isViewMode && (
                          <button type="button" onClick={() => removeDiagnosis(formData.dxCie10)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex' }}><X size={14} /></button>
                        )}
                      </div>
                    )}
                    {secondaryCodes.map((code, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '7px 11px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ background: 'var(--border-light)', color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.05em' }}>SECUNDARIO</span>
                          <span><strong>{code}</strong> - {cie10Data.find(c => c.code === code)?.desc || ''}</span>
                        </div>
                        {!isViewMode && (
                          <button type="button" onClick={() => removeDiagnosis(code)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex' }}><X size={12} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {formData.dxGrupo && (
                  <div style={{ marginTop: 4 }}>
                    <ReadOnlyField label="Grupo Diagnóstico Automático (CIE-10 Agrupado)" value={formData.dxGrupo} />
                  </div>
                )}
              </div>
            </SectionCard>

            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 4. REQUERIMIENTOS CLÍNICOS */}
            <SectionCard icon={Activity} title="4. Requerimientos Clínicos" color="#10b981" zIndex={35}>
              {isViewMode ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <ReadOnlyField label="Requerimientos de Enfermería" value={formData.reqEnfermeria} />
                    <ReadOnlyField label="Procedimientos Médicos Pendientes" value={formData.procedimientosPendientes} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'start' }}>
                    <div>
                      <FieldLabel>Aislamiento / Precauciones</FieldLabel>
                      <div style={{
                        padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)',
                        background: (Array.isArray(aislamiento) && aislamiento.some(a => a !== 'Sin Precauciones')) || aislamiento === true ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
                        color: (Array.isArray(aislamiento) && aislamiento.some(a => a !== 'Sin Precauciones')) || aislamiento === true ? '#ef4444' : '#10b981',
                        fontWeight: 700, fontSize: '0.8rem', width: 'fit-content',
                        borderColor: (Array.isArray(aislamiento) && aislamiento.some(a => a !== 'Sin Precauciones')) || aislamiento === true ? '#ef4444' : '#10b981',
                      }}>
                        {Array.isArray(aislamiento) && aislamiento.length > 0 
                          ? aislamiento.join(', ') 
                          : aislamiento === true ? 'REQUIERE AISLAMIENTO ⚠️' : aislamiento === false ? 'SIN AISLAMIENTO ✅' : 'No Especificado'}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Programas / Convenios Especiales</FieldLabel>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '6px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border-subtle)', minHeight: 20 }}>
                        {[{ key: 'hodom', label: 'HODOM' }, { key: 'trr', label: 'TRR' }, { key: 'hfc', label: 'Traslado HFC' }, { key: 'ugcc', label: 'Traslado UGCC' }].map(({ key, label }) => (
                          formData[key] ? (
                            <span key={key} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 20, padding: '2px 8px', fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>
                              ✓ {label}
                            </span>
                          ) : null
                        ))}
                        {!formData.hodom && !formData.trr && !formData.hfc && !formData.ugcc && (
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ninguno activo</span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><FieldLabel>Requerimientos de Enfermería</FieldLabel><GTextarea name="reqEnfermeria" value={formData.reqEnfermeria} onChange={handleChange} placeholder="Cuidados especiales, curaciones, etc..." rows={2} /></div>
                    <div><FieldLabel>Procedimientos Médicos Pendientes</FieldLabel><GTextarea name="procedimientosPendientes" value={formData.procedimientosPendientes} onChange={handleChange} placeholder="Procedimientos pendientes..." rows={2} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'start' }}>
                    <div>
                      <FieldLabel>Aislamiento / Precauciones</FieldLabel>
                      <div style={{ zIndex: 50, position: 'relative' }}>
                        <MultiSearchableSelect 
                          options={[
                            { value: 'Sin Precauciones', label: 'Sin Precauciones' },
                            { value: 'Precauciones de Contacto', label: 'Precauciones de Contacto' },
                            { value: 'Precauciones de Gotitas', label: 'Precauciones de Gotitas' },
                            { value: 'Precauciones Aéreas', label: 'Precauciones Aéreas' },
                            { value: 'Neutropénico', label: 'Neutropénico' }
                          ]}
                          value={Array.isArray(aislamiento) ? aislamiento : (aislamiento === true ? ['Requiere Aislamiento'] : (aislamiento === false ? ['Sin Precauciones'] : []))}
                          onChange={(val) => setAislamiento(val)}
                          placeholder="Seleccionar precauciones..."
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <Toggle label="HODOM" checked={formData.hodom} onChange={() => handleToggle('hodom')} />
                      <Toggle label="TRR (Dialisis)" checked={formData.trr} onChange={() => handleToggle('trr')} />
                      <Toggle label="Traslado HFC" checked={formData.hfc} onChange={() => handleToggle('hfc')} />
                      <Toggle label="Traslado UGCC" checked={formData.ugcc} onChange={() => handleToggle('ugcc')} />
                    </div>
                  </div>
                </>
              )}
            </SectionCard>

            </div>
          </div>

          {/* Fila 3: 5. Evolución Clínica */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* 5. REGISTRO DE EVOLUCIONES CLÍNICAS */}
            {patientData && (
              <SectionCard icon={Activity} title="5. Registro de Evolución Clínica" color="#a855f7" zIndex={25}>
                {!isViewMode && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <textarea value={evolNote} onChange={e => setEvolNote(e.target.value)}
                      placeholder="Registrar evolución clínica, observaciones..."
                      rows={2} style={{ flex: 1, background: 'var(--inset-bg)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 10, color: 'var(--text-primary)', fontFamily: 'var(--font)', fontSize: '0.82rem', outline: 'none', resize: 'vertical' }} />
                    <button type="button" onClick={addEvolution}
                      style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 8, padding: '0 14px', color: '#a855f7', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      + Registrar
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                  {evolutions.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic', padding: '4px 0' }}>Sin registros de evolución aún.</div>}
                  {evolutions.map(ev => (
                    <div key={ev.id} style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 8, padding: '8px 12px', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 4px rgba(168,85,247,0.6)' }} />
                          <span style={{ fontSize: '0.68rem', color: '#a855f7', fontWeight: 700 }}>{ev.timestamp}</span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--border-subtle)', padding: '1px 6px', borderRadius: 20 }}>{ev.user}{ev.role ? ' · ' + ev.role : ''}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{ev.note}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 6, paddingBottom: 20 }}>
          {onRequestIC && (isViewMode || isEditMode) && !isVisor && (
            <button type="button" className="glass-button"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(234,179,8,0.15)', color: '#eab308', border: '1px solid rgba(234,179,8,0.4)', padding: '8px 16px', fontSize: '0.82rem' }}
              onClick={onRequestIC}>
              <Stethoscope size={14} /> Solicitar Interconsulta
            </button>
          )}
          {isViewMode ? (
            <>
              {onSwitchToEdit && !isVisor && (
                <button type="button" className="glass-button primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.4)', boxShadow: '0 0 10px rgba(59,130,246,0.1)', padding: '8px 16px', fontSize: '0.82rem' }}
                  onClick={onSwitchToEdit}>
                  ✏️ Editar Solicitud
                </button>
              )}
              {onClose && <button type="button" className="glass-button" onClick={onClose} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>Cerrar</button>}
            </>
          ) : isEditMode ? (
            <>
              {onClose && <button type="button" className="glass-button" onClick={onClose} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>Cancelar</button>}
              <button type="submit" className="glass-button primary" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', padding: '8px 16px', fontSize: '0.82rem' }}>
                <Send size={14} /> Guardar Cambios
              </button>
            </>
          ) : (
            <>
              {onClose ? (
                <button type="button" className="glass-button" onClick={onClose} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>Cancelar</button>
              ) : (
                <button type="button" className="glass-button" onClick={() => window.history.back()} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>Cancelar</button>
              )}
              <button type="submit" className="glass-button primary" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #06b6d4, #0891b2)', padding: '8px 16px', fontSize: '0.82rem' }}>
                <Send size={14} /> Enviar Solicitud Segura
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
