import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { useMapCRM } from '../../contexts/MapCRMContext';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons by asset type
const getMarkerIcon = (assetType) => {
  const colors = {
    'Gas': '#ef4444',      // Red
    'Retail': '#3b82f6',   // Blue
    'Industrial': '#f97316', // Orange
    'Office': '#22c55e',   // Green
    'Land': '#92400e',     // Brown
    'Multifamily': '#a855f7' // Purple
  };

  const color = colors[assetType] || '#6b7280';

  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    className: 'custom-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const MapView = () => {
  const { properties, selectedProperty, setSelectedProperty } = useMapCRM();

  // Default center (US)
  const defaultCenter = [37.0902, -95.7129];
  const defaultZoom = 4;

  // Center map on first property if available
  const center = properties.length > 0
    ? [properties[0].latitude, properties[0].longitude]
    : defaultCenter;

  const zoom = properties.length > 0 ? 10 : defaultZoom;

  if (properties.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-2">No properties to display</p>
          <p className="text-sm text-gray-500">Import a CSV file to get started</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={50}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
      >
        {properties.map((property) => (
          <Marker
            key={property.id}
            position={[property.latitude, property.longitude]}
            icon={getMarkerIcon(property.asset_type)}
            eventHandlers={{
              click: () => setSelectedProperty(property)
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm">{property.title || property.address}</h3>
                <p className="text-xs text-gray-600">{property.city}, {property.state}</p>
                <p className="text-xs mt-1">
                  <span className="font-semibold">Type:</span> {property.asset_type}
                </p>
                {property.asking_price && (
                  <p className="text-xs">
                    <span className="font-semibold">Price:</span> ${property.asking_price.toLocaleString()}
                  </p>
                )}
                <p className="text-xs mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    property.status === 'available' ? 'bg-green-100 text-green-800' :
                    property.status === 'claimed' ? 'bg-blue-100 text-blue-800' :
                    property.status === 'converted' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {property.status}
                  </span>
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default MapView;
