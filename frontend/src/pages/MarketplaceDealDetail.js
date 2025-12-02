import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, MessageCircle, ExternalLink } from 'lucide-react';
import { API } from '../App';
import { toast } from 'sonner';

const MarketplaceDealDetail = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchDealDetail();
  }, [dealId]);

  const fetchDealDetail = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No auth token');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API}/marketplace/deals/${dealId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch deal');
      
      const data = await response.json();
      setDeal(data.deal);
    } catch (error) {
      console.error('Error fetching deal:', error);
      toast.error('Failed to load deal details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeal = async () => {
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to save deals');
        return;
      }
      
      if (saved) {
        await fetch(`${API}/marketplace/deals/${dealId}/save`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        setSaved(false);
        toast.success('Deal removed from saved');
      } else {
        await fetch(`${API}/marketplace/deals/${dealId}/save`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ deal_id: dealId })
        });
        setSaved(true);
        toast.success('Deal saved!');
      }
    } catch (error) {
      toast.error('Failed to save deal');
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/marketplace/deals/${dealId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleOpenInWorkspace = () => {
    navigate(`/workspace/deals/${dealId}`);
  };

  const formatPrice = (price) => {
    if (!price) return 'Price on request';
    return `$${(price / 1000000).toFixed(2)}M`;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#000',
        color: '#fff'
      }}>
        Loading...
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#000',
        color: '#fff'
      }}>
        Deal not found
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      overflow: 'auto',
      background: '#000'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 32px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/marketplace')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <ArrowLeft size={20} />
            Back to Marketplace
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSaveDeal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: saved ? 'rgba(0, 212, 170, 0.15)' : 'rgba(255,255,255,0.05)',
                border: saved ? '1px solid rgba(0, 212, 170, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: saved ? '#00b8d4' : '#fff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Heart size={18} fill={saved ? '#00b8d4' : 'none'} />
              {saved ? 'Saved' : 'Save Deal'}
            </button>

            <button
              onClick={handleShare}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Share2 size={18} />
              Share
            </button>

            <button
              onClick={handleOpenInWorkspace}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <ExternalLink size={18} />
              Open in Workspace
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          {/* Left Column */}
          <div>
            {/* Hero Image */}
            <div style={{
              height: '500px',
              borderRadius: '20px',
              background: deal.image_url || deal.primary_image_url 
                ? `url(${deal.image_url || deal.primary_image_url})` 
                : 'linear-gradient(135deg, rgba(0, 184, 212, 0.2) 0%, rgba(0, 212, 170, 0.2) 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              marginBottom: '32px'
            }} />

            {/* Title & Info */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h1 style={{ 
                    color: '#fff', 
                    fontSize: '32px',
                    fontWeight: '700',
                    marginBottom: '8px'
                  }}>
                    {deal.title}
                  </h1>
                  <p style={{ 
                    color: 'rgba(255,255,255,0.6)', 
                    fontSize: '16px'
                  }}>
                    {deal.address}
                  </p>
                </div>
                <div style={{
                  background: 'rgba(0, 212, 170, 0.15)',
                  border: '1px solid rgba(0, 212, 170, 0.3)',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  color: '#00b8d4',
                  fontWeight: '600'
                }}>
                  {deal.public_asset_type || deal.asset_type}
                </div>
              </div>

              <div style={{ 
                color: '#00b8d4', 
                fontSize: '36px',
                fontWeight: '700',
                marginBottom: '24px'
              }}>
                {formatPrice(deal.public_price || deal.price)}
              </div>

              {deal.description && (
                <p style={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: '15px',
                  lineHeight: '1.6'
                }}>
                  {deal.description}
                </p>
              )}
            </div>

            {/* Property Facts */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                Property Facts
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                {deal.size && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>Size</div>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: '500' }}>{deal.size.toLocaleString()} sqft</div>
                  </div>
                )}
                {deal.lot_size && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>Lot Size</div>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: '500' }}>{deal.lot_size} acres</div>
                  </div>
                )}
                {deal.year_built && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>Year Built</div>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: '500' }}>{deal.year_built}</div>
                  </div>
                )}
                {deal.public_market && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>Market</div>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: '500' }}>{deal.public_market}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Broker Info */}
          <div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '24px',
              position: 'sticky',
              top: '100px'
            }}>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                Contact Broker
              </h3>

              <button
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #00b8d4 0%, #00b8d4 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#000',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}
              >
                <MessageCircle size={20} />
                Message Broker
              </button>

              {/* Stats */}
              <div style={{
                paddingTop: '20px',
                borderTop: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>Views</div>
                  <div style={{ color: '#fff', fontSize: '20px', fontWeight: '600' }}>
                    {deal.marketplace_views_count || 0}
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>Inquiries</div>
                  <div style={{ color: '#fff', fontSize: '20px', fontWeight: '600' }}>
                    {deal.marketplace_inquiries_count || 0}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>Saves</div>
                  <div style={{ color: '#fff', fontSize: '20px', fontWeight: '600' }}>
                    {deal.marketplace_saves_count || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceDealDetail;
