import { useState, useEffect } from 'react';
import { HeartPulse, Clock, Search, CheckSquare, Square, User, ChevronDown, ChevronRight } from 'lucide-react';

export default function HodomPanel({ hodomRequests, onMarkDone, onDelete, userRole }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const calculateWait = (isoString) => {
    const diff = now - new Date(isoString);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    parts.push(`${minutes % 60}m`);
    return { text: parts.join(' '), totalMinutes: minutes, isCritical: minutes > 1440 };
  };

  const pending = hodomRequests
    .filter(r => r.estado === 'pendiente')
    .filter(r =>
      (r.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.rut || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(a.solicitadaAt) - new Date(b.solicitadaAt));

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar" style={{ background: 'var(--panel-bg)', color: 'var(--status-available)', border: '1px solid var(--status-available)' }}>
              <HeartPulse size={24} />
            </div>
            <div>
              <h2 className="text-gradient" style={{ background: 'linear-gradient(135deg,#22c55e,#4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.5rem', fontWeight: 700 }}>
                Panel HODOM — Hospitalizaciones Domiciliarias
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {pending.length} solicitud{pending.length !== 1 ? 'es' : ''} pendiente{pending.length !== 1 ? 's' : ''} de evaluación · Actualización automática cada minuto
              </p>
            </div>
          </div>
          <div className="search-container" style={{ margin: 0, maxWidth: '260px' }}>
            <Search size={16} color="var(--text-secondary)" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar paciente o RUT..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { label: 'Pendientes', value: hodomRequests.filter(r => r.estado === 'pendiente').length, color: '#f59e0b' },
            { label: 'Aprobados', value: hodomRequests.filter(r => r.estado === 'aprobado').length, color: '#22c55e' },
            { label: 'Total hoy', value: hodomRequests.length, color: '#a855f7' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--inset-bg)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: 'var(--shadow-inset)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Requests */}
      {pending.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <HeartPulse size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <p>No hay solicitudes HODOM pendientes.</p>
        </div>
      ) : (
        pending.map(req => {
          const wait = calculateWait(req.solicitadaAt);
          const cumplidos = req.hodomChecks ? Object.values(req.hodomChecks).filter(Boolean).length : 0;
          const total = req.hodomChecks ? Object.keys(req.hodomChecks).length : 12;

          return (
            <div key={req.id} className="glass-panel" style={{ padding: '24px', marginBottom: '16px', border: wait.isCritical ? '1px solid #ef4444' : '1px solid var(--border-light)', boxShadow: wait.isCritical ? '0 0 12px rgba(239,68,68,0.2)' : 'var(--shadow-drop)' }}>
              {/* Patient header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="avatar" style={{ background: 'var(--panel-bg)', color: 'var(--status-available)', border: '1px solid var(--status-available)', width: '40px', height: '40px' }}>
                      <User size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{req.patientName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        RUT: {req.rut || '—'} · {req.edad || '—'} años · {req.sexo || '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div><strong>Cama:</strong> Hab {req.roomId} — Cama {req.bedId}</div>
                    <div><strong>Diagnóstico:</strong> {Array.isArray(req.diagnostico) ? req.diagnostico.join(', ') : (req.diagnostico || '—')}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: wait.isCritical ? '#ef4444' : 'var(--text-primary)', fontWeight: 700 }}>
                    <Clock size={15} />
                    {wait.text} de espera
                    {wait.isCritical && <span style={{ fontSize: '0.65rem', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>DEMORADO</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(userRole === 'admin' || userRole === 'hodom') ? (
                      <>
                        <button
                          className="glass-button primary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--panel-bg)', borderColor: 'var(--status-available)', color: 'var(--status-available)' }}
                          onClick={() => onMarkDone(req.id)}
                        >
                          ✓ Paciente Ingresado
                        </button>
                        {userRole === 'admin' && (
                          <button
                            className="glass-button"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#ef4444' }}
                            onClick={() => onDelete(req.id)}
                          >
                            Eliminar
                          </button>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Solo lectura (HODOM)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                {[
                  { label: 'Previsión', value: req.prevision },
                  { label: 'Dirección', value: req.direccion },
                  { label: 'Profesional solicitante', value: req.profesionalRequiere },
                  { label: 'Solicitado', value: req.fecha ? `${req.fecha} ${req.hora}` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'var(--inset-bg)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>{label}</div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 500 }}>{value || '—'}</div>
                  </div>
                ))}
              </div>

              {/* Requirements progress */}
              <div style={{ background: 'var(--inset-bg)', border: '1px solid var(--status-available)', borderRadius: '10px', padding: '12px 16px', boxShadow: 'var(--shadow-inset)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#22c55e' }}>Requisitos HODOM verificados</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#22c55e' }}>{cumplidos}/{total}</span>
                </div>
                <div style={{ height: '6px', background: 'var(--panel-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(cumplidos / total) * 100}%`, background: 'linear-gradient(90deg,#22c55e,#4ade80)', transition: 'width 0.3s ease' }} />
                </div>
                {req.hodomObservaciones && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    <strong>Obs.:</strong> {req.hodomObservaciones}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          70% { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}} />
    </div>
  );
}
