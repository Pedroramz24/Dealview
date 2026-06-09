import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, KeyRound, Building2, Users, Loader2, Trash2, MoreVertical } from 'lucide-react';
import { colors, gradients, borderRadius } from '../styles/designSystem';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const Portals = () => {
  const navigate = useNavigate();
  const [portals, setPortals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchPortals(); }, []);

  const fetchPortals = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API}/portals`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPortals(data.portals || []);
      }
    } catch (err) {
      toast.error('Failed to load portals');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API}/portals`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Portal created');
        setShowCreate(false);
        setNewName('');
        navigate(`/portals/${data.portal.id}`);
      }
    } catch (err) {
      toast.error('Failed to create portal');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, portalId, portalName) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${portalName}"? This removes all members and their access.`)) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API}/portals/${portalId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Portal deleted');
        setPortals(prev => prev.filter(p => p.id !== portalId));
      }
    } catch (err) {
      toast.error('Failed to delete portal');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Loader2 size={32} style={{ color: colors.primary }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
            Investor Portals
          </h1>
          <p style={{ color: colors.textTertiary, fontSize: '14px' }}>
            Private deal rooms for your investor clients
          </p>
        </div>
        <Button
          data-testid="create-portal-btn"
          onClick={() => setShowCreate(true)}
          style={{ background: gradients.primaryButton, border: 'none' }}
        >
          <Plus size={18} style={{ marginRight: '8px' }} />
          New Portal
        </Button>
      </div>

      {portals.length === 0 ? (
        <div style={{
          background: colors.surfaceCard,
          borderRadius: borderRadius.lg,
          padding: '64px 32px',
          textAlign: 'center',
          border: `1px solid ${colors.border}`
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(255, 0, 0, 0.1)', border: '1px solid rgba(255, 0, 0, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <KeyRound size={28} style={{ color: colors.primary }} />
          </div>
          <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            No portals yet
          </h3>
          <p style={{ color: colors.textTertiary, fontSize: '14px', marginBottom: '24px' }}>
            Create your first investor portal to share deals privately
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            style={{ background: gradients.primaryButton, border: 'none' }}
          >
            <Plus size={18} style={{ marginRight: '8px' }} />
            Create Portal
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {portals.map(portal => (
            <div
              key={portal.id}
              data-testid={`portal-card-${portal.id}`}
              onClick={() => navigate(`/portals/${portal.id}`)}
              style={{
                background: colors.surfaceCard,
                borderRadius: borderRadius.md,
                padding: '20px 24px',
                border: `1px solid ${colors.border}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'border-color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,18,18,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  background: 'rgba(255, 0, 0, 0.1)', border: '1px solid rgba(255, 0, 0, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <KeyRound size={20} style={{ color: colors.primary }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 600 }}>
                      {portal.name}
                    </h3>
                    {portal.is_collaborator && (
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                        background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)',
                        textTransform: 'uppercase', letterSpacing: '0.5px'
                      }}>
                        Shared
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                    <span style={{ color: colors.textTertiary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building2 size={12} /> {portal.deal_count} deal{portal.deal_count !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: colors.textTertiary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} /> {portal.member_count} member{portal.member_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              <button
                data-testid={`delete-portal-${portal.id}`}
                onClick={(e) => handleDelete(e, portal.id, portal.name)}
                style={{
                  background: 'transparent', border: 'none', padding: '8px', cursor: 'pointer',
                  color: colors.textTertiary, borderRadius: '6px'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = colors.textTertiary}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent style={{ background: colors.surfaceCard, border: `1px solid ${colors.border}`, maxWidth: '420px' }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.textPrimary }}>Create Portal</DialogTitle>
          </DialogHeader>
          <div style={{ marginTop: '16px' }}>
            <Input
              data-testid="portal-name-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. San Antonio Investors"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
              style={{ background: colors.surfaceElevated, marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="outline" onClick={() => setShowCreate(false)} style={{ flex: 1, borderColor: colors.border, color: colors.textSecondary }}>
                Cancel
              </Button>
              <Button
                data-testid="confirm-create-portal"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                style={{ flex: 1, background: gradients.primaryButton, border: 'none', opacity: (!newName.trim() || creating) ? 0.5 : 1 }}
              >
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Portals;
