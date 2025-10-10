import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { ArrowLeft, Upload, FileText, Share2, DollarSign, Home, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

const DealDetails = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDeal();
  }, [dealId]);

  const fetchDeal = async () => {
    try {
      const response = await axios.get(`${API}/deals/${dealId}`);
      setDeal(response.data);
    } catch (error) {
      toast.error('Failed to load deal');
      navigate('/deals');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/deals/${dealId}/upload-image`, formData);
      toast.success('Image uploaded successfully');
      fetchDeal();
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API}/deals/${dealId}/upload-document`, formData);
      toast.success('Document uploaded successfully');
      fetchDeal();
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/share/${dealId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const calculatePricePerSF = () => {
    if (!deal?.building_size || !deal?.asking_price) return 'N/A';
    return formatPrice(deal.asking_price / deal.building_size);
  };

  const calculatePricePerAcre = () => {
    if (!deal?.lot_acres || !deal?.asking_price) return 'N/A';
    return formatPrice(deal.asking_price / deal.lot_acres);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!deal) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto" data-testid="deal-details-page">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={() => navigate('/deals')} variant="outline" data-testid="back-to-deals">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deals
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk' }}>
              {deal.property_address}
            </h1>
            <p className="text-gray-600 mt-1">{deal.asset_type} • {deal.stage}</p>
          </div>
        </div>
        <Button onClick={handleShare} className="bg-blue-600 hover:bg-blue-700" data-testid="share-deal-button">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Primary Image */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {deal.primary_image_url ? (
              <img src={deal.primary_image_url} alt={deal.property_address} className="w-full h-96 object-cover" />
            ) : (
              <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No image uploaded</p>
                </div>
              </div>
            )}
            <div className="p-6">
              <Label htmlFor="image-upload" className="cursor-pointer">
                <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
                  <Upload className="w-5 h-5 mr-2 text-gray-600" />
                  <span className="text-gray-600">Upload Property Image</span>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                    data-testid="upload-image-input"
                  />
                </div>
              </Label>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Description</h2>
            <p className="text-gray-700 leading-relaxed">{deal.description || 'No description available.'}</p>
          </div>

          {/* Property Facts */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Property Facts</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Building Size</p>
                <p className="text-lg font-semibold text-gray-900">{deal.building_size ? `${deal.building_size.toLocaleString()} sq ft` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Lot Size</p>
                <p className="text-lg font-semibold text-gray-900">{deal.lot_size ? `${deal.lot_size.toLocaleString()} sq ft` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Lot Acres</p>
                <p className="text-lg font-semibold text-gray-900">{deal.lot_acres ? `${deal.lot_acres.toLocaleString()} acres` : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Occupancy</p>
                <p className="text-lg font-semibold text-gray-900">{deal.occupancy || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Documents</h2>
            {deal.documents && deal.documents.length > 0 ? (
              <div className="space-y-2">
                {deal.documents.map((doc, index) => (
                  <a
                    key={index}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="w-5 h-5 text-blue-600 mr-3" />
                    <span className="text-gray-900">{doc.name}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 mb-4">No documents uploaded yet.</p>
            )}
            <Label htmlFor="doc-upload" className="cursor-pointer mt-4 block">
              <div className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
                <Upload className="w-5 h-5 mr-2 text-gray-600" />
                <span className="text-gray-600">Upload Document (OM, Survey, etc.)</span>
                <input
                  id="doc-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  disabled={uploading}
                  data-testid="upload-document-input"
                />
              </div>
            </Label>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financials */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Financials</h2>
            <div className="space-y-4">
              <div className="pb-4 border-b border-gray-200">
                <div className="flex items-center mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600 mr-2" />
                  <p className="text-sm text-gray-600">Asking Price</p>
                </div>
                <p className="text-3xl font-bold text-gray-900" data-testid="deal-asking-price">{formatPrice(deal.asking_price)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Price per SF (Building)</p>
                <p className="text-xl font-semibold text-gray-900">{calculatePricePerSF()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Price per Acre</p>
                <p className="text-xl font-semibold text-gray-900">{calculatePricePerAcre()}</p>
              </div>
            </div>
          </div>

          {/* Location Map */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Location</h2>
            <div className="h-64 rounded-lg overflow-hidden mb-3">
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

          {/* Notes */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Notes</h2>
            <p className="text-gray-700 leading-relaxed">{deal.notes || 'No notes added yet.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealDetails;
