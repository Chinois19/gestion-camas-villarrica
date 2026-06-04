import { useState, useEffect } from 'react';
import { Sparkles, Clock, Search, CheckCircle, MapPin, User } from 'lucide-react';

export default function AseoPanel({ bedsData, onFinishCleaning, userRole }) {
  const [now, setNow] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState(null);

  // Tick every minute so wait times auto-update
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const calcWait = (isoString) => {
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

  const filtered = cleaningBeds.filter(b => {
    const matchesSearch = `${b.roomId} ${b.id} ${b.roomType} ${b.floor}`.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    if (timeFilter) {
      const mins = calcWait(b.cleaningAt).totalMinutes;
      if (timeFilter === '≤ 1 hora') return mins <= 60;
      if (timeFilter === '1 - 2 horas') return mins > 60 && mins <= 120;
      if (timeFilter === '2 - 3 horas') return mins > 120 && mins <= 180;
      if (timeFilter === '3 - 4 horas') return mins > 180 && mins <= 240;
      if (timeFilter === '4 - 5 horas') return mins > 240 && mins <= 300;
      if (timeFilter === '5 - 6 horas') return mins > 300 && mins <= 360;
      if (timeFilter === '6+ horas') return mins > 360;
    }
    return true;
  });

  const breakdownData = [
    { label: '≤ 1 hora', count: cleaningBeds.filter(b => calcWait(b.cleaningAt).totalMinutes <= 60).length },
    { label: '1 - 2 horas', count: cleaningBeds.filter(b => { const m = calcWait(b.cleaningAt).totalMinutes; return m > 60 && m <= 120; }).length },
    { label: '2 - 3 horas', count: cleaningBeds.filter(b => { const m = calcWait(b.cleaningAt).totalMinutes; return m > 120 && m <= 180; }).length },
    { label: '3 - 4 horas', count: cleaningBeds.filter(b => { const m = calcWait(b.cleaningAt).totalMinutes; return m > 180 && m <= 240; }).length },
    { label: '4 - 5 horas', count: cleaningBeds.filter(b => { const m = calcWait(b.cleaningAt).totalMinutes; return m > 240 && m <= 300; }).length },
    { label: '5 - 6 horas', count: cleaningBeds.filter(b => { const m = calcWait(b.cleaningAt).totalMinutes; return m > 300 && m <= 360; }).length },
    { label: '6+ horas', count: cleaningBeds.filter(b => calcWait(b.cleaningAt).totalMinutes > 360).length }
  ];

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
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div 
            onClick={() => setTimeFilter(null)}
            style={{ flexShrink: 0, background: !timeFilter ? 'var(--panel-bg)' : 'var(--inset-bg)', border: !timeFilter ? '2px solid #f59e0b' : '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', textAlign: 'center', minWidth: '150px', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{cleaningBeds.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>PENDIENTES</div>
          </div>
          <div style={{ flex: 1, background: 'var(--inset-bg)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', textAlign: 'center', fontWeight: 600 }}>Desglose por Tiempo de Espera</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '10px' }}>
               {breakdownData.map(({ label, count }) => {
                 const isSelected = timeFilter === label;
                 return (
                   <button 
                     key={label} 
                     onClick={() => setTimeFilter(isSelected ? null : label)}
                     style={{ 
                       background: isSelected ? 'rgba(14, 165, 233, 0.1)' : 'var(--panel-bg)', 
                       borderRadius: '8px', 
                       padding: '12px 8px', 
                       textAlign: 'center', 
                       border: isSelected ? '2px solid #0ea5e9' : '1px solid var(--border-light)',
                       cursor: 'pointer',
                       transition: 'all 0.2s ease',
                       outline: 'none'
                     }}>
                     <div style={{ fontSize: '1.4rem', fontWeight: 700, color: count > 0 ? (isSelected ? '#0ea5e9' : 'var(--text-primary)') : 'var(--text-secondary)', lineHeight: 1 }}>{count}</div>
                     <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '6px' }}>{label}</div>
                   </button>
                 );
               })}
            </div>
          </div>
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
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-drop)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >

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
                  
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Tiempo en espera</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0ea5e9', fontWeight: 800, fontSize: '1.4rem', background: 'rgba(14, 165, 233, 0.1)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                      <Clock size={18} />
                      {wait.text}
                    </div>
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
