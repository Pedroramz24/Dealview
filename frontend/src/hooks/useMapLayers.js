import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API } from '../App';

/**
 * Custom hook for managing map layers with GIS data
 */
export const useMapLayers = (mapRef) => {
  const [layerRegistry, setLayerRegistry] = useState(null);
  const [loadedLayers, setLoadedLayers] = useState(new Set());
  const [layerData, setLayerData] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Track layer configurations for restoration after style changes
  const layerConfigsRef = useRef({});
  const isRestoringRef = useRef(false);

  // Fetch layer registry on mount
  useEffect(() => {
    const fetchRegistry = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/layers/registry`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLayerRegistry(response.data.layers);
        console.log(`✓ Loaded ${Object.keys(response.data.layers).length} GIS layers`);
      } catch (error) {
        console.error('Error fetching layer registry:', error.response?.data || error.message);
      }
    };

    fetchRegistry();
  }, []);

  // Listen for map style changes and restore layers
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    const handleStyleData = () => {
      // Don't restore if we're already in the middle of restoring
      if (isRestoringRef.current) return;
      
      // Check if we have loaded layers that need to be restored
      if (loadedLayers.size > 0 && Object.keys(layerConfigsRef.current).length > 0) {
        console.log('🔄 Map style changed, restoring layers...');
        isRestoringRef.current = true;
        
        // Restore all layers after a short delay to ensure style is fully loaded
        setTimeout(() => {
          restoreAllLayers();
          isRestoringRef.current = false;
        }, 100);
      }
    };

    map.on('styledata', handleStyleData);

    return () => {
      map.off('styledata', handleStyleData);
    };
  }, [mapRef, loadedLayers]);

  /**
   * Restore all previously loaded layers (called after style change)
   */
  const restoreAllLayers = useCallback(() => {
    if (!mapRef.current || !layerRegistry) return;

    const map = mapRef.current.getMap();
    if (!map || !map.isStyleLoaded()) return;

    console.log(`Restoring ${loadedLayers.size} layers...`);

    loadedLayers.forEach(layerId => {
      const config = layerConfigsRef.current[layerId];
      if (!config) return;

      const { data, opacity, layerConfig } = config;
      const sourceId = `layer-source-${layerId}`;
      const layerIdOnMap = `layer-${layerId}`;
      const labelLayerId = `layer-${layerId}-labels`;

      try {
        // Re-add source
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: data,
          });
        }

        // Re-add main layer
        if (!map.getLayer(layerIdOnMap)) {
          const style = layerConfig.style;
          const layerOptions = {
            id: layerIdOnMap,
            type: style.type,
            source: sourceId,
            paint: {
              ...style.paint,
            },
          };

          // Apply opacity
          if (style.type === 'fill') {
            layerOptions.paint['fill-opacity'] = opacity / 100;
          } else if (style.type === 'line') {
            layerOptions.paint['line-opacity'] = opacity / 100;
          } else if (style.type === 'circle') {
            layerOptions.paint['circle-opacity'] = opacity / 100;
          }

          map.addLayer(layerOptions);
        }

        // Re-add labels if configured
        if (layerConfig.labelConfig && !map.getLayer(labelLayerId)) {
          const labelConfig = layerConfig.labelConfig;
          
          map.addLayer({
            id: labelLayerId,
            type: 'symbol',
            source: sourceId,
            layout: {
              'text-field': labelConfig.textField,
              'text-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 8,
                14, 10,
                16, 11,
                18, 12,
                20, 14
              ],
              'text-allow-overlap': true,
              'text-ignore-placement': true,
              'symbol-placement': 'point',
              'text-anchor': 'center',
              'text-justify': 'center'
            },
            paint: {
              'text-color': labelConfig.textColor,
              'text-halo-color': labelConfig.textHaloColor,
              'text-halo-width': labelConfig.textHaloWidth,
              'text-halo-blur': 0.5,
              'text-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 0,
                13, 0.7,
                15, 1
              ]
            }
          });
        }

        console.log(`✓ Restored layer: ${layerConfig.name}`);
      } catch (error) {
        console.error(`Error restoring layer ${layerId}:`, error);
      }
    });
  }, [mapRef, layerRegistry, loadedLayers]);

  /**
   * Add a layer to the map
   */
  const addLayer = useCallback(
    async (layerId, opacity = 100) => {
      if (!mapRef.current || !layerRegistry || loadedLayers.has(layerId)) return;

      const layerConfig = layerRegistry[layerId];
      if (!layerConfig) return;

      setLoading(true);

      try {
        const token = localStorage.getItem('token');
        const map = mapRef.current.getMap();

        // Wait for map to be loaded
        if (!map.isStyleLoaded()) {
          await new Promise((resolve) => {
            map.once('styledata', resolve);
          });
        }

        // Load a large fixed area (entire San Antonio MSA) to avoid disappearing on pan
        // This ensures layers stay visible regardless of zoom or pan
        const bbox = '-98.9,29.0,-98.0,29.8'; // San Antonio metro area

        // Fetch layer data
        const response = await axios.get(`${API}/layers/${layerId}/query`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { bbox },
        });

        const geojsonData = response.data;
        const featureCount = geojsonData?.features?.length || 0;

        // Add source to map
        const sourceId = `layer-source-${layerId}`;
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: geojsonData,
          });
        } else {
          map.getSource(sourceId).setData(geojsonData);
        }

        // Add layer to map based on style type (NO zoom restrictions)
        const layerIdOnMap = `layer-${layerId}`;
        const style = layerConfig.style;

        const layerOptions = {
          id: layerIdOnMap,
          type: style.type,
          source: sourceId,
          paint: {
            ...style.paint,
          },
        };

        // Apply opacity
        if (style.type === 'fill') {
          layerOptions.paint['fill-opacity'] = opacity / 100;
        } else if (style.type === 'line') {
          layerOptions.paint['line-opacity'] = opacity / 100;
        } else if (style.type === 'circle') {
          layerOptions.paint['circle-opacity'] = opacity / 100;
        }

        if (!map.getLayer(layerIdOnMap)) {
          map.addLayer(layerOptions);
        }

        // Add text labels if layer has labelConfig (for zoning layer)
        if (layerConfig.labelConfig) {
          const labelLayerId = `layer-${layerId}-labels`;
          if (!map.getLayer(labelLayerId)) {
            const labelConfig = layerConfig.labelConfig;
            
            map.addLayer({
              id: labelLayerId,
              type: 'symbol',
              source: sourceId,
              // NO minzoom restriction - visible at all zoom levels
              layout: {
                'text-field': labelConfig.textField,
                'text-size': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10, 8,   // Smaller at far zoom
                  14, 10,
                  16, 11,
                  18, 12,
                  20, 14
                ],
                'text-allow-overlap': true, // Force labels to show
                'text-ignore-placement': true, // Ignore collision detection
                'symbol-placement': 'point',
                'text-anchor': 'center',
                'text-justify': 'center'
              },
              paint: {
                'text-color': labelConfig.textColor,
                'text-halo-color': labelConfig.textHaloColor,
                'text-halo-width': labelConfig.textHaloWidth,
                'text-halo-blur': 0.5,
                'text-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10, 0,     // Hidden when really zoomed out
                  13, 0.7,   // Start showing
                  15, 1      // Fully visible
                ]
              }
            });
          }
        }

        // Store layer data and mark as loaded
        setLayerData((prev) => ({ ...prev, [layerId]: geojsonData }));
        setLoadedLayers((prev) => new Set([...prev, layerId]));
        
        console.log(`✓ Added layer: ${layerConfig.name} (${featureCount} features)`);
        
      } catch (error) {
        console.error(`Error adding layer ${layerId}:`, error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    },
    [mapRef, layerRegistry, loadedLayers]
  );

  /**
   * Remove a layer from the map
   */
  const removeLayer = useCallback(
    (layerId) => {
      if (!mapRef.current || !loadedLayers.has(layerId)) return;

      const map = mapRef.current.getMap();
      const layerIdOnMap = `layer-${layerId}`;
      const labelLayerId = `layer-${layerId}-labels`;
      const sourceId = `layer-source-${layerId}`;

      // Remove label layer if it exists
      if (map.getLayer(labelLayerId)) {
        map.removeLayer(labelLayerId);
      }

      // Remove main layer
      if (map.getLayer(layerIdOnMap)) {
        map.removeLayer(layerIdOnMap);
      }

      // Remove source
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }

      setLoadedLayers((prev) => {
        const updated = new Set(prev);
        updated.delete(layerId);
        return updated;
      });

      setLayerData((prev) => {
        const updated = { ...prev };
        delete updated[layerId];
        return updated;
      });
    },
    [mapRef, loadedLayers]
  );

  /**
   * Update layer opacity
   */
  const updateLayerOpacity = useCallback(
    (layerId, opacity) => {
      if (!mapRef.current || !loadedLayers.has(layerId)) return;

      const map = mapRef.current.getMap();
      const layerIdOnMap = `layer-${layerId}`;
      const labelLayerId = `layer-${layerId}-labels`;
      const layerConfig = layerRegistry?.[layerId];

      if (!layerConfig || !map.getLayer(layerIdOnMap)) return;

      const style = layerConfig.style;

      // Update main layer opacity
      if (style.type === 'fill') {
        map.setPaintProperty(layerIdOnMap, 'fill-opacity', opacity / 100);
      } else if (style.type === 'line') {
        map.setPaintProperty(layerIdOnMap, 'line-opacity', opacity / 100);
      } else if (style.type === 'circle') {
        map.setPaintProperty(layerIdOnMap, 'circle-opacity', opacity / 100);
      }

      // Update label opacity if labels exist
      if (map.getLayer(labelLayerId)) {
        map.setPaintProperty(labelLayerId, 'text-opacity', opacity / 100);
      }
    },
    [mapRef, loadedLayers, layerRegistry]
  );

  /**
   * Identify features at a point
   */
  const identifyFeatures = useCallback(
    async (layerId, lat, lon) => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/layers/${layerId}/identify`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { lat, lon, tolerance: 0.001 },
        });

        return response.data;
      } catch (error) {
        console.error(`Error identifying features for ${layerId}:`, error);
        return null;
      }
    },
    []
  );

  return {
    layerRegistry,
    loadedLayers,
    layerData,
    loading,
    addLayer,
    removeLayer,
    updateLayerOpacity,
    identifyFeatures,
  };
};
