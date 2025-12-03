import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, MessageCircle, ExternalLink, Home, MapPin, DollarSign, FileText, Calendar, Building2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { API } from '../App';
import { toast } from 'sonner';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import MessagingPanel from '../components/MessagingPanel';
import NCNDSignatureModal from '../components/NCNDSignatureModal';
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
  const [showMessaging, setShowMessaging] = useState(false);

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
    <div style={{ background: 'transparent', minHeight: '100vh' }}>
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
            <button onClick={handleSaveDeal} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: saved ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255,255,255,0.05)', border: saved ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: saved ? '#00b8d4' : '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
              <Heart size={18} fill={saved ? '#00b8d4' : 'none'} />
              {saved ? 'Saved' : 'Save Deal'}
            </button>
            <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
              <Share2 size={18} />
              Share
            </button>
            <button onClick={handleOpenInWorkspace} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
              <ExternalLink size={18} />
              Open in Workspace
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '40px 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 40px' }}>
          <h1 style={{ color: '#FFFFFF', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: '700', letterSpacing: '-0.03em', marginBottom: '20px', textAlign: 'center', lineHeight: '1.2' }}>
            {deal.address || deal.title}
          </h1>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{ padding: '10px 24px', background: getAssetTypeColor(deal.public_asset_type || deal.asset_type).bg, color: getAssetTypeColor(deal.public_asset_type || deal.asset_type).color, borderRadius: '8px', fontSize: '14px', fontWeight: '600', border: `1px solid ${getAssetTypeColor(deal.public_asset_type || deal.asset_type).border}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Property Description
              </h3>
              {deal.description ? (
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', lineHeight: '1.6' }}>
                  {deal.description}
                </p>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontStyle: 'italic' }}>
                  No description available
                </p>
              )}
            </div>

            {/* Property Facts - ALWAYS SHOW */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Property Facts
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Building Size (SF)
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                    {deal.size ? deal.size?.toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Lot Size (Acres)
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                    {deal.lot_size || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Year Built
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                    {deal.year_built || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Zoning
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                    {deal.zoning || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Occupancy (%)
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                    {deal.occupancy || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Parking Spaces
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                    {deal.parking_spaces || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Key Features */}
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Key Features
                </div>
                <div style={{ color: '#FFFFFF', fontSize: '15px', lineHeight: '1.6' }}>
                  {deal.key_features || 'No key features listed'}
                </div>
              </div>
            </div>

            {/* Financials - ALWAYS SHOW */}
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
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    NOI
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                    {deal.noi ? `$${deal.noi?.toLocaleString()}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Cap Rate
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                    {deal.cap_rate ? `${deal.cap_rate}%` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Lease Type
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                    {deal.lease_type || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Price Per SF
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600' }}>
                    {deal.size && deal.price ? `$${((deal.public_price || deal.price) / deal.size).toFixed(2)}` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Important Dates - ALWAYS SHOW */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Important Dates & Details
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Target Close Date
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '500' }}>
                    {deal.target_close_date || 'Not set'}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Last Contact Date
                  </div>
                  <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '500' }}>
                    {deal.last_contact_date || 'No recent contact'}
                  </div>
                </div>
              </div>
              
              {deal.notes && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Notes
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.6' }}>
                    {deal.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Location Map - ALWAYS SHOW */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '24px', paddingBottom: '16px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Location & Market
                </h3>
              </div>
              {deal.latitude && deal.longitude ? (
                <div>
                  <MapContainer center={[deal.latitude, deal.longitude]} zoom={15} style={{ height: '400px', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
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
              ) : (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <MapPin className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>No location coordinates available</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Contact Broker Card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', position: 'sticky', top: '100px' }}>
              <h3 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600', marginBottom: '20px', letterSpacing: '-0.02em' }}>
                Contact Broker
              </h3>

              <button
                onClick={() => setShowMessaging(true)}
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

              {/* Broker Contact Info - Placeholder for now */}
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Broker Avatar */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(0, 184, 212, 0.2)',
                    border: '2px solid rgba(0, 184, 212, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: '600',
                    color: '#00b8d4'
                  }}>
                    BR
                  </div>
                </div>

                {/* Broker Name */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                    Broker Name
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                    Company Name
                  </div>
                </div>

                {/* Contact Details */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>Email</div>
                  <div style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '500' }}>
                    broker@company.com
                  </div>
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>Phone</div>
                  <div style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '500' }}>
                    (210) 555-0123
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messaging Panel */}
      {showMessaging && (
        <MessagingPanel
          dealId={dealId}
          dealTitle={deal.title || deal.address}
          brokerId={deal.owner_id}
          onClose={() => setShowMessaging(false)}
        />
      )}
    </div>
  );
};

export default MarketplaceDealDetail;
