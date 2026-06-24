import { useState, useEffect } from 'react';
import { 
  Activity, Search, User, Sun, Moon, LogOut
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
import InterconsultaModal from './components/InterconsultaModal';
import DatabasePanel from './components/DatabasePanel';
import DischargesDatabasePanel from './components/DischargesDatabasePanel';
import TransfersDatabasePanel from './components/TransfersDatabasePanel';
import BlockedBedsReportPanel from './components/BlockedBedsReportPanel';
import GeneralBedStatusPanel from './components/GeneralBedStatusPanel';
import Navbar from './components/Navbar';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { DUMMY_DATA, WAITING_LIST } from './data/dummy';
import { MOCK_TRANSFERS } from './data/mockTransfers';

// Pre-fill some realistic interconsultas in the DUMMY_DATA to make the initial view visually rich
const initialBedsData = JSON.parse(JSON.stringify(DUMMY_DATA));

// Clean start without initial interconsultas

const initialHodomRequests = [];

function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('villarrica_session');
    if (saved) {
      const user = JSON.parse(saved);
      if (user && user.role === 'admin') {
        user.role = 'superadmin';
      }
      return user;
    }
    return null;
  });

  const [currentView, setCurrentView] = useState('dashboard');
  const [editingPatient, setEditingPatient] = useState(null);
  const [viewingPatient, setViewingPatient] = useState(null);
  const [requestingWaitingIC, setRequestingWaitingIC] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('dark');
  const [isPublicRoute] = useState(() => {
    return window.location.hash.includes('#solicitud-publica') || window.location.search.includes('public=solicitud');
  });

  // Clinical state — persisted in Firebase
  const [bedsData, setBedsData, bedsLoading] = useFirebaseSync('appState', 'bedsData', initialBedsData);
  const [waitingList, setWaitingList, waitingLoading] = useFirebaseSync('appState', 'waitingList', WAITING_LIST);
  const [hodomRequests, setHodomRequests, hodomLoading] = useFirebaseSync('appState', 'hodomRequests', initialHodomRequests);
  const [transferHistory, setTransferHistory, transfersLoading] = useFirebaseSync('appState', 'transferHistory', MOCK_TRANSFERS, { realtime: false });
  const [waitingListDischarges, setWaitingListDischarges, dischargesLoading] = useFirebaseSync('appState', 'waitingListDischarges', [], { realtime: false });
  const [blockLog, setBlockLog, blockLogLoading] = useFirebaseSync('appState', 'blockLog', [], { realtime: false });


  useEffect(() => {
    document.body.className = theme === 'light' ? 'theme-light' : 'theme-dark';
  }, [theme]);



  const isLoading = bedsLoading || waitingLoading || hodomLoading || transfersLoading || dischargesLoading || blockLogLoading;

  const handleLogin = (user) => {
    if (user && user.role === 'admin') {
      user.role = 'superadmin';
    }
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
  };

  const handleHodomMarkDoneByBed = (roomId, bedId) => {
    const req = hodomRequests.find(r => r.roomId === roomId && r.bedId == bedId && r.estado === 'pendiente');
    if (req) {
      handleHodomMarkDone(req.id);
    }
    
    // Liberar cama → cleaning
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
                  if (bed.id == bedId) {
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
    if (roomId === 'Espera') {
      setWaitingList(prev => prev.map(p => {
        if (p.id === bedId) {
          return { ...p, interconsultas: (p.interconsultas || []).map(ic => ic.id === icId ? { ...ic, estado: newState, observaciones, resueltaAt: new Date().toISOString() } : ic) };
        }
        return p;
      }));
      return;
    }
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
    if (roomId === 'Espera') {
      setWaitingList(prev => prev.map(p => {
        if (p.id === bedId) {
          return { ...p, interconsultas: (p.interconsultas || []).filter(ic => ic.id !== icId) };
        }
        return p;
      }));
      return;
    }
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
    waitingList.forEach(p => {
      if (p.interconsultas) count += p.interconsultas.filter(ic => ic.estado === 'pendiente').length;
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

  // ── PUBLIC ROUTE ───────────────────────────────────────────────────────────
  if (isPublicRoute) {
    if (waitingLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Cargando formulario...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }
    
    return (
      <div className="app-container" style={{ padding: '24px 0', minHeight: '100vh', overflowY: 'auto' }}>
        <SolicitudForm
          onSubmit={(newPatient) => {
            setWaitingList(prev => [newPatient, ...prev]);
          }}
          currentUser={{ name: "Usuario Remoto (Web)", role: "public", username: "public" }}
        />
      </div>
    );
  }

  // ── LOGIN GATE ─────────────────────────────────────────────────────────────
  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // ── LOADING GATE ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Sincronizando datos en tiempo real...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── ROLE PERMISSIONS ───────────────────────────────────────────────────────
  const isSuperAdmin = currentUser.role === 'superadmin';
  const isGestor = currentUser.role === 'gestor_camas';
  const isMedico = currentUser.role === 'medico_general';
  const isAseo = currentUser.role === 'personal_aseo';
  const isVisor = currentUser.role === 'visor';
  const isHodom = currentUser.role === 'medico_hodom';
  const isGestoraServicio = currentUser.role === 'gestora_servicio';

  const canViewAll = isSuperAdmin || isVisor;

  // Navbar permissions by role
  const navPermissions = {
    canDashboard: canViewAll || isMedico || isGestor || isAseo || isGestoraServicio,
    canInsights: canViewAll || isGestor || isMedico || isGestoraServicio,
    canDatabase: canViewAll || isGestor || isMedico,
    canIC: canViewAll || isMedico || isGestor,
    canAseo: canViewAll || isAseo || isGestor || isGestoraServicio,
    canHodom: canViewAll || isHodom || isGestor,
    canSolicitud: isSuperAdmin || isGestor || isHodom,
    canUsuarios: isSuperAdmin,
    canInfra: isSuperAdmin,
    canBlockedReport: isSuperAdmin || isGestor || isVisor,
  };

  return (
    <div className="app-container">
      {/* Universal Header */}
      <header className="glass-panel hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div className="header-title" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('dashboard')}>
          <Activity className="icon-logo" size={28} />
          <h1 className="text-gradient">Gestión Camas</h1>
        </div>

        {/* Horizontal Navigation Menu */}
        <Navbar
          currentView={currentView}
          onNavigate={setCurrentView}
          navPermissions={navPermissions}
          badges={{ interconsultas: pendingICCount, hodom: pendingHodomCount, aseo: cleaningCount }}
          onSolicitudNew={() => { setEditingPatient(null); setViewingPatient(null); setCurrentView('solicitud'); }}
        />

        {/* Global Search Bar (Only in Dashboard) */}
        {currentView === 'dashboard' && (
          <div className="search-container" style={{ margin: '0', flexShrink: 0, width: '250px' }}>
            <Search size={16} color="var(--text-secondary)" />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar paciente o cama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        <div className="user-profile">
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
          onAddTransfers={(newTransfers) => setTransferHistory(prev => [...newTransfers, ...(prev || [])])}
          user={currentUser}
          setWaitingListDischarges={setWaitingListDischarges}
          setBlockLog={setBlockLog}
          onRequestWaitingIC={(patient) => setRequestingWaitingIC(patient)}
        />
      )}
      {currentView === 'solicitud' && (
        <SolicitudForm
          onSubmit={handleAddNewPatient}
          editingPatient={editingPatient}
          viewingPatient={viewingPatient}
          currentUser={currentUser}
          onRequestIC={() => setRequestingWaitingIC(editingPatient || viewingPatient)}
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
      {requestingWaitingIC && (
        <InterconsultaModal
          bed={{ 
            patient: requestingWaitingIC.name || requestingWaitingIC.nombre, 
            rut: requestingWaitingIC.rut, 
            age: requestingWaitingIC.age || requestingWaitingIC.edad, 
            roomId: 'Espera', 
            id: requestingWaitingIC.id,
            diagnosis: requestingWaitingIC.diagnosis || requestingWaitingIC.dxPrincipal
          }}
          currentUser={currentUser}
          onConfirm={(formData) => {
             setWaitingList(prev => prev.map(p => {
               if (p.id === requestingWaitingIC.id) {
                 return { ...p, interconsultas: [...(p.interconsultas || []), formData] };
               }
               return p;
             }));
             if (editingPatient && editingPatient.id === requestingWaitingIC.id) {
               setEditingPatient(prev => ({ ...prev, interconsultas: [...(prev.interconsultas || []), formData] }));
             }
             if (viewingPatient && viewingPatient.id === requestingWaitingIC.id) {
               setViewingPatient(prev => ({ ...prev, interconsultas: [...(prev.interconsultas || []), formData] }));
             }
             setRequestingWaitingIC(null);
          }}
          onClose={() => setRequestingWaitingIC(null)}
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
          waitingList={waitingList}
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
        <InsightsDashboard bedsData={bedsData} waitingList={waitingList} transferHistory={transferHistory} />
      )}
      {currentView === 'general_status' && (
        <GeneralBedStatusPanel bedsData={bedsData} />
      )}
      {currentView === 'database' && (
        <DatabasePanel bedsData={bedsData} />
      )}
      {currentView === 'altas_database' && (
        <DischargesDatabasePanel 
          bedsData={bedsData} 
          setBedsData={setBedsData} 
          waitingListDischarges={waitingListDischarges}
          setWaitingListDischarges={setWaitingListDischarges}
          setWaitingList={setWaitingList}
          userRole={currentUser.role} 
        />
      )}
      {currentView === 'traslados_database' && (
        <TransfersDatabasePanel transferHistory={transferHistory || []} />
      )}
      {currentView === 'blocked_beds' && (
        <BlockedBedsReportPanel
          blockLog={blockLog || []}
          setBlockLog={setBlockLog}
          userRole={currentUser.role}
        />
      )}

      {/* Global Footer */}
      <footer className="hide-on-print" style={{ 
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
