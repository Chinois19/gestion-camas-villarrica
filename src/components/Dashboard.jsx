import { useState } from 'react';
import { Bed, User, LayoutDashboard, Map, Info, Layers, Search } from 'lucide-react';
import { DUMMY_DATA, getBedTypeClass, getIconColor } from '../data/dummy';

export default function Dashboard({ searchQuery }) {
  const [selectedFloor, setSelectedFloor] = useState('todos');
  const [selectedSector, setSelectedSector] = useState('todos');
  const [selectedServicio, setSelectedServicio] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  const formatFloor = (f) => f.replace('piso', 'Piso ');
  const formatSector = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const sectorsToRender = selectedSector === 'todos' ? ['poniente', 'oriente'] : [selectedSector];
  const floorsToRender = selectedFloor === 'todos' ? ['piso4', 'piso3', 'piso2'] : [selectedFloor];

  return (
    <div className="main-layout">
      {/* Sidebar Panel */}
      <aside className="sidebar">
        <div className="glass-panel sidebar-section">
          <h3 className="sidebar-title">Filtros de Dashboard</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <div className="sidebar-title" style={{ fontSize: '0.75rem', marginBottom: '12px', color: 'var(--accent-color)' }}>1. SELECCIÓN DE PISO</div>
            <div className="stack-group">
              <button 
                className={`stack-btn ${selectedFloor === 'todos' ? 'active' : ''}`}
                onClick={() => setSelectedFloor('todos')}
                style={{ background: selectedFloor === 'todos' ? 'var(--accent-color)' : 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)' }}
              >
                <Layers size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }}/> Todo el Hospital
              </button>
              <button 
                className={`stack-btn ${selectedFloor === 'piso4' ? 'active' : ''}`}
                onClick={() => setSelectedFloor('piso4')}
              >
                <Map size={18} /> Piso 4
              </button>
              <button 
                className={`stack-btn ${selectedFloor === 'piso3' ? 'active' : ''}`}
                onClick={() => setSelectedFloor('piso3')}
              >
                <Map size={18} /> Piso 3
              </button>
              <button 
                className={`stack-btn ${selectedFloor === 'piso2' ? 'active' : ''}`}
                onClick={() => setSelectedFloor('piso2')}
              >
                <Map size={18} /> Piso 2
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div className="sidebar-title" style={{ fontSize: '0.75rem', marginBottom: '12px', color: 'var(--accent-color)' }}>2. VISTA DE SECTORES</div>
            <div className="toggle-group" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', background: 'transparent', border: 'none', padding: 0 }}>
              <button 
                className={`toggle-btn ${selectedSector === 'todos' ? 'active' : ''}`}
                onClick={() => setSelectedSector('todos')}
                style={{ background: selectedSector === 'todos' ? 'var(--accent-color)' : 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)' }}
              >
                <Layers size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }}/> Mostrar Ambos
              </button>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  className={`toggle-btn ${selectedSector === 'poniente' ? 'active' : ''}`}
                  onClick={() => setSelectedSector('poniente')}
                  style={{ background: selectedSector === 'poniente' ? 'var(--accent-color)' : 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)' }}
                >
                  Poniente
                </button>
                <button 
                  className={`toggle-btn ${selectedSector === 'oriente' ? 'active' : ''}`}
                  onClick={() => setSelectedSector('oriente')}
                  style={{ background: selectedSector === 'oriente' ? 'var(--accent-color)' : 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)' }}
                >
                  Oriente
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div className="sidebar-title" style={{ fontSize: '0.75rem', marginBottom: '12px', color: 'var(--accent-color)' }}>3. SERVICIO CLÍNICO</div>
            <div className="stack-group">
              <button 
                className={`stack-btn ${selectedServicio === 'todos' ? 'active' : ''}`}
                onClick={() => setSelectedServicio('todos')}
              >
                Todos los Servicios
              </button>
              <button 
                className={`stack-btn ${selectedServicio === 'upc' ? 'active' : ''}`}
                onClick={() => setSelectedServicio('upc')}
              >
                <span className="legend-dot" style={{ background: '#00f0ff', margin: 0 }}></span> UPC (UCI/UTI)
              </button>
              <button 
                className={`stack-btn ${selectedServicio === 'maternidad' ? 'active' : ''}`}
                onClick={() => setSelectedServicio('maternidad')}
              >
                <span className="legend-dot" style={{ background: '#ec4899', margin: 0 }}></span> Maternidad
              </button>
              <button 
                className={`stack-btn ${selectedServicio === 'infantil' ? 'active' : ''}`}
                onClick={() => setSelectedServicio('infantil')}
              >
                <span className="legend-dot" style={{ background: '#a855f7', margin: 0 }}></span> Neonatología / Infantil
              </button>
              <button 
                className={`stack-btn ${selectedServicio === 'medios' ? 'active' : ''}`}
                onClick={() => setSelectedServicio('medios')}
              >
                <span className="legend-dot" style={{ background: '#f97316', margin: 0 }}></span> Cuidados Medios
              </button>
              <button 
                className={`stack-btn ${selectedServicio === 'basicos' ? 'active' : ''}`}
                onClick={() => setSelectedServicio('basicos')}
              >
                <span className="legend-dot" style={{ background: '#ef4444', margin: 0 }}></span> Cuidados Básicos
              </button>
            </div>
          </div>

          <div>
            <div className="sidebar-title" style={{ fontSize: '0.75rem', marginBottom: '12px', color: 'var(--accent-color)' }}>4. ESTADO DE CAMA</div>
            <div className="stack-group">
              <button 
                className={`stack-btn ${statusFilter === 'todos' ? 'active' : ''}`}
                onClick={() => setStatusFilter('todos')}
              >
                Ver Todas las Camas
              </button>
              <button 
                className={`stack-btn ${statusFilter === 'available' ? 'active' : ''}`}
                onClick={() => setStatusFilter('available')}
              >
                <span className="legend-dot" style={{ background: '#22c55e', margin: 0 }}></span> Solo Disponibles
              </button>
              <button 
                className={`stack-btn ${statusFilter === 'occupied' ? 'active' : ''}`}
                onClick={() => setStatusFilter('occupied')}
              >
                <span className="legend-dot" style={{ background: '#ef4444', margin: 0 }}></span> Solo Ocupadas
              </button>
              <button 
                className={`stack-btn ${statusFilter === 'cleaning' ? 'active' : ''}`}
                onClick={() => setStatusFilter('cleaning')}
              >
                <span className="legend-dot" style={{ background: '#f59e0b', margin: 0 }}></span> En Aseo
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main>
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LayoutDashboard size={24} className="icon-logo" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              Resumen <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>/ {selectedFloor === 'todos' ? 'Todo el Hospital' : formatFloor(selectedFloor)} {selectedSector !== 'todos' ? `- Ala ${formatSector(selectedSector)}` : ''}</span>
            </h2>
          </div>
          
          {(searchQuery || statusFilter !== 'todos') && (
            <span style={{ fontSize: '0.85rem', color: 'var(--accent-color)', background: 'rgba(0, 240, 255, 0.1)', padding: '4px 12px', borderRadius: '100px' }}>
              Filtros Activos
            </span>
          )}
        </div>

        {floorsToRender.map((floor) => {
          let hasRoomsInFloor = false;

          const floorContent = sectorsToRender.map((sector) => {
            const allRoomsInSector = DUMMY_DATA[floor]?.[sector] || [];
            
            const roomsWithFilteredBeds = allRoomsInSector.map(room => {
              const filteredBeds = room.beds.filter(bed => {
                if (statusFilter !== 'todos' && bed.status !== statusFilter) return false;
                
                if (selectedServicio !== 'todos') {
                  const target = (bed.tag || bed.type).toLowerCase();
                  let bedService = 'otras';
                  if (target.includes('uci') || target.includes('uti') || target === 'upc') bedService = 'upc';
                  else if (target.includes('maternidad')) bedService = 'maternidad';
                  else if (target.includes('neonatolog') || target.includes('infantil')) bedService = 'infantil';
                  else if (target.includes('cuidados medios') || target === 'medios') bedService = 'medios';
                  else if (target.includes('cuidados basicos') || target.includes('cuidados básicos')) bedService = 'basicos';

                  if (bedService !== selectedServicio) return false;
                }
                
                if (searchQuery.trim() !== '') {
                  const query = searchQuery.toLowerCase();
                  const patientMatch = bed.patient?.toLowerCase().includes(query) || false;
                  const infoMatch = bed.info?.toLowerCase().includes(query) || false;
                  const bedIdMatch = bed.id.includes(query);
                  const roomMatch = room.roomId.includes(query);
                  const typeMatch = bed.type.toLowerCase().includes(query);
                  
                  if (!patientMatch && !infoMatch && !bedIdMatch && !roomMatch && !typeMatch) {
                    return false;
                  }
                }
                return true;
              });
              
              return { ...room, beds: filteredBeds };
            }).filter(room => room.beds.length > 0);

            if (roomsWithFilteredBeds.length === 0) return null;

            hasRoomsInFloor = true;

            return (
              <div key={`${floor}-${sector}`} style={{ marginBottom: '40px' }}>
                {selectedSector === 'todos' && (
                  <h4 style={{ 
                    fontSize: '1.1rem', 
                    marginBottom: '16px', 
                    paddingLeft: '12px', 
                    borderLeft: '4px solid var(--glass-border)',
                    color: 'var(--text-secondary)'
                  }}>
                    Ala {formatSector(sector)}
                  </h4>
                )}

                {roomsWithFilteredBeds.map((room) => (
                  <div key={room.roomId} className="glass-panel room-container" style={{ marginBottom: '16px' }}>
                    <div className="room-header">
                      <div className="room-title">
                        Hab. {room.roomId}
                      </div>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {room.beds.length} {room.beds.length === 1 ? 'Cama coincide' : 'Camas coinciden'}
                      </span>
                    </div>

                    <div className="beds-grid">
                      {room.beds.map((bed) => {
                        const styleTarget = bed.tag || bed.type;
                        return (
                        <div key={bed.id} className={`glass-panel bed-card ${getBedTypeClass(styleTarget)}`}>
                          <div className="bed-header">
                            <div className="bed-number">
                              <Bed size={20} color={getIconColor(styleTarget)} />
                              Cama {bed.id}
                            </div>
                            <div className="bed-type-badge">{bed.tag || bed.type}</div>
                          </div>

                          {bed.status === 'occupied' ? (
                            <div className="patient-info">
                              <div className="avatar" style={{ width: '36px', height: '36px', minWidth: '36px' }}>
                                <User size={18} />
                              </div>
                              <div className="patient-details">
                                <span className="patient-name">{bed.patient}</span>
                                <span className="patient-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-occupied)' }}></span>
                                  Ocupada {bed.info ? `• ${bed.info}` : ''}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="patient-info" style={{ opacity: 0.6 }}>
                              <div className="avatar" style={{ width: '36px', height: '36px', minWidth: '36px', background: 'transparent' }}>
                                <Bed size={18} />
                              </div>
                              <div className="patient-details">
                                <span className="patient-name">Sin paciente</span>
                                <span className="patient-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: bed.status === 'available' ? 'var(--status-available)' : 'var(--status-cleaning)' }}></span>
                                  {bed.status === 'available' ? 'Disponible' : 'En Aseo'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          });

          if (!hasRoomsInFloor) return null;

          return (
            <div key={floor} style={{ marginBottom: '48px' }}>
              {selectedFloor === 'todos' && (
                <h3 style={{ 
                  fontSize: '1.4rem', 
                  marginBottom: '20px', 
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--glass-border)',
                  color: 'var(--accent-color)'
                }}>
                  {formatFloor(floor)}
                </h3>
              )}
              {floorContent}
            </div>
          );
        })}
        
        {/* Empty State */}
        {floorsToRender.every(floor => 
          sectorsToRender.every(sector => {
            const allRooms = DUMMY_DATA[floor]?.[sector] || [];
            return allRooms.every(r => r.beds.every(b => {
                if (statusFilter !== 'todos' && b.status !== statusFilter) return false;
                if (searchQuery.trim() !== '') {
                  const q = searchQuery.toLowerCase();
                  return b.patient?.toLowerCase().includes(q) || b.info?.toLowerCase().includes(q) || b.id.includes(q) || r.roomId.includes(q) || b.type.toLowerCase().includes(q);
                }
                return true;
            }) === false);
          })
        ) && (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Search size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No se encontraron camas que coincidan con la búsqueda o filtro actual.</p>
          </div>
        )}
      </main>
    </div>
  );
}
