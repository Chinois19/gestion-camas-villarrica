import { useState, useMemo } from 'react';
import { UserPlus, Search, Shield, User, Trash2, Edit2, X, Copy, Check, KeyRound } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { useFirebaseSync } from '../hooks/useFirebaseSync';
import { createAuthUserBackground, getRoleLabel, formatAuthEmail } from '../utils/authService';
import './UserManagement.css';
import { matchesSearch } from '../utils/search';
import { toast } from 'sonner';

const defaultUsers = [
  { id: 1, name: 'Super Administrador', username: 'admin', email: 'admin@hospitalvillarrica.cl', role: 'superadmin', roleName: 'Super Administrador', status: 'active' },
  { id: 2, name: 'Visor Institucional', username: 'visor', email: 'visor@hospitalvillarrica.cl', role: 'visor', roleName: 'Visor Institucional', status: 'active' },
  { id: 3, name: 'Médico General', username: 'medico', email: 'medico@hospitalvillarrica.cl', role: 'medico_general', roleName: 'Médico', status: 'active' },
  { id: 4, name: 'Gestor de Camas', username: 'gestor', email: 'gestor@hospitalvillarrica.cl', role: 'gestor_camas', roleName: 'Gestor de Camas', status: 'active' },
  { id: 5, name: 'Médico HODOM', username: 'hodom', email: 'hodom@hospitalvillarrica.cl', role: 'medico_hodom', roleName: 'Médico HODOM', status: 'active' },
  { id: 6, name: 'Personal de Aseo', username: 'aseo', email: 'aseo@hospitalvillarrica.cl', role: 'personal_aseo', roleName: 'Personal de Aseo', status: 'active' }
];

const EMAILJS_SERVICE_ID = 'service_tz8tauh';
const EMAILJS_TEMPLATE_ID = 'template_2b8zk5w';
const EMAILJS_PUBLIC_KEY = 'PbZKvEo7Mmyk0dD0-';

/**
 * Garantiza que cada usuario tenga un ID numérico único para evitar colisiones de llaves en React y en edición
 */
function ensureUniqueUserIds(list) {
  const safeList = Array.isArray(list) ? list : [];
  let maxId = safeList.reduce((max, u) => {
    const num = Number(u?.id);
    return Number.isFinite(num) && num > max ? num : max;
  }, 0);

  const usedIds = new Set();
  return safeList.map(u => {
    if (!u) return u;
    const numId = Number(u.id);
    if (Number.isFinite(numId) && numId > 0 && !usedIds.has(numId)) {
      usedIds.add(numId);
      return u;
    }
    maxId += 1;
    usedIds.add(maxId);
    return { ...u, id: maxId };
  });
}

