import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { DollarSign, Home, MapPin, FileText, Download } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const PublicShare = () => {
  const { dealId } = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeal();
  }, [dealId]);

  const fetchDeal = async () => {
    try {
      const response = await axios.get(`${API}/share/${dealId}`);
      setDeal(response.data);
    } catch (error) {
      console.error('Failed to load deal', error);
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Deal not found</h1>
          <p className="text-gray-600">The property you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="public-share-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-8">
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>Pedro Armando CRM</h1>
          <p className="text-gray-600 mt-1">Property Listing</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {deal.primary_image_url ? (
                <img
                  src={deal.primary_image_url}
                  alt={deal.property_address}
                  className="w-full h-96 object-cover"
                />
              ) : (
                <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                  <Home className="w-24 h-24 text-gray-400" />
                </div>
              )}
            </div>

            {/* Property Info */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                {deal.property_address}
              </h2>
              <p className="text-xl text-gray-600 mb-6">{deal.asset_type}</p>

              <div className="prose max-w-none">
                <h3 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Space Grotesk' }}>Description</h3>
                <p className="text-gray-700 leading-relaxed">{deal.description || 'No description available.'}</p>
              </div>
            </div>

            {/* Property Facts */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Space Grotesk' }}>Property Facts</h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Building Size</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {deal.building_size ? `${deal.building_size.toLocaleString()} sq ft` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Lot Size</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {deal.lot_size ? `${deal.lot_size.toLocaleString()} sq ft` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Lot Acres</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {deal.lot_acres ? `${deal.lot_acres.toLocaleString()} acres` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Occupancy</p>
                  <p className="text-lg font-semibold text-gray-900">{deal.occupancy || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Documents */}
            {deal.documents && deal.documents.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Space Grotesk' }}>Documents</h3>
                <div className="space-y-3">
                  {deal.documents.map((doc, index) => (
                    <a
                      key={index}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-blue-600 mr-3" />
                        <span className="text-gray-900 font-medium">{doc.name}</span>
                      </div>
                      <Download className="w-5 h-5 text-gray-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center mb-2">
                <DollarSign className="w-6 h-6 text-blue-600 mr-2" />
                <p className="text-sm text-gray-600">Asking Price</p>
              </div>
              <p className="text-4xl font-bold text-gray-900">{formatPrice(deal.asking_price)}</p>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Location</h3>
              <div className="h-64 rounded-lg overflow-hidden mb-4">
                <MapContainer
                  center={[deal.latitude, deal.longitude]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
                    subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                  />
                  <Marker position={[deal.latitude, deal.longitude]} />
                </MapContainer>
              </div>
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-gray-600 mr-2 mt-0.5" />
                <p className="text-gray-700">{deal.property_address}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicShare;
