import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { MapPin, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import { formatNumberWithCommas } from '../utils/numberInput';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const PublicShare = () => {
  const { dealId } = useParams();
  const [deal, setDeal] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchDeal();
    fetchDocuments();
  }, [dealId]);

  const fetchDeal = async () => {
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      
      const response = await fetch(`${API_URL}/api/share/${dealId}`);
      
      if (!response.ok) {
        throw new Error('Deal not found');
      }
      
      const data = await response.json();
      setDeal(data);
    } catch (error) {
      console.error('Failed to load deal', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      // Import supabase client
      const { supabase } = await import('../supabaseClient');
      
      // Fetch documents for this deal (public access)
      const { data: docs, error } = await supabase
        .from('documents')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });
      
      if (!error && docs) {
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const calculatePricePerSQFT = () => {
    if (!deal?.lot_size || !deal?.price) return 'N/A';
    const sqft = deal.lot_size * 43560;
    const pricePerSqft = deal.price / sqft;
    return formatPrice(pricePerSqft);
  };

  const calculatePricePerAC = () => {
    if (!deal?.lot_size || !deal?.price) return 'N/A';
    const pricePerAc = deal.price / deal.lot_size;
    return formatPrice(pricePerAc);
  };

  const calculatePricePerSQFTBuilding = () => {
    if (!deal?.size || !deal?.price) return 'N/A';
    const pricePerSqft = deal.price / deal.size;
    return formatPrice(pricePerSqft);
  };

  const hasValidCoordinates = deal?.latitude && deal?.longitude && 
    !isNaN(parseFloat(deal.latitude)) && !isNaN(parseFloat(deal.longitude));

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#FFFFFF', fontSize: '16px' }}>Loading property details...</div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Property Not Found</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>The property listing you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000000' }}>
      {/* Header with Logo */}
      <div style={{
        padding: '16px 40px',
        background: 'rgba(11, 12, 14, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <img 
            src="/dealview-logo.svg" 
            alt="Dealview"
            style={{ height: '40px', width: 'auto' }}
          />
        </div>
      </div>

      {/* Centered Title Section */}
      <div style={{ 
        padding: '56px 40px 40px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <h1 style={{ 
          color: '#FFFFFF', 
          fontSize: '52px', 
          fontWeight: '700', 
          marginBottom: '16px', 
          letterSpacing: '-0.03em',
          lineHeight: '1.1'
        }}>
          {deal.title || deal.address}
        </h1>
        <div style={{ 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          <MapPin size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
          {deal.address}
          {deal.city && `, ${deal.city}`}
          {deal.state && `, ${deal.state}`}
          {deal.zip_code && ` ${deal.zip_code}`}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
          
          {/* Left Column - Main Details */}
          <div>
            {/* Property Image */}
            {deal.image_url && (
              <div style={{ marginBottom: '32px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <img
                  src={deal.image_url}
                  alt="Property"
                  style={{ width: '100%', height: '400px', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Property Facts */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Property Facts
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                {deal.size && (
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Building Size (SF)</p>
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>
                      {parseFloat(deal.size).toLocaleString()} SF
                    </p>
                  </div>
                )}
                {deal.lot_size && (
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Lot Size (acres)</p>
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>
                      {parseFloat(deal.lot_size).toLocaleString()} AC
                    </p>
                  </div>
                )}
                {deal.year_built && (
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Year Built</p>
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.year_built}</p>
                  </div>
                )}
                {deal.zoning && (
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Zoning</p>
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.zoning}</p>
                  </div>
                )}
                {deal.occupancy && (
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Occupancy</p>
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.occupancy}%</p>
                  </div>
                )}
                {deal.parking_spaces && (
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Parking Spaces</p>
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.parking_spaces}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {deal.description && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Description
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                  {deal.description}
                </p>
              </div>
            )}

            {/* Key Features */}
            {deal.key_features && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Key Features
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.8' }}>
                  {deal.key_features}
                </p>
              </div>
            )}

            {/* Documents Section */}
            {documents.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Documents ({documents.length})
                </h3>
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  {/* Table Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 60px',
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                      Name
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                      Date Uploaded
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' }}>
                      Action
                    </div>
                  </div>

                  {/* Table Rows */}
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 120px 60px',
                        padding: '10px 12px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        alignItems: 'center',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 184, 212, 0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ color: '#FFFFFF', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <FileText size={14} style={{ display: 'inline', marginRight: '8px', color: '#00b8d4' }} />
                        {doc.name}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                        {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <a
                          href={doc.file_path}
                          download
                          style={{
                            padding: '4px 8px',
                            background: 'transparent',
                            border: 'none',
                            color: '#00b8d4',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            textDecoration: 'none'
                          }}
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location Map */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Location Map</h3>
              {hasValidCoordinates ? (
                <div style={{ height: '350px', borderRadius: '8px', overflow: 'hidden' }}>
                  <MapContainer
                    center={[parseFloat(deal.latitude), parseFloat(deal.longitude)]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                    dragging={true}
                    zoomControl={true}
                  >
                    {/* Satellite imagery */}
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution='&copy; Esri'
                      maxZoom={19}
                    />
                    {/* Street labels overlay */}
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                      attribution='&copy; Esri'
                      maxZoom={19}
                    />
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                      attribution='&copy; Esri'
                      maxZoom={19}
                    />
                    <Marker position={[parseFloat(deal.latitude), parseFloat(deal.longitude)]} />
                  </MapContainer>
                </div>
              ) : (
                <div style={{ 
                  height: '350px', 
                  borderRadius: '8px', 
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                    <MapPin className="w-12 h-12 mx-auto mb-2" style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: '14px' }}>No location data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Financial Summary */}
          <div>
            {/* Asking Price Card */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Financial Details
              </h3>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Asking Price</p>
                <p style={{ fontSize: '32px', color: '#00d4aa', fontWeight: '700' }}>
                  {formatPrice(deal.price)}
                </p>
              </div>
              
              {/* Price Calculations */}
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Price per SQFT (Lot)</p>
                  <p style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '500' }}>
                    {calculatePricePerSQFT()}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Price per AC</p>
                  <p style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '500' }}>
                    {calculatePricePerAC()}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Price per SQFT (Building)</p>
                  <p style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '500' }}>
                    {calculatePricePerSQFTBuilding()}
                  </p>
                </div>
                {deal.cap_rate && (
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Cap Rate</p>
                    <p style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '500' }}>
                      {deal.cap_rate}%
                    </p>
                  </div>
                )}
                {deal.noi && (
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>NOI</p>
                    <p style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '500' }}>
                      {formatPrice(deal.noi)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact CTA */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.15) 0%, rgba(0, 212, 170, 0.15) 100%)',
              border: '1px solid rgba(0, 184, 212, 0.3)',
              borderRadius: '12px',
              padding: '32px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                Interested in this property?
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.8' }}>
                Contact us for more information, additional details, or to schedule a viewing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicShare;
