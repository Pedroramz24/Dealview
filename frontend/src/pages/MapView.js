import React, { useState, useEffect, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl, Source, Layer } from 'react-map-gl/maplibre';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import 'maplibre-gl/dist/maplibre-gl.css';

const MapView = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [parcels, setParcels] = useState(null);
  const [showParcels, setShowParcels] = useState(true);
  const [mapStyle, setMapStyle] = useState('satellite'); // 'satellite' or 'street'
  const [viewState, setViewState] = useState({
    longitude: -98.4936,
    latitude: 29.4241,
    zoom: 11.5
  });
  const mapRef = useRef();
  const navigate = useNavigate();

  // Map style configurations
  const mapStyles = {
    satellite: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: '&copy; Esri'
        }
      },
      layers: [
        {
          id: 'satellite',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    },
    street: {
      version: 8,
      sources: {
        'osm-dark': {
          type: 'raster',
          tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm-dark-layer',
          type: 'raster',
          source: 'osm-dark',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  useEffect(() => {
    if (showParcels && viewState.zoom >= 12) {
      fetchParcels();
    }
  }, [viewState.zoom, viewState.latitude, viewState.longitude, showParcels]);

  const fetchParcels = async () => {
    if (viewState.zoom < 12) return;
    
    try {
      const token = localStorage.getItem('token');
      const z = Math.floor(viewState.zoom);
      const x = Math.floor((viewState.longitude + 180) / 360 * Math.pow(2, z));
      const y = Math.floor((1 - Math.log(Math.tan(viewState.latitude * Math.PI / 180) + 1 / Math.cos(viewState.latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
      
      const response = await axios.get(`${API}/parcels/tiles/${z}/${x}/${y}.geojson`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setParcels(response.data);
    } catch (error) {
      console.error('Error fetching parcels:', error);
      if (error.response?.status === 404) {
        setParcels({ type: 'FeatureCollection', features: [] });
      }
    }
  };

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

  const handleMapClick = async (event) => {
    if (!showParcels) return;
    
    const features = mapRef.current?.queryRenderedFeatures(event.point, {
      layers: ['parcels-fill', 'parcels-line']
    });

    if (features && features.length > 0) {
      const parcel = features[0];
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API}/parcels/search?lat=${event.lngLat.lat}&lon=${event.lngLat.lng}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data && response.data.features && response.data.features.length > 0) {
          setSelectedParcel({
            ...response.data.features[0],
            lngLat: event.lngLat
          });
        }
      } catch (error) {
        console.error('Error fetching parcel details:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'var(--bg-base)' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="h-full relative" style={{ background: '#000000' }}>
      {/* Map Controls - Top Right */}
      <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-3">
        <button
          onClick={() => setShowParcels(!showParcels)}
          className="premium-glass-btn"
          style={{
            color: showParcels ? '#000000' : '#FFFFFF',
            backgroundColor: showParcels ? '#00b8d4' : 'transparent',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '14px',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.3s ease',
            boxShadow: showParcels ? '0 4px 12px rgba(0,184,212,0.3)' : '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          Parcels
        </button>
        <button
          onClick={() => setMapStyle(mapStyle === 'satellite' ? 'street' : 'satellite')}
          className="premium-glass-btn"
          style={{
            color: '#FFFFFF',
            backgroundColor: 'rgba(255,255,255,0.05)',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '14px',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          {mapStyle === 'satellite' ? 'Street' : 'Satellite'}
        </button>
      </div>

      {/* Info Panel - Top Left */}
      <div className="absolute top-6 left-6 z-[1000]">
        <div className="premium-glass-card" style={{
          padding: '20px 24px',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(255,255,255,0.05)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
        }}>
          <h2 className="text-2xl font-bold" style={{ color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '4px' }}>Property Map</h2>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{deals.length} active deals</p>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="absolute bottom-6 right-6 z-[1000] flex gap-3">
        <button
          onClick={fetchDeals}
          className="premium-glass-btn"
          style={{
            color: '#00b8d4',
            backgroundColor: 'rgba(255,255,255,0.05)',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '14px',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          Refresh
        </button>
        <button
          onClick={() => navigate('/deals')}
          data-testid="view-all-deals-button"
          className="premium-glass-btn"
          style={{
            color: '#00b8d4',
            backgroundColor: 'rgba(255,255,255,0.05)',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '14px',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          View All Deals
        </button>
      </div>

      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyles[mapStyle]}
        data-testid="map-container"
        ref={mapRef}
        interactiveLayerIds={showParcels ? ['parcels-fill', 'parcels-line'] : []}
        className={mapStyle === 'street' ? 'custom-dark-map' : ''}
      >
        <NavigationControl position="top-right" />
        <ScaleControl />

        {/* Regrid Parcel Layer */}
        {showParcels && parcels && viewState.zoom >= 12 && (
          <Source
            id="parcels"
            type="geojson"
            data={parcels}
          >
            <Layer
              id="parcels-fill"
              type="fill"
              paint={{
                'fill-color': 'rgba(59, 130, 246, 0.15)',
                'fill-outline-color': '#3B82F6'
              }}
            />
            <Layer
              id="parcels-line"
              type="line"
              paint={{
                'line-color': '#3B82F6',
                'line-width': 2,
                'line-opacity': 0.9
              }}
            />
          </Source>
        )}

        {deals.map((deal) => (
          <Marker
            key={deal.id}
            longitude={deal.longitude}
            latitude={deal.latitude}
            anchor="center"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedDeal(deal);
              // Auto-center and zoom to the clicked pin
              setViewState({
                longitude: deal.longitude,
                latitude: deal.latitude,
                zoom: 15,
                transitionDuration: 1000
              });
            }}
          >
            <div className="map-marker" style={{
              position: 'relative',
              width: '48px',
              height: '48px',
              cursor: 'pointer',
              transition: 'transform 0.3s ease'
            }}>
              {/* Pulsing outer ring - brighter when selected */}
              <div className="marker-pulse" style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: selectedDeal?.id === deal.id ? 'rgba(0, 184, 212, 0.5)' : 'rgba(0, 184, 212, 0.3)',
                animation: 'pulse 2s ease-out infinite'
              }}></div>
              {/* Main marker circle with border for selected state */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#00b8d4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                border: selectedDeal?.id === deal.id ? '3px solid #ffffff' : 'none',
                boxShadow: selectedDeal?.id === deal.id 
                  ? '0 0 0 4px rgba(0, 184, 212, 0.4), 0 4px 12px rgba(0, 184, 212, 0.6)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>
                {/* Center white dot */}
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#ffffff'
                }}></div>
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
            closeButton={false}
            closeOnClick={false}
            style={{ maxWidth: '300px' }}
          >
            <div style={{ 
              width: '280px', 
              padding: '20px',
              background: '#1A1A1A',
              borderRadius: '12px',
              position: 'relative'
            }}>
              {/* Custom close button - top left */}
              <button
                onClick={() => setSelectedDeal(null)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  zIndex: 10
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                ×
              </button>
              
              {selectedDeal.primary_image_url && (
                <img
                  src={selectedDeal.primary_image_url}
                  alt={selectedDeal.property_address}
                  style={{
                    width: '100%',
                    height: '140px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}
                />
              )}
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#FFFFFF',
                letterSpacing: '-0.02em'
              }}>
                {selectedDeal.property_address}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#B3B3B3' }}>Type:</span>
                  <span style={{ color: '#FFFFFF', fontWeight: '500' }}>{selectedDeal.asset_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#B3B3B3' }}>Price:</span>
                  <span style={{ color: '#00b8d4', fontWeight: '600' }}>{formatPrice(selectedDeal.asking_price)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#B3B3B3' }}>Stage:</span>
                  <span style={{
                    padding: '4px 12px',
                    background: 'rgba(0, 184, 212, 0.15)',
                    color: '#00b8d4',
                    borderRadius: '6px',
                    fontSize: '13px',
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
                  padding: '12px',
                  background: '#FFFFFF',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#e6e6e6'}
                onMouseLeave={(e) => e.target.style.background = '#FFFFFF'}
              >
                View Details
              </button>
            </div>
          </Popup>
        )}

        {selectedParcel && (
          <Popup
            longitude={selectedParcel.lngLat.lng}
            latitude={selectedParcel.lngLat.lat}
            anchor="bottom"
            onClose={() => setSelectedParcel(null)}
            closeButton={false}
            closeOnClick={false}
            style={{ maxWidth: '320px' }}
          >
            <div style={{ 
              width: '300px', 
              padding: '20px',
              background: '#1A1A1A',
              borderRadius: '12px',
              position: 'relative'
            }}>
              {/* Custom close button - top left */}
              <button
                onClick={() => setSelectedParcel(null)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  zIndex: 10
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
              >
                ×
              </button>

              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#FFFFFF',
                borderBottom: '2px solid #00b8d4',
                paddingBottom: '12px',
                letterSpacing: '-0.02em'
              }}>
                Parcel Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedParcel.properties.address && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#808080', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '500' }}>Address</div>
                    <div style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '500' }}>{selectedParcel.properties.address}</div>
                  </div>
                )}
                {selectedParcel.properties.owner && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#808080', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '500' }}>Owner</div>
                    <div style={{ fontSize: '15px', color: '#B3B3B3' }}>{selectedParcel.properties.owner}</div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {selectedParcel.properties.acres && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#808080', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '500' }}>Size</div>
                      <div style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '500' }}>{selectedParcel.properties.acres} acres</div>
                    </div>
                  )}
                  {selectedParcel.properties.zoning && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#808080', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '500' }}>Zoning</div>
                      <div style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: '500' }}>{selectedParcel.properties.zoning}</div>
                    </div>
                  )}
                </div>
                {selectedParcel.properties.parcelnumb && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#808080', textTransform: 'uppercase', marginBottom: '4px', fontWeight: '500' }}>Parcel ID</div>
                    <div style={{ fontSize: '13px', color: '#B3B3B3', fontFamily: 'monospace' }}>{selectedParcel.properties.parcelnumb}</div>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default MapView;
