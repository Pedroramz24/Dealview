import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Search, Plus, X, Building2, MapPin, DollarSign,
  ChevronDown, ChevronLeft, ChevronRight, Trash2, Eye, Edit, Settings, Palette,
  Phone, User, Users
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { colors, gradients, borderRadius, shadows } from '../styles/designSystem';
import PropertyIntelligencePanel from '../components/PropertyIntelligencePanel';

// Asset type colors
const assetTypeColors = {
  'Office': '#3b82f6',
  'Retail': '#10b981',
  'Industrial': '#f59e0b',
  'Multifamily': '#8b5cf6',
  'Land': '#ec4899',
  'Mixed Use': '#06b6d4',
  'Hotels': '#a855f7',
  'Medical': '#14b8a6',
  'Gas Stations': '#e879f9',
  'Other': '#6b7280'
};

const assetTypes = ['Office', 'Retail', 'Industrial', 'Multifamily', 'Land', 'Mixed Use', 'Hotels', 'Medical', 'Gas Stations', 'Other'];

// Stage color options
const stageColorOptions = [
  '#94a3b8', '#60a5fa', '#3b82f6', '#a78bfa', 
  '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b',
  '#f97316', '#10b981', '#22c55e', '#84cc16',
  '#00d4aa', '#14b8a6', '#ef4444', '#ff0000',
  '#e879f9', '#fbbf24'
];

