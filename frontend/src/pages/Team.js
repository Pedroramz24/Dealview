import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Plus, UserPlus, Mail } from 'lucide-react';
import { toast } from 'sonner';

const Team = () => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'readonly',
  });

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const response = await axios.get(`${API}/team`);
      setTeam(response.data);
    } catch (error) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/team/invite`, inviteData);
      toast.success(`Invitation sent! Temp password: ${response.data.temp_password}`);
      setShowInviteDialog(false);
      setInviteData({ email: '', role: 'readonly' });
      fetchTeam();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send invitation');
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
