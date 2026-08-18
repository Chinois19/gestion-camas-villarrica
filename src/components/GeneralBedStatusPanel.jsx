import React, { useMemo } from 'react';
import { Bed, Ban } from 'lucide-react';
import './GeneralBedStatusPanel.css';

export default function GeneralBedStatusPanel({ bedsData }) {
  
  const counts = useMemo(() => {
    let occupied = 0;
    let cleaning = 0;
    let available = 0;
    let blocked = 0;
    let totalHabilitadas = 0;

    if (bedsData) {
      Object.keys(bedsData).forEach(floor => {
        Object.keys(bedsData[floor] || {}).forEach(sector => {
          (bedsData[floor][sector] || []).forEach(room => {
            (room.beds || []).forEach(bed => {
              totalHabilitadas++;
              if (bed.status === 'occupied' || bed.status === 'pending_hodom') occupied++;
              else if (bed.status === 'cleaning') cleaning++;
              else if (bed.status === 'blocked' || bed.status === 'inhabilitada') blocked++;
              else available++;
            });
          });
        });
      });
    }

    return { occupied, cleaning, available, blocked, totalHabilitadas };
  }, [bedsData]);

  const getBedColorClass = (status) => {
    switch(status) {
      case 'occupied': return 'occupied-color';
      case 'cleaning': return 'cleaning-color';
      case 'available': return 'available-color';
      case 'blocked': return 'blocked-color';
      case 'inhabilitada': return 'blocked-color';
      default: return ''; 
    }
  };

  const getFloorName = (floorKey) => {
    if (floorKey === 'piso4') return 'Piso 4';
    if (floorKey === 'piso3') return 'Piso 3';
    if (floorKey === 'piso2') return 'Piso 2';
    return floorKey;
  };

  const floorsOrder = ['piso4', 'piso3', 'piso2'];
  const sectorsOrder = ['poniente', 'oriente'];

  return (
    <div className="general-status-panel animate-fade-in">
      <div className="general-status-header glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '8px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 className="text-gradient" style={{ fontSize: '1.3rem', margin: 0, fontWeight: 800 }}>Resumen Hospital</h2>
          <span style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8', padding: '3px 10px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 800 }}>
            {counts.totalHabilitadas} / 125 Camas en App
          </span>
        </div>

        <div className="status-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <div className="legend-item" style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.4)', padding: '3px 10px', borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', color: '#eab308' }}>
            <span className="legend-color occupied-color"></span>
            <span>Ocupadas: <strong>{counts.occupied}</strong></span>
          </div>
          <div className="legend-item" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '3px 10px', borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', color: '#ef4444' }}>
            <span className="legend-color cleaning-color"></span>
            <span>En Aseo: <strong>{counts.cleaning}</strong></span>
          </div>
          <div className="legend-item" style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', padding: '3px 10px', borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', color: '#22c55e' }}>
            <span className="legend-color available-color"></span>
            <span>Disponibles: <strong>{counts.available}</strong></span>
          </div>
          <div className="legend-item" style={{ background: 'rgba(148, 163, 184, 0.15)', border: '1px solid rgba(148, 163, 184, 0.4)', padding: '3px 10px', borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', color: '#94a3b8' }}>
            <span className="legend-color blocked-color"></span>
            <span>Bloqueadas: <strong>{counts.blocked}</strong></span>
          </div>
        </div>
      </div>

      <div className="general-status-content glass-panel">
        {!bedsData ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', width: '100%', padding: '2rem' }}>
            No hay datos de camas disponibles.
          </div>
        ) : (
          <div className="floors-container">
            {floorsOrder.map(floorKey => {
              const floorData = bedsData[floorKey];
              if (!floorData) return null;

              // Check if floor has any rooms at all
              const hasRooms = sectorsOrder.some(s => floorData[s] && floorData[s].length > 0);
              if (!hasRooms) return null;

              // Calculate floor level stats
              let fTotal = 0, fOccupied = 0, fAvailable = 0, fCleaning = 0, fBlocked = 0;
              sectorsOrder.forEach(s => {
                (floorData[s] || []).forEach(r => {
                  (r.beds || []).forEach(b => {
                    fTotal++;
                    if (b.status === 'occupied' || b.status === 'pending_hodom') fOccupied++;
                    else if (b.status === 'cleaning') fCleaning++;
                    else if (b.status === 'blocked' || b.status === 'inhabilitada') fBlocked++;
                    else fAvailable++;
                  });
                });
              });

              return (
                <div key={floorKey} className="floor-row">
                  <div className="floor-title-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="floor-title">{getFloorName(floorKey)}</h3>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', fontWeight: 700 }}>
                      <span style={{ color: '#eab308' }}>🔴 {fOccupied} Ocupadas</span>
                      <span style={{ color: '#22c55e' }}>🟢 {fAvailable} Disp.</span>
                      {fCleaning > 0 && <span style={{ color: '#ef4444' }}>🟡 {fCleaning} Aseo</span>}
                      {fBlocked > 0 && <span style={{ color: '#94a3b8' }}>🔘 {fBlocked} Bloq.</span>}
                      <span style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>({fTotal} Camas)</span>
                    </div>
                  </div>
                  
                  <div className="sectors-wrapper">
                    {sectorsOrder.map(sectorKey => {
                      const rooms = floorData[sectorKey] || [];
                      if (rooms.length === 0) return null;

                      // Sort rooms by id
                      const sortedRooms = [...rooms].sort((a, b) => parseInt(a.roomId || 0) - parseInt(b.roomId || 0));

                      return (
                        <div key={sectorKey} className={`sector-block sector-${sectorKey}`}>
                          <div className="sector-header">
                            <h4 className="sector-title">{sectorKey === 'poniente' ? 'Sector Poniente' : 'Sector Oriente'}</h4>
                          </div>
                          <div className="rooms-grid">
                            {sortedRooms.map((room) => (
                              <div key={room.roomId} className="room-block">
                                <h3 className="room-title">{room.roomId}</h3>
                                <div className="beds-container">
                                  {room.beds.map((bed) => (
                                    <div className="bed-wrapper" key={bed.id}>
                                      <div className="bed-number-label">{bed.id}</div>
                                      <div 
                                        className={`bed-square ${getBedColorClass(bed.status)}`}
                                        title={`Cama ${bed.id} - ${bed.status === 'occupied' ? 'Ocupada' : bed.status === 'cleaning' ? 'En Aseo' : bed.status === 'blocked' || bed.status === 'inhabilitada' ? 'Bloqueada' : 'Disponible'}`}
                                      >
                                        <Bed size={20} color="rgba(255,255,255,0.9)" className="bed-vector" />
                                        {(bed.status === 'blocked' || bed.status === 'inhabilitada') && (
                                          <Ban size={20} color="#ef4444" className="blocked-vector-overlay" />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
