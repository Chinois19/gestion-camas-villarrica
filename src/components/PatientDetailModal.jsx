import { X, Clock, Activity, FileText } from 'lucide-react';

export default function PatientDetailModal({ patient, onClose }) {
  const requestTime = new Date(patient.requestedAt);
  const currentTime = new Date();
  
  // Cálculo de tiempo de espera en minutos
  const waitMinutes = Math.floor((currentTime - requestTime) / (1000 * 60));
  const waitHours = Math.floor(waitMinutes / 60);

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content assignment-form" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText className="icon-logo" size={24} />
            <h2 className="text-gradient">Detalles de Solicitud</h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="assignment-grid">
            {/* Resumen de Trazabilidad */}
            <div className="traceability-section glass-panel">
              <h3 className="section-title"><Clock size={16} /> Trazabilidad de Tiempo</h3>
              <div className="trace-item">
                <span className="label">Solicitud:</span>
                <span className="value">{requestTime.toLocaleString()}</span>
              </div>
              <div className="trace-item highlight">
                <span className="label">Tiempo Total de Espera:</span>
                <span className="value">{waitHours}h {waitMinutes % 60}m</span>
              </div>
            </div>

            <div className="assignment-fields">
              <div className="form-section">
                <h3 className="section-title">Información Clínica</h3>
                <div className="form-group">
                  <label>Nombre del Paciente</label>
                  <input type="text" value={patient.name} readOnly className="glass-input readonly" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Edad</label>
                    <input type="text" value={`${patient.age} años`} readOnly className="glass-input readonly" />
                  </div>
                  <div className="form-group">
                    <label>Prioridad</label>
                    <input type="text" value={`P${patient.priority}`} readOnly className="glass-input readonly" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Diagnóstico de Ingreso</label>
                  <textarea value={patient.diagnosis} readOnly className="glass-input readonly" rows="3" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Servicio Origen</label>
                    <input type="text" value={patient.origin} readOnly className="glass-input readonly" />
                  </div>
                  <div className="form-group">
                    <label>Tipo de Cama Requerida</label>
                    <input type="text" value={patient.bedTypeRequired} readOnly className="glass-input readonly" />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="glass-button primary" onClick={onClose}>
                Cerrar Detalles
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
