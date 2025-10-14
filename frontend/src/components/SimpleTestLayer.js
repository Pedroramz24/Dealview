import { useEffect } from 'react';

/**
 * Simple test component to verify layer visibility
 * Adds a red rectangle over San Antonio that should be visible at all zoom levels
 */
const SimpleTestLayer = ({ mapRef }) => {
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();
    if (!map) return;

    // Wait for map to load
    const addTestLayer = () => {
      console.log('[TEST] Adding simple test layer...');

      // Simple GeoJSON - a large rectangle over San Antonio
      const testGeoJSON = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [-98.7, 29.3],  // Southwest
                [-98.3, 29.3],  // Southeast
                [-98.3, 29.5],  // Northeast
                [-98.7, 29.5],  // Northwest
                [-98.7, 29.3]   // Close the polygon
              ]]
            },
            properties: {
              name: 'Test Rectangle'
            }
          }
        ]
      };

      // Add source
      if (!map.getSource('test-source')) {
        map.addSource('test-source', {
          type: 'geojson',
          data: testGeoJSON
        });
        console.log('[TEST] Source added');
      }

      // Add layer with simple red fill
      if (!map.getLayer('test-layer')) {
        map.addLayer({
          id: 'test-layer',
          type: 'fill',
          source: 'test-source',
          paint: {
            'fill-color': '#FF0000',  // Bright red
            'fill-opacity': 0.5,
            'fill-outline-color': '#FFFF00'  // Yellow outline
          }
        });
        console.log('[TEST] Layer added - should see red rectangle!');
        
        // Verify layer exists
        if (map.getLayer('test-layer')) {
          console.log('[TEST] ✓ Layer confirmed in map');
          console.log('[TEST] Current layers:', map.getStyle().layers.map(l => l.id).join(', '));
        }
      }
    };

    if (map.isStyleLoaded()) {
      addTestLayer();
    } else {
      map.once('load', addTestLayer);
    }

    // Cleanup
    return () => {
      if (map.getLayer('test-layer')) {
        map.removeLayer('test-layer');
      }
      if (map.getSource('test-source')) {
        map.removeSource('test-source');
      }
    };
  }, [mapRef]);

  return null; // This component doesn't render anything
};

export default SimpleTestLayer;
