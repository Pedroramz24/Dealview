import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getAssetTypeColor } from '../utils/assetTypeColors';

const stages = ['New', 'Qualified', 'Underwriting', 'Negotiation', 'Under Contract', 'Closed'];

const stageColors = {
  'New': 'bg-gray-100',
  'Qualified': 'bg-blue-100',
  'Underwriting': 'bg-yellow-100',
  'Negotiation': 'bg-orange-100',
  'Under Contract': 'bg-purple-100',
  'Closed': 'bg-green-100',
};

const Pipeline = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const response = await axios.get(`${API}/deals`);
      setDeals(response.data);
    } catch (error) {
      toast.error('Failed to load deals');
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
      await axios.put(`${API}/deals/${dealId}/stage`, { stage: newStage });
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
