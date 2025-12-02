import React, { useState, useContext } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { 
  Store, 
  Briefcase, 
  Settings, 
  LogOut,
  LayoutDashboard, 
  Map, 
  Trello, 
  Users, 
  Mail, 
  Calendar, 
  UsersRound,
  ChevronRight
} from 'lucide-react';

const DualModeLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine current mode based on route
  const isMarketplaceMode = location.pathname.startsWith('/marketplace');
  const isWorkspaceMode = location.pathname.startsWith('/workspace');
  const [workspaceExpanded, setWorkspaceExpanded] = useState(isWorkspaceMode);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Workspace sub-items (CRM tools)
  const workspaceItems = [
    { path: '/workspace/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/workspace/map', label: 'Map', icon: Map },
    { path: '/workspace/deals', label: 'Deals', icon: Trello },
    { path: '/workspace/contacts', label: 'Contacts', icon: Users },
    { path: '/workspace/campaigns', label: 'Campaigns', icon: Mail },
    { path: '/workspace/calendar', label: 'Calendar', icon: Calendar },
    { path: '/workspace/team', label: 'Team', icon: UsersRound },
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const sidebarWidth = workspaceExpanded ? '240px' : '80px';

  return (
    <div className="flex h-screen" style={{ background: '#000000' }}>
      {/* Dual-Mode Sidebar */}
      <div style={{
        width: sidebarWidth,
        background: 'rgba(0, 0, 0, 0.8)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
        position: 'relative',
        zIndex: 100,
        transition: 'width 0.3s ease'
      }}>
        {/* Logo */}
        <div style={{ 
          marginBottom: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: workspaceExpanded ? '20px' : '0'
        }}>
          {workspaceExpanded ? (
            <div style={{ color: '#00b8d4', fontSize: '24px', fontWeight: '700' }}>
              DealLinked
            </div>
          ) : (
            <div style={{ 
              width: '48px', 
              height: '48px',
              background: 'linear-gradient(135deg, #00b8d4 0%, #00b8d4 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '700',
              color: '#000'
            }}>
              DL
            </div>
          )}
        </div>

        {/* Primary Navigation */}
        <nav style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          flex: 1,
          paddingLeft: workspaceExpanded ? '16px' : '12px',
          paddingRight: workspaceExpanded ? '16px' : '12px'
        }}>
          {/* Marketplace */}
          <NavLink
            to="/marketplace"
            onClick={() => setWorkspaceExpanded(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: workspaceExpanded ? '12px 16px' : '12px',
              borderRadius: '12px',
              color: isMarketplaceMode ? '#00b8d4' : 'rgba(255,255,255,0.6)',
              background: isMarketplaceMode ? 'rgba(0, 184, 212, 0.15)' : 'transparent',
              border: isMarketplaceMode ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid transparent',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              justifyContent: workspaceExpanded ? 'flex-start' : 'center'
            }}
          >
            <Store size={24} strokeWidth={1.5} />
            {workspaceExpanded && <span style={{ fontWeight: '500' }}>Marketplace</span>}
          </NavLink>

          {/* Workspace (with expandable sub-menu) */}
          <div>
            <button
              onClick={() => {
                if (!workspaceExpanded) {
                  setWorkspaceExpanded(true);
                  if (!isWorkspaceMode) {
                    navigate('/workspace/dashboard');
                  }
                } else {
                  if (isWorkspaceMode) {
                    setWorkspaceExpanded(false);
                  } else {
                    navigate('/workspace/dashboard');
                  }
                }
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: workspaceExpanded ? '12px 16px' : '12px',
                borderRadius: '12px',
                color: isWorkspaceMode ? '#00b8d4' : 'rgba(255,255,255,0.6)',
                background: isWorkspaceMode ? 'rgba(0, 184, 212, 0.15)' : 'transparent',
                border: isWorkspaceMode ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                justifyContent: workspaceExpanded ? 'space-between' : 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Briefcase size={24} strokeWidth={1.5} />
                {workspaceExpanded && <span style={{ fontWeight: '500' }}>Workspace</span>}
              </div>
              {workspaceExpanded && (
                <ChevronRight 
                  size={16} 
                  style={{ 
                    transform: workspaceExpanded && isWorkspaceMode ? 'rotate(90deg)' : 'rotate(0)',
                    transition: 'transform 0.3s ease'
                  }} 
                />
              )}
            </button>

            {/* Workspace Sub-Items */}
            {workspaceExpanded && isWorkspaceMode && (
              <div style={{ 
                marginTop: '8px',
                marginLeft: '12px',
                paddingLeft: '16px',
                borderLeft: '1px solid rgba(255,255,255,0.1)'
              }}>
                {workspaceItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        color: active ? '#00b8d4' : 'rgba(255,255,255,0.5)',
                        background: active ? 'rgba(0, 184, 212, 0.1)' : 'transparent',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: active ? '500' : '400',
                        transition: 'all 0.2s ease',
                        marginBottom: '4px'
                      }}
                    >
                      <Icon size={18} strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settings */}
          <NavLink
            to="/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: workspaceExpanded ? '12px 16px' : '12px',
              borderRadius: '12px',
              color: isActive('/settings') ? '#00b8d4' : 'rgba(255,255,255,0.6)',
              background: isActive('/settings') ? 'rgba(0, 184, 212, 0.15)' : 'transparent',
              border: isActive('/settings') ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid transparent',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              justifyContent: workspaceExpanded ? 'flex-start' : 'center'
            }}
          >
            <Settings size={24} strokeWidth={1.5} />
            {workspaceExpanded && <span style={{ fontWeight: '500' }}>Settings</span>}
          </NavLink>
        </nav>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: workspaceExpanded ? '12px 32px' : '12px',
            borderRadius: '12px',
            color: 'rgba(255,255,255,0.6)',
            background: 'transparent',
            border: '1px solid transparent',
            textDecoration: 'none',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            justifyContent: workspaceExpanded ? 'flex-start' : 'center',
            marginTop: '16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ff4444';
            e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={24} strokeWidth={1.5} />
          {workspaceExpanded && <span style={{ fontWeight: '500' }}>Logout</span>}
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Outlet />
      </div>
    </div>
  );
};

export default DualModeLayout;
