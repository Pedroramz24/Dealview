import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../App';

const PublishDealModal = ({ dealId, deal, onClose, onPublished }) => {
  const [formData, setFormData] = useState({
    public_asset_type: '',
    public_market: '',
    public_price: '',
    public_strategy: 'Core'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Auto-fill from existing deal data
    if (deal) {
      setFormData({
        public_asset_type: deal.asset_type || '',
        public_market: deal.city || deal.market || '',
        public_price: deal.price || deal.asking_price || '',
        public_strategy: 'Core'
      });
    }
  }, [deal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      
      const response = await fetch(`${API}/deals/${dealId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to publish');
      }

      const data = await response.json();
      toast.success('Deal submitted for approval!');
      onPublished?.(data.deal);
      onClose();
      
    } catch (error) {
      console.error('Publish error:', error);
      toast.error(error.message || 'Failed to publish deal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              Publish to Marketplace
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              Submit your deal for approval
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              Asset Type *
            </label>
            <input
              type="text"
              required
              value={formData.public_asset_type}
              onChange={(e) => setFormData({...formData, public_asset_type: e.target.value})}
              placeholder="e.g., Retail, Office, Multifamily"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              Market/City *
            </label>
            <input
              type="text"
              required
              value={formData.public_market}
              onChange={(e) => setFormData({...formData, public_market: e.target.value})}
              placeholder="e.g., San Antonio, Austin, Houston"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              Price *
            </label>
            <input
              type="number"
              required
              value={formData.public_price}
              onChange={(e) => setFormData({...formData, public_price: e.target.value})}
              placeholder="e.g., 2500000"
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              Investment Strategy
            </label>
            <select
              value={formData.public_strategy}
              onChange={(e) => setFormData({...formData, public_strategy: e.target.value})}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px'
              }}
            >
              <option value="Core">Core</option>
              <option value="Core+">Core+</option>
              <option value="Value-Add">Value-Add</option>
              <option value="Development">Development</option>
              <option value="Reposition">Reposition</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '12px 24px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: 'rgba(255,255,255,0.6)',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '12px 24px',
                background: submitting ? 'rgba(255, 0, 0, 0.3)' : 'linear-gradient(135deg, #ff0000 0%, #ff0000 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#000',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Upload size={18} />
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>

          {/* Info Notice */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.2)',
            borderRadius: '10px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '13px',
            lineHeight: '1.5'
          }}>
            <strong style={{ color: '#ff0000' }}>📋 Review Process:</strong><br />
            Your deal will be reviewed by our team before appearing in the Marketplace. You&apos;ll be notified once it&apos;s approved.
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublishDealModal;
