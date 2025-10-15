import React, { createContext, useContext, useRef } from 'react';
import { useMapLayersSimple } from '../hooks/useMapLayersSimple';

const MapLayerContext = createContext(null);

export const MapLayerProvider = ({ children, mapRef }) => {
  const layerHandlers = useMapLayersSimple(mapRef);

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
