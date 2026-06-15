import { X, Stethoscope, Clock, Calendar, FileText, Activity, AlertCircle } from 'lucide-react';

export default function ViewInterconsultaModal({ ic, onClose }) {
  if (!ic) return null;

  return (
    <div className="ic-view-overlay">
      <div className="glass-panel ic-view-card">
        
        {/* Header */}
        <div className="ic-view-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className={ic.priorizacion === 'URGENTE' ? 'ic-view-icon-urgente' : 'ic-view-icon-normal'}>
              <Stethoscope size={22} />
            </div>
            <div>
              <h2 className="ic-view-title">
                Interconsulta: {ic.especialidadDestino}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span className={ic.priorizacion === 'URGENTE' ? 'ic-view-badge-urgente' : 'ic-view-badge-normal'}>
                  {ic.priorizacion}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  ID: {ic.id}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="ic-view-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '24px' }}>
          
          {/* Left Column: Patient Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Identification Card */}
            <div className="ic-view-section-card">
              <h4 className="ic-view-section-title">
                Datos de Identificación
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div className="ic-view-label">Paciente</div>
                  <div className="ic-view-value">{ic.patientName}</div>
                </div>
                <div>
                  <div className="ic-view-label">RUT</div>
                  <div className="ic-view-value">{ic.patientRut || '—'}</div>
                </div>
                <div>
                  <div className="ic-view-label">Edad</div>
                  <div className="ic-view-value">{ic.edad || '—'}</div>
                </div>
                <div>
                  <div className="ic-view-label">Ubicación Actual</div>
                  <div className="ic-view-value">
                    {ic.cama || `${ic.floor || ''} ${ic.sector || ''} Hab. ${ic.roomId || ''} Cama ${ic.bedId || ''}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Derivation Card */}
            <div className="ic-view-section-card">
              <h4 className="ic-view-section-title">
                Origen de Derivación
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div className="ic-view-label">Profesional Deriva</div>
                  <div className="ic-view-value">{ic.profesionalDeriva || '—'}</div>
                </div>
                <div>
                  <div className="ic-view-label">Fecha de Emisión</div>
                  <div className="ic-view-value-subtle">
                    <Calendar size={12} style={{ color: 'var(--text-secondary)' }} />
                    {ic.solicitadaAt ? new Date(ic.solicitadaAt).toLocaleDateString('es-CL') : ic.fecha || '—'}
                  </div>
                </div>
                <div>
                  <div className="ic-view-label">Hora de Emisión</div>
                  <div className="ic-view-value-subtle">
                    <Clock size={12} style={{ color: 'var(--text-secondary)' }} />
                    {ic.solicitadaAt ? new Date(ic.solicitadaAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ic.hora || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* CIE-10 Diagnostics Card */}
            <div className="ic-view-section-card">
              <h4 className="ic-view-section-title">
                Diagnósticos (CIE-10)
              </h4>
              {ic.diagnosticos && ic.diagnosticos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {ic.diagnosticos.map((diag, index) => (
                    <div key={index} className="ic-view-cie10-item">
                      {diag}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No registrados en interconsulta.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Clinical Request details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Requirement Box */}
            <div className="ic-view-req-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Activity size={16} color="#a855f7" />
                <span className="ic-view-label" style={{ marginBottom: 0, fontWeight: 750, color: 'var(--text-secondary)' }}>
                  Tipo de Requerimiento
                </span>
              </div>
              <div className="ic-view-req-title">
                {ic.tipoRequerimiento}
              </div>
              {ic.tipoRequerimiento === 'OTRO' && ic.otroRequerimiento && (
                <div className="ic-view-req-other">
                  {ic.otroRequerimiento}
                </div>
              )}
            </div>

            {/* Clinical History Summary */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <FileText size={14} color="var(--text-secondary)" />
                <span className="ic-view-label">
                  Resumen de Historia Clínica
                </span>
              </div>
              <div className="ic-view-text-block">
                {ic.resumenHistoria || 'No registrado.'}
              </div>
            </div>

            {/* Exams Performed */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <FileText size={14} color="var(--text-secondary)" />
                <span className="ic-view-label">
                  Exámenes Realizados
                </span>
              </div>
              <div className="ic-view-text-block">
                {ic.examenesRealizados || 'No registrados.'}
              </div>
            </div>

            {/* Se Solicita Específicamente */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <AlertCircle size={14} color="#a855f7" />
                <span className="ic-view-label" style={{ color: '#a855f7' }}>
                  Se Solicita Específicamente
                </span>
              </div>
              <div className="ic-view-solicita-block">
                {ic.seRequiere}
              </div>
            </div>

            {/* Resolution Card if resolved */}
            {ic.estado !== 'pendiente' && (
              <div className="ic-view-section-card" style={{ marginTop: '12px' }}>
                <h4 className="ic-view-section-title">
                  Resolución
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Estado: </span>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: ic.estado === 'realizada' ? '#22c55e' : ic.estado === 'no_pertinente' ? '#f97316' : '#ef4444'
                    }}>
                      {ic.estado === 'realizada' ? 'Atención Realizada' : ic.estado === 'no_pertinente' ? 'Desestimada' : 'Eliminada'}
                    </span>
                  </div>
                  {ic.observaciones && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Observaciones:</div>
                      <div className="ic-view-text-block" style={{ fontStyle: 'italic', marginTop: '4px', minHeight: 'auto', padding: '10px 12px' }}>
                        "{ic.observaciones}"
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="ic-view-footer">
          <button onClick={onClose} className="glass-button primary" style={{
            padding: '10px 24px',
            background: 'var(--accent-color, #a855f7)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}>
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
}
