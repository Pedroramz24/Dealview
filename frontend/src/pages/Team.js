import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { 
  Users, Plus, Link2, Copy, X, Loader2, Crown, Shield, 
  User, Eye, Trash2, MoreVertical, ChevronDown, Mail,
  TrendingUp, Award, Target, Activity, Calendar, CheckCircle2,
  Settings, UserPlus, Clock
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

  // No teams - Enhanced empty state
  if (teams.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '520px' }}>
          {/* Icon */}
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

          {/* Content */}
          <h2 style={{ 
            color: '#fff', 
            fontSize: '32px', 
            fontWeight: 700, 
            marginBottom: '16px',
            letterSpacing: '-0.8px',
            lineHeight: '1.2'
          }}>
            Welcome to Teams
          </h2>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.5)', 
            fontSize: '16px', 
            lineHeight: '1.7',
            marginBottom: '12px'
          }}>
            Create your first team to collaborate with colleagues, share deals, and track performance together.
          </p>
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            margin: '32px 0',
            padding: '24px 0',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            {[
              { label: 'Invite Members', icon: UserPlus },
              { label: 'Share Deals', icon: TrendingUp },
              { label: 'Track Progress', icon: Target }
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    margin: '0 auto 10px',
                    borderRadius: '8px',
                    background: 'rgba(0, 184, 212, 0.08)',
                    border: '1px solid rgba(0, 184, 212, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={20} style={{ color: '#00b8d4' }} />
                  </div>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', fontWeight: 500 }}>
                    {feature.label}
                  </span>
                </div>
              );
            })}
          </div>
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
              boxShadow: '0 0 0 0 rgba(0, 184, 212, 0.4)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 184, 212, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 0 0 rgba(0, 184, 212, 0.4)';
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
    <div style={{ minHeight: '100vh', background: '#000', padding: '0' }}>
      {/* Premium Header with gradient backdrop */}
      <div style={{
        position: 'relative',
        padding: '40px 48px 32px',
        background: 'linear-gradient(180deg, rgba(0, 184, 212, 0.03) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <h1 style={{ 
                  color: '#fff', 
                  fontSize: '36px', 
                  fontWeight: 700, 
                  letterSpacing: '-1px',
                  margin: 0
                }}>
                  {currentTeam?.name}
                </h1>
                {teams.length > 1 && (
                  <button style={{
                    padding: '8px 14px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: 500
                  }}>
                    Switch Team
                    <ChevronDown size={16} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '15px' }}>
                    {members.length} {members.length === 1 ? 'member' : 'members'}
                  </span>
                </div>
                {invites.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '15px' }}>
                      {invites.length} pending
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '15px' }}>
                    Created {new Date(currentTeam?.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {canManage && (
                <>
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
                      boxShadow: '0 4px 16px rgba(0, 184, 212, 0.25)'
                    }}
                  >
                    <UserPlus size={18} />
                    Invite Member
                  </button>
                  <button
                    onClick={() => setShowTeamSettings(true)}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Settings size={18} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { label: 'Active Deals', value: '0', icon: Target, color: '#00b8d4' },
              { label: 'Pipeline Value', value: '$0', icon: TrendingUp, color: '#8b5cf6' },
              { label: 'Closed This Month', value: '0', icon: CheckCircle2, color: '#10b981' },
              { label: 'Team Activity', value: '0', icon: Activity, color: '#f59e0b' }
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} style={{
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    background: `radial-gradient(circle, ${stat.color}15 0%, transparent 70%)`,
                    borderRadius: '50%'
                  }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {stat.label}
                      </span>
                      <Icon size={18} style={{ color: `${stat.color}80` }} />
                    </div>
                    <div style={{ color: '#fff', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
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
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 48px' }}>
        {/* Team Members Section */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ 
              color: '#fff', 
              fontSize: '20px', 
              fontWeight: 600, 
              letterSpacing: '-0.3px',
              margin: 0
            }}>
              Team Members
            </h2>
            <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>
              {members.length} total
            </span>
          </div>

          {/* Members Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
            gap: '16px' 
          }}>
            {members.map((member) => {
              const RoleIcon = getRoleIcon(member.role);
              const roleColor = getRoleColor(member.role);
              const isCurrentUser = member.user_id === user?.id;
              
              return (
                <div
                  key={member.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '24px',
                    position: 'relative',
                    transition: 'border-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'}
                >
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: member.avatar_url 
                        ? `url(${member.avatar_url})` 
                        : `linear-gradient(135deg, ${roleColor}30, ${roleColor}15)`,
                      backgroundSize: 'cover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px solid ${roleColor}25`,
                      flexShrink: 0,
                      position: 'relative'
                    }}>
                      {!member.avatar_url && <User size={28} style={{ color: roleColor }} />}
                      {isCurrentUser && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#10b981',
                          border: '2px solid #000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <CheckCircle2 size={10} style={{ color: '#000' }} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h3 style={{
                            color: '#fff',
                            fontSize: '16px',
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
                              fontSize: '11px',
                              padding: '2px 8px',
                              background: 'rgba(0, 184, 212, 0.15)',
                              borderRadius: '4px',
                              color: '#00b8d4',
                              fontWeight: 700
                            }}>YOU</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                          <Mail size={13} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
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
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: `${roleColor}12`,
                          border: `1px solid ${roleColor}28`,
                          borderRadius: '6px'
                        }}>
                          <RoleIcon size={13} style={{ color: roleColor }} />
                          <span style={{ color: roleColor, fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                            {member.role}
                          </span>
                        </div>

                        {canManage && !isCurrentUser && member.role !== 'owner' && (
                          <button
                            onClick={() => setMemberMenuOpen(memberMenuOpen === member.id ? null : member.id)}
                            style={{
                              padding: '6px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '6px',
                              color: 'rgba(255, 255, 255, 0.5)',
                              cursor: 'pointer'
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {member.phone && (
                    <div style={{
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontSize: '13px'
                    }}>
                      {member.phone}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Member Card */}
            {canManage && (
              <button
                onClick={() => setShowInviteMember(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '2px dashed rgba(0, 184, 212, 0.3)',
                  borderRadius: '12px',
                  padding: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '180px',
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
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(0, 184, 212, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <Plus size={24} style={{ color: '#00b8d4' }} />
                </div>
                <span style={{ color: '#00b8d4', fontSize: '14px', fontWeight: 600 }}>
                  Invite Member
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Pending Invites */}
        {canManage && invites.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ 
                color: '#fff', 
                fontSize: '20px', 
                fontWeight: 600, 
                letterSpacing: '-0.3px',
                margin: 0
              }}>
                Pending Invitations
              </h2>
              <span style={{
                padding: '4px 12px',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.2)',
                borderRadius: '12px',
                color: '#fbbf24',
                fontSize: '12px',
                fontWeight: 700
              }}>
                {invites.length} PENDING
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                      padding: '20px 24px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: `${roleColor}12`,
                        border: `1px solid ${roleColor}25`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <RoleIcon size={22} style={{ color: roleColor }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ color: '#fff', fontSize: '15px', fontWeight: 600, textTransform: 'capitalize' }}>
                            {invite.role} Invite
                          </span>
                          {invite.email && (
                            <>
                              <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>•</span>
                              <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>
                                {invite.email}
                              </span>
                            </>
                          )}
                        </div>
                        <p style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '13px', margin: 0 }}>
                          Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/join-team/${invite.token}`;
                          navigator.clipboard.writeText(link);
                          toast.success('Invite link copied');
                        }}
                        style={{
                          padding: '9px 18px',
                          background: 'rgba(0, 184, 212, 0.08)',
                          border: '1px solid rgba(0, 184, 212, 0.25)',
                          borderRadius: '7px',
                          color: '#00b8d4',
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
                      <button
                        style={{
                          padding: '9px 18px',
                          background: 'rgba(220, 38, 38, 0.08)',
                          border: '1px solid rgba(220, 38, 38, 0.25)',
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
    </div>
  );
};

// Create Team Modal - Premium Design
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
          maxWidth: '520px',
          background: '#0a0a0a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '36px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            color: '#fff', 
            fontSize: '24px', 
            fontWeight: 700, 
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            Create a Team
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '15px', lineHeight: '1.5' }}>
            Start collaborating with your colleagues
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '28px' }}>
            <label style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: '14px', 
              display: 'block', 
              marginBottom: '10px', 
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
                padding: '13px 16px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '15px',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.5)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '13px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: 'rgba(255, 255, 255, 0.8)',
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
                padding: '13px',
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
              {loading && <Loader2 size={16} className="animate-spin" />}
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Invite Member Modal - Premium Design
const InviteMemberModal = ({ onClose, onCreate, inviteLink, copyLink }) => {
  const [selectedRole, setSelectedRole] = useState('agent');
  const [loading, setLoading] = useState(false);

  const roles = [
    { 
      value: 'admin', 
      label: 'Admin', 
      desc: 'Full access to manage team members and settings', 
      icon: Shield, 
      color: '#a78bfa',
      permissions: ['Manage members', 'Edit team settings', 'View all deals']
    },
    { 
      value: 'agent', 
      label: 'Agent', 
      desc: 'Create and share deals with the team', 
      icon: User, 
      color: '#00b8d4',
      permissions: ['Create deals', 'Share deals', 'View shared deals']
    },
    { 
      value: 'viewer', 
      label: 'Viewer', 
      desc: 'Read-only access to shared deals', 
      icon: Eye, 
      color: '#6b7280',
      permissions: ['View shared deals', 'No editing access']
    },
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
      background: 'rgba(0, 0, 0, 0.9)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        width: '100%',
        maxWidth: '580px',
        background: '#0a0a0a',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '36px',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)'
      }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            color: '#fff', 
            fontSize: '24px', 
            fontWeight: 700, 
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            Invite Team Member
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '15px' }}>
            Generate a shareable invite link with role permissions
          </p>
        </div>

        {!inviteLink ? (
          <div>
            <label style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              fontSize: '13px', 
              display: 'block', 
              marginBottom: '14px', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Select Role
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
              {roles.map(role => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.value;
                
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    style={{
                      padding: '18px',
                      background: isSelected ? `${role.color}10` : 'rgba(255, 255, 255, 0.02)',
                      border: `1.5px solid ${isSelected ? `${role.color}40` : 'rgba(255, 255, 255, 0.06)'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'start', gap: '14px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: `${role.color}15`,
                        border: `1px solid ${role.color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={20} style={{ color: role.color }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          color: isSelected ? role.color : '#fff', 
                          fontSize: '15px', 
                          fontWeight: 600, 
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          {role.label}
                          {isSelected && (
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: role.color,
                              marginLeft: 'auto'
                            }} />
                          )}
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px', marginBottom: '10px' }}>
                          {role.desc}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {role.permissions.map((perm, idx) => (
                            <span key={idx} style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
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
                gap: '10px'
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Link2 size={18} />}
              Generate Invite Link
            </button>
          </div>
        ) : (
          <div>
            <div style={{
              padding: '20px',
              background: 'rgba(0, 184, 212, 0.06)',
              border: '1px solid rgba(0, 184, 212, 0.2)',
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <CheckCircle2 size={18} style={{ color: '#00b8d4' }} />
                <span style={{ color: '#00b8d4', fontSize: '14px', fontWeight: 600 }}>
                  Invite Link Generated
                </span>
              </div>
              <p style={{
                color: '#00b8d4',
                fontSize: '13px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                marginBottom: '16px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '6px'
              }}>
                {inviteLink}
              </p>
              <button
                onClick={copyLink}
                style={{
                  width: '100%',
                  padding: '11px',
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
                  gap: '8px'
                }}
              >
                <Copy size={15} />
                Copy Invite Link
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
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

export default Team;
