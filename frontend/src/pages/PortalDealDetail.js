import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ArrowLeft, Heart, MapPin, Building2, DollarSign,
  ChevronLeft, ChevronRight, FileText, Download, Phone, Mail, User,
  Ruler, Calendar, Layers, TrendingUp, Percent, BarChart3, StickyNote
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const fmt$ = (v) => {
  if (!v) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v);
};
const fmtN = (v) => (!v && v !== 0) ? 'N/A' : new Intl.NumberFormat('en-US').format(v);

const typeColors = {
  'Office': '#3b82f6', 'Retail': '#10b981', 'Industrial': '#f59e0b',
  'Multifamily': '#8b5cf6', 'Land': '#ec4899', 'Mixed Use': '#06b6d4',
  'Hotels': '#a855f7', 'Medical': '#14b8a6', 'Gas Stations': '#e879f9', 'Other': '#6b7280'
};

const mapStyle = {
  version: 8,
  sources: { osm: { type: 'raster', tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 18 } },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 18 }]
};

/* ── Responsive CSS injected once ── */
const PORTAL_CSS = `
  .pdp-root { height: 100%; overflow-y: auto; background: #09090b; -webkit-overflow-scrolling: touch; }
  .pdp-wrap { max-width: 960px; margin: 0 auto; padding: 0 16px; }
  .pdp-nav { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(9,9,11,0.97); }
  .pdp-nav-back { background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px; padding: 6px 0; }
  .pdp-nav-save { background: transparent; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 14px; cursor: pointer; color: rgba(255,255,255,0.7); font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
  .pdp-nav-save.saved { background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.3); color: #ef4444; }

  /* Title Block */
  .pdp-title-block { padding: 20px 0 0; }
  .pdp-title { color: #fff; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; margin: 0 0 6px; }
  .pdp-address { color: rgba(255,255,255,0.45); font-size: 13px; display: flex; align-items: center; gap: 5px; margin-bottom: 10px; flex-wrap: wrap; }
  .pdp-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .pdp-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; }
  .pdp-price-inline { font-size: 22px; color: #10b981; font-weight: 700; letter-spacing: -0.02em; }

  /* Photo Carousel */
  .pdp-photo { position: relative; border-radius: 12px; overflow: hidden; margin-top: 16px; border: 1px solid rgba(255,255,255,0.08); }
  .pdp-photo img { width: 100%; height: 260px; object-fit: cover; display: block; }
  .pdp-photo-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.55); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
  .pdp-photo-btn:active { background: rgba(0,0,0,0.8); }
  .pdp-photo-dots { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 5px; }
  .pdp-photo-dot { width: 7px; height: 7px; border-radius: 50%; border: none; cursor: pointer; transition: all 0.2s; }
  .pdp-photo-dot.active { width: 20px; border-radius: 4px; background: #fff; }
  .pdp-photo-dot:not(.active) { background: rgba(255,255,255,0.4); }
  .pdp-photo-counter { position: absolute; top: 10px; right: 10px; padding: 4px 10px; background: rgba(0,0,0,0.6); border-radius: 6px; color: #fff; font-size: 11px; font-weight: 600; }
  .pdp-photo-empty { height: 200px; background: #111; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; margin-top: 16px; }

  /* Sections — all use same card style */
  .pdp-section { margin-top: 20px; }
  .pdp-section-title { color: #fff; font-size: 16px; font-weight: 700; margin: 0 0 14px; letter-spacing: -0.01em; }
  .pdp-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; overflow: hidden; }

  /* Agent Card */
  .pdp-agent { padding: 20px; display: flex; align-items: center; gap: 16px; }
  .pdp-agent-avatar { width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 2px solid rgba(255,255,255,0.08); background-size: cover; background-position: center; }
  .pdp-agent-info { flex: 1; min-width: 0; }
  .pdp-agent-name { color: #fff; font-size: 15px; font-weight: 700; margin: 0 0 2px; }
  .pdp-agent-company { color: rgba(255,255,255,0.4); font-size: 12px; margin: 0; }
  .pdp-agent-actions { display: flex; gap: 8px; padding: 0 20px 20px; }
  .pdp-agent-link { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; text-align: center; cursor: pointer; border: none; }
  .pdp-agent-link.phone { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
  .pdp-agent-link.email { background: #ff0000; color: #fff; }
  .pdp-agent-link.phone:active { background: rgba(255,255,255,0.1); }
  .pdp-agent-link.email:active { background: #cc0000; }

  /* Overview Grid */
  .pdp-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: rgba(255,255,255,0.04); }
  .pdp-grid-cell { background: #0d0d0f; padding: 16px; }
  .pdp-grid-label { font-size: 10px; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600; display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  .pdp-grid-value { font-size: 16px; color: #fff; font-weight: 700; letter-spacing: -0.01em; }
  .pdp-grid-value.highlight { color: #10b981; font-size: 18px; }

  /* Notes */
  .pdp-notes-body { padding: 20px; color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
  .pdp-notes-empty { padding: 32px 20px; text-align: center; color: rgba(255,255,255,0.25); font-size: 13px; }

  /* Documents */
  .pdp-doc { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .pdp-doc:last-child { border-bottom: none; }
  .pdp-doc:active { background: rgba(255,255,255,0.04); }
  .pdp-doc-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,0,0,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pdp-doc-name { flex: 1; color: #fff; font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pdp-docs-empty { padding: 32px 20px; text-align: center; color: rgba(255,255,255,0.25); font-size: 13px; }

  /* Location */
  .pdp-map { height: 280px; }

  /* Footer */
  .pdp-footer { padding: 20px 16px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 32px; }
  .pdp-footer span { color: rgba(255,255,255,0.18); font-size: 11px; }

  /* ── Tablet+ (≥640px) ── */
  @media (min-width: 640px) {
    .pdp-wrap { padding: 0 24px; }
    .pdp-nav { padding: 12px 24px; }
    .pdp-title { font-size: 28px; }
    .pdp-price-inline { font-size: 28px; }
    .pdp-photo img { height: 380px; }
    .pdp-photo-btn { width: 44px; height: 44px; }
    .pdp-grid { grid-template-columns: repeat(3, 1fr); }
    .pdp-grid-cell { padding: 20px; }
    .pdp-grid-value { font-size: 17px; }
    .pdp-grid-value.highlight { font-size: 20px; }
    .pdp-agent { padding: 24px; gap: 20px; }
    .pdp-agent-avatar { width: 64px; height: 64px; }
    .pdp-agent-name { font-size: 16px; }
    .pdp-agent-actions { padding: 0 24px 24px; }
    .pdp-map { height: 340px; }
    .pdp-section { margin-top: 24px; }
    .pdp-footer { margin-top: 48px; }
  }

  /* ── Desktop (≥1024px) ── */
  @media (min-width: 1024px) {
    .pdp-wrap { max-width: 1100px; }
    .pdp-title { font-size: 32px; }
    .pdp-photo img { height: 440px; }
    .pdp-grid { grid-template-columns: repeat(4, 1fr); }
    .pdp-map { height: 380px; }
  }

  @keyframes pdp-spin { to { transform: rotate(360deg); } }
`;

