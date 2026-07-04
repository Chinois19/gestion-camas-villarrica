import React, { useState } from 'react';
import { X, Eye, EyeOff, Lock, Check, AlertTriangle } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ChangePasswordModal = ({ currentUser, onClose, notify }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordStrength = (pwd) => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { level: 1, label: 'Débil', color: '#ef4444' };
    if (score <= 2) return { level: 2, label: 'Regular', color: '#f59e0b' };
    if (score <= 3) return { level: 3, label: 'Buena', color: '#3b82f6' };
    return { level: 4, label: 'Fuerte', color: '#22c55e' };
  };

  const strength = passwordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (newPassword.length < 4) {
      setError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('La nueva contraseña debe ser diferente a la actual.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Leer usuarios actuales directamente de Firestore (fuente de verdad)
      const docRef = doc(db, 'appState', 'users');
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setError('No se pudo acceder a la base de datos de usuarios.');
        setIsSubmitting(false);
        return;
      }

      const users = docSnap.data().data;

      // 2. Verificar contraseña actual
      const userIndex = users.findIndex(
        u => u.username === currentUser.username && u.password === currentPassword
      );

      if (userIndex === -1) {
        setError('La contraseña actual es incorrecta.');
        setIsSubmitting(false);
        return;
      }

      // 3. Crear backup antes de modificar (misma lógica de protección)
      const backupRef = doc(db, 'appState', 'users_lastBackup');
      await setDoc(backupRef, {
        data: users,
        backedUpAt: new Date().toISOString(),
        userCount: users.length,
        reason: 'backup_before_password_change'
      });

      // 4. Actualizar SOLO el campo password del usuario actual
      const updatedUsers = users.map((u, idx) => {
        if (idx === userIndex) {
          return { ...u, password: newPassword };
        }
        return u;
      });

      // 5. Verificación de integridad: mismo número de usuarios
      if (updatedUsers.length !== users.length) {
        setError('Error de integridad. Operación cancelada.');
        setIsSubmitting(false);
        return;
      }

      // 6. Escribir a Firestore
      await setDoc(docRef, { data: updatedUsers });

      setSuccess(true);
      if (notify) notify('Contraseña actualizada exitosamente.');

      // Cerrar después de 2 segundos
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      setError('Error al guardar. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content glass-panel" style={{ maxWidth: '460px', width: '90%' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={20} />
            Modificar Contraseña
          </h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {success ? (
          <div style={{
            padding: '40px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.3s ease'
            }}>
              <Check size={32} color="#22c55e" />
            </div>
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>¡Contraseña actualizada!</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
              Usa tu nueva contraseña la próxima vez que inicies sesión.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px 24px' }}>
            <p style={{ 
              fontSize: '0.82rem', 
              color: 'var(--text-secondary)', 
              margin: '0 0 4px 0',
              lineHeight: '1.5'
            }}>
              Cambiando contraseña para <strong style={{ color: 'var(--text-primary)' }}>{currentUser.name}</strong>
            </p>

            {/* Contraseña actual */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                Contraseña Actual
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="glass-input"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setError(''); }}
                  placeholder="Ingresa tu contraseña actual"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '4px',
                    display: 'flex'
                  }}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Nueva contraseña */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                Nueva Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="glass-input"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                  placeholder="Ingresa tu nueva contraseña"
                  required
                  autoComplete="new-password"
                  style={{ paddingRight: '40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '4px',
                    display: 'flex'
                  }}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Indicador de fortaleza */}
              {newPassword && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '4px'
                  }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        flex: 1,
                        height: '3px',
                        borderRadius: '2px',
                        background: i <= strength.level ? strength.color : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.3s ease'
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: strength.color, fontWeight: 600 }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirmar nueva contraseña */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                Confirmar Nueva Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="glass-input"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="Repite tu nueva contraseña"
                  required
                  autoComplete="new-password"
                  style={{ 
                    paddingRight: '40px', 
                    width: '100%',
                    borderColor: confirmPassword && confirmPassword !== newPassword ? '#ef4444' : undefined 
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '4px',
                    display: 'flex'
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                  Las contraseñas no coinciden
                </span>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#ef4444'
              }}>
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            {/* Acciones */}
            <div className="modal-actions" style={{ marginTop: '4px' }}>
              <button
                type="button"
                className="glass-button"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="glass-button primary"
                disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              >
                {isSubmitting ? 'Guardando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;
