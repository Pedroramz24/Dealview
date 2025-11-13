import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { 
  Users, Plus, Link2, Mail, Copy, X, Loader2, 
  Crown, Shield, User, Eye, Trash2, MoreVertical, Check
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Team = () => {
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      // Get user's teams
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      if (token) {
        const response = await fetch(`${BACKEND_URL}/api/teams`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setTeams(data.teams || []);
          
          // Set first team as current
          if (data.teams && data.teams.length > 0) {
            const firstTeam = data.teams[0];
            setCurrentTeam(firstTeam);
            await loadTeamData(firstTeam.id, token);
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamData = async (teamId, token) => {
    try {
      // Load members
      const membersRes = await fetch(`${BACKEND_URL}/api/teams/${teamId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }

      // Load invites
      const invitesRes = await fetch(`${BACKEND_URL}/api/teams/${teamId}/invites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvites(data.invites || []);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  };

  const handleCreateTeam = async (teamName) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(`${BACKEND_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: teamName })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Team created successfully');
        setShowCreateTeam(false);
        await loadData(); // Reload all data
      } else {
        toast.error('Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };

  const handleCreateInvite = async (role) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(`${BACKEND_URL}/api/teams/${currentTeam.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      });

      if (response.ok) {
        const data = await response.json();
        setInviteLink(data.invite_link);
        await loadTeamData(currentTeam.id, token);
        toast.success('Invite link created');
      } else {
        toast.error('Failed to create invite');
      }
    } catch (error) {
      console.error('Error creating invite:', error);
      toast.error('Failed to create invite');
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied to clipboard');
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'owner': return <Crown size={14} />;
      case 'admin': return <Shield size={14} />;
      case 'agent': return <User size={14} />;
      case 'viewer': return <Eye size={14} />;
      default: return <User size={14} />;
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'owner': return { bg: 'rgba(255, 215, 0, 0.1)', border: 'rgba(255, 215, 0, 0.3)', text: '#ffd700' };
      case 'admin': return { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#8b5cf6' };
      case 'agent': return { bg: 'rgba(0, 184, 212, 0.1)', border: 'rgba(0, 184, 212, 0.3)', text: '#00b8d4' };
      case 'viewer': return { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', text: 'rgba(255, 255, 255, 0.6)' };
      default: return { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', text: '#fff' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#000' }}>
        <Loader2 className="animate-spin" size={40} style={{ color: '#00b8d4' }} />
      </div>
    );
  }

  // No teams - show create team
  if (teams.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', padding: '40px' }}>
        <div style={{ maxWidth: '600px', margin: '100px auto', textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            borderRadius: '16px',
            background: 'rgba(0, 184, 212, 0.08)',
            border: '1px solid rgba(0, 184, 212, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={40} style={{ color: '#00b8d4' }} />
          </div>
          <h2 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
            Create Your First Team
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '16px', marginBottom: '32px' }}>
            Start collaborating with your colleagues by creating a team
          </p>
          <button
            onClick={() => setShowCreateTeam(true)}
            style={{
              padding: '14px 32px',
              background: '#00b8d4',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 16px rgba(0, 184, 212, 0.3)'
            }}
          >
            <Plus size={20} />
            Create Team
          </button>
        </div>
        
        {showCreateTeam && <CreateTeamModal onClose={() => setShowCreateTeam(false)} onCreate={handleCreateTeam} />}
      </div>
    );
  }

  const userRole = currentTeam?.user_role || 'viewer';
  const canManage = ['owner', 'admin'].includes(userRole);

  return (
    <div style={{ minHeight: '100vh', background: '#000', padding: '40px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: '#fff', fontSize: '32px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px' }}>
            {currentTeam?.name || 'Team'}
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '15px' }}>
            {members.length} {members.length === 1 ? 'member' : 'members'} • {invites.length} pending {invites.length === 1 ? 'invite' : 'invites'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {canManage && (
            <button
              onClick={() => setShowInviteMember(true)}
              style={{
                padding: '12px 24px',
                background: '#00b8d4',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0, 184, 212, 0.3)'
              }}
            >
              <Plus size={18} />
              Invite Member
            </button>
          )}
          
          {teams.length > 1 && (
            <select
              value={currentTeam?.id || ''}
              onChange={(e) => {
                const team = teams.find(t => t.id === e.target.value);
                setCurrentTeam(team);
                loadTeamData(team.id, null);
              }}
              style={{
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                minWidth: '200px'
              }}
            >
              {teams.map(team => (
                <option key={team.id} value={team.id} style={{ background: '#0a0a0a' }}>
                  {team.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Members Grid */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, marginBottom: '20px', letterSpacing: '-0.3px' }}>
          Team Members
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {members.map(member => {
            const roleColor = getRoleColor(member.role);
            return (
              <div
                key={member.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '20px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '14px' }}>
                  {/* Avatar */}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: member.avatar_url ? `url(${member.avatar_url})` : 'linear-gradient(135deg, rgba(0, 184, 212, 0.2), rgba(139, 92, 246, 0.2))',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    flexShrink: 0
                  }}>
                    {!member.avatar_url && (
                      <User size={24} style={{ color: '#00b8d4' }} />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: 600,
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {member.full_name || member.email || 'Team Member'}
                    </h3>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontSize: '13px',
                      marginBottom: '8px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {member.email}
                    </p>
                    
                    {/* Role Badge */}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: roleColor.bg,
                      border: `1px solid ${roleColor.border}`,
                      borderRadius: '12px',
                      color: roleColor.text,
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}>
                      {getRoleIcon(member.role)}
                      {member.role}
                    </span>
                  </div>

                  {/* Actions */}
                  {canManage && member.user_id !== user?.id && member.role !== 'owner' && (
                    <div style={{ position: 'relative' }}>
                      <button style={{
                        padding: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer'
                      }}>
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invites */}
      {canManage && invites.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, marginBottom: '20px', letterSpacing: '-0.3px' }}>
            Pending Invites
          </h2>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '20px'
          }}>
            {invites.map(invite => {
              const roleColor = getRoleColor(invite.role);
              const expiresAt = new Date(invite.expires_at);
              const isExpired = expiresAt < new Date();
              
              return (
                <div
                  key={invite.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    borderRadius: '8px',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 10px',
                        background: roleColor.bg,
                        border: `1px solid ${roleColor.border}`,
                        borderRadius: '12px',
                        color: roleColor.text,
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}>
                        {getRoleIcon(invite.role)}
                        {invite.role}
                      </span>
                      {invite.email && (
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                          • {invite.email}
                        </span>
                      )}
                    </div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>
                      {isExpired ? 'Expired' : `Expires ${expiresAt.toLocaleDateString()}`}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/join-team/${invite.token}`;
                        navigator.clipboard.writeText(link);
                        toast.success('Invite link copied');
                      }}
                      style={{
                        padding: '8px 14px',
                        background: 'rgba(0, 184, 212, 0.08)',
                        border: '1px solid rgba(0, 184, 212, 0.25)',
                        borderRadius: '6px',
                        color: '#00b8d4',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Copy size={14} />
                      Copy Link
                    </button>
                    <button
                      style={{
                        padding: '8px 14px',
                        background: 'rgba(220, 38, 38, 0.08)',
                        border: '1px solid rgba(220, 38, 38, 0.25)',
                        borderRadius: '6px',
                        color: '#ff4444',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateTeam && <CreateTeamModal onClose={() => setShowCreateTeam(false)} onCreate={handleCreateTeam} />}
      {showInviteMember && (
        <InviteMemberModal 
          onClose={() => {
            setShowInviteMember(false);
            setInviteLink('');
          }} 
          onCreate={handleCreateInvite}
          inviteLink={inviteLink}
          copyLink={copyInviteLink}
        />
      )}
    </div>
  );
};

// Create Team Modal
const CreateTeamModal = ({ onClose, onCreate }) => {
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }
    setLoading(true);
    await onCreate(teamName);
    setLoading(false);
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
        maxWidth: '500px',
        background: 'rgba(15, 15, 15, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
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
          <X size={18} style={{ color: '#fff' }} />
        </button>

        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
            Create Team
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
            Start collaborating with your colleagues
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Armando Real Estate Group"
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

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
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Invite Member Modal
const InviteMemberModal = ({ onClose, onCreate, inviteLink, copyLink }) => {
  const [selectedRole, setSelectedRole] = useState('agent');
  const [loading, setLoading] = useState(false);

  const roles = [
    { value: 'admin', label: 'Admin', desc: 'Can manage team and members', icon: Shield },
    { value: 'agent', label: 'Agent', desc: 'Can create and share deals', icon: User },
    { value: 'viewer', label: 'Viewer', desc: 'Can only view shared deals', icon: Eye },
  ];

  const handleCreate = async () => {
    setLoading(true);
    await onCreate(selectedRole);
    setLoading(false);
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
        maxWidth: '550px',
        background: 'rgba(15, 15, 15, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
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
          <X size={18} style={{ color: '#fff' }} />
        </button>

        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
            Invite Team Member
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
            Generate a shareable invite link
          </p>
        </div>

        {!inviteLink ? (
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', display: 'block', marginBottom: '12px', fontWeight: 500 }}>
              Select Role
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {roles.map(role => {
                const Icon = role.icon;
                const roleColor = getRoleColor(role.value);
                const isSelected = selectedRole === role.value;
                
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    style={{
                      padding: '16px',
                      background: isSelected ? roleColor.bg : 'rgba(0, 0, 0, 0.3)',
                      border: `1.5px solid ${isSelected ? roleColor.border : 'rgba(255, 255, 255, 0.05)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: isSelected ? roleColor.bg : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={20} style={{ color: isSelected ? roleColor.text : 'rgba(255, 255, 255, 0.4)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          color: isSelected ? roleColor.text : '#fff',
                          fontSize: '15px',
                          fontWeight: 600
                        }}>
                          {role.label}
                        </span>
                        {isSelected && <Check size={16} style={{ color: roleColor.text }} />}
                      </div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px' }}>
                        {role.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? 'rgba(0, 184, 212, 0.5)' : '#00b8d4',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0, 184, 212, 0.3)'
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Link2 size={18} />}
              Generate Invite Link
            </button>
          </div>
        ) : (
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', display: 'block', marginBottom: '12px', fontWeight: 500 }}>
              Shareable Invite Link
            </label>
            <div style={{
              padding: '16px',
              background: 'rgba(0, 184, 212, 0.05)',
              border: '1px solid rgba(0, 184, 212, 0.2)',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <p style={{
                color: '#00b8d4',
                fontSize: '13px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                marginBottom: '12px'
              }}>
                {inviteLink}
              </p>
              <button
                onClick={copyLink}
                style={{
                  padding: '10px 18px',
                  background: '#00b8d4',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Copy size={14} />
                Copy Link
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '100%',
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
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const getRoleColor = (role) => {
  switch(role) {
    case 'owner': return { bg: 'rgba(255, 215, 0, 0.1)', border: 'rgba(255, 215, 0, 0.3)', text: '#ffd700' };
    case 'admin': return { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#8b5cf6' };
    case 'agent': return { bg: 'rgba(0, 184, 212, 0.1)', border: 'rgba(0, 184, 212, 0.3)', text: '#00b8d4' };
    case 'viewer': return { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', text: 'rgba(255, 255, 255, 0.6)' };
    default: return { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', text: '#fff' };
  }
};

export default Team;