const PortalDealDetail = () => {
  const { portalId, dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);

  const sessionToken = localStorage.getItem(`portal_session_${portalId}`);

  useEffect(() => {
    if (!sessionToken) { navigate(`/portal/${portalId}`); return; }
    fetchDeal();
  }, [dealId]);

  const fetchDeal = async () => {
    try {
      const res = await fetch(`${API}/api/portal/${portalId}/deals/${dealId}`, {
        headers: { 'X-Portal-Session': sessionToken }
      });
      if (res.status === 401) { navigate(`/portal/${portalId}`); return; }
      if (res.ok) setDeal((await res.json()).deal);
    } catch (err) { console.error('Failed to fetch deal:', err); }
    finally { setLoading(false); }
  };

  const toggleSave = async () => {
    if (!deal) return;
    try {
      const method = deal.is_saved ? 'DELETE' : 'POST';
      await fetch(`${API}/api/portal/${portalId}/saved/${dealId}`, { method, headers: { 'X-Portal-Session': sessionToken } });
      setDeal(prev => ({ ...prev, is_saved: !prev.is_saved }));
    } catch (err) { console.error('Failed to toggle save:', err); }
  };

  const handleDownload = (docId) => {
    const url = `${API}/api/portal/${portalId}/deals/${dealId}/documents/${docId}/download?token=${encodeURIComponent(sessionToken)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#09090b', color: 'rgba(255,255,255,0.5)', flexDirection: 'column', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#ff0000', borderRadius: '50%', animation: 'pdp-spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '14px' }}>Loading property...</span>
        <style>{PORTAL_CSS}</style>
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#09090b', color: 'rgba(255,255,255,0.4)' }}>
        Property not found
      </div>
    );
  }

  const images = deal.image_urls || (deal.image_url ? [deal.image_url] : []);
  const documents = deal.documents || [];
  const agent = deal.agent || {};
  const hasLocation = deal.latitude && deal.longitude;
  const color = typeColors[deal.asset_type] || typeColors['Other'];

  // Unified property facts
  const facts = [];
  if (deal.asking_price) facts.push({ label: 'Asking Price', value: fmt$(deal.asking_price), icon: DollarSign, hl: true });
  if (deal.size_sqft) facts.push({ label: 'Building Size', value: `${fmtN(deal.size_sqft)} SF`, icon: Ruler });
  if (deal.lot_size) facts.push({ label: 'Lot Size', value: `${fmtN(deal.lot_size)} Acres`, icon: Layers });
  if (deal.lot_size) facts.push({ label: 'Land SQFT', value: `${fmtN(Math.round(deal.lot_size * 43560))} SF`, icon: Layers });
  if (deal.year_built) facts.push({ label: 'Year Built', value: deal.year_built, icon: Calendar });
  if (deal.zoning) facts.push({ label: 'Zoning', value: deal.zoning, icon: Building2 });
  if (deal.cap_rate != null) facts.push({ label: 'Cap Rate', value: `${deal.cap_rate}%`, icon: Percent });
  if (deal.noi) facts.push({ label: 'NOI', value: fmt$(deal.noi), icon: TrendingUp });
  if (deal.occupancy != null) facts.push({ label: 'Occupancy', value: `${deal.occupancy}%`, icon: BarChart3 });
  if (deal.annual_income) facts.push({ label: 'Annual Income', value: fmt$(deal.annual_income), icon: DollarSign });
  if (deal.annual_expenses) facts.push({ label: 'Annual Expenses', value: fmt$(deal.annual_expenses), icon: DollarSign });
  if (deal.asking_price && deal.size_sqft) facts.push({ label: 'Price / SF', value: fmt$(Math.round(deal.asking_price / deal.size_sqft)), icon: DollarSign });

  const fullAddress = [deal.address, deal.city, deal.state].filter(Boolean).join(', ') + (deal.zip_code ? ` ${deal.zip_code}` : '');

  return (
    <>
      <style>{PORTAL_CSS}</style>
      <div className="pdp-root">
        {/* ── Navigation ── */}
        <div className="pdp-nav">
          <button className="pdp-nav-back" data-testid="back-to-map" onClick={() => navigate(`/portal/${portalId}/map`)}>
            <ArrowLeft size={18} /> Back
          </button>
          <button
            className={`pdp-nav-save${deal.is_saved ? ' saved' : ''}`}
            data-testid="detail-save-btn"
            onClick={toggleSave}
          >
            <Heart size={15} fill={deal.is_saved ? '#ef4444' : 'none'} />
            {deal.is_saved ? 'Saved' : 'Save'}
          </button>
        </div>

        <div className="pdp-wrap">
          {/* ── Title + Address + Price — FIRST THING ── */}
          <div className="pdp-title-block" data-testid="title-block">
            <h1 className="pdp-title" data-testid="property-title">
              {deal.title || deal.address || 'Property Details'}
            </h1>
            <div className="pdp-address">
              <MapPin size={13} />
              <span>{fullAddress}</span>
            </div>
            <div className="pdp-meta">
              <span
                className="pdp-badge"
                style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {deal.asset_type || 'Property'}
              </span>
              {deal.asking_price && (
                <span className="pdp-price-inline" data-testid="asking-price">{fmt$(deal.asking_price)}</span>
              )}
            </div>
          </div>

          {/* ── Photo Carousel ── */}
          {images.length > 0 ? (
            <div className="pdp-photo" data-testid="photo-carousel">
              <img src={images[imgIdx]} alt={deal.title} data-testid="hero-property-image" />
              {images.length > 1 && (
                <>
                  <button className="pdp-photo-btn" style={{ left: 10 }} data-testid="hero-prev-img"
                    onClick={() => setImgIdx(i => i === 0 ? images.length - 1 : i - 1)}>
                    <ChevronLeft size={20} />
                  </button>
                  <button className="pdp-photo-btn" style={{ right: 10 }} data-testid="hero-next-img"
                    onClick={() => setImgIdx(i => i === images.length - 1 ? 0 : i + 1)}>
                    <ChevronRight size={20} />
                  </button>
                  <div className="pdp-photo-dots">
                    {images.map((_, i) => (
                      <button key={`dot-${i}`} className={`pdp-photo-dot${i === imgIdx ? ' active' : ''}`} onClick={() => setImgIdx(i)} />
                    ))}
                  </div>
                  <div className="pdp-photo-counter">{imgIdx + 1} / {images.length}</div>
                </>
              )}
            </div>
          ) : (
            <div className="pdp-photo-empty">
              <Building2 size={48} style={{ color: 'rgba(255,255,255,0.08)' }} />
            </div>
          )}

          {/* ── Contact / Agent — SEPARATE card ── */}
          {agent.full_name && (
            <div className="pdp-section" data-testid="agent-section">
              <h3 className="pdp-section-title">Listing Agent</h3>
              <div className="pdp-card">
                <div className="pdp-agent">
                  <div
                    className="pdp-agent-avatar"
                    style={{
                      background: agent.avatar_url
                        ? `url(${agent.avatar_url}) center/cover`
                        : 'linear-gradient(135deg, rgba(255,0,0,0.15), rgba(139,92,246,0.15))',
                    }}
                  >
                    {!agent.avatar_url && <User size={24} style={{ color: 'rgba(255,255,255,0.35)' }} />}
                  </div>
                  <div className="pdp-agent-info">
                    <p className="pdp-agent-name">{agent.full_name}</p>
                    {agent.company && <p className="pdp-agent-company">{agent.company}</p>}
                  </div>
                </div>
                <div className="pdp-agent-actions">
                  {agent.phone && (
                    <a href={`tel:${agent.phone}`} className="pdp-agent-link phone" data-testid="agent-phone">
                      <Phone size={15} /> Call
                    </a>
                  )}
                  <a
                    href={agent.email ? `mailto:${agent.email}?subject=Inquiry: ${deal.title}` : '#'}
                    className="pdp-agent-link email"
                    data-testid="contact-agent-btn"
                  >
                    <Mail size={15} /> Email Agent
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ── Property Overview ── */}
          {facts.length > 0 && (
            <div className="pdp-section" id="section-overview" data-testid="section-overview">
              <h3 className="pdp-section-title">Property Overview</h3>
              <div className="pdp-card">
                <div className="pdp-grid">
                  {facts.map((f, i) => {
                    const Icon = f.icon;
                    return (
                      <div key={f.label} className="pdp-grid-cell">
                        <div className="pdp-grid-label">
                          <Icon size={12} style={{ color: 'rgba(255,255,255,0.25)' }} />
                          {f.label}
                        </div>
                        <div className={`pdp-grid-value${f.hl ? ' highlight' : ''}`}>{f.value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Notes — ALWAYS shown ── */}
          <div className="pdp-section" id="section-notes" data-testid="section-notes">
            <h3 className="pdp-section-title">Notes</h3>
            <div className="pdp-card">
              {deal.notes ? (
                <div className="pdp-notes-body">{deal.notes}</div>
              ) : (
                <div className="pdp-notes-empty">
                  <StickyNote size={24} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 8px', display: 'block' }} />
                  No notes for this property
                </div>
              )}
            </div>
          </div>

          {/* ── Documents — ALWAYS shown ── */}
          <div className="pdp-section" id="section-documents" data-testid="section-documents">
            <h3 className="pdp-section-title">Documents ({documents.length})</h3>
            <div className="pdp-card">
              {documents.length > 0 ? (
                documents.map(doc => (
                  <div key={doc.id} className="pdp-doc" data-testid={`document-${doc.id}`} onClick={() => handleDownload(doc.id)}>
                    <div className="pdp-doc-icon"><FileText size={16} style={{ color: '#ff0000' }} /></div>
                    <span className="pdp-doc-name">{doc.file_name}</span>
                    <Download size={14} style={{ color: 'rgba(255,255,255,0.25)' }} />
                  </div>
                ))
              ) : (
                <div className="pdp-docs-empty">
                  <FileText size={24} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 8px', display: 'block' }} />
                  No documents available
                </div>
              )}
            </div>
          </div>

          {/* ── Location ── */}
          {hasLocation && (
            <div className="pdp-section" id="section-location" data-testid="section-location">
              <h3 className="pdp-section-title">Location</h3>
              <div className="pdp-card">
                <div className="pdp-map">
                  <Map
                    initialViewState={{ longitude: deal.longitude, latitude: deal.latitude, zoom: 14 }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle={mapStyle}
                    attributionControl={false}
                  >
                    <NavigationControl position="bottom-right" />
                    <Marker longitude={deal.longitude} latitude={deal.latitude} anchor="bottom">
                      <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
                        <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill={color} stroke="white" strokeWidth="2.5"/>
                        <circle cx="14" cy="13" r="5" fill="white" opacity="0.9"/>
                      </svg>
                    </Marker>
                  </Map>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="pdp-footer">
          <span>Powered by DealLinked</span>
        </div>
      </div>
    </>
  );
};

export default PortalDealDetail;
