import React, { useContext } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { Map, LayoutDashboard, FileText, Users, Trello, UsersRound, LogOut, Inbox, Settings } from 'lucide-react';

const MainLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Map', icon: Map, exact: true },
    { path: '/deals', label: 'Deals', icon: FileText },
    { path: '/pipeline', label: 'Pipeline', icon: Trello },
    { path: '/contacts', label: 'Contacts', icon: Users },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/team', label: 'Team', icon: UsersRound },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen" style={{ background: '#000000' }}>
      {/* Compact Icon-Only Sidebar */}
      <div style={{
        width: '80px',
        background: 'rgba(0, 0, 0, 0.8)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 0',
        boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
        position: 'relative',
        zIndex: 100
      }}>
        {/* DealView Icon Logo */}
        <div style={{ 
          marginBottom: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img 
            src="/dealview-icon.svg" 
            alt="DealView" 
            style={{ 
              width: '48px', 
              height: '48px',
              filter: 'drop-shadow(0 0 8px rgba(0, 184, 212, 0.3))'
            }} 
          />
        </div>

        {/* Navigation Icons */}
        <nav style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px',
          flex: 1,
          width: '100%',
          alignItems: 'center'
        }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  color: active ? '#00d4aa' : 'rgba(255,255,255,0.6)',
                  background: active ? 'rgba(0, 184, 212, 0.15)' : 'transparent',
                  transition: 'all 0.3s ease',
                  textDecoration: 'none',
                  border: active ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid transparent',
                  boxShadow: active ? '0 0 20px rgba(0, 184, 212, 0.2)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = '#00b8d4';
                    e.currentTarget.style.background = 'rgba(0, 184, 212, 0.08)';
                    e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 184, 212, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Active Indicator Line */}
                {active && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '3px',
                    height: '60%',
                    background: 'linear-gradient(180deg, #00b8d4 0%, #00d4aa 100%)',
                    borderRadius: '0 4px 4px 0',
                    boxShadow: '0 0 8px rgba(0, 184, 212, 0.5)'
                  }} />
                )}
                
                <Icon size={24} strokeWidth={1.5} />
                
                {/* Tooltip */}
                <div style={{
                  position: 'absolute',
                  left: '100%',
                  marginLeft: '12px',
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(0, 184, 212, 0.3)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  opacity: 0,
                  pointerEvents: 'none',
                  transition: 'opacity 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  zIndex: 1000
                }}
                className="nav-tooltip"
                >
                  {item.label}
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Section - Inbox, Settings, Logout */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          alignItems: 'center',
          marginTop: 'auto',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          {/* Inbox Icon */}
          <button
            onClick={() => navigate('/inbox')}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              color: location.pathname === '/inbox' ? '#00d4aa' : 'rgba(255,255,255,0.6)',
              background: location.pathname === '/inbox' ? 'rgba(0, 184, 212, 0.15)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== '/inbox') {
                e.currentTarget.style.color = '#00b8d4';
                e.currentTarget.style.background = 'rgba(0, 184, 212, 0.08)';
                e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 184, 212, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== '/inbox') {
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Inbox size={24} strokeWidth={1.5} />
            <div style={{
              position: 'absolute',
              left: '100%',
              marginLeft: '12px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(0, 184, 212, 0.3)',
              borderRadius: '6px',
              padding: '6px 12px',
              whiteSpace: 'nowrap',
              fontSize: '13px',
              fontWeight: '500',
              color: '#FFFFFF',
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.2s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              zIndex: 1000
            }}
            className="nav-tooltip"
            >
              Inbox
            </div>
          </button>

          {/* Settings Icon */}
          <button
            onClick={() => navigate('/settings')}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              color: location.pathname === '/settings' ? '#00d4aa' : 'rgba(255,255,255,0.6)',
              background: location.pathname === '/settings' ? 'rgba(0, 184, 212, 0.15)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== '/settings') {
                e.currentTarget.style.color = '#00b8d4';
                e.currentTarget.style.background = 'rgba(0, 184, 212, 0.08)';
                e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 184, 212, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== '/settings') {
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <Settings size={24} strokeWidth={1.5} />
            <div style={{
              position: 'absolute',
              left: '100%',
              marginLeft: '12px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(0, 184, 212, 0.3)',
              borderRadius: '6px',
              padding: '6px 12px',
              whiteSpace: 'nowrap',
              fontSize: '13px',
              fontWeight: '500',
              color: '#FFFFFF',
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.2s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              zIndex: 1000
            }}
            className="nav-tooltip"
            >
              Settings
            </div>
          </button>

          {/* Logout Icon */}
          <button
            onClick={handleLogout}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              color: 'rgba(255,255,255,0.6)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(239, 68, 68, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <LogOut size={24} strokeWidth={1.5} />
            <div style={{
              position: 'absolute',
              left: '100%',
              marginLeft: '12px',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              padding: '6px 12px',
              whiteSpace: 'nowrap',
              fontSize: '13px',
              fontWeight: '500',
              color: '#FFFFFF',
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.2s ease',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              zIndex: 1000
            }}
            className="nav-tooltip"
            >
              Logout
            </div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;