import { useState, useEffect, useRef } from 'react';
import { 
  Activity, Search, User, LogOut, KeyRound, Palette
} from 'lucide-react';
import './App.css';
import Login from './components/Login';
import ChangePasswordModal from './components/ChangePasswordModal';
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
import { useFirestoreCollection } from './hooks/useFirestoreCollection';
import { runCollectionsMigration } from './utils/migrationService';
import { sanitizeBedsStructure } from './utils/bedSanitizer';
import { DUMMY_DATA, WAITING_LIST } from './data/dummy';
import { MOCK_TRANSFERS } from './data/mockTransfers';
import { Toaster, toast } from 'sonner';

import { logoutUser } from './utils/authService';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Pre-fill some realistic interconsultas in the DUMMY_DATA to make the initial view visually rich
const initialBedsData = JSON.parse(JSON.stringify(DUMMY_DATA));

const initialHodomRequests = [];

// All available themes
const THEMES = [
  { id: 'dark',     label: 'Dark',     cls: 'theme-dark',     dots: ['#00d4ff','#8b5cf6','#080a10'], dark: true  },
  { id: 'light',    label: 'Light',    cls: 'theme-light',    dots: ['#005f8a','#7c3aed','#b8cfe8'], dark: false },
  { id: 'emerald',  label: 'Zafiro',   cls: 'theme-emerald',  dots: ['#2563eb','#6366f1','#eff6ff'], dark: false },
  { id: 'crimson',  label: 'Crimson',  cls: 'theme-crimson',  dots: ['#ef4444','#c084fc','#100608'], dark: true  },
  { id: 'forest',   label: 'Forest',   cls: 'theme-forest',   dots: ['#22c55e','#a78bfa','#051008'], dark: true  },
  { id: 'sunset',   label: 'Sunset',   cls: 'theme-sunset',   dots: ['#f97316','#a78bfa','#100800'], dark: true  },
  { id: 'midnight', label: 'Midnight', cls: 'theme-midnight', dots: ['#818cf8','#c084fc','#010510'], dark: true  },
  { id: 'slate',    label: 'Slate',    cls: 'theme-slate',    dots: ['#475569','#7c3aed','#e2e8f0'], dark: false },
];

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
  const [theme, setTheme] = useState(() => localStorage.getItem('gestion-camas-theme') || 'dark');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const themeBtnRef = useRef(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isPublicRoute] = useState(() => {
    const path = window.location.pathname.toLowerCase();
    return (
      window.location.hash.includes('#solicitud-publica') ||
      window.location.search.includes('public=solicitud') ||
      path === '/solicitud' ||
      path === '/solicitud-publica' ||
      path.startsWith('/solicitud')
    );
  });

  // Keep Firebase Auth state synchronized
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser && !isPublicRoute) {
        if (currentUser) {
          setCurrentUser(null);
          localStorage.removeItem('villarrica_session');
        }
      }
    });
    return () => unsubscribe();
  }, [currentUser, isPublicRoute]);

  // Only sync clinical data if user is authenticated or in a public form route
  const isSyncEnabled = !!currentUser || isPublicRoute;


  // ── ESTADO OPERATIVO DE CAMAS Y ESPERA (Documentos ligeros fijos) ─────────────
  const [bedsData, setBedsData, bedsLoading] = useFirebaseSync('appState', 'bedsData', initialBedsData, { enabled: isSyncEnabled });
  const [waitingList, setWaitingList, waitingLoading] = useFirebaseSync('appState', 'waitingList', WAITING_LIST, { enabled: isSyncEnabled });

  // ── Sanitización y auto-reparación preventiva de camas con IDs corruptos ────────
  useEffect(() => {
    if (!bedsLoading && bedsData && isSyncEnabled) {
      const { cleaned, hasFixes } = sanitizeBedsStructure(bedsData);
      if (hasFixes) {
        console.log('[App] 🛡️ Sanitizando IDs de cama corruptos en bedsData...');
        setBedsData(cleaned);
      }
    }
  }, [bedsData, bedsLoading, isSyncEnabled, setBedsData]);

  // ── COLECCIONES INDEPENDIENTES DE FIRESTORE (Registros individuales) ─────────
  const dischargesCol = useFirestoreCollection('discharges', { orderByField: 'dischargeAt', enabled: isSyncEnabled });
  const transfersCol = useFirestoreCollection('transfers', { orderByField: 'fechaTraslado', enabled: isSyncEnabled, initialData: MOCK_TRANSFERS });
  const blockLogsCol = useFirestoreCollection('blockLogs', { orderByField: 'blockedAt', enabled: isSyncEnabled });
  const hodomCol = useFirestoreCollection('hodomRequests', { orderByField: 'solicitadaAt', enabled: isSyncEnabled });
  const proceduresCol = useFirestoreCollection('procedures', { orderByField: 'createdAt', enabled: isSyncEnabled });

  // Alias y adaptadores de compatibilidad
  const hodomRequests = hodomCol.data;
  const transferHistory = transfersCol.data;
  const blockLog = blockLogsCol.data;
  const dischargesLog = dischargesCol.data;
  const procedures = proceduresCol.data;

  useEffect(() => {
    const t = THEMES.find(t => t.id === theme) || THEMES[0];
    document.body.className = t.cls;
    localStorage.setItem('gestion-camas-theme', theme);
  }, [theme]);

  // Close theme selector on outside click
  useEffect(() => {
    if (!showThemeSelector) return;
    const handler = (e) => {
      if (themeBtnRef.current && !themeBtnRef.current.contains(e.target)) {
        setShowThemeSelector(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showThemeSelector]);

  const isLoading = bedsLoading || waitingLoading || hodomCol.loading || transfersCol.loading || dischargesCol.loading || blockLogsCol.loading || proceduresCol.loading;

  const handleLogin = (user) => {
    if (user && user.role === 'admin') {
      user.role = 'superadmin';
    }
    setCurrentUser(user);
    localStorage.setItem('villarrica_session', JSON.stringify(user));
    setCurrentView('dashboard');
    toast.success(`Bienvenido/a, ${user.name}`);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    localStorage.removeItem('villarrica_session');
    setCurrentView('dashboard');
    toast.info('Sesión cerrada');
  };


  // ── CLINICAL HANDLERS ──────────────────────────────────────────────────────

  const handleHodomSubmit = async (reqData) => {
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
    try {
      await hodomCol.addItem(newReq);
      toast.success(`Solicitud HODOM ingresada para ${reqData.patientName}`);
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar solicitud HODOM');
    }
  };

  const handleHodomMarkDone = async (hodomId) => {
    try {
      await hodomCol.updateItem(hodomId, {
        estado: 'aprobado',
        aprobadoAt: new Date().toISOString()
      });
      toast.success('Solicitud HODOM aprobada');
    } catch (err) {
      console.error(err);
      toast.error('Error al aprobar solicitud HODOM');
    }
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
    toast.success(`HODOM registrado. Hab. ${roomId} — Cama ${bedId} enviada a aseo.`);
  };

  const handleHodomDelete = async (hodomId) => {
    try {
      await hodomCol.removeItem(hodomId);
      toast.success('Solicitud HODOM eliminada');
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar solicitud HODOM');
    }
  };

  const handleFinishCleaning = (roomId, bedId) => {
    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const f of ['piso4', 'piso3', 'piso2']) {
        if (!next[f]) continue;
        for (const s in next[f]) {
          next[f][s] = next[f][s].map(room => {
            if (room.roomId === roomId) {
              return { ...room, beds: room.beds.map(bed => bed.id === bedId ? { ...bed, status: 'available', cleaningAt: null, novedades: [], evolutions: [] } : bed) };
            }
            return room;
          });
        }
      }
      return next;
    });
    toast.success(`Aseo finalizado en Hab. ${roomId} — Cama ${bedId}. Cama disponible.`);
  };

  const handleMarkICDone = (roomId, bedId, icId, newState = 'realizada', observaciones = '') => {
    if (roomId === 'Espera') {
      setWaitingList(prev => prev.map(p => {
        if (p.id === bedId) {
          return { ...p, interconsultas: (p.interconsultas || []).map(ic => ic.id === icId ? { ...ic, estado: newState, observaciones, resueltaAt: new Date().toISOString() } : ic) };
        }
        return p;
      }));
      toast.success(`Interconsulta marcada como ${newState}`);
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
    toast.success(`Interconsulta marcada como ${newState}`);
  };

  const handleDeleteIC = (roomId, bedId, icId) => {
    if (roomId === 'Espera') {
      setWaitingList(prev => prev.map(p => {
        if (p.id === bedId) {
          return { ...p, interconsultas: (p.interconsultas || []).filter(ic => ic.id !== icId) };
        }
        return p;
      }));
      toast.success('Interconsulta eliminada');
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
    toast.success('Interconsulta eliminada');
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

  const handleAddNewPatient = async (newPatient) => {
    const cleanRut = (rut) => (rut || '').replace(/[^0-9kK]/g, '').toLowerCase();
    const newRut = cleanRut(newPatient.rut);

    if (newRut) {
      // Verificar si ya está en lista de espera
      const duplicateInWaiting = waitingList.find(p => cleanRut(p.rut) === newRut);
      if (duplicateInWaiting) {
        toast.error(`⚠️ Paciente ${newPatient.name} (${newPatient.rut}) ya está en lista de espera (Ticket ${duplicateInWaiting.ticket || duplicateInWaiting.id})`);
        return false;
      }

      // Verificar si ya está acostado
      let bedInfo = '';
      let foundInBed = false;
      for (const floor in bedsData) {
        for (const sector in bedsData[floor]) {
          for (const room of bedsData[floor][sector]) {
            for (const bed of room.beds) {
              if (bed.status === 'occupied' && cleanRut(bed.rut) === newRut) {
                bedInfo = `Hab ${room.roomId} — Cama ${bed.id} (Paciente: ${bed.patient})`;
                foundInBed = true;
                break;
              }
            }
            if (foundInBed) break;
          }
          if (foundInBed) break;
        }
        if (foundInBed) break;
      }
      if (foundInBed) {
        toast.error(`⚠️ Paciente ${newPatient.name} (RUT: ${newPatient.rut}) ya se encuentra hospitalizado en ${bedInfo}`);
        return false;
      }
    }

    const res = await setWaitingList(prev => [newPatient, ...prev]);
    if (res !== false) {
      toast.success(`Solicitud ingresada correctamente para ${newPatient.name}`);
      return true;
    } else {
      toast.error('Error al guardar la solicitud en el servidor');
      return false;
    }
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
        <Toaster position="top-right" richColors />
        <SolicitudForm
          onSubmit={async (newPatient) => {
            const cleanRut = (rut) => (rut || '').replace(/[^0-9kK]/g, '').toLowerCase();
            const newRut = cleanRut(newPatient.rut);
            if (newRut) {
              const dup = waitingList.find(p => cleanRut(p.rut) === newRut);
              if (dup) {
                toast.error(`⚠️ Paciente ${newPatient.name} (RUT: ${newPatient.rut}) ya se encuentra en la lista de espera.`);
                return false;
              }
            }
            const res = await setWaitingList(prev => [newPatient, ...prev]);
            return res !== false;
          }}
          currentUser={{ name: "Usuario Remoto (Web)", role: "public", username: "public" }}
        />
      </div>
    );
  }

  // ── LOGIN GATE ─────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <Login onLogin={handleLogin} />
      </>
    );
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
      <Toaster position="top-right" richColors />
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
              onClick={() => setShowChangePassword(true)}
              title="Modificar Contraseña"
            >
              <KeyRound size={18} />
            </button>
            <div ref={themeBtnRef} style={{ position: 'relative' }}>
              <button
                id="theme-selector-btn"
                className="glass-button"
                style={{ padding: '8px' }}
                onClick={() => setShowThemeSelector(v => !v)}
                title="Seleccionar tema"
              >
                <Palette size={18} />
              </button>

              {showThemeSelector && (
                <div className="theme-selector-dropdown">
                  <div className="theme-selector-title">🎨 Tema de la Interfaz</div>

                  <div className="theme-selector-group-label">☀️ Claros</div>
                  <div className="theme-selector-grid">
                    {THEMES.filter(t => !t.dark).map(t => (
                      <button
                        key={t.id}
                        id={`theme-btn-${t.id}`}
                        className={`theme-swatch-btn ${theme === t.id ? 'active' : ''}`}
                        onClick={() => { setTheme(t.id); setShowThemeSelector(false); }}
                      >
                        <div className="theme-swatch-colors">
                          {t.dots.map((c, i) => (
                            <span key={i} className="theme-swatch-dot" style={{ background: c }} />
                          ))}
                        </div>
                        <span className="theme-swatch-name">{t.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="theme-selector-group-label">🌙 Oscuros</div>
                  <div className="theme-selector-grid">
                    {THEMES.filter(t => t.dark).map(t => (
                      <button
                        key={t.id}
                        id={`theme-btn-${t.id}`}
                        className={`theme-swatch-btn ${theme === t.id ? 'active' : ''}`}
                        onClick={() => { setTheme(t.id); setShowThemeSelector(false); }}
                      >
                        <div className="theme-swatch-colors">
                          {t.dots.map((c, i) => (
                            <span key={i} className="theme-swatch-dot" style={{ background: c }} />
                          ))}
                        </div>
                        <span className="theme-swatch-name">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
          procedures={procedures}
          onAddProcedure={proceduresCol.addItem}
          onHodomSubmit={handleHodomSubmit}
          onMarkHodomDoneByBed={handleHodomMarkDoneByBed}
          onEditPatient={handleEditPatient}
          onViewPatient={handleViewPatient}
          onAddTransfers={transfersCol.bulkAdd}
          onAddDischarge={dischargesCol.addItem}
          onAddBlockLog={blockLogsCol.addItem}
          onUpdateBlockLog={blockLogsCol.updateItem}
          user={currentUser}
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
          onUpdatePatient={async (updated) => {
            const res = await setWaitingList(prev => prev.map(p => p.id === updated.id ? updated : p));
            if (res !== false) {
              setEditingPatient(null);
              setViewingPatient(null);
              setCurrentView('dashboard');
              return true;
            }
            return false;
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
             toast.success(`Interconsulta a ${formData.especialidadDestino} solicitada para paciente en espera`);
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
        <InsightsDashboard 
          bedsData={bedsData} 
          waitingList={waitingList} 
          transferHistory={transferHistory} 
          blockLog={blockLog} 
          dischargesLog={dischargesLog} 
        />
      )}
      {currentView === 'general_status' && (
        <GeneralBedStatusPanel bedsData={bedsData} />
      )}
      {currentView === 'database' && (
        <DatabasePanel bedsData={bedsData} procedures={procedures} />
      )}
      {currentView === 'altas_database' && (
        <DischargesDatabasePanel 
          discharges={dischargesLog}
          procedures={procedures}
          onUpdateDischarge={dischargesCol.updateItem}
          onAddDischarge={dischargesCol.addItem}
          bedsData={bedsData} 
          setBedsData={setBedsData} 
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
          setBlockLog={(updater) => {
            if (typeof updater === 'function') {
              const updatedList = updater(blockLog);
              // Si se actualizó un elemento individual:
              const changed = updatedList.find((item, idx) => JSON.stringify(item) !== JSON.stringify(blockLog[idx]));
              if (changed && changed.id) {
                blockLogsCol.updateItem(changed.id, changed).catch(e => console.error(e));
              }
            }
          }}
          userRole={currentUser.role}
        />
      )}

      {/* Modal de cambio de contraseña */}
      {showChangePassword && (
        <ChangePasswordModal
          currentUser={currentUser}
          onClose={() => setShowChangePassword(false)}
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
