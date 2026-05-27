import { useState, useEffect } from 'react';
import { 
  Activity, LayoutDashboard, FileText, Search, User, Settings, Sun, Moon, 
  HeartPulse, Stethoscope, Users, Sparkles, LogOut, BarChart2
} from 'lucide-react';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SolicitudForm from './components/SolicitudForm';
import HodomPanel from './components/HodomPanel';
import InterconsultasPanel from './components/InterconsultasPanel';
import AseoPanel from './components/AseoPanel';
import UserManagement from './components/UserManagement';
import InfrastructureManagement from './components/InfrastructureManagement';
import InsightsDashboard from './components/InsightsDashboard';
import { DUMMY_DATA, WAITING_LIST } from './data/dummy';

// Pre-fill some realistic interconsultas in the DUMMY_DATA to make the initial view visually rich
const initialBedsData = JSON.parse(JSON.stringify(DUMMY_DATA));

// Clean start without initial interconsultas

const initialHodomRequests = [];

function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('villarrica_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setCurrentView] = useState('dashboard');
  const [editingPatient, setEditingPatient] = useState(null);
  const [viewingPatient, setViewingPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('dark');

  // Clinical state — persisted in localStorage
  const [bedsData, setBedsData] = useState(() => {
    const saved = localStorage.getItem('villarrica_bedsData_prod');
    return saved ? JSON.parse(saved) : initialBedsData;
  });

  const [waitingList, setWaitingList] = useState(() => {
    const saved = localStorage.getItem('villarrica_waitingList_prod');
    return saved ? JSON.parse(saved) : WAITING_LIST;
  });

  const [hodomRequests, setHodomRequests] = useState(() => {
    const saved = localStorage.getItem('villarrica_hodomRequests_prod');
    return saved ? JSON.parse(saved) : initialHodomRequests;
  });

  useEffect(() => {
    document.body.className = theme === 'light' ? 'theme-light' : 'theme-dark';
  }, [theme]);

  // Persist states to localStorage
  useEffect(() => { localStorage.setItem('villarrica_bedsData_prod', JSON.stringify(bedsData)); }, [bedsData]);
  useEffect(() => { localStorage.setItem('villarrica_waitingList_prod', JSON.stringify(waitingList)); }, [waitingList]);
  useEffect(() => { localStorage.setItem('villarrica_hodomRequests_prod', JSON.stringify(hodomRequests)); }, [hodomRequests]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('villarrica_session', JSON.stringify(user));
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('villarrica_session');
    setCurrentView('dashboard');
  };

  // ── CLINICAL HANDLERS ──────────────────────────────────────────────────────

  const handleHodomSubmit = (reqData) => {
    const newReq = {
      id: `hodom-${Date.now()}`,
      patientName: reqData.patientName,
      rut: reqData.rut || '—',
      edad: reqData.edad || '—',
      sexo: reqData.sexo || '—',
      roomId: reqData.roomId,
      bedId: reqData.bedId,
      diagnostico: reqData.diagnostico || ['No especificado'],
      solicitadaAt: new Date().toISOString(),
      estado: 'pendiente',
      prevision: reqData.prevision || 'FONASA',
      direccion: reqData.direccion || 'No especificada',
      profesionalRequiere: currentUser?.name || 'Profesional',
      fecha: new Date().toLocaleDateString('es-CL'),
      hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      hodomChecks: reqData.hodomChecks || {},
      hodomObservaciones: reqData.hodomObservaciones || ''
    };
    setHodomRequests(prev => [newReq, ...prev]);
  };

  const handleHodomMarkDone = (hodomId) => {
    const req = hodomRequests.find(r => r.id === hodomId);
    if (!req) return;

    setHodomRequests(prev => prev.map(r =>
      r.id === hodomId ? { ...r, estado: 'aprobado', aprobadoAt: new Date().toISOString() } : r
    ));

    // Liberar cama → cleaning
    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const f of ['piso4', 'piso3', 'piso2']) {
        if (!next[f]) continue;
        for (const s in next[f]) {
          next[f][s] = next[f][s].map(room => {
            if (room.roomId === req.roomId) {
              return {
                ...room,
                beds: room.beds.map(bed => {
                  if (bed.id == req.bedId) {
                    return { ...bed, status: 'cleaning', cleaningAt: new Date().toISOString(), patient: null, diagnosis: null, grdId: null, grdName: null, severity: null, projectedDays: null, assignedAt: null, interconsultas: [] };
                  }
                  return bed;
                })
              };
            }
            return room;
          });
        }
      }
      return next;
    });
  };

  const handleHodomMarkDoneByBed = (roomId, bedId) => {
    const req = hodomRequests.find(r => r.roomId === roomId && r.bedId == bedId && r.estado === 'pendiente');
    if (req) {
      handleHodomMarkDone(req.id);
    } else {
      handleFinishCleaning(roomId, bedId);
    }
  };

  const handleHodomDelete = (hodomId) => {
    setHodomRequests(prev => prev.filter(r => r.id !== hodomId));
  };

  const handleFinishCleaning = (roomId, bedId) => {
    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const f of ['piso4', 'piso3', 'piso2']) {
        if (!next[f]) continue;
        for (const s in next[f]) {
          next[f][s] = next[f][s].map(room => {
            if (room.roomId === roomId) {
              return { ...room, beds: room.beds.map(bed => bed.id === bedId ? { ...bed, status: 'available', cleaningAt: null } : bed) };
            }
            return room;
          });
        }
      }
      return next;
    });
  };

  const handleMarkICDone = (roomId, bedId, icId, newState = 'realizada', observaciones = '') => {
    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const f of ['piso4', 'piso3', 'piso2']) {
        if (!next[f]) continue;
        for (const s in next[f]) {
          next[f][s] = next[f][s].map(room => {
            if (room.roomId === roomId) {
              return {
                ...room,
                beds: room.beds.map(bed => {
                  if (bed.id === bedId) {
                    return { ...bed, interconsultas: (bed.interconsultas || []).map(ic => ic.id === icId ? { ...ic, estado: newState, observaciones, resueltaAt: new Date().toISOString() } : ic) };
                  }
                  return bed;
                })
              };
            }
            return room;
          });
        }
      }
      return next;
    });
  };

  const handleDeleteIC = (roomId, bedId, icId) => {
    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const f of ['piso4', 'piso3', 'piso2']) {
        if (!next[f]) continue;
        for (const s in next[f]) {
          next[f][s] = next[f][s].map(room => {
            if (room.roomId === roomId) {
              return { ...room, beds: room.beds.map(bed => bed.id === bedId ? { ...bed, interconsultas: (bed.interconsultas || []).filter(ic => ic.id !== icId) } : bed) };
            }
            return room;
          });
        }
      }
      return next;
    });
  };

  const handleEditPatient = (patient) => {
    setEditingPatient(patient);
    setViewingPatient(null);
    setCurrentView('solicitud');
  };

  const handleViewPatient = (patient) => {
    setViewingPatient(patient);
    setEditingPatient(null);
    setCurrentView('solicitud');
  };

  const handleAddNewPatient = (newPatient) => {
    setWaitingList(prev => [newPatient, ...prev]);
  };

  // Pending counts for nav badges
  const pendingHodomCount = hodomRequests.filter(r => r.estado === 'pendiente').length;
  const pendingICCount = (() => {
    let count = 0;
    Object.keys(bedsData).forEach(floor => {
      Object.keys(bedsData[floor]).forEach(sector => {
        bedsData[floor][sector].forEach(room => {
          room.beds.forEach(bed => {
            if (bed.interconsultas) count += bed.interconsultas.filter(ic => ic.estado === 'pendiente').length;
          });
        });
      });
    });
    return count;
  })();
  const cleaningCount = (() => {
    let count = 0;
    Object.keys(bedsData).forEach(floor => {
      Object.keys(bedsData[floor]).forEach(sector => {
        bedsData[floor][sector].forEach(room => {
          room.beds.forEach(bed => { if (bed.status === 'cleaning') count++; });
        });
      });
    });
    return count;
  })();

  // ── LOGIN GATE ─────────────────────────────────────────────────────────────
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // ── ROLE PERMISSIONS ───────────────────────────────────────────────────────
  const isSuperAdmin = currentUser.role === 'superadmin';
  const isGestor = currentUser.role === 'gestor_camas';
  const isMedico = currentUser.role === 'medico_general';
  const isAseo = currentUser.role === 'personal_aseo';
  const isVisor = currentUser.role === 'visor';
  const isHodom = currentUser.role === 'medico_hodom';

  const canViewAll = isSuperAdmin || isVisor;

  // Nav items visible by role
  const navItems = [
    { id: 'dashboard', label: 'Gestión de Camas', icon: <LayoutDashboard size={16} />, badge: null, show: canViewAll || isMedico || isGestor || isAseo },
    { id: 'insights', label: 'Estadísticas', icon: <BarChart2 size={16} />, badge: null, show: canViewAll || isGestor || isMedico },
    { id: 'interconsultas', label: 'Visor de IC', icon: <Stethoscope size={16} />, badge: pendingICCount, show: canViewAll || isMedico },
    { id: 'hodom', label: 'HODOM', icon: <HeartPulse size={16} />, badge: pendingHodomCount, show: canViewAll || isHodom || isGestor },
    { id: 'aseo', label: 'Aseo', icon: <Sparkles size={16} />, badge: cleaningCount, show: canViewAll || isAseo },
    { id: 'solicitud', label: 'Solicitar Cama', icon: <FileText size={16} />, badge: null, show: isSuperAdmin || isGestor || isHodom, onClick: () => { setEditingPatient(null); setViewingPatient(null); setCurrentView('solicitud'); } },
    { id: 'usuarios', label: 'Usuarios', icon: <Users size={16} />, badge: null, show: isSuperAdmin },
    { id: 'infraestructura', label: 'Infraestructura', icon: <Settings size={16} />, badge: null, show: isSuperAdmin },
  ].filter(item => item.show);

  return (
    <div className="app-container">
      {/* Universal Header */}
      <header className="glass-panel">
        <div className="header-title" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('dashboard')}>
          <Activity className="icon-logo" size={28} />
          <h1 className="text-gradient">Gestión Camas</h1>
        </div>

        {/* Global Search Bar */}
        {currentView === 'dashboard' ? (
          <div className="search-container">
            <Search size={18} color="var(--text-secondary)" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar paciente, cama o diagnóstico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )}

        <div className="user-profile">
          {/* Navigation */}
          <div style={{ display: 'flex', gap: '4px', marginRight: '16px' }}>
            {navItems.map(item => (
              <button
                key={item.id}
                className={`glass-button ${currentView === item.id ? 'primary' : ''}`}
                onClick={() => item.onClick ? item.onClick() : setCurrentView(item.id)}
                style={{ position: 'relative', padding: '8px 14px', fontSize: '0.82rem' }}
              >
                {item.icon} {item.label}
                {item.badge > 0 && (
                  <span style={{
                    position: 'absolute', top: '-6px', right: '-6px',
                    background: item.id === 'hodom' ? '#22c55e' : item.id === 'aseo' ? '#f59e0b' : '#fb923c',
                    color: 'white', fontSize: '0.65rem', fontWeight: 800,
                    padding: '2px 5px', borderRadius: '50%',
                    boxShadow: '0 0 8px rgba(0,0,0,0.4)'
                  }}>{item.badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* User info */}
          <div className="avatar">
            <User size={20} />
          </div>
          <div className="user-info" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{currentUser.name}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{currentUser.roleName}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
            <button
              className="glass-button"
              style={{ padding: '8px' }}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="glass-button"
              style={{ padding: '8px' }}
              onClick={handleLogout}
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main View Router */}
      {currentView === 'dashboard' && (
        <Dashboard
          searchQuery={searchQuery}
          bedsData={bedsData}
          setBedsData={setBedsData}
          waitingList={waitingList}
          setWaitingList={setWaitingList}
          onHodomSubmit={handleHodomSubmit}
          onMarkHodomDoneByBed={handleHodomMarkDoneByBed}
          onEditPatient={handleEditPatient}
          onViewPatient={handleViewPatient}
          user={currentUser}
        />
      )}
      {currentView === 'solicitud' && (
        <SolicitudForm
          onSubmit={handleAddNewPatient}
          editingPatient={editingPatient}
          viewingPatient={viewingPatient}
          currentUser={currentUser}
          onUpdatePatient={(updated) => {
            setWaitingList(prev => prev.map(p => p.id === updated.id ? updated : p));
            setEditingPatient(null);
            setViewingPatient(null);
            setCurrentView('dashboard');
          }}
          onClose={() => {
            setEditingPatient(null);
            setViewingPatient(null);
            setCurrentView('dashboard');
          }}
          onSwitchToEdit={() => {
            setEditingPatient(viewingPatient);
            setViewingPatient(null);
          }}
        />
      )}
      {currentView === 'hodom' && (
        <HodomPanel
          hodomRequests={hodomRequests}
          onMarkDone={handleHodomMarkDone}
          onDelete={handleHodomDelete}
          userRole={currentUser.role}
        />
      )}
      {currentView === 'interconsultas' && (
        <InterconsultasPanel
          bedsData={bedsData}
          onMarkICDone={handleMarkICDone}
          onDeleteIC={handleDeleteIC}
          userRole={currentUser.role}
        />
      )}
      {currentView === 'aseo' && (
        <AseoPanel
          bedsData={bedsData}
          onFinishCleaning={handleFinishCleaning}
          userRole={currentUser.role}
        />
      )}
      {currentView === 'usuarios' && isSuperAdmin && (
        <UserManagement />
      )}
      {currentView === 'infraestructura' && isSuperAdmin && (
        <InfrastructureManagement bedsData={bedsData} setBedsData={setBedsData} />
      )}
      {currentView === 'insights' && (
        <InsightsDashboard bedsData={bedsData} waitingList={waitingList} />
      )}

      {/* Global Footer */}
      <footer style={{ 
        textAlign: 'center', 
        padding: '32px 16px 24px', 
        color: 'var(--text-secondary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        marginTop: 'auto'
      }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', opacity: 0.9 }}>
          © 2026 Departamento de Control de Gestión • Hospital Villarrica
        </div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1.5px', opacity: 0.6 }}>
          BY GPS
        </div>
      </footer>
    </div>
  );
}

export default App;
