import { useState } from 'react';
import { Unlock, X } from 'lucide-react';

export default function UnblockBedModal({ bed, onClose, onConfirm, user }) {
  const [observation, setObservation] = useState('');

  const handleSubmit = () => {
    onConfirm({ observation });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="modal-content" style={{ width: 550, padding: 36, background: '#0f172a', border: '1px solid #22c55e', borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Unlock size={20} />
            Desbloqueo de cama
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.5 }}>
          Va a volver a habilitar la cama <strong style={{ color: 'var(--text-primary)' }}>{bed.id}</strong> para que pueda recibir pacientes.
        </p>

        <div style={{ marginBottom: 32 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Observación de desbloqueo (Opcional):
          </label>
          <textarea 
            className="glass-input" 
            rows={4}
            style={{ width: '100%', boxSizing: 'border-box' }}
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Detalles sobre la resolución del bloqueo..."
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="glass-button" onClick={onClose} style={{ padding: '8px 16px' }}>Cancelar</button>
          <button className="glass-button primary" onClick={handleSubmit} style={{ padding: '8px 16px', background: '#22c55e', borderColor: '#22c55e', color: '#fff' }}>
            Confirmar Desbloqueo
          </button>
        </div>
      </div>
    </div>
  );
}
