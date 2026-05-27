import { X, Clock, User, Activity, FileText, AlertTriangle, Info, Heart } from 'lucide-react';

export default function PatientDetailModal({ patient, onClose }) {
  const requestTime = new Date(patient.requestedAt || new Date());
  const currentTime = new Date();
  
  const waitMinutes = Math.floor((currentTime - requestTime) / (1000 * 60));
  const waitHours = Math.floor(waitMinutes / 60);
  const displayMins = waitMinutes % 60;

  // Format date
  const dateStr = requestTime.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = requestTime.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: true });

  const CriticalBadge = ({ label, value }) => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      border: value ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
      borderRadius: '8px', padding: '10px 4px', width: '60px',
      background: value ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0,0,0,0.2)'
    }}>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: value ? '#ef4444' : 'var(--text-primary)' }}>
        {value ? 'SÍ' : 'NO'}
      </span>
    </div>
  );

  const VitalBox = ({ label, value, unit, color = 'var(--text-primary)' }) => (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 4px',
      background: 'rgba(0,0,0,0.2)', minWidth: '60px'
    }}>
      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</span>
      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color }}>{value || '-'}</span>
      <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '2px' }}>{unit}</span>
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c6aff 100%)', borderRadius: '12px', padding: '12px', display: 'flex' }}>
              <FileText size={24} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Detalles de Solicitud</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span style={{ color: '#00d4ff', fontWeight: 600 }}>Ticket: {patient.ticket || 'TKT-PENDIENTE'}</span>
                <span>•</span>
                <span>{patient.origin || 'Urgencia'}</span>
              </div>
            </div>
          </div>
          <button className="glass-button" onClick={onClose} style={{ padding: '8px', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        {/* Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Trazabilidad */}
            <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Clock size={16} color="#7c6aff" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>TRAZABILIDAD</span>
              </div>
              <div style={{ textAlign: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-subtle)', marginBottom: '12px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                  {waitHours}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>h</span>
                  {displayMins}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>m</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#7c6aff', fontWeight: 600, letterSpacing: '0.5px', marginTop: '4px' }}>TIEMPO TRANSCURRIDO EN ESPERA</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Solicitado:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{timeStr}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Fecha:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{dateStr}</span>
              </div>
            </div>

            {/* Identificación */}
            <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <User size={16} color="#a855f7" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>IDENTIFICACIÓN</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>PACIENTE</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{patient.name || patient.nombre || 'Sin nombre'}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>RUT</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{patient.rut || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>EDAD / SEXO</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{patient.age || patient.edad || '-'}a / {patient.sexo || '-'}</div>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>COMUNA</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{patient.comuna || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>PREVISIÓN</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{patient.prevision || '-'}</div>
              </div>
            </div>

            {/* Requisitos UGP */}
            <div className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(124, 106, 255, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FileText size={16} color="#7c6aff" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>REQUISITOS UGP</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: patient.requisitosUGP ? 'var(--text-primary)' : 'var(--text-muted)', margin: 0, fontStyle: patient.requisitosUGP ? 'normal' : 'italic' }}>
                {patient.requisitosUGP || 'Sin requisitos registrados.'}
              </p>
            </div>

          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Top Row: Solicitud & Factores */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
              
              {/* Solicitud de Cama */}
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <FileText size={16} color="#00d4ff" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>SOLICITUD DE CAMA</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>ORIGEN</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{patient.origin || patient.servicioSol || '-'}</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(124, 106, 255, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid #7c6aff' }}>
                    <div style={{ fontSize: '0.65rem', color: '#7c6aff', marginBottom: '4px' }}>DESTINO REQUERIDO</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{patient.bedTypeRequired || patient.destino || '-'}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>MÉDICO SOLICITANTE</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Dr(a). {patient.medicoSol || patient.medico || '-'}</div>
                </div>
              </div>

              {/* Factores Críticos */}
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <AlertTriangle size={16} color="#ef4444" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>FACTORES CRÍTICOS</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <CriticalBadge label="HODOM" value={patient.hodom} />
                  <CriticalBadge label="TRR" value={patient.trr} />
                  <CriticalBadge label="HFC" value={patient.hfc} />
                  <CriticalBadge label="UGCC" value={patient.ugcc} />
                </div>
              </div>
            </div>

            {/* Diagnóstico */}
            <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Activity size={16} color="#3b82f6" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>DIAGNÓSTICO & CONDICIÓN</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #7c6aff', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>DIAGNÓSTICO PRINCIPAL</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {patient.dxCie10 ? `${patient.dxCie10} - ` : ''}{patient.diagnosis || patient.dxPrincipal || '-'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>DIAGNÓSTICO SECUNDARIO</div>
                <div style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-primary)' }}>
                  {patient.secondaryCodes?.length > 0 
                    ? patient.secondaryCodes.join(', ') 
                    : (patient.dxSecundario || 'Sin diagnósticos secundarios registrados.')}
                </div>
              </div>
            </div>

            {/* Signos Vitales */}
            <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Heart size={16} color="#ef4444" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>SIGNOS VITALES AL INGRESO</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', overflowX: 'auto' }}>
                <VitalBox label="P.A." value={patient.paSist && patient.paDiast ? `${patient.paSist}/${patient.paDiast}` : '-'} unit="mmHg" color="#ef4444" />
                <VitalBox label="F.C." value={patient.frecCard} unit="lpm" color="#ef4444" />
                <VitalBox label="F.R." value={patient.frecResp} unit="rpm" color="#22c55e" />
                <VitalBox label="SAT O2" value={patient.satO2} unit="%" color="#00d4ff" />
                <VitalBox label="TEMP" value={patient.temp} unit="°C" color="#f59e0b" />
                <VitalBox label="GLIC" value={patient.glicemia} unit="mg/dL" color="#a855f7" />
                <VitalBox label="EVA" value={patient.evaDolor} unit="0-10" />
              </div>
            </div>

            {/* Bottom Row: Enfermería & Procedimientos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Activity size={16} color="#7c6aff" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>CUIDADOS ENFERMERÍA</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: patient.reqEnfermeria ? 'var(--text-primary)' : 'var(--text-muted)', margin: 0 }}>
                  {patient.reqEnfermeria || 'Sin cuidados registrados.'}
                </p>
              </div>
              
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Info size={16} color="#f59e0b" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>PROCEDIMIENTOS PENDIENTES</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: patient.procedimientosPendientes ? 'var(--text-primary)' : 'var(--text-muted)', margin: 0 }}>
                  {patient.procedimientosPendientes || 'Sin procedimientos registrados.'}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
