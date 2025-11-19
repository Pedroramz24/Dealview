import React, { useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext, API } from '../App';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import { 
  Search, Filter, SortAsc, DollarSign, Calendar, FileText, 
  CheckSquare, Phone, Mail, Eye, Edit, Plus, X, Settings 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import PipelineManagementModal from '../components/PipelineManagementModal';
import CreatePipelineModal from '../components/CreatePipelineModal';
import axios from 'axios';

// Next action types
const nextActionTypes = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'tour', label: 'Tour', icon: Eye },
  { value: 'send_om', label: 'Send OM', icon: FileText },
  { value: 'follow_up', label: 'Follow Up', icon: Calendar }
];

const Pipeline = () => {
  // Pipeline state
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [stages, setStages] = useState([]);
  const [showPipelineSettings, setShowPipelineSettings] = useState(false);
  const [showCreatePipeline, setShowCreatePipeline] = useState(false);
  
  // Deal state
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssetType, setFilterAssetType] = useState('all');
  const [sortBy, setSortBy] = useState('last_contact');
  const [showFilters, setShowFilters] = useState(false);
  const [automationDialog, setAutomationDialog] = useState({ open: false, type: null, deal: null });
  const [automationData, setAutomationData] = useState({});
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' or 'table'
  
  const boardRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

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
      const response = await axios.get(`${API}/pipelines`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setPipelines(response.data.pipelines);
        
        // Select default pipeline or first pipeline
        const defaultPipeline = response.data.pipelines.find(p => p.is_default);
        const pipelineToSelect = defaultPipeline || response.data.pipelines[0];
        
        if (pipelineToSelect) {
          setSelectedPipeline(pipelineToSelect);
          setStages(pipelineToSelect.pipeline_stages || []);
        }
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      toast.error('Failed to load pipelines');
    }
  };

  const fetchDeals = async () => {
    if (!user || !selectedPipeline) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*, pipeline_stages!inner(id, name, color, stage_weight, display_order)')
        .eq('pipeline_id', selectedPipeline.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Ensure all deals have proper stage data
      const dealsWithStages = (data || []).map(deal => ({
        ...deal,
        stage_id: deal.pipeline_stage_id,
        stage_name: deal.pipeline_stages?.name || 'Unknown',
        stage_color: deal.pipeline_stages?.color || '#94a3b8',
        last_contact: deal.last_contact || deal.created_at,
        next_action: deal.next_action || 'call'
      }));
      
      setDeals(dealsWithStages);
    } catch (error) {
      console.error('Error fetching deals:', error);
      if (error.code !== 'PGRST116') {
        toast.error('Failed to load deals');
      }
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const dealId = result.draggableId;
    const newStageId = result.destination.droppableId;
    const oldStageId = result.source.droppableId;

    if (newStageId === oldStageId) return;

    // Find the new stage info
    const newStage = stages.find(s => s.id === newStageId);
    if (!newStage) return;

    // Optimistic update
    const updatedDeals = deals.map((deal) =>
      deal.id === dealId ? { 
        ...deal, 
        stage_id: newStageId,
        pipeline_stage_id: newStageId,
        stage_name: newStage.name,
        stage_color: newStage.color
      } : deal
    );
    setDeals(updatedDeals);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      // Use the new move API endpoint
      const formData = new FormData();
      formData.append('pipeline_stage_id', newStageId);
      
      await axios.put(`${API}/deals/${dealId}/move`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Deal moved successfully');

      // Trigger automations based on stage name
      const deal = deals.find(d => d.id === dealId);
      triggerAutomation(newStage.name, deal);
      
    } catch (error) {
      console.error('Error updating deal stage:', error);
      toast.error('Failed to update deal stage');
      fetchDeals(); // Revert on error
    }
  };

  const triggerAutomation = (stageName, deal) => {
    // Trigger automations based on stage name instead of stage ID
    const lowerStageName = stageName.toLowerCase();
    
    if (lowerStageName.includes('offer')) {
      setAutomationDialog({
        open: true,
        type: 'offer_sent',
        deal: deal,
        title: 'Offer Sent - Set Follow-up',
        message: 'Would you like to set a follow-up date for this offer?'
      });
    } else if (lowerStageName.includes('contract')) {
      setAutomationDialog({
        open: true,
        type: 'under_contract',
        deal: deal,
        title: 'Under Contract - Attach Key Documents',
        message: 'Please attach key contract documents.'
      });
    } else if (lowerStageName.includes('closed') || lowerStageName.includes('won')) {
      setAutomationDialog({
        open: true,
        type: 'closed_won',
        deal: deal,
        title: 'Closed Won - Final Details',
        message: 'Log final price and mark tasks as complete.'
      });
    }
  };

  const handleAutomationSubmit = async () => {
    const { type, deal } = automationDialog;
    
    try {
      let updateData = {};
      
      switch(type) {
        case 'offer_sent':
          if (automationData.followUpDate) {
            updateData = { 
              next_action: 'follow_up',
              next_action_date: automationData.followUpDate 
            };
          }
          break;
        case 'closed_won':
          if (automationData.finalPrice) {
            updateData = { 
              price: parseFloat(automationData.finalPrice),
              status: 'closed'
            };
          }
          break;
        default:
          break;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('deals')
          .update(updateData)
          .eq('id', deal.id);

        if (error) throw error;
        toast.success('Deal updated successfully');
        fetchDeals();
      }

      setAutomationDialog({ open: false, type: null, deal: null });
      setAutomationData({});
    } catch (error) {
      console.error('Error in automation:', error);
      toast.error('Failed to update deal');
    }
  };

  const formatPrice = (price) => {
    if (!price) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getFilteredDeals = () => {
    return deals.filter(deal => {
      // Search filter
      if (searchTerm && !deal.address?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !deal.title?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Asset type filter
      if (filterAssetType !== 'all' && deal.asset_type !== filterAssetType) {
        return false;
      }
      
      return true;
    });
  };

  const getDealsByStage = (stageId) => {
    const filtered = getFilteredDeals();
    let stageDeals = filtered.filter(deal => deal.pipeline_stage_id === stageId || deal.stage_id === stageId);
    
    // Sort deals
    if (sortBy === 'price') {
      stageDeals.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'last_contact') {
      stageDeals.sort((a, b) => new Date(b.last_contact || 0) - new Date(a.last_contact || 0));
    }
    
    return stageDeals;
  };

  const getFilteredAndSortedDeals = () => {
    const filtered = getFilteredDeals();
    
    // Sort deals
    if (sortBy === 'price') {
      return filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'last_contact') {
      return filtered.sort((a, b) => new Date(b.last_contact || 0) - new Date(a.last_contact || 0));
    }
    
    return filtered;
  };

  const calculateMetrics = () => {
    const filtered = getFilteredDeals();
    const totalValue = filtered.reduce((sum, deal) => sum + (deal.price || 0), 0);
    const weightedValue = filtered.reduce((sum, deal) => {
      // Use stage_weight from pipeline_stages (already in deal object from join)
      const weight = deal.pipeline_stages?.stage_weight || 0.5;
      return sum + (deal.price || 0) * weight;
    }, 0);
    
    const stageCounts = {};
    stages.forEach(stage => {
      stageCounts[stage.id] = filtered.filter(d => d.pipeline_stage_id === stage.id || d.stage_id === stage.id).length;
    });
    
    return { totalValue, weightedValue, stageCounts, totalDeals: filtered.length };
  };

  const metrics = calculateMetrics();
  const assetTypes = [...new Set(deals.map(d => d.asset_type).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-base)' }} data-testid="pipeline-page">
      {/* Header */}
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Deals
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {viewMode === 'pipeline' ? 'Visual deal flow with drag & drop' : 'Manage all your deals in table view'}
            </p>
          </div>
          
          {/* View Toggle Buttons */}
          <div className="flex gap-2" style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '4px'
          }}>
            <button
              onClick={() => setViewMode('pipeline')}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                background: viewMode === 'pipeline' ? 'rgba(0, 184, 212, 0.15)' : 'transparent',
                border: viewMode === 'pipeline' ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid transparent',
                color: viewMode === 'pipeline' ? '#00b8d4' : 'rgba(255,255,255,0.6)',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: viewMode === 'pipeline' ? '0 0 20px rgba(0, 184, 212, 0.2)' : 'none'
              }}
            >
              Pipeline
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                background: viewMode === 'table' ? 'rgba(0, 184, 212, 0.15)' : 'transparent',
                border: viewMode === 'table' ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid transparent',
                color: viewMode === 'table' ? '#00b8d4' : 'rgba(255,255,255,0.6)',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: viewMode === 'table' ? '0 0 20px rgba(0, 184, 212, 0.2)' : 'none'
              }}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline Selector Tabs */}
      <div className="px-8 pb-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          {pipelines.map((pipeline) => (
            <div key={pipeline.id} className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedPipeline(pipeline);
                  setStages(pipeline.pipeline_stages || []);
                }}
                style={{
                  padding: '12px 20px',
                  borderRadius: '10px',
                  background: selectedPipeline?.id === pipeline.id ? `${pipeline.color}20` : 'rgba(255,255,255,0.03)',
                  border: selectedPipeline?.id === pipeline.id ? `2px solid ${pipeline.color}` : '2px solid rgba(255,255,255,0.1)',
                  color: selectedPipeline?.id === pipeline.id ? pipeline.color : 'rgba(255,255,255,0.6)',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: selectedPipeline?.id === pipeline.id ? `0 0 20px ${pipeline.color}40` : 'none'
                }}
                onMouseEnter={(e) => {
                  if (selectedPipeline?.id !== pipeline.id) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedPipeline?.id !== pipeline.id) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  }
                }}
              >
                {pipeline.name}
                {pipeline.is_default && (
                  <span style={{ 
                    marginLeft: '8px', 
                    fontSize: '10px', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.1)' 
                  }}>
                    DEFAULT
                  </span>
                )}
              </button>
              
              {selectedPipeline?.id === pipeline.id && (
                <button
                  onClick={() => setShowPipelineSettings(true)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.3)';
                    e.currentTarget.style.color = '#00b8d4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                  }}
                  title="Manage Pipeline"
                >
                  <Settings size={16} />
                </button>
              )}
            </div>
          ))}
          
          {pipelines.length < 5 && (
            <button
              onClick={() => toast.info('Pipeline creation coming soon!')}
              style={{
                padding: '12px 20px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '2px dashed rgba(255,255,255,0.2)',
                color: 'rgba(255,255,255,0.4)',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} />
              New Pipeline
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Management Modal */}
      <PipelineManagementModal
        open={showPipelineSettings}
        onClose={() => setShowPipelineSettings(false)}
        pipeline={selectedPipeline}
        onPipelineUpdated={() => {
          fetchPipelines();
          fetchDeals();
        }}
        onPipelineDeleted={() => {
          fetchPipelines();
        }}
      />

      {/* Metrics Bar */}
      <div className="px-8 pb-4">
        <div className="glass-surface p-4 flex flex-wrap gap-6">
          <div>
            <p className="text-xs uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Total Pipeline
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatPrice(metrics.totalValue)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Weighted Pipeline
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
              {formatPrice(metrics.weightedValue)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Total Deals
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {metrics.totalDeals}
            </p>
          </div>
          {stages.slice(0, 4).map(stage => (
            <div key={stage.id}>
              <p className="text-xs uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '4px' }}>
                {stage.label}
              </p>
              <p className="text-xl font-semibold" style={{ color: stage.color }}>
                {metrics.stageCounts[stage.id] || 0}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="px-8 pb-4">
        <div className="glass-surface p-4">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <Input
                placeholder="Search by address or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                style={{ 
                  background: 'var(--glass-bg)', 
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Asset Type Filter */}
            <select
              value={filterAssetType}
              onChange={(e) => setFilterAssetType(e.target.value)}
              className="px-4 py-2 rounded-lg"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Asset Types</option>
              {assetTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-lg flex items-center gap-2"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="last_contact">Sort: Last Contact</option>
              <option value="price">Sort: Price</option>
            </select>

            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="px-4"
              style={{
                background: showFilters ? 'var(--accent)' : 'var(--glass-bg)',
                border: `1px solid ${showFilters ? 'var(--accent)' : 'var(--glass-border)'}`,
                color: showFilters ? '#ffffff' : 'var(--text-primary)'
              }}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* PIPELINE VIEW - Kanban Board */}
      {viewMode === 'pipeline' && (
      <div className="px-8 pb-8 flex-1" style={{ height: 'calc(100vh - 280px)' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div 
            ref={boardRef}
            className="flex gap-4 overflow-x-auto pb-4"
            style={{ 
              scrollBehavior: 'smooth',
              height: '100%'
            }}
          >
            {stages.map((stage) => {
              const stageDeals = getDealsByStage(stage.id);
              const stageValue = stageDeals.reduce((sum, deal) => sum + (deal.price || 0), 0);

              return (
                <div 
                  key={stage.id} 
                  className="flex-shrink-0 flex flex-col"
                  style={{ width: '320px', height: '100%' }}
                >
                  {/* Stage Header */}
                  <div 
                    className="glass-surface p-4 mb-3 rounded-xl flex-shrink-0"
                    style={{
                      borderTop: `3px solid ${stage.color}`
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                        {stage.label}
                      </h3>
                      <span 
                        className="px-2 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: `${stage.color}20`,
                          color: stage.color
                        }}
                      >
                        {stageDeals.length}
                      </span>
                    </div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                      {formatPrice(stageValue)}
                    </p>
                  </div>

                  {/* Droppable Column */}
                  <div className="flex-1 overflow-hidden">
                    <Droppable 
                      droppableId={stage.id} 
                      isDropDisabled={false} 
                      isCombineEnabled={false}
                      ignoreContainerClipping={false}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="flex flex-col p-2 rounded-xl transition-all duration-200 h-full"
                          style={{
                            background: snapshot.isDraggingOver ? 'rgba(0, 184, 212, 0.08)' : 'transparent',
                            border: snapshot.isDraggingOver ? '2px dashed var(--accent)' : '2px dashed transparent',
                            overflowY: 'auto',
                            overflowX: 'hidden'
                          }}
                      >
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="group relative mb-3"
                                style={{
                                  ...provided.draggableProps.style,
                                  cursor: snapshot.isDragging ? 'grabbing' : 'grab'
                                }}
                              >
                                {/* Deal Card */}
                                <div
                                  className="rounded-xl overflow-hidden transition-all duration-200"
                                  style={{
                                    transform: snapshot.isDragging ? 'scale(1.05)' : 'scale(1)',
                                    boxShadow: snapshot.isDragging 
                                      ? '0 20px 50px rgba(0, 184, 212, 0.4), 0 0 0 2px var(--accent), 0 0 20px rgba(0, 184, 212, 0.3)' 
                                      : '0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(100, 116, 139, 0.2)',
                                    background: snapshot.isDragging
                                      ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)'
                                      : 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.85) 100%)',
                                    backdropFilter: 'blur(20px)',
                                    border: snapshot.isDragging 
                                      ? '1px solid var(--accent)' 
                                      : '1px solid rgba(100, 116, 139, 0.3)',
                                    WebkitBackdropFilter: 'blur(20px)'
                                  }}
                                >
                                  {/* Card Content */}
                                  <div className="p-4">
                                    {/* Title & Address */}
                                    <div className="mb-3">
                                      <h4 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                                        {deal.title || deal.address || 'Untitled Deal'}
                                      </h4>
                                      {deal.address && (
                                        <p className="text-xs line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
                                          {deal.address}
                                        </p>
                                      )}
                                    </div>

                                    {/* Asset Type Badge */}
                                    <div className="mb-3">
                                      <span style={{ 
                                        padding: '4px 10px',
                                        background: getAssetTypeColor(deal.asset_type).bg,
                                        color: getAssetTypeColor(deal.asset_type).color,
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        border: `1px solid ${getAssetTypeColor(deal.asset_type).border}`,
                                        display: 'inline-block'
                                      }}>
                                        {deal.asset_type || 'N/A'}
                                      </span>
                                    </div>

                                    {/* Price */}
                                    <p className="text-lg font-bold mb-3" style={{ color: 'var(--accent)' }}>
                                      {formatPrice(deal.price)}
                                    </p>

                                    {/* Meta Info */}
                                    <div className="flex items-center justify-between text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                                      <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{formatDate(deal.last_contact)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {deal.documents_count > 0 && (
                                          <div className="flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            <span>{deal.documents_count}</span>
                                          </div>
                                        )}
                                        {deal.tasks_count > 0 && (
                                          <div className="flex items-center gap-1">
                                            <CheckSquare className="w-3 h-3" />
                                            <span>{deal.tasks_count}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Owner Avatar */}
                                    {deal.owner_email && (
                                      <div className="mb-3 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                                            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                                          >
                                            {deal.owner_email.charAt(0).toUpperCase()}
                                          </div>
                                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {deal.owner_email.split('@')[0]}
                                          </span>
                                        </div>
                                      </div>
                                    )}

                                    {/* View Details Button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/deals/${deal.id}`);
                                      }}
                                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-opacity-80"
                                      style={{
                                        background: 'rgba(59, 130, 246, 0.15)',
                                        border: '1px solid rgba(59, 130, 246, 0.4)',
                                        color: 'var(--accent)',
                                        fontSize: '12px',
                                        fontWeight: '600'
                                      }}
                                      onMouseDown={(e) => e.stopPropagation()}
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      View Details
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {/* Empty State */}
                        {stageDeals.length === 0 && !snapshot.isDraggingOver && (
                          <div 
                            className="flex items-center justify-center py-8 text-center rounded-xl"
                            style={{ 
                              border: '2px dashed var(--border-subtle)',
                              background: 'var(--glass-bg)'
                            }}
                          >
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                              No deals in this stage
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="px-8 pb-8 flex-1 overflow-auto">
          <div className="glass-surface rounded-xl overflow-hidden">
            <table className="w-full">
              <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <tr>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Address
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Asset Type
                  </th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Stage
                  </th>
                  <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Price
                  </th>
                  <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Size
                  </th>
                  <th style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {getFilteredAndSortedDeals().map((deal, index) => (
                  <tr 
                    key={deal.id}
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 184, 212, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '16px' }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                        {deal.address || deal.title || 'Untitled Deal'}
                      </div>
                      {deal.title && deal.address && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                          {deal.title}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span 
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: `${getAssetTypeColor(deal.asset_type)}20`,
                          color: getAssetTypeColor(deal.asset_type),
                          border: `1px solid ${getAssetTypeColor(deal.asset_type)}40`
                        }}
                      >
                        {deal.asset_type || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: `${stages.find(s => s.id === deal.stage)?.color || '#94a3b8'}20`,
                          color: stages.find(s => s.id === deal.stage)?.color || '#94a3b8',
                          border: `1px solid ${stages.find(s => s.id === deal.stage)?.color || '#94a3b8'}40`
                        }}
                      >
                        {stages.find(s => s.id === deal.stage)?.label || 'Need to Contact'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: '600' }}>
                      {deal.price ? formatPrice(deal.price) : '-'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {deal.size ? `${Number(deal.size).toLocaleString()} SF` : '-'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/deals/${deal.id}`)}
                          style={{
                            padding: '8px',
                            borderRadius: '6px',
                            background: 'rgba(0, 184, 212, 0.1)',
                            border: '1px solid rgba(0, 184, 212, 0.3)',
                            color: '#00b8d4',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 184, 212, 0.2)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {getFilteredAndSortedDeals().length === 0 && (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <FileText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
                  {searchTerm || filterAssetType !== 'all' ? 'No deals match your filters' : 'No deals yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Automation Dialog */}
      <Dialog open={automationDialog.open} onOpenChange={(open) => !open && setAutomationDialog({ open: false, type: null, deal: null })}>
        <DialogContent className="glass-surface" style={{ border: '1px solid var(--glass-border)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--text-primary)' }}>{automationDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p style={{ color: 'var(--text-secondary)' }}>{automationDialog.message}</p>
            
            {automationDialog.type === 'offer_sent' && (
              <div>
                <Label style={{ color: 'var(--text-primary)' }}>Follow-up Date</Label>
                <Input
                  type="date"
                  value={automationData.followUpDate || ''}
                  onChange={(e) => setAutomationData({ ...automationData, followUpDate: e.target.value })}
                  style={{ 
                    background: 'var(--glass-bg)', 
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            )}
            
            {automationDialog.type === 'closed_won' && (
              <div>
                <Label style={{ color: 'var(--text-primary)' }}>Final Price</Label>
                <Input
                  type="number"
                  placeholder="Enter final price"
                  value={automationData.finalPrice || ''}
                  onChange={(e) => setAutomationData({ ...automationData, finalPrice: e.target.value })}
                  style={{ 
                    background: 'var(--glass-bg)', 
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            )}
            
            {automationDialog.type === 'under_contract' && (
              <div className="text-center py-4">
                <Button
                  onClick={() => navigate(`/deals/${automationDialog.deal?.id}`)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Attach Documents
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setAutomationDialog({ open: false, type: null, deal: null })}
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)'
              }}
            >
              Skip
            </Button>
            {(automationDialog.type === 'offer_sent' || automationDialog.type === 'closed_won') && (
              <Button
                onClick={handleAutomationSubmit}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Save
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pipeline;
