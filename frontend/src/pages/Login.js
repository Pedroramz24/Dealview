import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import RoleSelectionStep from '../components/onboarding/RoleSelectionStep';
import UnifiedOnboardingWizard from '../components/onboarding/UnifiedOnboardingWizard';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const { login, signup } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // Login with Supabase
        await login(email, password);
      } else {
        // Redirect to onboarding flow for signups
        setShowOnboarding(true);
        setLoading(false);
        return;
      }
    } catch (error) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleOnboardingComplete = () => {
    navigate('/marketplace');
  };

  const handleBackToLogin = () => {
    setShowOnboarding(false);
    setSelectedRole(null);
  };

  // Show onboarding flow if user clicked signup
  if (showOnboarding && !selectedRole) {
    return <RoleSelectionStep onSelect={handleRoleSelect} />;
  }

  if (showOnboarding && selectedRole) {
    return (
      <UnifiedOnboardingWizard
        selectedRole={selectedRole}
        onComplete={handleOnboardingComplete}
        onBack={() => setSelectedRole(null)}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      {/* Ambient gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass-surface p-8">
          <div className="text-center mb-8 flex flex-col items-center">
            <img 
              src="/dealview-logo.svg" 
              alt="Dealview" 
              className="mb-6"
              style={{ 
                height: '120px',
                width: 'auto',
                objectFit: 'contain'
              }}
            />
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Commercial Real Estate CRM</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <Label htmlFor="fullName" style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="mt-2"
                  data-testid="register-fullname-input"
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                    backdropFilter: 'blur(16px)'
                  }}
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2"
                data-testid="login-email-input"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  backdropFilter: 'blur(16px)'
                }}
              />
            </div>

            <div>
              <Label htmlFor="password" style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2"
                data-testid="login-password-input"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  backdropFilter: 'blur(16px)'
                }}
              />
            </div>

            {/* Forgot Password Link - Only show in login mode */}
            {isLogin && (
              <div style={{ textAlign: 'right', marginTop: '-8px' }}>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00b8d4',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    padding: '4px 0',
                    transition: 'all 0.2s',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#00d4ed';
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#00b8d4';
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="login-submit-button"
              style={{
                background: 'var(--accent)',
                color: 'white',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 500,
                transition: 'all 150ms',
                border: 'none',
                marginTop: '24px'
              }}
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              data-testid="toggle-auth-mode"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
};

export default Login;
