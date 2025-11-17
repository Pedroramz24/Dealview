import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronRight, Layers, RefreshCw, MinusCircle, Ruler, Square } from 'lucide-react';
import axios from 'axios';
import { API } from '../App';
import { useMapLayerContext } from '../contexts/MapLayerContext';

const LayerManager = ({ 
  isOpen, 
  onClose, 
  showStreetLabels, 
  onToggleStreetLabels, 
  mapStyle, 
  onToggleMapStyle, 
  mapRef, 
  propertyPanelOpen, 
  showParcels, 
  onToggleParcels, 
  showTeamDeals, 
  onToggleTeamDeals, 
  measurementMode, 
  onSetMeasurementMode,
  // Property Intelligence layers
  showSAZoning,
  onToggleSAZoning,
  showAustinZoning,
  onToggleAustinZoning,
  showFloodZones,
  onToggleFloodZones,
  showWaterSewer,
  onToggleWaterSewer,
  showBexarParcels,
  onToggleBexarParcels
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({
    administrative: true,
    environmental: true,
    planning: true,
    infrastructure: true,
    transportation: true,
  });
  const [layerRegistry, setLayerRegistry] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Get current zoom from map
  const getCurrentZoom = () => {
    if (mapRef?.current) {
      const map = mapRef.current.getMap();
      return map ? map.getZoom() : 0;
    }
    return 0;
  };
  
  // Get map layer handlers from context if available (MapView only)
  const layerContext = useMapLayerContext();
  
  // Create props object for easy access in JSX
  const props = {
    showStreetLabels,
    onToggleStreetLabels,
    showParcels,
    onToggleParcels,
    showTeamDeals,
    onToggleTeamDeals,
    mapStyle: mapStyle || 'satellite',
    onToggleMapStyle,
    measurementMode: measurementMode || null,
    onSetMeasurementMode,
    currentZoom: getCurrentZoom(),
    // Property Intelligence
    showSAZoning,
    onToggleSAZoning,
    showAustinZoning,
    onToggleAustinZoning,
    showFloodZones,
    onToggleFloodZones,
    showWaterSewer,
    onToggleWaterSewer,
    showBexarParcels,
    onToggleBexarParcels
  };

  // Debug logging
  useEffect(() => {
    console.log('[LayerManager] Props received:', {
      showStreetLabels,
      showParcels,
      hasStreetLabelsCallback: !!onToggleStreetLabels,
      hasParcelsCallback: !!onToggleParcels,
      mapStyle,
      currentZoom: getCurrentZoom()
    });
  }, [showStreetLabels, showParcels, onToggleStreetLabels, onToggleParcels, mapStyle]);

  // Fetch layer registry from backend (only this one, removed duplicate)
  useEffect(() => {
    const fetchRegistry = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('[LayerManager] No authentication token found');
          setLoading(false);
          return;
        }
        
        const response = await axios.get(`${API}/layers/registry`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Group layers by category
        const grouped = {};
        console.log('[LayerManager] Raw API response:', response.data);
        Object.entries(response.data.layers).forEach(([layerId, layer]) => {
          const category = layer.category;
          console.log(`[LayerManager] Processing layer: ${layerId}, category: ${category}`);
          if (!grouped[category]) {
            grouped[category] = {
              label: getCategoryLabel(category),
              layers: [],
            };
          }
          grouped[category].layers.push(layer);
        });
        
        console.log('[LayerManager] Grouped registry:', grouped);
        console.log('[LayerManager] FEMA layer check:', response.data.layers.fema_floodplain ? 'FOUND' : 'NOT FOUND');
        setLayerRegistry(grouped);
        setLoading(false);
      } catch (error) {
        console.error('[LayerManager] Error fetching registry:', error.response?.data || error.message);
        console.error('[LayerManager] Error status:', error.response?.status);
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchRegistry();
    }
  }, [isOpen]);

  const getCategoryLabel = (category) => {
    const labels = {
      administrative: 'Administrative',
      environmental: 'Environmental',
      planning: 'Planning & Zoning',
      infrastructure: 'Infrastructure',
      transportation: 'Transportation',
    };
    return labels[category] || category;
  };

  // Initialize layer states from localStorage or defaults
  const [layerStates, setLayerStates] = useState(() => {
    const saved = localStorage.getItem('mapLayerStates');
    if (saved) {
      return JSON.parse(saved);
    }
    return {};
  });

  // Persist layer states to localStorage
  useEffect(() => {
    localStorage.setItem('mapLayerStates', JSON.stringify(layerStates));
  }, [layerStates]);

  // Toggle layer visibility
  const toggleLayer = (layerId) => {
    console.log(`[LayerManager] toggleLayer called for ${layerId}`);
    console.log(`[LayerManager] layerContext exists:`, !!layerContext);
    
    const newVisible = !layerStates[layerId]?.visible;
    const newState = {
      ...layerStates[layerId],
      visible: newVisible,
      opacity: layerStates[layerId]?.opacity || 100,
    };
    
    console.log(`[LayerManager] newVisible: ${newVisible}, opacity: ${newState.opacity}`);
    
    setLayerStates((prev) => ({
      ...prev,
      [layerId]: newState,
    }));
    
    // Use context handlers if available (MapView), otherwise just update local state
    if (layerContext) {
      console.log(`[LayerManager] Calling context handler...`);
      if (newVisible) {
        console.log(`[LayerManager] Calling addLayer(${layerId}, ${newState.opacity})`);
        layerContext.addLayer(layerId, newState.opacity);
      } else {
        console.log(`[LayerManager] Calling removeLayer(${layerId})`);
        layerContext.removeLayer(layerId);
      }
    } else {
      console.warn(`[LayerManager] layerContext is null!`);
    }
  };

  // Update layer opacity
  const updateLayerOpacity = (layerId, opacity) => {
    setLayerStates((prev) => ({
      ...prev,
      [layerId]: {
        ...prev[layerId],
        opacity: opacity,
      },
    }));
    
    // Use context handlers if available (MapView)
    if (layerContext) {
      layerContext.updateLayerOpacity(layerId, opacity);
    }
  };

  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Select None action
  const selectNone = () => {
    const newStates = {};
    Object.keys(layerStates).forEach((layerId) => {
      newStates[layerId] = { ...layerStates[layerId], visible: false };
      // Use context handlers if available
      if (layerContext) {
        layerContext.removeLayer(layerId);
      }
    });
    setLayerStates(newStates);
  };

  // Reset to Default action
  const resetToDefault = () => {
    const initial = {};
    if (layerRegistry) {
      Object.keys(layerRegistry).forEach((category) => {
        layerRegistry[category].layers.forEach((layer) => {
          initial[layer.id] = { visible: false, opacity: 100 };
          // Use context handlers if available
          if (layerContext) {
            layerContext.removeLayer(layer.id);
          }
        });
      });
    }
    setLayerStates(initial);
  };

  // Filter layers based on search query
  const filteredCategories = useMemo(() => {
    if (!layerRegistry || !searchQuery.trim()) return layerRegistry;

    const query = searchQuery.toLowerCase();
    const filtered = {};

    Object.keys(layerRegistry).forEach((categoryId) => {
      const category = layerRegistry[categoryId];
      const matchingLayers = category.layers.filter(
        (layer) =>
          layer.name.toLowerCase().includes(query) ||
          layer.description.toLowerCase().includes(query)
      );

      if (matchingLayers.length > 0) {
        filtered[categoryId] = {
          ...category,
          layers: matchingLayers,
        };
      }
    });

    return filtered;
  }, [searchQuery, layerRegistry]);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1049,
            transition: 'opacity 200ms ease-in-out',
          }}
          className="lg:hidden"
        />
      )}

      {/* Layer Manager Panel - Positioned next to Property Panel when both open */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: (() => {
            if (isOpen && propertyPanelOpen) {
              // Both panels open: Layer sits next to Property panel (500px fixed)
              return '500px';
            } else if (isOpen && !propertyPanelOpen) {
              // Only Layer panel open: sits at far left
              return '0';
            } else {
              // Layer panel closed: hide off-screen
              return '-380px';
            }
          })(),
          width: '380px',
          height: '100vh',
          background: 'rgba(11, 12, 14, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderLeft: (isOpen && propertyPanelOpen) ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 1050,
          transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Layers className="w-5 h-5" style={{ color: '#00b8d4', marginRight: '10px' }} />
            <h2
              style={{
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: '600',
                letterSpacing: '-0.02em',
              }}
            >
              Layer Manager
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search and Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Search */}
          <div
            style={{
              position: 'relative',
              marginBottom: '12px',
            }}
          >
            <Search
              className="w-4 h-4"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.4)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search layers…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontSize: '13px',
                outline: 'none',
                transition: 'all 150ms ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.5)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={selectNone}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }}
            >
              <MinusCircle className="w-3.5 h-3.5" />
              Select None
            </button>
            <button
              onClick={resetToDefault}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset to Default
            </button>
          </div>
        </div>

        {/* Scrollable Content Area - Contains all controls and layers */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0
          }}
          className="custom-scrollbar"
        >
          {/* Base Map Controls Section */}
          <div
          style={{
            padding: '12px 24px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(0, 184, 212, 0.03)'
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <span style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Base Map
            </span>
          </div>
          
          {/* Map Style Toggle (Satellite / Street) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(168, 85, 247, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </div>
              <div>
                <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>
                  Map Style
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>
                  {props.mapStyle === 'satellite' ? 'Satellite View' : 'Street View'}
                </div>
              </div>
            </div>
            <button
              onClick={props.onToggleMapStyle}
              disabled={!props.onToggleMapStyle}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: props.mapStyle === 'satellite' ? 
                  'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)' : 
                  'linear-gradient(135deg, #00b8d4 0%, #00d4aa 100%)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '600',
                cursor: !props.onToggleMapStyle ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '80px'
              }}
            >
              {props.mapStyle === 'satellite' ? 'Satellite' : 'Street'}
            </button>
          </div>
          
          {/* Street Labels Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(0, 184, 212, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00b8d4" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div>
                <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>
                  Street Labels
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>
                  {props.mapStyle === 'satellite' ? 
                    (props.currentZoom >= 13 ? 'Zoom 13+ (Active)' : 'Zoom 13+ to enable') : 
                    'Only on Satellite view'}
                </div>
              </div>
            </div>
            <button
              onClick={props.onToggleStreetLabels}
              disabled={!props.onToggleStreetLabels || props.mapStyle !== 'satellite' || props.currentZoom < 13}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: props.showStreetLabels ? 
                  'linear-gradient(135deg, #00b8d4 0%, #00d4aa 100%)' : 
                  'rgba(255, 255, 255, 0.08)',
                color: props.showStreetLabels ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: (!props.onToggleStreetLabels || props.mapStyle !== 'satellite' || props.currentZoom < 13) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: (!props.onToggleStreetLabels || props.mapStyle !== 'satellite' || props.currentZoom < 13) ? 0.5 : 1
              }}
            >
              {props.showStreetLabels ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Parcel Layer Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(0, 212, 170, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </div>
              <div>
                <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>
                  Property Parcels
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>
                  {props.currentZoom >= 12 ? 'Zoom 12+ (Active)' : 'Zoom 12+ to enable'}
                </div>
              </div>
            </div>
            <button
              onClick={props.onToggleParcels}
              disabled={!props.onToggleParcels || props.currentZoom < 12}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: props.showParcels ? 
                  'linear-gradient(135deg, #00d4aa 0%, #00b8d4 100%)' : 
                  'rgba(255, 255, 255, 0.08)',
                color: props.showParcels ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: (!props.onToggleParcels || props.currentZoom < 12) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: (!props.onToggleParcels || props.currentZoom < 12) ? 0.5 : 1
              }}
            >
              {props.showParcels ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Team Deals Layer Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(168, 85, 247, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div>
                <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>
                  Team Deals
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>
                  View deals shared by team
                </div>
              </div>
            </div>
            <button
              onClick={props.onToggleTeamDeals}
              disabled={!props.onToggleTeamDeals}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: props.showTeamDeals ? 
                  'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)' : 
                  'rgba(255, 255, 255, 0.08)',
                color: props.showTeamDeals ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: !props.onToggleTeamDeals ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: !props.onToggleTeamDeals ? 0.5 : 1
              }}
            >
              {props.showTeamDeals ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Property Intelligence Section */}
        <div
          style={{
            padding: '12px 24px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(251, 191, 36, 0.03)'
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <span style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Property Intelligence
            </span>
          </div>

          {/* San Antonio Zoning Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(251, 191, 36, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div>
                <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>
                  San Antonio Zoning
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>
                  COSA zoning boundaries
                </div>
              </div>
            </div>
            <button
              onClick={props.onToggleSAZoning}
              disabled={!props.onToggleSAZoning}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: props.showSAZoning ? 
                  'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : 
                  'rgba(255, 255, 255, 0.08)',
                color: props.showSAZoning ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: !props.onToggleSAZoning ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: !props.onToggleSAZoning ? 0.5 : 1
              }}
            >
              {props.showSAZoning ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Austin Zoning Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(139, 92, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div>
                <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>
                  Austin Zoning
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>
                  Austin zoning boundaries
                </div>
              </div>
            </div>
            <button
              onClick={props.onToggleAustinZoning}
              disabled={!props.onToggleAustinZoning}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: props.showAustinZoning ? 
                  'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 
                  'rgba(255, 255, 255, 0.08)',
                color: props.showAustinZoning ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: !props.onToggleAustinZoning ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: !props.onToggleAustinZoning ? 0.5 : 1
              }}
            >
              {props.showAustinZoning ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* FEMA Flood Zones Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                </svg>
              </div>
              <div>
                <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>
                  FEMA Flood Zones
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>
                  100-year & 500-year zones
                </div>
              </div>
            </div>
            <button
              onClick={props.onToggleFloodZones}
              disabled={!props.onToggleFloodZones}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: props.showFloodZones ? 
                  'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 
                  'rgba(255, 255, 255, 0.08)',
                color: props.showFloodZones ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: !props.onToggleFloodZones ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: !props.onToggleFloodZones ? 0.5 : 1
              }}
            >
              {props.showFloodZones ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Water & Sewer Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(6, 182, 212, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="8"></line>
                </svg>
              </div>
              <div>
                <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>
                  Water & Sewer (SA)
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>
                  Stormwater infrastructure
                </div>
              </div>
            </div>
            <button
              onClick={props.onToggleWaterSewer}
              disabled={!props.onToggleWaterSewer}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: props.showWaterSewer ? 
                  'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' : 
                  'rgba(255, 255, 255, 0.08)',
                color: props.showWaterSewer ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: !props.onToggleWaterSewer ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: !props.onToggleWaterSewer ? 0.5 : 1
              }}
            >
              {props.showWaterSewer ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Bexar CAD Parcels Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'rgba(34, 197, 94, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </div>
              <div>
                <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>
                  Bexar CAD Parcels
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>
                  Free parcel intelligence
                </div>
              </div>
            </div>
            <button
              onClick={props.onToggleBexarParcels}
              disabled={!props.onToggleBexarParcels}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: props.showBexarParcels ? 
                  'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 
                  'rgba(255, 255, 255, 0.08)',
                color: props.showBexarParcels ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: !props.onToggleBexarParcels ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: !props.onToggleBexarParcels ? 0.5 : 1
              }}
            >
              {props.showBexarParcels ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Measurement Tools Section */}
        <div style={{ padding: '0 24px', marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <Ruler size={14} style={{ color: 'rgba(255,255,255,0.6)', marginRight: '8px' }} />
            <span style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Measurement Tools
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {/* Area Measurement Tool */}
            <button
              onClick={() => props.onSetMeasurementMode && props.onSetMeasurementMode(
                props.measurementMode === 'area' ? null : 'area'
              )}
              disabled={!props.onSetMeasurementMode}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: props.measurementMode === 'area' 
                  ? '1px solid rgba(168, 85, 247, 0.5)' 
                  : '1px solid rgba(255, 255, 255, 0.1)',
                background: props.measurementMode === 'area'
                  ? 'rgba(168, 85, 247, 0.15)'
                  : 'rgba(0, 0, 0, 0.2)',
                color: props.measurementMode === 'area' ? '#a855f7' : 'rgba(255,255,255,0.7)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: !props.onSetMeasurementMode ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Square size={20} />
              <span>Area</span>
              {props.measurementMode === 'area' && (
                <span style={{ fontSize: '10px', opacity: 0.8 }}>SQFT • AC</span>
              )}
            </button>

            {/* Distance Measurement Tool */}
            <button
              onClick={() => props.onSetMeasurementMode && props.onSetMeasurementMode(
                props.measurementMode === 'distance' ? null : 'distance'
              )}
              disabled={!props.onSetMeasurementMode}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: props.measurementMode === 'distance' 
                  ? '1px solid rgba(168, 85, 247, 0.5)' 
                  : '1px solid rgba(255, 255, 255, 0.1)',
                background: props.measurementMode === 'distance'
                  ? 'rgba(168, 85, 247, 0.15)'
                  : 'rgba(0, 0, 0, 0.2)',
                color: props.measurementMode === 'distance' ? '#a855f7' : 'rgba(255,255,255,0.7)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: !props.onSetMeasurementMode ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Ruler size={20} />
              <span>Distance</span>
              {props.measurementMode === 'distance' && (
                <span style={{ fontSize: '10px', opacity: 0.8 }}>FT • MI</span>
              )}
            </button>
          </div>

          {props.measurementMode && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '8px'
            }}>
              <p style={{ color: '#a855f7', fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}>
                {props.measurementMode === 'area' ? 'Area Measurement Active' : 'Distance Measurement Active'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', lineHeight: '1.4' }}>
                {props.measurementMode === 'area' 
                  ? 'Click on the map to draw a polygon. Double-click to finish.' 
                  : 'Click on the map to add points. Double-click to finish.'}
              </p>
            </div>
          )}
        </div>

        {/* Layer Categories */}
        <div
          style={{
            padding: '16px 0',
          }}
        >
          {loading ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '13px',
              }}
            >
              Loading layers...
            </div>
          ) : !filteredCategories || Object.keys(filteredCategories).length === 0 ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '13px',
              }}
            >
              {searchQuery ? `No layers found matching "${searchQuery}"` : 'No layers available'}
            </div>
          ) : (
            Object.keys(filteredCategories).map((categoryId) => {
              const category = filteredCategories[categoryId];
              const isExpanded = expandedCategories[categoryId];

              return (
                <div key={categoryId} style={{ marginBottom: '8px' }}>
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(categoryId)}
                    style={{
                      width: '100%',
                      padding: '12px 24px',
                      background: 'transparent',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span
                      style={{
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {category.label}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                    )}
                  </button>

                  {/* Layer List */}
                  {isExpanded && (
                    <div
                      style={{
                        animation: 'slideDown 200ms ease-out',
                      }}
                    >
                      {category.layers.map((layer) => (
                        <LayerRow
                          key={layer.id}
                          layer={layer}
                          state={layerStates[layer.id] || { visible: false, opacity: 100 }}
                          onToggle={() => toggleLayer(layer.id)}
                          onOpacityChange={(opacity) => updateLayerOpacity(layer.id, opacity)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Styles for animations and scrollbar */}
        <style>
          {`
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }

            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }

            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 3px;
            }

            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.2);
            }

            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
            }
          `}
        </style>
        {/* Close Scrollable Content Area */}
      </div>
      {/* Close Layer Manager Panel */}
      </div>
    </>
  );
};

// Layer Row Component with opacity control
const LayerRow = ({ layer, state, onToggle, onOpacityChange }) => {
  const [showOpacity, setShowOpacity] = useState(false);

  return (
    <div
      onMouseEnter={() => setShowOpacity(true)}
      onMouseLeave={() => setShowOpacity(false)}
      style={{
        padding: '12px 24px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderLeft: 'none',
        borderRight: 'none',
        transition: 'all 150ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Layer Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: '500',
              marginBottom: '4px',
            }}
          >
            {layer.name}
          </div>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '11px',
              lineHeight: '1.4',
            }}
          >
            {layer.description}
          </div>
        </div>

        {/* Toggle Switch */}
        <div
          onClick={onToggle}
          style={{
            width: '40px',
            height: '22px',
            borderRadius: '11px',
            background: state.visible ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)',
            border: `1px solid ${state.visible ? '#00b8d4' : 'rgba(255, 255, 255, 0.2)'}`,
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 200ms ease',
            flexShrink: 0,
            marginLeft: '12px',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#FFFFFF',
              position: 'absolute',
              top: '2px',
              left: state.visible ? '20px' : '2px',
              transition: 'left 200ms ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            }}
          />
        </div>
      </div>

      {/* Opacity Control */}
      {showOpacity && state.visible && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            animation: 'fadeIn 150ms ease-out',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '11px',
                fontWeight: '500',
              }}
            >
              Opacity
            </span>
            <span
              style={{
                color: '#00b8d4',
                fontSize: '11px',
                fontWeight: '600',
              }}
            >
              {state.opacity}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={state.opacity}
            onChange={(e) => onOpacityChange(parseInt(e.target.value))}
            style={{
              width: '100%',
              height: '4px',
              borderRadius: '2px',
              background: `linear-gradient(to right, #00b8d4 0%, #00b8d4 ${state.opacity}%, rgba(255, 255, 255, 0.1) ${state.opacity}%, rgba(255, 255, 255, 0.1) 100%)`,
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
            }}
            className="opacity-slider"
          />
          <style>
            {`
              @keyframes fadeIn {
                from {
                  opacity: 0;
                  transform: translateY(-4px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }

              .opacity-slider::-webkit-slider-thumb {
                appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #00b8d4;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0, 184, 212, 0.4);
                transition: all 150ms ease;
              }

              .opacity-slider::-webkit-slider-thumb:hover {
                transform: scale(1.15);
                box-shadow: 0 2px 8px rgba(0, 184, 212, 0.6);
              }

              .opacity-slider::-moz-range-thumb {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: #00b8d4;
                cursor: pointer;
                border: none;
                box-shadow: 0 2px 4px rgba(0, 184, 212, 0.4);
                transition: all 150ms ease;
              }

              .opacity-slider::-moz-range-thumb:hover {
                transform: scale(1.15);
                box-shadow: 0 2px 8px rgba(0, 184, 212, 0.6);
              }
            `}
          </style>
        </div>
      )}
    </div>
  );
};

export default LayerManager;
