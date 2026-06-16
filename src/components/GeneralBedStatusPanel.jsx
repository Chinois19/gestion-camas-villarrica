import React from 'react';
import { Bed } from 'lucide-react';
import './GeneralBedStatusPanel.css';

export default function GeneralBedStatusPanel({ bedsData }) {
  
  const getBedColorClass = (status) => {
    switch(status) {
      case 'occupied': return 'occupied-color';
      case 'cleaning': return 'cleaning-color';
      case 'available': return 'available-color';
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
      <div className="general-status-header glass-panel">
        <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Resumen Hospital</h2>
        <div className="status-legend">
          <div className="legend-item">
            <span className="legend-color occupied-color"></span>
            <span>Ocupada "Amarillo"</span>
          </div>
          <div className="legend-item">
            <span className="legend-color cleaning-color"></span>
            <span>En Aseo "Rojo"</span>
          </div>
          <div className="legend-item">
            <span className="legend-color available-color"></span>
            <span>Disponible "Verde"</span>
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

              return (
                <div key={floorKey} className="floor-row">
                  <div className="floor-title-container">
                    <h3 className="floor-title">{getFloorName(floorKey)}</h3>
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
                                        title={`Cama ${bed.id} - ${bed.status === 'occupied' ? 'Ocupada' : bed.status === 'cleaning' ? 'En Aseo' : 'Disponible'}`}
                                      >
                                        <Bed size={20} color="rgba(255,255,255,0.9)" className="bed-vector" />
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
