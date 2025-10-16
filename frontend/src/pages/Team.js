import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Users, Mail } from 'lucide-react';
import { toast } from 'sonner';

const Team = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return { background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' };
      case 'agent':
        return { background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent)', border: '1px solid var(--accent)' };
      case 'readonly':
        return { background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' };
      default:
        return { background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' };
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="team-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Team</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Your profile and team settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile Card */}
        <div className="team-card">
          <div className="flex items-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mr-4" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {user?.email}
              </h3>
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                {userProfile?.role || 'User'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Mail className="w-4 h-4 mr-3" style={{ color: 'var(--text-muted)' }} />
              {user?.email}
            </div>
            {userProfile?.phone && (
              <div className="flex items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Users className="w-4 h-4 mr-3" style={{ color: 'var(--text-muted)' }} />
                {userProfile.phone}
              </div>
            )}
            {userProfile?.company && (
              <div className="flex items-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Users className="w-4 h-4 mr-3" style={{ color: 'var(--text-muted)' }} />
                {userProfile.company}
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="glass-surface p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Team Collaboration
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Team collaboration features allow you to share deals with other users and manage permissions.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            To collaborate on deals, you can:
          </p>
          <ul className="mt-2 space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>• Share individual deals with team members</li>
            <li>• Assign roles and permissions per deal</li>
            <li>• Track team member activities on shared deals</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Team;