const UserManagement = ({ notify, currentUser, onCurrentUserUpdated }) => {
  const [users, setUsers, loadingUsers] = useFirebaseSync('appState', 'users', defaultUsers);

  const [isAdding, setIsAdding] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', email: '', role: 'visor' });
  const [editingUser, setEditingUser] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const getNextUserId = (list) => {
    const safeList = Array.isArray(list) ? list : [];
    const maxId = safeList.reduce((max, u) => {
      const num = Number(u?.id);
      return Number.isFinite(num) && num > max ? num : max;
    }, 0);
    return maxId + 1;
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    const cleanName = String(newUser.name || '').trim();
    const cleanUsername = String(newUser.username || '').trim().replace(/\s+/g, '');
    const cleanEmail = String(newUser.email || '').trim();
    const selectedRole = newUser.role || 'visor';

    if (!cleanName || !cleanUsername || !cleanEmail) {
      toast.error('Por favor complete todos los campos obligatorios.');
      return;
    }

    setIsSending(true);

    try {
      // 1. Generar contraseña aleatoria de 8 caracteres (mínimo 6 para Firebase Auth)
      const generatedPassword = Math.random().toString(36).slice(-8).padEnd(8, '7');
      const roleName = getRoleLabel(selectedRole);

      const safeUsers = ensureUniqueUserIds(users);
      const existingIdx = safeUsers.findIndex(
        u => String(u?.username || '').trim().toLowerCase() === cleanUsername.toLowerCase()
      );
      const id = existingIdx !== -1 ? safeUsers[existingIdx].id : getNextUserId(safeUsers);

      const userRecord = {
        id,
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        role: selectedRole,
        roleName,
        status: 'active'
      };

      // 2. Registrar o actualizar en Firebase Auth sin cerrar la sesión del Administrador
      try {
        const canonicalUsernameEmail = formatAuthEmail(cleanUsername);
        await createAuthUserBackground(canonicalUsernameEmail, generatedPassword, {
          preserveExisting: false,
          userMeta: userRecord
        });
      } catch (authErr) {
        console.warn('Advertencia al registrar en Firebase Auth:', authErr);
        if (authErr?.code === 'auth/too-many-requests') {
          toast.error('Firebase bloqueó temporalmente nuevas altas por exceso de peticiones. Espere 1 minuto e intente nuevamente.');
          setIsSending(false);
          return;
        }
      }

      // 3. Guardar usuario inmediatamente en Firestore (sin almacenar password en appState/users)
      const updatedUsersList = existingIdx !== -1
        ? safeUsers.map((u, idx) => {
            if (idx === existingIdx) {
              const cleaned = { ...u, ...userRecord };
              delete cleaned.password;
              return cleaned;
            }
            return u;
          })
        : [...safeUsers, userRecord];

      const writeOk = await setUsers(ensureUniqueUserIds(updatedUsersList));
      if (!writeOk) {
        toast.error('No se pudo guardar el usuario en la base de datos. Verifique su conexión.');
        setIsSending(false);
        return;
      }

      // 4. Enviar credenciales por correo mediante EmailJS
      let emailSent = false;
      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email: cleanEmail,
            to_name: cleanName,
            username: cleanUsername,
            password: generatedPassword,
            role: roleName
          },
          EMAILJS_PUBLIC_KEY
        );
        emailSent = true;
        toast.success(`Profesional ${cleanName} agregado y credenciales enviadas al correo.`);
        if (notify) notify(`Profesional ${cleanName} agregado. Se enviaron sus credenciales al correo.`);
      } catch (emailErr) {
        console.warn('Aviso al enviar correo con EmailJS:', emailErr);
        toast.warning(`Profesional ${cleanName} creado en el sistema. Copie sus credenciales en pantalla.`);
        if (notify) notify(`Usuario creado. Contraseña provisoria: ${generatedPassword}`);
      }

      setCreatedCredentials({
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        password: generatedPassword,
        roleName,
        emailSent
      });
      setCopiedCreds(false);
      setNewUser({ name: '', username: '', email: '', role: 'visor' });
      setIsAdding(false);
    } catch (err) {
      console.error('Error al crear profesional:', err);
      toast.error('Ocurrió un error al crear el profesional.');
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser({
      id: user.id,
      originalUsername: String(user.username || '').trim(),
      name: user.name || '',
      username: String(user.username || '').trim(),
      email: user.email || '',
      role: user.role === 'superadmin' ? 'administrador' : (user.role || 'visor'),
      newPassword: ''
    });
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    const cleanName = String(editingUser.name || '').trim();
    const cleanUsername = String(editingUser.username || '').trim().replace(/\s+/g, '');
    const cleanEmail = String(editingUser.email || '').trim();
    const selectedRole = editingUser.role || 'visor';
    const optionalNewPassword = String(editingUser.newPassword || '').trim();

    if (!cleanName || !cleanUsername || !cleanEmail) {
      toast.error('Nombre, usuario y correo electrónico son obligatorios.');
      return;
    }

    setIsSavingEdit(true);

    try {
      const roleName = getRoleLabel(selectedRole);
      const safeUsers = ensureUniqueUserIds(users);
      const origUsernameLower = String(editingUser.originalUsername || '').trim().toLowerCase();
      const newUsernameLower = cleanUsername.toLowerCase();

      // Actualizar el usuario identificándolo por su username único (evita colisiones si habían IDs repetidos)
      let updatedPrimary = false;
      const updatedList = [];

      for (const u of safeUsers) {
        const uNameLower = String(u?.username || '').trim().toLowerCase();
        const isTarget = origUsernameLower
          ? uNameLower === origUsernameLower
          : u.id === editingUser.id;

        if (isTarget) {
          if (!updatedPrimary) {
            const cleanUpdated = {
              ...u,
              name: cleanName,
              username: cleanUsername,
              email: cleanEmail,
              role: selectedRole,
              roleName,
              status: u.status || 'active'
            };
            delete cleanUpdated.password;
            updatedList.push(cleanUpdated);
            updatedPrimary = true;
          }
          // Si había un duplicado adicional con el mismo username, se omite para evitar colisiones de rol al iniciar sesión
        } else if (uNameLower === newUsernameLower && updatedPrimary) {
          // Omitir duplicado con el nuevo username
        } else {
          updatedList.push(u);
        }
      }

      const writeOk = await setUsers(ensureUniqueUserIds(updatedList));
      if (!writeOk) {
        toast.error('Error al guardar los cambios en Firestore.');
        setIsSavingEdit(false);
        return;
      }

      // Si el administrador ingresó una nueva contraseña para restablecer el acceso del usuario
      if (optionalNewPassword) {
        try {
          const canonicalEmail = formatAuthEmail(cleanUsername);
          await createAuthUserBackground(canonicalEmail, optionalNewPassword, {
            preserveExisting: false,
            userMeta: {
              id: editingUser.id,
              name: cleanName,
              username: cleanUsername,
              email: cleanEmail,
              role: selectedRole,
              roleName
            }
          });
        } catch (authErr) {
          console.warn('Advertencia al actualizar contraseña en Firebase Auth:', authErr);
        }
      }

      // Si el usuario editado es el usuario actualmente en sesión, sincronizar su sesión local
      if (
        currentUser &&
        String(currentUser.username || '').trim().toLowerCase() === origUsernameLower
      ) {
        const updatedSessionUser = {
          ...currentUser,
          name: cleanName,
          username: cleanUsername,
          email: cleanEmail,
          role: selectedRole,
          roleName
        };
        if (onCurrentUserUpdated) {
          onCurrentUserUpdated(updatedSessionUser);
        }
      }

      toast.success(`Profesional ${cleanName} actualizado correctamente (${roleName}).`);
      if (notify) notify(`Profesional ${cleanName} actualizado a ${roleName}.`);
      setEditingUser(null);
    } catch (err) {
      console.error('Error al editar profesional:', err);
      toast.error('Ocurrió un error al guardar los cambios.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteUser = async (id, username) => {
    const cleanUName = String(username || '').trim().toLowerCase();
    if (cleanUName === 'admin') {
      toast.warning('No puedes eliminar al administrador principal.');
      if (notify) notify('No puedes eliminar al administrador principal.');
      return;
    }
    if (window.confirm('¿Estás seguro de que deseas eliminar este profesional?')) {
      const nextList = ensureUniqueUserIds(users).filter(u => {
        if (cleanUName) {
          return String(u?.username || '').trim().toLowerCase() !== cleanUName;
        }
        return u.id !== id;
      });
      await setUsers(nextList);
      toast.success('Profesional eliminado correctamente.');
      if (notify) notify('Profesional eliminado correctamente.');
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Credenciales Gestión de Camas - Hospital Villarrica\nProfesional: ${createdCredentials.name}\nUsuario: ${createdCredentials.username}\nContraseña: ${createdCredentials.password}\nRol: ${createdCredentials.roleName}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCreds(true);
      toast.success('Credenciales copiadas al portapapeles');
    });
  };

  // Deduplicar visualmente por username conservando el registro más reciente y garantizando IDs únicos
  const deduplicatedUsers = useMemo(() => {
    const safeUsers = ensureUniqueUserIds(users);
    const byUsername = new Map();
    for (const u of safeUsers) {
      if (!u) continue;
      const uNameKey = String(u.username || '').trim().toLowerCase();
      if (uNameKey === 'admin') continue;
      const key = uNameKey || `id_${u.id}`;
      byUsername.set(key, u);
    }
    return Array.from(byUsername.values());
  }, [users]);

  const filteredUsers = useMemo(() => {
    const trimmedSearch = String(searchQuery || '').trim();
    return deduplicatedUsers.filter(u => {
      if (trimmedSearch) {
        const combinedField = `${u.name || ''} ${u.username || ''} ${u.email || ''} ${getRoleLabel(u.role, u.roleName)}`;
        if (!matchesSearch(combinedField, trimmedSearch)) {
          return false;
        }
      }

      if (roleFilter === 'admin') {
        return u.role === 'administrador' || u.role === 'superadmin';
      }
      if (roleFilter === 'gestores') {
        return u.role === 'gestor_camas' || u.role === 'gestora_servicio';
      }
      if (roleFilter === 'medicos') {
        return u.role === 'medico_general' || u.role === 'medico_hodom';
      }
      return true;
    });
  }, [deduplicatedUsers, searchQuery, roleFilter]);

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
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="glass-button primary" onClick={() => setIsAdding(true)}>
            <UserPlus size={18} />
            <span>Agregar Profesional</span>
          </button>
        </div>
      </div>

      <div className="um-controls glass-panel">
        <div className="search-container" style={{ position: 'relative' }}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Buscar por nombre, usuario o correo..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              title="Limpiar búsqueda"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="um-filters">
          <span className="filter-label">Filtros:</span>
          <button
            type="button"
            className={`filter-tag ${roleFilter === 'all' ? 'active' : ''}`}
            onClick={() => setRoleFilter('all')}
          >
            Todos
          </button>
          <button
            type="button"
            className={`filter-tag ${roleFilter === 'admin' ? 'active' : ''}`}
            onClick={() => setRoleFilter('admin')}
          >
            Administradores
          </button>
          <button
            type="button"
            className={`filter-tag ${roleFilter === 'gestores' ? 'active' : ''}`}
            onClick={() => setRoleFilter('gestores')}
          >
            Gestores
          </button>
          <button
            type="button"
            className={`filter-tag ${roleFilter === 'medicos' ? 'active' : ''}`}
            onClick={() => setRoleFilter('medicos')}
          >
            Médicos
          </button>
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
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  No se encontraron profesionales que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => {
                const isAdminRole = user.role === 'superadmin' || user.role === 'administrador';
                const rowKey = `${String(user.username || '').trim().toLowerCase()}_${user.id}`;
                return (
                  <tr key={rowKey}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar-small">
                          {(user.name || '?').trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                          <span className="user-name">{user.name}</span>
                          <span className="user-email">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td><code className="user-code">{String(user.username || '').trim()}</code></td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {isAdminRole ? <Shield size={12} /> : <User size={12} />}
                        {isAdminRole && 'Administrador'}
                        {user.role === 'gestor_camas' && 'Gestor de Camas'}
                        {user.role === 'medico_general' && 'Médico'}
                        {user.role === 'personal_aseo' && 'Personal de Aseo'}
                        {user.role === 'visor' && 'Visor'}
                        {user.role === 'medico_hodom' && 'Médico HODOM'}
                        {user.role === 'gestora_servicio' && 'Gestora Servicio Clínico'}
                      </span>
                    </td>
                    <td>
                      <span className="status-indicator active">Activo</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="action-btn"
                          title="Editar rol y datos del profesional"
                          onClick={() => handleOpenEdit(user)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="action-btn delete"
                          title="Eliminar"
                          onClick={() => handleDeleteUser(user.id, user.username)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Agregar Nuevo Profesional */}
      {isAdding && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !isSending && setIsAdding(false)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Nuevo Profesional</h3>
              <button className="close-btn" onClick={() => setIsAdding(false)} disabled={isSending}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddUser} className="modal-body">
              <div className="form-group">
                <label>Nombre Completo</label>
                <input 
                  className="glass-input" 
                  value={newUser.name} 
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Ej: Dr. Juan Pérez"
                  required
                />
              </div>
              <div className="form-group">
                <label>Nombre de Usuario</label>
                <input 
                  className="glass-input" 
                  value={newUser.username} 
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
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
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="correo@hospital.cl"
                  required
                />
              </div>
              <div className="form-group">
                <label>Rol asignado</label>
                <select 
                  className="glass-input"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="visor">Visor (Solo Lectura)</option>
                  <option value="gestor_camas">Gestor de Camas</option>
                  <option value="medico_general">Médico</option>
                  <option value="personal_aseo">Personal de Aseo</option>
                  <option value="medico_hodom">Médico HODOM</option>
                  <option value="gestora_servicio">Gestora de Servicio Clínico</option>
                  <option value="administrador">Administrador</option>
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

      {/* Modal: Editar Profesional y Rol */}
      {editingUser && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !isSavingEdit && setEditingUser(null)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Editar Profesional</h3>
              <button className="close-btn" onClick={() => setEditingUser(null)} disabled={isSavingEdit}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditUser} className="modal-body">
              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  className="glass-input"
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="Ej: Dr. Juan Pérez"
                  required
                />
              </div>
              <div className="form-group">
                <label>Nombre de Usuario</label>
                <input
                  className="glass-input"
                  value={editingUser.username}
                  onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                  placeholder="Ej: jperez"
                  required
                />
              </div>
              <div className="form-group">
                <label>Correo Electrónico</label>
                <input
                  className="glass-input"
                  type="email"
                  value={editingUser.email}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  placeholder="correo@hospital.cl"
                  required
                />
              </div>
              <div className="form-group">
                <label>Rol asignado</label>
                <select
                  className="glass-input"
                  value={editingUser.role}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                >
                  <option value="visor">Visor (Solo Lectura)</option>
                  <option value="gestor_camas">Gestor de Camas</option>
                  <option value="medico_general">Médico</option>
                  <option value="personal_aseo">Personal de Aseo</option>
                  <option value="medico_hodom">Médico HODOM</option>
                  <option value="gestora_servicio">Gestora de Servicio Clínico</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Nueva Contraseña (Opcional)</span>
                  <button
                    type="button"
                    onClick={() => {
                      const randomPwd = Math.random().toString(36).slice(-8).padEnd(8, '7');
                      setEditingUser({ ...editingUser, newPassword: randomPwd });
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-color)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0
                    }}
                  >
                    <KeyRound size={12} /> Generar aleatoria
                  </button>
                </label>
                <input
                  className="glass-input"
                  type="text"
                  value={editingUser.newPassword}
                  onChange={e => setEditingUser({ ...editingUser, newPassword: e.target.value })}
                  placeholder="Dejar en blanco para mantener la contraseña actual"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="glass-button" onClick={() => setEditingUser(null)} disabled={isSavingEdit}>
                  Cancelar
                </button>
                <button type="submit" className="glass-button primary" disabled={isSavingEdit}>
                  {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resumen de Credenciales Generadas */}
      {createdCredentials && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCreatedCredentials(null)}>
          <div className="modal-content glass-panel" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Credenciales del Profesional</h3>
              <button className="close-btn" onClick={() => setCreatedCredentials(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ gap: '16px' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {createdCredentials.emailSent
                  ? `El usuario fue habilitado exitosamente y sus credenciales fueron enviadas a ${createdCredentials.email}.`
                  : `El usuario fue habilitado exitosamente en el sistema. Comparta las siguientes credenciales con el profesional:`}
              </p>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '0.9rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Profesional:</span>
                  <strong>{createdCredentials.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Usuario:</span>
                  <code className="user-code">{createdCredentials.username}</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Contraseña provisoria:</span>
                  <code className="user-code" style={{ fontWeight: 700 }}>{createdCredentials.password}</code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Rol asignado:</span>
                  <strong>{createdCredentials.roleName}</strong>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="glass-button" onClick={handleCopyCredentials}>
                  {copiedCreds ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedCreds ? 'Copiado' : 'Copiar Credenciales'}</span>
                </button>
                <button type="button" className="glass-button primary" onClick={() => setCreatedCredentials(null)}>
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
