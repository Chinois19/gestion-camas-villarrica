import { useState } from 'react';
import { Bed, User, LayoutDashboard, Map, Info, Layers, Search, X, Activity, Pencil, LogOut, CheckCircle, Filter, RotateCcw, Lock, Unlock } from 'lucide-react';
import { getBedTypeClass, getIconColor } from '../data/dummy';
import WaitingList from './WaitingList';
import AssignmentModal from './AssignmentModal';
import EditGrdModal from './EditGrdModal';
import PatientDetailModal from './PatientDetailModal';
import DischargeModal from './DischargeModal';
import InterconsultaModal from './InterconsultaModal';
import MultiSearchableSelect from './MultiSearchableSelect';
import BlockBedModal from './BlockBedModal';
import UnblockBedModal from './UnblockBedModal';
import { ESPECIALIDADES } from '../data/formData';
import { DndContext, useDroppable, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';

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
  if ((bed.status !== 'occupied' && bed.status !== 'pending_hodom') || !bed.assignedAt || !bed.projectedDays) return 'none';
  const elapsed = (new Date() - new Date(bed.assignedAt)) / (1000 * 60 * 60 * 24);
  const remainingDays = Math.max(0, Math.round(bed.projectedDays - elapsed));
  
  if (elapsed >= bed.projectedDays || remainingDays === 0) return 'outlier';
  if ((elapsed / bed.projectedDays) >= 0.8 || remainingDays <= 2) return 'riesgo';
  return 'inlier';
};

