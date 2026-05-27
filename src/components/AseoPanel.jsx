import { useState, useEffect } from 'react';
import { Sparkles, Clock, Search, CheckCircle, MapPin, User } from 'lucide-react';

export default function AseoPanel({ bedsData, onFinishCleaning, userRole }) {
  const [now, setNow] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  // Tick every minute so wait times auto-update
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const calcWait = (isoString) => {
    if (!isoString) return { text: '—', totalMinutes: 0, isCritical: false };
    const diff = now - new Date(isoString);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    parts.push(`${minutes % 60}m`);
    return { text: parts.join(' '), totalMinutes: minutes, isCritical: minutes > 60 };
  };

  // Collect all beds in cleaning state with their location
  const cleaningBeds = [];
  Object.keys(bedsData).forEach(floor => {
    Object.keys(bedsData[floor]).forEach(sector => {
      bedsData[floor][sector].forEach(room => {
        room.beds.forEach(bed => {
          if (bed.status === 'cleaning') {
            cleaningBeds.push({
              ...bed,
              roomId: room.roomId,
              roomType: room.roomType,
              floor: floor.replace('piso', 'Piso '),
              sector: sector.charAt(0).toUpperCase() + sector.slice(1),
            });
          }
        });
      });
    });
  });

  // Sort oldest first (by cleaningAt timestamp if available, else include all)
  cleaningBeds.sort((a, b) => {
    const tA = a.cleaningAt ? new Date(a.cleaningAt) : new Date(0);
    const tB = b.cleaningAt ? new Date(b.cleaningAt) : new Date(0);
    return tA - tB;
  });

  const filtered = cleaningBeds.filter(b =>
    `${b.roomId} ${b.id} ${b.roomType} ${b.floor}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar" style={{ background: 'var(--panel-bg)', color: '#f59e0b', border: '1px solid #f59e0b' }}>
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-gradient" style={{ background: 'linear-gradient(135deg,#f59e0b,#fde68a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.5rem', fontWeight: 700 }}>
                Panel de Aseo — Camas Pendientes
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {filtered.length} cama{filtered.length !== 1 ? 's' : ''} en aseo · Ordenadas de la más atrasada a la más reciente
              </p>
            </div>
          </div>
          <div className="search-container" style={{ margin: 0, maxWidth: '260px' }}>
            <Search size={16} color="var(--text-secondary)" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por habitación..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { label: 'En Aseo',    value: cleaningBeds.length,                                                color: '#f59e0b' },
            { label: 'Atrasadas',  value: cleaningBeds.filter(b => calcWait(b.cleaningAt).isCritical).length, color: '#ef4444' },
            { label: 'A tiempo',   value: cleaningBeds.filter(b => !calcWait(b.cleaningAt).isCritical).length,color: '#22c55e' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--inset-bg)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', textAlign: 'center', boxShadow: 'var(--shadow-inset)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Sparkles size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <p>No hay camas en proceso de aseo 🎉</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filtered.map(bed => {
            const wait = calcWait(bed.cleaningAt);
            return (
              <div
                key={`${bed.roomId}-${bed.id}`}
                className="glass-panel"
                style={{
                  padding: '24px',
                  border: wait.isCritical ? '1px solid #ef4444' : '1px solid var(--border-light)',
                  boxShadow: wait.isCritical ? '0 0 12px rgba(239,68,68,0.2)' : 'var(--shadow-drop)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Glow effect for critical */}
                {wait.isCritical && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #ef4444, transparent)', opacity: 0.6 }} />
                )}

                {/* Room info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="avatar" style={{ background: 'var(--panel-bg)', color: '#0ea5e9', border: '1px solid #0ea5e9', width: '40px', height: '40px' }}>
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Hab {bed.roomId} — Cama {bed.id}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={12} /> {bed.floor} · {bed.sector} · {bed.tag || bed.type}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: wait.isCritical ? '#ef4444' : 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                      <Clock size={15} />
                      {wait.text}
                    </div>
                    {wait.isCritical && (
                      <span style={{ fontSize: '0.65rem', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, marginTop: '3px', display: 'inline-block' }}>
                        ¡ATRASADO!
                      </span>
                    )}
                  </div>
                </div>

                {/* Discharge info */}
                {bed.lastDischarge && (
                  <div style={{ background: 'var(--inset-bg)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.8rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-inset)' }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                      <User size={14} style={{ color: 'var(--text-secondary)' }} />
                      <strong style={{ color: 'var(--text-primary)' }}>{bed.lastDischarge.patientName}</strong>
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>Destino: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{bed.lastDischarge.destino}</span></div>
                    {bed.lastDischarge.observaciones && (
                      <div style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>Obs: {bed.lastDischarge.observaciones}</div>
                    )}
                  </div>
                )}

                {/* Action */}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                  {userRole !== 'visor' ? (
                    <button
                      className="glass-button primary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'var(--panel-bg)', borderColor: '#22c55e', color: '#22c55e' }}
                      onClick={() => onFinishCleaning(bed.roomId, bed.id)}
                    >
                      <CheckCircle size={16} /> Finalizar Aseo
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px 0' }}>
                      Solo lectura
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
