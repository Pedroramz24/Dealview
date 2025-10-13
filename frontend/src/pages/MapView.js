import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
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

      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapLib={import('maplibre-gl')}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        data-testid="map-container"
      >
        <NavigationControl position="top-right" />
        <ScaleControl />

        {deals.map((deal) => (
          <Marker
            key={deal.id}
            longitude={deal.longitude}
            latitude={deal.latitude}
            anchor="bottom"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedDeal(deal);
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              background: 'var(--accent)',
              borderRadius: '50% 50% 50% 0',
              transform: 'rotate(-45deg)',
              border: '2px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ transform: 'rotate(45deg)', color: 'white', fontSize: '16px', fontWeight: 'bold' }}>
                $
              </div>
            </div>
          </Marker>
        ))}

        {selectedDeal && (
          <Popup
            longitude={selectedDeal.longitude}
            latitude={selectedDeal.latitude}
            anchor="bottom"
            onClose={() => setSelectedDeal(null)}
            closeButton={true}
            closeOnClick={false}
            style={{ maxWidth: '280px' }}
          >
            <div style={{ width: '250px', padding: '8px' }}>
              {selectedDeal.primary_image_url && (
                <img
                  src={selectedDeal.primary_image_url}
                  alt={selectedDeal.property_address}
                  style={{
                    width: '100%',
                    height: '120px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    marginBottom: '12px'
                  }}
                />
              )}
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '15px',
                fontWeight: '600',
                color: '#000'
              }}>
                {selectedDeal.property_address}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#666' }}>Type:</span>
                  <span style={{ color: '#000', fontWeight: '500' }}>{selectedDeal.asset_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#666' }}>Price:</span>
                  <span style={{ color: '#3B82F6', fontWeight: '600' }}>{formatPrice(selectedDeal.asking_price)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#666' }}>Stage:</span>
                  <span style={{
                    padding: '2px 8px',
                    background: '#EFF6FF',
                    color: '#3B82F6',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {selectedDeal.stage}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate(`/deals/${selectedDeal.id}`)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                View Details
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default MapView;
