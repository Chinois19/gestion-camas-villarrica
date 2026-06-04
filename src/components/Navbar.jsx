import {
  LayoutDashboard, BarChart2, Clock, Stethoscope, Sparkles, HeartPulse,
  FileText, ShieldCheck, Users, Settings, ChevronDown, Database
} from 'lucide-react';
import './Navbar.css';

/**
 * Navbar — Horizontal Top Navigation Bar with Dropdown Menus.
 *
 * Props:
 *   currentView    – active view id
 *   onNavigate     – fn(viewId) to switch views
 *   navPermissions – { canDashboard, canInsights, canIC, canAseo, canHodom, canSolicitud, canUsuarios, canInfra }
 *   badges         – { interconsultas, hodom, aseo }
 *   onSolicitudNew – special handler for "Solicitar Cama"
 */
export default function Navbar({ currentView, onNavigate, navPermissions, badges, onSolicitudNew }) {
  
  const handleNav = (viewId, customHandler) => {
    if (customHandler) customHandler();
    else onNavigate(viewId);
  };

  // ── Menu structure ────────────────────────────────────────
  const menuItems = [
    {
      type: 'item',
      id: 'dashboard',
      label: 'Gestión de Camas',
      icon: <LayoutDashboard size={16} />,
      show: navPermissions.canDashboard,
    },
    {
      type: 'group',
      id: 'estadisticas_group',
      label: 'Estadísticas',
      icon: <BarChart2 size={16} />,
      show: navPermissions.canInsights || navPermissions.canDatabase,
      children: [
        {
          id: 'insights',
          label: 'Dashboard Insights',
          icon: <BarChart2 size={16} />,
          show: navPermissions.canInsights,
        },
        {
          id: 'database',
          label: 'Base de Datos Entrega Turnos',
          icon: <Database size={16} />,
          show: navPermissions.canDatabase,
        }
      ]
    },
    {
      type: 'group',
      id: 'procesos',
      label: 'Procesos Pendientes',
      icon: <Clock size={16} />,
      show: navPermissions.canIC || navPermissions.canAseo || navPermissions.canHodom,
      children: [
        {
          id: 'interconsultas',
          label: 'Visor de IC',
          icon: <Stethoscope size={16} />,
          badge: badges.interconsultas,
          badgeColor: '#fb923c',
          show: navPermissions.canIC,
        },
        {
          id: 'aseo',
          label: 'Aseo',
          icon: <Sparkles size={16} />,
          badge: badges.aseo,
          badgeColor: '#f59e0b',
          show: navPermissions.canAseo,
        },
        {
          id: 'hodom',
          label: 'HODOM',
          icon: <HeartPulse size={16} />,
          badge: badges.hodom,
          badgeColor: '#22c55e',
          show: navPermissions.canHodom,
        },
      ],
    },
    {
      type: 'item',
      id: 'solicitud',
      label: 'Solicitud de Cama',
      icon: <FileText size={16} />,
      show: navPermissions.canSolicitud,
      customHandler: onSolicitudNew,
    },
    {
      type: 'group',
      id: 'admin',
      label: 'Administrador',
      icon: <ShieldCheck size={16} />,
      show: navPermissions.canUsuarios || navPermissions.canInfra,
      children: [
        {
          id: 'usuarios',
          label: 'Usuarios',
          icon: <Users size={16} />,
          show: navPermissions.canUsuarios,
        },
        {
          id: 'infraestructura',
          label: 'Infraestructura',
          icon: <Settings size={16} />,
          show: navPermissions.canInfra,
        },
      ],
    },
  ].filter(item => item.show);

  return (
    <div className="navbar-wrapper">
      <nav className="navbar-menu" id="navbar-menu">
        {menuItems.map((item) => {
          if (item.type === 'item') {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                className={`navbar-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNav(item.id, item.customHandler)}
              >
                <span className="navbar-item-icon">{item.icon}</span>
                <span className="navbar-item-label">{item.label}</span>
                {item.badge > 0 && (
                  <span className="navbar-item-badge" style={{ background: item.badgeColor || '#fb923c' }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          }

          // Group Dropdown
          const visibleChildren = item.children.filter(c => c.show);
          if (visibleChildren.length === 0) return null;

          const groupBadgeTotal = visibleChildren.reduce((sum, c) => sum + (c.badge || 0), 0);
          const hasActiveChild = visibleChildren.some(c => currentView === c.id);

          return (
            <div key={item.id} className="navbar-group">
              <button className={`navbar-group-header ${hasActiveChild ? 'has-active' : ''}`}>
                <span className="navbar-item-icon">{item.icon}</span>
                <span className="navbar-item-label">{item.label}</span>
                {groupBadgeTotal > 0 && (
                  <span className="navbar-item-badge" style={{ background: '#fb923c' }}>
                    {groupBadgeTotal}
                  </span>
                )}
                <span className="navbar-chevron">
                  <ChevronDown size={14} />
                </span>
              </button>

              <div className="navbar-group-children">
                {visibleChildren.map(child => {
                  const isActive = currentView === child.id;
                  return (
                    <button
                      key={child.id}
                      className={`navbar-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleNav(child.id)}
                    >
                      <span className="navbar-item-icon">{child.icon}</span>
                      <span className="navbar-item-label">{child.label}</span>
                      {child.badge > 0 && (
                        <span className="navbar-item-badge" style={{ background: child.badgeColor || '#fb923c' }}>
                          {child.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
