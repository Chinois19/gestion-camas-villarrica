import { useState } from 'react';
import { Lock, X } from 'lucide-react';

export default function BlockBedModal({ bed, onClose, onConfirm, user }) {
  const [reason, setReason] = useState('');
  const [observation, setObservation] = useState('');

  const reasons = [
    'Recursos Humanos',
    'Equipamiento Médico',
    'Infraestructura',
    'Causales asociadas al paciente Salud Mental',
    'Infecciones Asociadas a la Atención de la Salud'
  ];

  const handleSubmit = () => {
    if (!reason) {
      alert('Debe seleccionar un motivo de bloqueo.');
      return;
    }
    onConfirm({ reason, observation });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="modal-content" style={{ width: 450, padding: 24, background: '#0f172a', border: '1px solid #ef4444', borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={20} />
            Bloqueo de cama
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          Va a inhabilitar la cama <strong>{bed.id}</strong>. Esta cama no podrá ser utilizada hasta que sea desbloqueada.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Bloqueo de camas asociado a:
          </label>
          <select 
            className="glass-input" 
            style={{ width: '100%', boxSizing: 'border-box' }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="">-- Seleccione una causal --</option>
            {reasons.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Glosa de observación (Opcional):
          </label>
          <textarea 
            className="glass-input" 
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box' }}
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Detalles adicionales sobre el bloqueo..."
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="glass-button" onClick={onClose} style={{ padding: '8px 16px' }}>Cancelar</button>
          <button className="glass-button primary" onClick={handleSubmit} style={{ padding: '8px 16px', background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}>
            Confirmar Bloqueo
          </button>
        </div>
      </div>
    </div>
  );
}
