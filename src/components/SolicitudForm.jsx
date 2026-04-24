import { useState, useEffect, useRef } from 'react';
import { Send, FileText, CheckCircle, AlertCircle, CalendarClock, Activity } from 'lucide-react';
import { getHospitalStats } from '../data/dummy';
import cie10Data from '../data/cie10.json';

export default function SolicitudForm() {
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [formData, setFormData] = useState({
    nombre: '', rut: '', edad: '', dxDesc: '', dxCie10: '', dxGrupo: '', dxSec: '',
    servicioSol: 'Servicio de Atención de Urgencia', medicoSol: '', destino: 'Cuidados Medios', 
    hodom: false, trr: false, hfc: false, ugcc: false
  });
  
  // Autocomplete State
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  
  const autocompleteRef = useRef(null);
  const stats = getHospitalStats();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchCie10 = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setFormData(prev => ({ ...prev, dxCie10: val }));
    
    if (val.length > 2) {
      const lowerVal = val.toLowerCase();
      const filtered = cie10Data.filter(item => 
        item.code.toLowerCase().includes(lowerVal) || 
        item.desc.toLowerCase().includes(lowerVal)
      ).slice(0, 10); // max 10 suggestions
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectCie10 = (item) => {
    setSearchTerm(`${item.code} - ${item.desc}`);
    setFormData(prev => ({ 
      ...prev, 
      dxCie10: item.code,
      dxGrupo: item.group 
    }));
    setShowSuggestions(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTicketNumber(`REQ-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random() * 900) + 100}`);
    setSubmitted(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Fixed Date and Time
  const now = new Date();
  const currentDate = now.toLocaleDateString('es-CL');
  const currentTime = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  if (submitted) {
    return (
      <div className="main-layout" style={{ display: 'block' }}>
        <div className="glass-panel" style={{ maxWidth: '1000px', margin: '40px auto', padding: '40px', textAlign: 'center' }}>
          <CheckCircle size={64} color="#22c55e" style={{ margin: '0 auto 24px' }} />
          <h2 style={{ fontSize: '2rem', marginBottom: '16px' }} className="text-gradient">¡Solicitud Enviada Exitosamente!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '32px' }}>
            Su solicitud ha sido recibida y derivada a la <strong>Unidad de Gestión de Pacientes (UGP)</strong> en atención cerrada del Hospital de Villarrica.
          </p>
          
          <div className="glass-panel" style={{ background: 'rgba(0, 240, 255, 0.05)', borderColor: 'rgba(0, 240, 255, 0.2)', padding: '24px', marginBottom: '40px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Número de Solicitud (Ticket)</span>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '2px', marginTop: '8px' }}>
              {ticketNumber}
            </div>
          </div>

          <h3 style={{ fontSize: '1.3rem', marginBottom: '24px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity color="var(--accent-color)" /> Panorama de Ocupación en Tiempo Real
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', textAlign: 'left', marginBottom: '32px' }}>
            <div className="glass-panel" style={{ padding: '20px', borderTop: '4px solid #22c55e' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Disponibles Totales</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 600, color: '#22c55e' }}>{stats.available}</div>
            </div>
            <div className="glass-panel" style={{ padding: '20px', borderTop: '4px solid #ef4444' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ocupadas Totales</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 600, color: '#ef4444' }}>{stats.occupied}</div>
            </div>
            <div className="glass-panel" style={{ padding: '20px', borderTop: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>En Aseo / Prep.</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 600, color: '#f59e0b' }}>{stats.cleaning}</div>
            </div>
            <div className="glass-panel" style={{ padding: '20px', borderTop: '4px solid #64748b' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Inhabilitadas Totales</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 600, color: '#94a3b8' }}>{stats.inhabilitadas}</div>
            </div>
          </div>

          <h4 style={{ fontSize: '1.1rem', marginBottom: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Desglose por Servicio Clínico (125 Camas)</h4>
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--glass-border)' }}>Servicio</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--glass-border)', color: '#22c55e' }}>Disponibles</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--glass-border)', color: '#ef4444' }}>Ocupadas</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--glass-border)', color: '#f59e0b' }}>En Aseo</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--glass-border)', color: '#94a3b8' }}>Inhabilitadas</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--glass-border)', color: 'var(--accent-color)', textAlign: 'right' }}>Total Fila</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.breakdown).map(([servicio, data]) => {
                  const rowTotal = data.available + data.occupied + data.cleaning + data.inhabilitadas;
                  return (
                    <tr key={servicio} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{servicio}</td>
                      <td style={{ padding: '12px 16px', color: data.available > 0 ? '#22c55e' : 'inherit' }}>{data.available}</td>
                      <td style={{ padding: '12px 16px', color: data.occupied > 0 ? '#ef4444' : 'inherit' }}>{data.occupied}</td>
                      <td style={{ padding: '12px 16px', color: data.cleaning > 0 ? '#f59e0b' : 'inherit' }}>{data.cleaning}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{data.inhabilitadas}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-color)', textAlign: 'right' }}>{rowTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(0, 240, 255, 0.05)', borderTop: '2px solid rgba(0, 240, 255, 0.3)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>TOTAL HOSPITAL</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#22c55e', fontSize: '1.1rem' }}>{stats.available}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#ef4444', fontSize: '1.1rem' }}>{stats.occupied}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#f59e0b', fontSize: '1.1rem' }}>{stats.cleaning}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#94a3b8', fontSize: '1.1rem' }}>{stats.inhabilitadas}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--accent-color)', fontSize: '1.2rem', textAlign: 'right' }}>125</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
            <button className="glass-button primary" onClick={() => setSubmitted(false)}>Registrar Nueva Solicitud</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-layout" style={{ display: 'block', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FileText size={24} className="icon-logo" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Formulario de Solicitud de Cama (Lista de Espera)</h2>
      </div>

      <form className="glass-panel" onSubmit={handleSubmit} style={{ padding: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Col 1 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label>Nombre Completo Paciente</label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required className="glass-input" placeholder="Ej. Juan Pérez González" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>RUT</label>
                <input type="text" name="rut" value={formData.rut} onChange={handleChange} required className="glass-input" placeholder="12.345.678-9" />
              </div>
              <div className="form-group">
                <label>Edad</label>
                <input type="number" name="edad" value={formData.edad} onChange={handleChange} required className="glass-input" placeholder="Años" />
              </div>
            </div>
            
            <div className="form-group">
              <label>Diagnóstico Principal Descriptivo</label>
              <textarea name="dxDesc" value={formData.dxDesc} onChange={handleChange} required className="glass-input" rows="3" placeholder="Descripción clínica del cuadro principal..."></textarea>
            </div>
            
            {/* CIE-10 Autocomplete */}
            <div className="form-group" style={{ position: 'relative' }} ref={autocompleteRef}>
              <label>Diagnóstico CIE-10 (Código o Glosa)</label>
              <input 
                type="text" 
                value={searchTerm} 
                onChange={handleSearchCie10} 
                required 
                className="glass-input" 
                placeholder="Ej. J18 - Neumonía o 'cólera'" 
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="glass-panel" style={{ 
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, 
                  maxHeight: '200px', overflowY: 'auto', marginTop: '4px', padding: '8px'
                }}>
                  {suggestions.map((item, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleSelectCie10(item)}
                      style={{ 
                        padding: '8px 12px', cursor: 'pointer', borderBottom: idx < suggestions.length - 1 ? '1px solid var(--glass-border)' : 'none',
                        fontSize: '0.9rem'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <strong>{item.code}</strong> - {item.desc}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Grupo Diagnóstico (CIE-10 Agrupado)</label>
              <input type="text" name="dxGrupo" value={formData.dxGrupo} readOnly className="glass-input" style={{ opacity: 0.8, cursor: 'not-allowed' }} placeholder="Se autocompleta con CIE-10..." />
            </div>

            <div className="form-group">
              <label>Diagnóstico Secundario de Interés</label>
              <input type="text" name="dxSec" value={formData.dxSec} onChange={handleChange} className="glass-input" placeholder="Comorbilidades relevantes..." />
            </div>
          </div>

          {/* Col 2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label>Servicio Solicitante</label>
              <select name="servicioSol" value={formData.servicioSol} onChange={handleChange} required className="glass-input">
                <option value="Servicio de Atención de Urgencia">Servicio de Atención de Urgencia</option>
                <option value="Centro Adosado de Especialidades Médicas">Centro Adosado de Especialidades Médicas</option>
                <option value="Pabellón y Recuperación">Pabellón y Recuperación</option>
                <option value="Otros (UGCC - Establecimientos de la red)">Otros (UGCC - Establecimientos de la red)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Médico Solicitante</label>
              <input type="text" name="medicoSol" value={formData.medicoSol} onChange={handleChange} required className="glass-input" placeholder="Nombre Dr. / Dra." />
            </div>

            <div className="form-group">
              <label>Destino de Solicitud (Unidad Requerida)</label>
              <select name="destino" value={formData.destino} onChange={handleChange} required className="glass-input">
                <option value="UCI">UCI (Unidad de Cuidados Intensivos)</option>
                <option value="UTI">UTI (Unidad de Tratamientos Intermedios)</option>
                <option value="Cuidados Medios">Cuidados Medios</option>
                <option value="Maternidad">Maternidad</option>
                <option value="Neonatología">Neonatología</option>
                <option value="Infantil">Infantil</option>
              </select>
            </div>

            {/* Read-only DateTime block to prevent retroactive assignments */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Fecha Registro (Automático)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 500 }}>
                  <CalendarClock size={18} color="var(--accent-color)" /> {currentDate}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Hora Registro (Automático)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 500 }}>
                  <CalendarClock size={18} color="var(--accent-color)" /> {currentTime}
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Factores Críticos de Derivación</div>
              
              <label className="toggle-row">
                <span>Posible HODOM (Hospitalización Domiciliaria)</span>
                <input type="checkbox" name="hodom" checked={formData.hodom} onChange={handleChange} className="switch" />
              </label>
              
              <label className="toggle-row">
                <span>Requiere Terapia de Reemplazo Renal (TRR)</span>
                <input type="checkbox" name="trr" checked={formData.trr} onChange={handleChange} className="switch" />
              </label>

              <label className="toggle-row">
                <span>¿Acepta Traslado HFC?</span>
                <input type="checkbox" name="hfc" checked={formData.hfc} onChange={handleChange} className="switch" />
              </label>

              <label className="toggle-row">
                <span>¿Acepta Traslado UGCC?</span>
                <input type="checkbox" name="ugcc" checked={formData.ugcc} onChange={handleChange} className="switch" />
              </label>
            </div>

          </div>
        </div>

        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginRight: 'auto' }}>
            <AlertCircle size={16} /> Verifique los datos. La hora de indicación no podrá ser modificada tras enviar.
          </div>
          <button type="button" className="glass-button" onClick={() => window.history.back()}>Cancelar</button>
          <button type="submit" className="glass-button primary"><Send size={18} /> Enviar Solicitud Segura</button>
        </div>
      </form>
    </div>
  );
}
