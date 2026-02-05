import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import Map, { Marker, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  MapPin, Building2, X, ChevronRight, Users, 
  Eye, EyeOff, Filter, Layers, Plus, Search
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { colors, shadows, gradients, borderRadius, spacing } from '../styles/designSystem';

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
  return assetTypeColors[deal.asset_type] || assetTypeColors['Other'];
};

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
  
  // Map viewport
  const [viewState, setViewState] = useState({
    longitude: -98.4936,
    latitude: 29.4241,
    zoom: 10
  });

  // Fetch deals
  useEffect(() => {
    fetchDeals();
    fetchTeamData();
  }, []);

  const fetchDeals = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch(`${API}/deals?has_location=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeals(data.deals || []);
        
        // Center map on first deal with location
        const dealsWithLocation = (data.deals || []).filter(d => d.latitude && d.longitude);
        if (dealsWithLocation.length > 0) {
          setViewState(prev => ({
            ...prev,
            longitude: dealsWithLocation[0].longitude,
            latitude: dealsWithLocation[0].latitude
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamData = async () => {
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
  };

  // Filter team deals by member
  const filteredTeamDeals = selectedMemberFilter === 'all' 
    ? teamDeals 
    : teamDeals.filter(d => d.owner_id === selectedMemberFilter);

  // Handle marker click
  const handleMarkerClick = (deal) => {
    setSelectedDeal(deal);
  };

  // Close side panel
  const closeSidePanel = () => {
    setSelectedDeal(null);
  };

  // Format currency
  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Map style URLs
  const mapStyles = {
    satellite: 'https://api.maptiler.com/maps/hybrid/style.json?key=DFSAZFJXzvprKbxHrHXv',
    street: 'https://api.maptiler.com/maps/streets-v2-dark/style.json?key=DFSAZFJXzvprKbxHrHXv'
  };

  // Search handler
  const handleSearch = async () => {
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
            zoom: 15
          });
        } else {
          toast.error('Address not found');
        }
      }
    } catch (error) {
      toast.error('Failed to search address');
    }
  };

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
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" />

        {/* User's Deals - Circle markers */}
        {deals.map(deal => (
          <Marker
            key={deal.id}
            longitude={deal.longitude}
            latitude={deal.latitude}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick(deal);
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: getDealColor(deal),
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Building2 size={12} color="white" />
            </div>
          </Marker>
        ))}

        {/* Team Deals - Triangle markers */}
        {showTeamDeals && filteredTeamDeals.map(deal => (
          <Marker
            key={`team-${deal.id}`}
            longitude={deal.longitude}
            latitude={deal.latitude}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              handleMarkerClick({ ...deal, isTeamDeal: true });
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderBottom: `24px solid ${getDealColor(deal)}`,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
          </Marker>
        ))}
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
              background: 'rgba(0,0,0,0.7)',
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
          onClick={() => setMapStyle(mapStyle === 'satellite' ? 'street' : 'satellite')}
          style={{
            background: 'rgba(0,0,0,0.7)',
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
          onClick={() => navigate('/pipeline')}
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
            background: showTeamDeals ? colors.primary : 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${showTeamDeals ? colors.primary : colors.border}`,
            color: showTeamDeals ? '#fff' : colors.textPrimary
          }}
        >
          {showTeamDeals ? <Eye size={18} /> : <EyeOff size={18} />}
          <span style={{ marginLeft: '8px' }}>Team Deals</span>
        </Button>

        {/* Team Member Filter (shown when team deals are visible) */}
        {showTeamDeals && teamMembers.length > 0 && (
          <div style={{
            background: 'rgba(0,0,0,0.7)',
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
        background: 'rgba(0,0,0,0.7)',
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
          <>
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
          </>
        )}
      </div>

      {/* Deal Side Panel */}
      {selectedDeal && (
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
