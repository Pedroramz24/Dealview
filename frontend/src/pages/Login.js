import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';
import { colors, gradients } from '../styles/designSystem';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRequestAccess, setShowRequestAccess] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (error) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!requestName.trim() || !requestEmail.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setRequestLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: requestEmail, password: crypto.randomUUID(), full_name: requestName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Access request submitted! You will be notified once approved.');
        setShowRequestAccess(false);
        setRequestName('');
        setRequestEmail('');
      } else {
        toast.error(data.detail || 'Failed to submit request');
      }
    } catch (e) {
      toast.error('Failed to submit request');
    } finally {
      setRequestLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error('Please enter your email');
      return;
    }
    
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      toast.success('Password reset email sent!');
      setShowForgotPassword(false);
    } catch (error) {
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      background: gradients.atmosphericGlow,
      backgroundColor: colors.void
    }}>
      {/* Ambient gradient */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '800px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(255, 0, 0, 0.15) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '400px',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          background: 'rgba(12, 12, 12, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '32px',
          border: `1px solid ${colors.border}`
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img 
              src="https://customer-assets.emergentagent.com/job_unifydash/artifacts/zlxck81k_DealLinked%20Logo%20%28White%29.png" 
              alt="DealLinked" 
              style={{ 
                height: '100px',
                width: 'auto',
                objectFit: 'contain',
                margin: '0 auto 16px'
              }}
            />
            <p style={{ color: colors.textTertiary, fontSize: '14px' }}>
              Commercial Real Estate CRM
            </p>
          </div>

          {/* Forgot Password Modal */}
          {showForgotPassword ? (
            <div>
              <h2 style={{ 
                color: colors.textPrimary, 
                fontSize: '20px', 
                fontWeight: '600',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                Reset Password
              </h2>
              <p style={{ 
                color: colors.textTertiary, 
                fontSize: '14px', 
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                Enter your email to receive a reset link
              </p>
              <div style={{ marginBottom: '16px' }}>
                <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Email</Label>
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{
                    marginTop: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary
                  }}
                />
              </div>
              <Button
                onClick={handleForgotPassword}
                disabled={resetLoading}
                style={{
                  width: '100%',
                  background: gradients.primaryButton,
                  border: 'none',
                  marginBottom: '12px'
                }}
              >
                {resetLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <button
                onClick={() => setShowForgotPassword(false)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: colors.textTertiary,
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Back to Login
              </button>
            </div>
          ) : showRequestAccess ? (
            <div>
              <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: '600', marginBottom: '8px', textAlign: 'center' }}>
                Request Access
              </h2>
              <p style={{ color: colors.textTertiary, fontSize: '13px', textAlign: 'center', marginBottom: '20px' }}>
                Submit your details and we'll review your request.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Full Name</Label>
                <Input
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  placeholder="John Doe"
                  style={{ marginTop: '8px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Email</Label>
                <Input
                  type="email"
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{ marginTop: '8px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                />
              </div>
              <Button
                onClick={handleRequestAccess}
                disabled={requestLoading}
                style={{ width: '100%', background: gradients.primaryButton, border: 'none', height: '44px', fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}
              >
                {requestLoading ? 'Submitting...' : 'Submit Request'}
              </Button>
              <button onClick={() => setShowRequestAccess(false)} style={{ width: '100%', background: 'transparent', border: 'none', color: colors.textTertiary, cursor: 'pointer', fontSize: '14px' }}>
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: '16px' }}>
                <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  style={{
                    marginTop: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '24px' }}>
                <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    marginTop: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary
                  }}
                />
              </div>

              {/* Forgot Password Link */}
              <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.primary,
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: gradients.primaryButton,
                  border: 'none',
                  height: '44px',
                  fontSize: '15px',
                  fontWeight: '600'
                }}
              >
                {loading ? 'Please wait...' : 'Login'}
              </Button>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowRequestAccess(true)}
                  style={{
                    background: 'none', border: 'none',
                    color: colors.textTertiary, cursor: 'pointer', fontSize: '13px'
                  }}
                >
                  Don't have an account? <span style={{ color: colors.primary }}>Request Access</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
