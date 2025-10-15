import { useState, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

/**
 * Simplified map layers hook - minimal working version
 * Focus: Get zoning layer working reliably first
 */
export const useMapLayersSimple = (mapRef) => {
  const [layerRegistry, setLayerRegistry] = useState(null);
  const [activeLayerIds, setActiveLayerIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

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
   * Wait for map to be ready, then add layer
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
      const token = localStorage.getItem('token');
      
      // Fetch layer data
      const bbox = '-98.9,29.0,-98.0,29.8'; // San Antonio area
      console.log(`[Layer] Fetching data for ${layerId}...`);
      
      const response = await axios.get(`${API}/api/layers/${layerId}/query`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { bbox },
      });

      const geojsonData = response.data;
      const featureCount = geojsonData?.features?.length || 0;
      console.log(`[Layer] Got ${featureCount} features`);

      // Add source
      const sourceId = `layer-source-${layerId}`;
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData,
        });
        console.log(`[Layer] Source added`);
      }

      // Add fill layer
      const layerIdOnMap = `layer-${layerId}`;
      const style = layerConfig.style;

      map.addLayer({
        id: layerIdOnMap,
        type: style.type,
        source: sourceId,
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
          layout: {
            'text-field': labelConfig.textField,
            'text-size': 11,
            'text-allow-overlap': true,
            'text-ignore-placement': true,
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
              10, 0,
              13, 0.7,
              15, 1
            ]
          }
        });
        
        console.log(`[Layer] Labels added`);
      }

      setActiveLayerIds((prev) => new Set([...prev, layerId]));
      console.log(`✓ ${layerConfig.name} loaded successfully (${featureCount} features)`);

    } catch (error) {
      console.error(`Error loading ${layerId}:`, error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  }, [mapRef, layerRegistry, fetchRegistry]);

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
  }, [mapRef]);

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
