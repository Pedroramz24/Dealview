import React, { useContext, useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { useCapabilities } from '../contexts/CapabilitiesContext';
import { getVisibleNavItems } from '../utils/capabilities';
import { supabase } from '../supabaseClient';
import { 
  Store, 
  Briefcase,
  LayoutDashboard, 
  Map, 
  Trello, 
  Users, 
  Mail, 
  Calendar, 
  UsersRound,
  LogOut,
  Inbox,
  TrendingUp,
  Settings as SettingsIcon,
  Shield,
  Send,
  MapPin
} from 'lucide-react';

const iconMap = {
  Store, Briefcase, LayoutDashboard, Map, Trello, Users, Mail, Calendar, UsersRound, Shield, TrendingUp, SettingsIcon, Send
};

const MainLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const { capabilities, loading: capabilitiesLoading } = useCapabilities();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasMapCRMAccess, setHasMapCRMAccess] = useState(false);

  // Check Map CRM access
  useEffect(() => {
    const checkMapCRMAccess = async () => {
      if (!user) {
        setHasMapCRMAccess(false);
        return;
      }
      
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('permissions')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error checking Map CRM access:', error);
          setHasMapCRMAccess(false);
          return;
        }
        
        const hasAccess = profile?.permissions?.map_crm_access === true;
        console.log('Map CRM Access Check:', { userId: user.id, hasAccess, permissions: profile?.permissions });
        setHasMapCRMAccess(hasAccess);
      } catch (error) {
        console.error('Failed to check Map CRM access:', error);
        setHasMapCRMAccess(false);
      }
    };

    checkMapCRMAccess();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get filtered nav items based on capabilities
  const navItems = capabilities && !capabilitiesLoading
    ? getVisibleNavItems(capabilities).map(item => ({
        ...item,
        icon: iconMap[item.icon] || Briefcase
      }))
    : [];

  const isActive = (path, exact = false) => {
    if (path === '/marketplace') {
      return location.pathname.startsWith('/marketplace');
    }
    if (path === '/workspace/dashboard') {
      return location.pathname === '/workspace/dashboard';
    }
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen" style={{ background: 'transparent' }}>
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
        {/* DealLinked Logo */}
        <div style={{ 
          marginBottom: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
        onClick={() => navigate('/workspace/dashboard')}
        >
          <img 
            src="https://customer-assets.emergentagent.com/job_unifydash/artifacts/zlxck81k_DealLinked%20Logo%20%28White%29.png"
            alt="DealLinked"
            style={{
              height: '48px',
              width: 'auto',
              filter: 'drop-shadow(0 0 8px rgba(48, 99, 255, 0.3))'
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
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            
            // Add workspace section divider before first workspace item
            const showDivider = index > 0 && item.isWorkspace && !navItems[index - 1].isWorkspace;
            
            return (
              <React.Fragment key={item.path}>
                {showDivider && (
                  <div style={{
                    width: '40px',
                    height: '1px',
                    background: 'rgba(255,255,255,0.15)',
                    margin: '8px 0'
                  }} />
                )}
                <NavLink
                  to={item.path}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    color: active ? '#00b8d4' : 'rgba(255,255,255,0.6)',
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
              </React.Fragment>
            );
          })}
          
          {/* Map CRM Internal Tool - Conditional */}
          {hasMapCRMAccess && (
            <>
              <div style={{
                width: '40px',
                height: '1px',
                background: 'rgba(255,255,255,0.15)',
                margin: '8px 0'
              }} />
              <NavLink
                to="/internal/map-crm"
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  color: location.pathname.startsWith('/internal/map-crm') ? '#00b8d4' : 'rgba(255,255,255,0.6)',
                  background: location.pathname.startsWith('/internal/map-crm') ? 'rgba(0, 184, 212, 0.15)' : 'transparent',
                  transition: 'all 0.3s ease',
                  textDecoration: 'none',
                  border: location.pathname.startsWith('/internal/map-crm') ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid transparent',
                  boxShadow: location.pathname.startsWith('/internal/map-crm') ? '0 0 20px rgba(0, 184, 212, 0.2)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!location.pathname.startsWith('/internal/map-crm')) {
                    e.currentTarget.style.color = '#00b8d4';
                    e.currentTarget.style.background = 'rgba(0, 184, 212, 0.08)';
                    e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 184, 212, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!location.pathname.startsWith('/internal/map-crm')) {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {location.pathname.startsWith('/internal/map-crm') && (
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
                
                <MapPin size={24} strokeWidth={1.5} />
                
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
                  🔒 Map Tool
                </div>
              </NavLink>
            </>
          )}
        </nav>

        {/* Bottom Section - Settings, Logout */}
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
          {/* Settings Icon */}
          <NavLink
            to="/settings"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              color: location.pathname === '/settings' ? '#00b8d4' : 'rgba(255,255,255,0.6)',
              background: location.pathname === '/settings' ? 'rgba(0, 184, 212, 0.15)' : 'transparent',
              border: 'none',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== '/settings') {
                e.currentTarget.style.color = '#00b8d4';
                e.currentTarget.style.background = 'rgba(0, 184, 212, 0.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== '/settings') {
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <SettingsIcon size={24} strokeWidth={1.5} />
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
          </NavLink>

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