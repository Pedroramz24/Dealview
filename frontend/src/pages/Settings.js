import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { 
  User, Mail, Lock, Shield, Bell, Palette, Database, 
  Building2, Plug
} from 'lucide-react';

const Settings = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
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
        <div className="text-white">Loading settings...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex' }}>
      {/* Left Sidebar Navigation */}
      <div style={{
        width: '280px',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '32px 24px',
        height: '100vh',
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

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '32px 48px', overflowY: 'auto' }}>
        {activeSection === 'profile' && <div><h2 style={{ fontSize: '28px', fontWeight: 700 }}>Profile</h2><p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>User: {user?.email}</p></div>}
        {activeSection === 'account' && <div><h2 style={{ fontSize: '28px', fontWeight: 700 }}>Account</h2><p style={{ color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>Email: {user?.email}</p></div>}
        {activeSection === 'security' && <div><h2 style={{ fontSize: '28px', fontWeight: 700 }}>Security</h2></div>}
        {activeSection === 'notifications' && <div><h2 style={{ fontSize: '28px', fontWeight: 700 }}>Notifications</h2></div>}
        {activeSection === 'appearance' && <div><h2 style={{ fontSize: '28px', fontWeight: 700 }}>Appearance</h2></div>}
        {activeSection === 'data-privacy' && <div><h2 style={{ fontSize: '28px', fontWeight: 700 }}>Data & Privacy</h2></div>}
      </div>
    </div>
  );
};

export default Settings;
