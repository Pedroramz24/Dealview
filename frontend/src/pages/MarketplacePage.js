import React, { useState, useEffect } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import { Search, SlidersHorizontal, MapIcon, Grid3x3, Heart, Check, AlertCircle } from 'lucide-react';
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
      setDeals(data.deals || []);
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
      {/* Map Section - Left Side */}
      {showMap && (
        <div style={{ 
          width: '50%', 
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
                'osm-tiles': {
                  type: 'raster',
                  tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                  tileSize: 256,
                  attribution: '© OpenStreetMap contributors'
                }
              },
              layers: [
                {
                  id: 'osm-tiles',
                  type: 'raster',
                  source: 'osm-tiles',
                  minzoom: 0,
                  maxzoom: 19
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
                  anchor="bottom"
                  onClick={() => handleDealClick(deal.id)}
                >
                  <div style={{
                    background: '#00b8d4',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    border: '3px solid #000',
                    cursor: 'pointer',
                    boxShadow: '0 0 12px rgba(0, 212, 170, 0.5)'
                  }} />
                </Marker>
              )
            ))}
          </Map>
        </div>
      )}

      {/* Deals List Section - Right Side */}
      <div style={{ 
        width: showMap ? '50%' : '100%',
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
          boxShadow: shadows.sm
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
                  color: colors.textMuted
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
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
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
                boxShadow: showMap ? shadows.glowCyan : shadows.sm
              }}
            >
              <MapIcon size={20} />
            </button>

            <button
              style={{
                padding: '14px',
                background: colors.elevated,
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.md,
                color: colors.textTertiary,
                cursor: 'pointer',
                transition: transitions.fast,
                boxShadow: shadows.sm
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.hover;
                e.currentTarget.style.borderColor = colors.borderHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = colors.elevated;
                e.currentTarget.style.borderColor = colors.border;
              }}
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {filterOptions?.available_filters?.markets?.slice(0, 5).map(market => (
              <button
                key={market}
                onClick={() => {
                  setFilters({...filters, market: filters.market === market ? '' : market});
                  setTimeout(fetchDeals, 100);
                }}
                style={{
                  padding: '10px 18px',
                  background: filters.market === market ? gradients.primaryButton : colors.elevated,
                  border: filters.market === market ? 'none' : `1px solid ${colors.border}`,
                  borderRadius: borderRadius.full,
                  color: filters.market === market ? '#000' : colors.textTertiary,
                  fontSize: '13px',
                  fontWeight: filters.market === market ? '600' : '500',
                  cursor: 'pointer',
                  transition: transitions.fast,
                  boxShadow: filters.market === market ? shadows.glowCyan : 'none'
                }}
                onMouseEnter={(e) => {
                  if (filters.market !== market) {
                    e.currentTarget.style.background = colors.hover;
                    e.currentTarget.style.borderColor = colors.borderHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (filters.market !== market) {
                    e.currentTarget.style.background = colors.elevated;
                    e.currentTarget.style.borderColor = colors.border;
                  }
                }}
              >
                {market}
              </button>
            ))}
          </div>
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

                    {/* Stats with Icons */}
                    <div style={{
                      display: 'flex',
                      gap: '20px',
                      paddingTop: '16px',
                      borderTop: `1px solid ${colors.divider}`
                    }}>
                      <span style={{ 
                        color: colors.textMuted, 
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        👁 <span style={{ color: colors.textSecondary, fontWeight: '600' }}>{deal.marketplace_views_count || 0}</span> views
                      </span>
                      <span style={{ 
                        color: colors.textMuted, 
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        💬 <span style={{ color: colors.textSecondary, fontWeight: '600' }}>{deal.marketplace_inquiries_count || 0}</span> inquiries
                      </span>
                    </div>
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
