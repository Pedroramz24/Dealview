import React, { useState, useEffect } from 'react';
import { Heart, ExternalLink, Trash2 } from 'lucide-react';
import { API } from '../App';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getAssetTypeColor } from '../utils/assetTypeColors';

const SavedDealsPage = () => {
  const navigate = useNavigate();
  const [savedDeals, setSavedDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedDeals();
  }, []);

  const fetchSavedDeals = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      
      const response = await fetch(`${API}/marketplace/saved-deals`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch saved deals');
      
      const data = await response.json();
      setSavedDeals(data.saved_deals || []);
    } catch (error) {
      console.error('Error fetching saved deals:', error);
      toast.error('Failed to load saved deals');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (dealId, e) => {
    e.stopPropagation();
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      
      const response = await fetch(`${API}/marketplace/deals/${dealId}/save`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        toast.success('Deal removed from saved');
        fetchSavedDeals();
      }
    } catch (error) {
      toast.error('Failed to unsave deal');
    }
  };

  const handleDealClick = (dealId) => {
    navigate(`/marketplace/deals/${dealId}`);
  };

  return (
    <div style={{ background: 'transparent', minHeight: '100vh', padding: '40px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ color: '#fff', fontSize: '32px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Heart size={32} fill="#ff0000" color="#ff0000" />
            Saved Deals
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px' }}>
            Properties you've bookmarked from the Marketplace
          </p>
        </div>

        {/* Saved Deals Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.5)' }}>
            Loading saved deals...
          </div>
        ) : savedDeals.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '60px',
            textAlign: 'center'
          }}>
            <Heart size={48} style={{ color: 'rgba(255,255,255,0.3)', margin: '0 auto 16px' }} />
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              No saved deals yet
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
              Browse the marketplace and save deals to see them here
            </p>
            <button
              onClick={() => navigate('/marketplace')}
              style={{
                padding: '12px 24px',
                background: '#ff0000',
                border: 'none',
                borderRadius: '10px',
                color: '#000',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Browse Marketplace
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px'
          }}>
            {savedDeals.map((saved) => {
              const deal = saved.deal;
              if (!deal) return null;

              return (
                <div
                  key={saved.id}
                  onClick={() => handleDealClick(deal.id)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Saved Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(255, 0, 0, 0.9)',
                    backdropFilter: 'blur(8px)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    zIndex: 10
                  }}>
                    <Heart size={14} fill="#000" color="#000" />
                    <span style={{ color: '#000', fontSize: '12px', fontWeight: '600' }}>Saved</span>
                  </div>

                  {/* Unsave Button */}
                  <button
                    onClick={(e) => handleUnsave(deal.id, e)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(0,0,0,0.7)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(8px)',
                      zIndex: 10
                    }}
                  >
                    <Trash2 size={16} color="rgba(255,255,255,0.8)" />
                  </button>

                  {/* Deal Image */}
                  <div style={{
                    height: '200px',
                    background: deal.image_url 
                      ? `url(${deal.image_url})` 
                      : 'linear-gradient(135deg, rgba(255, 0, 0, 0.2) 0%, rgba(0, 212, 170, 0.2) 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }} />

                  {/* Deal Info */}
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                          {deal.title || deal.address}
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '8px' }}>
                          {deal.address}
                        </p>
                      </div>
                      <div style={{
                        background: 'rgba(255, 0, 0, 0.15)',
                        border: '1px solid rgba(255, 0, 0, 0.3)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: '#ff0000',
                        fontWeight: '600'
                      }}>
                        {deal.public_asset_type}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ color: '#ff0000', fontSize: '20px', fontWeight: '700' }}>
                        ${deal.public_price?.toLocaleString()}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                        {deal.public_market}
                      </span>
                    </div>

                    {saved.notes && (
                      <p style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '13px',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '8px',
                        marginBottom: '12px'
                      }}>
                        📝 {saved.notes}
                      </p>
                    )}

                    <div style={{
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.4)'
                    }}>
                      Saved {new Date(saved.saved_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedDealsPage;
