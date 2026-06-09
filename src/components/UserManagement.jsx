import React, { useState } from 'react';
import { UserPlus, Search, Shield, User, Mail, MoreVertical, Trash2, Edit2, Check, X } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { useFirebaseSync } from '../hooks/useFirebaseSync';
import './UserManagement.css';
import { matchesSearch } from '../utils/search';

const defaultUsers = [
  { id: 1, name: 'Super Administrador', username: 'admin', password: 'admin', email: 'admin@hospitalvillarrica.cl', role: 'superadmin', roleName: 'Super Administrador', status: 'active' },
  { id: 2, name: 'Visor Institucional', username: 'visor', password: 'visor', email: 'visor@hospitalvillarrica.cl', role: 'visor', roleName: 'Visor Institucional', status: 'active' },
  { id: 3, name: 'Médico General', username: 'medico', password: 'medico', email: 'medico@hospitalvillarrica.cl', role: 'medico_general', roleName: 'Médico', status: 'active' },
  { id: 4, name: 'Gestor de Camas', username: 'gestor', password: 'gestor', email: 'gestor@hospitalvillarrica.cl', role: 'gestor_camas', roleName: 'Gestor de Camas', status: 'active' },
  { id: 5, name: 'Médico HODOM', username: 'hodom', password: 'hodom', email: 'hodom@hospitalvillarrica.cl', role: 'medico_hodom', roleName: 'Médico HODOM', status: 'active' },
  { id: 6, name: 'Personal de Aseo', username: 'aseo', password: 'aseo', email: 'aseo@hospitalvillarrica.cl', role: 'personal_aseo', roleName: 'Personal de Aseo', status: 'active' }
];

