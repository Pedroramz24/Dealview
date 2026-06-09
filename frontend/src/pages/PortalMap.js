import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Building2, Heart, X, MapPin, DollarSign, ChevronRight,
  Bookmark, Filter, FileText
} from 'lucide-react';
import { colors, borderRadius } from '../styles/designSystem';

const API = process.env.REACT_APP_BACKEND_URL;

const assetTypeColors = {
  'Office': '#3b82f6', 'Retail': '#10b981', 'Industrial': '#f59e0b',
  'Multifamily': '#8b5cf6', 'Land': '#ec4899', 'Mixed Use': '#06b6d4',
  'Hotels': '#a855f7', 'Medical': '#14b8a6', 'Gas Stations': '#e879f9', 'Other': '#6b7280'
};

const mapStyle = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256, maxzoom: 19
    },
    'ofm-vector': { type: 'vector', url: 'https://tiles.openfreemap.org/planet' }
  },
  layers: [
    { id: 'satellite', type: 'raster', source: 'esri-satellite', paint: { 'raster-fade-duration': 0 } },
    {
      id: 'road-labels', type: 'symbol', source: 'ofm-vector', 'source-layer': 'transportation_name',
      minzoom: 13,
      layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 18, 15], 'symbol-placement': 'line', 'text-padding': 2 },
      paint: { 'text-color': '#fff', 'text-halo-color': 'rgba(0,0,0,0.75)', 'text-halo-width': 1.5 }
    },
    {
      id: 'city-labels', type: 'symbol', source: 'ofm-vector', 'source-layer': 'place',
      minzoom: 3, maxzoom: 14,
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
      layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 12, 18], 'text-transform': 'uppercase', 'text-letter-spacing': 0.08 },
      paint: { 'text-color': '#fff', 'text-halo-color': 'rgba(0,0,0,0.7)', 'text-halo-width': 2 }
    }
  ]
};

const formatCurrency = (v) => {
  if (!v) return '';
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
};

