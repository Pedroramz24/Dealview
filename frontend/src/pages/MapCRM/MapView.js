import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl, Source, Layer } from 'react-map-gl/maplibre';
import { useNavigate } from 'react-router-dom';
import Supercluster from 'supercluster';
import { supabase } from '../../supabaseClient';
import { API } from '../../App';
import { useMapCRM } from '../../contexts/MapCRMContext';
import { colors, shadows, borderRadius, spacing, gradients } from '../../styles/designSystem';
import { DollarSign, Building2, X, ArrowLeft, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';

// Asset type colors matching DealLinked (fallback)
const ASSET_COLORS = {
  'Gas': '#ef4444',
  'Retail': '#3b82f6',
  'Industrial': '#f97316',
  'Office': '#22c55e',
  'Land': '#92400e',
  'Multifamily': '#a855f7'
};

// Default stage colors (fallback) - matching Pipeline.js
const DEFAULT_STAGE_COLORS = {
  'need_to_contact': '#94a3b8',
  'contacted': '#60a5fa',
  'prospect': '#a78bfa',
  'negotiations': '#ec4899',
  'offer_sent': '#f59e0b',
  'under_contract': '#10b981',
  'closed_won': '#00d4aa',
  'overpriced': '#ef4444'
};

// Utility formatting functions
const formatCurrency = (value) => {
  if (!value && value !== 0) return null;
  return `$${value.toLocaleString('en-US')}`;
};

const formatNumber = (value, suffix = '') => {
  if (!value && value !== 0) return null;
  return `${value.toLocaleString('en-US')}${suffix ? ' ' + suffix : ''}`;
};

const formatPercent = (value) => {
  if (!value && value !== 0) return null;
  return `${value.toFixed(1)}%`;
};

const MapView = () => {
  const { selectedProperty, setSelectedProperty, properties } = useMapCRM();
  const navigate = useNavigate();
  const [viewport, setViewport] = useState({
    latitude: 29.4241,
    longitude: -98.4936,
    zoom: 11
  });
  const [viewportProperties, setViewportProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pipelineStages, setPipelineStages] = useState([]); // Store all pipeline stages with colors
  const mapRef = useRef();

  // Fetch pipeline stages for color mapping
  useEffect(() => {
    const fetchPipelineStages = async () => {
      try {
        const { data, error } = await supabase
          .from('pipeline_stages')
          .select('id, name, color');
        
        if (error) throw error;
        setPipelineStages(data || []);
      } catch (error) {
        console.error('Failed to fetch pipeline stages:', error);
      }
    };
    
    fetchPipelineStages();
  }, []);

  // Get pin color based on pipeline stage (primary) or asset type (fallback)
  const getPinColor = useCallback((property) => {
    // Priority 1: Use pipeline stage color if property has pipeline_stage_id
    if (property.pipeline_stage_id && pipelineStages.length > 0) {
      const stage = pipelineStages.find(s => s.id === property.pipeline_stage_id);
      if (stage && stage.color) {
        return stage.color;
      }
    }
    
    // Priority 2: Use legacy stage color if property has stage field
    if (property.stage && DEFAULT_STAGE_COLORS[property.stage]) {
      return DEFAULT_STAGE_COLORS[property.stage];
    }
    
    // Priority 3: Fallback to asset type color
    if (property.asset_type && ASSET_COLORS[property.asset_type]) {
      return ASSET_COLORS[property.asset_type];
    }
    
    // Default color
    return colors.textMuted;
  }, [pipelineStages]);

  // Map style matching DealLinked workspace map (satellite + labels)
  const mapStyle = {
    version: 8,
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 18,
        attribution: '&copy; Esri'
      },
      'carto-labels': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png',
          'https://d.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png'
        ],
        tileSize: 512,
        maxzoom: 18,
        attribution: '&copy; CARTO'
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
        source: 'carto-labels',
        minzoom: 8,
        maxzoom: 18,
        paint: {
          'raster-opacity': 0.9
        }
      }
    ]
  };

  // Create supercluster index
  const supercluster = useMemo(() => {
    const index = new Supercluster({
      radius: 60,
      maxZoom: 16,
      minZoom: 0,
      minPoints: 2
    });

    if (viewportProperties.length > 0) {
      const points = viewportProperties.map(prop => ({
        type: 'Feature',
        properties: { ...prop },
        geometry: {
          type: 'Point',
          coordinates: [prop.longitude, prop.latitude]
        }
      }));

      index.load(points);
    }

    return index;
  }, [viewportProperties]);

  // Get clusters for current viewport
  const clusters = useMemo(() => {
    if (!mapRef.current) return [];
    
    const map = mapRef.current.getMap();
    if (!map) return [];

    // Safety check: ensure we have viewport properties before clustering
    if (viewportProperties.length === 0) return [];

    const bounds = map.getBounds();
    if (!bounds) return [];
    
    const zoom = Math.round(viewport.zoom);

    try {
      return supercluster.getClusters(
        [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        zoom
      );
    } catch (error) {
      console.error('Error getting clusters:', error);
      return [];
    }
  }, [supercluster, viewport, viewportProperties]);

  // Fetch properties in current viewport
  const fetchViewportProperties = useCallback(async (bounds, zoom) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { _ne, _sw } = bounds;
      const params = new URLSearchParams({
        north: _ne.lat.toString(),
        south: _sw.lat.toString(),
        east: _ne.lng.toString(),
        west: _sw.lng.toString(),
        zoom: Math.round(zoom).toString()
      });

      const response = await fetch(`${API}/map-crm/properties/map-data?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch viewport properties');
      const data = await response.json();
      setViewportProperties(data);
    } catch (error) {
      console.error('Failed to fetch viewport properties:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update viewport properties when map moves
  const handleMoveEnd = useCallback((evt) => {
    const map = evt.target;
    const bounds = map.getBounds();
    const zoom = evt.viewState.zoom;
    fetchViewportProperties(bounds, zoom);
  }, [fetchViewportProperties]);

  // Initial fetch when map loads
  useEffect(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      if (map) {
        // Wait for map to be fully loaded
        const checkMapLoaded = () => {
          if (map.loaded()) {
            const bounds = map.getBounds();
            fetchViewportProperties(bounds, viewport.zoom);
          } else {
            map.once('load', () => {
              const bounds = map.getBounds();
              fetchViewportProperties(bounds, viewport.zoom);
            });
          }
        };
        checkMapLoaded();
      }
    }
  }, []);

  // Refresh when properties count changes (after import)
  useEffect(() => {
    if (properties.length > 0 && mapRef.current) {
      const map = mapRef.current.getMap();
      if (map) {
        const bounds = map.getBounds();
        fetchViewportProperties(bounds, viewport.zoom);
      }
    }
  }, [properties.length, fetchViewportProperties]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* Back to DealLinked Button */}
      <button
        onClick={() => navigate('/workspace/dashboard')}
        style={{
          position: 'absolute',
          top: spacing.md,
          left: spacing.md,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: colors.surfaceCard,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.md,
          color: colors.textSecondary,
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          boxShadow: shadows.md,
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = colors.hover;
          e.currentTarget.style.borderColor = colors.primary;
          e.currentTarget.style.color = colors.primary;
          e.currentTarget.style.boxShadow = shadows.glowCyan;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = colors.surfaceCard;
          e.currentTarget.style.borderColor = colors.border;
          e.currentTarget.style.color = colors.textSecondary;
          e.currentTarget.style.boxShadow = shadows.md;
        }}
      >
        <ArrowLeft size={16} />
        Back to DealLinked
      </button>

      <Map
        ref={mapRef}
        {...viewport}
        onMove={evt => setViewport(evt.viewState)}
        onMoveEnd={handleMoveEnd}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
      >
        <NavigationControl position="top-right" style={{
          background: colors.surfaceCard,
          borderRadius: borderRadius.sm,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.md
        }} />
        <ScaleControl position="bottom-right" style={{
          background: colors.surfaceCard,
          color: colors.textPrimary
        }} />

        {/* Loading Indicator */}
        {loading && (
          <div style={{
            position: 'absolute',
            top: spacing.md,
            left: '50%',
            transform: 'translateX(-50%)',
            background: colors.surfaceCard,
            border: `1px solid ${colors.border}`,
            borderRadius: borderRadius.md,
            padding: `${spacing.sm} ${spacing.md}`,
            boxShadow: shadows.md,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            zIndex: 999
          }}>
            <Loader2 size={14} className="animate-spin" style={{ color: colors.primary }} />
            <span style={{ fontSize: '13px', color: colors.textSecondary }}>
              Loading properties...
            </span>
          </div>
        )}

        {/* Render Clusters and Individual Markers */}
        {clusters.map((cluster) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const { cluster: isCluster, point_count: pointCount } = cluster.properties;

          if (isCluster) {
            // Render cluster marker
            const clusterSize = Math.min(60, 30 + (pointCount / viewportProperties.length) * 40);

            return (
              <Marker
                key={`cluster-${cluster.id}`}
                latitude={latitude}
                longitude={longitude}
                anchor="center"
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    // Zoom into cluster
                    const expansionZoom = Math.min(
                      supercluster.getClusterExpansionZoom(cluster.id),
                      20
                    );
                    setViewport({
                      ...viewport,
                      latitude,
                      longitude,
                      zoom: expansionZoom
                    });
                  }}
                  style={{
                    width: `${clusterSize}px`,
                    height: `${clusterSize}px`,
                    borderRadius: '50%',
                    background: colors.primary,
                    border: '3px solid #fff',
                    boxShadow: `0 0 0 4px ${colors.primary}40, 0 4px 12px rgba(0, 0, 0, 0.6)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    fontSize: clusterSize > 40 ? '14px' : '12px',
                    fontWeight: '700',
                    color: '#fff'
                  }}
                >
                  {pointCount}
                </div>
              </Marker>
            );
          }

          // Render individual property marker
          const property = cluster.properties;
          const color = ASSET_COLORS[property.asset_type] || colors.textMuted;
          const isSelected = selectedProperty?.id === property.id;

          return (
            <Marker
              key={property.id}
              latitude={latitude}
              longitude={longitude}
              anchor="center"
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProperty(property);
                }}
                style={{
                  cursor: 'pointer',
                  transform: isSelected ? 'scale(1.3)' : 'scale(1)',
                  transition: 'all 0.3s',
                  zIndex: isSelected ? 1000 : 1
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: color,
                  border: '3px solid #fff',
                  boxShadow: isSelected 
                    ? `0 0 0 4px ${color}40, 0 4px 12px rgba(0, 0, 0, 0.6)`
                    : '0 4px 12px rgba(0, 0, 0, 0.4)',
                  position: 'relative'
                }} />
              </div>
            </Marker>
          );
        })}

        {/* Property Popup */}
        {selectedProperty && (
          <Popup
            latitude={selectedProperty.latitude}
            longitude={selectedProperty.longitude}
            anchor="bottom"
            onClose={() => setSelectedProperty(null)}
            closeOnClick={false}
            offset={[0, -10]}
            style={{ zIndex: 2000 }}
          >
            <div style={{
              background: colors.surfaceCard,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              minWidth: '280px',
              maxWidth: '320px',
              border: `1px solid ${colors.border}`,
              boxShadow: shadows.lg
            }}>
              {/* Header */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: spacing.sm
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: colors.textPrimary,
                    margin: 0,
                    marginBottom: '4px'
                  }}>
                    {selectedProperty.title || selectedProperty.address}
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: colors.textTertiary,
                    margin: 0
                  }}>
                    {selectedProperty.city}, {selectedProperty.state} {selectedProperty.zip_code}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedProperty(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: colors.textTertiary,
                    transition: 'color 0.2s'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Details */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: spacing.sm,
                paddingTop: spacing.sm,
                borderTop: `1px solid ${colors.border}`
              }}>
                {/* Asset Type */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={14} style={{ color: colors.textTertiary }} />
                  <span style={{ 
                    fontSize: '13px',
                    color: colors.textTertiary,
                    flex: 1
                  }}>
                    Type:
                  </span>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: ASSET_COLORS[selectedProperty.asset_type],
                    padding: '2px 8px',
                    background: `${ASSET_COLORS[selectedProperty.asset_type]}15`,
                    borderRadius: borderRadius.sm
                  }}>
                    {selectedProperty.asset_type}
                  </span>
                </div>

                {/* Price */}
                {selectedProperty.asking_price && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={14} style={{ color: colors.textTertiary }} />
                    <span style={{ 
                      fontSize: '13px',
                      color: colors.textTertiary,
                      flex: 1
                    }}>
                      Price:
                    </span>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: colors.textPrimary
                    }}>
                      {formatCurrency(selectedProperty.asking_price)}
                    </span>
                  </div>
                )}

                {/* Est Value (PropertyRadar) */}
                {selectedProperty.est_value && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={14} style={{ color: colors.textTertiary }} />
                    <span style={{ 
                      fontSize: '13px',
                      color: colors.textTertiary,
                      flex: 1
                    }}>
                      Est Value:
                    </span>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: colors.textSecondary
                    }}>
                      {formatCurrency(selectedProperty.est_value)}
                    </span>
                  </div>
                )}

                {/* Equity % (PropertyRadar) */}
                {selectedProperty.est_equity_percent !== null && selectedProperty.est_equity_percent !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '13px',
                      color: colors.textTertiary,
                      flex: 1,
                      paddingLeft: '22px'
                    }}>
                      Equity:
                    </span>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: selectedProperty.est_equity_percent > 50 ? colors.success : colors.textSecondary
                    }}>
                      {formatPercent(selectedProperty.est_equity_percent)}
                    </span>
                  </div>
                )}

                {/* Tax Delinquent (PropertyRadar) */}
                {selectedProperty.tax_delinquent_dollars && selectedProperty.tax_delinquent_dollars > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={14} style={{ color: colors.warning }} />
                    <span style={{ 
                      fontSize: '13px',
                      color: colors.textTertiary,
                      flex: 1
                    }}>
                      Tax Delinquent:
                    </span>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.warning
                    }}>
                      {formatCurrency(selectedProperty.tax_delinquent_dollars)}
                    </span>
                  </div>
                )}

                {/* Building Size */}
                {selectedProperty.building_size && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '13px',
                      color: colors.textTertiary,
                      flex: 1,
                      paddingLeft: '22px'
                    }}>
                      Building:
                    </span>
                    <span style={{
                      fontSize: '13px',
                      color: colors.textSecondary
                    }}>
                      {formatNumber(selectedProperty.building_size, 'sqft')}
                    </span>
                  </div>
                )}

                {/* Beds/Baths (PropertyRadar) */}
                {(selectedProperty.beds || selectedProperty.baths) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={14} style={{ color: colors.textTertiary }} />
                    <span style={{ 
                      fontSize: '13px',
                      color: colors.textTertiary,
                      flex: 1
                    }}>
                      Beds/Baths:
                    </span>
                    <span style={{
                      fontSize: '13px',
                      color: colors.textSecondary
                    }}>
                      {selectedProperty.beds || '—'} / {selectedProperty.baths || '—'}
                    </span>
                  </div>
                )}

                {/* Lot Size */}
                {selectedProperty.lot_size && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '13px',
                      color: colors.textTertiary,
                      flex: 1,
                      paddingLeft: '22px'
                    }}>
                      Lot:
                    </span>
                    <span style={{
                      fontSize: '13px',
                      color: colors.textSecondary
                    }}>
                      {selectedProperty.lot_size} acres
                    </span>
                  </div>
                )}

                {/* View Details Button */}
                <button
                  onClick={() => navigate(`/internal/map-crm/property/${selectedProperty.id}`)}
                  style={{
                    marginTop: spacing.sm,
                    padding: '8px 12px',
                    background: gradients.primaryButton,
                    border: 'none',
                    borderRadius: borderRadius.sm,
                    color: colors.textPrimary,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: shadows.glowCyan,
                    width: '100%'
                  }}
                >
                  View Full Details
                </button>

                {/* PropertyRadar Flags */}
                {(selectedProperty.high_equity || selectedProperty.foreclosure || selectedProperty.underwater || (selectedProperty.owner_occupied === false)) && (
                  <div style={{ 
                    marginTop: spacing.sm,
                    paddingTop: spacing.sm,
                    borderTop: `1px solid ${colors.border}`,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px'
                  }}>
                    {selectedProperty.high_equity && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        padding: '2px 6px',
                        borderRadius: borderRadius.sm,
                        background: `${colors.success}20`,
                        color: colors.success
                      }}>
                        HIGH EQUITY
                      </span>
                    )}
                    {selectedProperty.foreclosure && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        padding: '2px 6px',
                        borderRadius: borderRadius.sm,
                        background: `${colors.danger}20`,
                        color: colors.danger
                      }}>
                        FORECLOSURE
                      </span>
                    )}
                    {selectedProperty.underwater && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        padding: '2px 6px',
                        borderRadius: borderRadius.sm,
                        background: `${colors.warning}20`,
                        color: colors.warning
                      }}>
                        UNDERWATER
                      </span>
                    )}
                    {selectedProperty.owner_occupied === false && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        padding: '2px 6px',
                        borderRadius: borderRadius.sm,
                        background: `${colors.primary}20`,
                        color: colors.primary
                      }}>
                        ABSENTEE
                      </span>
                    )}
                  </div>
                )}

                {/* Status Badge */}
                <div style={{ 
                  marginTop: spacing.sm,
                  paddingTop: spacing.sm,
                  borderTop: `1px solid ${colors.border}`
                }}>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '4px 8px',
                    borderRadius: borderRadius.sm,
                    background: selectedProperty.status === 'available' ? `${colors.success}20` :
                                selectedProperty.status === 'claimed' ? `${colors.primary}20` :
                                selectedProperty.status === 'converted' ? `${colors.warning}20` :
                                `${colors.textMuted}20`,
                    color: selectedProperty.status === 'available' ? colors.success :
                           selectedProperty.status === 'claimed' ? colors.primary :
                           selectedProperty.status === 'converted' ? colors.warning :
                           colors.textMuted
                  }}>
                    {selectedProperty.status}
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Viewport Property Count Indicator */}
      <div style={{
        position: 'absolute',
        bottom: spacing.md,
        left: spacing.md,
        background: colors.surfaceCard,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.md,
        padding: `${spacing.sm} ${spacing.md}`,
        boxShadow: shadows.md,
        fontSize: '13px',
        color: colors.textSecondary,
        zIndex: 10
      }}>
        {viewportProperties.length} properties • {clusters.filter(c => !c.properties.cluster).length} visible
      </div>
    </div>
  );
};

export default MapView;
