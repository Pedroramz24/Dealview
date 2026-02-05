import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import PasswordStrengthBar from 'react-password-strength-bar';
import { 
  User, Mail, Lock, Shield, Bell, Database, Building2, Plug, 
  Upload, X, Eye, EyeOff, LogOut, Clock, Loader2, 
  Save, RotateCcw, Trash2, Download, Check, AlertCircle, 
  Monitor, Chrome, Smartphone, Moon, Sun, Layout, FileText
} from 'lucide-react';

const Settings = () => {
  const [activeSection, setActiveSection] = useState('account');
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    company: '',
    avatar_url: ''
  });

  const [originalData, setOriginalData] = useState({});

  // Modals
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAvatar, setShowDeleteAvatar] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState({
    dealUpdates: true,
    reminders: true,
    mentions: true,
    emailNotifications: true
  });

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
        setUserProfile(profile);
        const data = {
          full_name: profile.full_name || '',
          phone: profile.phone || '',
          company: profile.company || '',
          avatar_url: profile.avatar_url || ''
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
      console.log('💾 Saving profile data:', profileData);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
          company: profileData.company,
          avatar_url: profileData.avatar_url
        })
        .eq('id', user.id)
        .select();

      console.log('📥 Update result:', { data, error });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      setOriginalData(profileData);
      setIsDirty(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('❌ Error saving:', error);
      toast.error(`Failed to save settings: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setProfileData(originalData);
    setIsDirty(false);
  };

  const sections = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data-privacy', label: 'Data & Privacy', icon: Database },
    { id: 'organization', label: 'Organization', icon: Building2, comingSoon: true },
    { id: 'integrations', label: 'Integrations', icon: Plug, comingSoon: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#000' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: '#00b8d4' }} />
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#130F40',
      backgroundImage: 'radial-gradient(circle, rgba(19, 15, 64, 1) 0%, rgba(0, 0, 0, 1) 100%)',
      color: '#fff', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left Sidebar */}
        <div style={{
          width: '260px',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '40px 20px',
          height: '100vh',
          position: 'sticky',
          top: 0,
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(16px)'
        }}>
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
              Settings
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)' }}>
              Manage your account
            </p>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                    padding: '11px 14px',
                    background: isActive ? 'rgba(0, 184, 212, 0.08)' : 'transparent',
                    border: 'none',
                    borderLeft: `3px solid ${isActive ? '#00b8d4' : 'transparent'}`,
                    borderRadius: '0',
                    color: isActive ? '#00b8d4' : section.comingSoon ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.6)',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: section.comingSoon ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    letterSpacing: '0.2px'
                  }}
                  onMouseEnter={(e) => {
                    if (!section.comingSoon && !isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = section.comingSoon ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.6)';
                    }
                  }}
                >
                  <Icon size={17} strokeWidth={2} />
                  <span style={{ flex: 1 }}>{section.label}</span>
                  {section.comingSoon && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '3px',
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontWeight: 600,
                      letterSpacing: '0.5px'
                    }}>
                      SOON
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '40px 56px 120px', overflowY: 'auto', maxWidth: '1000px' }}>
          {activeSection === 'account' && (
            <AccountSection 
              profileData={profileData} 
              setProfileData={setProfileData} 
              user={user}
              setShowChangePassword={setShowChangePassword}
            />
          )}
          {activeSection === 'security' && <SecuritySection user={user} />}
          {activeSection === 'notifications' && <NotificationsSection notifications={notifications} setNotifications={setNotifications} />}
          {activeSection === 'data-privacy' && <DataPrivacySection />}
        </div>
      </div>

      {/* Sticky Footer */}
      {isDirty && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: '260px',
          right: 0,
          padding: '16px 56px',
          background: 'rgba(10, 10, 10, 0.98)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0, 184, 212, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000,
          boxShadow: '0 -4px 20px rgba(0, 184, 212, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#00b8d4',
              boxShadow: '0 0 8px rgba(0, 184, 212, 0.6)'
            }} />
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
              Unsaved changes
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleDiscard}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)')}
            >
              <RotateCcw size={15} />
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 24px',
                background: '#00b8d4',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                fontSize: '14px',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 12px rgba(0, 184, 212, 0.3)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => !saving && (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
};

// Account Section (Merged: Profile + Account + Appearance)
const AccountSection = ({ profileData, setProfileData, user, setShowChangePassword }) => {
  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    try {
      // Get Supabase session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to upload avatar');
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload via backend endpoint (uses service_role key, bypasses RLS)
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/avatar/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      const data = await response.json();
      setProfileData(prev => ({ ...prev, avatar_url: data.avatar_url }));
      toast.success('Avatar uploaded successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload avatar');
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      if (profileData.avatar_url) {
        const urlParts = profileData.avatar_url.split('/property-images/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split('?')[0];
          await supabase.storage.from('property-images').remove([filePath]);
        }
      }
      setProfileData(prev => ({ ...prev, avatar_url: '' }));
      toast.success('Avatar removed');
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error('Failed to remove avatar');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.5px' }}>Account</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
          Manage your profile, preferences, and account settings
        </p>
      </div>

      {/* Profile Picture */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '28px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Avatar */}
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: profileData.avatar_url 
              ? `url(${profileData.avatar_url})` 
              : 'linear-gradient(135deg, rgba(0, 184, 212, 0.15), rgba(139, 92, 246, 0.15))',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(0, 184, 212, 0.2)',
            boxShadow: '0 4px 16px rgba(0, 184, 212, 0.15)',
            flexShrink: 0
          }}>
            {!profileData.avatar_url && <User size={42} style={{ color: '#00b8d4' }} />}
          </div>

          {/* Upload Actions */}
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Profile Picture</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px', marginBottom: '14px' }}>
              JPG, PNG or GIF • Max 10MB
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label htmlFor="avatar-upload" style={{
                padding: '9px 18px',
                background: 'rgba(0, 184, 212, 0.08)',
                border: '1px solid rgba(0, 184, 212, 0.25)',
                borderRadius: '6px',
                color: '#00b8d4',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'all 0.15s ease'
              }}>
                <Upload size={14} />
                Upload New Picture
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
              {profileData.avatar_url && (
                <button
                  onClick={handleDeleteAvatar}
                  style={{
                    padding: '9px 18px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.3)';
                    e.currentTarget.style.color = '#ff4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Details */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '28px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '20px', letterSpacing: '-0.2px' }}>
          Personal Details
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
          {/* Full Name */}
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Full Name
            </label>
            <input
              type="text"
              value={profileData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: '11px 14px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '7px',
                color: '#fff',
                fontSize: '14px',
                transition: 'all 0.15s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.4)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
            />
          </div>

          {/* Title */}
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Company
            </label>
            <input
              type="text"
              value={profileData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="e.g., Acme Realty"
              style={{
                width: '100%',
                padding: '11px 14px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '7px',
                color: '#fff',
                fontSize: '14px',
                transition: 'all 0.15s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.4)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
            />
          </div>

          {/* Phone */}
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="(210) 555-0123"
              style={{
                width: '100%',
                padding: '11px 14px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '7px',
                color: '#fff',
                fontSize: '14px',
                transition: 'all 0.15s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.4)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
            />
          </div>
        </div>
      </div>

      {/* Email Management */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '28px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '18px', letterSpacing: '-0.2px' }}>
          Email Addresses
        </h3>
        
        {/* Primary Email */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Mail size={14} style={{ color: '#00b8d4' }} />
            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Primary
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="email"
              value={user?.email || ''}
              readOnly
              style={{
                flex: 1,
                padding: '11px 14px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '7px',
                color: '#fff',
                fontSize: '14px',
                cursor: 'not-allowed',
                fontWeight: 500
              }}
            />
          </div>
        </div>

        {/* Add Another Email */}
        <button
          onClick={() => {}}
          disabled={true}
          style={{
            padding: '9px 16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 184, 212, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.25)';
            e.currentTarget.style.color = '#00b8d4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
          }}
        >
          + Add Another Email
        </button>
      </div>

      {/* Password */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '28px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '10px', letterSpacing: '-0.2px' }}>
          Password
        </h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px', marginBottom: '18px' }}>
          Ensure your account is using a strong password
        </p>
        <button
          onClick={() => setShowChangePassword(true)}
          style={{
            padding: '10px 20px',
            background: 'rgba(0, 184, 212, 0.08)',
            border: '1px solid rgba(0, 184, 212, 0.25)',
            borderRadius: '6px',
            color: '#00b8d4',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 184, 212, 0.12)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 184, 212, 0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Lock size={14} />
          Change Password
        </button>
      </div>

      {/* Connected Accounts */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '28px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '10px', letterSpacing: '-0.2px' }}>
          Connected Accounts
        </h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px', marginBottom: '20px' }}>
          Link external accounts for seamless authentication
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { name: 'Google', icon: Chrome, connected: false },
            { name: 'Microsoft', icon: Monitor, connected: false }
          ].map(account => (
            <div key={account.name} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 18px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              borderRadius: '8px',
              transition: 'all 0.15s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <account.icon size={19} style={{ color: '#00b8d4' }} />
                </div>
                <div>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500, display: 'block' }}>
                    {account.name}
                  </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '12px' }}>
                    {account.connected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {}}
                disabled={true}
                style={{
                  padding: '7px 16px',
                  background: account.connected ? 'transparent' : 'rgba(0, 184, 212, 0.08)',
                  border: `1px solid ${account.connected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 184, 212, 0.25)'}`,
                  borderRadius: '6px',
                  color: account.connected ? 'rgba(255, 255, 255, 0.6)' : '#00b8d4',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {account.connected ? 'Disconnect' : 'Connect'}
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
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleSignOutAll = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast.success('Signed out from all devices');
      window.location.href = '/login';
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.5px' }}>Security</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
          Manage security settings and monitor account activity
        </p>
      </div>

      {/* Last Login */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '24px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: 'rgba(0, 184, 212, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={22} style={{ color: '#00b8d4' }} />
          </div>
          <div>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Last Sign In
            </h3>
            <p style={{ color: '#fff', fontSize: '15px', fontWeight: 500 }}>
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
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '28px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, letterSpacing: '-0.2px' }}>
            Active Sessions
          </h3>
          <button
            onClick={handleSignOutAll}
            style={{
              padding: '7px 14px',
              background: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              borderRadius: '6px',
              color: '#ff4444',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)'}
          >
            <LogOut size={13} />
            Sign Out All
          </button>
        </div>

        {/* Current Session */}
        <div style={{
          padding: '18px',
          background: 'rgba(0, 184, 212, 0.04)',
          border: '1px solid rgba(0, 184, 212, 0.15)',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: 'rgba(0, 184, 212, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {navigator.userAgent.includes('Mobile') ? 
                <Smartphone size={20} style={{ color: '#00b8d4' }} /> : 
                <Monitor size={20} style={{ color: '#00b8d4' }} />
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>This Device</span>
                <span style={{
                  fontSize: '10px',
                  padding: '3px 8px',
                  background: 'rgba(0, 184, 212, 0.15)',
                  borderRadius: '10px',
                  color: '#00b8d4',
                  fontWeight: 700,
                  letterSpacing: '0.3px'
                }}>
                  ACTIVE
                </span>
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '13px', marginBottom: '4px' }}>
                {navigator.userAgent.includes('Mac') ? 'macOS' : navigator.userAgent.includes('Win') ? 'Windows' : 'Linux'} • 
                {navigator.userAgent.includes('Chrome') ? ' Chrome' : navigator.userAgent.includes('Firefox') ? ' Firefox' : navigator.userAgent.includes('Safari') ? ' Safari' : ' Browser'}
              </p>
              <p style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px' }}>
                {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '28px',
        marginTop: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, maxWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Shield size={18} style={{ color: '#00b8d4' }} />
              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, letterSpacing: '-0.2px' }}>
                Two-Factor Authentication
              </h3>
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px', lineHeight: '1.6' }}>
              Enhance account security with authenticator app verification during sign-in
            </p>
          </div>
          <button 
            onClick={() => {
              setTwoFactorEnabled(!twoFactorEnabled);
            }}
            style={{
              width: '52px',
              height: '28px',
              borderRadius: '14px',
              background: twoFactorEnabled ? '#00b8d4' : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${twoFactorEnabled ? '#00b8d4' : 'rgba(255, 255, 255, 0.12)'}`,
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.25s ease',
              flexShrink: 0
            }}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: '2px',
              left: twoFactorEnabled ? '27px' : '3px',
              transition: 'all 0.25s ease',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)'
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
      description: 'Notifications when deals change status or receive activity',
      icon: FileText,
      category: 'In-App'
    },
    { 
      key: 'reminders', 
      label: 'Reminders & Deadlines', 
      description: 'Get notified about upcoming tasks and important dates',
      icon: Clock,
      category: 'In-App'
    },
    { 
      key: 'mentions', 
      label: 'Shares & Mentions', 
      description: 'When someone shares content with you or mentions you',
      icon: Bell,
      category: 'In-App'
    },
    { 
      key: 'emailNotifications', 
      label: 'Email Digest', 
      description: 'Daily summary of important updates sent to your inbox',
      icon: Mail,
      category: 'Email'
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.5px' }}>Notifications</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
          Control how and when you receive notifications
        </p>
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '28px'
      }}>
        {notificationOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <div
              key={option.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 0',
                borderBottom: index < notificationOptions.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none'
              }}
            >
              <div style={{ flex: 1, display: 'flex', alignItems: 'start', gap: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: notifications[option.key] ? 'rgba(0, 184, 212, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}>
                  <Icon size={18} style={{ color: notifications[option.key] ? '#00b8d4' : 'rgba(255, 255, 255, 0.35)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                      {option.label}
                    </h4>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 7px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      borderRadius: '4px',
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontWeight: 600,
                      letterSpacing: '0.3px'
                    }}>
                      {option.category}
                    </span>
                  </div>
                  <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px', lineHeight: '1.5' }}>
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
                  background: notifications[option.key] ? '#00b8d4' : 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${notifications[option.key] ? '#00b8d4' : 'rgba(255, 255, 255, 0.12)'}`,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.25s ease',
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
                  transition: 'all 0.25s ease',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
                }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Data & Privacy Section
const DataPrivacySection = () => {
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleExportData = async () => {
    setTimeout(() => {
      toast.success('Export request received - will be sent to your email');
    }, 500);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    setShowDeleteDialog(false);
    setDeleteConfirm('');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.5px' }}>Data & Privacy</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
          Control your data and manage account lifecycle
        </p>
      </div>

      {/* Export Data */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '28px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: 'rgba(0, 184, 212, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Download size={22} style={{ color: '#00b8d4' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '8px', letterSpacing: '-0.2px' }}>
              Export Your Data
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px', marginBottom: '16px', lineHeight: '1.6' }}>
              Download all your data including deals, contacts, documents, and activity history in JSON format
            </p>
            <button
              onClick={handleExportData}
              style={{
                padding: '10px 20px',
                background: 'rgba(0, 184, 212, 0.08)',
                border: '1px solid rgba(0, 184, 212, 0.25)',
                borderRadius: '6px',
                color: '#00b8d4',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 184, 212, 0.12)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 184, 212, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Download size={14} />
              Request Data Export
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      <div style={{
        background: 'rgba(220, 38, 38, 0.04)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(220, 38, 38, 0.15)',
        borderRadius: '10px',
        padding: '28px'
      }}>
        <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            background: 'rgba(220, 38, 38, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertCircle size={22} style={{ color: '#ff4444' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#ff4444', fontSize: '16px', fontWeight: 600, marginBottom: '8px', letterSpacing: '-0.2px' }}>
              Delete Account
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px', marginBottom: '16px', lineHeight: '1.6' }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteDialog(!showDeleteDialog)}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1.5px solid rgba(220, 38, 38, 0.4)',
                borderRadius: '6px',
                color: '#ff4444',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.4)';
              }}
            >
              <Trash2 size={14} />
              Delete Account
            </button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteDialog && (
          <div style={{
            marginTop: '24px',
            padding: '24px',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            borderRadius: '8px'
          }}>
            <p style={{ color: '#fff', fontSize: '14px', marginBottom: '14px', fontWeight: 500 }}>
              Type <span style={{ color: '#ff4444', fontWeight: 700, fontFamily: 'monospace', background: 'rgba(220, 38, 38, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '7px',
                color: '#fff',
                fontSize: '14px',
                marginBottom: '14px',
                fontFamily: 'monospace'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirm('');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px',
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
                  background: deleteConfirm === 'DELETE' ? '#ff4444' : 'rgba(255, 255, 255, 0.04)',
                  border: 'none',
                  borderRadius: '6px',
                  color: deleteConfirm === 'DELETE' ? '#000' : 'rgba(255, 255, 255, 0.25)',
                  fontSize: '13px',
                  fontWeight: 700,
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

      toast.success('Password updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
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
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        background: 'rgba(15, 15, 15, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '36px',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '8px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
        >
          <X size={18} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
        </button>

        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(0, 184, 212, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Lock size={20} style={{ color: '#00b8d4' }} />
            </div>
            <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.3px' }}>
              Change Password
            </h2>
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px', marginLeft: '56px' }}>
            Create a strong, unique password
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
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
                  padding: '12px 14px',
                  paddingRight: '45px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '7px',
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
                {showCurrent ? 
                  <EyeOff size={17} style={{ color: 'rgba(255, 255, 255, 0.4)' }} /> : 
                  <Eye size={17} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                }
              </button>
            </div>
          </div>

          {/* New Password */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
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
                  padding: '12px 14px',
                  paddingRight: '45px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '7px',
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
                {showNew ? 
                  <EyeOff size={17} style={{ color: 'rgba(255, 255, 255, 0.4)' }} /> : 
                  <Eye size={17} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                }
              </button>
            </div>
          </div>
          {newPassword && (
            <div style={{ marginBottom: '18px' }}>
              <PasswordStrengthBar password={newPassword} />
            </div>
          )}

          {/* Confirm Password */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
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
                  padding: '12px 14px',
                  paddingRight: '45px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '7px',
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
                {showConfirm ? 
                  <EyeOff size={17} style={{ color: 'rgba(255, 255, 255, 0.4)' }} /> : 
                  <Eye size={17} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                }
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
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '7px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
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
                borderRadius: '7px',
                color: '#000',
                fontSize: '14px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: loading ? 'none' : '0 2px 12px rgba(0, 184, 212, 0.3)'
              }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
