import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl, Source, Layer } from 'react-map-gl/maplibre';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import { calculateArea, calculateDistance, formatMeasurement } from '../utils/measurementUtils';
import { MapLayerProvider } from '../contexts/MapLayerContext';
import LayerManager from '../components/LayerManager';
import PropertyIntelligencePanel from '../components/PropertyIntelligencePanel';
import CreateDealPanel from '../components/CreateDealPanel';
import ParcelPopup from '../components/ParcelPopup';
import AIResearchPanel from '../components/AIResearchPanel';
import AddressSearchBar from '../components/AddressSearchBar';
import MapTopBar from '../components/MapTopBar';
import reportallService from '../services/reportallService';
import REPORTALL_CONFIG from '../config/reportall';
import propertyIntelligenceService from '../services/propertyIntelligenceService';
import { PMTiles, Protocol } from 'pmtiles';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Register PMTiles protocol globally with MapLibre (before any Map renders)
const pmtilesProtocol = new Protocol();
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);

const MapView = () => {
  const [deals, setDeals] = useState([]);
  const [teamDeals, setTeamDeals] = useState([]);
  const [showTeamDeals, setShowTeamDeals] = useState(false);
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
  const [selectedParcelId, setSelectedParcelId] = useState(null); // Track selected ReportAll parcel for highlighting
  const [selectedBexarParcelId, setSelectedBexarParcelId] = useState(null); // Track selected Bexar CAD parcel for highlighting
  const [currentZoom, setCurrentZoom] = useState(11.5); // Track current zoom level for dynamic pin sizing
  
  // Property Intelligence layers
  const [showSAZoning, setShowSAZoning] = useState(false);
  const [showAustinZoning, setShowAustinZoning] = useState(false);
  const [showFloodZones, setShowFloodZones] = useState(false);
  const [showWaterSewer, setShowWaterSewer] = useState(false);
  const [showBexarParcels, setShowBexarParcels] = useState(false);  // Bexar CAD parcels
  
  // Property Intelligence data
  const [saZoningData, setSaZoningData] = useState({ type: 'FeatureCollection', features: [] });
  const [austinZoningData, setAustinZoningData] = useState({ type: 'FeatureCollection', features: [] });
  const [waterSewerData, setWaterSewerData] = useState({ type: 'FeatureCollection', features: [] });
  
  // Panel Management System - Independent panel states
  const [propertyPanelOpen, setPropertyPanelOpen] = useState(false);
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [actionsPanelOpen, setActionsPanelOpen] = useState(false);
  const [createDealPanelOpen, setCreateDealPanelOpen] = useState(false);
  const [aiResearchPanelOpen, setAiResearchPanelOpen] = useState(false);
  
  // Measurement tools
  const [measurementMode, setMeasurementMode] = useState(null); // 'area' or 'distance' or null
  const [measurementPoints, setMeasurementPoints] = useState([]);
  const [measurementResult, setMeasurementResult] = useState(null);
  
  const [propertyPanelData, setPropertyPanelData] = useState(null); // Data for property panel (deal or parcel)
  const [actionsPanelData, setActionsPanelData] = useState(null); // Data for actions panel
  const [createDealLocation, setCreateDealLocation] = useState(null); // Location for new deal
  const [createDealParcelData, setCreateDealParcelData] = useState(null); // Parcel data for new deal
  const [searchedAddress, setSearchedAddress] = useState(null); // Address from search bar
  
  const { user } = useContext(AuthContext);
  const viewStateRef = useRef({
    longitude: -98.4936,
    latitude: 29.4241,
    zoom: 11.5
  });
  const mapRef = useRef();
  const navigate = useNavigate();
  
  // Track viewState using ref to avoid re-renders during map interaction
  const handleMoveEnd = useCallback((evt) => {
    viewStateRef.current = evt.viewState;
    // Update zoom level for dynamic pin sizing (only on moveend to avoid performance issues)
    setCurrentZoom(evt.viewState.zoom);
    // No setState = no re-render = no flicker
  }, []);
  
  // Calculate dynamic pin size based on zoom level and number of deals
  // This ensures the map remains readable even with 100+ deals
  const calculatePinSize = useCallback((zoom, dealCount) => {
    // Base sizes at different zoom levels
    const baseSize = {
      outer: Math.max(24, Math.min(48, 16 + zoom * 2)),  // Range: 24px-48px
      inner: Math.max(16, Math.min(32, 10 + zoom * 1.5)), // Range: 16px-32px
      dot: Math.max(6, Math.min(12, 4 + zoom * 0.6))     // Range: 6px-12px
    };
    
    // Apply scale factor based on deal density
    // More deals = smaller pins
    let scaleFactor = 1.0;
    if (dealCount > 100) {
      scaleFactor = 0.6;  // 60% size for 100+ deals
    } else if (dealCount > 50) {
      scaleFactor = 0.75; // 75% size for 50+ deals
    } else if (dealCount > 25) {
      scaleFactor = 0.85; // 85% size for 25+ deals
    }
    
    return {
      outer: Math.round(baseSize.outer * scaleFactor),
      inner: Math.round(baseSize.inner * scaleFactor),
      dot: Math.round(baseSize.dot * scaleFactor)
    };
  }, []);
  
  // Calculate pin sizes based on current zoom and deal count
  const pinSizes = useMemo(() => {
    const totalDeals = deals.length + (showTeamDeals ? teamDeals.length : 0);
    return calculatePinSize(currentZoom, totalDeals);
  }, [currentZoom, deals.length, teamDeals.length, showTeamDeals, calculatePinSize]);
  
  // Add street labels to map - using proper event listeners
  useEffect(() => {
    if (!mapRef.current) return;
    
    const map = mapRef.current.getMap();
    if (!map) return;
    
    const sourceId = 'osm-street-labels';
    
    const updateStreetLabels = () => {
      const currentZoom = map.getZoom();
      const shouldShowLabels = showStreetLabels && mapStyle === 'satellite' && currentZoom >= 12;
      
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
    
    // Event handlers
    const handleStyleData = () => {
      if (map.isStyleLoaded()) {
        updateStreetLabels();
      }
    };
    
    // Listen for style changes and zoom changes
    map.on('styledata', handleStyleData);
    map.on('idle', handleStyleData);
    map.on('zoomend', updateStreetLabels);
    
    // Initial call if style is already loaded
    if (map.isStyleLoaded()) {
      updateStreetLabels();
    }

    // Cleanup
    return () => {
      map.off('styledata', handleStyleData);
      map.off('idle', handleStyleData);
      map.off('zoomend', updateStreetLabels);
    };
  }, [showStreetLabels, mapStyle]);
  
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
      setSelectedParcelId(null); // Clear selected ReportAll parcel
      setSelectedBexarParcelId(null); // Clear selected Bexar CAD parcel
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

  // Clear measurements when mode changes
  useEffect(() => {
    if (!measurementMode) {
      setMeasurementPoints([]);
      setMeasurementResult(null);
    }
  }, [measurementMode]);

  // Memoize GeoJSON data to prevent re-creation during map panning
  const measurementLineGeoJSON = useMemo(() => {
    if (measurementPoints.length < 2) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: measurementPoints
      }
    };
  }, [measurementPoints]);

  const measurementPolygonGeoJSON = useMemo(() => {
    if (!measurementResult || measurementMode !== 'area' || measurementPoints.length < 3) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [measurementPoints]
      }
    };
  }, [measurementResult, measurementMode, measurementPoints]);

  // SA Zoning now uses PMTiles - loads automatically from /tiles/sa_zoning.pmtiles
  // No fetch logic needed - MapLibre handles tile loading via pmtiles:// protocol
  
  // Log when SA Zoning layer toggles for debugging
  useEffect(() => {
    console.log('[MapView] SA Zoning layer toggle:', showSAZoning ? 'ON' : 'OFF');
    if (showSAZoning) {
      console.log('[MapView] Loading PMTiles from:', `${window.location.origin}/tiles/sa_zoning.pmtiles`);
    }
  }, [showSAZoning]);

  // Fetch Austin Zoning data when layer is toggled ON
  useEffect(() => {
    if (showAustinZoning && austinZoningData.features.length === 0) {
      console.log('[MapView] Fetching Austin zoning data...');
      
      // Get current map bounds for bbox filtering
      let bbox = null;
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        const bounds = map.getBounds();
        bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      }
      
      const url = `${API}/intelligence/layer/austin-zoning${bbox ? `?bbox=${bbox}&limit=10000` : '?limit=10000'}`;
      
      toast.info('Loading Austin zoning data...');
      
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          console.log('[MapView] Austin Zoning data loaded:', data.features?.length, 'features');
          setAustinZoningData(data);
          toast.success(`Loaded ${data.features?.length || 0} Austin zoning parcels`);
        })
        .catch(err => {
          console.error('[MapView] Error fetching Austin zoning:', err);
          toast.error('Failed to load Austin zoning data');
        });
    }
  }, [showAustinZoning, austinZoningData.features.length]);

  // Fetch Water/Sewer data when layer is toggled ON
  useEffect(() => {
    if (showWaterSewer && waterSewerData.features.length === 0) {
      console.log('[MapView] Fetching SA Water/Sewer data...');
      
      // Get current map bounds for bbox filtering
      let bbox = null;
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        const bounds = map.getBounds();
        bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      }
      
      const url = `${API}/intelligence/layer/sa-water-sewer${bbox ? `?bbox=${bbox}&limit=10000` : '?limit=10000'}`;
      
      toast.info('Loading water/sewer infrastructure...');
      
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(data => {
          console.log('[MapView] Water/Sewer data loaded:', data.features?.length, 'features');
          setWaterSewerData(data);
          toast.success(`Loaded ${data.features?.length || 0} water/sewer features`);
        })
        .catch(err => {
          console.error('[MapView] Error fetching water/sewer:', err);
          toast.error('Failed to load water/sewer data');
        });
    }
  }, [showWaterSewer, waterSewerData.features.length]);

  // Memoize parcel layer paint properties to prevent flickering during map drag
  const parcelFillPaint = useMemo(() => ({
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
    'fill-opacity-transition': { duration: 0 }, // Disable transitions for instant rendering
  }), [selectedParcelId]);

  const parcelLinePaint = useMemo(() => ({
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
    'line-opacity-transition': { duration: 0 }, // Disable transitions for instant rendering
  }), [selectedParcelId]);

  // Memoize Source props to prevent Source unmounting/remounting during map drag
  // Creating new array/object references causes React-Map-GL to think props changed
  const parcelTiles = useMemo(() => [REPORTALL_CONFIG.vectorTilesUrl], []);
  const parcelPromoteId = useMemo(() => ({ parcels: 'robust_id' }), []);

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
        'esri-labels': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          maxzoom: 18,
          attribution: '&copy; Esri'
        }
      },
      layers: [
        {
          id: 'satellite',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 18
        },
        {
          id: 'labels',
          type: 'raster',
          source: 'esri-labels',
          minzoom: 14,
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
    fetchTeamDeals();
  }, []);

  useEffect(() => {
    if (!showParcels) return;
    if (!mapRef.current) return;
    
    const map = mapRef.current.getMap();
    if (!map) return;
    
    const handleMoveEnd = () => {
      const zoom = map.getZoom();
      if (zoom >= 12) {
        fetchParcels();
      }
    };
    
    map.on('moveend', handleMoveEnd);
    handleMoveEnd(); // Initial fetch
    
    return () => map.off('moveend', handleMoveEnd);
  }, [showParcels]);

  const fetchParcels = async () => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;
    
    const zoom = map.getZoom();
    const center = map.getCenter();
    
    if (zoom < 12) return;
    
    try {
      const token = localStorage.getItem('token');
      const z = Math.floor(zoom);
      const x = Math.floor((center.lng + 180) / 360 * Math.pow(2, z));
      const y = Math.floor((1 - Math.log(Math.tan(center.lat * Math.PI / 180) + 1 / Math.cos(center.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
      
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

  // Fetch Team Deals
  const fetchTeamDeals = async () => {
    if (!user) return;

    try {
      console.log('[MapView] Fetching team deals for user:', user.id);
      
      // First, get the user's teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id);

      if (teamsError) {
        console.error('[MapView] Error fetching teams:', teamsError);
        return;
      }

      if (!teamsData || teamsData.length === 0) {
        console.log('[MapView] User is not part of any team');
        setTeamDeals([]);
        return;
      }

      // Get the first team's ID (user's primary team)
      const teamId = teamsData[0].team_id;
      console.log('[MapView] Fetching deals for team:', teamId);

      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[MapView] No active session');
        return;
      }

      // Fetch team stats which includes team_deals
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${BACKEND_URL}/api/teams/${teamId}/stats`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch team deals: ${response.statusText}`);
      }

      const statsData = await response.json();
      const deals = statsData.team_deals || [];
      
      // Filter out user's own deals to avoid duplicates on the map
      const filteredTeamDeals = deals.filter(deal => deal.owner_id !== user.id);
      
      console.log('[MapView] Fetched team deals:', filteredTeamDeals.length);
      setTeamDeals(filteredTeamDeals);
    } catch (error) {
      console.error('[MapView] Error loading team deals:', error);
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
    // Handle measurement mode clicks first
    if (measurementMode) {
      const newPoint = [event.lngLat.lng, event.lngLat.lat];
      
      // Check if clicking near the first point to close the polygon (for area measurement)
      if (measurementMode === 'area' && measurementPoints.length >= 3) {
        const firstPoint = measurementPoints[0];
        const distance = Math.sqrt(
          Math.pow(newPoint[0] - firstPoint[0], 2) + 
          Math.pow(newPoint[1] - firstPoint[1], 2)
        );
        
        // If clicking within ~0.0001 degrees (~11 meters) of first point, close the polygon
        if (distance < 0.0001) {
          const closedPoints = [...measurementPoints, firstPoint];
          const result = calculateArea(closedPoints);
          setMeasurementResult(result);
          toast.success('Area measurement complete!');
          return;
        }
      }
      
      const newPoints = [...measurementPoints, newPoint];
      setMeasurementPoints(newPoints);
      
      // Calculate and display result for distance (always update)
      if (measurementMode === 'distance' && newPoints.length >= 2) {
        const result = calculateDistance(newPoints);
        setMeasurementResult(result);
      }
      
      return; // Don't process other click handlers in measurement mode
    }
    
    // Clear previous states
    setIdentifyTooltip(null);
    setReportAllParcel(null);
    
    // Get map instance once at the start
    const map = mapRef.current?.getMap();
    if (!map) {
      console.log('[MapView] Map not available');
      return;
    }
    
    console.log('[MapView] Map clicked at zoom:', map.getZoom(), 'showBexarParcels:', showBexarParcels);
    
    // Check for Bexar CAD parcels click (if enabled)
    if (showBexarParcels && map.getZoom() >= 14) {
      console.log('[Bexar CAD] Checking for parcel click at point:', event.point);
      
      const features = map.queryRenderedFeatures(event.point, {
        layers: ['bexar-parcels-fill', 'bexar-parcels-line']
      });
      
      console.log('[Bexar CAD] Features found:', features?.length || 0);
      
      if (features && features.length > 0) {
        const parcel = features[0].properties;
        console.log('[Bexar CAD] Clicked parcel data:', parcel);
        
        // Set selected Bexar parcel for highlighting (use account number as unique ID)
        const bexarParcelId = parcel.AcctNumb || parcel.account_number;
        console.log('[Bexar CAD] Setting selected parcel ID for highlighting:', bexarParcelId);
        setSelectedBexarParcelId(bexarParcelId);
        
        // Format parcel data for PropertyIntelligencePanel
        const parcelData = {
          // Property Info
          address: parcel.Situs || 'No Address',
          owner: parcel.Owner || 'Unknown Owner',
          property_type: 'CAD Parcel',
          
          // Values
          land_value: parcel.LandVal,
          improvement_value: parcel.ImprVal,
          total_value: parcel.TotVal,
          price: parcel.TotVal,  // Use total value as price
          
          // Parcel Details
          legal_acres: parcel.LglAcres,
          calculated_acres: parcel.Acres,
          lot_size: parcel.LglAcres,  // Map to lot_size for panel
          year_built: parcel.YrBlt,
          gba: parcel.GBA,
          total_gba: parcel.TOT_GBA,
          size: parcel.TOT_GBA,  // Map to building size
          stories: parcel.Stories,
          
          // Other
          account_number: parcel.AcctNumb,
          legal_description: parcel.LglDesc,
          neighborhood: parcel.Nbhd,
          
          // Location
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng,
          isParcel: true,
          isBexarCAD: true  // Flag for Bexar CAD data
        };
        
        console.log('[Bexar CAD] Opening property panel with data:', parcelData);
        togglePropertyPanel(parcelData);
        toast.success('Bexar CAD parcel loaded');
        return;
      } else {
        console.log('[Bexar CAD] No parcel features found at click point');
      }
    }
    
    // Only query ReportAll parcels if zoom level is 14+ and parcels are shown
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
          showTeamDeals={showTeamDeals}
          onToggleTeamDeals={() => setShowTeamDeals(!showTeamDeals)}
          mapStyle={mapStyle}
          onToggleMapStyle={() => setMapStyle(mapStyle === 'satellite' ? 'street' : 'satellite')}
          mapRef={mapRef}
          propertyPanelOpen={propertyPanelOpen || createDealPanelOpen}
          measurementMode={measurementMode}
          onSetMeasurementMode={setMeasurementMode}
          showSAZoning={showSAZoning}
          onToggleSAZoning={() => setShowSAZoning(!showSAZoning)}
          showAustinZoning={showAustinZoning}
          onToggleAustinZoning={() => setShowAustinZoning(!showAustinZoning)}
          showFloodZones={showFloodZones}
          onToggleFloodZones={() => setShowFloodZones(!showFloodZones)}
          showWaterSewer={showWaterSewer}
          onToggleWaterSewer={() => setShowWaterSewer(!showWaterSewer)}
          showBexarParcels={showBexarParcels}
          onToggleBexarParcels={() => setShowBexarParcels(!showBexarParcels)}
        />

        {/* AI Research Panel (Opens at 1000px - third panel) */}
        <AIResearchPanel
          isOpen={aiResearchPanelOpen}
          onClose={() => setAiResearchPanelOpen(false)}
        />

        {/* Modern Top Navigation Bar - Land.ID Style */}
        <MapTopBar 
          mapRef={mapRef}
          onSelectAddress={(address) => {
            console.log('[MapView] Address selected:', address);
            setSearchedAddress(address);
          }}
          layersPanelOpen={layersPanelOpen}
          onToggleLayersPanel={toggleLayersPanel}
          aiResearchPanelOpen={aiResearchPanelOpen}
          onToggleAIResearch={() => setAiResearchPanelOpen(!aiResearchPanelOpen)}
          measurementMode={measurementMode}
          onSetMeasurementMode={setMeasurementMode}
          searchBarComponent={
            <AddressSearchBar 
              mapRef={mapRef}
              onSelectAddress={(address) => {
                console.log('[MapView] Address selected:', address);
                setSearchedAddress(address);
              }}
            />
          }
        />

        <div className={mapStyle === 'street' ? 'custom-dark-map' : ''} style={{ width: '100%', height: '100%' }}>
          <Map
            initialViewState={viewStateRef.current}
            onMoveEnd={handleMoveEnd}
            onClick={combinedMapClick}
            style={{ width: '100%', height: '100%', willChange: 'transform' }}
            mapStyle={mapStyles[mapStyle]}
            data-testid="map-container"
            ref={mapRef}
            interactiveLayerIds={[
              ...(showParcels ? ['parcels-fill', 'parcels-line'] : []),
              ...(showReportAllParcels ? ['reportall-parcels-fill', 'reportall-parcels-line'] : []),
              ...(showBexarParcels ? ['bexar-parcels-fill', 'bexar-parcels-line'] : [])
            ]}
            dragRotate={false}
            touchZoomRotate={false}
            dragPan={{ inertia: 500 }}
            maxZoom={19}
            fadeDuration={100}
            renderWorldCopies={false}
            crossSourceCollisions={false}
            antialias={true}
            preserveDrawingBuffer={false}
            refreshExpiredTiles={false}
          >
          <NavigationControl position="top-right" />
          <ScaleControl />

          {/* ReportAll Parcel Vector Tiles Layer */}
          {showReportAllParcels && (
            <Source
              key="reportall-parcels-source"
              id="reportall-parcels"
              type="vector"
              tiles={parcelTiles}
              minzoom={REPORTALL_CONFIG.minZoom}
              maxzoom={REPORTALL_CONFIG.maxZoom}
              promoteId={parcelPromoteId}
              scheme="xyz"
              tileSize={512}
            >
              <Layer
                id="reportall-parcels-fill"
                type="fill"
                source-layer="parcels"
                paint={parcelFillPaint}
              />
              <Layer
                id="reportall-parcels-line"
                type="line"
                source-layer="parcels"
                paint={parcelLinePaint}
              />
            </Source>
          )}

          {/* Regrid Parcel Layer */}
          {showParcels && parcels && (
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

          {/* FEMA Flood Zones Layer - Raster WMS */}
          {showFloodZones && (
            <Source
              id="fema-flood-zones"
              type="raster"
              tiles={[
                'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/export?bbox={bbox-epsg-3857}&size=256,256&format=png&transparent=true&f=image&layers=show:28'
              ]}
              tileSize={256}
            >
              <Layer
                id="fema-flood-layer"
                type="raster"
                paint={{
                  'raster-opacity': 0.6
                }}
              />
            </Source>
          )}

          {/* San Antonio Zoning Layer - TerraVault Color Specification */}
          {showSAZoning && (
            <Source
              id="sa-zoning"
              type="vector"
              url={`pmtiles://${window.location.origin}/tiles/sa_zoning.pmtiles`}
              tileSize={512}
            >
              {/* Fill Layer with TerraVault Color Classification */}
              <Layer
                id="sa-zoning-fill"
                type="fill"
                source-layer="zoning"
                minzoom={10}
                maxzoom={22}
                paint={{
                  'fill-color': [
                    'case',
                    // RESIDENTIAL - Yellow (starts with R-)
                    ['==', ['slice', ['get', 'Base'], 0, 2], 'R-'],
                    '#fde047',
                    
                    // MULTI-FAMILY - Orange (starts with RM or MF)
                    ['any',
                      ['==', ['slice', ['get', 'Base'], 0, 2], 'RM'],
                      ['==', ['slice', ['get', 'Base'], 0, 2], 'MF']
                    ],
                    '#fb923c',
                    
                    // COMMERCIAL - Red (starts with C- or is NC/HC)
                    ['any',
                      ['==', ['slice', ['get', 'Base'], 0, 2], 'C-'],
                      ['==', ['get', 'Base'], 'NC'],
                      ['==', ['get', 'Base'], 'HC']
                    ],
                    '#ef4444',
                    
                    // INDUSTRIAL - Purple (starts with I- or MI)
                    ['any',
                      ['==', ['slice', ['get', 'Base'], 0, 2], 'I-'],
                      ['==', ['slice', ['get', 'Base'], 0, 2], 'MI'],
                      ['==', ['get', 'Base'], 'IL'],
                      ['==', ['get', 'Base'], 'L']
                    ],
                    '#a78bfa',
                    
                    // MIXED USE - Dark Purple
                    ['in', ['get', 'Base'], ['literal', ['MXD', 'TOD', 'MU', 'MX']]],
                    '#7c3aed',
                    
                    // PUD - Dark Cyan
                    ['in', ['get', 'Base'], ['literal', ['PD', 'PUD', 'BP', 'OP']]],
                    '#0891b2',
                    
                    // OFFICE - Dark Cyan (starts with O-)
                    ['==', ['slice', ['get', 'Base'], 0, 2], 'O-'],
                    '#0891b2',
                    
                    // URBAN - Salmon (UZROW, UD, UZ*)
                    ['any',
                      ['==', ['get', 'Base'], 'UZROW'],
                      ['==', ['slice', ['get', 'Base'], 0, 2], 'UD'],
                      ['==', ['slice', ['get', 'Base'], 0, 2], 'UZ']
                    ],
                    '#fda4af',
                    
                    // RURAL - Dark Yellow
                    ['in', ['get', 'Base'], ['literal', ['RU', 'FR', 'RP', 'RE']]],
                    '#ca8a04',
                    
                    // AGRICULTURAL - Green (AG, A)
                    ['any',
                      ['==', ['get', 'Base'], 'AG'],
                      ['==', ['get', 'Base'], 'A']
                    ],
                    '#22c55e',
                    
                    // DEVELOPMENT AGREEMENT - Brown
                    ['in', ['get', 'Base'], ['literal', ['D', 'DA', 'IDZ']]],
                    '#92400e',
                    
                    // OUTSIDE CITY LIMITS - White (OCL)
                    ['==', ['get', 'Base'], 'OCL'],
                    '#ffffff',
                    
                    // UNKNOWN/NULL - White
                    '#ffffff'
                  ],
                  'fill-opacity': [
                    'case',
                    // White/unknown zones - very subtle
                    ['any',
                      ['==', ['get', 'Base'], 'OCL'],
                      ['==', ['get', 'Base'], ''],
                      ['==', ['get', 'Base'], null]
                    ],
                    0.05,
                    // All other zones - visible
                    0.4
                  ]
                }}
              />
              {/* Line Layer - Only at zoom 14+ for performance */}
              <Layer
                id="sa-zoning-line"
                type="line"
                source-layer="zoning"
                minzoom={14}
                maxzoom={22}
                paint={{
                  'line-color': '#ffffff',
                  'line-width': 0.5,
                  'line-opacity': 0.3
                }}
              />
            </Source>
          )}

          {/* Bexar County CAD Parcels - Free Parcel Intelligence */}
          {showBexarParcels && (
            <Source
              key="bexar-parcels-source"
              id="bexar-parcels"
              type="vector"
              url={`pmtiles://${window.location.origin}/tiles/bexar_parcels.pmtiles`}
              tileSize={512}
            >
              {/* Invisible fill layer for easier clicking */}
              <Layer
                id="bexar-parcels-fill"
                type="fill"
                source-layer="parcels"
                minzoom={14}
                maxzoom={22}
                paint={{
                  'fill-color': '#06b6d4',
                  'fill-opacity': 0.0001  // Nearly invisible but clickable
                }}
              />
              {/* Parcel outlines - visible layer */}
              <Layer
                id="bexar-parcels-line"
                type="line"
                source-layer="parcels"
                minzoom={14}
                maxzoom={22}
                paint={{
                  'line-color': '#06b6d4',  // Cyan for parcels
                  'line-width': 1.5,
                  'line-opacity': 0.8
                }}
              />
            </Source>
          )}

          {/* Austin Zoning Layer - Color-coded by type */}
          {showAustinZoning && (
            <Source
              id="austin-zoning"
              type="geojson"
              data={austinZoningData}
            >
              <Layer
                id="austin-zoning-fill"
                type="fill"
                paint={{
                  'fill-color': [
                    'match',
                    ['get', 'ZONING_ZTYPE'],
                    // Residential - Green shades
                    'SF', '#4ade80',
                    'MF', '#86efac',
                    'RR', '#bbf7d0',
                    // Commercial - Orange/Red
                    'CS', '#f97316',
                    'LR', '#fb923c',
                    'GR', '#ea580c',
                    'NO', '#fdba74',
                    // Industrial - Purple
                    'LI', '#a78bfa',
                    'MI', '#8b5cf6',
                    // Mixed Use - Amber
                    'MU', '#fbbf24',
                    'CBD', '#f59e0b',
                    // Office - Cyan
                    'LO', '#06b6d4',
                    'GO', '#0891b2',
                    // Default - Light purple
                    '#c4b5fd'
                  ],
                  'fill-opacity': 0.3
                }}
              />
              <Layer
                id="austin-zoning-line"
                type="line"
                paint={{
                  'line-color': '#8b5cf6',
                  'line-width': 1,
                  'line-opacity': 0.6
                }}
              />
            </Source>
          )}

          {/* San Antonio Water/Sewer Infrastructure - Will load dynamically */}
          {showWaterSewer && (
            <Source
              id="sa-water-sewer"
              type="geojson"
              data={waterSewerData}
            >
              <Layer
                id="sa-water-sewer-line"
                type="line"
                paint={{
                  'line-color': '#06b6d4',
                  'line-width': 2,
                  'line-opacity': 0.7
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

          {/* Team Deals Markers - Only show when team deals layer is enabled */}
          {showTeamDeals && teamDeals.map((deal) => (
            <Marker
              key={`team-${deal.id}`}
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
                  ? 'drop-shadow(0 4px 12px rgba(168, 85, 247, 0.6))' 
                  : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))'
              }}>
                {/* Pulsing outer ring - purple for team deals */}
                <div className="marker-pulse" style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: selectedDeal?.id === deal.id ? 'rgba(168, 85, 247, 0.5)' : 'rgba(168, 85, 247, 0.3)',
                  animation: 'pulse 2s ease-out infinite'
                }}></div>
                {/* Main marker circle - purple for team deals */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  border: selectedDeal?.id === deal.id ? '3px solid #ffffff' : 'none'
                }}>
                  {/* Team icon indicator */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
              </div>
            </Marker>
          ))}

          {/* Searched Address Marker - Green pin for searched locations */}
          {searchedAddress && searchedAddress.latitude && searchedAddress.longitude && (
            <Marker
              longitude={searchedAddress.longitude}
              latitude={searchedAddress.latitude}
              anchor="bottom"
            >
              <div style={{
                position: 'relative',
                width: '48px',
                height: '48px',
                cursor: 'pointer',
                filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.6))',
                animation: 'bounce-in 0.6s ease-out'
              }}>
                {/* Pulsing outer ring - green for searched address */}
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.4)',
                  animation: 'pulse 2s ease-out infinite'
                }}></div>
                {/* Main marker circle - green */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid #ffffff'
                }}>
                  {/* Search/Location icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
              </div>
            </Marker>
          )}

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

          {/* Measurement Tools Visualization */}
          {measurementMode && measurementPoints.length > 0 && (
            <>
              {/* Measurement Points */}
              {measurementPoints.map((point, index) => (
                <Marker
                  key={`measurement-point-${index}`}
                  longitude={point[0]}
                  latitude={point[1]}
                  anchor="center"
                >
                  <div style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: '#a855f7',
                    border: '3px solid #ffffff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    cursor: index === 0 && measurementMode === 'area' ? 'pointer' : 'default',
                    position: 'relative'
                  }}>
                    {index === 0 && measurementMode === 'area' && measurementPoints.length >= 3 && (
                      <div style={{
                        position: 'absolute',
                        top: '-30px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                        padding: '4px 8px',
                        background: 'rgba(168, 85, 247, 0.95)',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: '600',
                        borderRadius: '4px',
                        pointerEvents: 'none'
                      }}>
                        Click here to close
                      </div>
                    )}
                  </div>
                </Marker>
              ))}

              {/* Measurement Lines - Always show connecting lines */}
              {measurementLineGeoJSON && (
                <Source
                  id="measurement-line-source"
                  type="geojson"
                  data={measurementLineGeoJSON}
                >
                  <Layer
                    id="measurement-connecting-line"
                    type="line"
                    paint={{
                      'line-color': '#a855f7',
                      'line-width': 3
                    }}
                  />
                </Source>
              )}

              {/* Filled Polygon - Only show when area is calculated (polygon closed) */}
              {measurementPolygonGeoJSON && (
                <Source
                  id="measurement-polygon-source"
                  type="geojson"
                  data={measurementPolygonGeoJSON}
                >
                  <Layer
                    id="measurement-fill"
                    type="fill"
                    paint={{
                      'fill-color': '#a855f7',
                      'fill-opacity': 0.4
                    }}
                  />
                </Source>
              )}

              {/* Measurement Label - Text Only (Land.ID Style) */}
              {measurementResult && measurementPoints.length >= 2 && (
                <Marker
                  longitude={(() => {
                    if (measurementMode === 'area') {
                      const sumLng = measurementPoints.reduce((sum, p) => sum + p[0], 0);
                      return sumLng / measurementPoints.length;
                    } else {
                      return (measurementPoints[0][0] + measurementPoints[measurementPoints.length - 1][0]) / 2;
                    }
                  })()}
                  latitude={(() => {
                    if (measurementMode === 'area') {
                      const sumLat = measurementPoints.reduce((sum, p) => sum + p[1], 0);
                      return sumLat / measurementPoints.length;
                    } else {
                      return (measurementPoints[0][1] + measurementPoints[measurementPoints.length - 1][1]) / 2;
                    }
                  })()}
                  anchor="center"
                >
                  <div style={{
                    color: '#FFFFFF',
                    fontSize: measurementMode === 'area' ? '24px' : '18px',
                    fontWeight: '700',
                    textShadow: `
                      -2px -2px 4px rgba(0, 0, 0, 0.9),
                      2px -2px 4px rgba(0, 0, 0, 0.9),
                      -2px 2px 4px rgba(0, 0, 0, 0.9),
                      2px 2px 4px rgba(0, 0, 0, 0.9),
                      0 0 8px rgba(0, 0, 0, 0.8)
                    `,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    letterSpacing: '-0.02em'
                  }}>
                    {measurementMode === 'area' && measurementResult.acres
                      ? `${measurementResult.acres.toFixed(2)} ac`
                      : measurementMode === 'distance' && measurementResult.feet
                      ? `${measurementResult.feet.toLocaleString()} ft`
                      : ''}
                  </div>
                </Marker>
              )}
            </>
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
