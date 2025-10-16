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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Team</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{team.length} team members</p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="invite-team-button">
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Team Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  required
                  placeholder="colleague@company.com"
                  data-testid="invite-email-input"
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={inviteData.role} onValueChange={(value) => setInviteData({ ...inviteData, role: value })}>
                  <SelectTrigger data-testid="invite-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="readonly">Read Only</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Read Only: View deals, contacts, and dashboard only
                </p>
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" data-testid="submit-invite-button">
                Send Invitation
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map((member) => (
          <div key={member.id} className="team-card" data-testid={`team-member-${member.id}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                {member.full_name.charAt(0).toUpperCase()}
              </div>
              <span className="badge" style={getRoleBadgeColor(member.role)}>
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </span>
            </div>

            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {member.full_name}
            </h3>

            <div className="flex items-center text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              <Mail className="w-4 h-4 mr-2" />
              {member.email}
            </div>

            <div className="pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Member since {formatDate(member.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Team;
