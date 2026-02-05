import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import Map, { Marker, NavigationControl, ScaleControl, Source, Layer } from 'react-map-gl/maplibre';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  MapPin, Building2, X, ChevronRight, Users, 
  Eye, EyeOff, Filter, Layers, Plus, Search, MapIcon
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { colors, gradients, borderRadius, spacing } from '../styles/designSystem';

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

// Optimized map styles using free, fast tile providers
const mapStyles = {
  // Esri World Imagery - Free, fast, high quality satellite
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
  // CartoDB Dark Matter - Fast dark street map
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

// Memoized marker component for performance
const DealMarker = React.memo(({ deal, onClick, isTeamDeal }) => {
  const color = getDealColor(deal);
  
  if (isTeamDeal) {
    // Triangle for team deals
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
  
  // Circle for user's deals
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
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [newDeal, setNewDeal] = useState({
    title: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    asset_type: 'Office',
    asking_price: '',
    latitude: null,
    longitude: null
  });
  const [creatingDeal, setCreatingDeal] = useState(false);
  
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
  }, []);

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
        
        // Center map on first deal with location
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

      // Fetch team members
      const membersRes = await fetch(`${API}/teams/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (membersRes.ok) {
        const data = await membersRes.json();
        setTeamMembers(data.members || []);
      }

      // Fetch team deals
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

  // Filter team deals by member - memoized
  const filteredTeamDeals = useMemo(() => {
    if (selectedMemberFilter === 'all') return teamDeals;
    return teamDeals.filter(d => d.owner_id === selectedMemberFilter);
  }, [teamDeals, selectedMemberFilter]);

  // Handle marker click
  const handleMarkerClick = useCallback((deal, isTeamDeal = false) => {
    setSelectedDeal({ ...deal, isTeamDeal });
  }, []);

  // Close side panel
  const closeSidePanel = useCallback(() => {
    setSelectedDeal(null);
  }, []);

  // Format currency
  const formatCurrency = useCallback((value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  }, []);

  // Search handler with geocoding
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const response = await fetch(`${API}/geocode?address=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.result) {
          setViewState({
            longitude: data.result.longitude,
            latitude: data.result.latitude,
            zoom: 16
          });
          // Set the coordinates for new deal
          setNewDeal(prev => ({
            ...prev,
            address: searchQuery,
            city: data.result.city || '',
            state: data.result.state || '',
            zip_code: data.result.zip || '',
            latitude: data.result.latitude,
            longitude: data.result.longitude
          }));
          toast.success('Location found');
        } else {
          toast.error('Address not found');
        }
      }
    } catch (error) {
      toast.error('Failed to search address');
    }
  }, [searchQuery]);

  // Create deal handler
  const handleCreateDeal = useCallback(async () => {
    if (!newDeal.title.trim()) {
      toast.error('Please enter a deal title');
      return;
    }
    if (!newDeal.latitude || !newDeal.longitude) {
      toast.error('Please search for an address first');
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
          ...newDeal,
          asking_price: newDeal.asking_price ? parseFloat(newDeal.asking_price) : null
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success('Deal created successfully');
        setShowCreateDeal(false);
        setNewDeal({
          title: '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          asset_type: 'Office',
          asking_price: '',
          latitude: null,
          longitude: null
        });
        // Refresh deals
        fetchDeals();
      } else {
        toast.error('Failed to create deal');
      }
    } catch (error) {
      console.error('Error creating deal:', error);
      toast.error('Failed to create deal');
    } finally {
      setCreatingDeal(false);
    }
  }, [newDeal, fetchDeals]);

  // Toggle map style
  const toggleMapStyle = useCallback(() => {
    setMapStyle(prev => prev === 'satellite' ? 'street' : 'satellite');
  }, []);

  // Memoized markers for user's deals
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

  // Memoized markers for team deals
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
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyles[mapStyle]}
        attributionControl={false}
        maxZoom={19}
        minZoom={2}
        renderWorldCopies={false}
        fadeDuration={0}
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" />

        {/* User's Deals */}
        {userMarkers}

        {/* Team Deals */}
        {teamMarkers}
      </Map>

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
        {/* Search Bar */}
        <div style={{
          flex: 1,
          maxWidth: '400px',
          display: 'flex',
          gap: '8px'
        }}>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search address..."
            style={{
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${colors.border}`,
              color: colors.textPrimary
            }}
          />
          <Button
            onClick={handleSearch}
            style={{
              background: colors.primary,
              border: 'none'
            }}
          >
            <Search size={18} />
          </Button>
        </div>

        {/* Map Style Toggle */}
        <Button
          onClick={toggleMapStyle}
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
        {/* Team Deals Toggle */}
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

        {/* Team Member Filter */}
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

      {/* Legend - Bottom Right */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        right: selectedDeal ? '420px' : '60px',
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
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: color
              }} />
              <span style={{ color: colors.textSecondary, fontSize: '12px' }}>{type}</span>
            </div>
          ))}
        </div>
        {showTeamDeals && (
          <div style={{ 
            borderTop: `1px solid ${colors.border}`, 
            margin: '8px 0', 
            paddingTop: '8px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: 0,
                height: 0,
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
          {/* Panel Header */}
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
              onClick={() => setShowCreateDeal(false)}
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

          {/* Panel Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            <p style={{ color: colors.textTertiary, fontSize: '13px', marginBottom: '16px' }}>
              Search for an address above to set the location, then fill in the details below.
            </p>

            {/* Location Preview */}
            {newDeal.latitude && newDeal.longitude && (
              <div style={{
                background: 'rgba(0, 184, 212, 0.1)',
                borderRadius: borderRadius.sm,
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ color: colors.primary, fontSize: '13px', fontWeight: '500' }}>
                  📍 Location Set
                </div>
                <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '4px' }}>
                  {newDeal.address}, {newDeal.city}, {newDeal.state} {newDeal.zip_code}
                </div>
              </div>
            )}

            {/* Form Fields */}
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

              <div>
                <Label style={{ color: colors.textSecondary, fontSize: '13px' }}>Asking Price</Label>
                <Input
                  type="number"
                  value={newDeal.asking_price}
                  onChange={(e) => setNewDeal(prev => ({ ...prev, asking_price: e.target.value }))}
                  placeholder="e.g., 2500000"
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

          {/* Panel Footer */}
          <div style={{
            padding: '16px',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            gap: '12px'
          }}>
            <Button
              onClick={() => setShowCreateDeal(false)}
              variant="outline"
              style={{
                flex: 1,
                borderColor: colors.border,
                color: colors.textSecondary
              }}
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
          {/* Panel Header */}
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
              <span style={{ 
                color: colors.textTertiary, 
                fontSize: '12px',
                textTransform: 'uppercase'
              }}>
                {selectedDeal.asset_type || 'Property'}
                {selectedDeal.isTeamDeal && ' • Team Deal'}
              </span>
            </div>
            <button
              onClick={closeSidePanel}
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

          {/* Panel Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {/* Title */}
            <h2 style={{
              color: colors.textPrimary,
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '4px'
            }}>
              {selectedDeal.title}
            </h2>
            
            {/* Address */}
            <p style={{ color: colors.textTertiary, fontSize: '14px', marginBottom: '20px' }}>
              {selectedDeal.address && `${selectedDeal.address}, `}
              {selectedDeal.city && `${selectedDeal.city}, `}
              {selectedDeal.state} {selectedDeal.zip_code}
            </p>

            {/* Price */}
            <div style={{
              background: 'rgba(0, 184, 212, 0.1)',
              borderRadius: borderRadius.md,
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ color: colors.textTertiary, fontSize: '12px', marginBottom: '4px' }}>
                Asking Price
              </div>
              <div style={{ color: colors.primary, fontSize: '28px', fontWeight: '700' }}>
                {formatCurrency(selectedDeal.asking_price)}
              </div>
            </div>

            {/* Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {selectedDeal.size_sqft && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>Size</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>
                    {selectedDeal.size_sqft.toLocaleString()} SF
                  </div>
                </div>
              )}
              {selectedDeal.lot_size && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>Lot Size</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>
                    {selectedDeal.lot_size} acres
                  </div>
                </div>
              )}
              {selectedDeal.year_built && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>Year Built</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>
                    {selectedDeal.year_built}
                  </div>
                </div>
              )}
              {selectedDeal.occupancy && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>Occupancy</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>
                    {selectedDeal.occupancy}%
                  </div>
                </div>
              )}
              {selectedDeal.cap_rate && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>Cap Rate</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>
                    {selectedDeal.cap_rate}%
                  </div>
                </div>
              )}
              {selectedDeal.noi && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>NOI</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>
                    {formatCurrency(selectedDeal.noi)}
                  </div>
                </div>
              )}
              {selectedDeal.zoning && (
                <div style={{ background: colors.surfaceElevated, padding: '12px', borderRadius: borderRadius.sm }}>
                  <div style={{ color: colors.textTertiary, fontSize: '11px', marginBottom: '4px' }}>Zoning</div>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>
                    {selectedDeal.zoning}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedDeal.notes && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ color: colors.textTertiary, fontSize: '12px', marginBottom: '8px' }}>Notes</div>
                <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: '1.5' }}>
                  {selectedDeal.notes}
                </p>
              </div>
            )}

            {/* Team Owner Info */}
            {selectedDeal.isTeamDeal && selectedDeal.user_profiles && (
              <div style={{
                background: colors.surfaceElevated,
                borderRadius: borderRadius.md,
                padding: '12px',
                marginBottom: '20px',
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

          {/* Panel Footer */}
          <div style={{
            padding: '16px',
            borderTop: `1px solid ${colors.border}`
          }}>
            <Button
              onClick={() => navigate(`/deals/${selectedDeal.id}`)}
              style={{
                width: '100%',
                background: gradients.primaryButton,
                border: 'none',
                height: '44px'
              }}
            >
              View Full Details
              <ChevronRight size={18} style={{ marginLeft: '8px' }} />
            </Button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
      `}</style>
    </div>
  );
};

export default MapView;
