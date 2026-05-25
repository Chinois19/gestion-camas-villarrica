import { useState, useEffect } from 'react';
import { X, Save, Activity, ArrowRight, AlertTriangle, List } from 'lucide-react';
import { GRD_DATA, calculateProjectedDays, getGrdLimit } from '../data/grd';
import SearchableSelect from './SearchableSelect';
import MultiSearchableSelect from './MultiSearchableSelect';
import { CIE10_OPTIONS } from '../data/cie10Options';

export default function EditGrdModal({ bed, availableBeds = [], onConfirm, onClose, onDischargeRequest, onRequestIC, onFinishCleaning }) {
  const [formData, setFormData] = useState({
    grdId: bed.grdId || '',
    severity: bed.severity || 1,
    projectedDays: bed.projectedDays || 0,
    targetBedId: '',
    diagnosis: Array.isArray(bed.diagnosis) ? bed.diagnosis : (bed.diagnosis ? [bed.diagnosis] : [])
  });

  const [limitDays, setLimitDays] = useState(0);

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

  const handleConfirm = (e) => {
    e.preventDefault();
    const grd = GRD_DATA.find(g => g.id === formData.grdId);
    
    let transferTarget = null;
    if (formData.targetBedId) {
      const [roomId, bedId] = formData.targetBedId.split('|');
      transferTarget = { roomId, bedId };
    }

    onConfirm({
      grdId: formData.grdId,
      grdName: grd ? grd.name : '',
      severity: formData.severity,
      projectedDays: parseInt(formData.projectedDays) || 0,
      diagnosis: formData.diagnosis
    }, transferTarget);
  };

  const selectedTargetBed = availableBeds.find(b => `${b.roomId}|${b.id}` === formData.targetBedId);

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-content assignment-form" style={{ maxWidth: '1000px', display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="modal-header" style={{ paddingBottom: '0', borderBottom: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Activity className="icon-logo" size={24} />
              <h2 className="text-gradient">Gestión de Casos</h2>
            </div>
            <button className="close-btn" onClick={onClose}><X size={20} /></button>
          </div>

          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.1rem' }}>Paciente: {bed.patient}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Cama: {bed.id} ({bed.tag || bed.type})</p>
            {bed.status === 'occupied' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                <button type="button" className="glass-button" onClick={() => onDischargeRequest(bed)}>Alta Médica</button>
                <button type="button" className="glass-button" onClick={() => onRequestIC(bed)}>Solicitar IC</button>
              </div>
            )}
            {bed.status === 'cleaning' && (
              <div style={{ marginTop: '16px' }}>
                 <button type="button" className="glass-button" onClick={() => onFinishCleaning(bed.roomId, bed.id)}>Finalizar Aseo</button>
              </div>
            )}
          </div>
          
          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
             <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.1rem' }}>Historial de Interconsultas</h3>
             {bed.interconsultas && bed.interconsultas.length > 0 ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 {bed.interconsultas.map(ic => (
                    <div key={ic.id} style={{ padding: '8px', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <strong>{ic.especialidadDestino}</strong>
                      <div style={{ color: 'var(--text-secondary)' }}>{ic.motivoConsulta}</div>
                      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: ic.estado === 'pendiente' ? '#fb923c' : '#4ade80' }}>
                           {ic.estado.toUpperCase()}
                        </span>
                        <span>{new Date(ic.fechaSolicitud).toLocaleDateString()}</span>
                      </div>
                    </div>
                 ))}
               </div>
             ) : (
               <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No hay interconsultas para este paciente.</p>
             )}
          </div>
        </div>

        {/* Right Column */}
        <div className="modal-body" style={{ padding: '24px 0 0 0' }}>
          <form onSubmit={handleConfirm} className="assignment-fields">
            <div className="form-section glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 className="section-title">Datos Clínicos y GRD</h3>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Diagnóstico de Ingreso (Hasta 5)</label>
                <MultiSearchableSelect 
                  options={CIE10_OPTIONS}
                  value={formData.diagnosis}
                  onChange={(val) => setFormData(prev => ({ ...prev, diagnosis: val }))}
                  placeholder="Buscar diagnósticos CIE-10..."
                  maxSelections={5}
                />
              </div>

              <div className="form-group">
                <label>Grupo Diagnóstico (GRD)</label>
                <SearchableSelect 
                  options={GRD_DATA.map(g => ({ value: g.id, label: `${g.id} - ${g.name}` }))}
                  value={formData.grdId}
                  onChange={handleGrdChange}
                  placeholder="Seleccione GRD..."
                />
              </div>

              <div className="form-group">
                <label>Nivel de Severidad</label>
                <div className="severity-selector">
                  {[1, 2, 3].map(level => (
                    <button 
                      key={level} 
                      type="button" 
                      className={`severity-btn s-${level} ${parseInt(formData.severity) === level ? 'active' : ''}`}
                      onClick={() => handleSeverityChange(level)}
                      disabled={!formData.grdId}
                    >
                      {level === 1 ? 'Menor' : level === 2 ? 'Moderada' : 'Mayor'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Días de Estada Proyectada</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="number" 
                    value={formData.projectedDays} 
                    onChange={handleChangeDays} 
                    className="glass-input" 
                    style={{ width: '100px' }}
                    min="0"
                  />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Límite Superior: {limitDays} días
                  </span>
                </div>
              </div>
            </div>

            <div className="form-section glass-panel" style={{ padding: '24px' }}>
              <h3 className="section-title"><ArrowRight size={16} /> Traslado de Paciente</h3>
              <div className="form-group">
                <select 
                  name="targetBedId" 
                  value={formData.targetBedId} 
                  onChange={(e) => setFormData(prev => ({ ...prev, targetBedId: e.target.value }))}
                  className="glass-input"
                >
                  <option value="">-- Mantener en cama actual --</option>
                  {availableBeds.map(b => (
                    <option key={`${b.roomId}|${b.id}`} value={`${b.roomId}|${b.id}`}>
                      {b.floor} - Hab {b.roomId} - Cama {b.id} ({b.tag || b.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '32px' }}>
              <button type="button" className="glass-button" onClick={onClose} style={{ background: '#4c1d95', color: '#fff', border: 'none' }}>Cancelar</button>
              <button type="submit" className="glass-button primary">
                <Save size={18} /> Confirmar Cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
