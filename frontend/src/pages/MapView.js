import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl } from 'react-map-gl';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import 'maplibre-gl/dist/maplibre-gl.css';

const MapView = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [viewState, setViewState] = useState({
    longitude: -98.4936,
    latitude: 29.4241,
    zoom: 11.5
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const response = await axios.get(`${API}/deals`);
      setDeals(response.data);
    } catch (error) {
      toast.error('Failed to load deals');
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
      <div className="flex items-center justify-center h-full" style={{ background: 'var(--bg-base)' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="h-full relative" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute top-6 left-6 right-6 z-[1000] flex justify-between items-center">
        <div className="glass-surface px-6 py-4">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Property Map</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{deals.length} active deals</p>
        </div>
        <button
          onClick={() => navigate('/deals')}
          data-testid="view-all-deals-button"
          className="glass-surface px-5 py-3"
          style={{
            color: 'var(--accent)',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 150ms'
          }}
        >
          View All Deals
        </button>
      </div>

      <MapContainer
        center={[29.4241, -98.4936]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        data-testid="map-container"
      >
        {/* Esri Satellite Imagery Base */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri'
          maxZoom={19}
        />
        {/* Esri Reference Overlay - Street Names and Labels */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri'
          maxZoom={19}
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri'
          maxZoom={19}
        />
        
        {deals.map((deal) => (
          <Marker
            key={deal.id}
            position={[deal.latitude, deal.longitude]}
            eventHandlers={{
              click: () => navigate(`/deals/${deal.id}`),
            }}
          >
            <Popup>
              <div style={{ minWidth: '250px', background: 'var(--glass-bg)', color: 'var(--text-primary)' }}>
                {deal.primary_image_url && (
                  <img
                    src={deal.primary_image_url}
                    alt={deal.property_address}
                    style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }}
                  />
                )}
                <h3 style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px', color: 'var(--text-primary)' }}>{deal.property_address}</h3>
                <div style={{ marginBottom: '12px', fontSize: '14px' }}>
                  <p style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-primary)' }}>Type:</span> {deal.asset_type}
                  </p>
                  <p style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-primary)' }}>Price:</span> {formatPrice(deal.asking_price)}
                  </p>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-primary)' }}>Stage:</span>{' '}
                    <span style={{
                      padding: '4px 8px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: 'var(--accent)',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {deal.stage}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/deals/${deal.id}`)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
