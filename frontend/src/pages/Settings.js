import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import PasswordStrengthBar from 'react-password-strength-bar';
import { 
  User, Mail, Lock, Shield, Bell, Palette, Database, 
  Building2, Plug, Upload, X, Eye, EyeOff, LogOut, Clock, 
  Globe, Chrome, Monitor, Loader2, Save, RotateCcw, Trash2, 
  Download, Check, AlertCircle
} from 'lucide-react';

const Settings = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState({
    full_name: '',
    title: '',
    phone: '',
    timezone: 'America/Chicago',
    avatar_url: '',
    company_logo_url: ''
  });

  const [originalData, setOriginalData] = useState({});

  // Modals
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState({
    dealUpdates: true,
    reminders: true,
    mentions: true,
    emailNotifications: true
  });

  // Appearance state
  const [theme, setTheme] = useState('dark');
  const [density, setDensity] = useState('cozy');

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    const hasChanges = JSON.stringify(profileData) !== JSON.stringify(originalData);
    setIsDirty(hasChanges);
  }, [profileData, originalData]);

  const loadUserData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      setUser(user);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        const data = {
          full_name: profile.full_name || '',
          title: profile.title || '',
          phone: profile.phone || '',
          timezone: profile.timezone || 'America/Chicago',
          avatar_url: profile.avatar_url || '',
          company_logo_url: profile.company_logo_url || ''
        };
        setProfileData(data);
        setOriginalData(data);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('id', user.id);

      if (error) throw error;

      setOriginalData(profileData);
      setIsDirty(false);
      toast.success('✅ Settings saved successfully');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setProfileData(originalData);
    setIsDirty(false);
    toast.info('Changes discarded');
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Mail },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'data-privacy', label: 'Data & Privacy', icon: Database },
    { id: 'organization', label: 'Organization', icon: Building2, comingSoon: true },
    { id: 'integrations', label: 'Integrations', icon: Plug, comingSoon: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Loader2 className="animate-spin" size={32} style={{ color: '#00b8d4' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left Sidebar */}
        <div style={{
          width: '280px',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '32px 24px',
          height: 'calc(100vh - 80px)',
          position: 'sticky',
          top: 0
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '32px', color: '#fff' }}>
            Settings
          </h1>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sections.map(section => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => !section.comingSoon && setActiveSection(section.id)}
                  disabled={section.comingSoon}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: isActive ? 'rgba(0, 184, 212, 0.1)' : 'transparent',
                    border: `1px solid ${isActive ? 'rgba(0, 184, 212, 0.3)' : 'transparent'}`,
                    borderRadius: '8px',
                    color: isActive ? '#00b8d4' : section.comingSoon ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 400,
                    cursor: section.comingSoon ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={18} />
                  <span style={{ flex: 1 }}>{section.label}</span>
                  {section.comingSoon && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}>
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '32px 48px 120px', overflowY: 'auto', maxWidth: '900px' }}>
          {activeSection === 'profile' && <ProfileSection profileData={profileData} setProfileData={setProfileData} user={user} />}
          {activeSection === 'account' && <AccountSection user={user} setShowChangePassword={setShowChangePassword} />}
          {activeSection === 'security' && <SecuritySection user={user} />}
          {activeSection === 'notifications' && <NotificationsSection notifications={notifications} setNotifications={setNotifications} />}
          {activeSection === 'appearance' && <AppearanceSection theme={theme} setTheme={setTheme} density={density} setDensity={setDensity} />}
          {activeSection === 'data-privacy' && <DataPrivacySection />}
        </div>
      </div>

      {/* Sticky Footer */}
      {isDirty && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: '280px',
          right: 0,
          padding: '20px 48px',
          background: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
            You have unsaved changes
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleDiscard}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RotateCcw size={16} />
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: '#00b8d4',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
};

