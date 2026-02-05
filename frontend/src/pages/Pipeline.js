import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext, API } from '../App';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Search, Plus, X, GripVertical, Building2, MapPin, DollarSign,
  ChevronDown, MoreVertical, Trash2, Eye, Edit
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { colors, gradients, borderRadius, spacing, shadows } from '../styles/designSystem';

// Asset type colors
const assetTypeColors = {
  'Office': '#3b82f6',
  'Retail': '#10b981',
  'Industrial': '#f59e0b',
  'Multifamily': '#8b5cf6',
  'Land': '#ec4899',
  'Mixed Use': '#06b6d4',
  'Other': '#6b7280'
};

const assetTypes = ['Office', 'Retail', 'Industrial', 'Multifamily', 'Land', 'Mixed Use', 'Other'];

// Sortable Deal Card Component
const SortableDealCard = ({ deal, onView, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="deal-card"
    >
      <div style={{
        background: colors.surfaceCard,
        borderRadius: borderRadius.md,
        padding: '12px',
        marginBottom: '8px',
        border: `1px solid ${colors.border}`,
        cursor: 'grab',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.primary;
        e.currentTarget.style.boxShadow = shadows.glow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.boxShadow = 'none';
      }}
      >
        {/* Drag Handle + Asset Type */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} {...listeners}>
            <GripVertical size={14} style={{ color: colors.textTertiary, cursor: 'grab' }} />
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
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); onView(deal); }}
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

        {/* Title */}
        <div 
          style={{ 
            color: colors.textPrimary, 
            fontWeight: '600', 
            fontSize: '14px',
            marginBottom: '4px',
            cursor: 'pointer'
          }}
          onClick={() => onView(deal)}
        >
          {deal.title}
        </div>

        {/* Address */}
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

        {/* Price */}
        {deal.asking_price && (
          <div style={{ 
            color: colors.primary, 
            fontWeight: '600', 
            fontSize: '15px'
          }}>
            {formatCurrency(deal.asking_price)}
          </div>
        )}
      </div>
    </div>
  );
};

// Stage Column Component
const StageColumn = ({ stage, deals, onDealView, onDealDelete, onAddDeal }) => {
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
      minWidth: '280px',
      maxWidth: '280px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Stage Header */}
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
          <span style={{ color: colors.textTertiary, fontSize: '12px' }}>
            {formatCurrency(totalValue)}
          </span>
        </div>
      </div>

      {/* Deals Container */}
      <div style={{
        flex: 1,
        background: 'rgba(0,0,0,0.2)',
        padding: '8px',
        overflowY: 'auto',
        borderRadius: `0 0 ${borderRadius.md} ${borderRadius.md}`
      }}>
        <SortableContext items={stageDeals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {stageDeals.map(deal => (
            <SortableDealCard 
              key={deal.id} 
              deal={deal} 
              onView={onDealView}
              onDelete={onDealDelete}
            />
          ))}
        </SortableContext>

        {/* Add Deal Button */}
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
  
  // State
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  // Fetch pipelines on mount
  useEffect(() => {
    if (user) {
      fetchPipelines();
    }
  }, [user]);

  // Fetch deals when pipeline changes
  useEffect(() => {
    if (selectedPipeline) {
      fetchDeals();
    }
  }, [selectedPipeline]);

  const fetchPipelines = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${API}/pipelines`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const pipelineData = data.pipelines || [];
        setPipelines(pipelineData);
        
        // Select default or first pipeline
        const defaultPipeline = pipelineData.find(p => p.is_default) || pipelineData[0];
        if (defaultPipeline) {
          setSelectedPipeline(defaultPipeline);
          setStages(defaultPipeline.stages || []);
        }
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      toast.error('Failed to load pipelines');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeals = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${API}/deals?pipeline_id=${selectedPipeline.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDeals(data.deals || []);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    }
  };

  // Filter deals by search
  const filteredDeals = useMemo(() => {
    if (!searchTerm) return deals;
    const term = searchTerm.toLowerCase();
    return deals.filter(d => 
      d.title?.toLowerCase().includes(term) ||
      d.address?.toLowerCase().includes(term) ||
      d.city?.toLowerCase().includes(term)
    );
  }, [deals, searchTerm]);

  // Handle drag end
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const dealId = active.id;
    const deal = deals.find(d => d.id === dealId);
    
    if (!deal) return;

    // Find the stage the deal was dropped into
    // The over.id could be another deal or a stage
    let newStageId = null;
    
    // Check if dropped on a deal
    const overDeal = deals.find(d => d.id === over.id);
    if (overDeal) {
      newStageId = overDeal.pipeline_stage_id;
    } else {
      // Dropped on stage itself
      newStageId = over.id;
    }

    if (newStageId && newStageId !== deal.pipeline_stage_id) {
      // Optimistically update UI
      setDeals(prev => prev.map(d => 
        d.id === dealId ? { ...d, pipeline_stage_id: newStageId } : d
      ));

      // Update in backend
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        await fetch(`${API}/deals/${dealId}/stage`, {
          method: 'PATCH',
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ pipeline_stage_id: newStageId })
        });
      } catch (error) {
        console.error('Error updating stage:', error);
        toast.error('Failed to update deal stage');
        fetchDeals(); // Revert on error
      }
    }
  };

  // Create deal
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
          asking_price: newDeal.asking_price ? parseFloat(newDeal.asking_price) : null,
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

  // Delete deal
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

  // View deal
  const handleViewDeal = (deal) => {
    navigate(`/deals/${deal.id}`);
  };

  // Open create deal modal
  const handleAddDeal = (stageId) => {
    setSelectedStageId(stageId);
    setShowCreateDeal(true);
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

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ 
            color: colors.textPrimary, 
            fontSize: '24px', 
            fontWeight: '700' 
          }}>
            Pipeline
          </h1>
          
          {/* Pipeline Selector */}
          {pipelines.length > 1 && (
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
        flex: 1,
        overflow: 'auto',
        padding: '16px 24px'
      }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div style={{
            display: 'flex',
            gap: '16px',
            height: 'calc(100vh - 180px)',
            minWidth: 'fit-content'
          }}>
            {stages.map(stage => (
              <StageColumn
                key={stage.id}
                stage={stage}
                deals={filteredDeals}
                onDealView={handleViewDeal}
                onDealDelete={(deal) => setDeleteConfirm({ open: true, deal })}
                onAddDeal={handleAddDeal}
              />
            ))}
          </div>
        </DndContext>
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
                  type="number"
                  value={newDeal.asking_price}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, asking_price: e.target.value }))}
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
    </div>
  );
};

export default Pipeline;
