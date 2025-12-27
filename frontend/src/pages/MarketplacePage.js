import React, { useState, useEffect } from 'react';
import Map, { Marker, NavigationControl, Popup } from 'react-map-gl/maplibre';
import { Search, SlidersHorizontal, MapIcon, Grid3x3, Heart, Check, AlertCircle, X } from 'lucide-react';
import { API } from '../App';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { colors, shadows, gradients, borderRadius, transitions } from '../styles/designSystem';
import BrokerBadges from '../components/BrokerBadges';
import 'maplibre-gl/dist/maplibre-gl.css';

const MarketplacePage = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    market: '',
    asset_type: '',
    strategy: '',
    min_price: '',
    max_price: ''
  });
  const [markets, setMarkets] = useState([]);
  const [filterOptions, setFilterOptions] = useState(null);

  const [viewport, setViewport] = useState({
    latitude: 29.4241,
    longitude: -98.4936,
    zoom: 11
  });

  useEffect(() => {
    fetchDeals();
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No auth token');
        return;
      }
      
      const response = await fetch(`${API}/marketplace/filters`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      setFilterOptions(data);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No auth token');
        setLoading(false);
        return;
      }
      
      // Build query params
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await fetch(`${API}/marketplace/deals?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch deals');
      
      const data = await response.json();
      let fetchedDeals = data.deals || [];
      
      // Add placeholder images to deals for screenshot purposes
      const placeholderImages = [
        'https://customer-assets.emergentagent.com/job_unifydash/artifacts/tsv091yj_attachment%20%285%29.jpg',
        'https://customer-assets.emergentagent.com/job_unifydash/artifacts/kecuougl_attachment%20%286%29.jpg',
        'https://customer-assets.emergentagent.com/job_unifydash/artifacts/cnmjpvgh_attachment%20%287%29.jpg',
        'https://customer-assets.emergentagent.com/job_unifydash/artifacts/qjfjmjk2_attachment%20%284%29.png',
        'https://customer-assets.emergentagent.com/job_unifydash/artifacts/5srsygx4_attachment%20%285%29.png'
      ];
      
      // Updated titles to match the placeholder images
      const placeholderTitles = [
        'Hotel Property - San Antonio',
        'Industrial Warehouse Complex - San Antonio',
        'Mixed-Use Development',
        'Multi-Family Complex',
        'Retail Development Land'
      ];
      
      // Updated descriptions to match the property types
      const placeholderDescriptions = [
        'Located at 1524 E Commerce St, this 19-room hotel offers guests the perfect blend of cultural charm and convenience. The hotel is styled after traditional Mexican culture, providing a unique and authentic experience for visitors. Situated just a short distance from the Alamo Dome, downtown San Antonio, and popular nightclubs like 1902, guests will find themselves immersed in the vibrant atmosphere of the city. Additionally, the hotel is near the famous River Walk, allowing easy access to some of San Antonio\'s most popular attractions.',
        'Multi-tenant industrial warehouse complex in prime San Antonio location. High ceiling clearance, multiple loading docks, and excellent access to major highways. Perfect for distribution, manufacturing, or logistics operations.',
        null, // Keep original
        null, // Keep original
        null  // Keep original
      ];
      
      // Updated addresses
      const placeholderAddresses = [
        '1524 E Commerce St, San Antonio, 78205',
        '625 Humble Ave, San Antonio, TX, 78225',
        null, // Keep original
        null, // Keep original
        null  // Keep original
      ];
      
      // Updated asset types (tags)
      const placeholderAssetTypes = [
        'HOTEL',
        'INDUSTRIAL',
        null, // Keep original
        null, // Keep original
        null  // Keep original
      ];
      
      // Add images and update titles/descriptions/addresses/tags for existing deals
      fetchedDeals = fetchedDeals.map((deal, idx) => ({
        ...deal,
        image_url: deal.image_url || placeholderImages[idx % placeholderImages.length],
        title: idx < 2 ? placeholderTitles[idx] : deal.title,
        description: (idx < placeholderDescriptions.length && placeholderDescriptions[idx]) 
          ? placeholderDescriptions[idx] 
          : deal.description,
        address: (idx < placeholderAddresses.length && placeholderAddresses[idx])
          ? placeholderAddresses[idx]
          : deal.address,
        public_asset_type: (idx < placeholderAssetTypes.length && placeholderAssetTypes[idx])
          ? placeholderAssetTypes[idx]
          : deal.public_asset_type,
        asset_type: (idx < placeholderAssetTypes.length && placeholderAssetTypes[idx])
          ? placeholderAssetTypes[idx]
          : deal.asset_type
      }));
      
      setDeals(fetchedDeals);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast.error('Failed to load marketplace deals');
    } finally {
      setLoading(false);
    }
  };

  const handleDealClick = (dealId) => {
    console.log('Navigating to deal:', dealId);
    navigate(`/marketplace/deals/${dealId}`);
  };

  const handleSaveDeal = async (dealId, e) => {
    e.stopPropagation();
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No auth token');
        toast.error('Please log in to save deals');
        return;
      }
      
      const response = await fetch(`${API}/marketplace/deals/${dealId}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deal_id: dealId })
      });

      if (response.ok) {
        toast.success('Deal saved!');
      }
    } catch (error) {
      toast.error('Failed to save deal');
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'Price on request';
    return `$${(price / 1000000).toFixed(2)}M`;
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      background: 'transparent',  // Let body gradient show through
      overflow: 'hidden'
    }}>
      {/* Map Section - 65% width when visible */}
      {showMap && (
        <div style={{ 
          width: '65%', 
          height: '100%',
          position: 'relative'
        }}>
          <Map
            {...viewport}
            onMove={evt => setViewport(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle={{
              version: 8,
              sources: {
                'carto-light': {
                  type: 'raster',
                  tiles: [
                    'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                    'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                    'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
                  ],
                  tileSize: 256,
                  attribution: '© OpenStreetMap contributors, © CARTO'
                }
              },
              layers: [
                {
                  id: 'carto-light-layer',
                  type: 'raster',
                  source: 'carto-light',
                  minzoom: 0,
                  maxzoom: 22
                }
              ]
            }}
          >
            <NavigationControl position="top-right" />
            
            {deals.map((deal) => (
              deal.latitude && deal.longitude && (
                <Marker
                  key={deal.id}
                  latitude={deal.latitude}
                  longitude={deal.longitude}
                  anchor="center"
                >
                  <div 
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDeal(deal);
                    }}
                  >
                    {/* Main dot without glow */}
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: '#3063ff',
                      border: '3px solid #fff',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                      position: 'relative',
                      zIndex: 10
                    }} />
                  </div>
                </Marker>
              )
            ))}
            
            {/* Deal Popup */}
            {selectedDeal && selectedDeal.latitude && selectedDeal.longitude && (
              <Popup
                latitude={selectedDeal.latitude}
                longitude={selectedDeal.longitude}
                anchor="bottom"
                onClose={() => setSelectedDeal(null)}
                closeOnClick={false}
                style={{ zIndex: 100 }}
              >
                <div style={{
                  width: '300px',
                  background: colors.surface,
                  borderRadius: borderRadius.lg,
                  overflow: 'hidden',
                  boxShadow: shadows.xl,
                  position: 'relative'
                }}>
                  {/* Property Image */}
                  {selectedDeal.image_url && (
                    <div style={{
                      height: '180px',
                      backgroundImage: `url(${selectedDeal.image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative'
                    }}>
                      {/* Close button positioned in corner */}
                      <button
                        onClick={() => setSelectedDeal(null)}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'rgba(0,0,0,0.8)',
                          backdropFilter: 'blur(10px)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 10,
                          transition: transitions.fast
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,0,0,0.9)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.8)';
                        }}
                      >
                        <X size={18} color="#fff" />
                      </button>
                    </div>
                  )}
                  
                  {/* Deal Info - Black background for readability */}
                  <div style={{ 
                    padding: '20px',
                    background: '#000',
                    color: '#fff'
                  }}>
                    <h3 style={{
                      fontSize: '17px',
                      fontWeight: '700',
                      color: '#fff',
                      marginBottom: '10px',
                      lineHeight: '1.3'
                    }}>
                      {selectedDeal.title}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: 'rgba(255,255,255,0.7)',
                      marginBottom: '14px',
                      lineHeight: '1.4'
                    }}>
                      {selectedDeal.address}
                    </p>
                    <div style={{
                      fontSize: '22px',
                      fontWeight: '700',
                      color: '#00b8d4',
                      marginBottom: '16px'
                    }}>
                      {formatPrice(selectedDeal.public_price || selectedDeal.price || selectedDeal.asking_price)}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDeal(null);
                        handleDealClick(selectedDeal.id);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#00b8d4',
                        border: 'none',
                        borderRadius: borderRadius.md,
                        color: '#000',
                        fontSize: '15px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: transitions.default
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#00d4ed';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#00b8d4';
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </div>
      )}

      {/* Deals List Section - 35% when map visible, 100% when map hidden */}
      <div style={{ 
        width: showMap ? '35%' : '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent'  // Let gradient show through
      }}>
        {/* Header with Filters */}
        <div style={{
          padding: '24px 28px',
          borderBottom: `1px solid ${colors.border}`,
          background: `${colors.surface}f5`,
          backdropFilter: 'blur(20px)',
          boxShadow: shadows.sm,
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search 
                size={20} 
                style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: colors.textMuted,
                  zIndex: 1
                }} 
              />
              <input
                type="text"
                placeholder="Search properties..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  background: colors.elevated,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  color: colors.textPrimary,
                  fontSize: '15px',
                  transition: transitions.fast,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  position: 'relative'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.borderHover;
                  e.currentTarget.style.boxShadow = `inset 0 2px 4px rgba(0,0,0,0.1), ${shadows.glowCyan}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)';
                }}
                onKeyPress={(e) => e.key === 'Enter' && fetchDeals()}
              />
            </div>

            <button
              onClick={() => setShowMap(!showMap)}
              style={{
                padding: '14px',
                background: showMap ? `${colors.primary}20` : colors.elevated,
                border: showMap ? `1px solid ${colors.primary}50` : `1px solid ${colors.border}`,
                borderRadius: borderRadius.md,
                color: showMap ? colors.primary : colors.textTertiary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: transitions.fast,
                boxShadow: showMap ? shadows.glowCyan : shadows.sm,
                flexShrink: 0
              }}
            >
              <MapIcon size={20} />
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '14px',
                background: showFilters ? gradients.primaryButton : colors.elevated,
                border: showFilters ? 'none' : `1px solid ${colors.border}`,
                borderRadius: borderRadius.md,
                color: showFilters ? '#000' : colors.textTertiary,
                cursor: 'pointer',
                transition: transitions.fast,
                boxShadow: showFilters ? shadows.glowCyan : shadows.sm,
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                if (!showFilters) {
                  e.currentTarget.style.background = colors.hover;
                  e.currentTarget.style.borderColor = colors.borderHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!showFilters) {
                  e.currentTarget.style.background = colors.elevated;
                  e.currentTarget.style.borderColor = colors.border;
                }
              }}
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div style={{
              marginTop: '20px',
              padding: '24px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.lg,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px'
            }}>
              {/* Market Filter */}
              <div>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                  Market
                </label>
                <select
                  value={filters.market}
                  onChange={(e) => {
                    setFilters({...filters, market: e.target.value});
                    setTimeout(fetchDeals, 100);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: colors.elevated,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    color: colors.textPrimary,
                    fontSize: '14px'
                  }}
                >
                  <option value="">All Markets</option>
                  {filterOptions?.available_filters?.markets?.map(market => (
                    <option key={market} value={market}>{market}</option>
                  ))}
                </select>
              </div>

              {/* Asset Type Filter */}
              <div>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                  Asset Type
                </label>
                <select
                  value={filters.asset_type}
                  onChange={(e) => {
                    setFilters({...filters, asset_type: e.target.value});
                    setTimeout(fetchDeals, 100);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: colors.elevated,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    color: colors.textPrimary,
                    fontSize: '14px'
                  }}
                >
                  <option value="">All Types</option>
                  {filterOptions?.available_filters?.asset_types?.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Strategy Filter */}
              <div>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                  Strategy
                </label>
                <select
                  value={filters.strategy}
                  onChange={(e) => {
                    setFilters({...filters, strategy: e.target.value});
                    setTimeout(fetchDeals, 100);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: colors.elevated,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    color: colors.textPrimary,
                    fontSize: '14px'
                  }}
                >
                  <option value="">All Strategies</option>
                  {filterOptions?.available_filters?.strategies?.map(strategy => (
                    <option key={strategy} value={strategy}>{strategy}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                  Min Price
                </label>
                <input
                  type="number"
                  value={filters.min_price}
                  onChange={(e) => setFilters({...filters, min_price: e.target.value})}
                  placeholder="Min $"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: colors.elevated,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    color: colors.textPrimary,
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                  Max Price
                </label>
                <input
                  type="number"
                  value={filters.max_price}
                  onChange={(e) => setFilters({...filters, max_price: e.target.value})}
                  placeholder="Max $"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: colors.elevated,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.md,
                    color: colors.textPrimary,
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Apply Filters Button */}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={fetchDeals}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: gradients.primaryButton,
                    border: 'none',
                    borderRadius: borderRadius.md,
                    color: '#000',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: shadows.glowCyan
                  }}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Deals Grid */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          padding: '24px'
        }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '200px',
              color: 'rgba(255,255,255,0.6)'
            }}>
              Loading deals...
            </div>
          ) : deals.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: 'rgba(255,255,255,0.6)',
              padding: '40px'
            }}>
              No deals found. Try adjusting your filters.
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: showMap ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => handleDealClick(deal.id)}
                  style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.lg,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: transitions.default,
                    position: 'relative',
                    boxShadow: shadows.md
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.elevated;
                    e.currentTarget.style.borderColor = colors.borderHover;
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = `${shadows.lg}, ${shadows.glowCyan}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.surface;
                    e.currentTarget.style.borderColor = colors.border;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = shadows.md;
                  }}
                >
                  {/* Deal Image with Gradient Overlay */}
                  <div style={{
                    height: '200px',
                    background: deal.image_url 
                      ? `url(${deal.image_url})` 
                      : gradients.surfaceSubtle,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                  }}>
                    {/* Dark gradient overlay for depth */}
                    {deal.image_url && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '50%',
                        background: gradients.imageOverlay,
                        pointerEvents: 'none'
                      }} />
                    )}
                    
                    <button
                      onClick={(e) => handleSaveDeal(deal.id, e)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(12px)',
                        border: 'none',
                        borderRadius: borderRadius.full,
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: transitions.fast,
                        boxShadow: shadows.sm
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.primary;
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.7)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Heart size={18} color="rgba(255,255,255,0.9)" />
                    </button>
                  </div>

                  {/* Deal Info */}
                  <div style={{ padding: '20px' }}>
                    {/* Commitment Level Badge */}
                    {deal.seller_commitment_level && (
                      <div style={{ marginBottom: '12px' }}>
                        {deal.seller_commitment_level === 'signed_listing' && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: '#10b981',
                            fontWeight: '600'
                          }}>
                            <Check size={12} />
                            Verified Listing
                          </div>
                        )}
                        {deal.seller_commitment_level === 'verbal_maybe' && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            background: 'rgba(107, 114, 128, 0.15)',
                            border: '1px solid rgba(107, 114, 128, 0.3)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: '#9ca3af',
                            fontWeight: '600'
                          }}>
                            <AlertCircle size={12} />
                            Broker-Certified Lead
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '14px'
                    }}>
                      <div>
                        <h3 style={{ 
                          color: colors.textPrimary, 
                          fontSize: '17px',
                          fontWeight: '600',
                          marginBottom: '6px',
                          letterSpacing: '-0.01em'
                        }}>
                          {deal.title}
                        </h3>
                        <p style={{ 
                          color: colors.textTertiary, 
                          fontSize: '13px',
                          marginBottom: '12px'
                        }}>
                          {deal.address}
                        </p>
                      </div>
                      <div style={{
                        background: `${colors.primary}15`,
                        border: `1px solid ${colors.primary}40`,
                        borderRadius: borderRadius.sm,
                        padding: '6px 12px',
                        fontSize: '11px',
                        color: colors.primary,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: `0 0 12px ${colors.primary}10`
                      }}>
                        {deal.public_asset_type || deal.asset_type}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px'
                    }}>
                      <span style={{ 
                        color: colors.primary, 
                        fontSize: '22px',
                        fontWeight: '700',
                        textShadow: `0 0 20px ${colors.primary}30`
                      }}>
                        {formatPrice(deal.public_price || deal.price)}
                      </span>
                      <span style={{ 
                        color: colors.textMuted, 
                        fontSize: '13px',
                        fontWeight: '500'
                      }}>
                        {deal.public_market || deal.city}
                      </span>
                    </div>

                    {deal.description && (
                      <p style={{ 
                        color: colors.textTertiary, 
                        fontSize: '13px',
                        marginBottom: '16px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.5'
                      }}>
                        {deal.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplacePage;
