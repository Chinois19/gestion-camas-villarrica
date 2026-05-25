import { useState, useEffect } from 'react';
import { 
  Activity, LayoutDashboard, FileText, Search, User, Settings, Sun, Moon, 
  HeartPulse, Stethoscope, Users, CheckCircle2 
} from 'lucide-react';
import './App.css';
import Dashboard from './components/Dashboard';
import SolicitudForm from './components/SolicitudForm';
import HodomPanel from './components/HodomPanel';
import InterconsultasPanel from './components/InterconsultasPanel';
import { DUMMY_DATA, WAITING_LIST } from './data/dummy';

// Pre-fill some realistic interconsultas in the DUMMY_DATA to make the initial view visually rich
const initialBedsData = JSON.parse(JSON.stringify(DUMMY_DATA));

// Inject initial interconsultas to some beds
if (initialBedsData.piso2 && initialBedsData.piso2.poniente && initialBedsData.piso2.poniente[0]) {
  initialBedsData.piso2.poniente[0].beds[0].interconsultas = [
    {
      id: "ic-mock-1",
      especialidadDestino: "Cardiología",
      tipoRequerimiento: "Evaluación pre-operatoria",
      profesionalDeriva: "Dr. Marcelo González",
      solicitadaAt: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
      resumenHistoria: "Paciente con sospecha de insuficiencia valvular mitral. Requiere ecocardiograma doppler color antes de procedimiento quirúrgico programado.",
      estado: "pendiente"
    }
  ];
  initialBedsData.piso2.poniente[0].beds[0].rut = "14.283.472-K";

  initialBedsData.piso2.poniente[0].beds[2].interconsultas = [
    {
      id: "ic-mock-2",
      especialidadDestino: "Neurología",
      tipoRequerimiento: "Evaluación clínica de ACV",
      profesionalDeriva: "Dra. Sofía Riquelme",
      solicitadaAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      resumenHistoria: "Paciente ingresado por déficit focal agudo. Requiere evaluación por especialista para sugerencias de manejo y pronóstico neurológico.",
      estado: "pendiente"
    }
  ];
  initialBedsData.piso2.poniente[0].beds[2].rut = "9.482.103-5";
}

if (initialBedsData.piso3 && initialBedsData.piso3.poniente && initialBedsData.piso3.poniente[1]) {
  initialBedsData.piso3.poniente[1].beds[0].interconsultas = [
    {
      id: "ic-mock-3",
      especialidadDestino: "Ginecología",
      tipoRequerimiento: "Control puerperal patológico",
      profesionalDeriva: "Dr. Cristián Arriagada",
      solicitadaAt: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString(),
      resumenHistoria: "Puérpera con alzas tensionales aisladas en período inmediato. Requiere evaluación por especialista para ajuste de dosis y esquema antihipertensivo.",
      estado: "pendiente"
    }
  ];
  initialBedsData.piso3.poniente[1].beds[0].rut = "18.394.028-3";
}

