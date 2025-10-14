import { useState, useEffect, useCallback } from 'react';
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

  /**
   * Fetch and update layer data for current viewport
   */
  const fetchLayerData = useCallback(
    async (layerId) => {
      if (!mapRef.current || !layerRegistry) return;

      const layerConfig = layerRegistry[layerId];
      if (!layerConfig) return;

      try {
        const token = localStorage.getItem('token');
        const map = mapRef.current.getMap();

        // Get current map bounds with some padding
        const bounds = map.getBounds();
        const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;

        // Fetch layer data
        const response = await axios.get(`${API}/layers/${layerId}/query`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { bbox },
        });

        const geojsonData = response.data;
        const featureCount = geojsonData?.features?.length || 0;

        // Update source data
        const sourceId = `layer-source-${layerId}`;
        const source = map.getSource(sourceId);
        if (source) {
          source.setData(geojsonData);
          console.log(`✓ Updated layer: ${layerConfig.name} (${featureCount} features)`);
        }

        // Store layer data
        setLayerData((prev) => ({ ...prev, [layerId]: geojsonData }));
      } catch (error) {
        console.error(`Error fetching layer data for ${layerId}:`, error.response?.data || error.message);
      }
    },
    [mapRef, layerRegistry]
  );

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

        // Get current map bounds
        const bounds = map.getBounds();
        const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;

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

        // Add layer to map based on style type
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

        // Store layer data and mark as loaded
        setLayerData((prev) => ({ ...prev, [layerId]: geojsonData }));
        setLoadedLayers((prev) => new Set([...prev, layerId]));
        
        console.log(`✓ Added layer: ${layerConfig.name} (${featureCount} features)`);

        // Set up event listener to refresh layer data on map move
        const refreshLayerData = () => {
          fetchLayerData(layerId);
        };

        // Debounce the moveend event to avoid too many requests
        let moveEndTimeout;
        const debouncedRefresh = () => {
          clearTimeout(moveEndTimeout);
          moveEndTimeout = setTimeout(refreshLayerData, 500);
        };

        map.on('moveend', debouncedRefresh);
        
        // Store cleanup function
        if (!window.mapLayerCleanup) {
          window.mapLayerCleanup = {};
        }
        window.mapLayerCleanup[layerId] = () => {
          map.off('moveend', debouncedRefresh);
        };
        
      } catch (error) {
        console.error(`Error adding layer ${layerId}:`, error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    },
    [mapRef, layerRegistry, loadedLayers, fetchLayerData]
  );

  /**
   * Remove a layer from the map
   */
  const removeLayer = useCallback(
    (layerId) => {
      if (!mapRef.current || !loadedLayers.has(layerId)) return;

      const map = mapRef.current.getMap();
      const layerIdOnMap = `layer-${layerId}`;
      const sourceId = `layer-source-${layerId}`;

      if (map.getLayer(layerIdOnMap)) {
        map.removeLayer(layerIdOnMap);
      }

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
      const layerConfig = layerRegistry?.[layerId];

      if (!layerConfig || !map.getLayer(layerIdOnMap)) return;

      const style = layerConfig.style;

      if (style.type === 'fill') {
        map.setPaintProperty(layerIdOnMap, 'fill-opacity', opacity / 100);
      } else if (style.type === 'line') {
        map.setPaintProperty(layerIdOnMap, 'line-opacity', opacity / 100);
      } else if (style.type === 'circle') {
        map.setPaintProperty(layerIdOnMap, 'circle-opacity', opacity / 100);
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
