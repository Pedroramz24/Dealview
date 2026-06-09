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
  User, Mail, Phone, Lock, Globe, Trash2, MapPin
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { colors, gradients, borderRadius, spacing } from '../styles/designSystem';
import { assetTypeColors } from '../utils/assetTypeColors';
import PropertyIntelligencePanel from '../components/PropertyIntelligencePanel';
import ContactFormPanel from '../components/ContactFormPanel';

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
// Get pin color for a deal based on asset type — uses shared utility map
const getDealColor = (deal) => {
  return assetTypeColors[deal?.asset_type]?.color || '#6b7280';
};

// Optimized map styles with prefetch-friendly config
const mapStyles = {
  satellite: {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© Esri'
      },
      'ofm-vector': {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
        attribution: '© OpenFreeMap © OpenStreetMap'
      }
    },
    layers: [
      {
        id: 'esri-satellite-layer',
        type: 'raster',
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 19,
        paint: { 'raster-fade-duration': 0 }
      },
      {
        id: 'road-labels',
        type: 'symbol',
        source: 'ofm-vector',
        'source-layer': 'transportation_name',
        minzoom: 13,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 16, 13, 18, 15],
          'symbol-placement': 'line',
          'text-max-angle': 30,
          'text-padding': 2,
          'symbol-spacing': 250
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.75)',
          'text-halo-width': 1.5,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.7, 15, 1]
        }
      },
      {
        id: 'water-labels',
        type: 'symbol',
        source: 'ofm-vector',
        'source-layer': 'water_name',
        minzoom: 8,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Italic'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 14, 14],
          'text-letter-spacing': 0.1
        },
        paint: {
          'text-color': '#a0d8ef',
          'text-halo-color': 'rgba(0,0,0,0.6)',
          'text-halo-width': 1
        }
      },
      {
        id: 'place-city-labels',
        type: 'symbol',
        source: 'ofm-vector',
        'source-layer': 'place',
        minzoom: 3,
        maxzoom: 14,
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'],
            3, 10, 6, 12, 8, 14, 10, 16, 12, 18
          ],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.08,
          'text-max-width': 8,
          'text-allow-overlap': false,
          'text-padding': 6
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 2
        }
      },
      {
        id: 'place-village-labels',
        type: 'symbol',
        source: 'ofm-vector',
        'source-layer': 'place',
        minzoom: 10,
        maxzoom: 16,
        filter: ['in', ['get', 'class'], ['literal', ['village', 'suburb', 'neighbourhood', 'hamlet']]],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10, 14, 13],
          'text-max-width': 8,
          'text-padding': 4
        },
        paint: {
          'text-color': 'rgba(255,255,255,0.9)',
          'text-halo-color': 'rgba(0,0,0,0.6)',
          'text-halo-width': 1.5
        }
      },
      {
        id: 'place-state-labels',
        type: 'symbol',
        source: 'ofm-vector',
        'source-layer': 'place',
        minzoom: 3,
        maxzoom: 8,
        filter: ['==', ['get', 'class'], 'state'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 9, 6, 12],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.15,
          'text-max-width': 8,
          'text-padding': 6
        },
        paint: {
          'text-color': 'rgba(255,255,255,0.6)',
          'text-halo-color': 'rgba(0,0,0,0.5)',
          'text-halo-width': 1
        }
      },
      {
        id: 'county-boundary',
        type: 'line',
        source: 'ofm-vector',
        'source-layer': 'boundary',
        minzoom: 8,
        maxzoom: 14,
        filter: ['all', ['==', ['get', 'admin_level'], 6]],
        paint: {
          'line-color': 'rgba(255,255,255,0.25)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 1.5],
          'line-dasharray': [4, 3]
        }
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
      <div onClick={onClick} style={{ cursor: 'pointer', position: 'relative' }}>
        <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z" fill={color} stroke="white" strokeWidth="2"/>
          <circle cx="12" cy="11" r="4" fill="white" opacity="0.9"/>
        </svg>
      </div>
    );
  }
  
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', position: 'relative' }}>
      <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill={color} stroke="white" strokeWidth="2.5"/>
        <circle cx="14" cy="13" r="5" fill="white" opacity="0.9"/>
      </svg>
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
  const [showTitlePrompt, setShowTitlePrompt] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
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
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [allContacts, setAllContacts] = useState([]);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', contact_type: 'Buyer' });
  const [savingContact, setSavingContact] = useState(false);
  
  // Create deal contact state
  const [createDealContact, setCreateDealContact] = useState(null); // selected existing contact
  const [showCreateDealContactForm, setShowCreateDealContactForm] = useState(false);
  const [createDealNewContact, setCreateDealNewContact] = useState({ name: '', phone: '', email: '', company: '', tag_ids: [] });
  const [createDealContactSearch, setCreateDealContactSearch] = useState('');
  const [showCreateDealContactPanel, setShowCreateDealContactPanel] = useState(false);

  // Helper: optimistically update a deal in local state without refetching
  const updateDealInState = useCallback((dealId, updates) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, ...updates } : d));
  }, []);

  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // Map viewport — uncontrolled for performance (MapLibre handles its own state)
  const initialViewState = useRef({
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
        
        // Only center map on first load, never on refetch
        if (!initialLoadDone && dealsData.length > 0 && dealsData[0].latitude && dealsData[0].longitude) {
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [dealsData[0].longitude, dealsData[0].latitude],
              zoom: 12,
              duration: 1000
            });
          }
          setInitialLoadDone(true);
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
    
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [suggestion.longitude, suggestion.latitude],
        zoom: 16,
        duration: 1200
      });
    }
    
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
        
        setShowTitlePrompt(true);
        setClickMode(false);
        
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
      // Still allow creating deal even if reverse geocode fails
      setNewDeal(prev => ({
        ...prev,
        latitude: lngLat.lat,
        longitude: lngLat.lng
      }));
      setShowTitlePrompt(true);
      setClickMode(false);
      fetchAllContacts();
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
        // Update selectedDeal with full data from API
        setSelectedDeal({ ...fullDeal, isTeamDeal });
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

  // Quick-create deal: title + location only, then open PropertyIntelligencePanel
  const handleQuickCreateDeal = useCallback(async () => {
    const title = promptTitle.trim() || newDeal.address || 'New Deal';
    if (!newDeal.latitude || !newDeal.longitude) {
      toast.error('Please select a location on the map first');
      return;
    }

    setCreatingDeal(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];

      const response = await fetch(`${API}/deals`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          address: newDeal.address,
          city: newDeal.city,
          state: newDeal.state,
          zip_code: newDeal.zip_code,
          latitude: newDeal.latitude,
          longitude: newDeal.longitude,
          pipeline_id: defaultPipeline?.id || null,
          pipeline_stage_id: defaultPipeline?.stages?.[0]?.id || null,
        })
      });

      if (response.ok) {
        const dealData = await response.json();
        toast.success('Deal created — fill in the details below');
        // Close prompt and open PropertyIntelligencePanel immediately
        setShowTitlePrompt(false);
        setPromptTitle('');
        setNewDeal(prev => ({ ...prev, latitude: null, longitude: null, address: '', city: '', state: '', zip_code: '' }));
        setSearchQuery('');
        if (dealData.deal) {
          setSelectedDeal({ ...dealData.deal });
        }
        fetchDeals();
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.detail || 'Failed to create deal');
      }
    } catch (error) {
      console.error('Error creating deal:', error);
      toast.error('Failed to create deal');
    } finally {
      setCreatingDeal(false);
    }
  }, [promptTitle, newDeal, pipelines, fetchDeals]);

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
      if (response.ok) {
        // Optimistic: update only this deal in local state, no full refetch
        updateDealInState(selectedDeal.id, { [field]: value });
      }
      else { toast.error('Failed to save'); }
    } catch (error) { toast.error('Failed to save'); }
  }, [selectedDeal, updateDealInState]);

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
        // Optimistic update — no full refetch
        updateDealInState(selectedDeal.id, { image_urls: updatedImages });
        
      } else {
        const errData = await response.json().catch(() => null);
        toast.error(errData?.detail || `Upload failed (${response.status})`);
      }
    } catch (err) { toast.error(`Upload error: ${err.message}`); }
    finally { setUploadingSidePanelImage(false); e.target.value = ''; }
  }, [selectedDeal, updateDealInState]);

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
        const newTeamId = shared ? (data.deal?.team_id || 'shared') : null;
        setSelectedDeal(prev => ({ ...prev, team_id: newTeamId }));
        updateDealInState(selectedDeal.id, { team_id: newTeamId });
        // Optimistically update teamDeals without refetching
        if (shared) {
          setTeamDeals(prev => [...prev.filter(d => d.id !== selectedDeal.id), { ...selectedDeal, team_id: newTeamId }]);
        } else {
          setTeamDeals(prev => prev.filter(d => d.id !== selectedDeal.id));
        }
      } else { toast.error('Failed to update visibility'); }
    } catch (err) { toast.error('Failed to update visibility'); }
  }, [selectedDeal, updateDealInState]);

  // --- Delete deal from side panel ---
  const handleDeleteSelectedDeal = useCallback(async () => {
    if (!selectedDeal || selectedDeal.isTeamDeal) return;
    if (!window.confirm(`Delete "${selectedDeal.title || selectedDeal.address}"? This cannot be undone.`)) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${selectedDeal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setDeals(prev => prev.filter(d => d.id !== selectedDeal.id));
        setTeamDeals(prev => prev.filter(d => d.id !== selectedDeal.id));
        setSelectedDeal(null);
        toast.success('Deal deleted');
      } else { toast.error('Failed to delete deal'); }
    } catch { toast.error('Failed to delete deal'); }
  }, [selectedDeal]);

  // --- Contact management from side panel ---
  const fetchAllContacts = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const response = await fetch(`${API}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAllContacts(data.contacts || []);
      }
    } catch (err) { console.error('Error fetching contacts:', err); }
  }, []);

  const handleLinkContact = useCallback(async (contactId) => {
    if (!selectedDeal) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${selectedDeal.id}/contacts/${contactId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        // Refresh contacts for this deal
        handleMarkerClick(selectedDeal, selectedDeal.isTeamDeal);
        setShowContactSearch(false);
        setContactSearchQuery('');
        
      } else { toast.error('Failed to link contact'); }
    } catch (err) { toast.error('Failed to link contact'); }
  }, [selectedDeal, handleMarkerClick]);

  const handleUnlinkContact = useCallback(async (contactId) => {
    if (!selectedDeal) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${selectedDeal.id}/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setDealContacts(prev => prev.filter(c => c.id !== contactId));
        
      } else { toast.error('Failed to unlink contact'); }
    } catch (err) { toast.error('Failed to unlink contact'); }
  }, [selectedDeal]);

  const handleCreateAndLinkContact = useCallback(async () => {
    if (!newContact.name.trim() || !selectedDeal) return;
    setSavingContact(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      // Create the contact
      const createRes = await fetch(`${API}/contacts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact)
      });
      if (!createRes.ok) { toast.error('Failed to create contact'); return; }
      const created = await createRes.json();
      const contactId = created.contact?.id;
      if (!contactId) { toast.error('Failed to create contact'); return; }
      // Link to deal
      await fetch(`${API}/deals/${selectedDeal.id}/contacts/${contactId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      handleMarkerClick(selectedDeal, selectedDeal.isTeamDeal);
      setShowNewContactForm(false);
      setShowContactSearch(false);
      setNewContact({ name: '', email: '', phone: '', contact_type: 'Buyer' });
      
    } catch (err) { toast.error('Failed to create contact'); }
    finally { setSavingContact(false); }
  }, [newContact, selectedDeal, handleMarkerClick]);

  const filteredContactResults = useMemo(() => {
    if (!contactSearchQuery.trim()) return allContacts;
    const q = contactSearchQuery.toLowerCase();
    return allContacts.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  }, [allContacts, contactSearchQuery]);

  const linkedContactIds = useMemo(() => new Set(dealContacts.map(c => c.id)), [dealContacts]);

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
        anchor="bottom"
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
        anchor="bottom"
      >
        <DealMarker 
          deal={deal} 
          onClick={() => handleMarkerClick(deal, true)}
          isTeamDeal={true}
        />
      </Marker>
    ));
  }, [showTeamDeals, filteredTeamDeals, handleMarkerClick]);

  // --- Tile prefetching removed: MapLibre handles caching natively ---
  // The previous prefetchTiles function created Image() requests that competed
  // with MapLibre for the browser's 6-connection-per-domain limit, causing lag.

  // Callbacks for the unified PropertyIntelligencePanel
  const handlePanelClose = useCallback(() => {
    setSelectedDeal(null);
  }, []);

  const handlePanelUpdate = useCallback(async () => {
    if (!selectedDeal) return;
    // Re-fetch this specific deal from the API to get fresh, authoritative data
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const response = await fetch(`${API}/deals/${selectedDeal.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        const freshDeal = { ...result.deal, isTeamDeal: selectedDeal.isTeamDeal };
        setSelectedDeal(freshDeal);
        updateDealInState(selectedDeal.id, freshDeal);
      }
    } catch (err) {
      // Fallback: just spread current selectedDeal (already mutated by panel)
      updateDealInState(selectedDeal.id, { ...selectedDeal });
    }
  }, [selectedDeal, updateDealInState]);

  const handlePanelDealDeleted = useCallback((deletedId) => {
    setDeals(prev => prev.filter(d => d.id !== deletedId));
    setTeamDeals(prev => prev.filter(d => d.id !== deletedId));
    setSelectedDeal(null);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map */}
      <Map
        ref={mapRef}
        initialViewState={initialViewState.current}
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
        fadeDuration={0}
        maxTileCacheSize={800}
        refreshExpiredTiles={false}
        scrollZoom={{ speed: 1.0 }}
        touchZoomRotate={{ around: 'center' }}
        dragRotate={false}
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" />
        {userMarkers}
        {teamMarkers}
        
        {/* Temporary marker for new deal placement */}
        {showTitlePrompt && newDeal.latitude && newDeal.longitude && (
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
                border: '3px solid #ff0000',
                boxShadow: '0 0 12px rgba(255, 0, 0, 0.6), 0 2px 8px rgba(0,0,0,0.4)',
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
        right: selectedDeal ? '420px' : '16px',
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
                  key={suggestion.place_id || suggestion.display_name || idx}
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
              background: assetTypeFilter ? 'rgba(212,18,18,0.15)' : 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${assetTypeFilter ? 'rgba(212,18,18,0.5)' : colors.border}`,
              color: assetTypeFilter ? '#ff0000' : colors.textPrimary,
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

        {/* Add Deal Button — activates click mode to place on map */}
        <Button
          onClick={toggleClickMode}
          style={{
            background: clickMode ? colors.primary : gradients.primaryButton,
            border: 'none'
          }}
        >
          <Plus size={18} style={{ marginRight: '8px' }} />
          {clickMode ? 'Click Map to Place' : 'Add Deal'}
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
        right: selectedDeal ? '520px' : '60px',
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
          {Object.entries(assetTypeColors).map(([type, val]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: val.color, flexShrink: 0 }} />
              <span style={{ color: colors.textSecondary, fontSize: '11px' }}>{type}</span>
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

      {/* Minimal title prompt — replaces old Create Deal form */}
      {showTitlePrompt && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1060,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => { setShowTitlePrompt(false); setClickMode(false); setPromptTitle(''); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '480px', margin: '0 16px',
              background: 'rgba(11,12,14,0.98)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px', padding: '32px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
            }}
          >
            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '6px', letterSpacing: '-0.02em' }}>
              Name Your Deal
            </h3>
            {newDeal.address && (
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={12} style={{ color: colors.primary, flexShrink: 0 }} />
                {newDeal.address}{newDeal.city ? `, ${newDeal.city}` : ''}{newDeal.state ? `, ${newDeal.state}` : ''}
              </p>
            )}
            <input
              autoFocus
              data-testid="quick-deal-title-input"
              type="text"
              value={promptTitle}
              onChange={(e) => setPromptTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !creatingDeal) handleQuickCreateDeal(); if (e.key === 'Escape') { setShowTitlePrompt(false); setClickMode(false); setPromptTitle(''); } }}
              placeholder={newDeal.address || 'e.g., Downtown Office Building'}
              style={{
                width: '100%', padding: '14px 16px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px', color: '#fff', fontSize: '16px', outline: 'none',
                marginBottom: '20px', transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = colors.primary; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '20px' }}>
              Leave blank to use the address as the title. You can edit all details after creation.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowTitlePrompt(false); setClickMode(false); setPromptTitle(''); }}
                style={{
                  flex: 1, padding: '13px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                data-testid="quick-deal-create-btn"
                onClick={handleQuickCreateDeal}
                disabled={creatingDeal}
                style={{
                  flex: 2, padding: '13px',
                  background: creatingDeal ? 'rgba(212,18,18,0.4)' : '#ff0000',
                  border: 'none', borderRadius: '10px',
                  color: '#fff', fontSize: '14px', fontWeight: '700',
                  cursor: creatingDeal ? 'not-allowed' : 'pointer',
                  boxShadow: creatingDeal ? 'none' : '0 4px 16px rgba(255,0,0,0.35)',
                }}
              >
                {creatingDeal ? 'Creating...' : 'Create Deal & Open Details'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deal Side Panel — Unified PropertyIntelligencePanel */}
      {selectedDeal && (
        <PropertyIntelligencePanel
          isOpen={true}
          onClose={handlePanelClose}
          data={selectedDeal}
          type="deal"
          onUpdate={handlePanelUpdate}
          onDealDeleted={handlePanelDealDeleted}
        />
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

      {/* Contact Form Panel for Create Deal */}
      <ContactFormPanel
        isOpen={showCreateDealContactPanel}
        onClose={() => setShowCreateDealContactPanel(false)}
        onContactCreated={(newContact) => {
          setCreateDealContact(newContact);
          setShowCreateDealContactPanel(false);
        }}
        editingContact={null}
        dealId={null}
      />

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes marker-breathe {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.15); }
        }
        /* Prevent marker clipping at map edges */
        .maplibregl-marker {
          overflow: visible !important;
        }
        .maplibregl-canvas-container {
          overflow: visible !important;
        }
      `}</style>
    </div>
  );
};

export default MapView;
