import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const MapView = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const response = await axios.get(`${API}/deals`);
      setDeals(response.data);
    } catch (error) {
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-center">
        <div className="bg-white rounded-lg shadow-lg px-6 py-3">
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>Property Map</h2>
          <p className="text-sm text-gray-600">{deals.length} active deals</p>
        </div>
        <Button
          onClick={() => navigate('/deals')}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg"
          data-testid="view-all-deals-button"
        >
          View All Deals
        </Button>
      </div>

      <MapContainer
        center={[34.0522, -118.2437]}
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        data-testid="map-container"
      >
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
        />
        
        {deals.map((deal) => (
          <Marker
            key={deal.id}
            position={[deal.latitude, deal.longitude]}
            eventHandlers={{
              click: () => navigate(`/deals/${deal.id}`),
            }}
          >
            <Popup>
              <div className="p-2" style={{ minWidth: '250px' }}>
                {deal.primary_image_url && (
                  <img
                    src={deal.primary_image_url}
                    alt={deal.property_address}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                )}
                <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'Space Grotesk' }}>{deal.property_address}</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Type:</span> {deal.asset_type}</p>
                  <p><span className="font-medium">Price:</span> {formatPrice(deal.asking_price)}</p>
                  <p><span className="font-medium">Stage:</span> <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{deal.stage}</span></p>
                </div>
                <Button
                  onClick={() => navigate(`/deals/${deal.id}`)}
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  View Details
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
