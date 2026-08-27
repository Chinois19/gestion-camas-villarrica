import { useState } from 'react';
import { Bed, User, LayoutDashboard, Map, Info, Layers, Search, X, Activity, Pencil, LogOut, CheckCircle, Filter } from 'lucide-react';
import { DUMMY_DATA, getBedTypeClass, getIconColor, WAITING_LIST } from '../data/dummy';
import WaitingList from './WaitingList';
import AssignmentModal from './AssignmentModal';
import EditGrdModal from './EditGrdModal';
import PatientDetailModal from './PatientDetailModal';
import { DndContext, useDroppable } from '@dnd-kit/core';

const checkCompatibility = (bed, patient) => {
  if (!patient) return true;
  return bed.status === 'available';
};

const checkServiceMatch = (bed, patient) => {
  if (!patient) return true;
  const pType = patient.bedTypeRequired.toLowerCase();
  const bType = (bed.tag || bed.type).toLowerCase();
  if (pType.includes('uci') || pType.includes('uti') || pType === 'upc') return bType.includes('uci') || bType.includes('uti') || bType === 'upc';
  if (pType.includes('infantil') || pType.includes('neonatolog')) return bType.includes('infantil') || bType.includes('neonatolog');
  const adultServices = ['cuidados medios', 'cuidados básicos', 'maternidad', 'medios', 'basicos'];
  if (adultServices.some(s => pType.includes(s))) return adultServices.some(s => bType.includes(s));
  return false;
};



const getBedStayStatus = (bed) => {
  if (bed.status !== 'occupied' || !bed.assignedAt || !bed.projectedDays) return 'none';
  const elapsed = (new Date() - new Date(bed.assignedAt)) / (1000 * 60 * 60 * 24);
  const remainingDays = Math.max(0, Math.round(bed.projectedDays - elapsed));

  if (elapsed >= bed.projectedDays || remainingDays === 0) return 'outlier';
  if ((elapsed / bed.projectedDays) >= 0.8 || remainingDays <= 2) return 'riesgo';
  return 'inlier';
};

