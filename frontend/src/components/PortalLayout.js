import React, { useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { colors } from '../styles/designSystem';

const PortalLayout = () => {
  const { portalId } = useParams();
  const navigate = useNavigate();
  const portalName = localStorage.getItem(`portal_name_${portalId}`);

  useEffect(() => {
    document.title = 'DealLinked - Client Portal';
    return () => { document.title = 'DealLinked'; };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(`portal_session_${portalId}`);
    localStorage.removeItem(`portal_name_${portalId}`);
    localStorage.removeItem(`portal_member_${portalId}`);
    navigate(`/portal/${portalId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000' }}>
      <div style={{
        height: '52px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="https://customer-assets.emergentagent.com/job_unifydash/artifacts/zlxck81k_DealLinked%20Logo%20%28White%29.png"
            alt="DL"
            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
          />
          {portalName && (
            <span style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 500 }}>
              {portalName}
            </span>
          )}
        </div>
        <button
          data-testid="portal-logout"
          onClick={handleLogout}
          style={{
            background: 'transparent', border: 'none', color: colors.textTertiary,
            cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '13px',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = colors.textTertiary}
        >
          <LogOut size={15} /> Logout
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Outlet />
      </div>
    </div>
  );
};

export default PortalLayout;
