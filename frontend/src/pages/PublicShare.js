import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { DollarSign, Home, MapPin, FileText, Download } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const PublicShare = () => {
  const { dealId } = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeal();
  }, [dealId]);

  const fetchDeal = async () => {
    try {
      const response = await axios.get(`${API}/share/${dealId}`);
      setDeal(response.data);
    } catch (error) {
      console.error('Failed to load deal', error);
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Deal not found</h1>
          <p style={{ color: 'var(--text-secondary)' }}>The property you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }} data-testid="public-share-page">
      {/* Header */}
      <div className="glass-surface py-6" style={{ borderRadius: 0 }}>
        <div className="max-w-7xl mx-auto px-8 flex items-center">
          <img 
            src="/dealview-logo-white.png" 
            alt="Dealview" 
            style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
          />
          <p style={{ color: 'var(--text-secondary)', marginLeft: '16px' }}>Property Listing</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image */}
            <div className="glass-surface overflow-hidden">
              {deal.primary_image_url ? (
                <img
                  src={deal.primary_image_url}
                  alt={deal.property_address}
                  className="w-full h-96 object-cover"
                />
              ) : (
                <div className="w-full h-96 flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                  <Home className="w-24 h-24" style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
            </div>

            {/* Property Info */}
            <div className="glass-surface p-8">
              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {deal.property_address}
              </h2>
              <p className="text-xl mb-6" style={{ color: 'var(--text-secondary)' }}>{deal.asset_type}</p>

              <div>
                <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Description</h3>
                <p style={{ color: 'var(--text-secondary)' }} className="leading-relaxed">{deal.description || 'No description available.'}</p>
              </div>
            </div>

            {/* Property Facts */}
            <div className="glass-surface p-8">
              <h3 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Property Facts</h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Building Size</p>
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {deal.building_size ? `${deal.building_size.toLocaleString()} sq ft` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Lot Size</p>
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {deal.lot_size ? `${deal.lot_size.toLocaleString()} sq ft` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Lot Acres</p>
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {deal.lot_acres ? `${deal.lot_acres.toLocaleString()} acres` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Occupancy</p>
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{deal.occupancy || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Documents */}
            {deal.documents && deal.documents.length > 0 && (
              <div className="glass-surface p-8">
                <h3 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Documents</h3>
                <div className="space-y-3">
                  {deal.documents.map((doc, index) => (
                    <a
                      key={index}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 border rounded-lg transition-colors"
                      style={{ borderColor: 'var(--glass-border)', background: 'var(--bg-elevated)' }}
                    >
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 mr-3" style={{ color: 'var(--accent)' }} />
                        <span style={{ color: 'var(--text-primary)' }} className="font-medium">{doc.name}</span>
                      </div>
                      <Download className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price */}
            <div className="glass-surface p-6">
              <div className="flex items-center mb-2">
                <DollarSign className="w-6 h-6 mr-2" style={{ color: 'var(--accent)' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Asking Price</p>
              </div>
              <p className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatPrice(deal.asking_price)}</p>
            </div>

            {/* Location */}
            <div className="glass-surface p-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Location</h3>
              <div className="h-64 rounded-lg overflow-hidden mb-4">
                <MapContainer
                  center={[deal.latitude, deal.longitude]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
                    subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                  />
                  <Marker position={[deal.latitude, deal.longitude]} />
                </MapContainer>
              </div>
              <div className="flex items-start">
                <MapPin className="w-5 h-5 mr-2 mt-0.5" style={{ color: 'var(--text-secondary)' }} />
                <p style={{ color: 'var(--text-secondary)' }}>{deal.property_address}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicShare;