const UserManagement = ({ notify, activeUsers = {} }) => {
  const [users, setUsers, loadingUsers] = useFirebaseSync('appState', 'users', defaultUsers);

  const [isAdding, setIsAdding] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', email: '', role: 'visor' });
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddUser = async (e) => {
    e.preventDefault();
    setIsSending(true);

    // 1. Generar contraseña aleatoria de 8 caracteres
    const generatedPassword = Math.random().toString(36).slice(-8);

    // 2. Configuración de EmailJS
    // INSTRUCCIONES: Crea una cuenta en https://www.emailjs.com/
    // - Crea un servicio (Email Service)
    // - Crea un template de correo con las variables: {{to_name}}, {{username}}, {{password}}, {{role}}
    // - Reemplaza los valores de abajo con tus IDs reales:
    const SERVICE_ID = 'service_tz8tauh'; 
    const TEMPLATE_ID = 'template_2b8zk5w';
    const PUBLIC_KEY = 'PbZKvEo7Mmyk0dD0-';

    const templateParams = {
      to_email: newUser.email,
      to_name: newUser.name,
      username: newUser.username,
      password: generatedPassword,
      role: newUser.role
    };

    try {
      // 3. Enviar el correo usando EmailJS
      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      
      const id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
      setUsers([...users, { ...newUser, id, status: 'active', password: generatedPassword }]);
      if (notify) notify(`Profesional ${newUser.name} agregado. Se enviaron sus credenciales al correo.`);
      setNewUser({ name: '', username: '', email: '', role: 'visor' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error enviando correo con EmailJS:', error);
      if (notify) notify('Error al enviar el correo. Revisa la configuración en consola.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteUser = (id, username) => {
    if (username === 'admin') {
      if (notify) notify('No puedes eliminar al administrador principal.');
      return;
    }
    if (window.confirm('¿Estás seguro de que deseas eliminar este profesional?')) {
      setUsers(users.filter(u => u.id !== id));
      if (notify) notify('Profesional eliminado correctamente.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.role !== 'superadmin' && (
      matchesSearch(u.name, searchQuery) || 
      matchesSearch(u.username, searchQuery)
    )
  );

  if (loadingUsers) {
    return (
      <div className="user-management-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      <div className="um-header">
        <div>
          <h2 className="text-gradient">Gestión de Profesionales</h2>
          <p className="um-subtitle">Administre el acceso y roles del personal hospitalario</p>
        </div>
        <button className="glass-button primary" onClick={() => setIsAdding(true)}>
          <UserPlus size={18} />
          <span>Agregar Profesional</span>
        </button>
      </div>

      {/* Profesionales Conectados en Tiempo Real */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', border: '1px solid rgba(34, 197, 94, 0.25)', background: 'rgba(34, 197, 94, 0.04)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></span>
            <span style={{ position: 'absolute', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', transform: 'scale(2.5)', opacity: 0.35 }}></span>
          </div>
          <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Profesionales Conectados en Tiempo Real
          </h3>
          <span className="role-badge gestor_camas" style={{ fontSize: '0.68rem', padding: '2px 8px', marginLeft: 'auto', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
            {Object.entries(activeUsers || {}).filter(([username, data]) => data?.role !== 'superadmin' && Date.now() - new Date(data.lastSeen).getTime() < 45000).length} Activos
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {Object.entries(activeUsers || {}).filter(([username, data]) => data?.role !== 'superadmin' && Date.now() - new Date(data.lastSeen).getTime() < 45000).length === 0 ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No se registran otros usuarios activos en este momento.</span>
          ) : (
            Object.entries(activeUsers)
              .filter(([_, data]) => data.role !== 'superadmin' && Date.now() - new Date(data.lastSeen).getTime() < 45000)
              .map(([username, data]) => (
                <div key={username} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '6px 12px', 
                  borderRadius: '8px', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.06)' 
                }}>
                  <span className="status-indicator active" style={{ margin: 0, width: '6px', height: '6px' }}></span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{data.name}</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>@{username} • {data.role === 'superadmin' ? 'Super Admin' : data.role === 'gestor_camas' ? 'Gestor de Camas' : data.role === 'medico_general' ? 'Médico' : data.role}</span>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      <div className="um-controls glass-panel">
        <div className="search-container">
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Buscar por nombre o usuario..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="um-filters">
          <span className="filter-label">Filtros:</span>
          <button className="filter-tag active">Todos</button>
          <button className="filter-tag">Gestores</button>
          <button className="filter-tag">Médicos</button>
        </div>
      </div>

      <div className="um-table-container glass-panel">
        <table className="um-table">
          <thead>
            <tr>
              <th>Profesional</th>
              <th>Usuario</th>
              <th>Rol / Permisos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar-small">
                      {user.name.charAt(0)}
                    </div>
                    <div className="user-details">
                      <span className="user-name">{user.name}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  </div>
                </td>
                <td><code className="user-code">{user.username}</code></td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role === 'superadmin' ? <Shield size={12} /> : <User size={12} />}
                    {user.role === 'superadmin' && 'Super Admin'}
                    {user.role === 'gestor_camas' && 'Gestor de Camas'}
                    {user.role === 'medico_general' && 'Médico'}
                    {user.role === 'personal_aseo' && 'Personal de Aseo'}
                    {user.role === 'visor' && 'Visor'}
                    {user.role === 'medico_hodom' && 'Médico HODOM'}
                  </span>
                </td>
                <td>
                  <span className="status-indicator active">Activo</span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="action-btn" title="Editar"><Edit2 size={16} /></button>
                    <button className="action-btn delete" title="Eliminar" onClick={() => handleDeleteUser(user.id, user.username)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdding && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Nuevo Profesional</h3>
              <button className="close-btn" onClick={() => setIsAdding(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddUser} className="modal-body">
              <div className="form-group">
                <label>Nombre Completo</label>
                <input 
                  className="glass-input" 
                  value={newUser.name} 
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  placeholder="Ej: Dr. Juan Pérez"
                  required
                />
              </div>
              <div className="form-group">
                <label>Nombre de Usuario</label>
                <input 
                  className="glass-input" 
                  value={newUser.username} 
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                  placeholder="Ej: jperez"
                  required
                />
              </div>
              <div className="form-group">
                <label>Correo Electrónico</label>
                <input 
                  className="glass-input" 
                  type="email"
                  value={newUser.email} 
                  onChange={e => setNewUser({...newUser, email: e.target.value})}
                  placeholder="correo@hospital.cl"
                  required
                />
              </div>
              <div className="form-group">
                <label>Rol asignado</label>
                <select 
                  className="glass-input"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="visor">Visor (Solo Lectura)</option>
                  <option value="gestor_camas">Gestor de Camas</option>
                  <option value="medico_general">Médico</option>
                  <option value="personal_aseo">Personal de Aseo</option>
                  <option value="medico_hodom">Médico HODOM</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="glass-button" onClick={() => setIsAdding(false)} disabled={isSending}>Cancelar</button>
                <button type="submit" className="glass-button primary" disabled={isSending}>
                  {isSending ? 'Guardando y Enviando...' : 'Guardar y Enviar Credenciales'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
