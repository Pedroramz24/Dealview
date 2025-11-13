import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { 
  Users, Plus, Link2, Copy, X, Loader2, Crown, Shield, 
  User, Eye, Trash2, MoreVertical, ChevronDown, Mail,
  TrendingUp, Award, Target, Activity, Calendar, CheckCircle2,
  Settings, UserPlus, Clock, AlertCircle, Save
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
  const [showTeamSettings, setShowTeamSettings] = useState(false);
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

      const response = await fetch(`${BACKEND_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: teamName })
      });

      if (response.ok) {
        toast.success('Team created successfully');
        setShowCreateTeam(false);
        await loadData();
      } else {
        const data = await response.json();
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
        const { data: session2 } = await supabase.auth.getSession();
        await loadTeamData(currentTeam.id, session2?.session?.access_token);
        toast.success('Invite link created');
      } else {
        toast.error('Failed to create invite');
      }
    } catch (error) {
      console.error('Error creating invite:', error);
      toast.error('Failed to create invite');
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(`${BACKEND_URL}/api/teams/${currentTeam.id}/invites/${inviteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Invite revoked');
        await loadTeamData(currentTeam.id, token);
      } else {
        toast.error('Failed to revoke invite');
      }
    } catch (error) {
      console.error('Error revoking invite:', error);
      toast.error('Failed to revoke invite');
    }
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
        <Loader2 size={40} style={{ color: '#00b8d4' }} className="animate-spin" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '520px' }}>
          <div style={{
            width: '96px',
            height: '96px',
            margin: '0 auto 32px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 184, 212, 0.15) 0%, rgba(0, 184, 212, 0.05) 70%, transparent 100%)',
            border: '1px solid rgba(0, 184, 212, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              inset: '-20px',
              background: 'radial-gradient(circle, rgba(0, 184, 212, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(20px)',
              opacity: 0.5
            }} />
            <Users size={44} style={{ color: '#00b8d4', position: 'relative' }} />
          </div>

          <h2 style={{ 
            color: '#fff', 
            fontSize: '32px', 
            fontWeight: 700, 
            marginBottom: '16px',
            letterSpacing: '-0.8px'
          }}>
            Welcome to Teams
          </h2>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.5)', 
            fontSize: '16px', 
            lineHeight: '1.7',
            marginBottom: '40px'
          }}>
            Create your first team to collaborate with colleagues and share deals.
          </p>
          <button
            onClick={() => setShowCreateTeam(true)}
            style={{
              padding: '14px 36px',
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
              boxShadow: '0 4px 20px rgba(0, 184, 212, 0.3)'
            }}
          >
            <Plus size={20} strokeWidth={2.5} />
            Create Your Team
          </button>
        </div>
        
        {showCreateTeam && <CreateTeamModal onClose={() => setShowCreateTeam(false)} onCreate={handleCreateTeam} />}
      </div>
    );
  }

  const userRole = currentTeam?.user_role || 'viewer';
  const canManage = ['owner', 'admin'].includes(userRole);

  return (
    <div style={{ minHeight: '100vh', background: '#000' }}>
      {/* Header with Team Stats */}
      <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Title Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1 style={{ 
                color: '#fff', 
                fontSize: '32px', 
                fontWeight: 700, 
                letterSpacing: '-0.8px',
                marginBottom: '6px'
              }}>
                {currentTeam?.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                    {members.length} members
                  </span>
                </div>
                {invites.length > 0 && (
                  <>
                    <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                    <span style={{ color: 'rgba(251, 191, 36, 0.8)', fontSize: '14px' }}>
                      {invites.length} pending
                    </span>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {canManage && (
                <>
                  <button
                    onClick={() => setShowTeamSettings(true)}
                    style={{
                      padding: '10px 18px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                  <button
                    onClick={() => setShowInviteMember(true)}
                    style={{
                      padding: '10px 22px',
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
                      boxShadow: '0 0 0 0 rgba(0, 184, 212, 0)',
                      transition: 'box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 184, 212, 0.4)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0, 184, 212, 0)'}
                  >
                    <UserPlus size={17} />
                    Invite Member
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats Cards - Matching Email Tab Style */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            {[
              { label: 'Active Deals', value: '0', icon: Target, color: '#00b8d4', bgColor: 'rgba(0, 184, 212, 0.1)' },
              { label: 'Pipeline Value', value: '$0', icon: TrendingUp, color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' },
              { label: 'Closed This Month', value: '0', icon: CheckCircle2, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)' },
              { label: 'Team Activity', value: '0', icon: Activity, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' }
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} style={{
                  padding: '20px 18px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    background: `linear-gradient(135deg, ${stat.bgColor} 0%, transparent 60%)`,
                    opacity: 0.6,
                    pointerEvents: 'none'
                  }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <Icon size={16} style={{ color: stat.color }} />
                      <span style={{ 
                        color: 'rgba(255, 255, 255, 0.5)', 
                        fontSize: '12px', 
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {stat.label}
                      </span>
                    </div>
                    <div style={{ color: '#fff', fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px' }}>
                      {stat.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 40px' }}>
        {/* Team Members */}
        <div className="glass-surface" style={{ 
          padding: '28px',
          marginBottom: '24px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h2 style={{ 
              color: '#fff', 
              fontSize: '18px', 
              fontWeight: 600, 
              letterSpacing: '-0.3px',
              margin: 0
            }}>
              Team Members
            </h2>
            <span style={{ 
              color: 'rgba(255, 255, 255, 0.4)', 
              fontSize: '13px',
              fontWeight: 500
            }}>
              {members.length} total
            </span>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '14px' 
          }}>
            {members.map((member) => {
              const RoleIcon = getRoleIcon(member.role);
              const roleColor = getRoleColor(member.role);
              const isCurrentUser = member.user_id === user?.id;
              
              return (
                <div
                  key={member.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '18px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: member.avatar_url 
                        ? `url(${member.avatar_url})` 
                        : `linear-gradient(135deg, ${roleColor}40, ${roleColor}20)`,
                      backgroundSize: 'cover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px solid ${roleColor}30`,
                      flexShrink: 0,
                      position: 'relative'
                    }}>
                      {!member.avatar_url && <User size={24} style={{ color: roleColor }} />}
                      {isCurrentUser && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#10b981',
                          border: '2px solid #000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <CheckCircle2 size={9} style={{ color: '#000' }} />
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                        <h3 style={{
                          color: '#fff',
                          fontSize: '15px',
                          fontWeight: 600,
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {member.full_name || member.email?.split('@')[0] || 'Team Member'}
                        </h3>
                        {isCurrentUser && (
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 7px',
                            background: 'rgba(0, 184, 212, 0.15)',
                            borderRadius: '4px',
                            color: '#00b8d4',
                            fontWeight: 700
                          }}>YOU</span>
                        )}
                      </div>
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.4)',
                        fontSize: '13px',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {member.email}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 11px',
                    background: `${roleColor}15`,
                    border: `1px solid ${roleColor}35`,
                    borderRadius: '6px',
                    width: '100%',
                    justifyContent: 'center'
                  }}>
                    <RoleIcon size={13} style={{ color: roleColor }} />
                    <span style={{ color: roleColor, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      {member.role}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Add Member Placeholder Card */}
            {canManage && (
              <button
                onClick={() => setShowInviteMember(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed rgba(0, 184, 212, 0.3)',
                  borderRadius: '10px',
                  padding: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '130px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 184, 212, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.3)';
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(0, 184, 212, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '10px'
                }}>
                  <Plus size={20} style={{ color: '#00b8d4' }} />
                </div>
                <span style={{ color: '#00b8d4', fontSize: '13px', fontWeight: 600 }}>
                  Invite Member
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Pending Invites */}
        {canManage && invites.length > 0 && (
          <div className="glass-surface" style={{ 
            padding: '28px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <h2 style={{ 
                color: '#fff', 
                fontSize: '18px', 
                fontWeight: 600, 
                letterSpacing: '-0.3px',
                margin: 0
              }}>
                Pending Invitations
              </h2>
              <span style={{
                padding: '4px 10px',
                background: 'rgba(251, 191, 36, 0.15)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '12px',
                color: '#fbbf24',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.3px'
              }}>
                {invites.length} PENDING
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {invites.map(invite => {
                const roleColor = getRoleColor(invite.role);
                const RoleIcon = getRoleIcon(invite.role);
                const expiresAt = new Date(invite.expires_at);
                const daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div
                    key={invite.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 18px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: `${roleColor}15`,
                        border: `1px solid ${roleColor}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <RoleIcon size={20} style={{ color: roleColor }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                          <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                            {invite.role}
                          </span>
                          {invite.email && (
                            <>
                              <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                              <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>
                                {invite.email}
                              </span>
                            </>
                          )}
                        </div>
                        <p style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '12px', margin: 0 }}>
                          Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/join-team/${invite.token}`;
                          navigator.clipboard.writeText(link);
                          toast.success('Invite link copied');
                        }}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(0, 184, 212, 0.1)',
                          border: '1px solid rgba(0, 184, 212, 0.3)',
                          borderRadius: '7px',
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
                        onClick={() => handleRevokeInvite(invite.id)}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(220, 38, 38, 0.1)',
                          border: '1px solid rgba(220, 38, 38, 0.3)',
                          borderRadius: '7px',
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
      </div>

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
          copyLink={() => {
            navigator.clipboard.writeText(inviteLink);
            toast.success('Invite link copied');
          }}
        />
      )}
      {showTeamSettings && (
        <TeamSettingsModal 
          team={currentTeam}
          onClose={() => setShowTeamSettings(false)}
          onUpdate={loadData}
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
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(10, 10, 10, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ 
            color: '#fff', 
            fontSize: '22px', 
            fontWeight: 700, 
            marginBottom: '8px',
            letterSpacing: '-0.4px'
          }}>
            Create a Team
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
            Start collaborating with your colleagues
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: '13px', 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 600 
            }}>
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
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
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
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
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
              disabled={loading || !teamName.trim()}
              style={{
                flex: 1,
                padding: '12px',
                background: (loading || !teamName.trim()) ? 'rgba(0, 184, 212, 0.3)' : '#00b8d4',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontSize: '14px',
                fontWeight: 700,
                cursor: (loading || !teamName.trim()) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
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
    { 
      value: 'admin', 
      label: 'Admin', 
      desc: 'Manage team members and settings', 
      icon: Shield, 
      color: '#a78bfa',
      permissions: ['Manage members', 'Edit settings']
    },
    { 
      value: 'agent', 
      label: 'Agent', 
      desc: 'Create and share deals', 
      icon: User, 
      color: '#00b8d4',
      permissions: ['Create deals', 'Share deals']
    },
    { 
      value: 'viewer', 
      label: 'Viewer', 
      desc: 'View shared deals only', 
      icon: Eye, 
      color: '#6b7280',
      permissions: ['View only']
    },
  ];

  const handleCreate = async () => {
    setLoading(true);
    await onCreate(selectedRole);
    setLoading(false);
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '540px',
          background: 'rgba(10, 10, 10, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ 
            color: '#fff', 
            fontSize: '22px', 
            fontWeight: 700, 
            marginBottom: '8px',
            letterSpacing: '-0.4px'
          }}>
            Invite Team Member
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
            Generate a shareable invite link
          </p>
        </div>

        {!inviteLink ? (
          <div>
            <label style={{ 
              color: 'rgba(255, 255, 255, 0.6)', 
              fontSize: '12px', 
              display: 'block', 
              marginBottom: '12px', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Select Role
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {roles.map(role => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.value;
                
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    style={{
                      padding: '16px',
                      background: isSelected ? `${role.color}12` : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isSelected ? `${role.color}40` : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: `${role.color}18`,
                        border: `1px solid ${role.color}35`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={18} style={{ color: role.color }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '6px'
                        }}>
                          <span style={{ 
                            color: isSelected ? role.color : '#fff', 
                            fontSize: '15px', 
                            fontWeight: 600
                          }}>
                            {role.label}
                          </span>
                          {isSelected && (
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: role.color
                            }} />
                          )}
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px', marginBottom: '8px' }}>
                          {role.desc}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {role.permissions.map((perm, idx) => (
                            <span key={idx} style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '4px',
                              color: 'rgba(255, 255, 255, 0.5)'
                            }}>
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>
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
                padding: '13px',
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
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              Generate Invite Link
            </button>
          </div>
        ) : (
          <div>
            <div style={{
              padding: '18px',
              background: 'rgba(0, 184, 212, 0.08)',
              border: '1px solid rgba(0, 184, 212, 0.25)',
              borderRadius: '10px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <CheckCircle2 size={16} style={{ color: '#00b8d4' }} />
                <span style={{ color: '#00b8d4', fontSize: '14px', fontWeight: 600 }}>
                  Invite Link Ready
                </span>
              </div>
              <p style={{
                color: '#00b8d4',
                fontSize: '13px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                marginBottom: '14px',
                padding: '10px',
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '6px'
              }}>
                {inviteLink}
              </p>
              <button
                onClick={copyLink}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#00b8d4',
                  border: 'none',
                  borderRadius: '7px',
                  color: '#000',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px'
                }}
              >
                <Copy size={14} />
                Copy to Clipboard
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '11px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
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

// Team Settings Modal
const TeamSettingsModal = ({ team, onClose, onUpdate }) => {
  const [teamName, setTeamName] = useState(team?.name || '');
  const [defaultSharing, setDefaultSharing] = useState(team?.default_deal_sharing || 'private');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(`${BACKEND_URL}/api/teams/${team.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: teamName,
          default_deal_sharing: defaultSharing
        })
      });

      if (response.ok) {
        toast.success('Team settings updated');
        onClose();
        await onUpdate();
      } else {
        toast.error('Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'rgba(10, 10, 10, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ 
            color: '#fff', 
            fontSize: '22px', 
            fontWeight: 700, 
            marginBottom: '8px',
            letterSpacing: '-0.4px'
          }}>
            Team Settings
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
            Manage your team configuration
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontSize: '13px', 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 600 
          }}>
            Team Name
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '28px' }}>
          <label style={{ 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontSize: '13px', 
            display: 'block', 
            marginBottom: '12px', 
            fontWeight: 600 
          }}>
            Default Deal Sharing
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { value: 'private', label: 'Private', desc: 'Deals are private by default' },
              { value: 'team', label: 'Team', desc: 'New deals shared with team' }
            ].map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDefaultSharing(option.value)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: defaultSharing === option.value ? 'rgba(0, 184, 212, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${defaultSharing === option.value ? 'rgba(0, 184, 212, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ 
                  color: defaultSharing === option.value ? '#00b8d4' : '#fff', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  marginBottom: '4px'
                }}>
                  {option.label}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>
                  {option.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: '12px',
              background: saving ? 'rgba(0, 184, 212, 0.5)' : '#00b8d4',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontSize: '14px',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Team;
