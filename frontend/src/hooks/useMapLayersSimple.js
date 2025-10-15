import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * Simplified map layers hook - minimal working version
 * Focus: Get zoning layer working reliably with dynamic data loading
 */
export const useMapLayersSimple = (mapRef) => {
  const [layerRegistry, setLayerRegistry] = useState(null);
  const [activeLayerIds, setActiveLayerIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [layerMoveHandlers, setLayerMoveHandlers] = useState({});

  /**
   * Fetch layer registry
   */
  const fetchRegistry = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/layers/registry`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLayerRegistry(response.data.layers);
      console.log(`✓ Loaded ${Object.keys(response.data.layers).length} GIS layers`);
      return response.data.layers;
    } catch (error) {
      console.error('Error fetching layer registry:', error.response?.data || error.message);
      return null;
    }
  }, []);

  /**
   * Fetch layer data for current viewport
   */
  const fetchLayerData = useCallback(async (layerId, map) => {
    try {
      const token = localStorage.getItem('token');
      
      // Get current map bounds
      const bounds = map.getBounds();
      const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
      
      const response = await axios.get(`${API}/api/layers/${layerId}/query`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { bbox },
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching ${layerId} data:`, error.response?.data || error.message);
      return null;
    }
  }, []);

  /**
   * Wait for map to be ready, then add layer with dynamic data loading
   */
  const addLayer = useCallback(async (layerId, opacity = 100) => {
    console.log(`[Layer] Adding ${layerId}...`);
    
    // Wait for map ref to be ready
    const waitForMap = () => {
      return new Promise((resolve) => {
        const check = () => {
          if (mapRef.current) {
            const map = mapRef.current.getMap();
            if (map && map.isStyleLoaded()) {
              resolve(map);
            } else {
              setTimeout(check, 100);
            }
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    };

    const map = await waitForMap();
    console.log(`[Layer] Map ready for ${layerId}`);

    // Fetch registry if not loaded
    let registry = layerRegistry;
    if (!registry) {
      registry = await fetchRegistry();
      if (!registry) {
        console.error('[Layer] Failed to load registry');
        return;
      }
    }

    const layerConfig = registry[layerId];
    if (!layerConfig) {
      console.error(`[Layer] No config for ${layerId}`);
      return;
    }

    // Check if already added
    if (map.getLayer(`layer-${layerId}`)) {
      console.log(`[Layer] ${layerId} already exists`);
      return;
    }

    setLoading(true);

    try {
      // Fetch initial data
      const geojsonData = await fetchLayerData(layerId, map);
      if (!geojsonData) {
        console.error('[Layer] Failed to fetch initial data');
        setLoading(false);
        return;
      }

      const featureCount = geojsonData?.features?.length || 0;
      console.log(`[Layer] Got ${featureCount} features for initial load`);

      // Add source
      const sourceId = `layer-source-${layerId}`;
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData,
        });
        console.log(`[Layer] Source added`);
      }

      // Add fill layer with zoom constraints
      const layerIdOnMap = `layer-${layerId}`;
      const style = layerConfig.style;

      map.addLayer({
        id: layerIdOnMap,
        type: style.type,
        source: sourceId,
        minzoom: 0,
        maxzoom: 24,
        paint: {
          ...style.paint,
          [`${style.type}-opacity`]: opacity / 100,
        },
      });
      
      console.log(`[Layer] Layer added to map`);

      // Add labels if configured
      if (layerConfig.labelConfig) {
        const labelLayerId = `layer-${layerId}-labels`;
        const labelConfig = layerConfig.labelConfig;
        
        map.addLayer({
          id: labelLayerId,
          type: 'symbol',
          source: sourceId,
          minzoom: 13,
          layout: {
            'text-field': labelConfig.textField,
            'text-size': 11,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'symbol-placement': 'point',
          },
          paint: {
            'text-color': labelConfig.textColor,
            'text-halo-color': labelConfig.textHaloColor,
            'text-halo-width': labelConfig.textHaloWidth,
            'text-opacity': [
              'interpolate',
              ['linear'],
              ['zoom'],
              13, 0,
              14, 0.7,
              15, 1
            ]
          }
        });
        
        console.log(`[Layer] Labels added`);
      }

      // Set up dynamic data loading on map movement (debounced)
      let moveTimeout;
      const moveHandler = async () => {
        // Clear previous timeout to debounce
        if (moveTimeout) clearTimeout(moveTimeout);
        
        moveTimeout = setTimeout(async () => {
          const newData = await fetchLayerData(layerId, map);
          if (newData && map.getSource(sourceId)) {
            map.getSource(sourceId).setData(newData);
            console.log(`[Layer] Updated ${layerId} with ${newData.features.length} features`);
          }
        }, 300); // Wait 300ms after movement stops
      };

      // Add moveend listener for dynamic updates
      map.on('moveend', moveHandler);
      
      // Store handler reference for cleanup
      setLayerMoveHandlers(prev => ({
        ...prev,
        [layerId]: moveHandler
      }));

      setActiveLayerIds((prev) => new Set([...prev, layerId]));
      console.log(`✓ ${layerConfig.name} loaded with dynamic updates (${featureCount} features)`);

    } catch (error) {
      console.error(`Error loading ${layerId}:`, error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  }, [mapRef, layerRegistry, fetchRegistry, fetchLayerData]);

  /**
   * Remove a layer
   */
  const removeLayer = useCallback((layerId) => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    const layerIdOnMap = `layer-${layerId}`;
    const labelLayerId = `layer-${layerId}-labels`;
    const sourceId = `layer-source-${layerId}`;

    // Remove event listener if exists
    if (layerMoveHandlers[layerId]) {
      map.off('moveend', layerMoveHandlers[layerId]);
      setLayerMoveHandlers(prev => {
        const updated = { ...prev };
        delete updated[layerId];
        return updated;
      });
      console.log(`[Layer] Removed moveend listener for ${layerId}`);
    }

    if (map.getLayer(labelLayerId)) {
      map.removeLayer(labelLayerId);
    }

    if (map.getLayer(layerIdOnMap)) {
      map.removeLayer(layerIdOnMap);
    }

    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    setActiveLayerIds((prev) => {
      const updated = new Set(prev);
      updated.delete(layerId);
      return updated;
    });

    console.log(`✓ Removed layer: ${layerId}`);
  }, [mapRef, layerMoveHandlers]);

  /**
   * Update layer opacity
   */
  const updateLayerOpacity = useCallback((layerId, opacity) => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    const layerIdOnMap = `layer-${layerId}`;
    const labelLayerId = `layer-${layerId}-labels`;

    if (map.getLayer(layerIdOnMap)) {
      const layer = map.getLayer(layerIdOnMap);
      const opacityProp = `${layer.type}-opacity`;
      map.setPaintProperty(layerIdOnMap, opacityProp, opacity / 100);
    }

    if (map.getLayer(labelLayerId)) {
      // Labels have interpolated opacity, keep that
    }
  }, [mapRef]);

  return {
    layerRegistry,
    activeLayerIds,
    loading,
    addLayer,
    removeLayer,
    updateLayerOpacity,
    fetchRegistry,
  };
};
