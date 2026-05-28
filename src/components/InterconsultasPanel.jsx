import { useState, useEffect } from 'react';
import { Stethoscope, Clock, Search, CheckCircle, XCircle, Trash2, Activity, AlertTriangle, Users } from 'lucide-react';

export default function InterconsultasPanel({ bedsData, onMarkICDone, onDeleteIC, userRole }) {
  const isVisor = userRole === 'visor';
  const [allICs, setAllICs] = useState([]);
  const [filterSpecialty, setFilterSpecialty] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('pendientes'); // 'pendientes', 'historial', 'todos'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Resolution Modal State
  const [resolvingIC, setResolvingIC] = useState(null);
  const [resolvingState, setResolvingState] = useState('realizada'); // 'realizada', 'no_pertinente', 'eliminada'
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    const list = [];
    Object.keys(bedsData).forEach(floor => {
      Object.keys(bedsData[floor]).forEach(sector => {
        bedsData[floor][sector].forEach(room => {
          room.beds.forEach(bed => {
            if (bed.interconsultas && bed.interconsultas.length > 0) {
              bed.interconsultas.forEach(ic => {
                list.push({
                  ...ic,
                  patientRut: bed.rut,
                  patientName: bed.patient,
                  floor: floor.replace('piso', 'Piso '),
                  sector: sector,
                  roomId: room.roomId,
                  bedId: bed.id,
                });
              });
            }
          });
        });
      });
    });
    // Ordenar por fecha de solicitud descendente (nuevas primero)
    list.sort((a, b) => new Date(b.solicitadaAt) - new Date(a.solicitadaAt));
    setAllICs(list);
  }, [bedsData]);

  const calculateWaitTimeMinutes = (solicitadaAt) => {
    return Math.floor((new Date() - new Date(solicitadaAt)) / 60000);
  };

  const formatWaitTime = (minutes) => {
    if (isNaN(minutes) || minutes < 0) return "00:00";
    const totalMins = Math.round(minutes);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const handleResolveSubmit = (e) => {
    e.preventDefault();
    if (resolvingIC && observaciones.trim() !== '') {
      onMarkICDone(resolvingIC.roomId, resolvingIC.bedId, resolvingIC.id, resolvingState, observaciones);
      setResolvingIC(null);
      setObservaciones('');
    }
  };

  const openResolveModal = (ic, state) => {
    setResolvingIC(ic);
    setResolvingState(state);
    setObservaciones('');
  };

  const pendingList = allICs.filter(ic => ic.estado === 'pendiente');
  
  // INSIGHTS CALCULATION
  const totalPending = pendingList.length;
  const avgWaitMinutes = totalPending > 0 ? pendingList.reduce((acc, ic) => acc + calculateWaitTimeMinutes(ic.solicitadaAt), 0) / totalPending : 0;
  
  const specialtyWaitMap = {};
  pendingList.forEach(ic => {
    if (!specialtyWaitMap[ic.especialidadDestino]) specialtyWaitMap[ic.especialidadDestino] = { count: 0, totalWait: 0 };
    specialtyWaitMap[ic.especialidadDestino].count++;
    specialtyWaitMap[ic.especialidadDestino].totalWait += calculateWaitTimeMinutes(ic.solicitadaAt);
  });
  
  let topSpecialty = { name: '-', wait: 0, count: 0 };
  Object.keys(specialtyWaitMap).forEach(sp => {
    const avg = specialtyWaitMap[sp].totalWait / specialtyWaitMap[sp].count;
    if (avg > topSpecialty.wait) {
      topSpecialty = { name: sp, wait: avg, count: specialtyWaitMap[sp].count };
    }
  });

  const specialties = Array.from(new Set(allICs.map(ic => ic.especialidadDestino))).sort();

  const filteredICs = allICs.filter(ic => {
    const isPending = ic.estado === 'pendiente';
    const matchesStatus = filterStatus === 'todos' || (filterStatus === 'pendientes' && isPending) || (filterStatus === 'historial' && !isPending);
    const matchesSpecialty = filterSpecialty === 'todos' || ic.especialidadDestino === filterSpecialty;
    const matchesSearch = ic.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ic.especialidadDestino.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (ic.patientRut && ic.patientRut.includes(searchTerm));
    return matchesStatus && matchesSpecialty && matchesSearch;
  });

  // Agrupar por especialidad
  const groupedICs = filteredICs.reduce((acc, ic) => {
    if (!acc[ic.especialidadDestino]) acc[ic.especialidadDestino] = [];
    acc[ic.especialidadDestino].push(ic);
    return acc;
  }, {});

  const getStatusBadge = (estado) => {
    if (estado === 'pendiente') return <span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.3)' }}>En Espera</span>;
    if (estado === 'realizada') return <span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, background: 'rgba(34, 197, 94, 0.2)', color: '#86efac', border: '1px solid rgba(34, 197, 94, 0.3)' }}>Atención Realizada</span>;
    if (estado === 'no_pertinente') return <span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, background: 'rgba(249, 115, 22, 0.2)', color: '#fdba74', border: '1px solid rgba(249, 115, 22, 0.3)' }}>Desestimada</span>;
    if (estado === 'eliminada') return <span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>Eliminada</span>;
    return <span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, background: 'rgba(255, 255, 255, 0.1)', color: '#fff' }}>{estado}</span>;
  };

  return (
    <div style={{ padding: '24px', minHeight: '100%', position: 'relative' }}>

      {/* Tarjetas Inteligentes (Insights) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '16px', borderRadius: '50%' }}>
            <Users size={32} color="#60a5fa" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL EN ESPERA</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{totalPending}</div>
          </div>
        </div>
        
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '16px', borderRadius: '50%' }}>
            <Clock size={32} color="#fbbf24" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>TIEMPO PROMEDIO GENERAL</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{formatWaitTime(avgWaitMinutes)}</div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '50%' }}>
            <AlertTriangle size={32} color="#f87171" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>MAYOR DEMORA ({topSpecialty.name})</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{formatWaitTime(topSpecialty.wait)}</div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{topSpecialty.count} paciente(s)</div>
          </div>
        </div>
      </div>

      {/* Header flotante */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '12px', color: '#60a5fa' }}>
            <Stethoscope size={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Gestión de Interconsultas</h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, marginTop: '4px' }}>Control y resolución de evaluaciones</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Buscar paciente o RUT..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '10px 10px 10px 36px',
                background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px', color: '#fff', fontSize: '0.85rem'
              }}
            />
          </div>
          
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '10px 16px', background: 'rgba(255, 255, 255, 0.9)', border: 'none',
              borderRadius: '8px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            <option value="pendientes">Solo Pendientes</option>
            <option value="historial">Historial (Resueltas)</option>
            <option value="todos">Ver Todas</option>
          </select>

          <select 
            value={filterSpecialty}
            onChange={(e) => setFilterSpecialty(e.target.value)}
            style={{
              padding: '10px 16px', background: 'rgba(255, 255, 255, 0.9)', border: 'none',
              borderRadius: '8px', color: '#0f172a', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            <option value="todos">Todas las Especialidades</option>
            {specialties.map(esp => <option key={esp} value={esp}>{esp}</option>)}
          </select>
        </div>
      </div>

      {/* Contenedor de Grupos */}
      {Object.keys(groupedICs).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Stethoscope size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3>No hay interconsultas para mostrar</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {Object.entries(groupedICs).sort(([a], [b]) => a.localeCompare(b)).map(([especialidad, ics]) => (
            <div key={especialidad} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ 
                padding: '12px 20px', 
                background: 'rgba(255, 255, 255, 0.03)', 
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                <div style={{ width: '4px', height: '24px', background: '#3b82f6', borderRadius: '4px' }} />
                <h3 style={{ margin: 0, color: '#e0f2fe', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {especialidad} <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>({ics.length} registros)</span>
                </h3>
              </div>
              
              <div style={{ overflowX: 'auto', padding: '0 8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '12px 16px', color: '#93c5fd', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>PACIENTE / UBICACIÓN</th>
                      <th style={{ padding: '12px 16px', color: '#93c5fd', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>ESPERA</th>
                      <th style={{ padding: '12px 16px', color: '#93c5fd', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>SOLICITADO POR</th>
                      <th style={{ padding: '12px 16px', color: '#93c5fd', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>MOTIVO</th>
                      <th style={{ padding: '12px 16px', color: '#93c5fd', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>ESTADO ACTUAL</th>
                      <th style={{ padding: '12px 16px', color: '#93c5fd', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ics.map(ic => (
                      <tr key={ic.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', opacity: ic.estado !== 'pendiente' ? 0.7 : 1 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '1rem', marginBottom: '2px' }}>{ic.patientName}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '2px' }}>RUN: {ic.patientRut || 'S/N'}</div>
                          <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{ic.floor} — {ic.sector} — Hab. {ic.roomId} — Cama {ic.bedId}</div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fcd34d', fontWeight: 700, fontSize: '0.95rem' }}>
                            <Clock size={16} /> {ic.estado === 'pendiente' ? formatWaitTime(calculateWaitTimeMinutes(ic.solicitadaAt)) : '-'}
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '0.95rem' }}>{ic.profesionalDeriva}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{new Date(ic.solicitadaAt).toLocaleString('es-CL')}</div>
                        </td>
                        <td style={{ padding: '10px 16px', maxWidth: '300px' }}>
                          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.9rem', lineHeight: '1.4' }}>
                            <strong style={{ color: '#60a5fa', display: 'block', marginBottom: '2px' }}>{ic.tipoRequerimiento}</strong>
                            {ic.resumenHistoria?.substring(0, 70)}{ic.resumenHistoria?.length > 70 ? '...' : ''}
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {getStatusBadge(ic.estado)}
                          {ic.estado !== 'pendiente' && ic.observaciones && (
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px', fontStyle: 'italic', maxWidth: '180px' }}>
                              "{ic.observaciones}"
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          {ic.estado === 'pendiente' && !isVisor && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                              <button 
                                style={{ padding: '6px 16px', width: '140px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                                onClick={() => openResolveModal(ic, 'realizada')}
                              >
                                Atención Realizada
                              </button>
                              <button 
                                style={{ padding: '6px 16px', width: '140px', background: '#f97316', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
                                onClick={() => openResolveModal(ic, 'no_pertinente')}
                              >
                                Desestima
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* RESOLUTION MODAL */}
      {resolvingIC && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 'min(90vw, 550px)', background: '#1e293b', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '20px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              {resolvingState === 'realizada' ? 'Atención Realizada' : 'Desestimar IC'}
            </h3>
            <p style={{ fontSize: '0.95rem', color: '#cbd5e1', marginBottom: '24px' }}>
              Paciente: <strong style={{ color: '#fff' }}>{resolvingIC.patientName}</strong> ({resolvingIC.especialidadDestino})
            </p>
            
            <form onSubmit={handleResolveSubmit}>
              <div style={{ marginBottom: '32px' }}>
                <label style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  Observaciones Obligatorias <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <textarea 
                  rows="4" 
                  required 
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder={resolvingState === 'realizada' ? "Detalle la resolución, atenciones o notas médicas..." : "Indique el motivo por el cual se descarta o elimina..."}
                  style={{
                    width: '100%', padding: '16px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px', color: '#fff', fontSize: '1rem', resize: 'vertical', fontFamily: 'inherit'
                  }}
                ></textarea>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic' }}>
                  Se guardará con su usuario y la hora actual.
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button type="button" onClick={() => setResolvingIC(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#4c1d95', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={observaciones.trim() === ''} style={{ padding: '10px 24px', background: resolvingState === 'realizada' ? '#22c55e' : '#f97316', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: observaciones.trim() === '' ? 'not-allowed' : 'pointer', opacity: observaciones.trim() === '' ? 0.5 : 1 }}>
                  Confirmar y Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
