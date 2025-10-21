import React, { useState, useEffect, useContext, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import { 
  Search, Filter, SortAsc, DollarSign, Calendar, FileText, 
  CheckSquare, Phone, Mail, Eye, Edit, Plus, X 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

// Pipeline stages with proper configuration
const stages = [
  { id: 'need_to_contact', label: 'Need to Contact', color: '#94a3b8' },
  { id: 'contacted', label: 'Contacted', color: '#60a5fa' },
  { id: 'prospect', label: 'Prospect', color: '#a78bfa' },
  { id: 'negotiations', label: 'Negotiations', color: '#ec4899' },
  { id: 'offer_sent', label: 'Offer Sent', color: '#f59e0b' },
  { id: 'under_contract', label: 'Under Contract', color: '#10b981' },
  { id: 'closed_won', label: 'Closed Won', color: '#00d4aa' },
  { id: 'overpriced', label: 'Overpriced', color: '#ef4444' }
];

// Stage weights for weighted pipeline calculation
const stageWeights = {
  'need_to_contact': 0.1,
  'contacted': 0.2,
  'prospect': 0.3,
  'negotiations': 0.4,
  'offer_sent': 0.5,
  'under_contract': 0.8,
  'closed_won': 1.0,
  'overpriced': 0.05
};

// Next action types
const nextActionTypes = [
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'tour', label: 'Tour', icon: Eye },
  { value: 'send_om', label: 'Send OM', icon: FileText },
  { value: 'follow_up', label: 'Follow Up', icon: Calendar }
];

const Pipeline = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssetType, setFilterAssetType] = useState('all');
  const [sortBy, setSortBy] = useState('last_contact');
  const [showFilters, setShowFilters] = useState(false);
  const [automationDialog, setAutomationDialog] = useState({ open: false, type: null, deal: null });
  const [automationData, setAutomationData] = useState({});
  const boardRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      fetchDeals();
    }
  }, [user]);

  const fetchDeals = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Ensure all deals have a stage, default to 'need_to_contact'
      const dealsWithStages = (data || []).map(deal => ({
        ...deal,
        stage: deal.stage || 'need_to_contact',
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
    const newStage = result.destination.droppableId;
    const oldStage = result.source.droppableId;

    if (newStage === oldStage) return;

    // Optimistic update
    const updatedDeals = deals.map((deal) =>
      deal.id === dealId ? { ...deal, stage: newStage } : deal
    );
    setDeals(updatedDeals);

    try {
      const { error } = await supabase
        .from('deals')
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', dealId);

      if (error) throw error;
      
      toast.success('Deal moved successfully');

      // Trigger automations based on stage
      const deal = deals.find(d => d.id === dealId);
      triggerAutomation(newStage, deal);
      
    } catch (error) {
      console.error('Error updating deal stage:', error);
      toast.error('Failed to update deal stage');
      fetchDeals(); // Revert on error
    }
  };

  const triggerAutomation = (stage, deal) => {
    switch(stage) {
      case 'offer_sent':
        setAutomationDialog({
          open: true,
          type: 'offer_sent',
          deal: deal,
          title: 'Offer Sent - Set Follow-up',
          message: 'Would you like to set a follow-up date for this offer?'
        });
        break;
      case 'under_contract':
        setAutomationDialog({
          open: true,
          type: 'under_contract',
          deal: deal,
          title: 'Under Contract - Attach Key Documents',
          message: 'Please attach key contract documents.'
        });
        break;
      case 'closed_won':
        setAutomationDialog({
          open: true,
          type: 'closed_won',
          deal: deal,
          title: 'Closed Won - Final Details',
          message: 'Log final price and mark tasks as complete.'
        });
        break;
      default:
        break;
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
    let stageDeals = filtered.filter(deal => deal.stage === stageId);
    
    // Sort deals
    if (sortBy === 'price') {
      stageDeals.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'last_contact') {
      stageDeals.sort((a, b) => new Date(b.last_contact || 0) - new Date(a.last_contact || 0));
    }
    
    return stageDeals;
  };

  const calculateMetrics = () => {
    const filtered = getFilteredDeals();
    const totalValue = filtered.reduce((sum, deal) => sum + (deal.price || 0), 0);
    const weightedValue = filtered.reduce((sum, deal) => {
      const weight = stageWeights[deal.stage] || 0;
      return sum + (deal.price || 0) * weight;
    }, 0);
    
    const stageCounts = {};
    stages.forEach(stage => {
      stageCounts[stage.id] = filtered.filter(d => d.stage === stage.id).length;
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
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Pipeline
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Visual deal flow with drag & drop</p>
      </div>

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

      {/* Kanban Board */}
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
                  className="flex-shrink-0"
                  style={{ width: '320px' }}
                >
                  {/* Stage Header */}
                  <div 
                    className="glass-surface p-4 mb-3 rounded-xl"
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
                        className="flex flex-col p-2 rounded-xl transition-all duration-200"
                        style={{
                          background: snapshot.isDraggingOver ? 'rgba(0, 184, 212, 0.08)' : 'transparent',
                          border: snapshot.isDraggingOver ? '2px dashed var(--accent)' : '2px dashed transparent',
                          minHeight: '200px',
                          height: 'calc(100vh - 320px)',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'rgba(0, 184, 212, 0.5) rgba(0, 0, 0, 0.2)'
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
              );
            })}
          </div>
        </DragDropContext>
      </div>

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
