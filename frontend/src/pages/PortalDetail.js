import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { API } from '../App';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, Users, Search, Plus, Copy, Check,
  RefreshCw, ShieldOff, ShieldCheck, Loader2, X, UserPlus,
  Eye, Heart, Download, BarChart3, TrendingUp, FileText, UserCog, Trash2
} from 'lucide-react';
import { colors, gradients, borderRadius } from '../styles/designSystem';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const PortalDetail = () => {
  const { portalId } = useParams();
  const navigate = useNavigate();
  const [portal, setPortal] = useState(null);
  const [activeTab, setActiveTab] = useState('deals');
  const [loading, setLoading] = useState(true);

  // Deals tab state
  const [portalDeals, setPortalDeals] = useState([]);
  const [allDeals, setAllDeals] = useState([]);
  const [dealSearch, setDealSearch] = useState('');
  const [dealsLoading, setDealsLoading] = useState(false);

  // Members tab state
  const [members, setMembers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Intelligence state
  const [dealIntel, setDealIntel] = useState(null);
  const [selectedIntelDeal, setSelectedIntelDeal] = useState(null);
  const [investorProfile, setInvestorProfile] = useState(null);
  const [selectedProfileMember, setSelectedProfileMember] = useState(null);
  const [intelLoading, setIntelLoading] = useState(false);

  // Team Access state
  const [collaborators, setCollaborators] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showInviteTeam, setShowInviteTeam] = useState(false);
  const [invitingTeam, setInvitingTeam] = useState(false);
  const [isPortalOwner, setIsPortalOwner] = useState(true);

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token;

  const fetchPortal = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/portals/${portalId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPortal((await res.json()).portal);
    } catch (err) { console.error('Failed to fetch portal:', err); }
    finally { setLoading(false); }
  }, [portalId]);

  const fetchPortalDeals = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/portals/${portalId}/deals`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPortalDeals((await res.json()).deals || []);
    } catch (err) { console.error('Failed to fetch portal deals:', err); }
  }, [portalId]);

  const fetchAllDeals = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/deals`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAllDeals((await res.json()).deals || []);
    } catch (err) { console.error('Failed to fetch deals:', err); }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/portals/${portalId}/members`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setMembers((await res.json()).members || []);
    } catch (err) { console.error('Failed to fetch members:', err); }
  }, [portalId]);

  const fetchCollaborators = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/portals/${portalId}/collaborators`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCollaborators((await res.json()).collaborators || []);
    } catch (err) { console.error('Failed to fetch collaborators:', err); }
  }, [portalId]);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/teams/members`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setTeamMembers((await res.json()).members || []);
    } catch (err) { console.error('Failed to fetch team members:', err); }
  }, []);

  useEffect(() => {
    fetchPortal();
    fetchPortalDeals();
    fetchAllDeals();
    fetchMembers();
    fetchCollaborators();
    fetchTeamMembers();
  }, [fetchPortal, fetchPortalDeals, fetchAllDeals, fetchMembers, fetchCollaborators, fetchTeamMembers]);

  // Determine if current user is the portal owner
  useEffect(() => {
    if (portal) {
      const checkOwner = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setIsPortalOwner(user?.id === portal.broker_id);
      };
      checkOwner();
    }
  }, [portal]);

  const portalDealIds = useMemo(() => new Set(portalDeals.map(d => d.id)), [portalDeals]);

  const filteredDeals = useMemo(() => {
    if (!dealSearch) return allDeals;
    const q = dealSearch.toLowerCase();
    return allDeals.filter(d =>
      d.title?.toLowerCase().includes(q) ||
      d.address?.toLowerCase().includes(q) ||
      d.city?.toLowerCase().includes(q) ||
      d.asset_type?.toLowerCase().includes(q)
    );
  }, [allDeals, dealSearch]);

  const toggleDeal = async (dealId, isInPortal) => {
    setDealsLoading(true);
    try {
      const token = await getToken();
      if (isInPortal) {
        await fetch(`${API}/portals/${portalId}/deals/${dealId}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
        });
        setPortalDeals(prev => prev.filter(d => d.id !== dealId));
      } else {
        await fetch(`${API}/portals/${portalId}/deals`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ deal_ids: [dealId] })
        });
        const deal = allDeals.find(d => d.id === dealId);
        if (deal) setPortalDeals(prev => [...prev, deal]);
      }
    } catch {
      toast.error('Failed to update');
    } finally {
      setDealsLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;
    setAddingMember(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/portals/${portalId}/members`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMemberName.trim(), email: newMemberEmail.trim() || null })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.member.name} invited — code: ${data.member.access_code}`);
        setMembers(prev => [data.member, ...prev]);
        setShowAddMember(false);
        setNewMemberName('');
        setNewMemberEmail('');
      }
    } catch {
      toast.error('Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Access code copied');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRegenerateCode = async (memberId) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/portals/${portalId}/members/${memberId}/regenerate-code`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, access_code: data.access_code, status: 'invited' } : m));
        toast.success(`New code: ${data.access_code}`);
      }
    } catch {
      toast.error('Failed to regenerate code');
    }
  };

  const handleRevoke = async (memberId) => {
    try {
      const token = await getToken();
      await fetch(`${API}/portals/${portalId}/members/${memberId}/revoke`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'revoked' } : m));
      toast.success('Access revoked');
    } catch {
      toast.error('Failed to revoke');
    }
  };

  const handleRestore = async (memberId) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/portals/${portalId}/members/${memberId}/restore`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: 'invited', access_code: data.access_code } : m));
        toast.success(`Access restored — new code: ${data.access_code}`);
      }
    } catch {
      toast.error('Failed to restore');
    }
  };

  const statusColor = (status) => {
    if (status === 'active') return '#10b981';
    if (status === 'revoked') return '#ef4444';
    return '#f59e0b';
  };

  const handleInviteTeamMember = async (userId) => {
    setInvitingTeam(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/portals/${portalId}/collaborators`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role: 'manager' })
      });
      if (res.ok) {
        toast.success('Team member invited');
        fetchCollaborators();
        setShowInviteTeam(false);
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to invite');
      }
    } catch {
      toast.error('Failed to invite team member');
    } finally {
      setInvitingTeam(false);
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/portals/${portalId}/collaborators/${userId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCollaborators(prev => prev.filter(c => c.user_id !== userId));
        toast.success('Access removed');
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Failed to remove');
      }
    } catch {
      toast.error('Failed to remove team member');
    }
  };

  // Team members not already collaborators or the portal owner
  const availableTeamMembers = teamMembers.filter(tm => {
    const collabIds = new Set(collaborators.map(c => c.user_id));
    return !collabIds.has(tm.user_id) && tm.user_id !== portal?.broker_id;
  });

  const fetchDealIntelligence = async (dealId) => {
    setIntelLoading(true);
    setSelectedIntelDeal(dealId);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/portals/${portalId}/deals/${dealId}/intelligence`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDealIntel((await res.json()));
    } catch { toast.error('Failed to load intelligence'); }
    finally { setIntelLoading(false); }
  };

  const fetchInvestorProfile = async (memberId) => {
    setIntelLoading(true);
    setSelectedProfileMember(memberId);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/portals/members/${memberId}/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setInvestorProfile((await res.json()));
    } catch { toast.error('Failed to load profile'); }
    finally { setIntelLoading(false); }
  };

  const formatCurrency = (v) => {
    if (!v) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Loader2 size={32} style={{ color: colors.primary }} className="animate-spin" />
      </div>
    );
  }

  if (!portal) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: colors.textTertiary }}>
        Portal not found. <button onClick={() => navigate('/portals')} style={{ color: colors.primary, background: 'none', border: 'none', cursor: 'pointer' }}>Go back</button>
      </div>
    );
  }

  const portalUrl = `${window.location.origin}/portal/${portalId}`;

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          data-testid="back-to-portals"
          onClick={() => navigate('/portals')}
          style={{ background: 'transparent', border: 'none', color: colors.textTertiary, cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
          onMouseEnter={e => e.currentTarget.style.color = colors.primary}
          onMouseLeave={e => e.currentTarget.style.color = colors.textTertiary}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: colors.textPrimary, fontSize: '22px', fontWeight: 700 }}>{portal.name}</h1>
          <p style={{ color: colors.textTertiary, fontSize: '13px', marginTop: '2px' }}>
            {portalDeals.length} deal{portalDeals.length !== 1 ? 's' : ''} &middot; {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{
          padding: '6px 12px', background: colors.surfaceElevated, borderRadius: '6px',
          border: `1px solid ${colors.border}`, fontSize: '12px', color: colors.textTertiary
        }}>
          {portalUrl}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: `1px solid ${colors.border}` }}>
        {['deals', 'members', 'team'].map(tab => (
          <button
            key={tab}
            data-testid={`tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', background: 'transparent', border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? colors.primary : 'transparent'}`,
              color: activeTab === tab ? colors.primary : colors.textTertiary,
              fontSize: '14px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize'
            }}
          >
            {tab === 'deals' && <Building2 size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />}
            {tab === 'members' && <Users size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />}
            {tab === 'team' && <UserCog size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />}
            {tab === 'team' ? 'Team Access' : tab}
          </button>
        ))}
      </div>

      {/* Deals Tab */}
      {activeTab === 'deals' && (
        <div>
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.textTertiary }} />
            <Input
              data-testid="deal-search"
              value={dealSearch}
              onChange={e => setDealSearch(e.target.value)}
              placeholder="Search your deals..."
              style={{ paddingLeft: '38px', background: colors.surfaceElevated, border: `1px solid ${colors.border}` }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredDeals.map(deal => {
              const isIn = portalDealIds.has(deal.id);
              return (
                <div
                  key={deal.id}
                  data-testid={`deal-row-${deal.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', background: colors.surfaceCard, borderRadius: borderRadius.sm,
                    border: `1px solid ${isIn ? 'rgba(212,18,18,0.25)' : colors.border}`,
                    transition: 'border-color 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                      background: isIn ? 'rgba(212,18,18,0.15)' : 'rgba(255,255,255,0.05)',
                      color: isIn ? colors.primary : colors.textTertiary, flexShrink: 0
                    }}>
                      {deal.asset_type || 'N/A'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.title}
                      </div>
                      <div style={{ color: colors.textTertiary, fontSize: '12px' }}>
                        {deal.city && deal.state ? `${deal.city}, ${deal.state}` : deal.address || ''}
                        {deal.asking_price ? ` — ${formatCurrency(deal.asking_price)}` : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {isIn && (
                      <button
                        data-testid={`intel-deal-${deal.id}`}
                        onClick={() => fetchDealIntelligence(deal.id)}
                        title="View engagement"
                        style={{
                          padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                          cursor: 'pointer', border: 'none',
                          background: 'rgba(139,92,246,0.12)', color: '#a78bfa',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <BarChart3 size={13} /> Intel
                      </button>
                    )}
                    <button
                      data-testid={`toggle-deal-${deal.id}`}
                      onClick={() => toggleDeal(deal.id, isIn)}
                      disabled={dealsLoading}
                      style={{
                        padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                        cursor: dealsLoading ? 'wait' : 'pointer', border: 'none',
                        background: isIn ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 0, 0, 0.12)',
                        color: isIn ? '#ef4444' : colors.primary
                      }}
                    >
                      {isIn ? 'Remove' : 'Add'}
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredDeals.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: colors.textTertiary, fontSize: '14px' }}>
                {dealSearch ? 'No deals match your search' : 'No deals in your CRM yet'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ color: colors.textTertiary, fontSize: '13px' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
            <Button
              data-testid="add-member-btn"
              onClick={() => setShowAddMember(true)}
              size="sm"
              style={{ background: gradients.primaryButton, border: 'none' }}
            >
              <UserPlus size={14} style={{ marginRight: '6px' }} /> Add Member
            </Button>
          </div>

          {/* Member table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto',
            padding: '10px 16px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.5px', color: colors.textMuted, borderBottom: `1px solid ${colors.border}`
          }}>
            <span>Name</span>
            <span>Email</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {members.map(member => (
            <div
              key={member.id}
              data-testid={`member-row-${member.id}`}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto',
                padding: '14px 16px', alignItems: 'center',
                borderBottom: `1px solid ${colors.divider}`
              }}
            >
              <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 500 }}>{member.name}</span>
              <span style={{ color: colors.textTertiary, fontSize: '13px' }}>{member.email || '—'}</span>
              <div>
                <span style={{
                  padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.3px',
                  background: `${statusColor(member.status)}18`,
                  color: statusColor(member.status)
                }}>
                  {member.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button
                  data-testid={`profile-${member.id}`}
                  onClick={() => fetchInvestorProfile(member.id)}
                  title="View investor profile"
                  style={{
                    padding: '5px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                    color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Eye size={12} /> Profile
                </button>
                {member.status !== 'revoked' && (
                  <button
                    data-testid={`copy-code-${member.id}`}
                    onClick={() => handleCopyCode(member.access_code)}
                    title={`Code: ${member.access_code}`}
                    style={{
                      padding: '5px 10px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                      background: 'rgba(212,18,18,0.1)', border: '1px solid rgba(212,18,18,0.2)',
                      color: colors.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    {copiedCode === member.access_code ? <Check size={12} /> : <Copy size={12} />}
                    {member.access_code}
                  </button>
                )}
                <button
                  data-testid={`regenerate-${member.id}`}
                  onClick={() => handleRegenerateCode(member.id)}
                  title="Generate new code"
                  style={{
                    padding: '5px 8px', borderRadius: '5px', background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${colors.border}`, color: colors.textTertiary, cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={13} />
                </button>
                {member.status === 'revoked' ? (
                  <button
                    data-testid={`restore-${member.id}`}
                    onClick={() => handleRestore(member.id)}
                    title="Restore access"
                    style={{
                      padding: '5px 8px', borderRadius: '5px', background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', cursor: 'pointer'
                    }}
                  >
                    <ShieldCheck size={13} />
                  </button>
                ) : (
                  <button
                    data-testid={`revoke-${member.id}`}
                    onClick={() => handleRevoke(member.id)}
                    title="Revoke access"
                    style={{
                      padding: '5px 8px', borderRadius: '5px', background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer'
                    }}
                  >
                    <ShieldOff size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {members.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: colors.textTertiary, fontSize: '14px' }}>
              No members yet. Add an investor to get started.
            </div>
          )}
        </div>
      )}

      {/* Team Access Tab */}
      {activeTab === 'team' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ color: colors.textTertiary, fontSize: '13px' }}>
              {collaborators.length} team member{collaborators.length !== 1 ? 's' : ''} with access
            </span>
            {isPortalOwner && (
              <Button
                data-testid="invite-team-btn"
                onClick={() => setShowInviteTeam(true)}
                size="sm"
                style={{ background: gradients.primaryButton, border: 'none' }}
              >
                <UserPlus size={14} style={{ marginRight: '6px' }} /> Invite Team Member
              </Button>
            )}
          </div>

          {/* Collaborator table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto',
            padding: '10px 16px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.5px', color: colors.textMuted, borderBottom: `1px solid ${colors.border}`
          }}>
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span style={{ textAlign: 'right' }}>Actions</span>
          </div>

          {collaborators.map(collab => (
            <div
              key={collab.id}
              data-testid={`collaborator-row-${collab.user_id}`}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto',
                padding: '14px 16px', alignItems: 'center',
                borderBottom: `1px solid ${colors.divider}`,
                transition: 'background 150ms ease'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(255, 0, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: colors.primary, fontSize: '13px', fontWeight: 700
                }}>
                  {(collab.full_name || '?')[0].toUpperCase()}
                </div>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{collab.full_name || 'Unknown'}</span>
              </div>
              <span style={{ color: colors.textTertiary, fontSize: '13px' }}>{collab.email || '—'}</span>
              <span style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)',
                textTransform: 'capitalize', width: 'fit-content'
              }}>
                {collab.role}
              </span>
              {isPortalOwner && (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button
                    data-testid={`remove-collaborator-${collab.user_id}`}
                    onClick={() => handleRemoveCollaborator(collab.user_id)}
                    title="Remove access"
                    style={{
                      padding: '5px 8px', borderRadius: '5px', background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {collaborators.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: colors.textTertiary, fontSize: '14px' }}>
              No team members have been granted access yet.
              {isPortalOwner && ' Click "Invite Team Member" to share this portal with your team.'}
            </div>
          )}
        </div>
      )}

      {/* Invite Team Member Dialog */}
      <Dialog open={showInviteTeam} onOpenChange={setShowInviteTeam}>
        <DialogContent style={{ background: colors.surfaceElevated, border: `1px solid ${colors.border}`, maxWidth: '440px' }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#fff' }}>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div style={{ marginTop: '12px' }}>
            <p style={{ color: colors.textTertiary, fontSize: '13px', marginBottom: '16px' }}>
              Select a team member to give them access to manage this portal's deals and members.
            </p>
            {availableTeamMembers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: colors.textMuted, fontSize: '13px' }}>
                All team members already have access, or no team members found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                {availableTeamMembers.map(tm => (
                  <button
                    key={tm.user_id}
                    data-testid={`invite-team-${tm.user_id}`}
                    disabled={invitingTeam}
                    onClick={() => handleInviteTeamMember(tm.user_id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`,
                      color: '#fff', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 150ms ease', width: '100%'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,0,0,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,0,0,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = colors.border; }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'rgba(255,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: colors.primary, fontSize: '14px', fontWeight: 700, flexShrink: 0
                    }}>
                      {(tm.full_name || tm.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{tm.full_name || 'No name'}</div>
                      <div style={{ color: colors.textTertiary, fontSize: '12px' }}>{tm.email || ''} · {tm.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Deal Intelligence Panel */}
      {selectedIntelDeal && dealIntel && (
        <div style={{
          position: 'fixed', top: 0, right: 0, width: '420px', height: '100vh',
          background: 'rgba(8,8,8,0.98)', borderLeft: `1px solid ${colors.border}`,
          backdropFilter: 'blur(16px)', zIndex: 50, overflowY: 'auto',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)'
        }}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} style={{ color: '#a78bfa' }} /> Deal Engagement
              </h3>
              <button data-testid="close-intel-panel" onClick={() => { setSelectedIntelDeal(null); setDealIntel(null); }}
                style={{ background: 'transparent', border: 'none', color: colors.textTertiary, cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              <div style={{ padding: '14px 12px', borderRadius: '8px', background: 'rgba(212,18,18,0.08)', border: '1px solid rgba(212,18,18,0.15)', textAlign: 'center' }}>
                <div style={{ color: colors.primary, fontSize: '22px', fontWeight: 800 }}>{dealIntel.total_views}</div>
                <div style={{ color: colors.textMuted, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Views</div>
              </div>
              <div style={{ padding: '14px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', textAlign: 'center' }}>
                <div style={{ color: '#ef4444', fontSize: '22px', fontWeight: 800 }}>{dealIntel.total_saves}</div>
                <div style={{ color: colors.textMuted, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Saves</div>
              </div>
              <div style={{ padding: '14px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', textAlign: 'center' }}>
                <div style={{ color: '#10b981', fontSize: '22px', fontWeight: 800 }}>{dealIntel.total_downloads}</div>
                <div style={{ color: colors.textMuted, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Downloads</div>
              </div>
            </div>

            {/* Ranked investor list */}
            <div style={{ fontSize: '11px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
              Investor Engagement Ranking
            </div>
            {dealIntel.investors.map((inv, idx) => (
              <div key={inv.member_id} data-testid={`intel-investor-${inv.member_id}`} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                borderRadius: '8px', marginBottom: '6px',
                background: inv.engagement_score > 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                border: `1px solid ${inv.engagement_score > 0 ? colors.border : 'transparent'}`
              }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: inv.engagement_score > 0 ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, color: inv.engagement_score > 0 ? '#a78bfa' : colors.textMuted
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{inv.name}</div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '3px' }}>
                    <span style={{ color: colors.textMuted, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Eye size={10} /> {inv.view_count}
                    </span>
                    {inv.is_saved && <span style={{ color: '#ef4444', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Heart size={10} fill="#ef4444" /> Saved
                    </span>}
                    {inv.download_count > 0 && <span style={{ color: '#10b981', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Download size={10} /> {inv.download_count}
                    </span>}
                  </div>
                </div>
                <div style={{
                  padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                  background: inv.engagement_score > 5 ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.05)',
                  color: inv.engagement_score > 5 ? '#a78bfa' : colors.textMuted
                }}>
                  {inv.engagement_score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Investor Profile Panel */}
      {selectedProfileMember && investorProfile && (
        <div style={{
          position: 'fixed', top: 0, right: 0, width: '420px', height: '100vh',
          background: 'rgba(8,8,8,0.98)', borderLeft: `1px solid ${colors.border}`,
          backdropFilter: 'blur(16px)', zIndex: 50, overflowY: 'auto',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)'
        }}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: '#a78bfa' }} /> Investor Profile
              </h3>
              <button data-testid="close-profile-panel" onClick={() => { setSelectedProfileMember(null); setInvestorProfile(null); }}
                style={{ background: 'transparent', border: 'none', color: colors.textTertiary, cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Investor info */}
            <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
              <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{investorProfile.member.name}</div>
              {investorProfile.member.email && <div style={{ color: colors.textTertiary, fontSize: '13px', marginBottom: '8px' }}>{investorProfile.member.email}</div>}
              <span style={{
                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                background: `${statusColor(investorProfile.member.status)}18`,
                color: statusColor(investorProfile.member.status)
              }}>
                {investorProfile.member.status}
              </span>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(212,18,18,0.08)', border: '1px solid rgba(212,18,18,0.15)' }}>
                <div style={{ color: colors.primary, fontSize: '20px', fontWeight: 800 }}>{investorProfile.summary.total_views}</div>
                <div style={{ color: colors.textMuted, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Total Views</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                <div style={{ color: '#a78bfa', fontSize: '20px', fontWeight: 800 }}>{investorProfile.summary.total_deals_viewed}</div>
                <div style={{ color: colors.textMuted, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Deals Viewed</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div style={{ color: '#ef4444', fontSize: '20px', fontWeight: 800 }}>{investorProfile.summary.total_deals_saved}</div>
                <div style={{ color: colors.textMuted, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Deals Saved</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <div style={{ color: '#10b981', fontSize: '20px', fontWeight: 800 }}>{investorProfile.summary.total_downloads}</div>
                <div style={{ color: colors.textMuted, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Downloads</div>
              </div>
            </div>

            {/* Portals */}
            {investorProfile.portals.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  Portals ({investorProfile.portals.length})
                </div>
                {investorProfile.portals.map(p => (
                  <div key={p.portal_id} style={{
                    padding: '10px 12px', borderRadius: '6px', marginBottom: '4px',
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <span style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>{p.portal_name}</span>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', background: `${statusColor(p.status)}18`, color: statusColor(p.status) }}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Deals viewed */}
            {investorProfile.deals_viewed.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  Deals Viewed
                </div>
                {investorProfile.deals_viewed.map(d => (
                  <div key={d.deal_id} style={{
                    padding: '10px 12px', borderRadius: '6px', marginBottom: '4px',
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>{d.title}</div>
                      <div style={{ color: colors.textMuted, fontSize: '11px' }}>{d.asset_type}{d.location ? ` · ${d.location}` : ''}</div>
                    </div>
                    <span style={{ color: colors.primary, fontSize: '13px', fontWeight: 700 }}>{d.view_count}x</span>
                  </div>
                ))}
              </div>
            )}

            {/* Deals saved */}
            {investorProfile.deals_saved.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  Deals Saved
                </div>
                {investorProfile.deals_saved.map(d => (
                  <div key={d.deal_id} style={{
                    padding: '10px 12px', borderRadius: '6px', marginBottom: '4px',
                    background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <Heart size={12} fill="#ef4444" style={{ color: '#ef4444', flexShrink: 0 }} />
                    <div>
                      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>{d.title}</div>
                      <div style={{ color: colors.textMuted, fontSize: '11px' }}>{d.asset_type}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Downloads */}
            {investorProfile.documents_downloaded.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  Documents Downloaded ({investorProfile.documents_downloaded.length})
                </div>
                {investorProfile.documents_downloaded.map((doc, i) => (
                  <div key={doc.document_id || `doc-${i}`} style={{
                    padding: '8px 12px', borderRadius: '6px', marginBottom: '4px',
                    background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`,
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}>
                    <FileText size={12} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span style={{ color: colors.textTertiary, fontSize: '12px' }}>
                      {new Date(doc.downloaded_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent style={{ background: colors.surfaceCard, border: `1px solid ${colors.border}`, maxWidth: '420px' }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.textPrimary }}>Add Investor</DialogTitle>
          </DialogHeader>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ color: colors.textTertiary, fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Name *</label>
              <Input
                data-testid="member-name-input"
                value={newMemberName}
                onChange={e => setNewMemberName(e.target.value)}
                placeholder="Investor name"
                autoFocus
                style={{ background: colors.surfaceElevated }}
              />
            </div>
            <div>
              <label style={{ color: colors.textTertiary, fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Email (optional)</label>
              <Input
                data-testid="member-email-input"
                value={newMemberEmail}
                onChange={e => setNewMemberEmail(e.target.value)}
                placeholder="investor@company.com"
                style={{ background: colors.surfaceElevated }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <Button variant="outline" onClick={() => setShowAddMember(false)} style={{ flex: 1, borderColor: colors.border, color: colors.textSecondary }}>
                Cancel
              </Button>
              <Button
                data-testid="confirm-add-member"
                onClick={handleAddMember}
                disabled={addingMember || !newMemberName.trim()}
                style={{ flex: 1, background: gradients.primaryButton, border: 'none', opacity: (!newMemberName.trim() || addingMember) ? 0.5 : 1 }}
              >
                {addingMember ? 'Adding...' : 'Add & Get Code'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalDetail;