// Deal Card Component with stage move arrows
const DealCard = ({ deal, onView, onOpenPanel, onDelete, onMoveLeft, onMoveRight, canMoveLeft, canMoveRight, onToggleVisibility }) => {
  const formatCurrency = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="deal-card">
      <div style={{
        background: colors.surfaceCard,
        borderRadius: borderRadius.md,
        padding: '12px',
        border: '1px solid rgba(255,255,255,0.04)',
        transition: 'all 0.2s',
        cursor: 'pointer'
      }}
      onClick={() => onOpenPanel(deal)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,0,0,0.2)';
        e.currentTarget.style.boxShadow = shadows.glow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: `${assetTypeColors[deal.asset_type] || assetTypeColors['Other']}20`,
              border: `1px solid ${assetTypeColors[deal.asset_type] || assetTypeColors['Other']}40`
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: assetTypeColors[deal.asset_type] || assetTypeColors['Other']
              }} />
              <span style={{ 
                fontSize: '11px', 
                color: assetTypeColors[deal.asset_type] || assetTypeColors['Other'],
                fontWeight: '500'
              }}>
                {deal.asset_type || 'Other'}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onView(deal); }}
              title="Open full details"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: colors.textTertiary,
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
              onMouseLeave={(e) => e.currentTarget.style.color = colors.textTertiary}
            >
              <Eye size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(deal); }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: colors.textTertiary,
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = colors.textTertiary}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div 
          style={{ 
            color: colors.textPrimary, 
            fontWeight: '600', 
            fontSize: '14px',
            marginBottom: '4px',
            cursor: 'pointer'
          }}
        >
          {deal.title}
        </div>

        {deal.address && (
          <div style={{ 
            color: colors.textTertiary, 
            fontSize: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            marginBottom: '8px'
          }}>
            <MapPin size={10} />
            {deal.city ? `${deal.city}, ${deal.state}` : deal.address}
          </div>
        )}

        {deal.asking_price && (
          <div style={{ 
            color: colors.primary, 
            fontWeight: '600', 
            fontSize: '15px'
          }}>
            {formatCurrency(deal.asking_price)}
          </div>
        )}

        {/* Visibility toggle */}
        <div style={{
          marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button
            data-testid={`visibility-toggle-${deal.id}`}
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(deal); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '3px 0', fontSize: '11px', fontWeight: 500,
              color: deal.team_id ? '#10b981' : colors.textTertiary,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Users size={11} />
            <span>{deal.team_id ? 'Shared' : 'Private'}</span>
          </button>
        </div>

        {deal._contact && (
          <div style={{ 
            marginTop: '8px', 
            paddingTop: '8px', 
            borderTop: `1px solid ${colors.divider}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
          }}>
            <div style={{ color: colors.textSecondary, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <User size={10} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal._contact.name}</span>
            </div>
            {deal._contact.phone && (
              <div style={{ color: colors.textTertiary, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Phone size={10} style={{ flexShrink: 0 }} />
                {deal._contact.phone}
              </div>
            )}
          </div>
        )}

        {/* Stage move arrows */}
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: '10px', paddingTop: '8px', borderTop: `1px solid ${colors.divider}`
        }}>
          <button
            data-testid={`move-left-${deal.id}`}
            onClick={(e) => { e.stopPropagation(); onMoveLeft(deal); }}
            disabled={!canMoveLeft}
            style={{
              background: canMoveLeft ? 'rgba(255,255,255,0.04)' : 'transparent',
              border: `1px solid ${canMoveLeft ? colors.border : 'transparent'}`,
              borderRadius: '4px',
              padding: '3px 8px',
              cursor: canMoveLeft ? 'pointer' : 'default',
              color: canMoveLeft ? colors.textTertiary : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', gap: '3px',
              fontSize: '10px', fontWeight: 600,
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => { if (canMoveLeft) { e.currentTarget.style.color = colors.primary; e.currentTarget.style.borderColor = colors.primary; }}}
            onMouseLeave={(e) => { if (canMoveLeft) { e.currentTarget.style.color = colors.textTertiary; e.currentTarget.style.borderColor = colors.border; }}}
          >
            <ChevronLeft size={12} />
          </button>
          <span style={{ fontSize: '10px', color: colors.textMuted }}>Move Stage</span>
          <button
            data-testid={`move-right-${deal.id}`}
            onClick={(e) => { e.stopPropagation(); onMoveRight(deal); }}
            disabled={!canMoveRight}
            style={{
              background: canMoveRight ? 'rgba(255,255,255,0.04)' : 'transparent',
              border: `1px solid ${canMoveRight ? colors.border : 'transparent'}`,
              borderRadius: '4px',
              padding: '3px 8px',
              cursor: canMoveRight ? 'pointer' : 'default',
              color: canMoveRight ? colors.textTertiary : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', gap: '3px',
              fontSize: '10px', fontWeight: 600,
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => { if (canMoveRight) { e.currentTarget.style.color = colors.primary; e.currentTarget.style.borderColor = colors.primary; }}}
            onMouseLeave={(e) => { if (canMoveRight) { e.currentTarget.style.color = colors.textTertiary; e.currentTarget.style.borderColor = colors.border; }}}
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Stage Column Component
const StageColumn = ({ stage, stageIndex, totalStages, deals, onDealView, onDealOpenPanel, onDealDelete, onAddDeal, onEditStage, onMoveDeal, onToggleVisibility }) => {
  const stageDeals = deals.filter(d => d.pipeline_stage_id === stage.id);
  const totalValue = stageDeals.reduce((sum, d) => sum + (d.asking_price || 0), 0);

  const formatCurrency = (value) => {
    if (!value) return '$0';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div style={{
      flex: 1,
      minWidth: '250px',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }}>
      <div style={{
        padding: '12px',
        borderRadius: `${borderRadius.md} ${borderRadius.md} 0 0`,
        background: colors.surfaceElevated,
        borderBottom: `3px solid ${stage.color || colors.primary}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              color: colors.textPrimary, 
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {stage.name}
            </span>
            <span style={{
              background: stage.color || colors.primary,
              color: '#fff',
              fontSize: '11px',
              fontWeight: '600',
              padding: '2px 6px',
              borderRadius: '10px',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {stageDeals.length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: colors.textTertiary, fontSize: '12px' }}>
              {formatCurrency(totalValue)}
            </span>
            <button
              onClick={() => onEditStage(stage)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: colors.textTertiary,
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
              onMouseLeave={(e) => e.currentTarget.style.color = colors.textTertiary}
            >
              <Edit size={12} />
            </button>
          </div>
        </div>
      </div>

      <div style={{
        flex: 1,
        background: 'rgba(255,255,255,0.015)',
        padding: '8px 6px',
        overflowY: 'auto',
        minHeight: 0,
        borderRadius: `0 0 ${borderRadius.md} ${borderRadius.md}`,
        border: '1px solid rgba(255,255,255,0.03)',
        borderTop: 'none'
      }}>
        {stageDeals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            onView={onDealView}
            onOpenPanel={onDealOpenPanel}
            onDelete={onDealDelete}
            onMoveLeft={(d) => onMoveDeal(d, -1)}
            onMoveRight={(d) => onMoveDeal(d, 1)}
            canMoveLeft={stageIndex > 0}
            canMoveRight={stageIndex < totalStages - 1}
            onToggleVisibility={onToggleVisibility}
          />
        ))}

        <button
          onClick={() => onAddDeal(stage.id)}
          style={{
            width: '100%',
            padding: '10px',
            background: 'transparent',
            border: `1px dashed ${colors.border}`,
            borderRadius: borderRadius.sm,
            color: colors.textTertiary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '13px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.primary;
            e.currentTarget.style.color = colors.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.border;
            e.currentTarget.style.color = colors.textTertiary;
          }}
        >
          <Plus size={14} />
          Add Deal
        </button>
      </div>
    </div>
  );
};

const Pipeline = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Deal modals
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [newDeal, setNewDeal] = useState({
    title: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    asset_type: 'Office',
    asking_price: ''
  });
  const [creatingDeal, setCreatingDeal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, deal: null });

  // Stage management
  const [showStageManager, setShowStageManager] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [stageForm, setStageForm] = useState({ name: '', color: '#94a3b8' });
  const [savingStage, setSavingStage] = useState(false);

  // Pipeline Manager
  const [showPipelineManager, setShowPipelineManager] = useState(false);
  const [pipelineEditName, setPipelineEditName] = useState('');
  const [savingPipeline, setSavingPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');

  // Side panel for deal details
  const [panelDeal, setPanelDeal] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const fetchPipelines = useCallback(async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${API}/pipelines`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const pipelineData = data.pipelines || [];
        setPipelines(pipelineData);
        
        const defaultPipeline = pipelineData.find(p => p.is_default) || pipelineData[0];
        if (defaultPipeline) {
          setSelectedPipeline(defaultPipeline);
          setStages(defaultPipeline.stages || []);
        }
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeals = useCallback(async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${API}/deals?pipeline_id=${selectedPipeline.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const dealsWithContacts = (data.deals || []).map(deal => {
          const links = deal.contact_deal_links || [];
          const firstContact = links[0]?.contacts;
          return {
            ...deal,
            contact_deal_links: undefined,
            _contact: firstContact ? {
              name: firstContact.name || firstContact.company || firstContact.email || 'Unknown',
              phone: firstContact.phone
            } : null
          };
        });
        setDeals(dealsWithContacts);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    }
  }, [selectedPipeline]);

  useEffect(() => {
    if (user) {
      fetchPipelines();
    } else {
      setLoading(false);
    }
  }, [user, fetchPipelines]);

  useEffect(() => {
    if (selectedPipeline) {
      fetchDeals();
    }
  }, [selectedPipeline, fetchDeals]);

  const filteredDeals = useMemo(() => {
    if (!searchTerm) return deals;
    const term = searchTerm.toLowerCase();
    return deals.filter(d => 
      d.title?.toLowerCase().includes(term) ||
      d.address?.toLowerCase().includes(term) ||
      d.city?.toLowerCase().includes(term)
    );
  }, [deals, searchTerm]);

  const handleMoveDeal = async (deal, direction) => {
    const currentIdx = stages.findIndex(s => s.id === deal.pipeline_stage_id);
    const targetIdx = currentIdx + direction;
    if (targetIdx < 0 || targetIdx >= stages.length) return;
    
    const newStageId = stages[targetIdx].id;
    const newStageName = stages[targetIdx].name;
    
    // Optimistic update
    setDeals(prev => prev.map(d => 
      d.id === deal.id ? { ...d, pipeline_stage_id: newStageId } : d
    ));

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await fetch(`${API}/deals/${deal.id}/stage`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pipeline_stage_id: newStageId })
      });
      toast.success(`Moved to ${newStageName}`);
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Failed to move deal');
      fetchDeals();
    }
  };

  const handleCreateDeal = async () => {
    if (!newDeal.title.trim()) {
      toast.error('Please enter a deal title');
      return;
    }

    setCreatingDeal(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      const response = await fetch(`${API}/deals`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newDeal,
          asking_price: newDeal.asking_price ? parseFloat(newDeal.asking_price.replace(/,/g, '')) : null,
          pipeline_id: selectedPipeline.id,
          pipeline_stage_id: selectedStageId || stages[0]?.id
        })
      });
      
      if (response.ok) {
        toast.success('Deal created');
        setShowCreateDeal(false);
        setNewDeal({
          title: '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          asset_type: 'Office',
          asking_price: ''
        });
        fetchDeals();
      } else {
        toast.error('Failed to create deal');
      }
    } catch (error) {
      console.error('Error creating deal:', error);
      toast.error('Failed to create deal');
    } finally {
      setCreatingDeal(false);
    }
  };

  const handleDeleteDeal = async () => {
    if (!deleteConfirm.deal) return;
    
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${API}/deals/${deleteConfirm.deal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Deal deleted');
        setDeals(prev => prev.filter(d => d.id !== deleteConfirm.deal.id));
      } else {
        toast.error('Failed to delete deal');
      }
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast.error('Failed to delete deal');
    } finally {
      setDeleteConfirm({ open: false, deal: null });
    }
  };

  const handleViewDeal = (deal) => {
    navigate(`/deals/${deal.id}`);
  };

  const handleOpenPanel = (deal) => {
    setPanelDeal(deal);
    setPanelOpen(true);
  };

  const handlePanelClose = () => {
    setPanelOpen(false);
    setPanelDeal(null);
  };

  const handlePanelUpdate = async () => {
    // Refetch deals when panel updates (pipeline/stage changes)
    fetchDeals();
    // Also refresh panelDeal with latest data from API
    if (panelDeal?.id) {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const response = await fetch(`${API}/deals/${panelDeal.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const result = await response.json();
          setPanelDeal(prev => ({ ...prev, ...result.deal }));
        }
      } catch (err) {
        console.error('Failed to refresh panelDeal after save:', err);
        // fallback: fetchDeals already refreshed the list
      }
    }
  };

  const handlePanelDealDeleted = (deletedDealId) => {
    setDeals(prev => prev.filter(d => d.id !== deletedDealId));
    handlePanelClose();
  };

  const handleToggleDealVisibility = async (deal) => {
    const isCurrentlyShared = !!deal.team_id;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${deal.id}/visibility`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_with_team: !isCurrentlyShared })
      });
      if (response.ok) {
        const data = await response.json();
        setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, team_id: !isCurrentlyShared ? (data.deal?.team_id || 'shared') : null } : d));
      } else { toast.error('Failed to update visibility'); }
    } catch { toast.error('Failed to update visibility'); }
  };

  const handleAddDeal = (stageId) => {
    setSelectedStageId(stageId);
    setShowCreateDeal(true);
  };

  // Stage management functions
  const handleOpenStageEdit = (stage) => {
    setEditingStage(stage);
    setStageForm({ name: stage.name, color: stage.color || '#94a3b8' });
    setShowStageManager(true);
  };

  const handleOpenStageCreate = () => {
    setEditingStage(null);
    setStageForm({ name: '', color: '#94a3b8' });
    setShowStageManager(true);
  };

  const handleSaveStage = async () => {
    if (!stageForm.name.trim()) {
      toast.error('Stage name is required');
      return;
    }

    setSavingStage(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      if (editingStage) {
        // Update existing stage
        const response = await fetch(`${API}/pipelines/stages/${editingStage.id}`, {
          method: 'PUT',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(stageForm)
        });
        
        if (response.ok) {
          toast.success('Stage updated');
          setStages(prev => prev.map(s => 
            s.id === editingStage.id ? { ...s, ...stageForm } : s
          ));
        } else {
          toast.error('Failed to update stage');
        }
      } else {
        // Create new stage
        const response = await fetch(`${API}/pipelines/${selectedPipeline.id}/stages`, {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...stageForm,
            display_order: stages.length + 1
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          toast.success('Stage created');
          setStages(prev => [...prev, data.stage]);
        } else {
          toast.error('Failed to create stage');
        }
      }
      
      setShowStageManager(false);
      fetchPipelines(); // Refresh to get updated stages
    } catch (error) {
      console.error('Error saving stage:', error);
      toast.error('Failed to save stage');
    } finally {
      setSavingStage(false);
    }
  };

  const handleDeleteStage = async () => {
    if (!editingStage) return;
    
    // Check if stage has deals
    const stageDeals = deals.filter(d => d.pipeline_stage_id === editingStage.id);
    if (stageDeals.length > 0) {
      toast.error(`Cannot delete stage with ${stageDeals.length} deals. Move or delete deals first.`);
      return;
    }

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${API}/pipelines/stages/${editingStage.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Stage deleted');
        setStages(prev => prev.filter(s => s.id !== editingStage.id));
        setShowStageManager(false);
      } else {
        toast.error('Failed to delete stage');
      }
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast.error('Failed to delete stage');
    }
  };

  // Pipeline management functions
  const handleRenamePipeline = async () => {
    if (!pipelineEditName.trim() || !selectedPipeline) return;
    setSavingPipeline(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/pipelines/${selectedPipeline.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pipelineEditName.trim() })
      });
      if (response.ok) {
        toast.success('Pipeline renamed');
        setSelectedPipeline(prev => ({ ...prev, name: pipelineEditName.trim() }));
        setPipelines(prev => prev.map(p => p.id === selectedPipeline.id ? { ...p, name: pipelineEditName.trim() } : p));
      } else toast.error('Failed to rename');
    } catch { toast.error('Failed to rename'); }
    finally { setSavingPipeline(false); }
  };

  const handleDeletePipeline = async () => {
    if (!selectedPipeline) return;
    if (!window.confirm(`Delete pipeline "${selectedPipeline.name}" and all its stages? Deals will be unassigned.`)) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/pipelines/${selectedPipeline.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Pipeline deleted');
        setShowPipelineManager(false);
        fetchPipelines();
      } else toast.error('Failed to delete pipeline');
    } catch { toast.error('Failed to delete pipeline'); }
  };

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;
    setSavingPipeline(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/pipelines`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPipelineName.trim() })
      });
      if (response.ok) {
        toast.success('Pipeline created');
        setNewPipelineName('');
        fetchPipelines();
      } else toast.error('Failed to create pipeline');
    } catch { toast.error('Failed to create pipeline'); }
    finally { setSavingPipeline(false); }
  };

  const handleMoveStageOrder = async (stageId, direction) => {
    const idx = stages.findIndex(s => s.id === stageId);
    if ((direction === 'up' && idx <= 0) || (direction === 'down' && idx >= stages.length - 1)) return;
    const newStages = [...stages];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newStages[idx], newStages[swapIdx]] = [newStages[swapIdx], newStages[idx]];
    setStages(newStages);
    // Save reorder
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      await fetch(`${API}/pipelines/${selectedPipeline.id}/stages/reorder`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_ids: newStages.map(s => s.id) })
      });
    } catch (err) { console.error('Failed to reorder stages:', err); }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: colors.textSecondary
      }}>
        Loading pipeline...
      </div>
    );
  }

  // Calculate pipeline stats
  const totalDeals = deals.length;
  const totalValue = deals.reduce((sum, d) => sum + (d.asking_price || 0), 0);
  const formatTotalValue = (value) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      background: 'transparent'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div>
            <h1 style={{ 
              color: colors.textPrimary, 
              fontSize: '24px', 
              fontWeight: '700',
              marginBottom: '4px'
            }}>
              Pipeline
            </h1>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
              <span style={{ color: colors.textTertiary }}>
                {totalDeals} deals
              </span>
              <span style={{ color: colors.primary, fontWeight: '600' }}>
                {formatTotalValue(totalValue)} total value
              </span>
            </div>
          </div>
          
          {/* Pipeline Selector */}
          {pipelines.length > 0 && (
            <select
              value={selectedPipeline?.id || ''}
              onChange={(e) => {
                const pipeline = pipelines.find(p => p.id === e.target.value);
                if (pipeline) {
                  setSelectedPipeline(pipeline);
                  setStages(pipeline.stages || []);
                }
              }}
              style={{
                padding: '8px 12px',
                borderRadius: borderRadius.sm,
                background: colors.surfaceElevated,
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
                fontSize: '14px'
              }}
            >
              {pipelines.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ 
              position: 'absolute', 
              left: '10px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: colors.textTertiary
            }} />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search deals..."
              style={{
                paddingLeft: '36px',
                width: '200px',
                background: colors.surfaceElevated,
                border: `1px solid ${colors.border}`
              }}
            />
          </div>

          {/* Manage Stages Button */}
          <Button
            onClick={() => {
              setShowPipelineManager(true);
              setPipelineEditName(selectedPipeline?.name || '');
            }}
            variant="outline"
            style={{
              borderColor: colors.border,
              color: colors.textSecondary
            }}
          >
            <Settings size={16} style={{ marginRight: '8px' }} />
            Manage
          </Button>

          <Button
            onClick={handleOpenStageCreate}
            variant="outline"
            style={{
              borderColor: colors.border,
              color: colors.textSecondary
            }}
          >
            <Plus size={16} style={{ marginRight: '8px' }} />
            Add Stage
          </Button>

          {/* Add Deal Button */}
          <Button
            onClick={() => handleAddDeal(stages[0]?.id)}
            style={{
              background: gradients.primaryButton,
              border: 'none'
            }}
          >
            <Plus size={18} style={{ marginRight: '8px' }} />
            Add Deal
          </Button>
        </div>
      </div>

      {/* Pipeline Board */}
      <div style={{
        height: 'calc(100vh - 90px)',
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column'
      }}>
          <div style={{
            display: 'flex',
            gap: '16px',
            flex: 1,
            minHeight: 0,
            minWidth: 'min-content'
          }}>
            {stages.map((stage, idx) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                stageIndex={idx}
                totalStages={stages.length}
                deals={filteredDeals}
                onDealView={handleViewDeal}
                onDealOpenPanel={handleOpenPanel}
                onDealDelete={(deal) => setDeleteConfirm({ open: true, deal })}
                onAddDeal={handleAddDeal}
                onEditStage={handleOpenStageEdit}
                onMoveDeal={handleMoveDeal}
                onToggleVisibility={handleToggleDealVisibility}
              />
            ))}
            
            {/* Add Stage Column */}
            <div 
              onClick={handleOpenStageCreate}
              style={{
                flex: stages.length === 0 ? 1 : 0,
                minWidth: '60px',
                maxWidth: stages.length === 0 ? 'none' : '120px',
                minHeight: 0,
                border: `2px dashed ${colors.border}`,
                borderRadius: borderRadius.md,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: colors.textTertiary
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.primary;
                e.currentTarget.style.color = colors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.color = colors.textTertiary;
              }}
            >
              <Plus size={32} />
              <span style={{ marginTop: '8px', fontSize: '14px' }}>Add Stage</span>
            </div>
          </div>
      </div>

      {/* Create Deal Dialog */}
      <Dialog open={showCreateDeal} onOpenChange={setShowCreateDeal}>
        <DialogContent style={{ 
          background: colors.surfaceCard, 
          border: `1px solid ${colors.border}`,
          maxWidth: '450px'
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.textPrimary }}>Create New Deal</DialogTitle>
          </DialogHeader>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div>
              <Label style={{ color: colors.textSecondary }}>Title *</Label>
              <Input
                value={newDeal.title}
                onChange={(e) => setNewDeal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Deal title"
                style={{ marginTop: '6px', background: colors.surfaceElevated }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <Label style={{ color: colors.textSecondary }}>Asset Type</Label>
                <select
                  value={newDeal.asset_type}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, asset_type: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginTop: '6px',
                    borderRadius: '6px',
                    background: colors.surfaceElevated,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary
                  }}
                >
                  {assetTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <Label style={{ color: colors.textSecondary }}>Asking Price</Label>
                <Input
                  value={newDeal.asking_price}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '');
                    const formatted = value ? parseInt(value).toLocaleString() : '';
                    setNewDeal(prev => ({ ...prev, asking_price: formatted }));
                  }}
                  placeholder="0"
                  style={{ marginTop: '6px', background: colors.surfaceElevated }}
                />
              </div>
            </div>

            <div>
              <Label style={{ color: colors.textSecondary }}>Address</Label>
              <Input
                value={newDeal.address}
                onChange={(e) => setNewDeal(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Street address"
                style={{ marginTop: '6px', background: colors.surfaceElevated }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
              <div>
                <Label style={{ color: colors.textSecondary }}>City</Label>
                <Input
                  value={newDeal.city}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  style={{ marginTop: '6px', background: colors.surfaceElevated }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textSecondary }}>State</Label>
                <Input
                  value={newDeal.state}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="ST"
                  style={{ marginTop: '6px', background: colors.surfaceElevated }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textSecondary }}>Zip</Label>
                <Input
                  value={newDeal.zip_code}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, zip_code: e.target.value }))}
                  placeholder="00000"
                  style={{ marginTop: '6px', background: colors.surfaceElevated }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Button
                onClick={() => setShowCreateDeal(false)}
                variant="outline"
                style={{ flex: 1, borderColor: colors.border, color: colors.textSecondary }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDeal}
                disabled={creatingDeal || !newDeal.title}
                style={{ 
                  flex: 1, 
                  background: gradients.primaryButton, 
                  border: 'none',
                  opacity: (creatingDeal || !newDeal.title) ? 0.5 : 1
                }}
              >
                {creatingDeal ? 'Creating...' : 'Create Deal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stage Manager Dialog */}
      <Dialog open={showStageManager} onOpenChange={setShowStageManager}>
        <DialogContent style={{ 
          background: colors.surfaceCard, 
          border: `1px solid ${colors.border}`,
          maxWidth: '400px'
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.textPrimary }}>
              {editingStage ? 'Edit Stage' : 'Create New Stage'}
            </DialogTitle>
          </DialogHeader>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div>
              <Label style={{ color: colors.textSecondary }}>Stage Name *</Label>
              <Input
                value={stageForm.name}
                onChange={(e) => setStageForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Prospect, Negotiation, Closed"
                style={{ marginTop: '6px', background: colors.surfaceElevated }}
              />
            </div>

            <div>
              <Label style={{ color: colors.textSecondary }}>Stage Color</Label>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px', 
                marginTop: '8px' 
              }}>
                {stageColorOptions.map(color => (
                  <button
                    key={color}
                    onClick={() => setStageForm(prev => ({ ...prev, color }))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: color,
                      border: stageForm.color === color ? '3px solid white' : '2px solid transparent',
                      cursor: 'pointer',
                      boxShadow: stageForm.color === color ? `0 0 0 2px ${color}` : 'none'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              {editingStage && (
                <Button
                  onClick={handleDeleteStage}
                  variant="outline"
                  style={{ borderColor: '#ef4444', color: '#ef4444' }}
                >
                  <Trash2 size={16} />
                </Button>
              )}
              <Button
                onClick={() => setShowStageManager(false)}
                variant="outline"
                style={{ flex: 1, borderColor: colors.border, color: colors.textSecondary }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveStage}
                disabled={savingStage || !stageForm.name}
                style={{ 
                  flex: 1, 
                  background: gradients.primaryButton, 
                  border: 'none',
                  opacity: (savingStage || !stageForm.name) ? 0.5 : 1
                }}
              >
                {savingStage ? 'Saving...' : editingStage ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, deal: null })}>
        <DialogContent style={{ 
          background: colors.surfaceCard, 
          border: `1px solid ${colors.border}`,
          maxWidth: '400px'
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.textPrimary }}>Delete Deal</DialogTitle>
          </DialogHeader>
          
          <p style={{ color: colors.textSecondary, margin: '16px 0' }}>
            Are you sure you want to delete "{deleteConfirm.deal?.title}"? This action cannot be undone.
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              onClick={() => setDeleteConfirm({ open: false, deal: null })}
              variant="outline"
              style={{ flex: 1, borderColor: colors.border, color: colors.textSecondary }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteDeal}
              style={{ flex: 1, background: '#ef4444', border: 'none' }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pipeline & Stage Manager */}
      <Dialog open={showPipelineManager} onOpenChange={setShowPipelineManager}>
        <DialogContent style={{
          background: colors.surfaceCard,
          border: `1px solid ${colors.border}`,
          maxWidth: '560px',
          maxHeight: '85vh',
          overflow: 'auto'
        }}>
          <DialogHeader>
            <DialogTitle style={{ color: colors.textPrimary, fontSize: '18px' }}>
              Pipeline & Stage Manager
            </DialogTitle>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
            {/* Pipeline Name */}
            <div style={{ padding: '16px', background: colors.surfaceElevated, borderRadius: borderRadius.md, border: `1px solid ${colors.border}` }}>
              <label style={{ color: colors.textTertiary, fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>Pipeline Name</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Input
                  value={pipelineEditName}
                  onChange={(e) => setPipelineEditName(e.target.value)}
                  style={{ flex: 1, background: colors.surfaceCard, border: `1px solid ${colors.border}` }}
                />
                <Button onClick={handleRenamePipeline} disabled={savingPipeline || !pipelineEditName.trim() || pipelineEditName === selectedPipeline?.name}
                  size="sm" style={{ background: colors.primary, border: 'none', opacity: (!pipelineEditName.trim() || pipelineEditName === selectedPipeline?.name) ? 0.4 : 1 }}>
                  Save
                </Button>
              </div>
            </div>

            {/* Stages */}
            <div style={{ padding: '16px', background: colors.surfaceElevated, borderRadius: borderRadius.md, border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ color: colors.textTertiary, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Stages ({stages.length})
                </label>
                <button onClick={handleOpenStageCreate} style={{ color: colors.primary, fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={14} /> Add Stage
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {stages.map((stage, idx) => (
                  <div key={stage.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px',
                    background: colors.surfaceCard, borderRadius: '8px', border: `1px solid ${colors.border}`,
                    transition: 'border-color 0.15s'
                  }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: stage.color || '#6b7280', flexShrink: 0 }} />
                    <span style={{ flex: 1, color: colors.textPrimary, fontSize: '14px', fontWeight: '500' }}>{stage.name}</span>
                    <span style={{ color: colors.textTertiary, fontSize: '11px', marginRight: '4px' }}>
                      {deals.filter(d => d.pipeline_stage_id === stage.id).length} deals
                    </span>
                    <button onClick={() => handleMoveStageOrder(stage.id, 'up')} disabled={idx === 0}
                      style={{ padding: '3px', background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.2 : 0.6, color: colors.textSecondary }}>
                      <ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <button onClick={() => handleMoveStageOrder(stage.id, 'down')} disabled={idx === stages.length - 1}
                      style={{ padding: '3px', background: 'none', border: 'none', cursor: idx === stages.length - 1 ? 'default' : 'pointer', opacity: idx === stages.length - 1 ? 0.2 : 0.6, color: colors.textSecondary }}>
                      <ChevronDown size={14} />
                    </button>
                    <button onClick={() => handleOpenStageEdit(stage)}
                      style={{ padding: '3px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textTertiary }}>
                      <Edit size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Create New Pipeline */}
            <div style={{ padding: '16px', background: colors.surfaceElevated, borderRadius: borderRadius.md, border: `1px solid ${colors.border}` }}>
              <label style={{ color: colors.textTertiary, fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>Create New Pipeline</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Input
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  placeholder="Pipeline name..."
                  style={{ flex: 1, background: colors.surfaceCard, border: `1px solid ${colors.border}` }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreatePipeline(); }}
                />
                <Button onClick={handleCreatePipeline} disabled={savingPipeline || !newPipelineName.trim()}
                  size="sm" style={{ background: gradients.primaryButton, border: 'none' }}>
                  Create
                </Button>
              </div>
            </div>

            {/* Danger Zone */}
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: borderRadius.md, border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              <label style={{ color: '#ef4444', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>Danger Zone</label>
              <p style={{ color: colors.textTertiary, fontSize: '12px', marginBottom: '12px' }}>
                Deleting a pipeline removes all stages. Deals will be unassigned.
              </p>
              <Button onClick={handleDeletePipeline} variant="outline"
                style={{ borderColor: '#ef4444', color: '#ef4444', width: '100%' }}>
                <Trash2 size={14} style={{ marginRight: '8px' }} />
                Delete &ldquo;{selectedPipeline?.name}&rdquo;
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deal Details Side Panel */}
      <PropertyIntelligencePanel
        isOpen={panelOpen}
        onClose={handlePanelClose}
        data={panelDeal}
        type="deal"
        onUpdate={handlePanelUpdate}
        onDealDeleted={handlePanelDealDeleted}
      />
    </div>
  );
};

export default Pipeline;
