import React, { useState } from 'react';
import { Activity, Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';
import { authenticateUser } from '../utils/authService';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const authenticatedUser = await authenticateUser(username, password);
      onLogin({
        id: authenticatedUser.id,
        name: authenticatedUser.name,
        username: authenticatedUser.username,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        roleName: authenticatedUser.roleName === 'Médico General' ? 'Médico' : (authenticatedUser.roleName || (authenticatedUser.role === 'medico_general' ? 'Médico' : authenticatedUser.role)),
        firebaseUid: authenticatedUser.firebaseUid
      });
    } catch (err) {
      console.error("Error validando usuario:", err);
      if (
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.message?.includes('incorrectos') ||
        err.message?.includes('Contraseña')
      ) {
        setError('Usuario o contraseña incorrectos');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intente nuevamente en unos minutos.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Error de conexión a internet.');
      } else {
        setError(err.message || 'Error al conectar con el servicio de autenticación.');
      }
      setIsLoading(false);
    }
  };


  return (
    <div className="login-page">
      <div className="login-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
      
      <div className="login-container">
        <div className="login-card glass-panel">
          <div className="login-header">
            <h1 className="login-title">Gestión Camas</h1>
            <p className="login-subtitle">Hospital Villarrica - Control de Acceso</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-wrapper">
                <input
                  type="text"
                  id="username"
                  placeholder="Usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
                <User size={18} className="input-icon" />
              </div>
            </div>

            <div className="form-group">
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span className="checkmark"></span>
                Recordarme
              </label>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button 
              type="submit" 
              className={`login-submit ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="spinner"></div>
              ) : (
                <span>Ingresar</span>
              )}
            </button>
            
            <div className="login-signup">
              ¿No tiene cuenta? <a href="#">Solicitar acceso</a>
            </div>
          </form>

          <div className="login-footer">
            <p>Creado por Antigravity / ssaraucania.cl</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
