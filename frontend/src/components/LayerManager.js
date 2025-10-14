import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, ChevronRight, Layers, RefreshCw, MinusCircle } from 'lucide-react';

const LayerManager = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({
    administrative: true,
    environmental: true,
    planning: true,
    infrastructure: true,
    transportation: true,
  });

  // Layer definitions with metadata
  const layerDefinitions = {
    administrative: {
      label: 'Administrative',
      layers: [
        { id: 'counties', label: 'Counties', description: 'County boundaries' },
        { id: 'city_limits', label: 'City Limits', description: 'Municipal boundaries' },
        { id: 'census_tracts', label: 'Census Tracts', description: 'US Census tract boundaries' },
      ],
    },
    environmental: {
      label: 'Environmental',
      layers: [
        { id: 'fema_floodplain', label: 'FEMA Floodplain', description: '100-year and 500-year flood zones' },
        { id: 'wetlands', label: 'Wetlands', description: 'Protected wetland areas' },
        { id: 'watersheds', label: 'Watersheds', description: 'Watershed boundaries' },
      ],
    },
    planning: {
      label: 'Planning & Zoning',
      layers: [
        { id: 'sa_zoning', label: 'San Antonio Zoning', description: 'Current zoning designations' },
        { id: 'future_land_use', label: 'Future Land Use', description: 'Comprehensive plan designations' },
        { id: 'subdivisions', label: 'Subdivisions', description: 'Recorded subdivision plats' },
        { id: 'preliminary_plats', label: 'Preliminary Plats', description: 'Proposed development plats' },
        { id: 'sector_plan', label: 'Sector Plan Use', description: 'Sector-specific planning zones' },
      ],
    },
    infrastructure: {
      label: 'Infrastructure',
      layers: [
        { id: 'saws_water', label: 'SAWS Water/Sewer', description: 'Water and sewer service areas' },
        { id: 'gas_lines', label: 'Gas Lines', description: 'Natural gas infrastructure' },
        { id: 'electric_grid', label: 'Electric Grid', description: 'Power transmission lines' },
        { id: 'fiber_network', label: 'Fiber Network', description: 'Fiber optic infrastructure' },
      ],
    },
    transportation: {
      label: 'Transportation',
      layers: [
        { id: 'txdot_projects', label: 'TxDOT Projects', description: 'Planned highway improvements' },
        { id: 'transit_routes', label: 'Transit Routes', description: 'VIA bus and rail lines' },
        { id: 'bike_lanes', label: 'Bike Lanes', description: 'Existing and planned bike infrastructure' },
      ],
    },
  };

  // Initialize layer states from localStorage or defaults
  const [layerStates, setLayerStates] = useState(() => {
    const saved = localStorage.getItem('mapLayerStates');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default: all layers off
    const initial = {};
    Object.keys(layerDefinitions).forEach((category) => {
      layerDefinitions[category].layers.forEach((layer) => {
        initial[layer.id] = { visible: false, opacity: 100 };
      });
    });
    return initial;
  });

  // Persist layer states to localStorage
  useEffect(() => {
    localStorage.setItem('mapLayerStates', JSON.stringify(layerStates));
  }, [layerStates]);

  // Toggle layer visibility
  const toggleLayer = (layerId) => {
    setLayerStates((prev) => ({
      ...prev,
      [layerId]: {
        ...prev[layerId],
        visible: !prev[layerId]?.visible,
      },
    }));
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
    });
    setLayerStates(newStates);
  };

  // Reset to Default action
  const resetToDefault = () => {
    const initial = {};
    Object.keys(layerDefinitions).forEach((category) => {
      layerDefinitions[category].layers.forEach((layer) => {
        initial[layer.id] = { visible: false, opacity: 100 };
      });
    });
    setLayerStates(initial);
  };

  // Filter layers based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return layerDefinitions;

    const query = searchQuery.toLowerCase();
    const filtered = {};

    Object.keys(layerDefinitions).forEach((categoryId) => {
      const category = layerDefinitions[categoryId];
      const matchingLayers = category.layers.filter(
        (layer) =>
          layer.label.toLowerCase().includes(query) ||
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
  }, [searchQuery]);

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
            zIndex: 998,
            transition: 'opacity 200ms ease-in-out',
          }}
          className="lg:hidden"
        />
      )}

      {/* Layer Manager Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: isOpen ? '0' : '-380px',
          width: '380px',
          height: '100vh',
          background: 'rgba(11, 12, 14, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderLeft: 'none',
          zIndex: 999,
          transition: 'left 200ms ease-in-out',
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

        {/* Layer Categories */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 0',
          }}
          className="custom-scrollbar"
        >
          {Object.keys(filteredCategories).length === 0 ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '13px',
              }}
            >
              No layers found matching "{searchQuery}"
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
            {layer.label}
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
