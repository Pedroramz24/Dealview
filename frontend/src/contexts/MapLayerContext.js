import React, { createContext, useContext, useRef } from 'react';
import { useMapLayers } from '../hooks/useMapLayers';

const MapLayerContext = createContext(null);

export const MapLayerProvider = ({ children, mapRef }) => {
  const layerHandlers = useMapLayers(mapRef);

  return (
    <MapLayerContext.Provider value={layerHandlers}>
      {children}
    </MapLayerContext.Provider>
  );
};

export const useMapLayerContext = () => {
  const context = useContext(MapLayerContext);
  return context;
};
