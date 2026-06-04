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
    if (!isoString) return { text: '—', totalMinutes: 0 };
    const diff = now - new Date(isoString);
    if (diff < 0) return { text: '0m', totalMinutes: 0 };
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    parts.push(`${minutes % 60}m`);
    return { text: parts.join(' '), totalMinutes: minutes };
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
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flexShrink: 0, background: 'var(--inset-bg)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: 'var(--shadow-inset)', minWidth: '150px' }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f59e0b' }}>{pending.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pendientes</div>
          </div>
          <div style={{ flex: 1, background: 'var(--inset-bg)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', boxShadow: 'var(--shadow-inset)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', textAlign: 'center' }}>Desglose por Tiempo de Espera</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '8px' }}>
               {[
                 { label: '≤ 1 hora', count: pending.filter(r => calculateWait(r.solicitadaAt).totalMinutes <= 60).length },
                 { label: '1 - 2 horas', count: pending.filter(r => { const m = calculateWait(r.solicitadaAt).totalMinutes; return m > 60 && m <= 120; }).length },
                 { label: '2 - 3 horas', count: pending.filter(r => { const m = calculateWait(r.solicitadaAt).totalMinutes; return m > 120 && m <= 180; }).length },
                 { label: '3 - 4 horas', count: pending.filter(r => { const m = calculateWait(r.solicitadaAt).totalMinutes; return m > 180 && m <= 240; }).length },
                 { label: '4 - 5 horas', count: pending.filter(r => { const m = calculateWait(r.solicitadaAt).totalMinutes; return m > 240 && m <= 300; }).length },
                 { label: '5 - 6 horas', count: pending.filter(r => { const m = calculateWait(r.solicitadaAt).totalMinutes; return m > 300 && m <= 360; }).length },
                 { label: '6+ horas', count: pending.filter(r => calculateWait(r.solicitadaAt).totalMinutes > 360).length }
               ].map(({ label, count }) => (
                 <div key={label} style={{ background: 'var(--panel-bg)', borderRadius: '8px', padding: '8px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                   <div style={{ fontSize: '1.2rem', fontWeight: 700, color: count > 0 ? '#0ea5e9' : 'var(--text-secondary)' }}>{count}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{label}</div>
                 </div>
               ))}
            </div>
          </div>
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
            <div key={req.id} className="glass-panel" style={{ padding: '24px', marginBottom: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-drop)' }}>
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
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Tiempo en espera</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0ea5e9', fontWeight: 800, fontSize: '1.4rem', background: 'rgba(14, 165, 233, 0.1)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                      <Clock size={18} />
                      {wait.text}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(userRole === 'superadmin' || userRole === 'medico_hodom' || userRole === 'gestor_camas') && userRole !== 'visor' ? (
                      <>
                        <button
                          className="glass-button primary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--panel-bg)', borderColor: 'var(--status-available)', color: 'var(--status-available)' }}
                          onClick={() => onMarkDone(req.id)}
                        >
                          ✓ Confirmación de Ingreso a HODOM
                        </button>
                        {userRole === 'superadmin' && (
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
                        Solo lectura
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