const PortalMap = () => {
  const { portalId } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const [deals, setDeals] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const initialViewState = useRef({ longitude: -98.5, latitude: 29.4, zoom: 10 });

  const sessionToken = localStorage.getItem(`portal_session_${portalId}`);
  const portalName = localStorage.getItem(`portal_name_${portalId}`);
  const memberName = localStorage.getItem(`portal_member_${portalId}`);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(`portal_session_${portalId}`);
    localStorage.removeItem(`portal_name_${portalId}`);
    localStorage.removeItem(`portal_member_${portalId}`);
    navigate(`/portal/${portalId}`);
  }, [portalId, navigate]);

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/portal/${portalId}/deals`, {
        headers: { 'X-Portal-Session': sessionToken }
      });
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
        setAssetTypes(data.asset_types || []);
        const withCoords = (data.deals || []).filter(d => d.latitude && d.longitude);
        if (withCoords.length > 0 && mapRef.current) {
          const lats = withCoords.map(d => d.latitude);
          const lngs = withCoords.map(d => d.longitude);
          mapRef.current.flyTo({
            center: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2],
            zoom: withCoords.length === 1 ? 14 : 10,
            duration: 1000
          });
        }
      }
    } catch (err) { console.error('Failed to fetch portal deals:', err); }
    finally { setLoading(false); }
  }, [portalId, sessionToken, handleLogout]);

  useEffect(() => {
    if (!sessionToken) { navigate(`/portal/${portalId}`); return; }
    fetchDeals();
  }, [portalId, sessionToken, navigate, fetchDeals]);

  const toggleSave = async (dealId, isSaved) => {
    try {
      if (isSaved) {
        await fetch(`${API}/api/portal/${portalId}/saved/${dealId}`, {
          method: 'DELETE', headers: { 'X-Portal-Session': sessionToken }
        });
      } else {
        await fetch(`${API}/api/portal/${portalId}/saved/${dealId}`, {
          method: 'POST', headers: { 'X-Portal-Session': sessionToken }
        });
      }
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, is_saved: !isSaved } : d));
      if (selectedDeal?.id === dealId) setSelectedDeal(prev => ({ ...prev, is_saved: !isSaved }));
    } catch (err) { console.error('Failed to toggle save:', err); }
  };

  const filteredDeals = useMemo(() => {
    let result = deals;
    if (activeFilter) result = result.filter(d => d.asset_type === activeFilter);
    if (showSavedOnly) result = result.filter(d => d.is_saved);
    return result;
  }, [deals, activeFilter, showSavedOnly]);

  const dealsWithCoords = useMemo(() => filteredDeals.filter(d => d.latitude && d.longitude), [filteredDeals]);

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      {/* Map */}
      <div style={{ flex: 1 }}>
        <Map
          ref={mapRef}
          initialViewState={initialViewState.current}
          mapStyle={mapStyle}
          style={{ width: '100%', height: '100%' }}
          maxTileCacheSize={200}
          renderWorldCopies={false}
          fadeDuration={0}
          attributionControl={false}
        >
          <NavigationControl position="bottom-right" />
          {dealsWithCoords.map(deal => {
            const color = assetTypeColors[deal.asset_type] || assetTypeColors['Other'];
            return (
              <Marker key={deal.id} latitude={deal.latitude} longitude={deal.longitude} anchor="bottom">
                <div
                  data-testid={`map-pin-${deal.id}`}
                  onClick={() => setSelectedDeal(deal)}
                  style={{ cursor: 'pointer' }}
                >
                  <svg width="28" height="36" viewBox="0 0 28 36" fill="none">
                    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill={color} stroke="white" strokeWidth="2.5"/>
                    <circle cx="14" cy="13" r="5" fill="white" opacity="0.9"/>
                  </svg>
                </div>
              </Marker>
            );
          })}
        </Map>

        {/* Top bar: filters */}
        <div style={{
          position: 'absolute', top: '12px', left: '12px', right: selectedDeal ? '380px' : '12px',
          display: 'flex', gap: '8px', flexWrap: 'wrap', zIndex: 10
        }}>
          {/* Saved toggle */}
          <button
            data-testid="saved-toggle"
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            style={{
              padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
              background: showSavedOnly ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.7)',
              color: '#fff', backdropFilter: 'blur(8px)'
            }}
          >
            <Bookmark size={13} fill={showSavedOnly ? '#fff' : 'none'} /> Saved
          </button>

          {/* Asset type filters */}
          {assetTypes.map(type => (
            <button
              key={type}
              data-testid={`filter-${type}`}
              onClick={() => setActiveFilter(activeFilter === type ? null : type)}
              style={{
                padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                border: activeFilter === type ? `1px solid ${assetTypeColors[type] || '#6b7280'}` : '1px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                background: activeFilter === type ? `${assetTypeColors[type] || '#6b7280'}30` : 'rgba(0,0,0,0.7)',
                color: activeFilter === type ? (assetTypeColors[type] || '#fff') : '#fff',
                backdropFilter: 'blur(8px)'
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: assetTypeColors[type] || '#6b7280' }} />
              {type}
            </button>
          ))}
        </div>

        {/* Welcome badge */}
        {memberName && !selectedDeal && (
          <div style={{
            position: 'absolute', bottom: '16px', left: '16px',
            padding: '8px 16px', borderRadius: '8px',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            color: colors.textTertiary, fontSize: '12px', zIndex: 10
          }}>
            Welcome, <span style={{ color: '#fff', fontWeight: 600 }}>{memberName}</span> &middot; {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Side panel */}
      {selectedDeal && (
        <div style={{
          width: '360px', height: '100%', background: 'rgba(8,8,8,0.95)',
          borderLeft: `1px solid ${colors.border}`, overflowY: 'auto',
          backdropFilter: 'blur(12px)', flexShrink: 0, zIndex: 20
        }}>
          {/* Close + save */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${colors.border}` }}>
            <button
              data-testid="close-panel"
              onClick={() => setSelectedDeal(null)}
              style={{ background: 'transparent', border: 'none', color: colors.textTertiary, cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
            <button
              data-testid={`save-btn-${selectedDeal.id}`}
              onClick={() => toggleSave(selectedDeal.id, selectedDeal.is_saved)}
              style={{
                background: selectedDeal.is_saved ? 'rgba(239,68,68,0.15)' : 'rgba(212,18,18,0.1)',
                border: `1px solid ${selectedDeal.is_saved ? 'rgba(239,68,68,0.3)' : 'rgba(212,18,18,0.25)'}`,
                borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
                color: selectedDeal.is_saved ? '#ef4444' : colors.primary,
                fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px'
              }}
            >
              <Heart size={13} fill={selectedDeal.is_saved ? '#ef4444' : 'none'} />
              {selectedDeal.is_saved ? 'Saved' : 'Save'}
            </button>
          </div>

          {/* Image */}
          {selectedDeal.image_urls?.length > 0 && (
            <div style={{ height: '180px', overflow: 'hidden' }}>
              <img src={selectedDeal.image_urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          {/* Deal info */}
          <div style={{ padding: '16px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '3px 10px', borderRadius: '4px', marginBottom: '10px',
              background: `${assetTypeColors[selectedDeal.asset_type] || '#6b7280'}20`,
              border: `1px solid ${assetTypeColors[selectedDeal.asset_type] || '#6b7280'}40`
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: assetTypeColors[selectedDeal.asset_type] || '#6b7280' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: assetTypeColors[selectedDeal.asset_type] || '#6b7280' }}>
                {selectedDeal.asset_type || 'Other'}
              </span>
            </div>

            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
              {selectedDeal.title}
            </h2>

            {selectedDeal.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: colors.textTertiary, fontSize: '13px', marginBottom: '12px' }}>
                <MapPin size={12} />
                {selectedDeal.address}{selectedDeal.city ? `, ${selectedDeal.city}` : ''}{selectedDeal.state ? `, ${selectedDeal.state}` : ''} {selectedDeal.zip_code || ''}
              </div>
            )}

            {selectedDeal.asking_price && (
              <div style={{ color: colors.primary, fontSize: '22px', fontWeight: 700, marginBottom: '16px' }}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(selectedDeal.asking_price)}
              </div>
            )}

            {/* Property details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {selectedDeal.size_sqft && <DetailItem label="Size" value={`${new Intl.NumberFormat().format(selectedDeal.size_sqft)} SF`} />}
              {selectedDeal.lot_size && <DetailItem label="Lot" value={`${new Intl.NumberFormat().format(selectedDeal.lot_size)} SF`} />}
              {selectedDeal.year_built && <DetailItem label="Built" value={selectedDeal.year_built} />}
              {selectedDeal.cap_rate && <DetailItem label="Cap Rate" value={`${selectedDeal.cap_rate}%`} />}
              {selectedDeal.noi && <DetailItem label="NOI" value={formatCurrency(selectedDeal.noi)} />}
              {selectedDeal.occupancy && <DetailItem label="Occupancy" value={`${selectedDeal.occupancy}%`} />}
              {selectedDeal.zoning && <DetailItem label="Zoning" value={selectedDeal.zoning} />}
            </div>

            {/* View full details */}
            <button
              data-testid={`view-detail-${selectedDeal.id}`}
              onClick={() => navigate(`/portal/${portalId}/deal/${selectedDeal.id}`)}
              style={{
                width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
                background: 'rgba(212,18,18,0.12)', color: colors.primary,
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              View Full Details <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: `1px solid ${colors.border}` }}>
    <div style={{ color: colors.textMuted, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
    <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{value}</div>
  </div>
);

export default PortalMap;
