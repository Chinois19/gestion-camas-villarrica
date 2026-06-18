import React, { useState } from 'react';
import { Layers, Plus, Edit2, Trash2, Home, Map, MapPin, Bed, Save, X, Settings, Check } from 'lucide-react';

export default function InfrastructureManagement({ bedsData, setBedsData }) {
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedWing, setSelectedWing] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [isAddingFloor, setIsAddingFloor] = useState(false);
  const [newFloorName, setNewFloorName] = useState('');

  const [isAddingWing, setIsAddingWing] = useState(false);
  const [newWingName, setNewWingName] = useState('');

  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');

  const [isAddingBed, setIsAddingBed] = useState(false);
  const [editingBed, setEditingBed] = useState(null);

  const bedTypes = ['UCI', 'UTI', 'Cuidados Medios', 'Cuidados Básicos', 'GINE/PUERPERIO', 'Neonatología', 'Infantil'];

  // --- Actions ---

  const handleAddFloor = (e) => {
    e.preventDefault();
    if (!newFloorName.trim()) return;
    const floorKey = newFloorName.trim().toLowerCase().replace(/\s+/g, '');
    if (bedsData[floorKey]) {
      alert('El piso ya existe');
      return;
    }
    const updated = JSON.parse(JSON.stringify(bedsData));
    updated[floorKey] = {};
    setBedsData(updated);
    setNewFloorName('');
    setIsAddingFloor(false);
    setSelectedFloor(floorKey);
    setSelectedWing(null);
    setSelectedRoom(null);
  };

  const handleAddWing = (e) => {
    e.preventDefault();
    if (!newWingName.trim() || !selectedFloor) return;
    const wingKey = newWingName.trim().toLowerCase();
    if (bedsData[selectedFloor][wingKey]) {
      alert('El ala ya existe en este piso');
      return;
    }
    const updated = JSON.parse(JSON.stringify(bedsData));
    updated[selectedFloor][wingKey] = [];
    setBedsData(updated);
    setNewWingName('');
    setIsAddingWing(false);
    setSelectedWing(wingKey);
    setSelectedRoom(null);
  };

  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!newRoomId.trim() || !selectedFloor || !selectedWing) return;
    const roomExists = bedsData[selectedFloor][selectedWing].some(r => r.roomId === newRoomId.trim());
    if (roomExists) {
      alert('La habitación ya existe en esta ala');
      return;
    }
    const updated = JSON.parse(JSON.stringify(bedsData));
    updated[selectedFloor][selectedWing].push({
      roomId: newRoomId.trim(),
      roomType: selectedWing.charAt(0).toUpperCase() + selectedWing.slice(1),
      beds: []
    });
    setBedsData(updated);
    setNewRoomId('');
    setIsAddingRoom(false);
    setSelectedRoom(updated[selectedFloor][selectedWing][updated[selectedFloor][selectedWing].length - 1]);
  };

  const handleSaveBed = (e) => {
    e.preventDefault();
    if (!selectedFloor || !selectedWing || !selectedRoom) return;

    const updated = JSON.parse(JSON.stringify(bedsData));
    const wingData = updated[selectedFloor][selectedWing];
    const roomIndex = wingData.findIndex(r => r.roomId === selectedRoom.roomId);

    if (isAddingBed) {
      const newBed = {
        id: editingBed.id,
        type: editingBed.type,
        tag: editingBed.type,
        status: 'available',
        patient: null,
        info: null
      };
      wingData[roomIndex].beds.push(newBed);
    } else {
      const bedIndex = wingData[roomIndex].beds.findIndex(b => b.id === editingBed.id);
      wingData[roomIndex].beds[bedIndex] = {
        ...wingData[roomIndex].beds[bedIndex],
        id: editingBed.id,
        type: editingBed.type,
        tag: editingBed.type
      };
    }

    setBedsData(updated);
    setSelectedRoom(wingData[roomIndex]); // refresh
    setEditingBed(null);
    setIsAddingBed(false);
  };

  // Helper: cuenta pacientes activos en una estructura dada
  const countPatientsInFloor = (floorKey) => {
    let count = 0;
    const floorData = bedsData[floorKey];
    if (!floorData) return 0;
    Object.values(floorData).forEach(rooms => {
      if (!Array.isArray(rooms)) return;
      rooms.forEach(room => {
        (room.beds || []).forEach(bed => {
          if (bed.status === 'occupied' && bed.patient) count++;
        });
      });
    });
    return count;
  };

  const countPatientsInWing = (floorKey, wingKey) => {
    let count = 0;
    const rooms = bedsData[floorKey]?.[wingKey];
    if (!Array.isArray(rooms)) return 0;
    rooms.forEach(room => {
      (room.beds || []).forEach(bed => {
        if (bed.status === 'occupied' && bed.patient) count++;
      });
    });
    return count;
  };

  const countPatientsInRoom = (room) => {
    if (!room?.beds) return 0;
    return room.beds.filter(b => b.status === 'occupied' && b.patient).length;
  };

  const handleDeleteFloor = (floorKey) => {
    const patientCount = countPatientsInFloor(floorKey);
    if (patientCount > 0) {
      alert(`⛔ No se puede eliminar "${floorKey}": tiene ${patientCount} paciente(s) activo(s).\n\nPrimero debe dar de alta a todos los pacientes de este piso.`);
      return;
    }
    if (!window.confirm('¿Eliminar piso completo? (Sin pacientes activos)')) return;
    const updated = JSON.parse(JSON.stringify(bedsData));
    delete updated[floorKey];
    setBedsData(updated);
    if (selectedFloor === floorKey) {
      setSelectedFloor(null);
      setSelectedWing(null);
      setSelectedRoom(null);
    }
  };

  const handleDeleteWing = (wingKey) => {
    const patientCount = countPatientsInWing(selectedFloor, wingKey);
    if (patientCount > 0) {
      alert(`⛔ No se puede eliminar el ala "${wingKey}": tiene ${patientCount} paciente(s) activo(s).\n\nPrimero debe dar de alta a todos los pacientes de esta ala.`);
      return;
    }
    if (!window.confirm('¿Eliminar ala completa? (Sin pacientes activos)')) return;
    const updated = JSON.parse(JSON.stringify(bedsData));
    delete updated[selectedFloor][wingKey];
    setBedsData(updated);
    if (selectedWing === wingKey) {
      setSelectedWing(null);
      setSelectedRoom(null);
    }
  };

  const handleDeleteRoom = (roomId) => {
    const room = bedsData[selectedFloor]?.[selectedWing]?.find(r => r.roomId === roomId);
    const patientCount = room ? countPatientsInRoom(room) : 0;
    if (patientCount > 0) {
      alert(`⛔ No se puede eliminar la habitación ${roomId}: tiene ${patientCount} paciente(s) activo(s).\n\nPrimero debe dar de alta a todos los pacientes de esta habitación.`);
      return;
    }
    if (!window.confirm(`¿Eliminar habitación ${roomId}? (Sin pacientes activos)`)) return;
    const updated = JSON.parse(JSON.stringify(bedsData));
    updated[selectedFloor][selectedWing] = updated[selectedFloor][selectedWing].filter(r => r.roomId !== roomId);
    setBedsData(updated);
    if (selectedRoom?.roomId === roomId) {
      setSelectedRoom(null);
    }
  };

  const handleDeleteBed = (bedId) => {
    const room = bedsData[selectedFloor]?.[selectedWing]?.find(r => r.roomId === selectedRoom.roomId);
    const bed = room?.beds?.find(b => b.id === bedId);
    if (bed && bed.status === 'occupied' && bed.patient) {
      alert(`⛔ No se puede eliminar la cama ${bedId}: está ocupada por "${bed.patient}".\n\nPrimero debe dar de alta al paciente.`);
      return;
    }
    if (!window.confirm(`¿Eliminar cama ${bedId}? (Sin paciente activo)`)) return;
    const updated = JSON.parse(JSON.stringify(bedsData));
    const roomIndex = updated[selectedFloor][selectedWing].findIndex(r => r.roomId === selectedRoom.roomId);
    updated[selectedFloor][selectedWing][roomIndex].beds = updated[selectedFloor][selectedWing][roomIndex].beds.filter(b => b.id !== bedId);
    setBedsData(updated);
    setSelectedRoom(updated[selectedFloor][selectedWing][roomIndex]);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="avatar" style={{ background: 'var(--panel-bg)', color: 'var(--accent-color)', border: '1px solid var(--accent-color)' }}>
            <Settings size={24} />
          </div>
          <div>
            <h2 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Infraestructura y Planta Física</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Configuración jerárquica de camas, salas, alas y pisos del establecimiento</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px' }}>
        {/* Nivel 1: Pisos */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Home size={16} /> Pisos</h3>
            <button className="glass-button" style={{ padding: '4px', fontSize: '0.7rem' }} onClick={() => setIsAddingFloor(!isAddingFloor)}>
              <Plus size={14} />
            </button>
          </div>
          {isAddingFloor && (
            <form onSubmit={handleAddFloor} style={{ display: 'flex', gap: '8px' }}>
              <input 
                className="glass-input" 
                autoFocus
                placeholder="Ej. Piso 5" 
                value={newFloorName} 
                onChange={e => setNewFloorName(e.target.value)} 
                style={{ flex: 1, padding: '6px' }} 
              />
              <button type="submit" className="glass-button primary" style={{ padding: '6px 10px' }}><Check size={14} /></button>
            </form>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            {Object.keys(bedsData).map(floor => (
              <div 
                key={floor} 
                className={`glass-panel ${selectedFloor === floor ? 'primary' : ''}`} 
                style={{ padding: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: selectedFloor === floor ? 'var(--glass-highlight)' : '' }}
                onClick={() => { setSelectedFloor(floor); setSelectedWing(null); setSelectedRoom(null); }}
              >
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{floor}</span>
                {selectedFloor === floor && (
                  <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteFloor(floor); }} style={{ padding: '4px' }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Nivel 2: Alas */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', opacity: selectedFloor ? 1 : 0.4 }}><Map size={16} /> Alas / Sectores</h3>
            {selectedFloor && (
              <button className="glass-button" style={{ padding: '4px', fontSize: '0.7rem' }} onClick={() => setIsAddingWing(!isAddingWing)}>
                <Plus size={14} />
              </button>
            )}
          </div>
          {!selectedFloor ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', marginTop: '40px' }}>Seleccione un Piso</div>
          ) : (
            <>
              {isAddingWing && (
                <form onSubmit={handleAddWing} style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    className="glass-input" 
                    autoFocus
                    placeholder="Ej. Norte" 
                    value={newWingName} 
                    onChange={e => setNewWingName(e.target.value)} 
                    style={{ flex: 1, padding: '6px' }} 
                  />
                  <button type="submit" className="glass-button primary" style={{ padding: '6px 10px' }}><Check size={14} /></button>
                </form>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                {Object.keys(bedsData[selectedFloor]).map(wing => (
                  <div 
                    key={wing} 
                    className={`glass-panel ${selectedWing === wing ? 'primary' : ''}`} 
                    style={{ padding: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: selectedWing === wing ? 'var(--glass-highlight)' : '' }}
                    onClick={() => { setSelectedWing(wing); setSelectedRoom(null); }}
                  >
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{wing}</span>
                    {selectedWing === wing && (
                      <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteWing(wing); }} style={{ padding: '4px' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Nivel 3: Piezas */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', opacity: selectedWing ? 1 : 0.4 }}><MapPin size={16} /> Piezas</h3>
            {selectedWing && (
              <button className="glass-button" style={{ padding: '4px', fontSize: '0.7rem' }} onClick={() => setIsAddingRoom(!isAddingRoom)}>
                <Plus size={14} />
              </button>
            )}
          </div>
          {!selectedWing ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', marginTop: '40px' }}>Seleccione un Ala</div>
          ) : (
            <>
              {isAddingRoom && (
                <form onSubmit={handleAddRoom} style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    className="glass-input" 
                    autoFocus
                    placeholder="ID Ej. 501" 
                    value={newRoomId} 
                    onChange={e => setNewRoomId(e.target.value)} 
                    style={{ flex: 1, padding: '6px' }} 
                  />
                  <button type="submit" className="glass-button primary" style={{ padding: '6px 10px' }}><Check size={14} /></button>
                </form>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                {(bedsData[selectedFloor]?.[selectedWing] || []).map(room => (
                  <div 
                    key={room.roomId} 
                    className={`glass-panel ${selectedRoom?.roomId === room.roomId ? 'primary' : ''}`} 
                    style={{ padding: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: selectedRoom?.roomId === room.roomId ? 'var(--glass-highlight)' : '' }}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <span style={{ fontWeight: 600 }}>Hab {room.roomId}</span>
                    {selectedRoom?.roomId === room.roomId && (
                      <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.roomId); }} style={{ padding: '4px' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Nivel 4: Camas */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', opacity: selectedRoom ? 1 : 0.4 }}><Bed size={16} /> Camas</h3>
            {selectedRoom && (
              <button className="glass-button" style={{ padding: '4px', fontSize: '0.7rem' }} onClick={() => { setIsAddingBed(true); setEditingBed({ id: '', type: 'Cuidados Medios' }); }}>
                <Plus size={14} />
              </button>
            )}
          </div>
          {!selectedRoom ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', marginTop: '40px' }}>Seleccione una Pieza</div>
          ) : (
            <>
              {editingBed && (
                <form onSubmit={handleSaveBed} className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--inset-bg)' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID Cama</label>
                    <input 
                      className="glass-input" 
                      autoFocus
                      required
                      value={editingBed.id} 
                      onChange={e => setEditingBed({...editingBed, id: e.target.value})} 
                      style={{ padding: '6px', marginTop: '4px' }} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tipo de Cama / Servicio</label>
                    <select 
                      className="glass-input" 
                      value={editingBed.type} 
                      onChange={e => setEditingBed({...editingBed, type: e.target.value})} 
                      style={{ padding: '6px', marginTop: '4px' }}
                    >
                      {bedTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button type="button" className="glass-button" style={{ flex: 1, padding: '6px' }} onClick={() => { setEditingBed(null); setIsAddingBed(false); }}>Cancelar</button>
                    <button type="submit" className="glass-button primary" style={{ flex: 1, padding: '6px' }}>Guardar</button>
                  </div>
                </form>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                {selectedRoom.beds.map(bed => (
                  <div key={bed.id} className="glass-panel" style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Cama {bed.id}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{bed.type}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="action-btn" onClick={() => { setIsAddingBed(false); setEditingBed(bed); }} style={{ padding: '4px' }} title="Editar atributos">
                        <Edit2 size={14} />
                      </button>
                      <button className="action-btn delete" onClick={() => handleDeleteBed(bed.id)} style={{ padding: '4px' }} title="Eliminar cama">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
