import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, MessageCircle, ExternalLink, Home, MapPin, DollarSign } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { API } from '../App';
import { toast } from 'sonner';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff' }}>
        Loading...
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff' }}>
        Deal not found
      </div>
    );
  }

  return (
    <div style={{ background: '#000000', minHeight: '100vh' }}>
      {/* Header with Actions */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 40px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
          <button
            onClick={() => navigate('/marketplace')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.6)',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            <ArrowLeft size={16} />
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
                background: saved ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255,255,255,0.05)',
                border: saved ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: saved ? '#00b8d4' : '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
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
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
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
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <ExternalLink size={18} />
              Open in Workspace
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '40px 0'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 40px' }}>
          <h1 style={{ 
            color: '#FFFFFF', 
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: '700',
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            textAlign: 'center',
            lineHeight: '1.2'
          }}>
            {deal.address || deal.title}
          </h1>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{
              padding: '10px 24px',
              background: getAssetTypeColor(deal.public_asset_type || deal.asset_type).bg,
              color: getAssetTypeColor(deal.public_asset_type || deal.asset_type).color,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              border: `1px solid ${getAssetTypeColor(deal.public_asset_type || deal.asset_type).border}`,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {deal.public_asset_type || deal.asset_type}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Image */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              {deal.image_url ? (
                <img src={deal.image_url} alt={deal.title} className="w-full h-96 object-cover" />
              ) : (
                <div className="w-full h-96 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="text-center">
                    <Home className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.5)' }}>No image uploaded</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {deal.description && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                  Property Description
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', lineHeight: '1.6' }}>
                  {deal.description}
                </p>
              </div>
            )}

            {/* Property Facts */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Property Facts
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {deal.size && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Building Size (SF)
                    </div>
                    <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                      {deal.size?.toLocaleString()}
                    </div>
                  </div>
                )}
                {deal.lot_size && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Lot Size (Acres)
                    </div>
                    <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                      {deal.lot_size}
                    </div>
                  </div>
                )}
                {deal.year_built && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Year Built
                    </div>
                    <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                      {deal.year_built}
                    </div>
                  </div>
                )}
                {deal.zoning && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Zoning
                    </div>
                    <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                      {deal.zoning}
                    </div>
                  </div>
                )}
                {deal.occupancy && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Occupancy (%)
                    </div>
                    <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                      {deal.occupancy}
                    </div>
                  </div>
                )}
                {deal.parking_spaces && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Parking Spaces
                    </div>
                    <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                      {deal.parking_spaces}
                    </div>
                  </div>
                )}
              </div>

              {deal.key_features && (
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Key Features
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '15px', lineHeight: '1.6' }}>
                    {deal.key_features}
                  </div>
                </div>
              )}
            </div>

            {/* Financials */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Financials
              </h3>
              
              <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <DollarSign size={16} style={{ color: '#00b8d4' }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Asking Price
                  </span>
                </div>
                <div style={{ color: '#00b8d4', fontSize: '36px', fontWeight: '700' }}>
                  ${(deal.public_price || deal.price)?.toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {deal.noi && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      NOI
                    </div>
                    <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                      ${deal.noi?.toLocaleString()}
                    </div>
                  </div>
                )}
                {deal.cap_rate && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Cap Rate
                    </div>
                    <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                      {deal.cap_rate}%
                    </div>
                  </div>
                )}
                {deal.lease_type && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Lease Type
                    </div>
                    <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                      {deal.lease_type}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Map */}
            {deal.latitude && deal.longitude && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                <MapContainer
                  center={[deal.latitude, deal.longitude]}
                  zoom={15}
                  style={{ height: '400px', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <Marker position={[deal.latitude, deal.longitude]} />
                </MapContainer>
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                    <MapPin size={18} style={{ color: '#00b8d4', marginTop: '2px' }} />
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
                      {deal.address}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Contact Broker Card */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '24px',
              position: 'sticky',
              top: '100px'
            }}>
              <h3 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600', marginBottom: '20px', letterSpacing: '-0.02em' }}>
                Contact Broker
              </h3>

              <button
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#00b8d4',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#000',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0, 184, 212, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#009fb8';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 184, 212, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#00b8d4';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 184, 212, 0.3)';
                }}
              >
                <MessageCircle size={20} />
                Message Broker
              </button>

              {/* Stats */}
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Views
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '600' }}>
                    {deal.marketplace_views_count || 0}
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Inquiries
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '600' }}>
                    {deal.marketplace_inquiries_count || 0}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Saves
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '600' }}>
                    {deal.marketplace_saves_count || 0}
                  </div>
                </div>
              </div>

              {/* Market Info */}
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>Market</div>
                  <div style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: '500' }}>
                    {deal.public_market || deal.city || 'N/A'}
                  </div>
                </div>
                {deal.public_strategy && (
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>Strategy</div>
                    <div style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: '500' }}>
                      {deal.public_strategy}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceDealDetail;
