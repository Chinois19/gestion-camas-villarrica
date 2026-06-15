import { useState, useMemo } from 'react';
import { Lock, Download, Edit2, AlertTriangle, Filter, Search, RefreshCw, X, Save, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import './DatabasePanel.css';

/* ─── Causales (must match BlockBedModal) ──────────────────────── */
const CAUSALES = [
  'Recursos Humanos',
  'Equipamiento Médico',
  'Infraestructura',
  'Causales asociadas al paciente Salud Mental',
  'Infecciones Asociadas a la Atención de la Salud',
];

/* ─── Helpers ───────────────────────────────────────────────────── */
const parseDate = (val) => {
  if (!val) return null;
  // dd/mm/yyyy hh:mm
  const m = String(val).match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00`);
  try { const d = new Date(val); if (!isNaN(d)) return d; } catch {}
  return null;
};

const fmt = (isoOrStr) => {
  const d = parseDate(isoOrStr);
  if (!d) return '—';
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtFull = (isoOrStr) => {
  const d = parseDate(isoOrStr);
  if (!d) return '—';
  return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/* Cut-off: 17:00 of yesterday (local time) */
const getFreezeTimestamp = () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(17, 0, 0, 0);
  return yesterday;
};

/* Is this record "frozen" (date ≤ 17:00 yesterday)? */
const isFrozen = (record) => {
  const d = parseDate(record.blockedAt);
  if (!d) return false;
  return d <= getFreezeTimestamp();
};

/* ─── Edit Modal ────────────────────────────────────────────────── */
function EditBlockModal({ record, onClose, onSave }) {
  const [form, setForm] = useState({
    causal: record.causal || '',
    observation: record.observation || '',
    cama: record.cama || '',
    servicio: record.servicio || '',
    blockedAt: record.blockedAt || '',
    unblockedAt: record.unblockedAt || '',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-panel" style={{
        width: 'min(96vw, 620px)', padding: '28px', background: 'var(--panel-bg)',
        borderRadius: '16px', border: '1px solid rgba(239,68,68,0.35)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
      }}>
        {/* Warning banner */}
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
          display: 'flex', gap: '10px', alignItems: 'flex-start'
        }}>
          <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#fca5a5', lineHeight: 1.5 }}>
            <strong>Modificación Retroactiva.</strong> Todo reporte retroactivo debe ser informado a{' '}
            <strong>Estadística de Atención Cerrada del Depto. de Gestión de Información</strong>{' '}
            para las respectivas modificaciones en aplicativos de censo diario.
          </p>
        </div>

        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Edit2 size={18} color="#ef4444" /> Editar Registro de Bloqueo
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Cama</label>
            <input className="glass-input" name="cama" value={form.cama} onChange={handleChange}
              style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Servicio</label>
            <input className="glass-input" name="servicio" value={form.servicio} onChange={handleChange}
              style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Fecha Bloqueo</label>
            <input className="glass-input" name="blockedAt" value={form.blockedAt} onChange={handleChange}
              style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Fecha Desbloqueo</label>
            <input className="glass-input" name="unblockedAt" value={form.unblockedAt} onChange={handleChange}
              style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
              placeholder="—" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Causal del Bloqueo</label>
            <select className="glass-input" name="causal" value={form.causal} onChange={handleChange}
              style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}>
              <option value="">-- Seleccione --</option>
              {CAUSALES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Observación</label>
            <textarea className="glass-input" name="observation" value={form.observation} onChange={handleChange}
              rows={3} style={{ width: '100%', marginTop: 4, boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="glass-button" onClick={onClose} style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <X size={15} /> Cancelar
          </button>
          <button className="glass-button primary" onClick={() => onSave(form)}
            style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6, background: '#ef4444', borderColor: '#ef4444' }}>
            <Save size={15} /> Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Causal badge column helper ───────────────────────────────── */
const CAUSAL_COLS = CAUSALES.map((c, i) => ({
  key: `causal_${i}`,
  label: c,
}));

/* ─── Main Component ────────────────────────────────────────────── */
export default function BlockedBedsReportPanel({ blockLog, setBlockLog, userRole }) {
  const [search, setSearch] = useState('');
  const [filterCausal, setFilterCausal] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [savedToast, setSavedToast] = useState(false);

  const canEdit = userRole === 'superadmin' || userRole === 'gestor_camas';

  /* ── Filter & sort data ── */
  const rows = useMemo(() => {
    // Only from June 2025 onwards
    const june2025 = new Date('2025-06-01T00:00:00');
    let data = (blockLog || []).filter(r => {
      const d = parseDate(r.blockedAt);
      return d && d >= june2025;
    });

    if (filterCausal !== 'all') {
      data = data.filter(r => r.causal === filterCausal);
    }
    if (filterMonth) {
      data = data.filter(r => {
        const d = parseDate(r.blockedAt);
        if (!d) return false;
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return ym === filterMonth;
      });
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      data = data.filter(r =>
        (r.cama || '').toLowerCase().includes(s) ||
        (r.servicio || '').toLowerCase().includes(s) ||
        (r.causal || '').toLowerCase().includes(s) ||
        (r.observation || '').toLowerCase().includes(s)
      );
    }

    return [...data].sort((a, b) => {
      const da = parseDate(a.blockedAt);
      const db = parseDate(b.blockedAt);
      return (db || 0) - (da || 0);
    });
  }, [blockLog, search, filterCausal, filterMonth]);

  /* ── Handle manual save ── */
  const handleSave = (updated) => {
    setBlockLog(prev => prev.map(r => r.id === editingRow.id ? { ...r, ...updated, _manualEdit: true, _editedAt: new Date().toISOString() } : r));
    setEditingRow(null);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 5000);
  };

  /* ── Export XLSX ── */
  const handleExport = () => {
    const headers = ['Fecha Bloqueo', 'Fecha Desbloqueo', 'Cama', 'Servicio', ...CAUSALES, 'Observación', 'Bloqueado por', 'Estado'];
    const sheetData = [headers, ...rows.map(r => [
      fmtFull(r.blockedAt),
      fmtFull(r.unblockedAt) !== '—' ? fmtFull(r.unblockedAt) : '',
      r.cama || '',
      r.servicio || '',
      ...CAUSALES.map(c => c === r.causal ? '✓' : ''),
      r.observation || '',
      r.blockedBy || '',
      r.unblockedAt ? 'Desbloqueada' : 'Bloqueada'
    ])];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Camas Bloqueadas');
    XLSX.writeFile(wb, `informe_camas_bloqueadas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  /* ── Stats summary ── */
  const stats = useMemo(() => {
    const total = rows.length;
    const activos = rows.filter(r => !r.unblockedAt).length;
    const byReason = {};
    CAUSALES.forEach(c => { byReason[c] = 0; });
    rows.forEach(r => { if (r.causal) byReason[r.causal] = (byReason[r.causal] || 0) + 1; });
    return { total, activos, byReason };
  }, [rows]);

  const freezeTS = getFreezeTimestamp();

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Toast */}
      {savedToast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 99999,
          background: '#16a34a', color: '#fff', borderRadius: 12, padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeInDown 0.3s ease'
        }}>
          <CheckCircle size={18} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Registro actualizado</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>
              Recuerde informar a Estadística de Atención Cerrada del Depto. de Gestión de Información.
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="avatar" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Lock size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Informe de Camas Bloqueadas
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Registro histórico desde Junio 2025 · Congela datos a las 17:00 del día anterior
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            fontSize: '0.72rem', padding: '5px 12px', borderRadius: 8,
            background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <RefreshCw size={12} />
            Congelado al: {freezeTS.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          <button className="glass-button primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={15} /> Exportar XLSX
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Registros</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, marginTop: 4 }}>{stats.total}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>desde jun 2025</div>
        </div>
        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actualmente Bloqueadas</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', lineHeight: 1.2, marginTop: 4 }}>{stats.activos}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>sin fecha de desbloqueo</div>
        </div>
        {Object.entries(stats.byReason).slice(0, 3).map(([reason, count]) => (
          <div key={reason} className="glass-panel" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.3 }}>
              {reason}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f97316', lineHeight: 1.2, marginTop: 4 }}>{count}</div>
          </div>
        ))}
      </div>

      {/* ── FILTERS ── */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="glass-input" placeholder="Buscar cama, servicio, causal..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 36, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color="var(--text-secondary)" />
          <select className="glass-input" value={filterCausal} onChange={e => setFilterCausal(e.target.value)} style={{ minWidth: 220 }}>
            <option value="all">Todas las causales</option>
            {CAUSALES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <input type="month" className="glass-input" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          style={{ minWidth: 160 }} title="Filtrar por mes" />
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          {rows.length} registro{rows.length !== 1 ? 's' : ''} encontrado{rows.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Lock size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div>No hay registros de bloqueo para el período seleccionado.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                {/* Group header row */}
                <tr style={{ background: 'rgba(239,68,68,0.12)' }}>
                  <th colSpan={3} style={{ ...thGroupStyle, borderRight: '2px solid rgba(239,68,68,0.3)' }}>
                    📋 Identificación
                  </th>
                  <th colSpan={CAUSALES.length} style={{ ...thGroupStyle, background: 'rgba(168,85,247,0.12)', color: '#c084fc', borderRight: '2px solid rgba(168,85,247,0.3)' }}>
                    🔒 Causal del Bloqueo
                  </th>
                  <th colSpan={canEdit ? 4 : 3} style={{ ...thGroupStyle, background: 'rgba(14,165,233,0.08)', color: '#38bdf8' }}>
                    📊 Estado y Gestión
                  </th>
                </tr>
                {/* Column header row */}
                <tr style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '2px solid rgba(239,68,68,0.25)' }}>
                  <th style={thFixed}>Fecha Bloqueo</th>
                  <th style={thFixed}>Cama</th>
                  <th style={{ ...thFixed, borderRight: '2px solid rgba(239,68,68,0.25)' }}>Servicio</th>
                  {CAUSALES.map((c, i) => (
                    <th key={i} style={{
                      ...thRotated,
                      borderRight: i === CAUSALES.length - 1 ? '2px solid rgba(168,85,247,0.25)' : '1px solid rgba(168,85,247,0.1)',
                    }}>
                      <div style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        whiteSpace: 'nowrap',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#c084fc',
                        letterSpacing: '0.04em',
                        padding: '8px 4px',
                        maxHeight: 130,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {c}
                      </div>
                    </th>
                  ))}
                  <th style={thFixed}>Observación</th>
                  <th style={thFixed}>Bloqueado por</th>
                  <th style={thFixed}>Desbloqueo</th>
                  <th style={thFixed}>Estado</th>
                  {canEdit && <th style={thFixed}>Acc.</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const frozen = isFrozen(r);
                  const isActive = !r.unblockedAt;
                  return (
                    <tr key={r.id || idx} style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.013)',
                      transition: 'background 0.15s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.013)'}
                    >
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>{fmtFull(r.blockedAt)}</span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {r._manualEdit && (
                              <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: 4, background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)', fontWeight: 700 }}>EDITADO</span>
                            )}
                            {!frozen && (
                              <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: 4, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', fontWeight: 700 }}>EN VIVO</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{r.cama || '—'}</td>
                      <td style={{ ...tdStyle, borderRight: '2px solid rgba(239,68,68,0.15)', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{r.servicio || '—'}</td>
                      {CAUSALES.map((c, i) => (
                        <td key={i} style={{
                          ...tdStyle, textAlign: 'center',
                          borderRight: i === CAUSALES.length - 1 ? '2px solid rgba(168,85,247,0.15)' : '1px solid rgba(168,85,247,0.07)',
                          background: r.causal === c ? 'rgba(168,85,247,0.06)' : 'transparent'
                        }}>
                          {r.causal === c ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 22, height: 22, borderRadius: '50%',
                              background: 'rgba(168,85,247,0.2)', border: '1.5px solid rgba(168,85,247,0.5)',
                              color: '#c084fc', fontSize: '0.8rem', fontWeight: 800
                            }}>✓</span>
                          ) : (
                            <span style={{ color: 'var(--border-subtle)', fontSize: '1rem' }}>·</span>
                          )}
                        </td>
                      ))}
                      <td style={{ ...tdStyle, maxWidth: 180, fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: r.observation ? 'normal' : 'italic' }}>
                        {r.observation || 'Sin observación'}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.blockedBy || '—'}</td>
                      <td style={{ ...tdStyle, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {r.unblockedAt ? fmtFull(r.unblockedAt) : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin desbloqueo</span>}
                      </td>
                      <td style={{ ...tdStyle }}>
                        {isActive ? (
                          <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: 6, fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', whiteSpace: 'nowrap' }}>🔒 Bloqueada</span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: 6, fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', whiteSpace: 'nowrap' }}>✓ Libre</span>
                        )}
                      </td>
                      {canEdit && (
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <button
                            onClick={() => setEditingRow(r)}
                            style={{
                              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
                              color: '#fb923c', borderRadius: 6, padding: '5px 9px', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700,
                              transition: 'all 0.2s'
                            }}
                            title="Editar registro"
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(249,115,22,0.1)'}
                          >
                            <Edit2 size={12} /> Editar
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── RETROACTIVE NOTE ── */}
      <div style={{
        padding: '14px 18px', borderRadius: 12, fontSize: '0.8rem', color: '#fbbf24',
        background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
        display: 'flex', gap: 10, alignItems: 'flex-start'
      }}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Los registros se congelan a las <strong>17:00 del día anterior</strong>. Los datos del día actual se presentan
          en tiempo real y quedarán congelados automáticamente a las 17:00 de hoy.
          Cualquier modificación retroactiva por parte de <strong>Super Administrador o Gestor de Camas</strong> debe
          ser comunicada a <strong>Estadística de Atención Cerrada del Depto. de Gestión de Información</strong>.
        </span>
      </div>

      {/* Edit modal */}
      {editingRow && (
        <EditBlockModal
          record={editingRow}
          onClose={() => setEditingRow(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

/* ─── Styles ────────────────────────────────────────────────────── */
const thGroupStyle = {
  padding: '7px 14px',
  textAlign: 'center',
  fontSize: '0.7rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#fca5a5',
  borderBottom: '1px solid rgba(239,68,68,0.2)',
};

const thFixed = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '10px 14px',
  verticalAlign: 'middle',
  color: 'var(--text-primary)',
};
