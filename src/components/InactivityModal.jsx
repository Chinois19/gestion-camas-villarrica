import React, { useEffect } from 'react';
import { Clock, ShieldAlert, ArrowRight, LogOut } from 'lucide-react';

export default function InactivityModal({ secondsRemaining, onKeepAlive, onLogout }) {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Porcentaje del tiempo restante de la advertencia (de 120s a 0s)
  const percent = Math.min(100, Math.max(0, (secondsRemaining / 120) * 100));

  // Escuchar tecla Enter o Escape para confirmar de inmediato
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onKeepAlive();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onKeepAlive]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(3, 7, 18, 0.82)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        animation: 'fadeIn 0.25s ease-out'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inactivity-title"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.98))',
          borderRadius: '20px',
          border: '2px solid rgba(245, 158, 11, 0.6)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 158, 11, 0.25)',
          overflow: 'hidden',
          color: '#f8fafc',
          textAlign: 'center',
          padding: '32px 28px',
          position: 'relative'
        }}
      >
        {/* Barra de progreso de advertencia superior */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${percent}%`,
              backgroundColor: percent < 30 ? '#ef4444' : '#f59e0b',
              transition: 'width 1s linear, background-color 0.5s ease'
            }}
          />
        </div>

        {/* Icono animado */}
        <div
          style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0.05) 70%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(245, 158, 11, 0.5)',
            boxShadow: '0 0 24px rgba(245, 158, 11, 0.35)'
          }}
        >
          <Clock size={36} color="#f59e0b" style={{ animation: 'pulse 1.5s infinite' }} />
        </div>

        {/* Título */}
        <h2
          id="inactivity-title"
          style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>¿Sigues ahí?</span>
        </h2>

        {/* Subtítulo clínico */}
        <p
          style={{
            fontSize: '0.92rem',
            color: '#94a3b8',
            margin: '0 0 20px',
            lineHeight: 1.5
          }}
        >
          Por seguridad de los datos clínicos y ahorro de recursos del sistema, tu sesión se cerrará automáticamente en:
        </p>

        {/* Cuenta Regresiva Destacada */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 32px',
            borderRadius: '16px',
            background: percent < 30 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.12)',
            border: `1.5px solid ${percent < 30 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.4)'}`,
            marginBottom: '24px',
            boxShadow: percent < 30 ? '0 0 20px rgba(239, 68, 68, 0.25)' : '0 0 20px rgba(245, 158, 11, 0.15)'
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '2.5rem',
              fontWeight: 800,
              letterSpacing: '2px',
              color: percent < 30 ? '#ef4444' : '#f59e0b'
            }}
          >
            {formattedTime}
          </span>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            type="button"
            onClick={onKeepAlive}
            autoFocus
            style={{
              width: '100%',
              padding: '14px 20px',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.5)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 14px 28px -5px rgba(37, 99, 235, 0.65)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(37, 99, 235, 0.5)';
            }}
          >
            <span>Continuar Trabajando</span>
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#94a3b8',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.2s, color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <LogOut size={15} />
            <span>Cerrar Sesión Ahora</span>
          </button>
        </div>

        <div style={{ marginTop: '16px', fontSize: '0.72rem', color: '#64748b' }}>
          Tip: Presiona <kbd style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: '#cbd5e1' }}>Espacio</kbd> o <kbd style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', color: '#cbd5e1' }}>Enter</kbd> para mantener la sesión.
        </div>
      </div>
    </div>
  );
}
