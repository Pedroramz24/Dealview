import React, { useContext } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { 
  LayoutDashboard, 
  Map, 
  Trello, 
  Users, 
  Calendar, 
  UsersRound,
  LogOut,
  Settings as SettingsIcon,
  KeyRound
} from 'lucide-react';
import { colors, shadows, gradients } from '../styles/designSystem';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

const MainLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation items
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/map', icon: Map, label: 'Map' },
    { path: '/pipeline', icon: Trello, label: 'Pipeline' },
    { path: '/contacts', icon: Users, label: 'Contacts' },
    { path: '/team', icon: UsersRound, label: 'Team' },
    { path: '/portals', icon: KeyRound, label: 'Portals' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <TooltipProvider>
      <div style={{ 
        display: 'flex', 
        height: '100vh',
        background: gradients.atmosphericGlow,
        backgroundColor: colors.void
      }}>
        {/* Compact Icon-Only Sidebar */}
        <div style={{
          width: '80px',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 0',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 100
        }}>
          {/* Logo */}
          <div 
            onClick={() => navigate('/dashboard')}
            style={{
              width: '48px',
              height: '48px',
              marginBottom: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img 
              src="https://customer-assets.emergentagent.com/job_unifydash/artifacts/zlxck81k_DealLinked%20Logo%20%28White%29.png"
              alt="DealLinked"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* Nav Items */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: 1,
            width: '100%',
            alignItems: 'center'
          }}>
            {navItems.map(({ path, icon: Icon, label }) => (
              <Tooltip key={path} delayDuration={0}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={path}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive(path) ? colors.primary : colors.textTertiary,
                      background: isActive(path) ? 'rgba(255, 0, 0, 0.15)' : 'transparent',
                      border: isActive(path) ? `1px solid ${colors.primary}40` : '1px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive(path)) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = colors.textSecondary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive(path)) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = colors.textTertiary;
                      }
                    }}
                  >
                    <Icon size={22} />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Bottom Actions */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            width: '100%',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: `1px solid ${colors.border}`,
            marginTop: 'auto'
          }}>
            {/* Settings */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <NavLink
                  to="/settings"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive('/settings') ? colors.primary : colors.textTertiary,
                    background: isActive('/settings') ? 'rgba(255, 0, 0, 0.15)' : 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive('/settings')) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = colors.textSecondary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive('/settings')) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = colors.textTertiary;
                    }
                  }}
                >
                  <SettingsIcon size={22} />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>

            {/* Logout */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.textTertiary,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = colors.textTertiary;
                  }}
                >
                  <LogOut size={22} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                <p>Logout</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Main Content */}
        <main style={{
          marginLeft: '80px',
          flex: 1,
          overflow: 'auto',
          background: 'transparent'
        }}>
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  );
};

export default MainLayout;
