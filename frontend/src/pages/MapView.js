import React, { useState, useEffect, useRef, useContext } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl, Source, Layer } from 'react-map-gl/maplibre';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { toast } from 'sonner';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import { MapLayerProvider } from '../contexts/MapLayerContext';
import LayerManager from '../components/LayerManager';
import PropertyIntelligencePanel from '../components/PropertyIntelligencePanel';
import CreateDealPanel from '../components/CreateDealPanel';
import ParcelPopup from '../components/ParcelPopup';
import AIResearchPanel from '../components/AIResearchPanel';
import reportallService from '../services/reportallService';
import REPORTALL_CONFIG from '../config/reportall';
import 'maplibre-gl/dist/maplibre-gl.css';

const MapView = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [parcels, setParcels] = useState(null);
  const [showParcels, setShowParcels] = useState(false);
  const [mapStyle, setMapStyle] = useState('satellite'); // 'satellite' or 'street'
  const [identifyTooltip, setIdentifyTooltip] = useState(null); // For layer feature tooltips
  const [showReportAllParcels, setShowReportAllParcels] = useState(false); // OFF by default
  const [reportAllParcel, setReportAllParcel] = useState(null);
  const [showStreetLabels, setShowStreetLabels] = useState(false); // Street labels toggle
  const [selectedParcelId, setSelectedParcelId] = useState(null); // Track selected parcel for highlighting
  
  // Panel Management System - Independent panel states
  const [propertyPanelOpen, setPropertyPanelOpen] = useState(false);
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [actionsPanelOpen, setActionsPanelOpen] = useState(false);
  const [createDealPanelOpen, setCreateDealPanelOpen] = useState(false);
  const [aiResearchPanelOpen, setAiResearchPanelOpen] = useState(false);
  
  // Measurement tools
  const [measurementMode, setMeasurementMode] = useState(null); // 'area' or 'distance' or null
  
  const [propertyPanelData, setPropertyPanelData] = useState(null); // Data for property panel (deal or parcel)
  const [actionsPanelData, setActionsPanelData] = useState(null); // Data for actions panel
  const [createDealLocation, setCreateDealLocation] = useState(null); // Location for new deal
  const [createDealParcelData, setCreateDealParcelData] = useState(null); // Parcel data for new deal
  
  const { user } = useContext(AuthContext);
  const [viewState, setViewState] = useState({
    longitude: -98.4936,
    latitude: 29.4241,
    zoom: 11.5
  });
  const mapRef = useRef();
  const navigate = useNavigate();
  
  // Add street labels to map - using proper event listeners
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current.getMap();
    if (!map) return;
    
    const sourceId = 'osm-street-labels';
    const shouldShowLabels = showStreetLabels && mapStyle === 'satellite' && viewState.zoom >= 12;
    
    const addStreetLabels = () => {
      try {
        // Remove existing layers/source first
        if (map.getLayer('street-labels-text')) {
          map.removeLayer('street-labels-text');
        }
        if (map.getLayer('street-lines')) {
          map.removeLayer('street-lines');
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }

        if (!shouldShowLabels) return;

        // Add OSM Shortbread vector tile source
        map.addSource(sourceId, {
          type: 'vector',
          tiles: [
            'https://tiles.openstreetmap.org/{z}/{x}/{y}.vector.pbf'
          ],
          minzoom: 0,
          maxzoom: 14,
          attribution: '© OpenStreetMap contributors'
        });
        console.log('[MapView] ✅ Added OSM Shortbread vector tile source');
        
        // Add street lines layer (subtle white lines)
        map.addLayer({
          id: 'street-lines',
          type: 'line',
          source: sourceId,
          'source-layer': 'streets',
          filter: ['in', ['get', 'kind'], ['literal', ['highway', 'major_road', 'minor_road']]],
          paint: {
            'line-color': '#ffffff',
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              12, 0.5,
              16, 2,
              20, 4
            ],
            'line-opacity': 0.4
          }
        });
        console.log('[MapView] ✅ Added street lines layer');
        
        // Add street labels layer (Shortbread schema)
        map.addLayer({
          id: 'street-labels-text',
          type: 'symbol',
          source: sourceId,
          'source-layer': 'street_labels',
          filter: ['has', 'name'],
          layout: {
            'text-field': ['get', 'name'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              12, 9,
              16, 12,
              20, 16
            ],
            'text-font': ['Noto Sans Regular'],
            'symbol-placement': 'line',
            'text-rotation-alignment': 'map',
            'text-pitch-alignment': 'viewport',
            'text-max-angle': 30,
            'text-padding': 2
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(0, 0, 0, 0.9)',
            'text-halo-width': 2,
            'text-halo-blur': 0.5
          }
        });
        console.log('[MapView] ✅ Added street labels layer (Shortbread schema)');
      } catch (error) {
        console.error('[MapView] ❌ Error adding street labels:', error);
      }
    };

    // Use styledata event for reliable layer addition
    const handleStyleData = () => {
      if (map.isStyleLoaded()) {
        addStreetLabels();
      }
    };

    // Listen for style load completion
    map.on('styledata', handleStyleData);
    map.on('idle', handleStyleData);
    
    // Initial call if style is already loaded
    if (map.isStyleLoaded()) {
      addStreetLabels();
    }

    // Cleanup
    return () => {
      map.off('styledata', handleStyleData);
      map.off('idle', handleStyleData);
    };
  }, [showStreetLabels, mapStyle, viewState.zoom]);
  
  // Load panel state from session storage
  useEffect(() => {
    const savedPanelState = sessionStorage.getItem('mapActivePanels');
    if (savedPanelState) {
      try {
        const parsed = JSON.parse(savedPanelState);
        if (parsed.propertyPanelOpen) setPropertyPanelOpen(parsed.propertyPanelOpen);
        if (parsed.layersPanelOpen) setLayersPanelOpen(parsed.layersPanelOpen);
      } catch (e) {
        console.error('Failed to parse saved panel state:', e);
      }
    }
  }, []);
  
  // Save panel state to session storage
  useEffect(() => {
    sessionStorage.setItem('mapActivePanels', JSON.stringify({ 
      propertyPanelOpen, 
      layersPanelOpen 
    }));
  }, [propertyPanelOpen, layersPanelOpen]);
  
  // Panel toggle functions
  const togglePropertyPanel = (data = null) => {
    if (propertyPanelOpen && !data) {
      setPropertyPanelOpen(false);
      setPropertyPanelData(null);
      setCreateDealPanelOpen(false); // Close create deal if switching
      setSelectedParcelId(null); // Clear selected parcel
    } else {
      setPropertyPanelOpen(true);
      setPropertyPanelData(data);
      setCreateDealPanelOpen(false); // Close create deal if opening property
    }
  };
  
  const toggleLayersPanel = () => {
    setLayersPanelOpen(!layersPanelOpen);
  };
  
  const toggleActionsPanel = (data = null) => {
    if (actionsPanelOpen && !data) {
      setActionsPanelOpen(false);
      setActionsPanelData(null);
    } else {
      setActionsPanelOpen(true);
      setActionsPanelData(data);
    }
  };
  
  const openCreateDealPanel = (location, parcelData = null) => {
    setCreateDealPanelOpen(true);
    setPropertyPanelOpen(false); // Close property if opening create
    setCreateDealLocation(location);
    setCreateDealParcelData(parcelData);
  };
  
  const closeCreateDealPanel = () => {
    setCreateDealPanelOpen(false);
    setCreateDealLocation(null);
    setCreateDealParcelData(null);
  };
  
  const handleDealCreated = async (newDeal) => {
    // Refresh deals list
    await fetchDeals();
    // Open the newly created deal in property panel
    togglePropertyPanel(newDeal);
  };
  
  // Expose panel toggles to window for external access if needed
  useEffect(() => {
    window.toggleLayersPanel = toggleLayersPanel;
    return () => {
      delete window.toggleLayersPanel;
    };
  }, [layersPanelOpen]);

  // Map style configurations
  const mapStyles = {
    satellite: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          maxzoom: 18,
          attribution: '&copy; Esri'
        },
        'osm-labels': {
          type: 'vector',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.pbf'],
          maxzoom: 14
        }
      },
      layers: [
        {
          id: 'satellite',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 18
        }
      ]
    },
    street: {
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm-layer',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19
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
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[MapView] Fetching deals for user:', user.id);
      
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MapView] Supabase error:', error);
        throw error;
      }

      console.log('[MapView] Fetched deals:', data?.length || 0);
      setDeals(data || []);
    } catch (error) {
      console.error('[MapView] Error loading deals:', error);
      // Don't show toast for empty results
      if (error.code !== 'PGRST116') {
        toast.error('Failed to load deals');
      }
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


  // Handle clicks on GIS layers for identify
  // Commented out for simplified layer implementation
  // const handleGISLayerClick = async (event) => {
  //   // Check if any loaded layers have features at this point
  //   if (loadedLayers.size === 0) return;
  //
  //   const [lon, lat] = [event.lngLat.lng, event.lngLat.lat];
  //   
  //   // Try to identify features from each loaded layer
  //   for (const layerId of loadedLayers) {
  //     try {
  //       const result = await identifyFeatures(layerId, lat, lon);
  //       if (result && result.features && result.features.length > 0) {
  //         // Show tooltip with feature data
  //         setIdentifyTooltip({
  //           layerName: result.layer_name,
  //           features: result.features,
  //           position: [lon, lat],
  //         });
  //         break; // Show first match
  //       }
  //     } catch (error) {
  //       console.error(`Error identifying features for ${layerId}:`, error);
  //     }
  //   }
  // };

  // Map click handler - queries ReportAll for parcel data OR opens create deal panel
  const combinedMapClick = async (event) => {
    // Clear previous states
    setIdentifyTooltip(null);
    setReportAllParcel(null);
    
    // Only query ReportAll parcels if zoom level is 14+ and parcels are shown
    const map = mapRef.current?.getMap();
    if (map && map.getZoom() >= REPORTALL_CONFIG.minZoom && showReportAllParcels) {
      console.log('[ReportAll] Querying parcel at:', event.lngLat);
      
      const result = await reportallService.queryByPoint(
        event.lngLat.lng,
        event.lngLat.lat
      );
      
      if (result.success && result.parcel) {
        console.log('[ReportAll] Found parcel:', result.parcel);
        console.log('[ReportAll] Available fields:', Object.keys(result.parcel));
        
        // Set selected parcel for highlighting
        const parcelIdForHighlight = result.parcel.robust_id || result.parcel.parcel_id;
        console.log('[ReportAll] Setting selected parcel ID for highlighting:', parcelIdForHighlight);
        setSelectedParcelId(parcelIdForHighlight);
        
        // Show parcel information in PropertyIntelligencePanel
        const parcelData = {
          ...result.parcel,
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng,
          isParcel: true // Flag to identify this is parcel data, not a deal
        };
        togglePropertyPanel(parcelData);
        return;
      }
    }
    
    // If no parcel found or parcels not shown, do nothing (don't auto-open create deal panel)
    // User must explicitly click a button to create a deal
    console.log('[MapView] Map clicked - no action (parcel not found or parcels disabled)');
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'var(--bg-base)' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <MapLayerProvider mapRef={mapRef}>
      <div className="h-full relative" style={{ background: '#000000' }}>
        {/* Property Intelligence Panel (LEFT) */}
        <PropertyIntelligencePanel
          isOpen={propertyPanelOpen}
          onClose={() => {
            setPropertyPanelOpen(false);
            setPropertyPanelData(null);
          }}
          data={propertyPanelData}
          type={propertyPanelData?.isParcel ? 'parcel' : 'deal'}
          onCreateDeal={(parcelData) => {
            // Close property panel and open create deal panel with parcel data
            setPropertyPanelOpen(false);
            setPropertyPanelData(null);
            openCreateDealPanel(
              { lat: parcelData.latitude, lng: parcelData.longitude },
              parcelData
            );
          }}
        />
        
        {/* Create Deal Panel (LEFT - same slot as Property Panel) */}
        <CreateDealPanel
          isOpen={createDealPanelOpen}
          onClose={closeCreateDealPanel}
          location={createDealLocation}
          parcelData={createDealParcelData}
          onDealCreated={handleDealCreated}
        />
        
        {/* Layer Manager Panel (MIDDLE - next to Property/Create panel) */}
        <LayerManager
          isOpen={layersPanelOpen}
          onClose={() => setLayersPanelOpen(false)}
          showStreetLabels={showStreetLabels}
          onToggleStreetLabels={() => setShowStreetLabels(!showStreetLabels)}
          showParcels={showReportAllParcels}
          onToggleParcels={() => setShowReportAllParcels(!showReportAllParcels)}
          mapStyle={mapStyle}
          onToggleMapStyle={() => setMapStyle(mapStyle === 'satellite' ? 'street' : 'satellite')}
          currentZoom={viewState.zoom}
          propertyPanelOpen={propertyPanelOpen || createDealPanelOpen}
          measurementMode={measurementMode}
          onSetMeasurementMode={setMeasurementMode}
        />

        {/* AI Research Panel (Opens at 1000px - third panel) */}
        <AIResearchPanel
          isOpen={aiResearchPanelOpen}
          onClose={() => setAiResearchPanelOpen(false)}
        />

        {/* Panel Toggle Buttons - Overlaps panel edge to eliminate gap */}
        <div 
          className="absolute top-6 z-[900] flex flex-col gap-3"
          style={{
            left: (() => {
              const leftPanelOpen = propertyPanelOpen || createDealPanelOpen;
              
              if (leftPanelOpen) {
                // Property or Create panel is open (leftmost panel)
                // Button overlaps panel edge significantly to eliminate gap
                return '492px';
              } else if (layersPanelOpen && !leftPanelOpen) {
                // Only layers panel open (it becomes the leftmost)
                return '372px';
              } else {
                // No panels open: far left
                return '24px';
              }
            })(),
            transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <button
            onClick={() => toggleLayersPanel()}
            className="premium-glass-btn"
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: layersPanelOpen ? '#00d4aa' : '#FFFFFF',
              backgroundColor: layersPanelOpen ? 'rgba(0, 184, 212, 0.2)' : 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              borderRadius: '12px',
              border: `1px solid ${layersPanelOpen ? 'rgba(0, 184, 212, 0.4)' : 'rgba(255,255,255,0.15)'}`,
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s ease',
              boxShadow: layersPanelOpen ? '0 0 24px rgba(0, 184, 212, 0.3)' : '0 2px 8px rgba(0,0,0,0.3)'
            }}
            title="Layers & Intelligence"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </button>

          {/* AI Research Button */}
          <button
            onClick={() => setAiResearchPanelOpen(!aiResearchPanelOpen)}
            className="premium-glass-btn"
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: aiResearchPanelOpen ? '#d946ef' : '#FFFFFF',
              backgroundColor: aiResearchPanelOpen ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              borderRadius: '12px',
              border: `1px solid ${aiResearchPanelOpen ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255,255,255,0.15)'}`,
              backdropFilter: 'blur(12px)',
              transition: 'all 0.3s ease',
              boxShadow: aiResearchPanelOpen ? '0 0 24px rgba(168, 85, 247, 0.3)' : '0 2px 8px rgba(0,0,0,0.3)'
            }}
            title="AI Market Research"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
            </svg>
          </button>
        </div>

        {/* Map Controls - Top Right - Removed Street/Satellite button (moved to Layer Manager) */}

        <div className={mapStyle === 'street' ? 'custom-dark-map' : ''} style={{ width: '100%', height: '100%' }}>
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            onClick={combinedMapClick}
            style={{ width: '100%', height: '100%', willChange: 'transform' }}
            mapStyle={mapStyles[mapStyle]}
            data-testid="map-container"
            ref={mapRef}
            interactiveLayerIds={showParcels ? ['parcels-fill', 'parcels-line'] : []}
            dragRotate={false}
            touchZoomRotate={false}
            dragPan={{ inertia: 500 }}
            maxZoom={19}
          >
          <NavigationControl position="top-right" />
          <ScaleControl />

          {/* ReportAll Parcel Vector Tiles Layer */}
          {showReportAllParcels && viewState.zoom >= REPORTALL_CONFIG.minZoom && (
            <Source
              id="reportall-parcels"
              type="vector"
              tiles={[REPORTALL_CONFIG.vectorTilesUrl]}
              minzoom={REPORTALL_CONFIG.minZoom}
              maxzoom={REPORTALL_CONFIG.maxZoom}
              promoteId={{ parcels: 'robust_id' }}
              scheme="xyz"
              tileSize={512}
            >
              <Layer
                id="reportall-parcels-fill"
                type="fill"
                source-layer="parcels"
                paint={{
                  'fill-color': [
                    'case',
                    ['==', ['get', 'robust_id'], selectedParcelId || ''],
                    '#FF0000', // Red for selected parcel
                    REPORTALL_CONFIG.style.parcelFill.color // Default cyan
                  ],
                  'fill-opacity': [
                    'case',
                    ['==', ['get', 'robust_id'], selectedParcelId || ''],
                    0.4, // Higher opacity for selected
                    REPORTALL_CONFIG.style.parcelFill.opacity
                  ],
                }}
                beforeId="reportall-parcels-line"
              />
              <Layer
                id="reportall-parcels-line"
                type="line"
                source-layer="parcels"
                paint={{
                  'line-color': [
                    'case',
                    ['==', ['get', 'robust_id'], selectedParcelId || ''],
                    '#FF0000', // Bold red for selected parcel
                    REPORTALL_CONFIG.style.parcelLine.color
                  ],
                  'line-width': [
                    'case',
                    ['==', ['get', 'robust_id'], selectedParcelId || ''],
                    4, // Thicker line for selected (increased from 3)
                    REPORTALL_CONFIG.style.parcelLine.width
                  ],
                  'line-opacity': [
                    'case',
                    ['==', ['get', 'robust_id'], selectedParcelId || ''],
                    1, // Full opacity for selected
                    REPORTALL_CONFIG.style.parcelLine.opacity
                  ],
                }}
              />
            </Source>
          )}

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
              anchor="bottom"
              onClick={e => {
                e.originalEvent.stopPropagation();
                // Open property panel with deal data
                togglePropertyPanel(deal);
                
                // Use map's flyTo for better centering with panel
                if (mapRef.current) {
                  mapRef.current.flyTo({
                    center: [deal.longitude, deal.latitude],
                    zoom: 15,
                    duration: 1000,
                    essential: true,
                    // Offset to account for panel on left
                    offset: [150, 0]
                  });
                }
              }}
            >
              <div className="map-marker" style={{
                position: 'relative',
                width: '48px',
                height: '48px',
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                filter: selectedDeal?.id === deal.id 
                  ? 'drop-shadow(0 4px 12px rgba(0, 184, 212, 0.6))' 
                  : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))'
              }}>
                {/* Pulsing outer ring - brighter when selected */}
                <div className="marker-pulse" style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: selectedDeal?.id === deal.id ? 'rgba(0, 184, 212, 0.5)' : 'rgba(0, 184, 212, 0.3)',
                  animation: 'pulse 2s ease-out infinite'
                }}></div>
                {/* Main marker circle with border for selected state */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#00b8d4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  border: selectedDeal?.id === deal.id ? '3px solid #ffffff' : 'none'
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
              offset={[0, -10]}
              maxWidth="320px"
            >
              <div style={{ 
                width: '300px', 
                padding: '20px',
                background: '#1A1A1A',
                borderRadius: '12px',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
              }}>
                {/* Custom close button - top right */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDeal(null);
                  }}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
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
                    fontSize: '20px',
                    lineHeight: '1',
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
                  letterSpacing: '-0.02em',
                  paddingRight: '30px'
                }}>
                  {selectedDeal.property_address}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#B3B3B3' }}>Type:</span>
                    <span style={{ 
                      padding: '4px 12px',
                      background: getAssetTypeColor(selectedDeal.asset_type).bg,
                      color: getAssetTypeColor(selectedDeal.asset_type).color,
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '500',
                      border: `1px solid ${getAssetTypeColor(selectedDeal.asset_type).border}`
                    }}>{selectedDeal.asset_type}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#B3B3B3' }}>Price:</span>
                    <span style={{ color: '#00b8d4', fontWeight: '600' }}>{formatPrice(selectedDeal.asking_price)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#B3B3B3' }}>Stage:</span>
                    <span style={{
                      padding: '4px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
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


          {/* GIS Layer Identify Tooltip */}
          {identifyTooltip && (
            <Popup
              longitude={identifyTooltip.position[0]}
              latitude={identifyTooltip.position[1]}
              anchor="bottom"
              onClose={() => setIdentifyTooltip(null)}
              closeButton={false}
              closeOnClick={false}
              offset={[0, -10]}
              maxWidth="350px"
            >
              <div style={{
                background: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(0, 184, 212, 0.4)',
                borderRadius: '8px',
                padding: '16px',
                minWidth: '280px',
                maxWidth: '350px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(0, 184, 212, 0.3)',
              }}>
                {/* Close button */}
                <button
                  onClick={() => setIdentifyTooltip(null)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                  onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                  ×
                </button>

                {/* Layer name header */}
                <div style={{
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                  <h3 style={{
                    color: '#00b8d4',
                    fontSize: '14px',
                    fontWeight: '600',
                    margin: 0,
                  }}>
                    {identifyTooltip.layerName}
                  </h3>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '11px',
                    margin: '4px 0 0 0',
                  }}>
                    {identifyTooltip.features.length} feature{identifyTooltip.features.length !== 1 ? 's' : ''} found
                  </p>
                </div>

                {/* Feature attributes */}
                {identifyTooltip.features.slice(0, 1).map((feature, idx) => (
                  <div key={idx} style={{ marginTop: idx > 0 ? '12px' : 0 }}>
                    {feature.attributes && Object.entries(feature.attributes).slice(0, 6).map(([key, value]) => (
                      <div key={key} style={{
                        marginBottom: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}>
                        <span style={{
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '11px',
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span style={{
                          color: '#FFFFFF',
                          fontSize: '12px',
                          textAlign: 'right',
                        }}>
                          {value !== null && value !== undefined ? value.toString() : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}

                {identifyTooltip.features.length > 1 && (
                  <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '11px',
                    textAlign: 'center',
                  }}>
                    + {identifyTooltip.features.length - 1} more feature{identifyTooltip.features.length - 1 !== 1 ? 's' : ''}
                  </div>
                )}
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
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)'
              }}>
                {/* Custom close button - top right */}
                <button
                  onClick={() => setSelectedParcel(null)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
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

        {/* ReportAll Parcel Popup */}
        {reportAllParcel && (
          <ParcelPopup
            parcel={reportAllParcel}
            onClose={() => setReportAllParcel(null)}
            onCreateDeal={(parcel) => {
              // Navigate to create deal page with parcel data pre-filled
              console.log('Create deal for parcel:', parcel);
              toast.success('Parcel data ready - redirecting to create deal...');
              // TODO: Implement navigation with parcel data
              setReportAllParcel(null);
            }}
          />
        )}
      </div>
    </MapLayerProvider>
  );
};

export default MapView;
