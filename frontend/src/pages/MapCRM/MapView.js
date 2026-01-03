import React, { useState } from 'react';
import Map, { Marker, Popup, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import { useNavigate } from 'react-router-dom';
import { useMapCRM } from '../../contexts/MapCRMContext';
import { colors, shadows, borderRadius, spacing } from '../../styles/designSystem';
import { MapPin, DollarSign, Building2, X, ArrowLeft } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';

// Asset type colors matching DealLinked
const ASSET_COLORS = {
  'Gas': '#ef4444',
  'Retail': '#3b82f6',
  'Industrial': '#f97316',
  'Office': '#22c55e',
  'Land': '#92400e',
  'Multifamily': '#a855f7'
};

const MapView = () => {
  const { properties, selectedProperty, setSelectedProperty } = useMapCRM();
  const navigate = useNavigate();
  const [viewport, setViewport] = useState({
    latitude: properties.length > 0 ? properties[0].latitude : 29.4241,
    longitude: properties.length > 0 ? properties[0].longitude : -98.4936,
    zoom: properties.length > 0 ? 12 : 11
  });

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
        {...viewport}
        onMove={evt => setViewport(evt.viewState)}
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

        {properties.map((property) => {
          const color = ASSET_COLORS[property.asset_type] || colors.textMuted;
          const isSelected = selectedProperty?.id === property.id;

          return (
            <Marker
              key={property.id}
              latitude={property.latitude}
              longitude={property.longitude}
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
                      ${selectedProperty.asking_price.toLocaleString()}
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
                      {selectedProperty.building_size.toLocaleString()} sqft
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
    </div>
  );
};

export default MapView;
