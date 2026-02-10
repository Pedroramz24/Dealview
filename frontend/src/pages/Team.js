import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { 
  Users, Plus, X, Loader2, Crown, Shield, 
  User, Eye, Trash2, MoreVertical, Mail, TrendingUp, 
  Target, Activity, CheckCircle2, Settings, UserPlus, Save,
  BarChart3, DollarSign, MapPin, Building2, Calendar
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const Team = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');
  
  // Team stats
  const [teamStats, setTeamStats] = useState(null);
  const [agentStats, setAgentStats] = useState([]);
  const [teamDeals, setTeamDeals] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [openMemberMenu, setOpenMemberMenu] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openMemberMenu && !e.target.closest('[data-member-menu]')) {
        setOpenMemberMenu(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMemberMenu]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (currentTeam) {
      loadTeamStats();
    }
  }, [currentTeam]);

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
          // API returns { team: {...} } not { teams: [...] }
          if (data.success && data.team) {
            setTeams([data.team]);
            setCurrentTeam(data.team);
            // Members are already included in team response
            setMembers(data.team.members || []);
          } else {
            setTeams([]);
            setCurrentTeam(null);
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
      const membersRes = await fetch(`${BACKEND_URL}/api/teams/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  };

  const loadTeamStats = async () => {
    setStatsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(`${BACKEND_URL}/api/teams/${currentTeam.id}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTeamStats(data.team_stats);
        setAgentStats(data.agent_stats || []);
        setTeamDeals(data.team_deals || []);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
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

  const handleInviteMember = async (email, role) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(`${BACKEND_URL}/api/teams/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, role })
      });

      if (response.ok) {
        toast.success(`${email} added to the team`);
        setShowInviteMember(false);
        await loadData();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to invite member');
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to invite member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the team?')) {
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(`${BACKEND_URL}/api/teams/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Member removed successfully');
        setOpenMemberMenu(null);
        await loadData();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const response = await fetch(`${BACKEND_URL}/api/teams/members/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        toast.success(`Role updated to ${newRole}`);
        setOpenMemberMenu(null);
        await loadData();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'transparent' }}>
        <Loader2 size={40} style={{ color: '#00b8d4' }} className="animate-spin" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-surface p-10 max-w-2xl w-full" style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            borderRadius: '50%',
            background: 'rgba(0, 184, 212, 0.1)',
            border: '1px solid rgba(0, 184, 212, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={40} style={{ color: '#00b8d4' }} />
          </div>
          <h2 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.5px' }}>
            Welcome to Teams
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '15px', marginBottom: '32px' }}>
            Create your first team to collaborate and share deals
          </p>
          <button onClick={() => setShowCreateTeam(true)} style={{ padding: '12px 32px', background: '#00b8d4', border: 'none', borderRadius: '8px', color: '#000', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(0, 184, 212, 0.4)' }}>
            <Plus size={18} />Create Your Team
          </button>
        </div>
        {showCreateTeam && <CreateTeamModal onClose={() => setShowCreateTeam(false)} onCreate={handleCreateTeam} />}
      </div>
    );
  }

  const userRole = members.find(m => m.user_id === user?.id)?.role || 'viewer';
  const canManage = ['owner', 'admin'].includes(userRole);

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '24px' }}>
      {/* Header with Stats */}
      <div style={{ marginBottom: '24px' }}>
        <div className="glass-surface" style={{ padding: '24px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="flex items-center gap-4">
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(0, 184, 212, 0.12)', border: '1px solid rgba(0, 184, 212, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={24} style={{ color: '#00b8d4' }} />
                </div>
                <div>
                  <h3 style={{ color: '#FFFFFF', fontSize: '17px', fontWeight: 700, marginBottom: '2px', letterSpacing: '-0.01em' }}>
                    {currentTeam?.name}
                  </h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>
                    {members.length} member{members.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowTeamSettings(true)} style={{ padding: '10px 16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: 'rgba(255, 255, 255, 0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', fontWeight: 600 }}>
                    <Settings size={15} />Settings
                  </button>
                  <button onClick={() => setShowInviteMember(true)} style={{ padding: '10px 20px', background: '#00b8d4', border: 'none', borderRadius: '8px', color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <UserPlus size={16} />Invite Member
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div style={{ background: 'rgba(0, 184, 212, 0.08)', border: '1px solid rgba(0, 184, 212, 0.2)', borderRadius: '10px', padding: '18px 16px' }}>
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} style={{ color: '#00b8d4' }} />
                <p style={{ color: 'rgba(0, 184, 212, 0.8)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Deals</p>
              </div>
              <p style={{ color: '#00b8d4', fontSize: '32px', fontWeight: 800, lineHeight: '1', fontVariantNumeric: 'tabular-nums' }}>
                {statsLoading ? '...' : teamStats?.total_active_deals || 0}
              </p>
            </div>

            <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '10px', padding: '18px 16px' }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} style={{ color: '#8b5cf6' }} />
                <p style={{ color: 'rgba(139, 92, 246, 0.8)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pipeline</p>
              </div>
              <p style={{ color: '#8b5cf6', fontSize: '32px', fontWeight: 800, lineHeight: '1', fontVariantNumeric: 'tabular-nums' }}>
                {statsLoading ? '...' : formatCurrency(teamStats?.total_pipeline_value || 0)}
              </p>
            </div>

            <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '10px', padding: '18px 16px' }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                <p style={{ color: 'rgba(34, 197, 94, 0.8)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Closed</p>
              </div>
              <p style={{ color: '#22c55e', fontSize: '32px', fontWeight: 800, lineHeight: '1', fontVariantNumeric: 'tabular-nums' }}>
                {statsLoading ? '...' : teamStats?.closed_this_month || 0}
              </p>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', padding: '18px 16px' }}>
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} style={{ color: '#f59e0b' }} />
                <p style={{ color: 'rgba(245, 158, 11, 0.8)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Activity</p>
              </div>
              <p style={{ color: '#f59e0b', fontSize: '32px', fontWeight: 800, lineHeight: '1', fontVariantNumeric: 'tabular-nums' }}>
                {statsLoading ? '...' : teamStats?.team_activity || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '2px' }}>
          {['members', 'deals', 'performance'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 18px',
                background: activeTab === tab ? 'rgba(0, 184, 212, 0.1)' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab ? '#00b8d4' : 'transparent'}`,
                borderRadius: '6px 6px 0 0',
                color: activeTab === tab ? '#00b8d4' : 'rgba(255, 255, 255, 0.5)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s ease'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'members' && (
        <MembersTab 
          members={members} 
          user={user} 
          canManage={canManage} 
          setShowInviteMember={setShowInviteMember}
          openMemberMenu={openMemberMenu}
          setOpenMemberMenu={setOpenMemberMenu}
          handleRemoveMember={handleRemoveMember}
          handleUpdateRole={handleUpdateRole}
        />
      )}
      
      {activeTab === 'deals' && (
        <TeamDealsTab teamDeals={teamDeals} statsLoading={statsLoading} navigate={navigate} />
      )}
      
      {activeTab === 'performance' && (
        <PerformanceTab agentStats={agentStats} members={members} statsLoading={statsLoading} />
      )}

      {/* Modals */}
      {showCreateTeam && <CreateTeamModal onClose={() => setShowCreateTeam(false)} onCreate={handleCreateTeam} />}
      {showInviteMember && <InviteMemberModal onClose={() => setShowInviteMember(false)} onInvite={handleInviteMember} />}
      {showTeamSettings && <TeamSettingsModal team={currentTeam} onClose={() => setShowTeamSettings(false)} onUpdate={loadData} />}
    </div>
  );
};

// Members Tab Component
const MembersTab = ({ members, user, canManage, setShowInviteMember, openMemberMenu, setOpenMemberMenu, handleRemoveMember, handleUpdateRole }) => {
  const getRoleIcon = (role) => {
    switch(role) { case 'owner': return Crown; case 'admin': return Shield; case 'agent': return User; case 'viewer': return Eye; default: return User; }
  };
  const getRoleColor = (role) => {
    switch(role) { case 'owner': return '#fbbf24'; case 'admin': return '#a78bfa'; case 'agent': return '#00b8d4'; case 'viewer': return '#6b7280'; default: return '#6b7280'; }
  };

  return (
    <div>
      <div className="glass-surface" style={{ padding: '24px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '24px' }}>
        <h3 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.01em' }}>Team Members</h3>
        <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)', overflow: 'visible' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 1fr auto', padding: '12px 16px', background: 'rgba(0, 0, 0, 0.4)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Member</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</span>
            <span></span>
          </div>
          {members.map((member, index) => {
            const RoleIcon = getRoleIcon(member.role); const roleColor = getRoleColor(member.role); const isCurrentUser = member.user_id === user?.id;
            return (
              <div key={member.id} style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 1fr auto', padding: '14px 16px', background: index % 2 === 0 ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.25)', borderBottom: index < members.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none', alignItems: 'center', transition: 'background 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 184, 212, 0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.25)'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: member.avatar_url ? `url(${member.avatar_url})` : `linear-gradient(135deg, ${roleColor}40, ${roleColor}20)`, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${roleColor}30`, flexShrink: 0, position: 'relative' }}>
                    {!member.avatar_url && <User size={20} style={{ color: roleColor }} />}
                    {isCurrentUser && <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', border: '2px solid #000' }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.full_name || member.email?.split('@')[0] || 'Team Member'}</span>
                      {isCurrentUser && <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(0, 184, 212, 0.2)', borderRadius: '3px', color: '#00b8d4', fontWeight: 700 }}>YOU</span>}
                    </div>
                  </div>
                </div>
                <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.email}</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', background: `${roleColor}15`, border: `1px solid ${roleColor}35`, borderRadius: '6px', width: 'fit-content' }}>
                  <RoleIcon size={12} style={{ color: roleColor }} />
                  <span style={{ color: roleColor, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{member.role}</span>
                </div>
                <div style={{ position: 'relative' }} data-member-menu>
                  {canManage && !isCurrentUser && member.role !== 'owner' && (
                    <>
                      <button 
                        onClick={() => setOpenMemberMenu(openMemberMenu === member.id ? null : member.id)}
                        style={{ 
                          padding: '6px', 
                          background: openMemberMenu === member.id ? 'rgba(0, 184, 212, 0.1)' : 'rgba(255, 255, 255, 0.04)', 
                          border: `1px solid ${openMemberMenu === member.id ? 'rgba(0, 184, 212, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`, 
                          borderRadius: '5px', 
                          color: openMemberMenu === member.id ? '#00b8d4' : 'rgba(255, 255, 255, 0.5)', 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openMemberMenu === member.id && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: '4px',
                          background: 'rgba(20, 22, 25, 0.98)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                          backdropFilter: 'blur(12px)',
                          minWidth: '180px',
                          zIndex: 9999,
                          overflow: 'hidden'
                        }}>
                          {/* Change Role Section */}
                          <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Change Role</div>
                            {['admin', 'agent', 'viewer'].filter(role => role !== member.role).map(role => {
                              const RoleIconComponent = getRoleIcon(role);
                              return (
                                <button
                                  key={role}
                                  onClick={() => handleUpdateRole(member.user_id, role)}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    fontSize: '13px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.15s ease',
                                    marginBottom: '2px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)';
                                    e.currentTarget.style.color = '#00b8d4';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                                  }}
                                >
                                  <RoleIconComponent size={12} />
                                  <span style={{ textTransform: 'capitalize' }}>{role}</span>
                                </button>
                              );
                            })}
                          </div>
                          
                          {/* Remove Member */}
                          <button
                            onClick={() => handleRemoveMember(member.user_id)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '13px',
                              fontWeight: 500,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <Trash2 size={14} />
                            Remove Member
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Team Deals Tab
const TeamDealsTab = ({ teamDeals, statsLoading, navigate }) => {
  // Group deals by owner
  const dealsByOwner = {};
  teamDeals.forEach(deal => {
    const ownerId = deal.owner_id || 'unknown';
    if (!dealsByOwner[ownerId]) {
      const profile = deal.user_profiles || {};
      dealsByOwner[ownerId] = {
        name: profile.full_name || profile.email || 'Team Member',
        avatar_url: profile.avatar_url,
        deals: []
      };
    }
    dealsByOwner[ownerId].deals.push(deal);
  });

  return (
    <div className="glass-surface" style={{ padding: '24px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <h3 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.01em' }}>Team Deals</h3>
      {statsLoading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Loader2 size={32} style={{ color: '#00b8d4' }} className="animate-spin" />
        </div>
      ) : teamDeals.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Target size={40} style={{ color: 'rgba(255, 255, 255, 0.2)', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>No shared team deals yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.entries(dealsByOwner).map(([ownerId, ownerData]) => (
            <div key={ownerId}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(0,184,212,0.3), rgba(0,184,212,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,184,212,0.2)' }}>
                  <User size={16} style={{ color: '#00b8d4' }} />
                </div>
                <div>
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{ownerData.name}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginLeft: '8px' }}>{ownerData.deals.length} deal{ownerData.deals.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                {ownerData.deals.map(deal => (
                  <div key={deal.id} onClick={() => navigate(`/deals/${deal.id}`)} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '16px', cursor: 'pointer', transition: 'border-color 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.3)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: 0 }}>{deal.title || deal.address || 'Untitled Deal'}</h4>
                      <span style={{ padding: '3px 8px', background: 'rgba(0, 184, 212, 0.12)', border: '1px solid rgba(0, 184, 212, 0.25)', borderRadius: '4px', color: '#00b8d4', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{deal.asset_type || 'N/A'}</span>
                    </div>
                    {deal.address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <MapPin size={12} style={{ color: 'rgba(255, 255, 255, 0.35)' }} />
                        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', margin: 0 }}>
                          {deal.address}{deal.city ? `, ${deal.city}` : ''}{deal.state ? `, ${deal.state}` : ''}
                        </p>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <span style={{ color: '#10b981', fontSize: '17px', fontWeight: 700 }}>
                        {deal.asking_price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(deal.asking_price) : 'Price TBD'}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                        {deal.status || 'active'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Performance Tab
const PerformanceTab = ({ agentStats, members, statsLoading }) => {
  const getRoleColor = (role) => { switch(role) { case 'owner': return '#fbbf24'; case 'admin': return '#a78bfa'; case 'agent': return '#00b8d4'; case 'viewer': return '#6b7280'; default: return '#6b7280'; } };
  
  return (
    <div className="glass-surface" style={{ padding: '24px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <h3 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-0.01em' }}>Per-Agent Performance</h3>
      {statsLoading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Loader2 size={32} style={{ color: '#00b8d4' }} className="animate-spin" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {agentStats.map(stat => {
            const member = members.find(m => m.user_id === stat.user_id);
            const roleColor = getRoleColor(member?.role);
            return (
              <div key={stat.user_id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: member?.avatar_url ? `url(${member.avatar_url})` : `linear-gradient(135deg, ${roleColor}40, ${roleColor}20)`, backgroundSize: 'cover', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${roleColor}30` }}>
                    {!member?.avatar_url && <User size={22} style={{ color: roleColor }} />}
                  </div>
                  <div>
                    <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0' }}>{member?.full_name || member?.email?.split('@')[0] || 'Agent'}</h4>
                    <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', margin: 0 }}>{stat.primary_asset_focus || 'Mixed'}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', marginBottom: '4px' }}>Active Deals</p>
                    <p style={{ color: '#00b8d4', fontSize: '20px', fontWeight: 700 }}>{stat.active_deals}</p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', marginBottom: '4px' }}>Closed</p>
                    <p style={{ color: '#22c55e', fontSize: '20px', fontWeight: 700 }}>{stat.closed_this_quarter}</p>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', marginBottom: '4px' }}>Pipeline Value</p>
                    <p style={{ color: '#8b5cf6', fontSize: '18px', fontWeight: 700 }}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(stat.pipeline_value || 0)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Modals (unchanged)
const CreateTeamModal = ({ onClose, onCreate }) => { const [teamName, setTeamName] = useState(''); const [loading, setLoading] = useState(false); const handleSubmit = async (e) => { e.preventDefault(); if (!teamName.trim()) { toast.error('Please enter a team name'); return; } setLoading(true); await onCreate(teamName); setLoading(false); }; return (<div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}><div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', background: 'rgba(10, 10, 10, 0.98)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)' }}><div style={{ marginBottom: '28px' }}><h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.4px' }}>Create a Team</h2><p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>Start collaborating with your colleagues</p></div><form onSubmit={handleSubmit}><div style={{ marginBottom: '24px' }}><label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Team Name</label><input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g., Armando Real Estate Group" autoFocus style={{ width: '100%', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' }} /></div><div style={{ display: 'flex', gap: '10px' }}><button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button><button type="submit" disabled={loading || !teamName.trim()} style={{ flex: 1, padding: '12px', background: (loading || !teamName.trim()) ? 'rgba(0, 184, 212, 0.3)' : '#00b8d4', border: 'none', borderRadius: '8px', color: '#000', fontSize: '14px', fontWeight: 700, cursor: (loading || !teamName.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>{loading && <Loader2 size={15} className="animate-spin" />}Create Team</button></div></form></div></div>); };

const InviteMemberModal = ({ onClose, onInvite }) => {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('agent');
  const [loading, setLoading] = useState(false);

  const roles = [
    { value: 'admin', label: 'Admin', desc: 'Manage team and settings', icon: Shield, color: '#a78bfa' },
    { value: 'agent', label: 'Agent', desc: 'Create and share deals', icon: User, color: '#00b8d4' },
    { value: 'viewer', label: 'Viewer', desc: 'View only', icon: Eye, color: '#6b7280' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Please enter an email'); return; }
    setLoading(true);
    await onInvite(email.trim(), selectedRole);
    setLoading(false);
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', background: 'rgba(10, 10, 10, 0.98)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.4px' }}>Add Team Member</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>Add an existing user to your team by email</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              autoFocus
              required
              style={{ width: '100%', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', display: 'block', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Role</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {roles.map(role => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.value;
                return (
                  <button key={role.value} type="button" onClick={() => setSelectedRole(role.value)} style={{
                    padding: '14px', background: isSelected ? `${role.color}12` : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isSelected ? `${role.color}40` : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: '8px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px'
                  }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: `${role.color}18`, border: `1px solid ${role.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} style={{ color: role.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ color: isSelected ? role.color : '#fff', fontSize: '14px', fontWeight: 600 }}>{role.label}</span>
                        {isSelected && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: role.color }} />}
                      </div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>{role.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading || !email.trim()} style={{
              flex: 1, padding: '12px', background: (loading || !email.trim()) ? 'rgba(0, 184, 212, 0.3)' : '#00b8d4',
              border: 'none', borderRadius: '8px', color: '#000', fontSize: '14px', fontWeight: 700,
              cursor: (loading || !email.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              Add to Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TeamSettingsModal = ({ team, onClose, onUpdate }) => {
  const [teamName, setTeamName] = useState(team?.name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!teamName.trim()) { toast.error('Team name required'); return; }
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(`${BACKEND_URL}/api/teams`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.session?.access_token}` },
        body: JSON.stringify({ name: teamName.trim() })
      });
      if (response.ok) {
        toast.success('Team settings updated');
        onClose();
        await onUpdate();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to update');
      }
    } catch (error) { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', background: 'rgba(10, 10, 10, 0.98)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px', boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.4px' }}>Team Settings</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px' }}>Manage your team</p>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Team Name</label>
          <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' }} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '12px', background: saving ? 'rgba(0, 184, 212, 0.5)' : '#00b8d4', border: 'none', borderRadius: '8px', color: '#000', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default Team;
