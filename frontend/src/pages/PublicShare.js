import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Building2, DollarSign, FileText, Download, ChevronLeft, ChevronRight, Phone, Mail, User } from 'lucide-react';

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
};

const formatNumber = (value) => {
  if (!value && value !== 0) return 'N/A';
  return new Intl.NumberFormat('en-US').format(value);
};

const miniMapStyle = {
  version: 8,
  sources: {
    'osm': {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256, maxzoom: 18
    }
  },
  layers: [{ id: 'osm-layer', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 18 }]
};

const PublicShare = () => {
  const { dealId } = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        const API_URL = process.env.REACT_APP_BACKEND_URL || '';
        const response = await fetch(`${API_URL}/api/share/${dealId}`);
        if (!response.ok) throw new Error('Deal not found');
        const data = await response.json();
        setDeal(data.deal);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDeal();
  }, [dealId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontSize: '16px' }}>Loading property details...</div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Building2 size={48} style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 16px' }} />
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Property Not Found</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>This property listing doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const images = deal.image_urls || (deal.image_url ? [deal.image_url] : []);
  const contacts = (deal.contact_deal_links || []).map(link => link.contacts).filter(Boolean);
  const documents = deal.documents || [];
  const hasLocation = deal.latitude && deal.longitude;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b' }}>
      {/* Header */}
      <div style={{ padding: '14px 24px', background: 'rgba(10,10,11,0.97)', borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="https://customer-assets.emergentagent.com/job_unifydash/artifacts/zlxck81k_DealLinked%20Logo%20%28White%29.png" alt="DealLinked" style={{ height: '48px', objectFit: 'contain' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Shared Property</span>
        </div>
      </div>

      {/* Hero Title — Title first, then address, then asset type */}
      <div style={{ padding: '40px 24px 32px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h1 style={{ color: '#fff', fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          {deal.title || deal.address || 'Property Details'}
        </h1>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
          <MapPin size={14} />
          <span>{deal.address}{deal.city ? `, ${deal.city}` : ''}{deal.state ? `, ${deal.state}` : ''}{deal.zip_code ? ` ${deal.zip_code}` : ''}</span>
        </div>
        <div style={{ display: 'inline-block', padding: '4px 14px', background: 'rgba(0,184,212,0.1)', border: '1px solid rgba(0,184,212,0.2)', borderRadius: '20px' }}>
          <span style={{ color: '#00b8d4', fontSize: '12px', fontWeight: 600 }}>{deal.asset_type || 'Property'}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '24px' }}>
          {/* Left Column */}
          <div>
            {/* Image Carousel */}
            {images.length > 0 && (
              <div style={{ position: 'relative', marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <img src={images[imgIdx]} alt="Property" style={{ width: '100%', height: 'clamp(220px, 40vw, 380px)', objectFit: 'cover' }} />
                {images.length > 1 && (
                  <>
                    <button onClick={() => setImgIdx(i => i === 0 ? images.length - 1 : i - 1)}
                      style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setImgIdx(i => i === images.length - 1 ? 0 : i + 1)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChevronRight size={20} />
                    </button>
                    <div style={{ position: 'absolute', bottom: '12px', right: '12px', padding: '4px 10px', background: 'rgba(0,0,0,0.7)', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: 600 }}>
                      {imgIdx + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Property Facts */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '12px', fontWeight: 700, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Property Facts</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px' }}>
                {deal.size_sqft && <Stat label="Building Size" value={`${formatNumber(deal.size_sqft)} SF`} />}
                {deal.lot_size && <Stat label="Lot Size (Land)" value={`${formatNumber(deal.lot_size)} Acres`} />}
                {deal.year_built && <Stat label="Year Built" value={deal.year_built} />}
                {deal.zoning && <Stat label="Zoning" value={deal.zoning} />}
                {deal.occupancy && <Stat label="Occupancy" value={`${deal.occupancy}%`} />}
              </div>
            </div>

            {/* Notes */}
            {deal.notes && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '12px', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Notes</h3>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{deal.notes}</p>
              </div>
            )}

            {/* Documents */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '12px', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Documents ({documents.length})</h3>
              {documents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {documents.map(doc => (
                    <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', textDecoration: 'none', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,184,212,0.3)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                      <FileText size={16} style={{ color: '#00b8d4', flexShrink: 0 }} />
                      <span style={{ flex: 1, color: '#fff', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</span>
                      <Download size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <FileText size={28} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 8px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>No documents available</p>
                </div>
              )}
            </div>

            {/* Location Map */}
            {hasLocation && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '12px', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Location</h3>
                <div style={{ borderRadius: '8px', overflow: 'hidden', height: '280px' }}>
                  <Map initialViewState={{ longitude: deal.longitude, latitude: deal.latitude, zoom: 14 }}
                    style={{ width: '100%', height: '100%' }} mapStyle={miniMapStyle} attributionControl={false} interactive={false}>
                    <Marker longitude={deal.longitude} latitude={deal.latitude} anchor="center">
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#00b8d4', border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={10} color="white" />
                      </div>
                    </Marker>
                  </Map>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div>
            {/* Financial Details */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '12px', fontWeight: 700, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Financial Details</h3>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Asking Price</p>
                <p style={{ fontSize: '32px', color: '#10b981', fontWeight: 700 }}>{formatCurrency(deal.asking_price)}</p>
              </div>
              <div style={{ display: 'grid', gap: '16px' }}>
                {deal.noi && <Stat label="NOI" value={formatCurrency(deal.noi)} />}
                {deal.cap_rate && <Stat label="Cap Rate" value={`${deal.cap_rate}%`} />}
                {deal.annual_income && <Stat label="Annual Income" value={formatCurrency(deal.annual_income)} />}
                {deal.annual_expenses && <Stat label="Annual Expenses" value={formatCurrency(deal.annual_expenses)} />}
              </div>
            </div>

            {/* Contacts */}
            {contacts.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '12px', fontWeight: 700, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Contacts</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {contacts.map((c, i) => (
                    <div key={c.id || i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <User size={14} style={{ color: '#00b8d4' }} />
                        <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{c.name}</span>
                        {c.contact_type && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,184,212,0.12)', color: '#00b8d4' }}>{c.contact_type}</span>}
                      </div>
                      {c.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}><Mail size={12} style={{ color: 'rgba(255,255,255,0.3)' }} /><a href={`mailto:${c.email}`} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textDecoration: 'none' }}>{c.email}</a></div>}
                      {c.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} style={{ color: 'rgba(255,255,255,0.3)' }} /><a href={`tel:${c.phone}`} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textDecoration: 'none' }}>{c.phone}</a></div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div style={{ background: 'linear-gradient(135deg, rgba(0,184,212,0.12), rgba(16,185,129,0.12))', border: '1px solid rgba(0,184,212,0.25)', borderRadius: '12px', padding: '28px', textAlign: 'center' }}>
              <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 600, marginBottom: '10px' }}>Interested in this property?</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.6 }}>Contact the listing broker for more details or to schedule a viewing.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '40px', textAlign: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>Powered by DealLinked</span>
      </div>
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div>
    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</p>
    <p style={{ fontSize: '16px', color: '#fff', fontWeight: 500 }}>{value}</p>
  </div>
);

export default PublicShare;
