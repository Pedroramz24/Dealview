import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { 
  Users, Plus, Link2, Copy, X, Loader2, Crown, Shield, 
  User, Eye, Trash2, MoreVertical, ChevronDown
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Team = () => {
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [memberMenuOpen, setMemberMenuOpen] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      if (token) {
        const response = await fetch(`${BACKEND_URL}/api/teams`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setTeams(data.teams || []);
          
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
      const membersRes = await fetch(`${BACKEND_URL}/api/teams/${teamId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }

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

      console.log('Creating team:', teamName);

      const response = await fetch(`${BACKEND_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: teamName })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        toast.success('Team created successfully');
        setShowCreateTeam(false);
        await loadData();
      } else {
        toast.error(data.detail || 'Failed to create team');
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
    toast.success('Invite link copied');
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'owner': return Crown;
      case 'admin': return Shield;
      case 'agent': return User;
      case 'viewer': return Eye;
      default: return User;
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'owner': return '#fbbf24';
      case 'admin': return '#a78bfa';
      case 'agent': return '#00b8d4';
      case 'viewer': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#000' }}>
        <Loader2 size={32} style={{ color: '#00b8d4' }} className="animate-spin" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 24px',
            borderRadius: '12px',
            background: 'rgba(0, 184, 212, 0.08)',
            border: '1px solid rgba(0, 184, 212, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={36} style={{ color: '#00b8d4' }} />
          </div>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 600, marginBottom: '12px', letterSpacing: '-0.3px' }}>
            Create Your Team
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
            Collaborate with colleagues, share deals, and manage permissions
          </p>
          <button
            onClick={() => setShowCreateTeam(true)}
            style={{
              padding: '12px 28px',
              background: '#00b8d4',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={18} />
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
    <div style={{ minHeight: '100vh', background: '#000', padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.5px' }}>
              {currentTeam?.name}
            </h1>
            {teams.length > 1 && (
              <button style={{
                padding: '6px 10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px'
              }}>
                Switch
                <ChevronDown size={14} />
              </button>
            )}
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>
            {members.length} {members.length === 1 ? 'member' : 'members'}
            {invites.length > 0 && ` • ${invites.length} pending`}
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowInviteMember(true)}
            style={{
              padding: '10px 20px',
              background: '#00b8d4',
              border: 'none',
              borderRadius: '7px',
              color: '#000',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={17} />
            Invite Member
          </button>
        )}
      </div>

      {/* Members Table */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.5fr 1fr auto',
          padding: '14px 20px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
        }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Member</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</span>
          <span></span>
        </div>

        {/* Table Body */}
        {members.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Users size={40} style={{ color: 'rgba(255, 255, 255, 0.2)', margin: '0 auto 16px' }} />
            <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>No team members yet</p>
          </div>
        ) : (
          members.map((member, index) => {
            const RoleIcon = getRoleIcon(member.role);
            const roleColor = getRoleColor(member.role);
            const isCurrentUser = member.user_id === user?.id;
            
            return (
              <div
                key={member.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 1fr auto',
                  padding: '16px 20px',
                  borderBottom: index < members.length - 1 ? '1px solid rgba(255, 255, 255, 0.03)' : 'none',
                  alignItems: 'center'
                }}
              >
                {/* Member */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: member.avatar_url ? `url(${member.avatar_url})` : 'linear-gradient(135deg, rgba(0, 184, 212, 0.15), rgba(139, 92, 246, 0.15))',
                    backgroundSize: 'cover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    flexShrink: 0
                  }}>
                    {!member.avatar_url && <User size={18} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                        {member.full_name || 'Team Member'}
                      </span>
                      {isCurrentUser && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          background: 'rgba(0, 184, 212, 0.12)',
                          borderRadius: '4px',
                          color: '#00b8d4',
                          fontWeight: 600
                        }}>You</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                  {member.email}
                </span>

                {/* Role */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  background: `${roleColor}15`,
                  border: `1px solid ${roleColor}30`,
                  borderRadius: '6px',
                  width: 'fit-content'
                }}>
                  <RoleIcon size={13} style={{ color: roleColor }} />
                  <span style={{ color: roleColor, fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>
                    {member.role}
                  </span>
                </div>

                {/* Actions */}
                {canManage && !isCurrentUser && member.role !== 'owner' && (
                  <button
                    onClick={() => setMemberMenuOpen(memberMenuOpen === member.id ? null : member.id)}
                    style={{
                      padding: '6px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '5px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      cursor: 'pointer'
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pending Invites */}
      {canManage && invites.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '16px', letterSpacing: '-0.2px' }}>
            Pending Invites
          </h3>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '16px'
          }}>
            {invites.map(invite => {
              const roleColor = getRoleColor(invite.role);
              const RoleIcon = getRoleIcon(invite.role);
              const expiresAt = new Date(invite.expires_at);
              const isExpired = expiresAt < new Date();
              
              return (
                <div
                  key={invite.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      padding: '5px 12px',
                      background: `${roleColor}15`,
                      border: `1px solid ${roleColor}30`,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <RoleIcon size={13} style={{ color: roleColor }} />
                      <span style={{ color: roleColor, fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>
                        {invite.role}
                      </span>
                    </div>
                    {invite.email && (
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                        {invite.email}
                      </span>
                    )}
                    <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px' }}>
                      • Expires {expiresAt.toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/join-team/${invite.token}`;
                        navigator.clipboard.writeText(link);
                        toast.success('Link copied');
                      }}
                      style={{
                        padding: '7px 14px',
                        background: 'rgba(0, 184, 212, 0.08)',
                        border: '1px solid rgba(0, 184, 212, 0.2)',
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
                      <Copy size={13} />
                      Copy
                    </button>
                    <button
                      style={{
                        padding: '7px 14px',
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: 'rgba(255, 255, 255, 0.5)',
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
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: '#0a0a0a',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        padding: '28px'
      }}>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, marginBottom: '8px', letterSpacing: '-0.3px' }}>
          Create Team
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', marginBottom: '24px' }}>
          Start collaborating with your team
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
              autoFocus
              style={{
                width: '100%',
                padding: '11px 14px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '7px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '11px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '7px',
                color: 'rgba(255, 255, 255, 0.7)',
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
                padding: '11px',
                background: loading ? 'rgba(0, 184, 212, 0.5)' : '#00b8d4',
                border: 'none',
                borderRadius: '7px',
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
              {loading && <Loader2 size={15} className="animate-spin" />}
              Create
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
    { value: 'admin', label: 'Admin', desc: 'Manage team and settings', icon: Shield, color: '#a78bfa' },
    { value: 'agent', label: 'Agent', desc: 'Create and share deals', icon: User, color: '#00b8d4' },
    { value: 'viewer', label: 'Viewer', desc: 'View shared deals only', icon: Eye, color: '#6b7280' },
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
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
        background: '#0a0a0a',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        padding: '28px'
      }}>
        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, marginBottom: '8px', letterSpacing: '-0.3px' }}>
          Invite Team Member
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', marginBottom: '24px' }}>
          Generate a shareable invite link
        </p>

        {!inviteLink ? (
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', display: 'block', marginBottom: '12px', fontWeight: 500 }}>
              Select Role
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {roles.map(role => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.value;
                
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    style={{
                      padding: '14px',
                      background: isSelected ? `${role.color}10` : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isSelected ? `${role.color}40` : 'rgba(255, 255, 255, 0.04)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '7px',
                      background: `${role.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={18} style={{ color: role.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: isSelected ? role.color : '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '3px' }}>
                        {role.label}
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>
                        {role.desc}
                      </div>
                    </div>
                    {isSelected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: role.color }} />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? 'rgba(0, 184, 212, 0.5)' : '#00b8d4',
                border: 'none',
                borderRadius: '7px',
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
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              Generate Link
            </button>
          </div>
        ) : (
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', display: 'block', marginBottom: '10px', fontWeight: 500 }}>
              Invite Link
            </label>
            <div style={{
              padding: '14px',
              background: 'rgba(0, 184, 212, 0.06)',
              border: '1px solid rgba(0, 184, 212, 0.15)',
              borderRadius: '8px',
              marginBottom: '16px'
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
                  padding: '9px 16px',
                  background: '#00b8d4',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px'
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
                padding: '11px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '7px',
                color: 'rgba(255, 255, 255, 0.7)',
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

export default Team;
