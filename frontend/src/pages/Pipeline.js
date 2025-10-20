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
        .select('*');

      if (error) throw error;
      setDeals(data || []);
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

    const updatedDeals = deals.map((deal) =>
      deal.id === dealId ? { ...deal, stage: newStage } : deal
    );
    setDeals(updatedDeals);

    try {
      const { error } = await supabase
        .from('deals')
        .update({ stage: newStage })
        .eq('id', dealId);

      if (error) throw error;
      toast.success('Deal stage updated');
    } catch (error) {
      toast.error('Failed to update deal stage');
      fetchDeals();
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full" data-testid="pipeline-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Pipeline</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Drag and drop deals between stages</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 h-[calc(100vh-220px)]">
          {stages.map((stage) => {
            const stageDeals = deals.filter((deal) => deal.stage === stage);
            const stageValue = stageDeals.reduce((sum, deal) => sum + (deal.asking_price || 0), 0);

            return (
              <div key={stage} className="flex flex-col">
                <div className="glass-surface p-4 mb-3">
                  <h3 className="font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{stage}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{stageDeals.length} deals</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{formatPrice(stageValue)}</p>
                </div>

                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`stage-column flex-1 overflow-y-auto ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                      data-testid={`stage-column-${stage}`}
                    >
                      {stageDeals.map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`pipeline-card ${snapshot.isDragging ? 'shadow-2xl' : ''}`}
                              onClick={() => navigate(`/deals/${deal.id}`)}
                              data-testid={`deal-card-${deal.id}`}
                            >
                              {deal.primary_image_url && (
                                <img
                                  src={deal.primary_image_url}
                                  alt={deal.property_address}
                                  className="w-full h-24 object-cover rounded-lg mb-2"
                                />
                              )}
                              <h4 className="font-semibold text-sm mb-1 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                                {deal.property_address}
                              </h4>
                              <span style={{ 
                                padding: '3px 10px',
                                background: getAssetTypeColor(deal.asset_type).bg,
                                color: getAssetTypeColor(deal.asset_type).color,
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                                border: `1px solid ${getAssetTypeColor(deal.asset_type).border}`,
                                display: 'inline-block',
                                marginBottom: '8px'
                              }}>
                                {deal.asset_type}
                              </span>
                              <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{formatPrice(deal.asking_price)}</p>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};

export default Pipeline;
