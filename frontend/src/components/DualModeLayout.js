import React, { useState, useContext } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { useCapabilities } from '../contexts/CapabilitiesContext';
import { getVisibleNavItems } from '../utils/capabilities';
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
  ChevronRight,
  Shield,
  MessageCircle,
  Send
} from 'lucide-react';
import { gradients } from '../styles/designSystem';

const iconMap = {
  Store, Briefcase, LayoutDashboard, Map, Trello, Users, Mail, Calendar, UsersRound, Shield, Settings, MessageCircle, Send
};

const DualModeLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const { capabilities, loading: capabilitiesLoading } = useCapabilities();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Sidebar collapse state for Marketplace
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Determine current mode based on route
  const isMarketplaceMode = location.pathname.startsWith('/marketplace');
  const isWorkspaceMode = location.pathname.startsWith('/workspace');
  const [workspaceExpanded, setWorkspaceExpanded] = useState(isWorkspaceMode);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get workspace items filtered by capabilities
  const workspaceItems = capabilities && !capabilitiesLoading
    ? getVisibleNavItems(capabilities)
        .filter(item => item.path.startsWith('/workspace'))
        .map(item => ({
          ...item,
          icon: iconMap[item.icon] || Briefcase
        }))
    : [];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const sidebarWidth = workspaceExpanded ? '240px' : (sidebarCollapsed ? '0px' : '80px');
  
  // Only show toggle on marketplace feed page, not detail pages
  const showToggle = isMarketplaceMode && location.pathname === '/marketplace';

  return (
    <div className="flex h-screen" style={{ 
      background: 'transparent',  // Let body gradient show through
      position: 'relative'
    }}>
      {/* Toggle Button for Marketplace Mode - Always visible */}
      {showToggle && (
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            position: 'fixed',
            top: '20px',
            left: sidebarCollapsed ? '20px' : '100px',
            zIndex: 200,
            background: 'rgba(12, 12, 12, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            color: '#ff0000',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(255, 0, 0, 0.2)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 0, 0, 0.15)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5), 0 0 32px rgba(255, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(12, 12, 12, 0.95)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(255, 0, 0, 0.2)';
          }}
        >
          <ChevronRight 
            size={20} 
            style={{ 
              transition: 'transform 0.3s',
              transform: sidebarCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          />
          {sidebarCollapsed && (
            <span style={{ fontSize: '13px', fontWeight: '600' }}>
              Menu
            </span>
          )}
        </button>
      )}

      {/* Dual-Mode Sidebar */}
      <div style={{
        width: sidebarWidth,
        background: 'rgba(0, 0, 0, 0.8)',
        borderRight: sidebarCollapsed ? 'none' : '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        display: sidebarCollapsed ? 'none' : 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
        position: 'relative',
        zIndex: 100,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Logo */}
        <div style={{ 
          marginBottom: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: workspaceExpanded ? '20px' : '0',
          cursor: 'pointer'
        }}
        onClick={() => navigate('/workspace/dashboard')}
        >
          <img 
            src="https://customer-assets.emergentagent.com/job_unifydash/artifacts/zlxck81k_DealLinked%20Logo%20%28White%29.png"
            alt="DealLinked"
            style={{
              height: workspaceExpanded ? '40px' : '48px',
              width: 'auto',
              filter: 'drop-shadow(0 0 8px rgba(48, 99, 255, 0.3))'
            }}
          />
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
              color: isMarketplaceMode ? '#ff0000' : 'rgba(255,255,255,0.6)',
              background: isMarketplaceMode ? 'rgba(255, 0, 0, 0.15)' : 'transparent',
              border: isMarketplaceMode ? '1px solid rgba(255, 0, 0, 0.3)' : '1px solid transparent',
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
                color: isWorkspaceMode ? '#ff0000' : 'rgba(255,255,255,0.6)',
                background: isWorkspaceMode ? 'rgba(255, 0, 0, 0.15)' : 'transparent',
                border: isWorkspaceMode ? '1px solid rgba(255, 0, 0, 0.3)' : '1px solid transparent',
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
                        color: active ? '#ff0000' : 'rgba(255,255,255,0.5)',
                        background: active ? 'rgba(255, 0, 0, 0.1)' : 'transparent',
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
              color: isActive('/settings') ? '#ff0000' : 'rgba(255,255,255,0.6)',
              background: isActive('/settings') ? 'rgba(255, 0, 0, 0.15)' : 'transparent',
              border: isActive('/settings') ? '1px solid rgba(255, 0, 0, 0.3)' : '1px solid transparent',
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
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1
      }}>
        <Outlet />
      </div>
    </div>
  );
};

export default DualModeLayout;
