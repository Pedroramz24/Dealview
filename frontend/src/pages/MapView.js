import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import Map, { Marker, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  Building2, X, ChevronRight, ChevronLeft, Users, 
  Eye, EyeOff, Filter, Layers, Plus, Search, MousePointer, Upload, DollarSign
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

// Optimized map styles
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
      'carto-dark': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
        ],
        tileSize: 256,
        maxzoom: 20,
        attribution: '© CartoDB © OpenStreetMap'
      }
    },
    layers: [
      {
        id: 'carto-dark-layer',
        type: 'raster',
        source: 'carto-dark',
        minzoom: 0,
        maxzoom: 20
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
  const handleMarkerClick = useCallback((deal, isTeamDeal = false) => {
    if (clickMode) return; // Don't show panel in click mode
    setSelectedDeal({ ...deal, isTeamDeal });
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

  // Memoized markers
  const userMarkers = useMemo(() => {
    return deals.map(deal => (
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
  }, [deals, handleMarkerClick]);

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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map */}
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
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
        fadeDuration={300}
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
                  <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Lot Size (Acres)</Label>
                  <Input
                    value={newDeal.lot_size}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, lot_size: formatNumberInput(e.target.value) }))}
                    placeholder="2.5"
                    style={{
                      marginTop: '6px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary
                    }}
                  />
                </div>
                <div>
                  <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>AC Size (Tons)</Label>
                  <Input
                    value={newDeal.ac_size}
                    onChange={(e) => setNewDeal(prev => ({ ...prev, ac_size: e.target.value }))}
                    placeholder="150"
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
            {/* Property Images */}
            {(selectedDeal.image_url || (selectedDeal.image_urls && selectedDeal.image_urls.length > 0)) && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  width: '100%',
                  height: '180px',
                  borderRadius: borderRadius.md,
                  overflow: 'hidden',
                  background: colors.surfaceElevated
                }}>
                  <img 
                    src={selectedDeal.image_url || selectedDeal.image_urls[0]} 
                    alt={selectedDeal.title}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
                {selectedDeal.image_urls && selectedDeal.image_urls.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', overflowX: 'auto' }}>
                    {selectedDeal.image_urls.slice(1, 4).map((url, idx) => (
                      <div key={idx} style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                    {selectedDeal.image_urls.length > 4 && (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        +{selectedDeal.image_urls.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <h2 style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
              {selectedDeal.title}
            </h2>
            
            <p style={{ color: colors.textTertiary, fontSize: '14px', marginBottom: '16px' }}>
              {selectedDeal.address && `${selectedDeal.address}, `}
              {selectedDeal.city && `${selectedDeal.city}, `}
              {selectedDeal.state} {selectedDeal.zip_code}
            </p>

            {/* Pipeline & Stage Dropdowns */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px', 
              marginBottom: '16px',
              padding: '12px',
              background: 'rgba(0, 184, 212, 0.05)',
              borderRadius: borderRadius.md,
              border: '1px solid rgba(0, 184, 212, 0.15)'
            }}>
              <div>
                <label style={{ color: colors.textTertiary, fontSize: '11px', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Pipeline</label>
                <select
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
                        body: JSON.stringify({ 
                          pipeline_id: newPipelineId,
                          pipeline_stage_id: firstStage?.id || null
                        })
                      });
                      setSelectedDeal(prev => ({ ...prev, pipeline_id: newPipelineId, pipeline_stage_id: firstStage?.id }));
                      fetchDeals();
                      toast.success('Pipeline updated');
                    } catch (err) {
                      toast.error('Failed to update pipeline');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: colors.surfaceCard,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    color: colors.textPrimary,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select Pipeline</option>
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ color: colors.textTertiary, fontSize: '11px', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Stage</label>
                <select
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
                    } catch (err) {
                      toast.error('Failed to update stage');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: colors.surfaceCard,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    color: colors.textPrimary,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select Stage</option>
                  {(pipelines.find(p => p.id === selectedDeal.pipeline_id)?.stages || []).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Asking Price */}
            <div style={{
              background: 'rgba(0, 184, 212, 0.1)',
              borderRadius: borderRadius.md,
              padding: '16px',
              marginBottom: '16px'
            }}>
              <div style={{ color: colors.textTertiary, fontSize: '12px', marginBottom: '4px' }}>Asking Price</div>
              <div style={{ color: colors.primary, fontSize: '28px', fontWeight: '700' }}>
                {formatCurrency(selectedDeal.asking_price)}
              </div>
            </div>

            {/* Property Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {selectedDeal.size_sqft && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>Size</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>{selectedDeal.size_sqft.toLocaleString()} SF</div>
                </div>
              )}
              {selectedDeal.lot_size && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>Lot Size</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>{selectedDeal.lot_size} Acres</div>
                </div>
              )}
              {selectedDeal.cap_rate && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>Cap Rate</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>{selectedDeal.cap_rate}%</div>
                </div>
              )}
              {selectedDeal.noi && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>NOI</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>{formatCurrency(selectedDeal.noi)}</div>
                </div>
              )}
              {selectedDeal.year_built && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>Year Built</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>{selectedDeal.year_built}</div>
                </div>
              )}
              {selectedDeal.occupancy && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>Occupancy</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>{selectedDeal.occupancy}%</div>
                </div>
              )}
              {selectedDeal.zoning && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>Zoning</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>{selectedDeal.zoning}</div>
                </div>
              )}
              {selectedDeal.ac_size && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>AC Size</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>{selectedDeal.ac_size} Tons</div>
                </div>
              )}
            </div>

            {selectedDeal.notes && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ color: colors.textTertiary, fontSize: '12px', marginBottom: '8px' }}>Notes</div>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.5' }}>{selectedDeal.notes}</p>
              </div>
            )}

            {selectedDeal.isTeamDeal && selectedDeal.user_profiles && (
              <div style={{
                background: colors.surfaceElevated,
                borderRadius: borderRadius.md,
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
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
