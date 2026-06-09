import React, { useState } from 'react';
import { X, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success('Password reset email sent!');
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setEmailSent(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
      onClick={handleClose}
    >
      <div
        className="glass-surface"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '32px',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '8px',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
          }}
        >
          <X size={20} />
        </button>

        {!emailSent ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                background: 'rgba(255, 0, 0, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 0, 0, 0.3)'
              }}>
                <Mail size={32} style={{ color: '#ff0000' }} />
              </div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Reset Password
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}>
                Enter your email address and we'll send you a link to reset your password
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <Label htmlFor="reset-email" style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
                  Email Address
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-2"
                  autoFocus
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                style={{
                  background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #ff0000 0%, #0095b3 100%)',
                  color: '#ffffff',
                  padding: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  pointerEvents: loading ? 'none' : 'auto'
                }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 16px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              <CheckCircle size={32} style={{ color: '#10b981' }} />
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '8px'
            }}>
              Email Sent!
            </h2>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              We've sent a password reset link to <strong style={{ color: '#ff0000' }}>{email}</strong>.
              Please check your inbox and follow the instructions to reset your password.
            </p>
            <Button
              onClick={handleClose}
              className="w-full"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-primary)',
                padding: '12px',
                fontSize: '15px',
                fontWeight: '600'
              }}
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
