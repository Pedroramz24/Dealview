import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { supabase } from '../supabaseClient';
import { API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, GripVertical, X, Save } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PipelineManagementModal = ({ 
  open, 
  onClose, 
  pipeline, 
  onPipelineUpdated,
  onPipelineDeleted 
}) => {
  const [editMode, setEditMode] = useState(null); // null, 'pipeline', or stage id
  const [stages, setStages] = useState([]);
  const [pipelineName, setPipelineName] = useState('');
  const [pipelineColor, setPipelineColor] = useState('');
  const [editingStage, setEditingStage] = useState(null);
  const [newStage, setNewStage] = useState({ name: '', color: '#60a5fa', stage_weight: 0.5 });
  const [showAddStage, setShowAddStage] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pipeline && open) {
      setPipelineName(pipeline.name);
      setPipelineColor(pipeline.color);
      setStages(pipeline.pipeline_stages || []);
    }
  }, [pipeline, open]);

  const handleUpdatePipeline = async () => {
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const formData = new FormData();
      formData.append('name', pipelineName);
      formData.append('color', pipelineColor);

      await axios.put(`${API}/pipelines/${pipeline.id}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Pipeline updated successfully');
      setEditMode(null);
      onPipelineUpdated();
    } catch (error) {
      console.error('Error updating pipeline:', error);
      toast.error('Failed to update pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStage = async () => {
    if (!newStage.name.trim()) {
      toast.error('Stage name is required');
      return;
    }

    if (stages.length >= 10) {
      toast.error('Maximum 10 stages per pipeline');
      return;
    }

    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const formData = new FormData();
      formData.append('name', newStage.name);
      formData.append('color', newStage.color);
      formData.append('stage_weight', newStage.stage_weight);

      const response = await axios.post(
        `${API}/pipelines/${pipeline.id}/stages`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setStages([...stages, response.data.stage]);
        setNewStage({ name: '', color: '#60a5fa', stage_weight: 0.5 });
        setShowAddStage(false);
        toast.success('Stage added successfully');
        onPipelineUpdated();
      }
    } catch (error) {
      console.error('Error adding stage:', error);
      toast.error(error.response?.data?.detail || 'Failed to add stage');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStage = async (stage) => {
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const formData = new FormData();
      formData.append('name', stage.name);
      formData.append('color', stage.color);
      formData.append('stage_weight', stage.stage_weight);

      await axios.put(`${API}/stages/${stage.id}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Update local state immediately
      setStages(stages.map(s => s.id === stage.id ? stage : s));

      toast.success('Stage updated successfully');
      setEditingStage(null);
      onPipelineUpdated(); // This will refresh the pipeline data
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display_order for all affected stages
    const updatedStages = items.map((stage, index) => ({
      ...stage,
      display_order: index
    }));

    // Optimistic update
    setStages(updatedStages);

    // Update each stage's display_order in the backend
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      await Promise.all(
        updatedStages.map(stage => {
          const formData = new FormData();
          formData.append('display_order', stage.display_order);
          
          return axios.put(`${API}/stages/${stage.id}`, formData, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          });
        })
      );

      toast.success('Stages reordered successfully');
      onPipelineUpdated();
    } catch (error) {
      console.error('Error reordering stages:', error);
      toast.error('Failed to reorder stages');
      // Revert on error
      setStages(stages);
    }
  };

  const handleDeleteStage = async (stageId) => {
    if (!window.confirm('Are you sure you want to delete this stage? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      await axios.delete(`${API}/stages/${stageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setStages(stages.filter(s => s.id !== stageId));
      toast.success('Stage deleted successfully');
      onPipelineUpdated();
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete stage');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePipeline = async () => {
    if (pipeline.is_default) {
      toast.error('Cannot delete default pipeline');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${pipeline.name}"? All deals will be moved to your default pipeline.`)) {
      return;
    }

    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      
      await axios.delete(`${API}/pipelines/${pipeline.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Pipeline deleted successfully');
      onPipelineDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete pipeline');
    } finally {
      setLoading(false);
    }
  };

  const colorOptions = [
    { value: '#94a3b8', label: 'Slate' },
    { value: '#60a5fa', label: 'Blue' },
    { value: '#a78bfa', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#10b981', label: 'Green' },
    { value: '#00d4aa', label: 'Teal' },
    { value: '#ef4444', label: 'Red' },
    { value: '#00b8d4', label: 'Cyan' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '700' }}>
            Manage Pipeline: {pipeline?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Pipeline Settings */}
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '12px', 
            padding: '20px' 
          }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ color: '#00b8d4', fontSize: '16px', fontWeight: '600' }}>
                Pipeline Settings
              </h3>
              {editMode !== 'pipeline' && (
                <Button
                  onClick={() => setEditMode('pipeline')}
                  variant="outline"
                  size="sm"
                  style={{
                    background: 'rgba(0, 184, 212, 0.1)',
                    border: '1px solid rgba(0, 184, 212, 0.3)',
                    color: '#00b8d4'
                  }}
                >
                  <Edit2 size={14} className="mr-2" />
                  Edit
                </Button>
              )}
            </div>

            {editMode === 'pipeline' ? (
              <div className="space-y-4">
                <div>
                  <Label style={{ color: '#FFFFFF', marginBottom: '8px', display: 'block' }}>
                    Pipeline Name
                  </Label>
                  <Input
                    value={pipelineName}
                    onChange={(e) => setPipelineName(e.target.value)}
                    placeholder="e.g., Listings, Off-Market"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#FFFFFF'
                    }}
                  />
                </div>

                <div>
                  <Label style={{ color: '#FFFFFF', marginBottom: '8px', display: 'block' }}>
                    Color
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setPipelineColor(color.value)}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: color.value,
                          border: pipelineColor === color.value ? '3px solid #FFFFFF' : '2px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdatePipeline}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #00b8d4 0%, #00d4aa 100%)',
                      color: '#FFFFFF'
                    }}
                  >
                    <Save size={16} className="mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => {
                      setEditMode(null);
                      setPipelineName(pipeline.name);
                      setPipelineColor(pipeline.color);
                    }}
                    variant="outline"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.6)'
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                  Name: <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{pipeline?.name}</span>
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Color:</span>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: pipeline?.color,
                    border: '2px solid rgba(255,255,255,0.2)'
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Stages Management */}
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '12px', 
            padding: '20px' 
          }}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ color: '#00b8d4', fontSize: '16px', fontWeight: '600' }}>
                Stages ({stages.length}/10)
              </h3>
              {!showAddStage && stages.length < 10 && (
                <Button
                  onClick={() => setShowAddStage(true)}
                  size="sm"
                  style={{
                    background: 'rgba(0, 184, 212, 0.1)',
                    border: '1px solid rgba(0, 184, 212, 0.3)',
                    color: '#00b8d4'
                  }}
                >
                  <Plus size={14} className="mr-2" />
                  Add Stage
                </Button>
              )}
            </div>

            {/* Add New Stage Form */}
            {showAddStage && (
              <div style={{
                background: 'rgba(0, 184, 212, 0.05)',
                border: '1px solid rgba(0, 184, 212, 0.2)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div className="space-y-3">
                  <div>
                    <Label style={{ color: '#FFFFFF', marginBottom: '8px', display: 'block', fontSize: '12px' }}>
                      Stage Name
                    </Label>
                    <Input
                      value={newStage.name}
                      onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                      placeholder="e.g., Pitch, Negotiations"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#FFFFFF'
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label style={{ color: '#FFFFFF', marginBottom: '8px', display: 'block', fontSize: '12px' }}>
                        Color
                      </Label>
                      <select
                        value={newStage.color}
                        onChange={(e) => setNewStage({ ...newStage, color: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px',
                          borderRadius: '6px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#FFFFFF'
                        }}
                      >
                        {colorOptions.map((color) => (
                          <option key={color.value} value={color.value}>
                            {color.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label style={{ color: '#FFFFFF', marginBottom: '8px', display: 'block', fontSize: '12px' }}>
                        Weight (0-1)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={newStage.stage_weight}
                        onChange={(e) => setNewStage({ ...newStage, stage_weight: parseFloat(e.target.value) })}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#FFFFFF'
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddStage}
                      disabled={loading}
                      size="sm"
                      style={{
                        background: '#00b8d4',
                        color: '#FFFFFF'
                      }}
                    >
                      <Save size={14} className="mr-2" />
                      Add Stage
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddStage(false);
                        setNewStage({ name: '', color: '#60a5fa', stage_weight: 0.5 });
                      }}
                      size="sm"
                      variant="outline"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.6)'
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Stages List */}
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="stages">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {stages.map((stage, index) => (
                      <Draggable key={stage.id} draggableId={String(stage.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              ...provided.draggableProps.style,
                              background: editingStage?.id === stage.id 
                                ? 'rgba(0, 184, 212, 0.05)' 
                                : snapshot.isDragging 
                                  ? 'rgba(0, 184, 212, 0.1)' 
                                  : 'rgba(255,255,255,0.03)',
                              border: editingStage?.id === stage.id 
                                ? '1px solid rgba(0, 184, 212, 0.3)' 
                                : snapshot.isDragging 
                                  ? '1px solid rgba(0, 184, 212, 0.5)'
                                  : '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '8px',
                              padding: '12px',
                              marginBottom: '8px'
                            }}
                          >
                            {editingStage?.id === stage.id ? (
                              // Edit Mode
                              <div className="space-y-3">
                                <div>
                                  <Input
                                    value={editingStage.name}
                                    onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                                    style={{
                                      background: 'rgba(255,255,255,0.05)',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      color: '#FFFFFF'
                                    }}
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <select
                                    value={editingStage.color}
                                    onChange={(e) => setEditingStage({ ...editingStage, color: e.target.value })}
                                    style={{
                                      padding: '8px',
                                      borderRadius: '6px',
                                      background: 'rgba(255,255,255,0.05)',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      color: '#FFFFFF'
                                    }}
                                  >
                                    {colorOptions.map((color) => (
                                      <option key={color.value} value={color.value}>
                                        {color.label}
                                      </option>
                                    ))}
                                  </select>

                                  <div>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="1"
                                      value={editingStage.stage_weight}
                                      onChange={(e) => setEditingStage({ ...editingStage, stage_weight: parseFloat(e.target.value) })}
                                      placeholder="Weight (0-1)"
                                      style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#FFFFFF'
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleUpdateStage(editingStage)}
                                    disabled={loading}
                                    size="sm"
                                    style={{
                                      background: '#00b8d4',
                                      color: '#FFFFFF'
                                    }}
                                  >
                                    <Save size={14} className="mr-2" />
                                    Save
                                  </Button>
                                  <Button
                                    onClick={() => setEditingStage(null)}
                                    size="sm"
                                    variant="outline"
                                    style={{
                                      background: 'rgba(255,255,255,0.05)',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      color: 'rgba(255,255,255,0.6)'
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              // View Mode
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div {...provided.dragHandleProps} style={{ cursor: 'grab' }}>
                                    <GripVertical size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                  </div>
                                  <div
                                    style={{
                                      width: '8px',
                                      height: '32px',
                                      borderRadius: '4px',
                                      background: stage.color
                                    }}
                                  />
                                  <div>
                                    <p style={{ color: '#FFFFFF', fontWeight: '600', fontSize: '14px' }}>
                                      {stage.name}
                                    </p>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                                      Weight: {stage.stage_weight} • Order: {index + 1}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => setEditingStage({ ...stage })}
                                    size="sm"
                                    variant="ghost"
                                    style={{
                                      color: 'rgba(255,255,255,0.6)'
                                    }}
                                  >
                                    <Edit2 size={14} />
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteStage(stage.id)}
                                    size="sm"
                                    variant="ghost"
                                    style={{
                                      color: '#ef4444'
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* Danger Zone */}
          {!pipeline?.is_default && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.05)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              borderRadius: '12px', 
              padding: '20px' 
            }}>
              <h3 style={{ color: '#ef4444', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Danger Zone
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '12px' }}>
                Delete this pipeline permanently. All deals will be moved to your default pipeline.
              </p>
              <Button
                onClick={handleDeletePipeline}
                disabled={loading}
                style={{
                  background: '#ef4444',
                  color: '#FFFFFF'
                }}
              >
                <Trash2 size={16} className="mr-2" />
                Delete Pipeline
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PipelineManagementModal;
