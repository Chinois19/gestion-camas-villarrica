import { useState, useMemo } from 'react';
import { Stethoscope, Clock, Search, AlertTriangle, Users, Eye } from 'lucide-react';
import { matchesSearch as matchUtils } from '../utils/search';
import ViewInterconsultaModal from './ViewInterconsultaModal';

export default function InterconsultasPanel({ bedsData, waitingList, onMarkICDone, userRole }) {
  const isVisor = userRole === 'visor';
  const [filterSpecialty, setFilterSpecialty] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('pendientes');
  const [filterPriorizacion, setFilterPriorizacion] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [resolvingIC, setResolvingIC] = useState(null);
  const [resolvingState, setResolvingState] = useState('realizada');
  const [observaciones, setObservaciones] = useState('');
  const [viewingIC, setViewingIC] = useState(null);

  const allICs = useMemo(() => {
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
                  sector,
                  roomId: room.roomId,
                  bedId: bed.id,
                });
              });
            }
          });
        });
      });
    });
    if (waitingList) {
      waitingList.forEach(patient => {
        if (patient.interconsultas && patient.interconsultas.length > 0) {
          patient.interconsultas.forEach(ic => {
            list.push({
              ...ic,
              patientRut: patient.rut,
              patientName: patient.name || patient.nombre,
              floor: 'Urgencia / Espera',
              sector: 'Sala de Espera',
              roomId: 'Espera',
              bedId: patient.id,
            });
          });
        }
      });
    }
    return list.sort((a, b) => new Date(b.solicitadaAt) - new Date(a.solicitadaAt));
  }, [bedsData, waitingList]);

  const calculateWaitTimeMinutes = (solicitadaAt) =>
    Math.floor((new Date() - new Date(solicitadaAt)) / 60000);

  const formatWaitTime = (minutes) => {
    if (isNaN(minutes) || minutes < 0) return '00:00';
    const h = Math.floor(Math.round(minutes) / 60);
    const m = Math.round(minutes) % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
  const totalPending = pendingList.length;
  const avgWaitMinutes = totalPending > 0
    ? pendingList.reduce((acc, ic) => acc + calculateWaitTimeMinutes(ic.solicitadaAt), 0) / totalPending
    : 0;

  const specialtyWaitMap = {};
  pendingList.forEach(ic => {
    if (!specialtyWaitMap[ic.especialidadDestino])
      specialtyWaitMap[ic.especialidadDestino] = { count: 0, totalWait: 0 };
    specialtyWaitMap[ic.especialidadDestino].count++;
    specialtyWaitMap[ic.especialidadDestino].totalWait += calculateWaitTimeMinutes(ic.solicitadaAt);
  });

  let topSpecialty = { name: '-', wait: 0, count: 0 };
  Object.keys(specialtyWaitMap).forEach(sp => {
    const avg = specialtyWaitMap[sp].totalWait / specialtyWaitMap[sp].count;
    if (avg > topSpecialty.wait)
      topSpecialty = { name: sp, wait: avg, count: specialtyWaitMap[sp].count };
  });

  const specialties = Array.from(new Set(allICs.map(ic => ic.especialidadDestino))).sort();

  const filteredICs = allICs.filter(ic => {
    const isPending = ic.estado === 'pendiente';
    const matchesStatus =
      filterStatus === 'todos' ||
      (filterStatus === 'pendientes' && isPending) ||
      (filterStatus === 'historial' && !isPending);
    const matchesSpecialty = filterSpecialty === 'todos' || ic.especialidadDestino === filterSpecialty;
    const matchesPriorizacion = filterPriorizacion === 'todas' || ic.priorizacion === filterPriorizacion;
    const matchesSearchVal =
      matchUtils(ic.patientName, searchTerm) ||
      matchUtils(ic.especialidadDestino, searchTerm) ||
      (ic.patientRut && matchUtils(ic.patientRut, searchTerm));
    return matchesStatus && matchesSpecialty && matchesPriorizacion && matchesSearchVal;
  });

  const groupedICs = filteredICs.reduce((acc, ic) => {
    if (!acc[ic.especialidadDestino]) acc[ic.especialidadDestino] = [];
    acc[ic.especialidadDestino].push(ic);
    return acc;
  }, {});

  /* ── Badge de estado ── usa variables de tema ─────────────── */
  const getStatusBadge = (estado) => {
    const base = { padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, border: '1px solid' };
    if (estado === 'pendiente')
      return <span style={{ ...base, background: 'rgba(245,158,11,0.15)', color: 'var(--color-warn, #b45309)', borderColor: 'rgba(245,158,11,0.35)' }}>En Espera</span>;
    if (estado === 'realizada')
      return <span style={{ ...base, background: 'rgba(37,99,235,0.12)', color: 'var(--accent)', borderColor: 'var(--accent-border)' }}>Atención Realizada</span>;
    if (estado === 'no_pertinente')
      return <span style={{ ...base, background: 'rgba(249,115,22,0.12)', color: 'var(--color-warn, #c2410c)', borderColor: 'rgba(249,115,22,0.3)' }}>Desestimada</span>;
    if (estado === 'eliminada')
      return <span style={{ ...base, background: 'rgba(239,68,68,0.12)', color: '#dc2626', borderColor: 'rgba(239,68,68,0.3)' }}>Eliminada</span>;
    return <span style={{ ...base, background: 'var(--glass-3)', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>{estado}</span>;
  };

  return (
    <div style={{ padding: '24px', minHeight: '100%', position: 'relative' }}>

      {/* ── KPI cards ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {[
          {
            icon: <Users size={32} color="var(--accent)" />,
            iconBg: 'var(--accent-dim)',
            label: 'TOTAL EN ESPERA',
            value: totalPending,
            sub: null,
          },
          {
            icon: <Clock size={32} color="var(--color-warn, #b45309)" />,
            iconBg: 'rgba(245,158,11,0.12)',
            label: 'TIEMPO PROMEDIO GENERAL',
            value: formatWaitTime(avgWaitMinutes),
            sub: null,
          },
          {
            icon: <AlertTriangle size={32} color="#dc2626" />,
            iconBg: 'rgba(239,68,68,0.12)',
            label: `MAYOR DEMORA (${topSpecialty.name})`,
            value: formatWaitTime(topSpecialty.wait),
            sub: `${topSpecialty.count} paciente(s)`,
          },
        ].map((card, i) => (
          <div key={i} className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: card.iconBg, padding: '16px', borderRadius: '50%', flexShrink: 0 }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {card.value}
              </div>
              {card.sub && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{card.sub}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Header flotante ───────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'var(--accent-dim)', padding: '12px', borderRadius: '12px', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
            <Stethoscope size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Gestión de Interconsultas
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, marginTop: '3px' }}>
              Control y resolución de evaluaciones
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar paciente o RUT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input"
              style={{ paddingLeft: '34px', fontSize: '0.85rem' }}
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="glass-input" style={{ width: 'auto', fontSize: '0.85rem' }}>
            <option value="pendientes">Solo Pendientes</option>
            <option value="historial">Historial (Resueltas)</option>
            <option value="todos">Ver Todas</option>
          </select>
          <select value={filterSpecialty} onChange={(e) => setFilterSpecialty(e.target.value)} className="glass-input" style={{ width: 'auto', fontSize: '0.85rem' }}>
            <option value="todos">Todas las Especialidades</option>
            {specialties.map(esp => <option key={esp} value={esp}>{esp}</option>)}
          </select>
          <select value={filterPriorizacion} onChange={(e) => setFilterPriorizacion(e.target.value)} className="glass-input" style={{ width: 'auto', fontSize: '0.85rem' }}>
            <option value="todas">Todas las Prioridades</option>
            <option value="URGENTE">Urgente</option>
            <option value="DIFERIDA">Diferida</option>
          </select>
        </div>
      </div>

      {/* ── Tabla de ICs ──────────────────────────────────────── */}
      {Object.keys(groupedICs).length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', border: '1px dashed var(--border-light)' }}>
          <Stethoscope size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <h3 style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No hay interconsultas para mostrar</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {Object.entries(groupedICs).sort(([a], [b]) => a.localeCompare(b)).map(([especialidad, ics]) => (
            <div key={especialidad} className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
              {/* Cabecera grupo */}
              <div style={{ padding: '12px 20px', background: 'var(--glass-2)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '4px', height: '22px', background: 'var(--accent)', borderRadius: '4px' }} />
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {especialidad} <span style={{ opacity: 0.55, fontSize: '0.85rem', fontWeight: 500 }}>({ics.length} registros)</span>
                </h3>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--glass-2)' }}>
                      {['PACIENTE / UBICACIÓN', 'ESPERA', 'SOLICITADO POR', 'MOTIVO', 'ESTADO ACTUAL', 'ACCIONES'].map((h, i) => (
                        <th key={h} style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', borderBottom: '1px solid var(--border-subtle)', textAlign: i === 5 ? 'right' : 'left' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ics.map(ic => (
                      <tr
                        key={ic.id}
                        style={{ borderBottom: '1px solid var(--border-subtle)', opacity: ic.estado !== 'pendiente' ? 0.72 : 1, transition: 'background 0.18s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>{ic.patientName}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '2px' }}>RUN: {ic.patientRut || 'S/N'}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{ic.floor} — {ic.sector} — Hab. {ic.roomId} — Cama {ic.bedId}</div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-warn, #b45309)', fontWeight: 700, fontSize: '0.9rem' }}>
                            <Clock size={15} />
                            {ic.estado === 'pendiente' ? formatWaitTime(calculateWaitTimeMinutes(ic.solicitadaAt)) : '—'}
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{ic.profesionalDeriva}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{new Date(ic.solicitadaAt).toLocaleString('es-CL')}</div>
                        </td>
                        <td style={{ padding: '10px 16px', maxWidth: '280px' }}>
                          <div style={{ background: 'var(--glass-3)', padding: '6px 10px', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: '1.4' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                              <strong style={{ color: 'var(--accent)' }}>{ic.tipoRequerimiento}</strong>
                              {ic.priorizacion && (
                                <span style={{
                                  fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.05em',
                                  background: ic.priorizacion === 'URGENTE' ? 'rgba(239,68,68,0.14)' : 'var(--accent-dim)',
                                  color: ic.priorizacion === 'URGENTE' ? '#dc2626' : 'var(--accent)',
                                  border: `1px solid ${ic.priorizacion === 'URGENTE' ? 'rgba(239,68,68,0.3)' : 'var(--accent-border)'}`
                                }}>
                                  {ic.priorizacion}
                                </span>
                              )}
                            </div>
                            {ic.resumenHistoria?.substring(0, 70)}{ic.resumenHistoria?.length > 70 ? '...' : ''}
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {getStatusBadge(ic.estado)}
                          {ic.estado !== 'pendiente' && ic.observaciones && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', fontStyle: 'italic', maxWidth: '180px' }}>
                              "{ic.observaciones}"
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                            <button
                              className="glass-button primary"
                              style={{ width: '136px', fontSize: '0.8rem', padding: '6px 12px' }}
                              onClick={() => setViewingIC(ic)}
                            >
                              <Eye size={13} /> Ver Detalle
                            </button>
                            {ic.estado === 'pendiente' && !isVisor && (
                              <>
                                <button
                                  className="glass-button"
                                  style={{ width: '136px', fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(37,99,235,0.12)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
                                  onClick={() => openResolveModal(ic, 'realizada')}
                                >
                                  Atención Realizada
                                </button>
                                <button
                                  className="glass-button"
                                  style={{ width: '136px', fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(249,115,22,0.10)', borderColor: 'rgba(249,115,22,0.35)', color: 'var(--color-warn, #c2410c)' }}
                                  onClick={() => openResolveModal(ic, 'no_pertinente')}
                                >
                                  Desestima
                                </button>
                              </>
                            )}
                          </div>
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

      {/* ── Modal de resolución ───────────────────────────────── */}
      {resolvingIC && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ width: 'min(90vw,520px)', padding: '32px', boxShadow: 'var(--shadow-high)' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {resolvingState === 'realizada' ? 'Atención Realizada' : 'Desestimar IC'}
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Paciente: <strong style={{ color: 'var(--text-primary)' }}>{resolvingIC.patientName}</strong> ({resolvingIC.especialidadDestino})
            </p>
            <form onSubmit={handleResolveSubmit}>
              <div style={{ marginBottom: '28px' }}>
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  Observaciones Obligatorias <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder={resolvingState === 'realizada' ? 'Detalle la resolución, atenciones o notas médicas...' : 'Indique el motivo por el cual se descarta o elimina...'}
                  className="glass-input"
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                  Se guardará con su usuario y la hora actual.
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
                <button type="button" onClick={() => setResolvingIC(null)} className="glass-button">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={observaciones.trim() === ''}
                  className="glass-button primary"
                  style={{ opacity: observaciones.trim() === '' ? 0.5 : 1, cursor: observaciones.trim() === '' ? 'not-allowed' : 'pointer' }}
                >
                  Confirmar y Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingIC && (
        <ViewInterconsultaModal ic={viewingIC} onClose={() => setViewingIC(null)} />
      )}
    </div>
  );
}
