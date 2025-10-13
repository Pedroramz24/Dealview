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
        },
        'carto-labels': {
          type: 'vector',
          tiles: ['https://basemaps.cartocdn.com/gl/voyager-gl-style/vector.json']
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
    street: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
  };

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
    <div className="h-full relative" style={{ background: 'var(--bg-base)' }}>
      <div className="absolute top-6 left-6 right-6 z-[1000] flex justify-between items-center">
        <div className="glass-surface px-6 py-4">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Property Map</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{deals.length} active deals</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowParcels(!showParcels)}
            className="glass-surface px-4 py-3"
            style={{
              color: showParcels ? 'white' : 'var(--text-primary)',
              backgroundColor: showParcels ? 'var(--accent)' : 'transparent',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms',
              fontSize: '14px'
            }}
          >
            📐 Parcels
          </button>
          <button
            onClick={() => setMapStyle(mapStyle === 'satellite' ? 'street' : 'satellite')}
            className="glass-surface px-4 py-3"
            style={{
              color: 'var(--text-primary)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms',
              fontSize: '14px'
            }}
          >
            {mapStyle === 'satellite' ? '🗺️ Street' : '🛰️ Satellite'}
          </button>
          <button
            onClick={fetchDeals}
            className="glass-surface px-4 py-3"
            style={{
              color: 'var(--accent)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms',
              fontSize: '14px'
            }}
          >
            Refresh
          </button>
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
      >
        <NavigationControl position="top-right" />
        <ScaleControl />

        {/* Regrid Parcel Layer */}
        {showParcels && (
          <Source
            id="parcels"
            type="vector"
            tiles={[`${API}/parcels/tiles/{z}/{x}/{y}`]}
            minzoom={12}
            maxzoom={18}
          >
            <Layer
              id="parcels-fill"
              type="fill"
              source-layer="parcels"
              paint={{
                'fill-color': 'rgba(59, 130, 246, 0.1)',
                'fill-outline-color': 'rgba(59, 130, 246, 0.8)'
              }}
            />
            <Layer
              id="parcels-line"
              type="line"
              source-layer="parcels"
              paint={{
                'line-color': '#3B82F6',
                'line-width': 1.5,
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}

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

        {selectedParcel && (
          <Popup
            longitude={selectedParcel.lngLat.lng}
            latitude={selectedParcel.lngLat.lat}
            anchor="bottom"
            onClose={() => setSelectedParcel(null)}
            closeButton={true}
            closeOnClick={false}
            style={{ maxWidth: '300px' }}
          >
            <div style={{ width: '280px', padding: '8px' }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#000',
                borderBottom: '2px solid #3B82F6',
                paddingBottom: '8px'
              }}>
                Parcel Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedParcel.properties.address && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '2px' }}>Address</div>
                    <div style={{ fontSize: '14px', color: '#000', fontWeight: '500' }}>{selectedParcel.properties.address}</div>
                  </div>
                )}
                {selectedParcel.properties.owner && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '2px' }}>Owner</div>
                    <div style={{ fontSize: '14px', color: '#000' }}>{selectedParcel.properties.owner}</div>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {selectedParcel.properties.acres && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '2px' }}>Size</div>
                      <div style={{ fontSize: '14px', color: '#000', fontWeight: '500' }}>{selectedParcel.properties.acres} acres</div>
                    </div>
                  )}
                  {selectedParcel.properties.zoning && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '2px' }}>Zoning</div>
                      <div style={{ fontSize: '14px', color: '#000', fontWeight: '500' }}>{selectedParcel.properties.zoning}</div>
                    </div>
                  )}
                </div>
                {selectedParcel.properties.parcelnumb && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '2px' }}>Parcel ID</div>
                    <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>{selectedParcel.properties.parcelnumb}</div>
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