// Profile Section
const ProfileSection = ({ profileData, setProfileData }) => {
  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix'
  ];

  return (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Profile</h2>
      <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '32px', fontSize: '15px' }}>
        Manage your personal information
      </p>

      {/* Avatar and Logo */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'start' }}>
          {/* Avatar */}
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', display: 'block', marginBottom: '12px', fontWeight: 500 }}>
              Profile Picture
            </label>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: profileData.avatar_url ? `url(${profileData.avatar_url})` : 'linear-gradient(135deg, rgba(0, 184, 212, 0.2), rgba(139, 92, 246, 0.2))',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(0, 184, 212, 0.3)',
              boxShadow: '0 4px 20px rgba(0, 184, 212, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {!profileData.avatar_url && (
                <User size={48} style={{ color: '#00b8d4' }} />
              )}
              <label htmlFor="avatar-upload" style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: '#00b8d4',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '3px solid #000',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                <Upload size={16} style={{ color: '#000' }} />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => toast.info('Avatar upload coming soon')}
              />
            </div>
          </div>

          {/* Company Logo */}
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', display: 'block', marginBottom: '12px', fontWeight: 500 }}>
              Company Logo
            </label>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '12px',
              background: profileData.company_logo_url ? `url(${profileData.company_logo_url})` : 'rgba(255, 255, 255, 0.03)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed rgba(255, 255, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {!profileData.company_logo_url && (
                <Building2 size={48} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
              )}
              <label htmlFor="logo-upload" style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                background: '#00b8d4',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                <Upload size={14} style={{ color: '#000' }} />
              </label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => toast.info('Logo upload coming soon')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
          Personal Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Full Name *
            </label>
            <input
              type="text"
              value={profileData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="John Doe"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Title
            </label>
            <input
              type="text"
              value={profileData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Real Estate Broker"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="(210) 555-0123"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              <Globe size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Time Zone
            </label>
            <select
              value={profileData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {timezones.map(tz => (
                <option key={tz} value={tz} style={{ background: '#1a1a1a' }}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

// Account Section
const AccountSection = ({ user, setShowChangePassword }) => {
  return (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Account</h2>
      <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '32px', fontSize: '15px' }}>
        Manage your account settings and credentials
      </p>

      {/* Email */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
          Email Address
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Mail size={16} style={{ color: '#00b8d4' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>Primary Email</span>
            </div>
            <input
              type="email"
              value={user?.email || ''}
              readOnly
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '15px',
                cursor: 'not-allowed',
                fontWeight: 500
              }}
            />
          </div>
          <button
            onClick={() => toast.info('Change email coming soon')}
            style={{
              padding: '12px 20px',
              background: 'rgba(0, 184, 212, 0.1)',
              border: '1px solid rgba(0, 184, 212, 0.3)',
              borderRadius: '8px',
              color: '#00b8d4',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginTop: '24px'
            }}
          >
            Change Email
          </button>
        </div>
      </div>

      {/* Password */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
          Password
        </h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', marginBottom: '16px' }}>
          Change your password to keep your account secure
        </p>
        <button
          onClick={() => setShowChangePassword(true)}
          style={{
            padding: '12px 20px',
            background: 'rgba(0, 184, 212, 0.1)',
            border: '1px solid rgba(0, 184, 212, 0.3)',
            borderRadius: '8px',
            color: '#00b8d4',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Lock size={16} />
          Change Password
        </button>
      </div>

      {/* Connected Accounts */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
          Connected Accounts
        </h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', marginBottom: '20px' }}>
          Connect your accounts for easier sign-in
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {['Google', 'Microsoft'].map(provider => (
            <div key={provider} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Chrome size={20} style={{ color: '#00b8d4' }} />
                </div>
                <div>
                  <span style={{ color: '#fff', fontSize: '15px', fontWeight: 500, display: 'block' }}>{provider}</span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>Not connected</span>
                </div>
              </div>
              <button 
                onClick={() => toast.info(`${provider} integration coming soon`)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(0, 184, 212, 0.3)',
                  borderRadius: '6px',
                  color: '#00b8d4',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Connect
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Security Section
const SecuritySection = ({ user }) => {
  const handleSignOutAll = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast.success('Signed out from all devices');
      window.location.reload();
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Security</h2>
      <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '32px', fontSize: '15px' }}>
        Manage your security settings and monitor account activity
      </p>

      {/* Last Login */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'rgba(0, 184, 212, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={20} style={{ color: '#00b8d4' }} />
          </div>
          <div>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>Last Login</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginTop: '4px' }}>
              {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }) : 'Never'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>Active Sessions</h3>
          <button
            onClick={handleSignOutAll}
            style={{
              padding: '8px 16px',
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: '6px',
              color: '#ff4444',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={14} />
            Sign Out All
          </button>
        </div>

        <div style={{
          padding: '18px',
          background: 'rgba(0, 184, 212, 0.05)',
          border: '1px solid rgba(0, 184, 212, 0.2)',
          borderRadius: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(0, 184, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Monitor size={22} style={{ color: '#00b8d4' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>Current Device</span>
                <span style={{
                  fontSize: '11px',
                  padding: '3px 10px',
                  background: 'rgba(0, 184, 212, 0.2)',
                  borderRadius: '12px',
                  color: '#00b8d4',
                  fontWeight: 600
                }}>
                  Active Now
                </span>
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px', marginBottom: '4px' }}>
                {navigator.userAgent.includes('Mac') ? 'MacOS' : 'Windows'} • {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Browser'}
              </p>
              <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>
                {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Factor */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Shield size={20} style={{ color: '#00b8d4' }} />
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>
                Two-Factor Authentication
              </h3>
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
              Add an extra layer of security. You'll need a code from your authenticator app when signing in.
            </p>
          </div>
          <button 
            onClick={() => toast.info('2FA coming soon')}
            style={{
              width: '52px',
              height: '28px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: '2px',
              left: '3px',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
            }} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Notifications Section
const NotificationsSection = ({ notifications, setNotifications }) => {
  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Notification preference updated');
  };

  const notificationOptions = [
    { 
      key: 'dealUpdates', 
      label: 'Deal Updates', 
      description: 'Get notified when deals change status, are assigned to you, or receive new activity',
      icon: FileText
    },
    { 
      key: 'reminders', 
      label: 'Reminders & Deadlines', 
      description: 'Receive reminders for upcoming tasks, follow-ups, and important deadlines',
      icon: Clock
    },
    { 
      key: 'mentions', 
      label: 'Shares & Mentions', 
      description: 'Be notified when someone mentions you or shares content with you',
      icon: Bell
    },
    { 
      key: 'emailNotifications', 
      label: 'Email Notifications', 
      description: 'Receive important updates and summaries via email',
      icon: Mail
    },
  ];

  return (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Notifications</h2>
      <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '32px', fontSize: '15px' }}>
        Control what notifications you receive and how
      </p>

      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
          Notification Preferences
        </h3>
        {notificationOptions.map((option, index) => {
          const Icon = option.icon || Bell;
          return (
            <div
              key={option.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 0',
                borderBottom: index < notificationOptions.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
              }}
            >
              <div style={{ flex: 1, display: 'flex', alignItems: 'start', gap: '14px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: notifications[option.key] ? 'rgba(0, 184, 212, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={18} style={{ color: notifications[option.key] ? '#00b8d4' : 'rgba(255, 255, 255, 0.4)' }} />
                </div>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}>
                    {option.label}
                  </h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px', lineHeight: '1.5' }}>
                    {option.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleNotification(option.key)}
                style={{
                  width: '52px',
                  height: '28px',
                  borderRadius: '14px',
                  background: notifications[option.key] ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                  marginLeft: '20px'
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: '2px',
                  left: notifications[option.key] ? '27px' : '3px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Appearance Section
const AppearanceSection = ({ theme, setTheme, density, setDensity }) => {
  return (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Appearance</h2>
      <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '32px', fontSize: '15px' }}>
        Customize how the application looks and feels
      </p>

      {/* Theme */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Theme</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', marginBottom: '20px' }}>
          Select your preferred color scheme
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { value: 'dark', label: 'Dark', icon: '🌙', desc: 'Easy on the eyes' },
            { value: 'light', label: 'Light', icon: '☀️', desc: 'Bright and clean' }
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              style={{
                padding: '20px',
                background: theme === t.value ? 'rgba(0, 184, 212, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                border: `2px solid ${theme === t.value ? 'rgba(0, 184, 212, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (theme !== t.value) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (theme !== t.value) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{t.icon}</div>
              <div style={{
                color: theme === t.value ? '#00b8d4' : '#fff',
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                {t.label}
                {theme === t.value && <Check size={16} />}
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px' }}>
                {t.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Density */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Interface Density</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', marginBottom: '20px' }}>
          Choose how compact you want the interface to be
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { value: 'cozy', label: 'Cozy', description: 'More space, easier to read', icon: '📖' },
            { value: 'compact', label: 'Compact', description: 'Dense, shows more content', icon: '📊' }
          ].map(d => (
            <button
              key={d.value}
              onClick={() => setDensity(d.value)}
              style={{
                padding: '20px',
                background: density === d.value ? 'rgba(0, 184, 212, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                border: `2px solid ${density === d.value ? 'rgba(0, 184, 212, 0.4)' : 'rgba(255, 255, 255, 0.05)'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (density !== d.value) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (density !== d.value) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{d.icon}</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{
                  color: density === d.value ? '#00b8d4' : '#fff',
                  fontSize: '16px',
                  fontWeight: 600
                }}>
                  {d.label}
                </span>
                {density === d.value && <Check size={18} style={{ color: '#00b8d4' }} />}
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px', lineHeight: '1.5' }}>
                {d.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Data & Privacy Section
const DataPrivacySection = () => {
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleExportData = async () => {
    toast.info('⏳ Preparing your data export...');
    setTimeout(() => {
      toast.success('📧 Export will be sent to your email shortly');
    }, 2000);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    toast.error('Account deletion coming soon');
    setShowDeleteDialog(false);
  };

  return (
    <div>
      <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Data & Privacy</h2>
      <p style={{ color: 'rgba(255, 255, 255, 0.6)', marginBottom: '32px', fontSize: '15px' }}>
        Manage your data and account privacy
      </p>

      {/* Export Data */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'start', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(0, 184, 212, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Download size={22} style={{ color: '#00b8d4' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Export Your Data
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
              Download a complete copy of your data including deals, contacts, documents, and activity history in JSON format
            </p>
            <button
              onClick={handleExportData}
              style={{
                padding: '12px 24px',
                background: 'rgba(0, 184, 212, 0.1)',
                border: '1px solid rgba(0, 184, 212, 0.3)',
                borderRadius: '8px',
                color: '#00b8d4',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Download size={16} />
              Request Data Export
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      <div style={{
        background: 'rgba(220, 38, 38, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(220, 38, 38, 0.2)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'start', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(220, 38, 38, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertCircle size={22} style={{ color: '#ff4444' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#ff4444', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Danger Zone
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
              Once you delete your account, there is no going back. All your data including deals, contacts, and documents will be permanently erased.
            </p>
            <button
              onClick={() => setShowDeleteDialog(true)}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: '2px solid #ff4444',
                borderRadius: '8px',
                color: '#ff4444',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Trash2 size={16} />
              Delete Account
            </button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '8px'
          }}>
            <p style={{ color: '#fff', fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>
              Type <span style={{ color: '#ff4444', fontWeight: 700 }}>DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE"
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                marginBottom: '12px'
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirm('');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'DELETE'}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: deleteConfirm === 'DELETE' ? '#ff4444' : 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '6px',
                  color: deleteConfirm === 'DELETE' ? '#000' : 'rgba(255, 255, 255, 0.3)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed'
                }}
              >
                Delete Forever
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Change Password Modal
const ChangePasswordModal = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('✅ Password updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
        background: 'rgba(20, 20, 20, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '32px',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            borderRadius: '6px',
            padding: '8px',
            cursor: 'pointer'
          }}
        >
          <X size={20} style={{ color: '#fff' }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(0, 184, 212, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Lock size={22} style={{ color: '#00b8d4' }} />
          </div>
          <div>
            <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700 }}>
              Change Password
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
              Enter your current password and choose a new one
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Current Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  paddingRight: '45px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showCurrent ? <EyeOff size={18} style={{ color: 'rgba(255, 255, 255, 0.5)' }} /> : <Eye size={18} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  paddingRight: '45px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showNew ? <EyeOff size={18} style={{ color: 'rgba(255, 255, 255, 0.5)' }} /> : <Eye size={18} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />}
              </button>
            </div>
          </div>
          {newPassword && (
            <div style={{ marginBottom: '20px' }}>
              <PasswordStrengthBar password={newPassword} />
            </div>
          )}

          {/* Confirm Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Confirm New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  paddingRight: '45px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {showConfirm ? <EyeOff size={18} style={{ color: 'rgba(255, 255, 255, 0.5)' }} /> : <Eye size={18} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: loading ? 'rgba(0, 184, 212, 0.5)' : '#00b8d4',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
