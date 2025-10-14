import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { ArrowLeft, Upload, FileText, Share2, DollarSign, Home, MapPin, Calendar, Users, Building2, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DealDetails = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDeal();
  }, [dealId]);

  const fetchDeal = async () => {
    try {
      const response = await axios.get(`${API}/deals/${dealId}`);
      setDeal(response.data);
    } catch (error) {
      toast.error('Failed to load deal');
      navigate('/deals');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/deals/${dealId}/upload-image`, formData);
      toast.success('Image uploaded successfully');
      fetchDeal();
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API}/deals/${dealId}/upload-document`, formData);
      toast.success('Document uploaded successfully');
      fetchDeal();
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/share/${dealId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const calculatePricePerSF = () => {
    if (!deal?.building_size || !deal?.asking_price) return 'N/A';
    return formatPrice(deal.asking_price / deal.building_size);
  };

  const calculatePricePerAcre = () => {
    const acres = deal?.lot_acres || deal?.lot_size;
    if (!acres || !deal?.asking_price) return 'N/A';
    return formatPrice(deal.asking_price / acres);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!deal) return null;

  return (
    <div style={{ background: '#000000', minHeight: '100vh' }}>
      {/* Full-Width Header */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '40px 0'
      }} data-testid="deal-details-page">
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 40px' }}>
          {/* Back Button */}
          <div className="flex items-center justify-start mb-6">
            <Button onClick={() => navigate('/deals')} variant="outline" data-testid="back-to-deals" style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              BACK TO PROPERTIES
            </Button>
          </div>

          {/* Property Address - Centered */}
          <h1 style={{ 
            color: '#FFFFFF', 
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: '700',
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            textAlign: 'center',
            lineHeight: '1.2'
          }}>
            {deal.property_address}
          </h1>

          {/* Asset Type Tag - Centered */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{
              padding: '10px 24px',
              background: getAssetTypeColor(deal.asset_type).bg,
              color: getAssetTypeColor(deal.asset_type).color,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              border: `1px solid ${getAssetTypeColor(deal.asset_type).border}`,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {deal.asset_type}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Image */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              {deal.primary_image_url ? (
                <img src={deal.primary_image_url} alt={deal.property_address} className="w-full h-96 object-cover" />
              ) : (
                <div className="w-full h-96 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="text-center">
                    <Home className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>No image uploaded</p>
                  </div>
                </div>
              )}
              <div className="p-6">
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                    <Upload className="w-5 h-5 mr-2" style={{ color: 'rgba(255,255,255,0.6)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Upload Property Image</span>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </div>
                </Label>
              </div>
            </div>

            {/* Core Information */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Core Information</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Deal Title</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.deal_title || deal.property_address}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Status</p>
                  <span style={{
                    padding: '6px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'inline-block'
                  }}>{deal.stage || deal.deal_status}</span>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Priority</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.priority || 'Medium'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Visibility</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.owner_visibility || 'Team'}</p>
                </div>
              </div>
            </div>

            {/* Property Facts */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Property Facts</h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Building Size</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.building_size ? `${deal.building_size.toLocaleString()} SF` : 'N/A'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Lot Size</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.lot_size ? `${deal.lot_size} acres` : 'N/A'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Year Built</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.year_built || 'N/A'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Zoning</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.zoning || 'N/A'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Occupancy</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.occupancy ? `${deal.occupancy}%` : 'N/A'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Parking</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.parking_spaces ? `${deal.parking_spaces} spaces` : 'N/A'}</p>
                </div>
              </div>
              {deal.key_features && (
                <div className="mt-6">
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>Key Features</p>
                  <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>{deal.key_features}</p>
                </div>
              )}
            </div>

            {/* Location & Market */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Location & Market</h3>
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Market</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.market || 'San Antonio'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Submarket</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.submarket || 'N/A'}</p>
                </div>
              </div>
              
              {/* Map */}
              <div className="h-64 rounded-lg overflow-hidden custom-dark-map">
                <MapContainer
                  center={[deal.latitude, deal.longitude]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                    maxZoom={19}
                  />
                  <Marker position={[deal.latitude, deal.longitude]} />
                </MapContainer>
              </div>
              <div className="flex items-start mt-3">
                <MapPin className="w-5 h-5 mr-2 mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{deal.property_address}</p>
              </div>
            </div>

            {/* Contacts & Activities */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <Users className="inline w-4 h-4 mr-2" />
                Contacts & Activities
              </h3>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Primary Contact</p>
                  <p style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '500' }}>{deal.primary_contact || 'Not assigned'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Last Contact</p>
                  <p style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '500' }}>
                    {deal.last_contact_date ? new Date(deal.last_contact_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Next Action</p>
                  <p style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '500' }}>{deal.next_action || 'None scheduled'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Next Action Date</p>
                  <p style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '500' }}>
                    {deal.next_action_date ? new Date(deal.next_action_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              
              {deal.notes && (
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>Internal Notes</p>
                  <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>{deal.notes}</p>
                </div>
              )}
            </div>

            {/* Dates & IDs */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <Calendar className="inline w-4 h-4 mr-2" />
                Important Dates & IDs
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Created Date</p>
                  <p style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '500' }}>
                    {deal.created_at ? new Date(deal.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Target Close</p>
                  <p style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '500' }}>
                    {deal.target_close_date ? new Date(deal.target_close_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                {deal.external_ids && (
                  <div className="col-span-2">
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>External IDs</p>
                    <p style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '500' }}>{deal.external_ids}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <FileCheck className="inline w-4 h-4 mr-2" />
                Documents & Media
              </h3>
              {deal.documents && deal.documents.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {deal.documents.map((doc, index) => (
                    <a
                      key={index}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-3 rounded-lg transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
                    >
                      <FileText className="w-5 h-5 mr-3" style={{ color: '#00b8d4' }} />
                      <span style={{ color: '#FFFFFF' }}>{doc.name}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>No documents uploaded yet.</p>
              )}
              <Label htmlFor="doc-upload" className="cursor-pointer">
                <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                  <Upload className="w-5 h-5 mr-2" style={{ color: 'rgba(255,255,255,0.6)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Upload Document (OM, Survey, etc.)</span>
                  <input
                    id="doc-upload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>
              </Label>
            </div>
          </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Share Button */}
          <Button onClick={handleShare} data-testid="share-deal-button" style={{
            background: '#00b8d4',
            color: '#000000',
            padding: '14px 24px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '600',
            fontSize: '15px',
            boxShadow: '0 4px 12px rgba(0, 184, 212, 0.3)',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease'
          }}>
            <Share2 className="w-5 h-5" />
            Share Property
          </Button>

          {/* Property Details Card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{ 
              color: '#FFFFFF', 
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '20px',
              letterSpacing: '-0.02em'
            }}>Property Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>BUILDING SIZE</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.building_size ? `${deal.building_size.toLocaleString()} SF` : 'N/A'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>PRICE</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{formatPrice(deal.asking_price)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>PROPERTY TYPE</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.asset_type}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>STATUS</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.stage}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{ 
              color: '#FFFFFF', 
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '20px',
              letterSpacing: '-0.02em'
            }}>Financials</h2>
            <div className="space-y-4">
              <div className="pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center mb-2">
                  <DollarSign className="w-5 h-5 mr-2" style={{ color: '#00b8d4' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Asking Price</p>
                </div>
                <p className="text-3xl font-bold" style={{ color: '#FFFFFF' }} data-testid="deal-asking-price">{formatPrice(deal.asking_price)}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Price per SF (Building)</p>
                <p className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>{calculatePricePerSF()}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Price per Acre</p>
                <p className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>{calculatePricePerAcre()}</p>
              </div>
              {deal.noi && (
                <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>NOI</p>
                  <p className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>{formatPrice(deal.noi)}</p>
                </div>
              )}
              {deal.cap_rate && (
                <div>
                  <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Cap Rate</p>
                  <p className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>{deal.cap_rate}%</p>
                </div>
              )}
              {deal.lease_type && (
                <div>
                  <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Lease Type</p>
                  <p className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>{deal.lease_type}</p>
                </div>
              )}
              {deal.proforma_notes && (
                <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Pro Forma Notes</p>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>{deal.proforma_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Location Map */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{ 
              color: '#FFFFFF', 
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              letterSpacing: '-0.02em'
            }}>Location</h2>
            <div className="h-64 rounded-lg overflow-hidden mb-3 custom-dark-map">
              <MapContainer
                center={[deal.latitude, deal.longitude]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                {/* OpenStreetMap with Dark Theme */}
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                  maxZoom={19}
                  className="custom-dark-map"
                />
                <Marker position={[deal.latitude, deal.longitude]} />
              </MapContainer>
            </div>
            <div className="flex items-start">
              <MapPin className="w-5 h-5 mr-2 mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>{deal.property_address}</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default DealDetails;
