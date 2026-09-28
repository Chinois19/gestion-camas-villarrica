import { useState, useEffect, useRef } from 'react';

/**
 * Pill badge con panel desplegable de actualizaciones.
 * - Click sobre el pill → abre/cierra el panel.
 * - Click fuera del componente → cierra el panel.
 * - Tecla Escape → cierra el panel.
 * - En impresión el panel se muestra siempre (CSS @media print).
 */
export default function ActualizacionPill({ actualizacion }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick, true);
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [open]);

  // Normalizar a array
  const entries = Array.isArray(actualizacion)
    ? actualizacion
    : actualizacion
      ? [{ texto: actualizacion, fecha: '' }]
      : [];

  if (entries.length === 0) {
    return <span className="actualizacion-pill-empty">—</span>;
  }

  return (
    <span
      ref={containerRef}
      className={`actualizacion-pill${open ? ' actualizacion-pill--open' : ''}`}
      onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(prev => !prev); } }}
      title={open ? 'Clic para cerrar' : 'Clic para ver actualizaciones'}
      aria-expanded={open}
    >
      <span className="actualizacion-pill-icon">📋</span>
      <span className="actualizacion-pill-count">
        {entries.length} nota{entries.length !== 1 ? 's' : ''}
      </span>
      <span className="actualizacion-pill-chevron">{open ? '▲' : '▼'}</span>

      {/* Panel desplegable — siempre renderizado en DOM para impresión */}
      <div className={`actualizacion-tooltip${open ? ' actualizacion-tooltip--visible' : ''}`}>
        <div className="actualizacion-tooltip-header">
          📋 Historial de actualizaciones
          <button
            className="actualizacion-tooltip-close"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            title="Cerrar"
            aria-label="Cerrar panel de actualizaciones"
          >✕</button>
        </div>
        {entries.map((act, idx) => (
          <div key={idx} className="actualizacion-row">
            <span className="actualizacion-text">{act.texto}</span>
            {act.fecha && <span className="actualizacion-date">{act.fecha}</span>}
          </div>
        ))}
      </div>
    </span>
  );
}
