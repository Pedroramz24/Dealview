import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyRound, Loader2 } from 'lucide-react';
import { colors, gradients, borderRadius } from '../styles/designSystem';

const API = process.env.REACT_APP_BACKEND_URL;

const PortalLogin = () => {
  const { portalId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'DealLinked - Client Portal';
    return () => { document.title = 'DealLinked'; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/portal/${portalId}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), access_code: code.trim().toUpperCase() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem(`portal_session_${portalId}`, data.session_token);
        localStorage.setItem(`portal_name_${portalId}`, data.portal_name);
        localStorage.setItem(`portal_member_${portalId}`, data.member_name);
        navigate(`/portal/${portalId}/map`);
      } else {
        setError(data.detail || 'Invalid credentials');
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#000', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      backgroundImage: 'radial-gradient(ellipse 800px 600px at 50% 30%, rgba(212,18,18,0.08) 0%, transparent 70%)'
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', padding: '40px',
        background: 'rgba(12,12,12,0.95)', border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg, backdropFilter: 'blur(20px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 16px',
            background: 'rgba(212,18,18,0.1)', border: '1px solid rgba(212,18,18,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <KeyRound size={24} style={{ color: colors.primary }} />
          </div>
          <h1 style={{ color: colors.textPrimary, fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>
            Investor Portal
          </h1>
          <p style={{ color: colors.textTertiary, fontSize: '14px' }}>
            Enter your name and access code
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: colors.textTertiary, fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Your Name
            </label>
            <input
              data-testid="portal-login-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              autoFocus
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`,
                color: '#fff', fontSize: '14px', outline: 'none'
              }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: colors.textTertiary, fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Access Code
            </label>
            <input
              data-testid="portal-login-code"
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="XXXXXXXX"
              required
              maxLength={8}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`,
                color: '#fff', fontSize: '16px', fontFamily: 'monospace',
                letterSpacing: '3px', textAlign: 'center', outline: 'none'
              }}
            />
          </div>
          {error && (
            <div data-testid="portal-login-error" style={{
              padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: '13px', textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          <button
            data-testid="portal-login-submit"
            type="submit"
            disabled={loading || !name.trim() || !code.trim()}
            style={{
              width: '100%', padding: '13px', borderRadius: '8px', border: 'none',
              background: (loading || !name.trim() || !code.trim()) ? 'rgba(212,18,18,0.3)' : gradients.primaryButton,
              color: '#000', fontSize: '14px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Verifying...' : 'Enter Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PortalLogin;
