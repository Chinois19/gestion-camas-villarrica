import React, { useState } from 'react';
import { UserPlus, Search, Shield, User, Mail, MoreVertical, Trash2, Edit2, Check, X } from 'lucide-react';
import './UserManagement.css';

const UserManagement = ({ notify }) => {
  const [users, setUsers] = useState([
    { id: 1, name: 'Admin Villarrica', username: 'admin', email: 'admin@hospitalvillarrica.cl', role: 'admin', status: 'active' },
    { id: 2, name: 'Visor General', username: 'visor', email: 'visor@hospitalvillarrica.cl', role: 'viewer', status: 'active' },
    { id: 3, name: 'Dr. Roberto Soto', username: 'rsoto', email: 'rsoto@hospitalvillarrica.cl', role: 'viewer', status: 'active' },
    { id: 4, name: 'Enf. Maria Paz', username: 'mpaz', email: 'mpaz@hospitalvillarrica.cl', role: 'admin', status: 'active' },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', email: '', role: 'viewer' });
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddUser = (e) => {
    e.preventDefault();
    const id = users.length + 1;
    setUsers([...users, { ...newUser, id, status: 'active' }]);
    if (notify) notify(`Profesional ${newUser.name} agregado correctamente.`);
    setNewUser({ name: '', username: '', email: '', role: 'viewer' });
    setIsAdding(false);
  };


  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <button className="filter-tag">Administradores</button>
          <button className="filter-tag">Visores</button>
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
                    {user.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                    {user.role === 'admin' ? 'Gestor (Admin)' : 'Visor'}
                  </span>
                </td>
                <td>
                  <span className="status-indicator active">Activo</span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="action-btn" title="Editar"><Edit2 size={16} /></button>
                    <button className="action-btn delete" title="Eliminar"><Trash2 size={16} /></button>
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
                  <option value="viewer">Visor (Solo Lectura)</option>
                  <option value="admin">Gestor de Camas (Administrador)</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="glass-button" onClick={() => setIsAdding(false)}>Cancelar</button>
                <button type="submit" className="glass-button primary">Guardar Profesional</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
