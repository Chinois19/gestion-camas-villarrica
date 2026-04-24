import { useState } from 'react';
import { Activity, Settings, User, Search, Map, Layers, FileText, LayoutDashboard } from 'lucide-react';
import './App.css';
import Dashboard from './components/Dashboard';
import SolicitudForm from './components/SolicitudForm';

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'solicitud'
  const [searchQuery, setSearchQuery] = useState('');

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

        <div className="user-profile">
          <div style={{ display: 'flex', gap: '8px', marginRight: '24px' }}>
            <button 
              className={`glass-button ${currentView === 'dashboard' ? 'primary' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            <button 
              className={`glass-button ${currentView === 'solicitud' ? 'primary' : ''}`}
              onClick={() => setCurrentView('solicitud')}
            >
              <FileText size={18} /> Solicitar Cama
            </button>
          </div>

          <div className="avatar">
            <User size={20} />
          </div>
          <div className="user-info" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Médico / Enf.</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hosp. Villarrica</span>
          </div>
          <button className="glass-button" style={{ padding: '8px', marginLeft: '8px' }}>
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main View Router */}
      {currentView === 'dashboard' && <Dashboard searchQuery={searchQuery} />}
      {currentView === 'solicitud' && <SolicitudForm />}

    </div>
  );
}

export default App;
