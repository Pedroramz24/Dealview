import React, { useState, useEffect } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import { Search, SlidersHorizontal, MapIcon, Grid3x3, Heart } from 'lucide-react';
import { API } from '../App';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
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
      background: '#000000',
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
            mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
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
        background: '#0a0a0a'
      }}>
        {/* Header with Filters */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search 
                size={20} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.4)'
                }} 
              />
              <input
                type="text"
                placeholder="Search properties..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 44px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '14px'
                }}
                onKeyPress={(e) => e.key === 'Enter' && fetchDeals()}
              />
            </div>

            <button
              onClick={() => setShowMap(!showMap)}
              style={{
                padding: '12px',
                background: showMap ? 'rgba(0, 212, 170, 0.15)' : 'rgba(255,255,255,0.05)',
                border: showMap ? '1px solid rgba(0, 212, 170, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: showMap ? '#00b8d4' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <MapIcon size={20} />
            </button>

            <button
              style={{
                padding: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer'
              }}
            >
              <SlidersHorizontal size={20} />
            </button>
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {filterOptions?.available_filters?.markets?.slice(0, 5).map(market => (
              <button
                key={market}
                onClick={() => {
                  setFilters({...filters, market: filters.market === market ? '' : market});
                  setTimeout(fetchDeals, 100);
                }}
                style={{
                  padding: '8px 16px',
                  background: filters.market === market ? 'rgba(0, 212, 170, 0.15)' : 'rgba(255,255,255,0.05)',
                  border: filters.market === market ? '1px solid rgba(0, 212, 170, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  color: filters.market === market ? '#00b8d4' : 'rgba(255,255,255,0.6)',
                  fontSize: '13px',
                  cursor: 'pointer'
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
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(0, 212, 170, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Deal Image */}
                  <div style={{
                    height: '200px',
                    background: deal.image_url 
                      ? `url(${deal.image_url})` 
                      : 'linear-gradient(135deg, rgba(0, 184, 212, 0.2) 0%, rgba(0, 212, 170, 0.2) 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                  }}>
                    <button
                      onClick={(e) => handleSaveDeal(deal.id, e)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <Heart size={18} color="rgba(255,255,255,0.8)" />
                    </button>
                  </div>

                  {/* Deal Info */}
                  <div style={{ padding: '16px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <h3 style={{ 
                          color: '#fff', 
                          fontSize: '16px',
                          fontWeight: '600',
                          marginBottom: '4px'
                        }}>
                          {deal.title}
                        </h3>
                        <p style={{ 
                          color: 'rgba(255,255,255,0.5)', 
                          fontSize: '13px',
                          marginBottom: '8px'
                        }}>
                          {deal.address}
                        </p>
                      </div>
                      <div style={{
                        background: 'rgba(0, 212, 170, 0.15)',
                        border: '1px solid rgba(0, 212, 170, 0.3)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: '#00b8d4',
                        fontWeight: '600'
                      }}>
                        {deal.public_asset_type || deal.asset_type}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ 
                        color: '#00b8d4', 
                        fontSize: '18px',
                        fontWeight: '700'
                      }}>
                        {formatPrice(deal.public_price || deal.price)}
                      </span>
                      <span style={{ 
                        color: 'rgba(255,255,255,0.5)', 
                        fontSize: '12px'
                      }}>
                        {deal.public_market || deal.city}
                      </span>
                    </div>

                    {deal.description && (
                      <p style={{ 
                        color: 'rgba(255,255,255,0.6)', 
                        fontSize: '13px',
                        marginTop: '12px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {deal.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                        👁 {deal.marketplace_views_count || 0} views
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                        💬 {deal.marketplace_inquiries_count || 0} inquiries
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
