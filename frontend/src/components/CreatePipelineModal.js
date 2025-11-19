import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { supabase } from '../supabaseClient';
import { API } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';

const CreatePipelineModal = ({ open, onClose, onPipelineCreated }) => {
  const [pipelineName, setPipelineName] = useState('');
  const [pipelineDescription, setPipelineDescription] = useState('');
  const [pipelineColor, setPipelineColor] = useState('#00b8d4');
  const [pipelineIcon, setPipelineIcon] = useState('briefcase');
  const [loading, setLoading] = useState(false);

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

  const handleCreate = async () => {
    if (!pipelineName.trim()) {
      toast.error('Pipeline name is required');
      return;
    }

    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const formData = new FormData();
      formData.append('name', pipelineName);
      formData.append('description', pipelineDescription);
      formData.append('color', pipelineColor);
      formData.append('icon', pipelineIcon);

      const response = await axios.post(`${API}/pipelines`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('Pipeline created successfully');
        setPipelineName('');
        setPipelineDescription('');
        setPipelineColor('#00b8d4');
        onPipelineCreated();
        onClose();
      }
    } catch (error) {
      console.error('Error creating pipeline:', error);
      toast.error(error.response?.data?.detail || 'Failed to create pipeline');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-xl"
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '700' }}>
            Create New Pipeline
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          <div>
            <Label style={{ color: '#FFFFFF', marginBottom: '8px', display: 'block' }}>
              Pipeline Name *
            </Label>
            <Input
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
              placeholder="e.g., Listings, For Lease, Buyer-Side"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF'
              }}
            />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
              Choose a descriptive name for your workflow
            </p>
          </div>

          <div>
            <Label style={{ color: '#FFFFFF', marginBottom: '8px', display: 'block' }}>
              Description (Optional)
            </Label>
            <textarea
              value={pipelineDescription}
              onChange={(e) => setPipelineDescription(e.target.value)}
              placeholder="What is this pipeline used for?"
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                resize: 'vertical'
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
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    background: color.value,
                    border: pipelineColor === color.value ? '3px solid #FFFFFF' : '2px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: pipelineColor === color.value ? `0 0 20px ${color.value}60` : 'none'
                  }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div style={{
            background: 'rgba(0, 184, 212, 0.05)',
            border: '1px solid rgba(0, 184, 212, 0.2)',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
              💡 <strong>Tip:</strong> After creating your pipeline, you can add custom stages to match your exact workflow. 
              New pipelines start empty - you'll need to add stages before adding deals.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleCreate}
              disabled={loading || !pipelineName.trim()}
              style={{
                background: 'linear-gradient(135deg, #00b8d4 0%, #00d4aa 100%)',
                color: '#FFFFFF',
                flex: 1
              }}
            >
              <Save size={16} className="mr-2" />
              {loading ? 'Creating...' : 'Create Pipeline'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)'
              }}
            >
              <X size={16} className="mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePipelineModal;
