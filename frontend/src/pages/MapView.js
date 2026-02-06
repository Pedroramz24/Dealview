import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import Map, { Marker, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  Building2, X, ChevronRight, ChevronLeft, Users, 
  Eye, EyeOff, Filter, Layers, Plus, Search, MousePointer, Upload, DollarSign,
  User, Mail, Phone, Lock, Globe
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { colors, gradients, borderRadius, spacing } from '../styles/designSystem';

// Format number with commas
const formatNumberInput = (value) => {
  if (!value) return '';
  // Remove non-digit characters except decimal point
  const cleanValue = value.toString().replace(/[^\d.]/g, '');
  // Split by decimal
  const parts = cleanValue.split('.');
  // Add commas to the integer part
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

// Parse formatted number back to raw number
const parseFormattedNumber = (value) => {
  if (!value) return '';
  return value.replace(/,/g, '');
};

// Inline editable field style for side panel
const sidePanelFieldStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px',
  padding: '6px 8px',
  color: '#e2e8f0',
  fontSize: '13px',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
};

// Asset type colors
const assetTypeColors = {
  'Office': '#3b82f6',
  'Retail': '#10b981',
  'Industrial': '#f59e0b',
  'Multifamily': '#8b5cf6',
  'Land': '#ec4899',
  'Mixed Use': '#06b6d4',
  'Other': '#6b7280'
};

// Get color for a deal based on asset type
const getDealColor = (deal) => {
  return assetTypeColors[deal?.asset_type] || assetTypeColors['Other'];
};

// Optimized map styles with prefetch-friendly config
const mapStyles = {
  satellite: {
    version: 8,
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© Esri'
      }
    },
    layers: [
      {
        id: 'esri-satellite-layer',
        type: 'raster',
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  },
  street: {
    version: 8,
    sources: {
      'osm-streets': {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [
      {
        id: 'osm-streets-layer',
        type: 'raster',
        source: 'osm-streets',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  }
};

// Memoized marker component
const DealMarker = React.memo(({ deal, onClick, isTeamDeal }) => {
  const color = getDealColor(deal);
  
  if (isTeamDeal) {
    return (
      <div
        onClick={onClick}
        style={{
          width: 0,
          height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderBottom: `20px solid ${color}`,
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
          cursor: 'pointer',
          transition: 'transform 0.15s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      />
    );
  }
  
  return (
    <div
      onClick={onClick}
      style={{
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: color,
        border: '2px solid white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        cursor: 'pointer',
        transition: 'transform 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <Building2 size={10} color="white" />
    </div>
  );
});

DealMarker.displayName = 'DealMarker';

const MapView = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  
  // State
  const [deals, setDeals] = useState([]);
  const [teamDeals, setTeamDeals] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showTeamDeals, setShowTeamDeals] = useState(false);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState('satellite');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [clickMode, setClickMode] = useState(false); // For click-to-add
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [pipelines, setPipelines] = useState([]);
  const [pipelineStages, setPipelineStages] = useState([]);
  const [newDeal, setNewDeal] = useState({
    title: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    asset_type: 'Office',
    asking_price: '',
    size_sqft: '',
    lot_size: '',
    ac_size: '',
    year_built: '',
    noi: '',
    cap_rate: '',
    occupancy: '',
    zoning: '',
    pipeline_id: '',
    pipeline_stage_id: '',
    latitude: null,
    longitude: null
  });
  const [creatingDeal, setCreatingDeal] = useState(false);
  const [sidePanelImageIdx, setSidePanelImageIdx] = useState(0);
  const [uploadingSidePanelImage, setUploadingSidePanelImage] = useState(false);
  const [assetTypeFilter, setAssetTypeFilter] = useState('');
  const [dealContacts, setDealContacts] = useState([]);
  
  // Map viewport
  const [viewState, setViewState] = useState({
    longitude: -98.4936,
    latitude: 29.4241,
    zoom: 10
  });

  // Fetch deals on mount
  useEffect(() => {
    fetchDeals();
    fetchTeamData();
    fetchPipelines();
  }, []);

  // Reset side panel image index when deal changes
  useEffect(() => {
    setSidePanelImageIdx(0);
  }, [selectedDeal?.id]);

  // Fetch pipelines
  const fetchPipelines = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch(`${API}/pipelines`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const pipelinesData = data.pipelines || [];
        setPipelines(pipelinesData);
        
        // Set default pipeline and stage
        if (pipelinesData.length > 0) {
          const defaultPipeline = pipelinesData.find(p => p.is_default) || pipelinesData[0];
          setNewDeal(prev => ({
            ...prev,
            pipeline_id: defaultPipeline.id,
            pipeline_stage_id: defaultPipeline.stages?.[0]?.id || ''
          }));
          setPipelineStages(defaultPipeline.stages || []);
        }
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    }
  }, []);

  // Handle pipeline change
  const handlePipelineChange = (pipelineId) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    const stages = pipeline?.stages || [];
    setPipelineStages(stages);
    setNewDeal(prev => ({
      ...prev,
      pipeline_id: pipelineId,
      pipeline_stage_id: stages[0]?.id || ''
    }));
  };

  const fetchDeals = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API}/deals?has_location=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const dealsData = data.deals || [];
        setDeals(dealsData);
        
        if (dealsData.length > 0 && dealsData[0].latitude && dealsData[0].longitude) {
          setViewState(prev => ({
            ...prev,
            longitude: dealsData[0].longitude,
            latitude: dealsData[0].latitude,
            zoom: 12
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeamData = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const membersRes = await fetch(`${API}/teams/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (membersRes.ok) {
        const data = await membersRes.json();
        setTeamMembers(data.members || []);
      }

      const dealsRes = await fetch(`${API}/deals/team`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (dealsRes.ok) {
        const data = await dealsRes.json();
        setTeamDeals(data.deals || []);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  }, []);

  // Autocomplete search
  const handleSearchChange = useCallback(async (value) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        
        const response = await fetch(`${API}/geocode/autocomplete?query=${encodeURIComponent(value)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    }, 300);
  }, []);

  // Select suggestion
  const handleSelectSuggestion = useCallback((suggestion) => {
    setSearchQuery(suggestion.formatted_address);
    setSuggestions([]);
    setShowSuggestions(false);
    
    setViewState({
      longitude: suggestion.longitude,
      latitude: suggestion.latitude,
      zoom: 16
    });
    
    setNewDeal(prev => ({
      ...prev,
      address: suggestion.address || suggestion.formatted_address.split(',')[0],
      city: suggestion.city || '',
      state: suggestion.state || '',
      zip_code: suggestion.zip || '',
      latitude: suggestion.latitude,
      longitude: suggestion.longitude
    }));
  }, []);

  // Handle map click for adding deal
  const handleMapClick = useCallback(async (event) => {
    if (!clickMode) return;
    
    const { lngLat } = event;
    
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      // Reverse geocode
      const response = await fetch(
        `${API}/geocode/reverse?lat=${lngLat.lat}&lng=${lngLat.lng}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          setNewDeal(prev => ({
            ...prev,
            address: data.result.address || '',
            city: data.result.city || '',
            state: data.result.state || '',
            zip_code: data.result.zip || '',
            latitude: lngLat.lat,
            longitude: lngLat.lng
          }));
          setSearchQuery(data.result.formatted_address || '');
        } else {
          setNewDeal(prev => ({
            ...prev,
            address: '',
            city: '',
            state: '',
            zip_code: '',
            latitude: lngLat.lat,
            longitude: lngLat.lng
          }));
        }
        
        setShowCreateDeal(true);
        setClickMode(false);
        toast.success('Location selected');
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
      // Still allow creating deal even if reverse geocode fails
      setNewDeal(prev => ({
        ...prev,
        latitude: lngLat.lat,
        longitude: lngLat.lng
      }));
      setShowCreateDeal(true);
      setClickMode(false);
    }
  }, [clickMode]);

  // Filter team deals by member
  const filteredTeamDeals = useMemo(() => {
    if (selectedMemberFilter === 'all') return teamDeals;
    return teamDeals.filter(d => d.owner_id === selectedMemberFilter);
  }, [teamDeals, selectedMemberFilter]);

  // Handle marker click
  const handleMarkerClick = useCallback(async (deal, isTeamDeal = false) => {
    if (clickMode) return; // Don't show panel in click mode
    setSelectedDeal({ ...deal, isTeamDeal });
    setDealContacts([]);
    
    // Fetch full deal details including linked contacts
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      
      const response = await fetch(`${API}/deals/${deal.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const fullDeal = data.deal;
        // Extract contacts from contact_deal_links
        const contacts = (fullDeal.contact_deal_links || [])
          .map(link => link.contacts)
          .filter(Boolean);
        setDealContacts(contacts);
      }
    } catch (err) {
      console.error('Error fetching deal contacts:', err);
    }
  }, [clickMode]);

  // Format currency
  const formatCurrency = useCallback((value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  }, []);

  // Create deal
  const handleCreateDeal = useCallback(async () => {
    if (!newDeal.title.trim()) {
      toast.error('Please enter a deal title');
      return;
    }
    if (!newDeal.latitude || !newDeal.longitude) {
      toast.error('Please select a location');
      return;
    }

    setCreatingDeal(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const response = await fetch(`${API}/deals`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newDeal.title,
          address: newDeal.address,
          city: newDeal.city,
          state: newDeal.state,
          zip_code: newDeal.zip_code,
          asset_type: newDeal.asset_type,
          latitude: newDeal.latitude,
          longitude: newDeal.longitude,
          zoning: newDeal.zoning,
          pipeline_id: newDeal.pipeline_id || null,
          pipeline_stage_id: newDeal.pipeline_stage_id || null,
          asking_price: newDeal.asking_price ? parseFloat(parseFormattedNumber(newDeal.asking_price)) : null,
          size_sqft: newDeal.size_sqft ? parseFloat(parseFormattedNumber(newDeal.size_sqft)) : null,
          lot_size: newDeal.lot_size ? parseFloat(parseFormattedNumber(newDeal.lot_size)) : null,
          year_built: newDeal.year_built ? parseInt(newDeal.year_built) : null,
          noi: newDeal.noi ? parseFloat(parseFormattedNumber(newDeal.noi)) : null,
          cap_rate: newDeal.cap_rate ? parseFloat(newDeal.cap_rate) : null,
          occupancy: newDeal.occupancy ? parseFloat(newDeal.occupancy) : null
        })
      });
      
      if (response.ok) {
        toast.success('Deal created successfully');
        setShowCreateDeal(false);
        // Reset form but keep default pipeline
        const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
        setNewDeal({
          title: '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          asset_type: 'Office',
          asking_price: '',
          size_sqft: '',
          lot_size: '',
          ac_size: '',
          year_built: '',
          noi: '',
          cap_rate: '',
          occupancy: '',
          zoning: '',
          pipeline_id: defaultPipeline?.id || '',
          pipeline_stage_id: defaultPipeline?.stages?.[0]?.id || '',
          latitude: null,
          longitude: null
        });
        setSearchQuery('');
        fetchDeals();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.detail || 'Failed to create deal');
      }
    } catch (error) {
      console.error('Error creating deal:', error);
      toast.error('Failed to create deal');
    } finally {
      setCreatingDeal(false);
    }
  }, [newDeal, fetchDeals]);

  // Toggle click mode
  const toggleClickMode = useCallback(() => {
    setClickMode(prev => !prev);
    if (!clickMode) {
      toast.info('Click anywhere on the map to add a deal');
    }
  }, [clickMode]);

  // --- Side panel: update a single deal field ---
  const handleUpdateSelectedDealField = useCallback(async (field, value) => {
    if (!selectedDeal) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${selectedDeal.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (response.ok) { fetchDeals(); }
      else { toast.error('Failed to save'); }
    } catch (error) { toast.error('Failed to save'); }
  }, [selectedDeal, fetchDeals]);

  const handleSelectedDealNumericBlur = useCallback((field) => {
    if (!selectedDeal) return;
    const raw = selectedDeal[field];
    const parsed = raw === '' || raw === null || raw === undefined ? null : parseFloat(raw);
    handleUpdateSelectedDealField(field, parsed);
  }, [selectedDeal, handleUpdateSelectedDealField]);

  const handleSelectedDealTextBlur = useCallback((field) => {
    if (!selectedDeal) return;
    handleUpdateSelectedDealField(field, selectedDeal[field] || null);
  }, [selectedDeal, handleUpdateSelectedDealField]);

  const handleSelectedDealIntBlur = useCallback((field) => {
    if (!selectedDeal) return;
    const raw = selectedDeal[field];
    const parsed = raw === '' || raw === null || raw === undefined ? null : parseInt(raw, 10);
    handleUpdateSelectedDealField(field, isNaN(parsed) ? null : parsed);
  }, [selectedDeal, handleUpdateSelectedDealField]);

  // --- Side panel: image upload ---
  const handleSidePanelImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDeal) return;
    if (!file.type.startsWith('image/')) { toast.error('Upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setUploadingSidePanelImage(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API}/deals/${selectedDeal.id}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        const updatedImages = selectedDeal.image_urls ? [...selectedDeal.image_urls, data.image_url] : [data.image_url];
        setSelectedDeal(prev => ({ ...prev, image_urls: updatedImages }));
        fetchDeals();
        toast.success('Image uploaded');
      } else { toast.error('Failed to upload'); }
    } catch (err) { toast.error('Failed to upload'); }
    finally { setUploadingSidePanelImage(false); e.target.value = ''; }
  }, [selectedDeal, fetchDeals]);

  // --- Side panel: toggle team visibility ---
  const handleToggleTeamVisibility = useCallback(async (shared) => {
    if (!selectedDeal) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${selectedDeal.id}/visibility`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_with_team: shared })
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedDeal(prev => ({ ...prev, team_id: shared ? (data.deal?.team_id || 'shared') : null }));
        fetchDeals();
        fetchTeamData();
        toast.success(shared ? 'Shared with team' : 'Set to private');
      } else { toast.error('Failed to update visibility'); }
    } catch (err) { toast.error('Failed to update visibility'); }
  }, [selectedDeal, fetchDeals]);

  // Memoized markers - filtered by asset type
  const filteredDeals = useMemo(() => {
    if (!assetTypeFilter) return deals;
    return deals.filter(d => d.asset_type === assetTypeFilter);
  }, [deals, assetTypeFilter]);

  const userMarkers = useMemo(() => {
    return filteredDeals.map(deal => (
      <Marker
        key={deal.id}
        longitude={deal.longitude}
        latitude={deal.latitude}
        anchor="center"
      >
        <DealMarker 
          deal={deal} 
          onClick={() => handleMarkerClick(deal, false)}
          isTeamDeal={false}
        />
      </Marker>
    ));
  }, [filteredDeals, handleMarkerClick]);

  const teamMarkers = useMemo(() => {
    if (!showTeamDeals) return null;
    return filteredTeamDeals.map(deal => (
      <Marker
        key={`team-${deal.id}`}
        longitude={deal.longitude}
        latitude={deal.latitude}
        anchor="center"
      >
        <DealMarker 
          deal={deal} 
          onClick={() => handleMarkerClick(deal, true)}
          isTeamDeal={true}
        />
      </Marker>
    ));
  }, [showTeamDeals, filteredTeamDeals, handleMarkerClick]);

  // --- Tile prefetching for smoother performance ---
  const prefetchTimeoutRef = useRef(null);

  const prefetchTiles = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const zoom = Math.round(map.getZoom());
    const bounds = map.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const lng2tile = (lng, z) => Math.floor((lng + 180) / 360 * Math.pow(2, z));
    const lat2tile = (lat, z) => {
      const rad = lat * Math.PI / 180;
      return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, z));
    };

    const preloadForZoom = (z) => {
      const maxTile = Math.pow(2, z);
      const minX = Math.max(0, lng2tile(sw.lng, z) - 1);
      const maxX = Math.min(maxTile - 1, lng2tile(ne.lng, z) + 1);
      const minY = Math.max(0, lat2tile(ne.lat, z) - 1);
      const maxY = Math.min(maxTile - 1, lat2tile(sw.lat, z) + 1);

      // Limit to max 30 tiles per zoom level to avoid excessive requests
      const tileCount = (maxX - minX + 1) * (maxY - minY + 1);
      if (tileCount > 30) return;

      const tileUrls = mapStyle === 'satellite'
        ? [(x, y, z) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`]
        : [
            (x, y, z) => `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`,
            (x, y, z) => `https://b.tile.openstreetmap.org/${z}/${x}/${y}.png`,
          ];

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const urlFn = tileUrls[(x + y) % tileUrls.length];
          const img = new Image();
          img.src = urlFn(x, y, z);
        }
      }
    };

    // Prefetch tiles at zoom+1 (one level deeper for zoom-in readiness)
    if (zoom < 19) preloadForZoom(zoom + 1);
  }, [mapStyle]);

  const handleMapIdle = useCallback(() => {
    if (prefetchTimeoutRef.current) clearTimeout(prefetchTimeoutRef.current);
    prefetchTimeoutRef.current = setTimeout(prefetchTiles, 500);
  }, [prefetchTiles]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        onIdle={handleMapIdle}
        style={{ 
          width: '100%', 
          height: '100%',
          cursor: clickMode ? 'crosshair' : 'grab'
        }}
        mapStyle={mapStyles[mapStyle]}
        attributionControl={false}
        maxZoom={19}
        minZoom={2}
        renderWorldCopies={false}
        fadeDuration={200}
        maxTileCacheSize={300}
        refreshExpiredTiles={false}
        scrollZoom={{ speed: 1.5, smooth: true }}
        touchZoomRotate={{ around: 'center' }}
        dragRotate={false}
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" />
        {userMarkers}
        {teamMarkers}
        
        {/* Temporary marker for new deal placement */}
        {showCreateDeal && newDeal.latitude && newDeal.longitude && (
          <Marker
            longitude={newDeal.longitude}
            latitude={newDeal.latitude}
            anchor="center"
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: getDealColor(newDeal),
                border: '3px solid #00b8d4',
                boxShadow: '0 0 12px rgba(0, 184, 212, 0.6), 0 2px 8px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}
            >
              <Building2 size={12} color="white" />
            </div>
          </Marker>
        )}
      </Map>

      {/* Click Mode Indicator */}
      {clickMode && (
        <div style={{
          position: 'absolute',
          top: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: colors.primary,
          color: '#fff',
          padding: '10px 20px',
          borderRadius: borderRadius.md,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 15,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          <MousePointer size={18} />
          Click on the map to place a deal
          <button
            onClick={() => setClickMode(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px',
              marginLeft: '8px',
              cursor: 'pointer',
              display: 'flex'
            }}
          >
            <X size={16} color="#fff" />
          </button>
        </div>
      )}

      {/* Top Controls */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: selectedDeal || showCreateDeal ? '420px' : '16px',
        display: 'flex',
        gap: '12px',
        zIndex: 10,
        transition: 'right 0.3s ease'
      }}>
        {/* Search Bar with Autocomplete */}
        <div style={{
          flex: 1,
          maxWidth: '400px',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Search address..."
              style={{
                background: 'rgba(0,0,0,0.8)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary
              }}
            />
            <Button
              onClick={() => handleSearchChange(searchQuery)}
              style={{
                background: colors.primary,
                border: 'none'
              }}
            >
              <Search size={18} />
            </Button>
          </div>
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: 'rgba(12, 12, 12, 0.95)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              overflow: 'hidden',
              zIndex: 20
            }}>
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: idx < suggestions.length - 1 ? `1px solid ${colors.border}` : 'none',
                    color: colors.textPrimary,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {suggestion.formatted_address}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map Style Toggle */}
        <Button
          onClick={() => setMapStyle(mapStyle === 'satellite' ? 'street' : 'satellite')}
          style={{
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${colors.border}`,
            color: colors.textPrimary
          }}
        >
          <Layers size={18} style={{ marginRight: '8px' }} />
          {mapStyle === 'satellite' ? 'Street' : 'Satellite'}
        </Button>

        {/* Asset Type Filter */}
        <div style={{ position: 'relative' }}>
          <select
            data-testid="asset-type-filter"
            value={assetTypeFilter}
            onChange={(e) => setAssetTypeFilter(e.target.value)}
            style={{
              background: assetTypeFilter ? 'rgba(0,184,212,0.15)' : 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${assetTypeFilter ? 'rgba(0,184,212,0.5)' : colors.border}`,
              color: assetTypeFilter ? '#00d4ff' : colors.textPrimary,
              padding: '8px 12px',
              borderRadius: borderRadius.md,
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '140px',
              appearance: 'auto'
            }}
          >
            <option value="">All Asset Types</option>
            {Object.keys(assetTypeColors).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Click to Add Button */}
        <Button
          onClick={toggleClickMode}
          style={{
            background: clickMode ? colors.primary : 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${clickMode ? colors.primary : colors.border}`,
            color: clickMode ? '#fff' : colors.textPrimary
          }}
        >
          <MousePointer size={18} style={{ marginRight: '8px' }} />
          Click to Add
        </Button>

        {/* Add Deal Button */}
        <Button
          onClick={() => setShowCreateDeal(true)}
          style={{
            background: gradients.primaryButton,
            border: 'none'
          }}
        >
          <Plus size={18} style={{ marginRight: '8px' }} />
          Add Deal
        </Button>
      </div>

      {/* Team Controls - Bottom Left */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 10
      }}>
        <Button
          onClick={() => setShowTeamDeals(!showTeamDeals)}
          style={{
            background: showTeamDeals ? colors.primary : 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${showTeamDeals ? colors.primary : colors.border}`,
            color: showTeamDeals ? '#fff' : colors.textPrimary
          }}
        >
          {showTeamDeals ? <Eye size={18} /> : <EyeOff size={18} />}
          <span style={{ marginLeft: '8px' }}>Team Deals</span>
        </Button>

        {showTeamDeals && teamMembers.length > 0 && (
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${colors.border}`,
            borderRadius: borderRadius.md,
            padding: '12px',
            minWidth: '200px'
          }}>
            <div style={{
              color: colors.textTertiary,
              fontSize: '12px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Filter size={12} />
              Filter by Member
            </div>
            <select
              value={selectedMemberFilter}
              onChange={(e) => setSelectedMemberFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.1)',
                border: `1px solid ${colors.border}`,
                color: colors.textPrimary,
                fontSize: '13px'
              }}
            >
              <option value="all">All Team Members</option>
              {teamMembers.map(member => (
                <option key={member.user_id} value={member.user_id}>
                  {member.full_name || member.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        right: selectedDeal || showCreateDeal ? '420px' : '60px',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        padding: '12px',
        zIndex: 10,
        transition: 'right 0.3s ease'
      }}>
        <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>
          Asset Types
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Object.entries(assetTypeColors).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color }} />
              <span style={{ color: colors.textSecondary, fontSize: '12px' }}>{type}</span>
            </div>
          ))}
        </div>
        {showTeamDeals && (
          <div style={{ borderTop: `1px solid ${colors.border}`, margin: '8px 0', paddingTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: 0, height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '12px solid #6b7280'
              }} />
              <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Team Deal</span>
            </div>
          </div>
        )}
      </div>

      {/* Create Deal Panel */}
      {showCreateDeal && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '400px',
          height: '100%',
          background: 'rgba(12, 12, 12, 0.95)',
          backdropFilter: 'blur(20px)',
          borderLeft: `1px solid ${colors.border}`,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.3s ease'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: '600' }}>
              Create New Deal
            </h3>
            <button
              onClick={() => { setShowCreateDeal(false); setClickMode(false); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.textTertiary,
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            <p style={{ color: colors.textTertiary, fontSize: '13px', marginBottom: '16px' }}>
              Search for an address above or click on the map to set location.
            </p>

            {newDeal.latitude && newDeal.longitude && (
              <div style={{
                background: 'rgba(0, 184, 212, 0.1)',
                borderRadius: borderRadius.sm,
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ color: colors.primary, fontSize: '13px', fontWeight: '500' }}>
                  Location Set
                </div>
                <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '4px' }}>
                  {newDeal.address ? `${newDeal.address}, ${newDeal.city}, ${newDeal.state} ${newDeal.zip_code}` : `${newDeal.latitude.toFixed(5)}, ${newDeal.longitude.toFixed(5)}`}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Deal Title *</Label>
                <Input
                  value={newDeal.title}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Downtown Office Building"
                  style={{
                    marginTop: '6px',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary
                  }}
                />
              </div>

              <div>
                <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Asset Type</Label>
                <select
                  value={newDeal.asset_type}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, asset_type: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginTop: '6px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary,
                    fontSize: '14px'
                  }}
                >
                  {Object.keys(assetTypeColors).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Pipeline & Stage Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Pipeline</Label>
                  <select
                    value={newDeal.pipeline_id}
                    onChange={(e) => handlePipelineChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      marginTop: '6px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                      fontSize: '14px'
                    }}
                  >
                    {pipelines.map(pipeline => (
                      <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Stage</Label>
                  <select
                    value={newDeal.pipeline_stage_id}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, pipeline_stage_id: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      marginTop: '6px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary,
                      fontSize: '14px'
                    }}
                  >
                    {pipelineStages.map(stage => (
                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Asking Price ($)</Label>
                  <Input
                    value={newDeal.asking_price}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, asking_price: formatNumberInput(e.target.value) }))}
                    placeholder="2,500,000"
                    style={{
                      marginTop: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary
                    }}
                  />
                </div>
                <div>
                  <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Size (SF)</Label>
                  <Input
                    value={newDeal.size_sqft}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, size_sqft: formatNumberInput(e.target.value) }))}
                    placeholder="50,000"
                    style={{
                      marginTop: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Year Built</Label>
                  <Input
                    type="number"
                    value={newDeal.year_built}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, year_built: e.target.value }))}
                    placeholder="2005"
                    style={{
                      marginTop: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary
                    }}
                  />
                </div>
                <div>
                  <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Zoning</Label>
                  <Input
                    value={newDeal.zoning}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, zoning: e.target.value }))}
                    placeholder="C-2, Commercial"
                    style={{
                      marginTop: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>NOI ($)</Label>
                  <Input
                    value={newDeal.noi}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, noi: formatNumberInput(e.target.value) }))}
                    placeholder="150,000"
                    style={{
                      marginTop: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary
                    }}
                  />
                </div>
                <div>
                  <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Cap Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newDeal.cap_rate}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, cap_rate: e.target.value }))}
                    placeholder="6.5"
                    style={{
                      marginTop: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary
                    }}
                  />
                </div>
              </div>

              <div>
                <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Occupancy (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newDeal.occupancy}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, occupancy: e.target.value }))}
                  placeholder="95"
                  style={{
                    marginTop: '6px',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{
            padding: '16px',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            gap: '12px'
          }}>
            <Button
              onClick={() => { setShowCreateDeal(false); setClickMode(false); }}
              variant="outline"
              style={{ flex: 1, borderColor: colors.border, color: colors.textSecondary }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateDeal}
              disabled={creatingDeal || !newDeal.title || !newDeal.latitude}
              style={{
                flex: 1,
                background: gradients.primaryButton,
                border: 'none',
                opacity: (creatingDeal || !newDeal.title || !newDeal.latitude) ? 0.5 : 1
              }}
            >
              {creatingDeal ? 'Creating...' : 'Create Deal'}
            </Button>
          </div>
        </div>
      )}

      {/* Deal Side Panel */}
      {selectedDeal && !showCreateDeal && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '420px',
          height: '100%',
          background: 'rgba(12, 12, 12, 0.98)',
          backdropFilter: 'blur(20px)',
          borderLeft: `1px solid ${colors.border}`,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.3s ease'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: getDealColor(selectedDeal)
              }} />
              <span style={{ color: colors.textTertiary, fontSize: '12px', textTransform: 'uppercase' }}>
                {selectedDeal.asset_type || 'Property'}
                {selectedDeal.isTeamDeal && ' • Team Deal'}
              </span>
            </div>
            <button
              onClick={() => setSelectedDeal(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.textTertiary,
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {/* Image Carousel */}
            <div data-testid="side-panel-image-carousel" style={{ position: 'relative', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: colors.textTertiary, fontSize: '11px', textTransform: 'uppercase' }}>Images</span>
                {!selectedDeal.isTeamDeal && (
                  <>
                    <input
                      id="side-panel-image-upload"
                      data-testid="side-panel-image-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleSidePanelImageUpload}
                      style={{ display: 'none' }}
                      disabled={uploadingSidePanelImage}
                    />
                    <button
                      data-testid="side-panel-add-image-button"
                      onClick={() => document.getElementById('side-panel-image-upload').click()}
                      disabled={uploadingSidePanelImage}
                      style={{
                        background: 'rgba(0,184,212,0.15)', border: '1px solid rgba(0,184,212,0.3)',
                        color: '#00d4ff', fontSize: '12px', padding: '4px 10px', borderRadius: '6px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <Upload size={12} />
                      {uploadingSidePanelImage ? 'Uploading...' : 'Add'}
                    </button>
                  </>
                )}
              </div>
              <div style={{
                width: '100%', height: '180px', borderRadius: borderRadius.md, overflow: 'hidden',
                background: colors.surfaceElevated, display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative'
              }}>
                {(selectedDeal.image_urls && selectedDeal.image_urls.length > 0) ? (
                  <img
                    data-testid="side-panel-carousel-image"
                    src={selectedDeal.image_urls[sidePanelImageIdx] || selectedDeal.image_urls[0]}
                    alt={selectedDeal.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: colors.textTertiary }}>
                    <Building2 size={40} style={{ opacity: 0.4, marginBottom: '6px' }} />
                    <p style={{ fontSize: '12px' }}>No images</p>
                  </div>
                )}
                {selectedDeal.image_urls && selectedDeal.image_urls.length > 1 && (
                  <>
                    <button
                      data-testid="side-panel-carousel-prev"
                      onClick={() => setSidePanelImageIdx(prev => prev === 0 ? selectedDeal.image_urls.length - 1 : prev - 1)}
                      style={{
                        position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)',
                        width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)',
                        border: 'none', color: 'white', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      data-testid="side-panel-carousel-next"
                      onClick={() => setSidePanelImageIdx(prev => prev === selectedDeal.image_urls.length - 1 ? 0 : prev + 1)}
                      style={{
                        position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                        width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)',
                        border: 'none', color: 'white', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <ChevronRight size={18} />
                    </button>
                    <div style={{
                      position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)',
                      background: 'rgba(0,0,0,0.7)', padding: '3px 10px', borderRadius: '12px',
                      color: 'white', fontSize: '11px'
                    }}>
                      {sidePanelImageIdx + 1} / {selectedDeal.image_urls.length}
                    </div>
                  </>
                )}
              </div>
              {/* Thumbnail strip */}
              {selectedDeal.image_urls && selectedDeal.image_urls.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', overflowX: 'auto' }}>
                  {selectedDeal.image_urls.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSidePanelImageIdx(idx)}
                      style={{
                        width: '50px', height: '50px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0,
                        border: idx === sidePanelImageIdx ? '2px solid #00d4ff' : '2px solid transparent',
                        cursor: 'pointer', opacity: idx === sidePanelImageIdx ? 1 : 0.6
                      }}
                    >
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Title - editable */}
            <input
              data-testid="side-panel-title-input"
              value={selectedDeal.title || ''}
              onChange={(e) => setSelectedDeal(prev => ({ ...prev, title: e.target.value }))}
              onBlur={() => handleSelectedDealTextBlur('title')}
              disabled={selectedDeal.isTeamDeal}
              style={{
                fontSize: '20px', fontWeight: '600', color: colors.textPrimary, background: 'transparent',
                border: 'none', borderBottom: !selectedDeal.isTeamDeal ? '1px solid rgba(255,255,255,0.08)' : 'none',
                width: '100%', outline: 'none', padding: '2px 0', marginBottom: '4px'
              }}
              placeholder="Deal Title"
            />
            
            <p style={{ color: colors.textTertiary, fontSize: '13px', marginBottom: '16px' }}>
              {selectedDeal.address && `${selectedDeal.address}, `}
              {selectedDeal.city && `${selectedDeal.city}, `}
              {selectedDeal.state} {selectedDeal.zip_code}
            </p>

            {/* Pipeline & Stage Dropdowns */}
            <div style={{ 
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px',
              padding: '12px', background: 'rgba(0, 184, 212, 0.05)',
              borderRadius: borderRadius.md, border: '1px solid rgba(0, 184, 212, 0.15)'
            }}>
              <div>
                <label style={{ color: colors.textTertiary, fontSize: '11px', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Pipeline</label>
                <select
                  data-testid="side-panel-pipeline-select"
                  value={selectedDeal.pipeline_id || ''}
                  onChange={async (e) => {
                    const newPipelineId = e.target.value;
                    const pipeline = pipelines.find(p => p.id === newPipelineId);
                    const firstStage = pipeline?.stages?.[0];
                    try {
                      const session = await supabase.auth.getSession();
                      const token = session.data.session?.access_token;
                      await fetch(`${API}/deals/${selectedDeal.id}`, {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pipeline_id: newPipelineId, pipeline_stage_id: firstStage?.id || null })
                      });
                      setSelectedDeal(prev => ({ ...prev, pipeline_id: newPipelineId, pipeline_stage_id: firstStage?.id }));
                      fetchDeals();
                      toast.success('Pipeline updated');
                    } catch (err) { toast.error('Failed to update pipeline'); }
                  }}
                  disabled={selectedDeal.isTeamDeal}
                  style={{ ...sidePanelFieldStyle, cursor: 'pointer', appearance: 'auto' }}
                >
                  <option value="">Select Pipeline</option>
                  {pipelines.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div>
                <label style={{ color: colors.textTertiary, fontSize: '11px', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Stage</label>
                <select
                  data-testid="side-panel-stage-select"
                  value={selectedDeal.pipeline_stage_id || ''}
                  onChange={async (e) => {
                    const newStageId = e.target.value;
                    try {
                      const session = await supabase.auth.getSession();
                      const token = session.data.session?.access_token;
                      await fetch(`${API}/deals/${selectedDeal.id}`, {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pipeline_stage_id: newStageId })
                      });
                      setSelectedDeal(prev => ({ ...prev, pipeline_stage_id: newStageId }));
                      fetchDeals();
                      toast.success('Stage updated');
                    } catch (err) { toast.error('Failed to update stage'); }
                  }}
                  disabled={selectedDeal.isTeamDeal}
                  style={{ ...sidePanelFieldStyle, cursor: 'pointer', appearance: 'auto' }}
                >
                  <option value="">Select Stage</option>
                  {(pipelines.find(p => p.id === selectedDeal.pipeline_id)?.stages || []).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Team Sharing Toggle */}
            {!selectedDeal.isTeamDeal && (
              <div data-testid="side-panel-team-sharing" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px', marginBottom: '16px',
                background: selectedDeal.team_id ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedDeal.team_id ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: borderRadius.md,
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedDeal.team_id ? (
                    <Globe size={16} style={{ color: '#10b981' }} />
                  ) : (
                    <Lock size={16} style={{ color: colors.textTertiary }} />
                  )}
                  <div>
                    <div style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: '500' }}>
                      {selectedDeal.team_id ? 'Shared with Team' : 'Private'}
                    </div>
                    <div style={{ color: colors.textTertiary, fontSize: '11px' }}>
                      {selectedDeal.team_id ? 'Visible in team deals' : 'Only visible to you'}
                    </div>
                  </div>
                </div>
                <button
                  data-testid="team-sharing-toggle"
                  onClick={() => handleToggleTeamVisibility(!selectedDeal.team_id)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px', padding: '2px',
                    background: selectedDeal.team_id ? '#10b981' : 'rgba(255,255,255,0.15)',
                    border: 'none', cursor: 'pointer', transition: 'background 0.2s ease',
                    display: 'flex', alignItems: 'center',
                    justifyContent: selectedDeal.team_id ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: '#fff', transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                  }} />
                </button>
              </div>
            )}

            {/* Asking Price - editable with formatted display */}
            <div data-testid="side-panel-asking-price" style={{
              background: 'rgba(0, 184, 212, 0.1)', borderRadius: borderRadius.md,
              padding: '14px', marginBottom: '16px'
            }}>
              <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>Asking Price</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <DollarSign size={22} style={{ color: colors.primary, flexShrink: 0 }} />
                <input
                  data-testid="side-panel-asking-price-input"
                  value={selectedDeal.asking_price ? formatNumberInput(String(selectedDeal.asking_price)) : ''}
                  onChange={(e) => {
                    const raw = parseFormattedNumber(e.target.value);
                    setSelectedDeal(prev => ({ ...prev, asking_price: raw }));
                  }}
                  onBlur={() => handleSelectedDealNumericBlur('asking_price')}
                  disabled={selectedDeal.isTeamDeal}
                  placeholder="0"
                  style={{
                    fontSize: '24px', fontWeight: '700', color: colors.primary,
                    background: 'transparent', border: 'none', outline: 'none', width: '100%'
                  }}
                />
              </div>
            </div>

            {/* All Property Details - editable grid */}
            <div data-testid="side-panel-property-details" style={{ marginBottom: '16px' }}>
              <div style={{ color: colors.textTertiary, fontSize: '11px', textTransform: 'uppercase', marginBottom: '10px' }}>Property Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ color: colors.textTertiary, fontSize: '11px', display: 'block', marginBottom: '4px' }}>Building Size (SF)</label>
                  <input data-testid="side-panel-size-input" value={selectedDeal.size_sqft ? formatNumberInput(String(selectedDeal.size_sqft)) : ''}
                    onChange={(e) => setSelectedDeal(prev => ({ ...prev, size_sqft: parseFormattedNumber(e.target.value) }))}
                    onBlur={() => handleSelectedDealNumericBlur('size_sqft')}
                    disabled={selectedDeal.isTeamDeal} placeholder="0" style={sidePanelFieldStyle} />
                </div>
                <div>
                  <label style={{ color: colors.textTertiary, fontSize: '11px', display: 'block', marginBottom: '4px' }}>Lot Size - Land (Acres)</label>
                  <input data-testid="side-panel-lot-size-input" value={selectedDeal.lot_size ? formatNumberInput(String(selectedDeal.lot_size)) : ''}
                    onChange={(e) => setSelectedDeal(prev => ({ ...prev, lot_size: parseFormattedNumber(e.target.value) }))}
                    onBlur={() => handleSelectedDealNumericBlur('lot_size')}
                    disabled={selectedDeal.isTeamDeal} placeholder="0" style={sidePanelFieldStyle} />
                </div>
                <div>
                  <label style={{ color: colors.textTertiary, fontSize: '11px', display: 'block', marginBottom: '4px' }}>Cap Rate (%)</label>
                  <input data-testid="side-panel-cap-rate-input" type="number" step="0.01" value={selectedDeal.cap_rate ?? ''}
                    onChange={(e) => setSelectedDeal(prev => ({ ...prev, cap_rate: e.target.value }))}
                    onBlur={() => handleSelectedDealNumericBlur('cap_rate')}
                    disabled={selectedDeal.isTeamDeal} placeholder="0" style={sidePanelFieldStyle} />
                </div>
                <div>
                  <label style={{ color: colors.textTertiary, fontSize: '11px', display: 'block', marginBottom: '4px' }}>NOI ($)</label>
                  <input data-testid="side-panel-noi-input" type="number" value={selectedDeal.noi ?? ''}
                    onChange={(e) => setSelectedDeal(prev => ({ ...prev, noi: e.target.value }))}
                    onBlur={() => handleSelectedDealNumericBlur('noi')}
                    disabled={selectedDeal.isTeamDeal} placeholder="0" style={sidePanelFieldStyle} />
                </div>
                <div>
                  <label style={{ color: colors.textTertiary, fontSize: '11px', display: 'block', marginBottom: '4px' }}>Year Built</label>
                  <input data-testid="side-panel-year-built-input" type="number" value={selectedDeal.year_built ?? ''}
                    onChange={(e) => setSelectedDeal(prev => ({ ...prev, year_built: e.target.value }))}
                    onBlur={() => handleSelectedDealIntBlur('year_built')}
                    disabled={selectedDeal.isTeamDeal} placeholder="Year" style={sidePanelFieldStyle} />
                </div>
                <div>
                  <label style={{ color: colors.textTertiary, fontSize: '11px', display: 'block', marginBottom: '4px' }}>Occupancy (%)</label>
                  <input data-testid="side-panel-occupancy-input" type="number" value={selectedDeal.occupancy ?? ''}
                    onChange={(e) => setSelectedDeal(prev => ({ ...prev, occupancy: e.target.value }))}
                    onBlur={() => handleSelectedDealNumericBlur('occupancy')}
                    disabled={selectedDeal.isTeamDeal} placeholder="0" style={sidePanelFieldStyle} />
                </div>
                <div>
                  <label style={{ color: colors.textTertiary, fontSize: '11px', display: 'block', marginBottom: '4px' }}>Zoning</label>
                  <input data-testid="side-panel-zoning-input" value={selectedDeal.zoning || ''}
                    onChange={(e) => setSelectedDeal(prev => ({ ...prev, zoning: e.target.value }))}
                    onBlur={() => handleSelectedDealTextBlur('zoning')}
                    disabled={selectedDeal.isTeamDeal} placeholder="Zoning" style={sidePanelFieldStyle} />
                </div>
                <div>
                  <label style={{ color: colors.textTertiary, fontSize: '11px', display: 'block', marginBottom: '4px' }}>Asset Type</label>
                  <select data-testid="side-panel-asset-type-select" value={selectedDeal.asset_type || ''}
                    onChange={(e) => { setSelectedDeal(prev => ({ ...prev, asset_type: e.target.value })); handleUpdateSelectedDealField('asset_type', e.target.value); }}
                    disabled={selectedDeal.isTeamDeal}
                    style={{ ...sidePanelFieldStyle, cursor: 'pointer', appearance: 'auto' }}
                  >
                    <option value="">Select type</option>
                    {Object.keys(assetTypeColors).map(type => (<option key={type} value={type}>{type}</option>))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            {dealContacts.length > 0 && (
              <div data-testid="side-panel-contacts" style={{ marginBottom: '16px' }}>
                <div style={{ color: colors.textTertiary, fontSize: '11px', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Contacts ({dealContacts.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dealContacts.map((contact, idx) => (
                    <div key={contact.id || idx} style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '10px 12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <User size={14} style={{ color: colors.primary }} />
                        <span style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: '500' }}>
                          {contact.name || 'Unnamed'}
                        </span>
                        {contact.contact_type && (
                          <span style={{
                            fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                            background: 'rgba(0,184,212,0.15)', color: '#00d4ff', marginLeft: 'auto'
                          }}>
                            {contact.contact_type}
                          </span>
                        )}
                      </div>
                      {contact.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <Mail size={12} style={{ color: colors.textTertiary }} />
                          <a href={`mailto:${contact.email}`} style={{ color: colors.textSecondary, fontSize: '12px', textDecoration: 'none' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#00d4ff'}
                            onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
                          >
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={12} style={{ color: colors.textTertiary }} />
                          <a href={`tel:${contact.phone}`} style={{ color: colors.textSecondary, fontSize: '12px', textDecoration: 'none' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#00d4ff'}
                            onMouseLeave={(e) => e.currentTarget.style.color = colors.textSecondary}
                          >
                            {contact.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div data-testid="side-panel-notes-section" style={{ marginBottom: '16px' }}>
              <div style={{ color: colors.textTertiary, fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>Notes</div>
              <textarea
                data-testid="side-panel-notes-textarea"
                value={selectedDeal.notes || ''}
                onChange={(e) => setSelectedDeal(prev => ({ ...prev, notes: e.target.value }))}
                onBlur={() => handleSelectedDealTextBlur('notes')}
                disabled={selectedDeal.isTeamDeal}
                rows={3}
                placeholder="Add notes..."
                style={{ ...sidePanelFieldStyle, resize: 'vertical', minHeight: '60px', lineHeight: '1.5' }}
              />
            </div>

            {selectedDeal.isTeamDeal && selectedDeal.user_profiles && (
              <div style={{
                background: colors.surfaceElevated, borderRadius: borderRadius.md,
                padding: '12px', display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                <Users size={20} style={{ color: colors.textTertiary }} />
                <div>
                  <div style={{ color: colors.textTertiary, fontSize: '11px' }}>Owner</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>
                    {selectedDeal.user_profiles.full_name || selectedDeal.user_profiles.email}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '16px', borderTop: `1px solid ${colors.border}` }}>
            <Button
              onClick={() => navigate(`/deals/${selectedDeal.id}`)}
              style={{ width: '100%', background: gradients.primaryButton, border: 'none', height: '44px' }}
            >
              View Full Details
              <ChevronRight size={18} style={{ marginLeft: '8px' }} />
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30
        }}>
          <div style={{ color: colors.textPrimary }}>Loading map...</div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 12px rgba(0, 184, 212, 0.6), 0 2px 8px rgba(0,0,0,0.4); }
          50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(0, 184, 212, 0.8), 0 2px 12px rgba(0,0,0,0.5); }
        }
      `}</style>
    </div>
  );
};

export default MapView;
