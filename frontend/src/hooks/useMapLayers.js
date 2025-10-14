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
        console.log(`[useMapLayers] Fetching layer registry from ${API}/layers/registry`);
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/layers/registry`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log(`[useMapLayers] Layer registry response:`, response.data);
        setLayerRegistry(response.data.layers);
        console.log(`[useMapLayers] Layer registry set with ${Object.keys(response.data.layers).length} layers`);
      } catch (error) {
        console.error('[useMapLayers] Error fetching layer registry:', error);
        console.error('[useMapLayers] Error details:', error.response?.data || error.message);
      }
    };

    fetchRegistry();
  }, []);

  /**
   * Add a layer to the map
   */
  const addLayer = useCallback(
    async (layerId, opacity = 100) => {
      console.log(`[useMapLayers] addLayer called for ${layerId}, opacity: ${opacity}`);
      
      if (!mapRef.current) {
        console.log(`[useMapLayers] mapRef.current is null`);
        return;
      }
      
      if (!layerRegistry) {
        console.log(`[useMapLayers] layerRegistry is null`);
        return;
      }
      
      if (loadedLayers.has(layerId)) {
        console.log(`[useMapLayers] Layer ${layerId} already loaded`);
        return;
      }

      const layerConfig = layerRegistry[layerId];
      if (!layerConfig) {
        console.log(`[useMapLayers] Layer config not found for ${layerId}`);
        return;
      }

      setLoading(true);

      try {
        const token = localStorage.getItem('token');
        const map = mapRef.current.getMap();
        
        console.log(`[useMapLayers] Got map instance:`, map);

        // Wait for map to be loaded
        if (!map.isStyleLoaded()) {
          console.log(`[useMapLayers] Map style not loaded yet, waiting...`);
          await new Promise((resolve) => {
            map.once('styledata', resolve);
          });
          console.log(`[useMapLayers] Map style loaded`);
        }

        // Get current map bounds
        const bounds = map.getBounds();
        const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
        
        console.log(`[useMapLayers] Fetching layer data with bbox:`, bbox);

        // Fetch layer data
        const response = await axios.get(`${API}/layers/${layerId}/query`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { bbox },
        });

        const geojsonData = response.data;
        console.log(`[useMapLayers] Received GeoJSON data:`, geojsonData);
        console.log(`[useMapLayers] Feature count:`, geojsonData?.features?.length || 0);

        // Add source to map
        const sourceId = `layer-source-${layerId}`;
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: geojsonData,
          });
          console.log(`[useMapLayers] Added source: ${sourceId}`);
        } else {
          console.log(`[useMapLayers] Source ${sourceId} already exists, updating data`);
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
          console.log(`[useMapLayers] Added layer: ${layerIdOnMap}`, layerOptions);
        } else {
          console.log(`[useMapLayers] Layer ${layerIdOnMap} already exists`);
        }

        // Store layer data and mark as loaded
        setLayerData((prev) => ({ ...prev, [layerId]: geojsonData }));
        setLoadedLayers((prev) => new Set([...prev, layerId]));
        
        console.log(`[useMapLayers] Successfully added layer ${layerId}`);
      } catch (error) {
        console.error(`[useMapLayers] Error adding layer ${layerId}:`, error);
        console.error(`[useMapLayers] Error details:`, error.response?.data || error.message);
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
