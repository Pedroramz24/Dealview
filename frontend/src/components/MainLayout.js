import React, { useContext, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Map, LayoutDashboard, FileText, Users, Trello, UsersRound, LogOut, Menu, X, Layers } from 'lucide-react';

const MainLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [layerManagerOpen, setLayerManagerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Map', icon: Map, exact: true },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/deals', label: 'Deals', icon: FileText },
    { path: '/contacts', label: 'Contacts', icon: Users },
    { path: '/pipeline', label: 'Pipeline', icon: Trello },
    { path: '/team', label: 'Team', icon: UsersRound },
  ];

  return (
    <div className="flex h-screen" style={{ background: '#000000' }}>
      {/* Floating Menu Button - Shows when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 9999,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '10px',
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            color: '#FFFFFF'
          }}
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar */}
      <div className={`flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'}`} style={{
        background: 'rgba(255,255,255,0.03)',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
        overflow: 'hidden',
        boxShadow: '4px 0 16px rgba(0,0,0,0.3)',
        position: 'relative'
      }}>
        {/* Close Button - Inside sidebar top right */}
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '16px',
              zIndex: 10,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              color: '#FFFFFF'
            }}
          >
            <X size={18} />
          </button>
        )}
        {/* Brand Slot - Tight Fit */}
        {sidebarOpen && (
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <img 
              src="/dealview-logo.svg" 
              alt="Dealview"
              style={{ 
                height: '26px',
                width: 'auto',
                maxWidth: '90%',
                objectFit: 'contain',
                flexShrink: 0,
                display: 'block'
              }}
            />
          </div>
        )}

        {sidebarOpen && (
          <>
            <nav className="flex-1 px-2 py-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) =>
                    `sidebar-nav ${isActive ? 'active' : ''}`
                  }
                  style={{ 
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '2px'
                  }}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </NavLink>
              ))}

            </nav>

            <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={handleLogout}
                data-testid="logout-button"
                className="w-full flex items-center justify-start px-4 py-3 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.6)',
                  transition: 'all 150ms',
                  cursor: 'pointer'
                }}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
