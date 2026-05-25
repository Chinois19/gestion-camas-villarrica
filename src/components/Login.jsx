import React, { useState } from 'react';
import { Activity, Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Mock authentication
    setTimeout(() => {
      if (username === 'admin' && password === 'admin') {
        onLogin({
          id: 1,
          name: 'Super Administrador',
          username: 'admin',
          role: 'admin',
          roleName: 'Super Administrador'
        });
      } else if (username === 'gestor' && password === 'gestor') {
        onLogin({
          id: 10,
          name: 'Gestor de Camas',
          username: 'gestor',
          role: 'gestor',
          roleName: 'Gestor de Camas'
        });
      } else if (username === 'medico' && password === 'medico') {
        onLogin({
          id: 3,
          name: 'Médico Interconsultor',
          username: 'medico',
          role: 'doctor',
          roleName: 'Médico Interconsultor'
        });
      } else if (username === 'profesional' && password === 'profesional') {
        onLogin({
          id: 11,
          name: 'Profesional no Médico',
          username: 'profesional',
          role: 'profesional_no_medico',
          roleName: 'Profesional no Médico'
        });
      } else if (username === 'hodom' && password === 'hodom') {
        onLogin({
          id: 5,
          name: 'Personal HODOM',
          username: 'hodom',
          role: 'hodom',
          roleName: 'Médico HODOM'
        });
      } else if (username === 'aseo' && password === 'aseo') {
        onLogin({
          id: 4,
          name: 'Personal de Aseo',
          username: 'aseo',
          role: 'aseo',
          roleName: 'Personal de Aseo'
        });
      } else if (username === 'visor' && password === 'visor') {
        onLogin({
          id: 2,
          name: 'Visor Institucional',
          username: 'visor',
          role: 'viewer',
          roleName: 'Visor de Datos'
        });
      } else {
        setError('Usuario o contraseña incorrectos');
        setIsLoading(false);
      }
    }, 1000);
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