function DroppableBed({ bed, room, selectedPatient, onDischarge, onFinishCleaning, onUndoDischarge, onUndoAssignment, onMarkHodomDoneByBed, onEditGrd, onBlockBed, onUnblockBed, userRole, user }) {
  const isVisor = userRole === 'visor';
  const canManageBlocks = userRole === 'superadmin' || userRole === 'administrador' || userRole === 'gestor_camas';
  const isCompatible = checkCompatibility(bed, selectedPatient);
  const isSelecting = !!selectedPatient;
  const { isOver, setNodeRef } = useDroppable({
    id: `bed-${room.roomId}-${bed.id}`,
    data: { roomId: room.roomId, bedId: bed.id },
    disabled: isVisor
  });

  const styleTarget = bed.tag || bed.type;
  const isAvailable = bed.status === 'available';

  let progress = 0;
  let remainingDays = 0;
  let exceededDays = 0;
  let isExceeded = false;
  let daysOfStay = 1;

  if ((bed.status === 'occupied' || bed.status === 'pending_hodom') && bed.assignedAt) {
    const elapsed = (new Date() - new Date(bed.assignedAt)) / (1000 * 60 * 60 * 24);
    daysOfStay = Math.max(1, Math.ceil(elapsed));
    
    if (bed.projectedDays) {
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
  }

  return (
    <div 
      ref={setNodeRef}
      className={`glass-panel bed-card ${getBedTypeClass(styleTarget)} ${bed.status} 
        ${isOver && isCompatible ? 'droppable-over' : ''} 
        ${isSelecting && isCompatible ? 'compatible-highlight' : ''} 
        ${isSelecting && !isCompatible ? 'non-compatible-dim' : ''}`}
      style={bed.status === 'blocked' ? {
        background: 'linear-gradient(135deg, rgba(0,0,0,0.8), rgba(15,15,15,0.9))',
        borderColor: 'rgba(239, 68, 68, 0.1)',
        opacity: 0.75,
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
        filter: 'grayscale(0.4)'
      } : {}}
    >
      <div className="bed-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bed size={16} />
          <span style={{ fontWeight: '600' }}>Cama {bed.id}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
          {bed.status === 'pending_hodom' && (
            <span className="status-pill" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.4)', fontSize: '0.58rem', padding: '2px 5px', borderRadius: '4px', fontWeight: 700 }}>Pend. HODOM</span>
          )}
          {bed.interconsultas && bed.interconsultas.filter(ic => ic.estado === 'pendiente').map((ic, i) => (
            <span key={`ic-${i}`} className="status-pill" style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', border: '1px solid rgba(234,179,8,0.4)', fontSize: '0.58rem', padding: '2px 5px', borderRadius: '4px', fontWeight: 700 }}>IC pendiente {ic.especialidadDestino}</span>
          ))}
          <div className={`bed-type-badge ${styleTarget.toLowerCase().includes('uci') ? 'b-uci' : ''}`}>{styleTarget}</div>
        </div>
      </div>

      {bed.status === 'blocked' ? (
        <div className="patient-info" style={{ opacity: 0.9 }}>
          <div className="avatar" style={{ width: '36px', height: '36px', minWidth: '36px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <Lock size={18} />
          </div>
          <div className="patient-details" style={{ width: '100%' }}>
            <span className="patient-name" style={{ color: '#ef4444' }}>Cama Bloqueada</span>
            <span className="patient-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span>
              Motivo: {bed.blockedReason || 'Inhabilitada'}
            </span>
            {bed.blockedAt && (
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Desde: {bed.blockedAt} por {bed.blockedBy}
              </div>
            )}
            {canManageBlocks && (
              <button className="glass-button secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', marginTop: '8px', width: '100%', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', color: '#22c55e', borderColor: '#22c55e' }} onClick={(e) => { e.stopPropagation(); onUnblockBed(room.roomId, bed.id); }}>
                <Unlock size={12} /> Desbloquear cama
              </button>
            )}
          </div>
        </div>
      ) : (bed.patient || bed.status === 'pending_hodom') ? (
        <div className="patient-info" onDoubleClick={() => !isVisor && onEditGrd(room.roomId, bed)}>
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
            {bed.diagnosis && (
              <div style={{ fontSize: '0.65rem', color: '#f59e0b', marginTop: '2px', marginBottom: '2px', fontWeight: 600, lineHeight: 1.3 }}>
                Dx: {Array.isArray(bed.diagnosis) ? bed.diagnosis.join(' • ') : bed.diagnosis}
              </div>
            )}
            <div className="patient-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: isVisor ? 'default' : 'pointer' }} onClick={() => !isVisor && onEditGrd(room.roomId, bed)}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: bed.status === 'pending_hodom' ? '#22c55e' : 'var(--status-occupied)' }}></span>
              {bed.grdName ? `GRD: ${bed.grdName}` : (bed.status === 'pending_hodom' ? 'Pendiente HODOM' : 'Ocupada')}
              {!isVisor && <Pencil size={12} style={{ marginLeft: '4px', opacity: 0.6 }} />}
            </div>
            {bed.especialidadTratante && bed.especialidadTratante.length > 0 && (
              <div style={{ fontSize: '0.65rem', color: '#00d4ff', marginTop: '4px', fontWeight: 600 }}>
                Tratante: {bed.especialidadTratante.join(' • ')}
              </div>
            )}
            <div style={{ fontSize: '0.7rem', color: '#06b6d4', marginTop: '4px', fontWeight: 700 }}>
              Días de Estada: {daysOfStay}
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
            {bed.status === 'pending_hodom' ? (
              !isVisor && (
                <button 
                  className="glass-button primary" 
                  style={{ 
                    padding: '4px 8px', 
                    fontSize: '0.7rem', 
                    marginTop: '8px', 
                    width: '100%', 
                    display: 'flex', 
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                    borderColor: '#22c55e',
                    color: '#fff'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkHodomDoneByBed(room.roomId, bed.id);
                  }}
                >
                  <CheckCircle size={12} /> Confirmación de ingreso a HODOM
                </button>
              )
            ) : (
              !isVisor && (
                <>
                  <button className="glass-button secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', marginTop: '8px', width: '100%', display: 'flex', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); onDischarge(room.roomId, bed.id); }}>
                    <LogOut size={12} /> Dar Alta
                  </button>
                  {user?.role === 'superadmin' && bed.originalWaitingRequest && (
                    <button className="glass-button secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', marginTop: '4px', width: '100%', display: 'flex', justifyContent: 'center', borderColor: 'rgba(245,158,11,0.4)', color: '#f59e0b' }} onClick={(e) => { e.stopPropagation(); onUndoAssignment(room.roomId, bed.id); }}>
                      <RotateCcw size={12} /> Deshacer Ingreso
                    </button>
                  )}
                </>
              )
            )}
            
            {bed.status === 'pending_hodom' && user?.role === 'superadmin' && bed.previousPatient && (
              <button className="glass-button secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', marginTop: '4px', width: '100%', display: 'flex', justifyContent: 'center', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); onUndoDischarge(room.roomId, bed.id); }}>
                <RotateCcw size={12} /> Revertir Alta (Recuperar)
              </button>
            )}
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
              <>
                <button className="glass-button secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', marginTop: '8px', width: '100%', display: 'flex', justifyContent: 'center', color: 'var(--status-available)', borderColor: 'var(--status-available)' }} onClick={(e) => { e.stopPropagation(); onFinishCleaning(room.roomId, bed.id); }}>
                  <CheckCircle size={12} /> Finalizar Aseo
                </button>
                {user?.role === 'superadmin' && bed.previousPatient && (
                  <button className="glass-button secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', marginTop: '4px', width: '100%', display: 'flex', justifyContent: 'center', borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); onUndoDischarge(room.roomId, bed.id); }}>
                    <RotateCcw size={12} /> Revertir Alta (Recuperar)
                  </button>
                )}
              </>
            )}
            {bed.status === 'available' && canManageBlocks && (
              <button className="glass-button secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', marginTop: '8px', width: '100%', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }} onClick={(e) => { e.stopPropagation(); onBlockBed(room.roomId, bed.id); }}>
                <Lock size={12} /> Bloqueo de cama
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ searchQuery, bedsData, setBedsData, waitingList, setWaitingList, onHodomSubmit, onMarkHodomDoneByBed, user, onEditPatient, onViewPatient }) {
  const userRole = user?.role || 'visor';
  const isVisor = userRole === 'visor';

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [pendingAssignment, setPendingAssignment] = useState(null); // { patient, bedId, roomId, serviceMismatch, bedType }
  const [editingGrdBed, setEditingGrdBed] = useState(null); // { roomId, bed }
  const [viewingPatient, setViewingPatient] = useState(null);
  const [dischargingPatient, setDischargingPatient] = useState(null); // { roomId, bed }
  const [requestingIC, setRequestingIC] = useState(null); // { roomId, bed }
  const [blockingBed, setBlockingBed] = useState(null);
  const [unblockingBed, setUnblockingBed] = useState(null);
  
  const [selectedFloor, setSelectedFloor] = useState('todos');
  const [selectedSector, setSelectedSector] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [serviceFilter, setServiceFilter] = useState('todos');
  const [stayFilter, setStayFilter] = useState('todos');
  const [icFilter, setIcFilter] = useState('todos');
  const [espTratanteFilter, setEspTratanteFilter] = useState([]);
  const [showFilters, setShowFilters] = useState(true);
  
  const [isDraggingActive, setIsDraggingActive] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
                  rut: pendingAssignment.patient.rut || null,
                  age: pendingAssignment.patient.age || pendingAssignment.patient.edad || null,
                  sex: pendingAssignment.patient.sex || pendingAssignment.patient.sexo || null,
                  prevision: pendingAssignment.patient.prevision || null,
                  comuna: pendingAssignment.patient.comuna || null,
                  medicoSol: pendingAssignment.patient.medicoSol || null,
                  especialidadMedico: pendingAssignment.patient.especialidadMedico || null,
                  requisitosUGP: pendingAssignment.patient.requisitosUGP || null,
                  reqEnfermeria: pendingAssignment.patient.reqEnfermeria || null,
                  procedimientosPendientes: pendingAssignment.patient.procedimientosPendientes || null,
                  aislamiento: pendingAssignment.patient.aislamiento || null,
                  servicioSol: pendingAssignment.patient.servicioSol || null,
                  destino: pendingAssignment.patient.destino || null,
                  prioridad: pendingAssignment.patient.prioridad || null,
                  diagnosis: assignmentData.diagnosis,
                  especialidadTratante: pendingAssignment.patient.especialidadTratante,
                  grdId: assignmentData.grdId,
                  grdName: assignmentData.grdName, // Se puede derivar
                  severity: assignmentData.severity,
                  projectedDays: assignmentData.projectedDays,
                  assignedAt: assignmentData.assignedAt,
                  projectedReleaseDate: assignmentData.projectedReleaseDate,
                  waitMinutes: assignmentData.waitMinutes,
                  info: `Ingreso desde ${assignmentData.origin}`,
                  originalWaitingRequest: pendingAssignment.patient
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

  const handleBlockConfirm = ({ reason, observation }) => {
    if (!blockingBed) return;
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newNovedad = {
      id: Date.now(),
      fecha: formattedDate,
      usuario: user?.name || 'Usuario',
      rol: user?.role || 'Desconocido',
      contenido: `Bloqueo de cama por: ${reason}. ${observation ? `Observación: ${observation}` : ''}`
    };

    updateBedState(blockingBed.roomId, blockingBed.bed.id, {
      status: 'blocked',
      blockedReason: reason,
      blockedObs: observation,
      blockedBy: user?.name || 'Usuario',
      blockedAt: formattedDate,
      novedades: [newNovedad, ...(blockingBed.bed.novedades || [])]
    });
    setBlockingBed(null);
  };

  const handleUnblockConfirm = ({ observation }) => {
    if (!unblockingBed) return;
    const now = new Date();
    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newNovedad = {
      id: Date.now(),
      fecha: formattedDate,
      usuario: user?.name || 'Usuario',
      rol: user?.role || 'Desconocido',
      contenido: `Desbloqueo de cama. ${observation ? `Observación: ${observation}` : ''}`
    };

    updateBedState(unblockingBed.roomId, unblockingBed.bed.id, {
      status: 'available',
      blockedReason: null,
      blockedObs: null,
      blockedBy: null,
      blockedAt: null,
      novedades: [newNovedad, ...(unblockingBed.bed.novedades || [])]
    });
    setUnblockingBed(null);
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
    if (targetBed) {
      setDischargingPatient({ roomId, bed: targetBed });
    }
  };

  const handleDischargeWaiting = (patient) => {
    const mockBed = {
      id: patient.id,
      roomId: 'Espera',
      patient: patient.name,
      rut: patient.rut || '—',
      age: patient.age || '—',
      sex: patient.sexo || '—',
      prevision: patient.prevision || '—',
      diagnosis: patient.diagnosis || '—',
      isWaiting: true
    };
    setDischargingPatient({ roomId: 'Espera', bed: mockBed, isWaiting: true });
  };

  const handleDischargeConfirm = (formData) => {
    if (!dischargingPatient) return;
    const { roomId, bed } = dischargingPatient;
    const bedId = bed.id;

    if (dischargingPatient.isWaiting) {
      setWaitingList(prev => prev.filter(p => p.id !== bedId));
      setDischargingPatient(null);
      return;
    }

    if (formData.destino === 'Hospitalización domiciliaria') {
      updateBedState(roomId, bedId, { 
        status: 'pending_hodom',
        previousPatient: bed
      });

      if (onHodomSubmit && formData.hodomData) {
        onHodomSubmit(formData.hodomData);
      }
    } else {
      updateBedState(roomId, bedId, { 
        status: 'cleaning', 
        patient: null, 
        rut: null,
        age: null,
        sex: null,
        prevision: null,
        comuna: null,
        medicoSol: null,
        especialidadMedico: null,
        requisitosUGP: null,
        reqEnfermeria: null,
        procedimientosPendientes: null,
        aislamiento: null,
        servicioSol: null,
        destino: null,
        prioridad: null,
        diagnosis: null, 
        grdId: null, 
        grdName: null, 
        projectedDays: null,
        assignedAt: null,
        projectedReleaseDate: null,
        waitMinutes: null,
        info: null,
        especialidadTratante: null,
        severity: null,
        interconsultas: [],
        previousPatient: bed,
        originalWaitingRequest: null
      });
    }
    setDischargingPatient(null);
  };

  const handleUndoDischarge = (roomId, bedId) => {
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
    
    if (targetBed && targetBed.previousPatient) {
      const restoredBed = { ...targetBed.previousPatient, status: 'occupied' };
      delete restoredBed.previousPatient;
      updateBedState(roomId, bedId, restoredBed);
    }
  };

  const handleUndoAssignment = (roomId, bedId) => {
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
    
    if (targetBed && targetBed.originalWaitingRequest) {
      setWaitingList(prev => [...prev, targetBed.originalWaitingRequest]);
      updateBedState(roomId, bedId, {
        status: 'available',
        patient: null,
        rut: null,
        age: null,
        sex: null,
        prevision: null,
        comuna: null,
        medicoSol: null,
        especialidadMedico: null,
        requisitosUGP: null,
        reqEnfermeria: null,
        procedimientosPendientes: null,
        aislamiento: null,
        servicioSol: null,
        destino: null,
        prioridad: null,
        diagnosis: null,
        grdId: null,
        grdName: null,
        severity: null,
        projectedDays: null,
        assignedAt: null,
        projectedReleaseDate: null,
        waitMinutes: null,
        info: null,
        especialidadTratante: null,
        originalWaitingRequest: null
      });
    }
  };

  const handleInterconsultaConfirm = (formData) => {
    if (!requestingIC) return;
    const { roomId, bed } = requestingIC;
    const bedId = bed.id;

    const newIC = {
      id: `ic-${Date.now()}`,
      especialidadDestino: formData.especialidadDestino,
      tipoRequerimiento: formData.tipoRequerimiento,
      profesionalDeriva: formData.profesionalDeriva || 'Dr. Médico Tratante',
      solicitadaAt: new Date().toISOString(),
      resumenHistoria: formData.resumenHistoria,
      estado: 'pendiente',
      priorizacion: formData.priorizacion
    };

    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const floors = ['piso4', 'piso3', 'piso2'];
      for (const f of floors) {
        if (!next[f]) continue;
        for (const s in next[f]) {
          next[f][s] = next[f][s].map(room => {
            if (room.roomId === roomId) {
              return {
                ...room,
                beds: room.beds.map(b => {
                  if (b.id === bedId) {
                    const currentICs = b.interconsultas || [];
                    const currentNovedades = b.novedades || [];
                    
                    const now = new Date();
                    const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                    
                    const newNovedad = {
                      id: Date.now(),
                      fecha: formattedDate,
                      usuario: formData.profesionalDeriva || user?.name || 'Médico Tratante',
                      rol: user?.role || 'Médico',
                      contenido: `Interconsulta ${formData.priorizacion ? formData.priorizacion.toLowerCase() : ''} a la especialidad de ${formData.especialidadDestino}.`
                    };

                    return {
                      ...b,
                      interconsultas: [...currentICs, newIC],
                      novedades: [newNovedad, ...currentNovedades]
                    };
                  }
                  return b;
                })
              };
            }
            return room;
          });
        }
      }
      return next;
    });

    setRequestingIC(null);
  };

  const handleFinishCleaning = (roomId, bedId) => {
    updateBedState(roomId, bedId, { status: 'available' });
  };

  const handleTransfer = (sourceRoomId, sourceBedId, targetRoomId, targetBedId, newGrdData, transferType = 'libre') => {
    let sourceBedInfo = null;
    let targetBedInfo = null;
    let newBedsData = { ...bedsData };
    
    // First pass: find source and target bed infos
    for (const floor in newBedsData) {
      for (const sector in newBedsData[floor]) {
        const sourceRoom = newBedsData[floor][sector].find(r => r.roomId === sourceRoomId);
        if (sourceRoom) {
          const sBed = sourceRoom.beds.find(b => b.id === sourceBedId);
          if (sBed) sourceBedInfo = { ...sBed };
        }
        const targetRoom = newBedsData[floor][sector].find(r => r.roomId === targetRoomId);
        if (targetRoom) {
          const tBed = targetRoom.beds.find(b => b.id === targetBedId);
          if (tBed) targetBedInfo = { ...tBed };
        }
      }
    }

    if (!sourceBedInfo || !targetBedInfo) return;

    // Apply the updated GRD data to the source info before transferring
    if (newGrdData) {
      sourceBedInfo.grdId = newGrdData.grdId;
      sourceBedInfo.grdName = newGrdData.grdName;
      sourceBedInfo.severity = newGrdData.severity;
      sourceBedInfo.projectedDays = newGrdData.projectedDays;
      sourceBedInfo.diagnosis = newGrdData.diagnosis;
      sourceBedInfo.rut = newGrdData.rut;
      sourceBedInfo.comuna = newGrdData.comuna;
      sourceBedInfo.prevision = newGrdData.prevision;
      sourceBedInfo.especialidadTratante = newGrdData.especialidadTratante;
      sourceBedInfo.aislamiento = newGrdData.aislamiento;
      sourceBedInfo.novedades = newGrdData.novedades;
      sourceBedInfo.destino = newGrdData.destino;
      if (newGrdData.interconsultas) {
        sourceBedInfo.interconsultas = newGrdData.interconsultas;
      }
    }

    // Second pass: apply the swap or transfer
    for (const floor in newBedsData) {
      for (const sector in newBedsData[floor]) {
        let sectorRooms = [...newBedsData[floor][sector]];
        let sectorModified = false;

        const sRoomIndex = sectorRooms.findIndex(r => r.roomId === sourceRoomId);
        if (sRoomIndex !== -1) {
          const room = sectorRooms[sRoomIndex];
          const bIndex = room.beds.findIndex(b => b.id === sourceBedId);
          if (bIndex !== -1) {
            const newBeds = [...room.beds];
            if (transferType === 'enroque') {
              // Copy all properties from targetBedInfo, except the physical bed properties
              const { id, type, tag, ...targetPatientData } = targetBedInfo;
              newBeds[bIndex] = {
                id: newBeds[bIndex].id,
                type: newBeds[bIndex].type,
                tag: newBeds[bIndex].tag,
                ...targetPatientData,
                transferAt: new Date().toISOString()
              };
            } else {
              // Cama Libre
              newBeds[bIndex] = {
                id: newBeds[bIndex].id,
                type: newBeds[bIndex].type,
                tag: newBeds[bIndex].tag,
                status: 'cleaning'
              };
            }
            sectorRooms[sRoomIndex] = { ...room, beds: newBeds };
            sectorModified = true;
          }
        }

        const tRoomIndex = sectorRooms.findIndex(r => r.roomId === targetRoomId);
        if (tRoomIndex !== -1) {
          const room = sectorRooms[tRoomIndex];
          const bIndex = room.beds.findIndex(b => b.id === targetBedId);
          if (bIndex !== -1) {
            const newBeds = [...room.beds];
            // Copy all properties from sourceBedInfo, except physical bed properties
            const { id, type, tag, ...sourcePatientData } = sourceBedInfo;
            newBeds[bIndex] = {
              id: newBeds[bIndex].id,
              type: newBeds[bIndex].type,
              tag: newBeds[bIndex].tag,
              ...sourcePatientData,
              status: 'occupied',
              transferAt: new Date().toISOString()
            };
            sectorRooms[tRoomIndex] = { ...room, beds: newBeds };
            sectorModified = true;
          }
        }

        if (sectorModified) {
          newBedsData[floor][sector] = sectorRooms;
        }
      }
    }

    setBedsData(newBedsData);
    setEditingGrdBed(null);
  };

  const confirmGrdEdit = (grdData, transferTarget) => {
    if (transferTarget) {
      handleTransfer(editingGrdBed.roomId, editingGrdBed.bed.id, transferTarget.roomId, transferTarget.bedId, grdData, transferTarget.type);
    } else {
      updateBedState(editingGrdBed.roomId, editingGrdBed.bed.id, grdData);
      setEditingGrdBed(null);
    }
  };

  const allBeds = [];
  Object.keys(bedsData).forEach(floor => {
    Object.keys(bedsData[floor]).forEach(sector => {
      bedsData[floor][sector].forEach(room => {
        room.beds.forEach(bed => {
          if (bed.status === 'available' || bed.status === 'occupied') {
            allBeds.push({
              id: bed.id,
              roomId: room.roomId,
              roomType: room.roomType,
              type: bed.type,
              tag: bed.tag,
              status: bed.status,
              patient: bed.patient,
              grdId: bed.grdId,
              floor: floor.replace('piso', 'Piso ')
            });
          }
        });
      });
    });
  });

  const formatFloor = (f) => f.replace('piso', 'Piso ');
  const formatSector = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const availableFloors = Object.keys(bedsData).sort((a,b) => a.localeCompare(b));
  const availableSectors = Array.from(new Set(Object.keys(bedsData).flatMap(floor => Object.keys(bedsData[floor]))))
    .sort((a,b) => {
      if (a.toLowerCase() === 'poniente') return -1;
      if (b.toLowerCase() === 'poniente') return 1;
      return a.localeCompare(b);
    });
  const sectorsToRender = selectedSector === 'todos' ? availableSectors : [selectedSector];
  const floorsToRender = selectedFloor === 'todos' ? availableFloors : [selectedFloor];

  return (
    <DndContext 
      sensors={sensors}
      onDragStart={() => setIsDraggingActive(true)}
      onDragEnd={(event) => {
        setIsDraggingActive(false);
        handleDragEnd(event);
      }}
    >
      <div className={`main-layout ${!showFilters ? 'filters-hidden' : ''} ${isDraggingActive ? 'dragging-active' : ''}`}>
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
                {availableFloors.map(floor => (
                  <button key={floor} className={`stack-btn ${selectedFloor === floor ? 'active' : ''}`} onClick={() => setSelectedFloor(floor)} style={{ textTransform: 'capitalize' }}>
                    {floor.replace('piso', 'Piso ')}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div className="sidebar-title" style={{ fontSize: '0.75rem', marginBottom: '12px', color: 'var(--accent-color)' }}>2. VISTA DE SECTORES</div>
              <div className="stack-group">
                <button className={`stack-btn ${selectedSector === 'todos' ? 'active' : ''}`} onClick={() => setSelectedSector('todos')}>Mostrar Ambos</button>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {availableSectors.map(sector => (
                    <button key={sector} className={`stack-btn ${selectedSector === sector ? 'active' : ''}`} onClick={() => setSelectedSector(sector)} style={{ flex: 1, textTransform: 'capitalize' }}>
                      {sector}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div className="sidebar-title" style={{ fontSize: '0.75rem', marginBottom: '12px', color: 'var(--accent-color)' }}>3. ESTADO DE CAMA</div>
              <div className="stack-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                <button className={`stack-btn ${statusFilter === 'todos' ? 'active' : ''}`} style={{ padding: '8px 2px', fontSize: '0.65rem' }} onClick={() => setStatusFilter('todos')}>Todas</button>
                <button className={`stack-btn ${statusFilter === 'available' ? 'active' : ''}`} style={{ padding: '8px 2px', fontSize: '0.65rem' }} onClick={() => setStatusFilter('available')}>Disp.</button>
                <button className={`stack-btn ${statusFilter === 'cleaning' ? 'active' : ''}`} style={{ padding: '8px 2px', fontSize: '0.65rem' }} onClick={() => setStatusFilter('cleaning')}>Aseo</button>
                <button className={`stack-btn ${statusFilter === 'pending_hodom' ? 'active' : ''}`} style={{ padding: '8px 2px', fontSize: '0.65rem' }} onClick={() => setStatusFilter('pending_hodom')}>Pend. HODOM</button>
                <button className={`stack-btn ${statusFilter === 'blocked' ? 'active' : ''}`} style={{ padding: '8px 2px', fontSize: '0.65rem' }} onClick={() => setStatusFilter('blocked')}>Bloq.</button>
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
            <div style={{ marginTop: '20px' }}>
              <div className="sidebar-title" style={{ fontSize: '0.75rem', marginBottom: '12px', color: 'var(--accent-color)' }}>6. IC PENDIENTES</div>
              <select className="glass-input" style={{ width: '100%' }} value={icFilter} onChange={(e) => setIcFilter(e.target.value)}>
                <option value="todos">Todas las Camas</option>
                <option value="con_ic">Todas con IC Pendientes</option>
                {Array.from(new Set(
                  Object.values(bedsData).flatMap(floor => 
                    Object.values(floor).flatMap(sector => 
                      sector.flatMap(room => 
                        room.beds.flatMap(bed => 
                          (bed.interconsultas || []).filter(ic => ic.estado === 'pendiente').map(ic => ic.especialidadDestino)
                        )
                      )
                    )
                  )
                )).sort().map(esp => (
                  <option key={esp} value={`ic_${esp}`}>IC {esp}</option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: '20px' }}>
              <div className="sidebar-title" style={{ fontSize: '0.75rem', marginBottom: '12px', color: 'var(--accent-color)' }}>7. ESPECIALIDAD TRATANTE</div>
              <MultiSearchableSelect 
                options={ESPECIALIDADES.map(e => ({ value: e, label: e }))} 
                value={espTratanteFilter} 
                onChange={setEspTratanteFilter} 
                placeholder="Filtrar especialidad..." 
                maxSelections={5} 
              />
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
                  let matchIc = true;
                  if (icFilter !== 'todos') {
                    const pendingICs = (bed.interconsultas || []).filter(ic => ic.estado === 'pendiente');
                    if (icFilter === 'con_ic') {
                      matchIc = pendingICs.length > 0;
                    } else if (icFilter.startsWith('ic_')) {
                      const esp = icFilter.replace('ic_', '');
                      matchIc = pendingICs.some(ic => ic.especialidadDestino === esp);
                    }
                  }
                  let matchEspTratante = true;
                  if (espTratanteFilter.length > 0) {
                    if (!bed.especialidadTratante || bed.especialidadTratante.length === 0) {
                      matchEspTratante = false;
                    } else {
                      matchEspTratante = espTratanteFilter.some(esp => bed.especialidadTratante.includes(esp));
                    }
                  }
                  let matchSearch = true;
                  if (searchQuery) {
                    const sq = searchQuery.toLowerCase();
                    const bStr = [
                      bed.patient, bed.rut, bed.diagnosis, bed.info, bed.grdName, bed.id, room.roomId,
                      ...(bed.especialidadTratante || []),
                      ...(bed.interconsultas?.map(ic => ic.especialidadDestino) || [])
                    ].filter(Boolean).join(' ').toLowerCase();
                    matchSearch = bStr.includes(sq);
                  }
                  return matchStatus && matchService && matchStay && matchIc && matchEspTratante && matchSearch;
                });
                return { 
                  ...room, 
                  beds: filteredBeds.sort((a,b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true })) 
                };
              }).filter(room => room.beds.length > 0)
                .sort((a,b) => String(b.roomId).localeCompare(String(a.roomId), undefined, { numeric: true }));
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
                            onDischarge={handleDischarge}
                            onFinishCleaning={handleFinishCleaning}
                            onUndoDischarge={handleUndoDischarge}
                            onUndoAssignment={handleUndoAssignment}
                            onMarkHodomDoneByBed={onMarkHodomDoneByBed}
                            onEditGrd={(rId, b) => setEditingGrdBed({ roomId: rId, bed: b })}
                            onBlockBed={(rId, bId) => {
                              const roomData = bedsData[floor][sector].find(r => r.roomId === rId);
                              const bedData = roomData.beds.find(b => b.id === bId);
                              setBlockingBed({ roomId: rId, bed: bedData });
                            }}
                            onUnblockBed={(rId, bId) => {
                              const roomData = bedsData[floor][sector].find(r => r.roomId === rId);
                              const bedData = roomData.beds.find(b => b.id === bId);
                              setUnblockingBed({ roomId: rId, bed: bedData });
                            }}
                            userRole={user.role}
                            user={user}
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
              onViewPatient={onViewPatient}
              onEditPatient={onEditPatient}
              onDischargeWaiting={handleDischargeWaiting}
              selectedPatientId={selectedPatient?.id}
              userRole={userRole}
              searchQuery={searchQuery}
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
            bed={{ ...editingGrdBed.bed, roomId: editingGrdBed.roomId }}
            allBeds={allBeds}
            user={user}
            onConfirm={confirmGrdEdit}
            onClose={() => setEditingGrdBed(null)}
            onDischargeRequest={(b) => {
              setDischargingPatient({ roomId: editingGrdBed.roomId, bed: b });
              setEditingGrdBed(null);
            }}
            onRequestIC={(b) => {
              setRequestingIC({ roomId: editingGrdBed.roomId, bed: b });
              setEditingGrdBed(null);
            }}
            onFinishCleaning={(roomId, bedId) => {
              handleFinishCleaning(editingGrdBed.roomId, bedId);
              setEditingGrdBed(null);
            }}
          />
        )}

        {dischargingPatient && (
          <DischargeModal
            bed={dischargingPatient.bed}
            onConfirm={handleDischargeConfirm}
            onHodomSubmit={onHodomSubmit}
            onClose={() => setDischargingPatient(null)}
          />
        )}

        {requestingIC && (
          <InterconsultaModal
            bed={requestingIC.bed}
            onConfirm={handleInterconsultaConfirm}
            onClose={() => setRequestingIC(null)}
          />
        )}

        {viewingPatient && (
          <PatientDetailModal
            patient={viewingPatient}
            onClose={() => setViewingPatient(null)}
          />
        )}

        {blockingBed && (
          <BlockBedModal
            bed={blockingBed.bed}
            onConfirm={handleBlockConfirm}
            onClose={() => setBlockingBed(null)}
            user={user}
          />
        )}
        
        {unblockingBed && (
          <UnblockBedModal
            bed={unblockingBed.bed}
            onConfirm={handleUnblockConfirm}
            onClose={() => setUnblockingBed(null)}
            user={user}
          />
        )}
      </div>
    </DndContext>
  );
}
