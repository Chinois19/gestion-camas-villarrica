import React, { useState } from 'react';
import { Activity, Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './Login.css';

const defaultUsers = [
  { id: 1, name: 'Super Administrador', username: 'admin', password: 'admin', email: 'admin@hospitalvillarrica.cl', role: 'superadmin', roleName: 'Super Administrador', status: 'active' },
  { id: 2, name: 'Visor Institucional', username: 'visor', password: 'visor', email: 'visor@hospitalvillarrica.cl', role: 'visor', roleName: 'Visor Institucional', status: 'active' },
  { id: 3, name: 'Médico General', username: 'medico', password: 'medico', email: 'medico@hospitalvillarrica.cl', role: 'medico_general', roleName: 'Médico', status: 'active' },
  { id: 4, name: 'Gestor de Camas', username: 'gestor', password: 'gestor', email: 'gestor@hospitalvillarrica.cl', role: 'gestor_camas', roleName: 'Gestor de Camas', status: 'active' },
  { id: 5, name: 'Médico HODOM', username: 'hodom', password: 'hodom', email: 'hodom@hospitalvillarrica.cl', role: 'medico_hodom', roleName: 'Médico HODOM', status: 'active' },
  { id: 6, name: 'Personal de Aseo', username: 'aseo', password: 'aseo', email: 'aseo@hospitalvillarrica.cl', role: 'personal_aseo', roleName: 'Personal de Aseo', status: 'active' }
];

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

    setTimeout(async () => {
      try {
        const docRef = doc(db, 'appState', 'users');
        const docSnap = await getDoc(docRef);
        
        let usersList = defaultUsers;
        if (docSnap.exists()) {
          usersList = docSnap.data().data;
        }

        const foundUser = usersList.find(u => u.username === username && u.password === password && u.status === 'active');

        if (foundUser) {
          onLogin({
            id: foundUser.id,
            name: foundUser.name,
            username: foundUser.username,
            role: foundUser.role,
            roleName: foundUser.roleName === 'Médico General' ? 'Médico' : (foundUser.roleName || (foundUser.role === 'medico_general' ? 'Médico' : foundUser.role)) // Fallback if newly created user doesn't have roleName
          });
        } else {
          setError('Usuario o contraseña incorrectos');
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error validando usuario:", error);
        setError('Error al conectar con la base de datos');
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
