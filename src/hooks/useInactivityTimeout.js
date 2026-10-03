import { useState, useEffect, useRef, useCallback } from 'react';

// Configuración de tiempos de inactividad
export const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutos totales
export const WARNING_DURATION_MS = 2 * 60 * 1000;  // 2 minutos de advertencia (se activa al minuto 28)
export const ACTIVITY_STORAGE_KEY = 'villarrica_last_activity';

/**
 * Hook para monitorear inactividad general del usuario.
 * @param {Object} options
 * @param {boolean} options.enabled - Si el monitoreo está activo (ej: usuario autenticado)
 * @param {Function} options.onTimeout - Callback invocado cuando se cumplen los 30 minutos
 */
export function useInactivityTimeout({ enabled = true, onTimeout }) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const resetActivity = useCallback(() => {
    const now = Date.now();
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
    } catch {
      // Ignorar errores de cuota local si ocurrieran
    }
    setShowWarning(false);
    setSecondsRemaining(Math.round(WARNING_DURATION_MS / 1000));
  }, []);

  // Inicializar o refrescar marca de actividad al habilitar
  useEffect(() => {
    if (!enabled) {
      setShowWarning(false);
      return;
    }

    // Si no hay timestamp previo, inicializar ahora
    const current = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY));
    if (!current || isNaN(current)) {
      resetActivity();
    }

    // Escuchadores de interacción general del usuario (Opción B)
    let lastThrottledTime = 0;
    const handleUserInteraction = () => {
      const now = Date.now();
      // Throttling de 2 segundos para no sobrecargar el almacenamiento en eventos continuos como scroll o mousemove
      if (now - lastThrottledTime > 2000) {
        lastThrottledTime = now;
        try {
          localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
        } catch {}
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown'];
    events.forEach(evt => window.addEventListener(evt, handleUserInteraction, { passive: true }));

    // Sincronización multi-pestaña (si el usuario interactúa en otra pestaña, reiniciar advertencia en esta)
    const handleStorageChange = (e) => {
      if (e.key === ACTIVITY_STORAGE_KEY) {
        const remoteTime = Number(e.newValue);
        if (remoteTime && !isNaN(remoteTime)) {
          const elapsed = Date.now() - remoteTime;
          if (elapsed < (INACTIVITY_LIMIT_MS - WARNING_DURATION_MS)) {
            setShowWarning(false);
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Intervalo de chequeo cada 1 segundo
    const intervalId = setInterval(() => {
      const lastActivity = Number(localStorage.getItem(ACTIVITY_STORAGE_KEY)) || Date.now();
      const now = Date.now();
      const elapsed = now - lastActivity;

      if (elapsed >= INACTIVITY_LIMIT_MS) {
        // Tiempo cumplido: ejecutar cierre de sesión limpio
        clearInterval(intervalId);
        setShowWarning(false);
        if (onTimeoutRef.current) {
          onTimeoutRef.current();
        }
      } else if (elapsed >= (INACTIVITY_LIMIT_MS - WARNING_DURATION_MS)) {
        // En ventana de advertencia (últimos 2 minutos)
        setShowWarning(true);
        const remaining = Math.max(0, Math.ceil((INACTIVITY_LIMIT_MS - elapsed) / 1000));
        setSecondsRemaining(remaining);
      } else {
        // Usuario activo
        if (showWarning) {
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserInteraction));
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, [enabled, resetActivity, showWarning]);

  return {
    showWarning,
    secondsRemaining,
    resetActivity
  };
}