// Initial mock HODOM requests
const initialHodomRequests = [
  {
    id: "hodom-mock-1",
    patientName: "Juan Antonio Valenzuela",
    rut: "11.238.948-2",
    edad: 67,
    sexo: "M",
    roomId: "401",
    bedId: "1",
    diagnostico: ["J18 - Neumonía adquirida en la comunidad"],
    solicitadaAt: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
    estado: "pendiente",
    prevision: "FONASA B",
    direccion: "Camino Segunda Faja Km 4.2, Villarrica",
    profesionalRequiere: "Dr. Claudio Tapia",
    fecha: new Date().toLocaleDateString('es-CL'),
    hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    hodomChecks: {
      check1: true,
      check2: true,
      check3: true,
      check4: false,
      check5: true,
      check6: true,
      check7: true,
      check8: false,
      check9: true,
      check10: true,
      check11: true,
      check12: false
    },
    hodomObservaciones: "Oxígeno dependiente intermitente. Requiere visita de kinesiología y control de parámetros vitales 2 veces al día."
  },
  {
    id: "hodom-mock-2",
    patientName: "Clara Ester Sepúlveda",
    rut: "7.847.283-K",
    edad: 82,
    sexo: "F",
    roomId: "311",
    bedId: "2",
    diagnostico: ["E11 - Diabetes mellitus no insulinodependiente con complicaciones renales"],
    solicitadaAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    estado: "pendiente",
    prevision: "ISAPRE",
    direccion: "Avenida Colo Colo 1204, Villarrica",
    profesionalRequiere: "Dra. Carmen Luz Silva",
    fecha: new Date().toLocaleDateString('es-CL'),
    hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    hodomChecks: {
      check1: true,
      check2: true,
      check3: true,
      check4: true,
      check5: true,
      check6: true,
      check7: true,
      check8: true,
      check9: true,
      check10: true,
      check11: true,
      check12: true
    },
    hodomObservaciones: "Paciente estable. Curaciones avanzadas por enfermería programadas los lunes, miércoles y viernes por pie diabético."
  }
];

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'solicitud' | 'hodom' | 'interconsultas'
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState('dark');
  
  // Clinical state variables persistent in localStorage (or fallback to mock data)
  const [bedsData, setBedsData] = useState(() => {
    const saved = localStorage.getItem('villarrica_bedsData');
    return saved ? JSON.parse(saved) : initialBedsData;
  });

  const [waitingList, setWaitingList] = useState(() => {
    const saved = localStorage.getItem('villarrica_waitingList');
    return saved ? JSON.parse(saved) : WAITING_LIST;
  });

  const [hodomRequests, setHodomRequests] = useState(() => {
    const saved = localStorage.getItem('villarrica_hodomRequests');
    return saved ? JSON.parse(saved) : initialHodomRequests;
  });

  // Role simulation for multi-disciplinary workflow testing
  const [userRole, setUserRole] = useState('admin'); // 'admin' | 'hodom' | 'doctor' | 'gestor'
  
  const getRoleUser = () => {
    if (userRole === 'admin') return { role: 'admin', name: 'Dr. Administrador UGP' };
    if (userRole === 'hodom') return { role: 'hodom', name: 'Enf. HODOM Visitas' };
    if (userRole === 'doctor') return { role: 'doctor', name: 'Dr. Interconsultor de Especialidad' };
    return { role: 'gestor', name: 'Enf. Gestor de Camas' };
  };

  useEffect(() => {
    document.body.className = theme === 'light' ? 'theme-light' : 'theme-dark';
  }, [theme]);

  // Persist states to local storage
  useEffect(() => {
    localStorage.setItem('villarrica_bedsData', JSON.stringify(bedsData));
  }, [bedsData]);

  useEffect(() => {
    localStorage.setItem('villarrica_waitingList', JSON.stringify(waitingList));
  }, [waitingList]);

  useEffect(() => {
    localStorage.setItem('villarrica_hodomRequests', JSON.stringify(hodomRequests));
  }, [hodomRequests]);

  // CLINICAL HANDLERS

  // Add HODOM Request (called from DischargeModal in Dashboard.jsx)
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
      profesionalRequiere: getRoleUser().name,
      fecha: new Date().toLocaleDateString('es-CL'),
      hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      hodomChecks: reqData.hodomChecks || {},
      hodomObservaciones: reqData.hodomObservaciones || ''
    };
    setHodomRequests(prev => [newReq, ...prev]);
  };

  // Mark HODOM Request as done/admitted (frees the bed to 'cleaning' status!)
  const handleHodomMarkDone = (hodomId) => {
    const req = hodomRequests.find(r => r.id === hodomId);
    if (!req) return;

    // Transition request status to approved
    setHodomRequests(prev => prev.map(r => r.id === hodomId ? { ...r, estado: 'aprobado', aprobadoAt: new Date().toISOString() } : r));

    // Liberate corresponding bed in bedsData -> cleaning
    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const floors = ['piso4', 'piso3', 'piso2'];
      let found = false;

      for (const f of floors) {
        if (!next[f]) continue;
        for (const s in next[f]) {
          next[f][s] = next[f][s].map(room => {
            if (room.roomId === req.roomId) {
              return {
                ...room,
                beds: room.beds.map(bed => {
                  if (bed.id === req.bedId) {
                    found = true;
                    return {
                      ...bed,
                      status: 'cleaning',
                      cleaningAt: new Date().toISOString(),
                      patient: null,
                      diagnosis: null,
                      grdId: null,
                      grdName: null,
                      severity: null,
                      projectedDays: null,
                      assignedAt: null,
                      interconsultas: []
                    };
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

  // Delete HODOM Request
  const handleHodomDelete = (hodomId) => {
    setHodomRequests(prev => prev.filter(r => r.id !== hodomId));
  };

  // Mark Interconsulta as Done/Atendida
  const handleMarkICDone = (roomId, bedId, icId, newState = 'realizada', observaciones = '') => {
    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const floors = ['piso4', 'piso3', 'piso2'];

      for (const f of floors) {
        if (!next[f]) continue;
        for (const s in next[f]) {
          next[f][s] = next[f][s].map(room => {
            if (room.roomId === roomId) {
              return {
                ...room,
                beds: room.beds.map(bed => {
                  if (bed.id === bedId) {
                    const currentICs = bed.interconsultas || [];
                    const updatedICs = currentICs.map(ic => 
                      ic.id === icId 
                        ? { ...ic, estado: newState, observaciones: observaciones, resueltaAt: new Date().toISOString() } 
                        : ic
                    );
                    return {
                      ...bed,
                      interconsultas: updatedICs
                    };
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

  // Delete/cancel Interconsulta
  const handleDeleteIC = (roomId, bedId, icId) => {
    setBedsData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const floors = ['piso4', 'piso3', 'piso2'];

      for (const f of floors) {
        if (!next[f]) continue;
        for (const s in next[f]) {
          next[f][s] = next[f][s].map(room => {
            if (room.roomId === roomId) {
              return {
                ...room,
                beds: room.beds.map(bed => {
                  if (bed.id === bedId) {
                    const currentICs = bed.interconsultas || [];
                    return {
                      ...bed,
                      interconsultas: currentICs.filter(ic => ic.id !== icId)
                    };
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

  // Add a newly requested patient from SolicitudForm to waitingList
  const handleAddNewPatient = (newPatient) => {
    setWaitingList(prev => [newPatient, ...prev]);
    setCurrentView('dashboard');
  };

  // Count pending items for badges
  const pendingHodomCount = hodomRequests.filter(r => r.estado === 'pendiente').length;
  
  const getPendingICCount = () => {
    let count = 0;
    Object.keys(bedsData).forEach(floor => {
      Object.keys(bedsData[floor]).forEach(sector => {
        bedsData[floor][sector].forEach(room => {
          room.beds.forEach(bed => {
            if (bed.interconsultas) {
              count += bed.interconsultas.filter(ic => ic.estado === 'pendiente').length;
            }
          });
        });
      });
    });
    return count;
  };
  const pendingICCount = getPendingICCount();

  return (
    <div className="app-container">
      {/* Universal Header */}
      <header className="glass-panel">
        <div className="header-title" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('dashboard')}>
          <Activity className="icon-logo" size={28} />
          <h1 className="text-gradient">Gestión Camas</h1>
        </div>

        {/* Global Search Bar - Only show if in dashboard */}
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
          <div style={{ flex: 1 }}></div> /* Spacer */
        )}

        <div className="user-profile" style={{ gap: '16px' }}>
          {/* Navigation Links */}
          <div style={{ display: 'flex', gap: '8px', marginRight: '8px' }}>
            <button 
              className={`glass-button ${currentView === 'dashboard' ? 'primary' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button 
              className={`glass-button ${currentView === 'hodom' ? 'primary' : ''}`}
              onClick={() => setCurrentView('hodom')}
              style={{ position: 'relative' }}
            >
              <HeartPulse size={18} /> HODOM
              {pendingHodomCount > 0 && (
                <span className="nav-badge" style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: '#22c55e', color: 'white', fontSize: '0.7rem',
                  fontWeight: 800, padding: '2px 6px', borderRadius: '50%',
                  boxShadow: '0 0 8px rgba(34,197,94,0.6)'
                }}>{pendingHodomCount}</span>
              )}
            </button>
            <button 
              className={`glass-button ${currentView === 'interconsultas' ? 'primary' : ''}`}
              onClick={() => setCurrentView('interconsultas')}
              style={{ position: 'relative' }}
            >
              <Stethoscope size={18} /> Interconsultas
              {pendingICCount > 0 && (
                <span className="nav-badge" style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: '#fb923c', color: 'white', fontSize: '0.7rem',
                  fontWeight: 800, padding: '2px 6px', borderRadius: '50%',
                  boxShadow: '0 0 8px rgba(251,146,60,0.6)'
                }}>{pendingICCount}</span>
              )}
            </button>
            <button 
              className={`glass-button ${currentView === 'solicitud' ? 'primary' : ''}`}
              onClick={() => setCurrentView('solicitud')}
            >
              <FileText size={18} /> Solicitar Cama
            </button>
          </div>

          {/* Interactive Role Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--glass-border)', paddingLeft: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ROL:</span>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              className="glass-input"
              style={{ padding: '4px 8px', fontSize: '0.8rem', width: '130px', margin: 0, fontWeight: 700, cursor: 'pointer' }}
            >
              <option value="admin">Administrador</option>
              <option value="hodom">Equipo HODOM</option>
              <option value="doctor">Médico Clínico</option>
              <option value="gestor">Enf. Gestor</option>
            </select>
          </div>

          <div className="avatar">
            <User size={20} />
          </div>
          <div className="user-info" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{getRoleUser().name.split(' ')[0]}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{userRole === 'admin' ? 'UGP Central' : 'Clínico'}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
            <button 
              className="glass-button" 
              style={{ padding: '8px' }}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title={theme === 'light' ? "Modo Oscuro" : "Modo Claro"}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button className="glass-button" style={{ padding: '8px' }}>
              <Settings size={20} />
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
          user={getRoleUser()}
        />
      )}
      {currentView === 'solicitud' && (
        <SolicitudForm 
          onSubmit={handleAddNewPatient}
        />
      )}
      {currentView === 'hodom' && (
        <HodomPanel 
          hodomRequests={hodomRequests}
          onMarkDone={handleHodomMarkDone}
          onDelete={handleHodomDelete}
          userRole={userRole}
        />
      )}
      {currentView === 'interconsultas' && (
        <InterconsultasPanel 
          bedsData={bedsData}
          onMarkICDone={handleMarkICDone}
          onDeleteIC={handleDeleteIC}
          userRole={userRole}
        />
      )}
    </div>
  );
}

export default App;