function DroppableBed({ bed, room, selectedPatient, onDischarge, onFinishCleaning, onEditGrd }) {
  const isCompatible = checkCompatibility(bed, selectedPatient);
  const isSelecting = !!selectedPatient;
  const { isOver, setNodeRef } = useDroppable({
    id: `bed-${room.roomId}-${bed.id}`,
    data: { roomId: room.roomId, bedId: bed.id }
  });

  const styleTarget = bed.tag || bed.type;
  const isAvailable = bed.status === 'available';

  let progress = 0;
  let remainingDays = 0;
  let exceededDays = 0;
  let isExceeded = false;
  if (bed.status === 'occupied' && bed.assignedAt && bed.projectedDays) {
    const elapsed = (new Date() - new Date(bed.assignedAt)) / (1000 * 60 * 60 * 24);
    if (elapsed >= bed.projectedDays) {
      isExceeded = true;
      exceededDays = Math.round(elapsed - bed.projectedDays);
      progress = 100;
    } else {
      progress = Math.min((elapsed / bed.projectedDays) * 100, 100);
      remainingDays = Math.max(0, Math.round(bed.projectedDays - elapsed));
      if (remainingDays === 0) {
        isExceeded = true;
      }
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`glass-panel bed-card ${getBedTypeClass(styleTarget)}
        ${isOver && isCompatible ? 'droppable-over' : ''}
        ${isSelecting && isCompatible ? 'compatible-highlight' : ''}
        ${isSelecting && !isCompatible ? 'non-compatible-dim' : ''}`}
    >
      <div className="bed-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bed size={16} />
          <span style={{ fontWeight: '600' }}>Cama {bed.id}</span>
        </div>
        <div className={`bed-type-badge ${styleTarget.toLowerCase().includes('uci') ? 'b-uci' : ''}`}>{styleTarget}</div>
      </div>

      {bed.patient ? (
        <div className="patient-info" onDoubleClick={() => onEditGrd(room.roomId, bed)}>
          <div className="patient-details" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div className="patient-main" style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', background: 'var(--glass-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={14} />
              </div>
              <span className="patient-name has-tooltip" style={{ flex: 1 }}>
                {bed.patient}
                <div className="custom-tooltip">
                  <strong>Detalles de Hospitalización</strong><br/>
                  <div style={{ marginTop: '4px' }}>
                    <strong>Diagnóstico:</strong> {bed.diagnosis || 'No especificado'}<br/>
                    <strong>Ingreso:</strong> {bed.info || 'No especificado'}<br/>
                    <strong>GRD:</strong> {bed.grdName || 'No asignado'}
                  </div>
                </div>
              </span>
            </div>
            <div className="patient-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => onEditGrd(room.roomId, bed)}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-occupied)' }}></span>
              {bed.grdName ? `GRD: ${bed.grdName}` : 'Ocupada'}
              <Pencil size={12} style={{ marginLeft: '4px', opacity: 0.6 }} />
            </div>
            {bed.projectedDays > 0 && (
              <div className="los-progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%`, background: isExceeded ? '#ef4444' : progress > 80 ? '#f59e0b' : 'var(--accent-color)', boxShadow: isExceeded ? '0 0 8px #ef4444' : 'none' }}></div>
                <span className="progress-text" style={{ color: isExceeded ? '#ef4444' : 'var(--text-secondary)', fontWeight: isExceeded ? 'bold' : 'normal' }}>
                  {isExceeded
                    ? (exceededDays > 0 ? `¡El paciente ha excedido en ${exceededDays} días su estadía proyectada!` : `¡Alerta: 0 días restantes proyectados!`)
                    : `Quedan ${remainingDays} días de ${bed.projectedDays} proyectados`}
                </span>
              </div>
            )}
            <button className="glass-button secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', marginTop: '8px', width: '100%', display: 'flex', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); onDischarge(room.roomId, bed.id); }}>
              <LogOut size={12} /> Dar Alta
            </button>
          </div>
        </div>
      ) : (
        <div className="patient-info" style={{ opacity: isOver && isCompatible ? 1 : 0.6 }}>
          <div className="avatar" style={{ width: '36px', height: '36px', minWidth: '36px', background: isOver && isCompatible ? 'rgba(0, 240, 255, 0.2)' : 'transparent' }}>
            {isOver && isCompatible ? <User size={18} color="var(--accent-color)" /> : <Bed size={18} />}
          </div>
          <div className="patient-details" style={{ width: '100%' }}>
            <span className="patient-name">{isOver && isCompatible ? 'Soltar para asignar' : isSelecting && isCompatible ? 'Cama compatible' : 'Sin paciente'}</span>
            <span className="patient-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: bed.status === 'available' ? 'var(--status-available)' : 'var(--status-cleaning)' }}></span>
              {bed.status === 'available' ? 'Disponible' : 'En Aseo'}
            </span>
            {bed.status === 'cleaning' && (
              <button className="glass-button secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', marginTop: '8px', width: '100%', display: 'flex', justifyContent: 'center', color: 'var(--status-available)', borderColor: 'var(--status-available)' }} onClick={(e) => { e.stopPropagation(); onFinishCleaning(room.roomId, bed.id); }}>
                <CheckCircle size={12} /> Finalizar Aseo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ searchQuery, userRole }) {
  const [bedsData, setBedsData] = useState(DUMMY_DATA);
  const [waitingList, setWaitingList] = useState(WAITING_LIST);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [pendingAssignment, setPendingAssignment] = useState(null); // { patient, bedId, roomId, serviceMismatch, bedType }
  const [editingGrdBed, setEditingGrdBed] = useState(null); // { roomId, bed }
  const [viewingPatient, setViewingPatient] = useState(null);

  const [selectedFloor, setSelectedFloor] = useState('todos');
  const [selectedSector, setSelectedSector] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [serviceFilter, setServiceFilter] = useState('todos');
  const [stayFilter, setStayFilter] = useState('todos');
  const [showFilters, setShowFilters] = useState(true);
  const [showWaitlist, setShowWaitlist] = useState(true);

  const handleDragStart = (event) => {
    setActiveDragItem(event.active.data.current?.patient || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.data.current && over.data.current) {
      const patient = active.data.current.patient;
      const { roomId, bedId } = over.data.current;

      // Encontrar la cama para checkear servicio y estado
      let targetBed = null;
      for (const floor in bedsData) {
        for (const sector in bedsData[floor]) {
          const room = bedsData[floor][sector].find(r => r.roomId === roomId);
          if (room) {
            targetBed = room.beds.find(b => b.id === bedId);
            break;
          }
        }
        if (targetBed) break;
      }

      if (targetBed.status !== 'available') {
        alert('No puede asignar un paciente sobre una cama que se encuentra ocupada o en aseo. El paciente de esta cama debe pasar primero por el proceso de Alta y Aseo.');
        return;
      }

      const serviceMismatch = !checkServiceMatch(targetBed, patient);

      // En lugar de asignar, abrimos el modal
      setPendingAssignment({ patient, roomId, bedId, serviceMismatch, bedType: targetBed?.tag || targetBed?.type });
    }
  };

  const confirmAssignment = (assignmentData) => {
    const { roomId, bedId, patient } = pendingAssignment;
    const newBedsData = { ...bedsData };

    for (const floor in newBedsData) {
      for (const sector in newBedsData[floor]) {
        newBedsData[floor][sector] = newBedsData[floor][sector].map(room => {
          if (room.roomId === roomId) {
            const updatedBeds = room.beds.map(bed => {
              if (bed.id === bedId) {
                return {
                  ...bed,
                  status: 'occupied',
                  patient: assignmentData.patientName,
                  diagnosis: assignmentData.diagnosis,
                  grdId: assignmentData.grdId,
                  grdName: assignmentData.grdName, // Se puede derivar
                  severity: assignmentData.severity,
                  projectedDays: assignmentData.projectedDays,
                  assignedAt: assignmentData.assignedAt,
                  projectedReleaseDate: assignmentData.projectedReleaseDate,
                  waitMinutes: assignmentData.waitMinutes,
                  info: `Ingreso desde ${assignmentData.origin}`
                };
              }
              return bed;
            });
            return { ...room, beds: updatedBeds };
          }
          return room;
        });
      }
    }

    setBedsData(newBedsData);
    setWaitingList(prev => prev.filter(p => p.id !== patient.id));
    setPendingAssignment(null);
    setSelectedPatient(null);
  };

  const updateBedState = (roomId, bedId, updates) => {
    const newBedsData = { ...bedsData };
    for (const floor in newBedsData) {
      for (const sector in newBedsData[floor]) {
        newBedsData[floor][sector] = newBedsData[floor][sector].map(room => {
          if (room.roomId === roomId) {
            return {
              ...room,
              beds: room.beds.map(bed => bed.id === bedId ? { ...bed, ...updates } : bed)
            };
          }
          return room;
        });
      }
    }
    setBedsData(newBedsData);
  };

  const handleDischarge = (roomId, bedId) => {
    updateBedState(roomId, bedId, {
      status: 'cleaning',
      patient: null,
      diagnosis: null,
      grdId: null,
      grdName: null,
      projectedDays: null
    });
  };

  const handleFinishCleaning = (roomId, bedId) => {
    updateBedState(roomId, bedId, { status: 'available' });
  };

  const handleTransfer = (sourceRoomId, sourceBedId, targetRoomId, targetBedId, newGrdData) => {
    let sourceBedInfo = null;
    let newBedsData = { ...bedsData };

    // Find and copy source bed data
    for (const floor in newBedsData) {
      for (const sector in newBedsData[floor]) {
        const roomIndex = newBedsData[floor][sector].findIndex(r => r.roomId === sourceRoomId);
        if (roomIndex !== -1) {
          const room = newBedsData[floor][sector][roomIndex];
          const bedIndex = room.beds.findIndex(b => b.id === sourceBedId);
          if (bedIndex !== -1) {
            sourceBedInfo = { ...room.beds[bedIndex] };

            // Vacate source bed
            const newRoomBeds = [...room.beds];
            newRoomBeds[bedIndex] = {
              ...newRoomBeds[bedIndex],
              status: 'cleaning',
              patient: null,
              diagnosis: null,
              grdId: null,
              grdName: null,
              severity: null,
              projectedDays: null,
              assignedAt: null
            };
            const newRooms = [...newBedsData[floor][sector]];
            newRooms[roomIndex] = { ...room, beds: newRoomBeds };
            newBedsData[floor][sector] = newRooms;
          }
        }
      }
    }

    if (!sourceBedInfo) return;

    // Fill target bed
    for (const floor in newBedsData) {
      for (const sector in newBedsData[floor]) {
        const roomIndex = newBedsData[floor][sector].findIndex(r => r.roomId === targetRoomId);
        if (roomIndex !== -1) {
          const room = newBedsData[floor][sector][roomIndex];
          const bedIndex = room.beds.findIndex(b => b.id === targetBedId);
          if (bedIndex !== -1) {
            const newRoomBeds = [...room.beds];
            newRoomBeds[bedIndex] = {
              ...newRoomBeds[bedIndex],
              status: 'occupied',
              patient: sourceBedInfo.patient,
              diagnosis: sourceBedInfo.diagnosis,
              grdId: newGrdData ? newGrdData.grdId : sourceBedInfo.grdId,
              grdName: newGrdData ? newGrdData.grdName : sourceBedInfo.grdName,
              severity: newGrdData ? newGrdData.severity : sourceBedInfo.severity,
              projectedDays: newGrdData ? newGrdData.projectedDays : sourceBedInfo.projectedDays,
              assignedAt: sourceBedInfo.assignedAt,
              transferAt: new Date().toISOString() // Traceability timestamp
            };
            const newRooms = [...newBedsData[floor][sector]];
            newRooms[roomIndex] = { ...room, beds: newRoomBeds };
            newBedsData[floor][sector] = newRooms;
          }
        }
      }
    }

    setBedsData(newBedsData);
    setEditingGrdBed(null);
  };

  const confirmGrdEdit = (grdData, transferTarget) => {
    if (transferTarget) {
      handleTransfer(editingGrdBed.roomId, editingGrdBed.bed.id, transferTarget.roomId, transferTarget.bedId, grdData);
    } else {
      updateBedState(editingGrdBed.roomId, editingGrdBed.bed.id, grdData);
      setEditingGrdBed(null);
    }
  };

  const availableBeds = [];
  Object.keys(bedsData).forEach(floor => {
    Object.keys(bedsData[floor]).forEach(sector => {
      bedsData[floor][sector].forEach(room => {
        room.beds.forEach(bed => {
          if (bed.status === 'available') {
            availableBeds.push({
              id: bed.id,
              roomId: room.roomId,
              roomType: room.roomType,
              type: bed.type,
              tag: bed.tag,
              status: bed.status,
              floor: floor.replace('piso', 'Piso ')
            });
          }
        });
      });
    });
  });

  const formatFloor = (f) => f.replace('piso', 'Piso ');
  const formatSector = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const sectorsToRender = selectedSector === 'todos' ? ['poniente', 'oriente'] : [selectedSector];
  const floorsToRender = selectedFloor === 'todos' ? ['piso4', 'piso3', 'piso2'] : [selectedFloor];

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className={`main-layout ${!showFilters ? 'filters-hidden' : ''}`}>
        {showFilters && (
          <aside className="sidebar">
          <div className="glass-panel sidebar-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 className="sidebar-title" style={{ marginBottom: 0 }}>Filtros de Dashboard</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="glass-button"
                style={{ padding: '6px' }}
                title="Ocultar Filtros"
              >
                <Filter size={16} />
              </button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div className="sidebar-title" style={{ fontSize: '0.75rem', marginBottom: '12px', color: 'var(--accent-color)' }}>1. SELECCIÓN DE PISO</div>
              <div className="stack-group">
                <button className={`stack-btn ${selectedFloor === 'todos' ? 'active' : ''}`} onClick={() => setSelectedFloor('todos')}>Todo el Hospital</button>
                <button className={`stack-btn ${selectedFloor === 'piso4' ? 'active' : ''}`} onClick={() => setSelectedFloor('piso4')}>Piso 4</button>
                <button className={`stack-btn ${selectedFloor === 'piso3' ? 'active' : ''}`} onClick={() => setSelectedFloor('piso3')}>Piso 3</button>
                <button className={`stack-btn ${selectedFloor === 'piso2' ? 'active' : ''}`} onClick={() => setSelectedFloor('piso2')}>Piso 2</button>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div className="sidebar-title" style={{ fontSize: '0.75rem', marginBottom: '12px', color: 'var(--accent-color)' }}>2. VISTA DE SECTORES</div>
              <div className="stack-group">
                <button className={`stack-btn ${selectedSector === 'todos' ? 'active' : ''}`} onClick={() => setSelectedSector('todos')}>Mostrar Ambos</button>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className={`stack-btn ${selectedSector === 'poniente' ? 'active' : ''}`} onClick={() => setSelectedSector('poniente')} style={{ flex: 1 }}>Poniente</button>
                  <button className={`stack-btn ${selectedSector === 'oriente' ? 'active' : ''}`} onClick={() => setSelectedSector('oriente')} style={{ flex: 1 }}>Oriente</button>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div className="sidebar-title" style={{ fontSize: '0.75rem', marginBottom: '12px', color: 'var(--accent-color)' }}>3. ESTADO DE CAMA</div>
              <div className="stack-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button className={`stack-btn ${statusFilter === 'todos' ? 'active' : ''}`} style={{ padding: '8px 4px', fontSize: '0.8rem' }} onClick={() => setStatusFilter('todos')}>Todas</button>
                <button className={`stack-btn ${statusFilter === 'available' ? 'active' : ''}`} style={{ padding: '8px 4px', fontSize: '0.8rem' }} onClick={() => setStatusFilter('available')}>Disp.</button>
                <button className={`stack-btn ${statusFilter === 'cleaning' ? 'active' : ''}`} style={{ padding: '8px 4px', fontSize: '0.8rem' }} onClick={() => setStatusFilter('cleaning')}>Aseo</button>
                <button className={`stack-btn ${statusFilter === 'hodom' ? 'active' : ''}`} style={{ padding: '8px 4px', fontSize: '0.8rem' }} onClick={() => setStatusFilter('hodom')}>HODOM</button>
                <button className={`stack-btn ${statusFilter === 'occupied' ? 'active' : ''}`} style={{ padding: '8px 4px', fontSize: '0.8rem', gridColumn: 'span 2' }} onClick={() => setStatusFilter('occupied')}>Ocupadas</button>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div className="sidebar-title" style={{ fontSize: '0.75rem', marginBottom: '12px', color: 'var(--accent-color)' }}>4. SERVICIO CLÍNICO</div>
              <select className="glass-input" style={{ width: '100%' }} value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
                <option value="todos">Todos los Servicios</option>
                <option value="upc">UPC (UCI/UTI)</option>
                <option value="maternidad">Maternidad</option>
                <option value="infantil">Infantil / Neo</option>
                <option value="medios">Cuidados Medios</option>
                <option value="basicos">Cuidados Básicos</option>
              </select>
            </div>
            <div>
              <div className="sidebar-title" style={{ fontSize: '0.75rem', marginBottom: '12px', color: 'var(--accent-color)' }}>5. ESTADO ESTADÍA GRD</div>
              <select className="glass-input" style={{ width: '100%' }} value={stayFilter} onChange={(e) => setStayFilter(e.target.value)}>
                <option value="todos">Todos los Estados</option>
                <option value="inlier">Inlier (Estándar)</option>
                <option value="riesgo">Riesgo Outlier</option>
                <option value="outlier">Outlier Superior (Rojo)</option>
              </select>
            </div>
          </div>
        </aside>
        )}

        <main>
          <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {!showFilters && (
                <button
                  onClick={() => setShowFilters(true)}
                  className="glass-button"
                  style={{ padding: '8px', marginRight: '8px' }}
                  title="Mostrar Filtros"
                >
                  <Filter size={20} />
                </button>
              )}
              <LayoutDashboard size={24} className="icon-logo" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Resumen <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>/ {selectedFloor === 'todos' ? 'Todo el Hospital' : formatFloor(selectedFloor)}</span>
              </h2>
            </div>
            {selectedPatient && (
              <div className="selection-badge glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} />
                  <span>Asignando: <strong>{selectedPatient.name}</strong></span>
                  <button onClick={() => setSelectedPatient(null)} className="clear-selection"><X size={14} /></button>
                </div>
              </div>
            )}
          </div>

          {floorsToRender.map((floor) => {
            let hasRoomsInFloor = false;
            const floorContent = sectorsToRender.map((sector) => {
              const allRoomsInSector = bedsData[floor]?.[sector] || [];
              const roomsWithFilteredBeds = allRoomsInSector.map(room => {
                const filteredBeds = room.beds.filter(bed => {
                  const matchStatus = statusFilter === 'todos' || bed.status === statusFilter;
                  let matchService = true;
                  if (serviceFilter !== 'todos') {
                    const type = (bed.tag || bed.type || '').toLowerCase();
                    if (serviceFilter === 'upc' && !type.includes('uci') && !type.includes('uti') && type !== 'upc') matchService = false;
                    else if (serviceFilter === 'infantil' && !type.includes('infantil') && !type.includes('neonatolog')) matchService = false;
                    else if (serviceFilter === 'maternidad' && !type.includes('maternidad')) matchService = false;
                    else if (serviceFilter === 'medios' && !type.includes('medios') && type !== 'cuidados medios') matchService = false;
                    else if (serviceFilter === 'basicos' && !type.includes('basico') && !type.includes('básicos')) matchService = false;
                  }
                  let matchStay = true;
                  if (stayFilter !== 'todos') {
                    matchStay = getBedStayStatus(bed) === stayFilter;
                  }
                  return matchStatus && matchService && matchStay;
                });
                return { ...room, beds: filteredBeds };
              }).filter(room => room.beds.length > 0);
              if (roomsWithFilteredBeds.length === 0) return null;
              hasRoomsInFloor = true;
              return (
                <div key={`${floor}-${sector}`} style={{ marginBottom: '40px' }}>
                  {selectedSector === 'todos' && <h4 className="sector-label">Ala {formatSector(sector)}</h4>}
                  {roomsWithFilteredBeds.map((room) => (
                    <div key={room.roomId} className="glass-panel room-container" style={{ marginBottom: '16px' }}>
                      <div className="room-header"><div className="room-title">Hab. {room.roomId}</div></div>
                      <div className={`beds-grid ${room.roomId === '201' ? 'beds-grid-wrap-201' : ''}`}>
                        {room.beds.map((bed) => (
                          <DroppableBed
                            key={bed.id}
                            bed={bed}
                            room={room}
                            selectedPatient={selectedPatient}
                            onDischarge={(roomId, bedId) => setDischargingPatient({ type: 'bed', roomId, bedId, bed })}
                            onFinishCleaning={handleFinishCleaning}
                            onEditGrd={(rId, b) => setEditingGrdBed({ roomId: rId, bed: b })}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            });
            if (!hasRoomsInFloor) return null;
            return <div key={floor} style={{ marginBottom: '48px' }}><h3 className="floor-label">{formatFloor(floor)}</h3>{floorContent}</div>;
          })}
        </main>

        <aside className="waiting-list-section">
          <div className="glass-panel sidebar-section">
            <WaitingList
              patients={waitingList}
              onSelectPatient={(p) => setSelectedPatient(selectedPatient?.id === p.id ? null : p)}
              onViewPatient={(p) => setViewingPatient(p)}
              selectedPatientId={selectedPatient?.id}
            />
          </div>
        </aside>

        {pendingAssignment && (
          <AssignmentModal
            patient={pendingAssignment.patient}
            bed={pendingAssignment}
            onConfirm={confirmAssignment}
            onClose={() => setPendingAssignment(null)}
          />
        )}

        {editingGrdBed && (
          <EditGrdModal
            bed={editingGrdBed.bed}
            availableBeds={availableBeds}
            onConfirm={confirmGrdEdit}
            onClose={() => setEditingGrdBed(null)}
            userRole={userRole}
            onDischargeRequest={(bed) => {
              setEditingGrdBed(null);
              setDischargingPatient({ type: 'bed', roomId: editingGrdBed.roomId, bedId: bed.id, bed });
            }}
            onFinishCleaning={(roomId, bedId) => {
              handleFinishCleaning(roomId, bedId);
              setEditingGrdBed(null);
            }}
          />
        )}

        {viewingPatient && (
          <PatientDetailModal
            patient={viewingPatient}
            onClose={() => setViewingPatient(null)}
            onUpdate={(updatedPatient) => {
              if (waitingList.some(p => p.id === updatedPatient.id)) {
                setWaitingList(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
              } else {
                setBeds(prev => prev.map(r => ({
                  ...r,
                  beds: r.beds.map(b => b.patient?.id === updatedPatient.id ? { ...b, patient: updatedPatient } : b)
                })));
              }
              setViewingPatient(updatedPatient);
            }}
          />
        )}

        {dischargingPatient && (
          <DischargeModal
            bed={dischargingPatient.bed || dischargingPatient.patient}
            onConfirm={handleDischargeConfirm}
            onClose={() => setDischargingPatient(null)}
          />
        )}
      </div>
    </DndContext>
  );
}
