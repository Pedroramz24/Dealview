import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { ArrowLeft, Upload, FileText, Share2, DollarSign, Home, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

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
    if (!deal?.lot_acres || !deal?.asking_price) return 'N/A';
    return formatPrice(deal.asking_price / deal.lot_acres);
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
    <div className="p-8 max-w-7xl mx-auto" data-testid="deal-details-page">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={() => navigate('/deals')} variant="outline" data-testid="back-to-deals">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deals
          </Button>
          <div>
            <h1 className="text-4xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {deal.property_address}
            </h1>
            <p style={{ color: 'var(--text-secondary)' }} className="mt-1">{deal.asset_type} • {deal.stage}</p>
          </div>
        </div>
        <Button onClick={handleShare} className="bg-blue-600 hover:bg-blue-700" data-testid="share-deal-button">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Primary Image */}
          <div className="glass-surface overflow-hidden">
            {deal.primary_image_url ? (
              <img src={deal.primary_image_url} alt={deal.property_address} className="w-full h-96 object-cover rounded-t-lg" />
            ) : (
              <div className="w-full h-96 flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                <div className="text-center">
                  <Home className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No image uploaded</p>
                </div>
              </div>
            )}
            <div className="p-6">
              <Label htmlFor="image-upload" className="cursor-pointer">
                <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors" style={{ borderColor: 'var(--glass-border)' }}>
                  <Upload className="w-5 h-5 mr-2" style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Upload Property Image</span>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                    data-testid="upload-image-input"
                  />
                </div>
              </Label>
            </div>
          </div>

          {/* Description */}
          <div className="glass-surface p-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Description</h2>
            <p style={{ color: 'var(--text-secondary)' }} className="leading-relaxed">{deal.description || 'No description available.'}</p>
          </div>

          {/* Property Facts */}
          <div className="glass-surface p-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Property Facts</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Building Size</p>
                <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{deal.building_size ? `${deal.building_size.toLocaleString()} sq ft` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Lot Size</p>
                <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{deal.lot_size ? `${deal.lot_size.toLocaleString()} sq ft` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Lot Acres</p>
                <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{deal.lot_acres ? `${deal.lot_acres.toLocaleString()} acres` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Occupancy</p>
                <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{deal.occupancy || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="glass-surface p-6">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Documents</h2>
            {deal.documents && deal.documents.length > 0 ? (
              <div className="space-y-2">
                {deal.documents.map((doc, index) => (
                  <a
                    key={index}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 border rounded-lg transition-colors"
                    style={{ borderColor: 'var(--glass-border)', background: 'var(--bg-elevated)' }}
                  >
                    <FileText className="w-5 h-5 mr-3" style={{ color: 'var(--accent)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>{doc.name}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }} className="mb-4">No documents uploaded yet.</p>
            )}
            <Label htmlFor="doc-upload" className="cursor-pointer mt-4 block">
              <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors" style={{ borderColor: 'var(--glass-border)' }}>
                <Upload className="w-5 h-5 mr-2" style={{ color: 'var(--text-secondary)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Upload Document (OM, Survey, etc.)</span>
                <input
                  id="doc-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  disabled={uploading}
                  data-testid="upload-document-input"
                />
              </div>
            </Label>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financials */}
          <div className="glass-surface p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Financials</h2>
            <div className="space-y-4">
              <div className="pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center mb-2">
                  <DollarSign className="w-5 h-5 mr-2" style={{ color: 'var(--accent)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Asking Price</p>
                </div>
                <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }} data-testid="deal-asking-price">{formatPrice(deal.asking_price)}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Price per SF (Building)</p>
                <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{calculatePricePerSF()}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Price per Acre</p>
                <p className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{calculatePricePerAcre()}</p>
              </div>
            </div>
          </div>

          {/* Location Map */}
          <div className="glass-surface p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Location</h2>
            <div className="h-64 rounded-lg overflow-hidden mb-3">
              <MapContainer
                center={[deal.latitude, deal.longitude]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                {/* Esri Hybrid with illustreets */}
                <TileLayer
                  url="https://tiles.stadiamaps.com/tiles/stamen_toner_hybrid/{z}/{x}/{y}{r}.png"
                  attribution='&copy; Stadia Maps'
                  maxZoom={20}
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution='&copy; Esri'
                  maxZoom={19}
                />
                <Marker position={[deal.latitude, deal.longitude]} />
              </MapContainer>
            </div>
            <div className="flex items-start">
              <MapPin className="w-5 h-5 mr-2 mt-0.5" style={{ color: 'var(--text-secondary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>{deal.property_address}</p>
            </div>
          </div>

          {/* Notes */}
          <div className="glass-surface p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Notes</h2>
            <p style={{ color: 'var(--text-secondary)' }} className="leading-relaxed">{deal.notes || 'No notes added yet.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealDetails;
