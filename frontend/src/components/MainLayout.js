import React, { useContext } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Map, LayoutDashboard, FileText, Users, Trello, UsersRound, LogOut } from 'lucide-react';

const MainLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

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
    <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <div className="w-64 flex flex-col" style={{
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border-subtle)'
      }}>
        {/* Brand Slot - Compact Fixed Height */}
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 12px',
          height: '56px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <img 
            src="/dealview-logo.svg" 
            alt="Dealview"
            style={{ 
              height: '24px',
              width: 'auto',
              objectFit: 'contain',
              flexShrink: 0,
              display: 'block'
            }}
          />
        </div>

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

        <div className="p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center justify-start px-4 py-3 rounded-lg"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              transition: 'all 150ms',
              cursor: 'pointer'
            }}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
