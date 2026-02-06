import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  ArrowLeft, MapPin, Building2, DollarSign, 
  Trash2, Users, FileText, Upload, Download, Eye,
  Phone, Mail, Plus, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { colors, shadows, gradients, borderRadius, spacing } from '../styles/designSystem';

const assetTypes = ['Office', 'Retail', 'Industrial', 'Multifamily', 'Land', 'Mixed Use', 'Other'];

const fieldStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px',
  padding: '8px 10px',
  color: '#e2e8f0',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  transition: 'border-color 0.2s',
  fontFamily: 'inherit',
};

const selectStyle = {
  ...fieldStyle,
  cursor: 'pointer',
  appearance: 'auto',
};

const DealDetails = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [linkedContacts, setLinkedContacts] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [showLinkContact, setShowLinkContact] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pipelines, setPipelines] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previewDoc, setPreviewDoc] = useState(null);
  
  const initialDealRef = useRef(null);

  useEffect(() => {
    fetchDeal();
    fetchContacts();
    fetchPipelines();
  }, [dealId]);

  const fetchDeal = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch(`${API}/deals/${dealId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeal(data.deal);
        initialDealRef.current = { ...data.deal };
        setDocuments(data.deal.documents || []);
        const contacts = (data.deal.contact_deal_links || []).map(link => ({
          ...link.contacts,
          role: link.role
        }));
        setLinkedContacts(contacts);
      } else {
        toast.error('Failed to load deal');
        navigate('/pipeline');
      }
    } catch (error) {
      console.error('Error fetching deal:', error);
      toast.error('Failed to load deal');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const response = await fetch(`${API}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAllContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchPipelines = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const response = await fetch(`${API}/pipelines`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPipelines(data.pipelines || []);
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    }
  };

  // ---- AUTO-SAVE: Generic field update on blur ----
  const handleUpdateDealField = async (field, value) => {
    if (initialDealRef.current && initialDealRef.current[field] === value) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch(`${API}/deals/${dealId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });

      if (response.ok) {
        initialDealRef.current = { ...initialDealRef.current, [field]: value };
      } else {
        toast.error('Failed to save change');
      }
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error('Failed to save change');
    }
  };

  const handleFieldChange = (field, value) => {
    setDeal(prev => ({ ...prev, [field]: value }));
  };

  const handleNumericBlur = (field) => {
    const raw = deal[field];
    const parsed = raw === '' || raw === null || raw === undefined ? null : parseFloat(raw);
    handleUpdateDealField(field, parsed);
  };

  const handleIntBlur = (field) => {
    const raw = deal[field];
    const parsed = raw === '' || raw === null || raw === undefined ? null : parseInt(raw, 10);
    handleUpdateDealField(field, isNaN(parsed) ? null : parsed);
  };

  const handleTextBlur = (field) => {
    handleUpdateDealField(field, deal[field] || null);
  };

  // ---- IMAGE UPLOAD ----
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }

    setUploadingImage(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API}/deals/${dealId}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        const newImageUrl = data.image_url;
        const updatedImages = deal.image_urls ? [...deal.image_urls, newImageUrl] : [newImageUrl];
        setDeal(prev => ({ ...prev, image_urls: updatedImages, image_url: prev.image_url || newImageUrl }));
        initialDealRef.current = { ...initialDealRef.current, image_urls: updatedImages };
        toast.success('Image uploaded');
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // ---- PIPELINE / STAGE ----
  const handlePipelineChange = async (pipelineId) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    const firstStage = pipeline?.stages?.[0];
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${dealId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_id: pipelineId, pipeline_stage_id: firstStage?.id || null })
      });
      if (response.ok) {
        setDeal(prev => ({ ...prev, pipeline_id: pipelineId, pipeline_stage_id: firstStage?.id }));
        initialDealRef.current = { ...initialDealRef.current, pipeline_id: pipelineId, pipeline_stage_id: firstStage?.id };
        toast.success('Pipeline updated');
      } else { toast.error('Failed to update pipeline'); }
    } catch (error) { toast.error('Failed to update pipeline'); }
  };

  const handleStageChange = async (stageId) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${dealId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage_id: stageId })
      });
      if (response.ok) {
        setDeal(prev => ({ ...prev, pipeline_stage_id: stageId }));
        initialDealRef.current = { ...initialDealRef.current, pipeline_stage_id: stageId };
        toast.success('Stage updated');
      } else { toast.error('Failed to update stage'); }
    } catch (error) { toast.error('Failed to update stage'); }
  };

  // ---- DELETE ----
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this deal?')) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${dealId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) { toast.success('Deal deleted'); navigate('/pipeline'); }
      else { toast.error('Failed to delete deal'); }
    } catch (error) { toast.error('Failed to delete deal'); }
  };

  // ---- CONTACTS ----
  const handleLinkContact = async (contactId, role) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${dealId}/contacts/${contactId}?role=${encodeURIComponent(role || '')}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) { toast.success('Contact linked'); fetchDeal(); setShowLinkContact(false); }
      else { toast.error('Failed to link contact'); }
    } catch (error) { toast.error('Failed to link contact'); }
  };

  const handleUnlinkContact = async (contactId) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${dealId}/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) { toast.success('Contact unlinked'); fetchDeal(); }
      else { toast.error('Failed to unlink contact'); }
    } catch (error) { toast.error('Failed to unlink contact'); }
  };

  // ---- DOCUMENT UPLOAD ----
  const handleFileUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API}/deals/${dealId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (response.ok) { toast.success('Document uploaded'); fetchDeal(); }
      else { toast.error('Failed to upload document'); }
    } catch (error) { toast.error('Failed to upload document'); }
    finally { setUploading(false); }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  if (loading) {
    return (
      <div data-testid="deal-details-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.textSecondary }}>
        Loading deal...
      </div>
    );
  }

  if (!deal) {
    return (
      <div data-testid="deal-not-found" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.textSecondary }}>
        Deal not found
      </div>
    );
  }

  const isOwner = deal.owner_id === user?.id;
  const currentPipeline = pipelines.find(p => p.id === deal.pipeline_id);
  const currentStage = currentPipeline?.stages?.find(s => s.id === deal.pipeline_stage_id);

  return (
    <div data-testid="deal-details-page" style={{ padding: spacing.xl, maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xl }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <button
            data-testid="deal-back-button"
            onClick={() => navigate(-1)}
            style={{ background: 'transparent', border: 'none', color: colors.textTertiary, cursor: 'pointer', padding: '8px' }}
          >
            <ArrowLeft size={24} />
          </button>
          <div style={{ flex: 1 }}>
            <input
              data-testid="deal-title-input"
              value={deal.title || ''}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              onBlur={() => handleTextBlur('title')}
              disabled={!isOwner}
              style={{
                fontSize: '28px', fontWeight: '700', color: colors.textPrimary, background: 'transparent',
                border: 'none', borderBottom: isOwner ? '2px solid rgba(255,255,255,0.08)' : 'none',
                width: '100%', outline: 'none', padding: '4px 0',
                transition: 'border-color 0.2s', cursor: isOwner ? 'text' : 'default'
              }}
              onFocus={(e) => { if (isOwner) e.target.style.borderBottomColor = '#00b8d4'; }}
              onBlurCapture={(e) => { e.target.style.borderBottomColor = 'rgba(255,255,255,0.08)'; }}
              placeholder="Deal Title"
            />
            <div style={{ color: colors.textTertiary, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <MapPin size={14} />
              {deal.address && `${deal.address}, `}
              {deal.city && `${deal.city}, `}
              {deal.state} {deal.zip_code}
            </div>
          </div>
        </div>
        
        {isOwner && (
          <Button
            data-testid="deal-delete-button"
            onClick={handleDelete}
            variant="outline"
            style={{ borderColor: '#ef4444', color: '#ef4444' }}
          >
            <Trash2 size={18} style={{ marginRight: '8px' }} />
            Delete
          </Button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: spacing.xl }}>
        {/* Left Column */}
        <div>
          {/* Image Carousel */}
          <div data-testid="deal-image-carousel" style={{
            background: colors.surfaceCard, borderRadius: borderRadius.md,
            padding: spacing.lg, marginBottom: spacing.lg, boxShadow: shadows.cardElevation
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600' }}>Property Images</h3>
              {isOwner && (
                <>
                  <input
                    id="image-upload-input"
                    data-testid="image-upload-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    disabled={uploadingImage}
                  />
                  <Button
                    data-testid="add-images-button"
                    onClick={() => document.getElementById('image-upload-input').click()}
                    size="sm"
                    disabled={uploadingImage}
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(0,184,212,0.2), rgba(59,130,246,0.2))',
                      border: '1px solid rgba(0,184,212,0.3)', color: '#00d4ff', cursor: 'pointer'
                    }}
                  >
                    <Upload size={14} style={{ marginRight: '6px' }} />
                    {uploadingImage ? 'Uploading...' : 'Add Images'}
                  </Button>
                </>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{
                width: '100%', height: '300px', borderRadius: borderRadius.md, overflow: 'hidden',
                background: colors.surfaceElevated, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {(deal.image_urls && deal.image_urls.length > 0) ? (
                  <img 
                    data-testid="deal-carousel-image"
                    src={deal.image_urls[currentImageIndex]} 
                    alt={deal.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23333" width="100" height="100"/><text fill="%23666" font-size="12" x="50%" y="50%" text-anchor="middle" dy=".3em">No Image</text></svg>'}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: colors.textTertiary }}>
                    <Building2 size={64} style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <p style={{ fontSize: '14px' }}>No images uploaded</p>
                    {isOwner && <p style={{ fontSize: '12px', marginTop: '4px' }}>Click "Add Images" to upload</p>}
                  </div>
                )}
              </div>

              {deal.image_urls && deal.image_urls.length > 1 && (
                <>
                  <button
                    data-testid="carousel-prev-button"
                    onClick={() => setCurrentImageIndex(prev => prev === 0 ? deal.image_urls.length - 1 : prev - 1)}
                    style={{
                      position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                      width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)',
                      border: 'none', color: 'white', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,184,212,0.8)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    data-testid="carousel-next-button"
                    onClick={() => setCurrentImageIndex(prev => prev === deal.image_urls.length - 1 ? 0 : prev + 1)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)',
                      border: 'none', color: 'white', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,184,212,0.8)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                  >
                    <ChevronRight size={24} />
                  </button>
                  <div style={{
                    position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.7)', padding: '6px 14px', borderRadius: '20px',
                    color: 'white', fontSize: '13px', fontWeight: '500'
                  }}>
                    {currentImageIndex + 1} / {deal.image_urls.length}
                  </div>
                </>
              )}
            </div>

            {deal.image_urls && deal.image_urls.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                {deal.image_urls.map((url, idx) => (
                  <div 
                    key={idx} 
                    data-testid={`carousel-thumbnail-${idx}`}
                    onClick={() => setCurrentImageIndex(idx)}
                    style={{
                      width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0,
                      border: idx === currentImageIndex ? '3px solid #00d4ff' : '3px solid transparent',
                      cursor: 'pointer', opacity: idx === currentImageIndex ? 1 : 0.6, transition: 'all 0.2s'
                    }}
                  >
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline & Stage */}
          <div data-testid="deal-pipeline-section" style={{
            background: colors.surfaceCard, borderRadius: borderRadius.md,
            padding: spacing.lg, marginBottom: spacing.lg, boxShadow: shadows.cardElevation
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Pipeline Status</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px', display: 'block', marginBottom: '8px' }}>Pipeline</Label>
                <select
                  data-testid="deal-pipeline-select"
                  value={deal.pipeline_id || ''}
                  onChange={(e) => handlePipelineChange(e.target.value)}
                  disabled={!isOwner}
                  style={selectStyle}
                >
                  <option value="">Select Pipeline</option>
                  {pipelines.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px', display: 'block', marginBottom: '8px' }}>Stage</Label>
                <select
                  data-testid="deal-stage-select"
                  value={deal.pipeline_stage_id || ''}
                  onChange={(e) => handleStageChange(e.target.value)}
                  disabled={!isOwner || !deal.pipeline_id}
                  style={selectStyle}
                >
                  <option value="">Select Stage</option>
                  {(currentPipeline?.stages || []).map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
            </div>
            {currentStage && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,184,212,0.1)', borderRadius: borderRadius.sm, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: currentStage.color || '#00d4ff' }} />
                <span style={{ color: colors.textPrimary, fontWeight: '500' }}>Current: {currentStage.name}</span>
              </div>
            )}
          </div>

          {/* Asking Price */}
          <div data-testid="deal-asking-price-section" style={{
            background: colors.surfaceCard, borderRadius: borderRadius.md,
            padding: spacing.lg, marginBottom: spacing.lg, boxShadow: shadows.cardElevation
          }}>
            <Label style={{ color: colors.textTertiary, fontSize: '13px', display: 'block', marginBottom: '8px' }}>Asking Price</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={28} style={{ color: colors.primary, flexShrink: 0 }} />
              <input
                data-testid="deal-asking-price-input"
                type="number"
                value={deal.asking_price ?? ''}
                onChange={(e) => handleFieldChange('asking_price', e.target.value)}
                onBlur={() => handleNumericBlur('asking_price')}
                disabled={!isOwner}
                placeholder="0"
                style={{
                  fontSize: '32px', fontWeight: '700', color: colors.primary,
                  background: 'transparent', border: 'none',
                  borderBottom: isOwner ? '2px solid rgba(255,255,255,0.08)' : 'none',
                  outline: 'none', width: '100%', padding: '4px 0'
                }}
              />
            </div>
            {deal.asking_price && (
              <div style={{ color: colors.textTertiary, fontSize: '13px', marginTop: '6px', paddingLeft: '34px' }}>
                {formatCurrency(deal.asking_price)}
              </div>
            )}
          </div>

          {/* Property Details — All fields always visible and editable */}
          <div data-testid="deal-property-details" style={{
            background: colors.surfaceCard, borderRadius: borderRadius.md,
            padding: spacing.lg, marginBottom: spacing.lg, boxShadow: shadows.cardElevation
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Property Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Asset Type</Label>
                <select
                  data-testid="deal-asset-type-select"
                  value={deal.asset_type || ''}
                  onChange={(e) => { handleFieldChange('asset_type', e.target.value); handleUpdateDealField('asset_type', e.target.value); }}
                  disabled={!isOwner}
                  style={{ ...selectStyle, marginTop: '6px' }}
                >
                  <option value="">Select type</option>
                  {assetTypes.map(type => (<option key={type} value={type}>{type}</option>))}
                </select>
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Address</Label>
                <input
                  data-testid="deal-address-input"
                  value={deal.address || ''}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  onBlur={() => handleTextBlur('address')}
                  disabled={!isOwner}
                  placeholder="Street address"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>City</Label>
                <input
                  data-testid="deal-city-input"
                  value={deal.city || ''}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  onBlur={() => handleTextBlur('city')}
                  disabled={!isOwner}
                  placeholder="City"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>State</Label>
                <input
                  data-testid="deal-state-input"
                  value={deal.state || ''}
                  onChange={(e) => handleFieldChange('state', e.target.value)}
                  onBlur={() => handleTextBlur('state')}
                  disabled={!isOwner}
                  placeholder="State"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Zip Code</Label>
                <input
                  data-testid="deal-zip-input"
                  value={deal.zip_code || ''}
                  onChange={(e) => handleFieldChange('zip_code', e.target.value)}
                  onBlur={() => handleTextBlur('zip_code')}
                  disabled={!isOwner}
                  placeholder="Zip code"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Size (SF)</Label>
                <input
                  data-testid="deal-size-input"
                  type="number"
                  value={deal.size_sqft ?? ''}
                  onChange={(e) => handleFieldChange('size_sqft', e.target.value)}
                  onBlur={() => handleNumericBlur('size_sqft')}
                  disabled={!isOwner}
                  placeholder="0"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Lot Size (acres)</Label>
                <input
                  data-testid="deal-lot-size-input"
                  type="number"
                  step="0.01"
                  value={deal.lot_size ?? ''}
                  onChange={(e) => handleFieldChange('lot_size', e.target.value)}
                  onBlur={() => handleNumericBlur('lot_size')}
                  disabled={!isOwner}
                  placeholder="0"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Year Built</Label>
                <input
                  data-testid="deal-year-built-input"
                  type="number"
                  value={deal.year_built ?? ''}
                  onChange={(e) => handleFieldChange('year_built', e.target.value)}
                  onBlur={() => handleIntBlur('year_built')}
                  disabled={!isOwner}
                  placeholder="Year"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Occupancy (%)</Label>
                <input
                  data-testid="deal-occupancy-input"
                  type="number"
                  value={deal.occupancy ?? ''}
                  onChange={(e) => handleFieldChange('occupancy', e.target.value)}
                  onBlur={() => handleNumericBlur('occupancy')}
                  disabled={!isOwner}
                  placeholder="0"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Zoning</Label>
                <input
                  data-testid="deal-zoning-input"
                  value={deal.zoning || ''}
                  onChange={(e) => handleFieldChange('zoning', e.target.value)}
                  onBlur={() => handleTextBlur('zoning')}
                  disabled={!isOwner}
                  placeholder="Zoning type"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div data-testid="deal-financial-details" style={{
            background: colors.surfaceCard, borderRadius: borderRadius.md,
            padding: spacing.lg, marginBottom: spacing.lg, boxShadow: shadows.cardElevation
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Financial Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>NOI</Label>
                <input
                  data-testid="deal-noi-input"
                  type="number"
                  value={deal.noi ?? ''}
                  onChange={(e) => handleFieldChange('noi', e.target.value)}
                  onBlur={() => handleNumericBlur('noi')}
                  disabled={!isOwner}
                  placeholder="0"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Cap Rate (%)</Label>
                <input
                  data-testid="deal-cap-rate-input"
                  type="number"
                  step="0.01"
                  value={deal.cap_rate ?? ''}
                  onChange={(e) => handleFieldChange('cap_rate', e.target.value)}
                  onBlur={() => handleNumericBlur('cap_rate')}
                  disabled={!isOwner}
                  placeholder="0"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Annual Income</Label>
                <input
                  data-testid="deal-annual-income-input"
                  type="number"
                  value={deal.annual_income ?? ''}
                  onChange={(e) => handleFieldChange('annual_income', e.target.value)}
                  onBlur={() => handleNumericBlur('annual_income')}
                  disabled={!isOwner}
                  placeholder="0"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Annual Expenses</Label>
                <input
                  data-testid="deal-annual-expenses-input"
                  type="number"
                  value={deal.annual_expenses ?? ''}
                  onChange={(e) => handleFieldChange('annual_expenses', e.target.value)}
                  onBlur={() => handleNumericBlur('annual_expenses')}
                  disabled={!isOwner}
                  placeholder="0"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div data-testid="deal-notes-section" style={{
            background: colors.surfaceCard, borderRadius: borderRadius.md,
            padding: spacing.lg, boxShadow: shadows.cardElevation
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Notes</h3>
            <textarea
              data-testid="deal-notes-textarea"
              value={deal.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              onBlur={() => handleTextBlur('notes')}
              disabled={!isOwner}
              rows={5}
              placeholder="Add notes about this deal..."
              style={{
                ...fieldStyle,
                resize: 'vertical',
                minHeight: '100px',
                lineHeight: '1.6',
              }}
            />
          </div>
        </div>

        {/* Right Column - Contacts & Documents */}
        <div>
          {/* Linked Contacts */}
          <div data-testid="deal-linked-contacts" style={{
            background: colors.surfaceCard, borderRadius: borderRadius.md,
            padding: spacing.lg, marginBottom: spacing.lg, boxShadow: shadows.cardElevation
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600' }}>Linked Contacts</h3>
              {isOwner && (
                <Button
                  data-testid="link-contact-button"
                  onClick={() => setShowLinkContact(!showLinkContact)}
                  size="sm"
                  style={{ background: colors.primary, border: 'none' }}
                >
                  <Plus size={14} />
                </Button>
              )}
            </div>

            {showLinkContact && (
              <div style={{ background: colors.surfaceElevated, borderRadius: borderRadius.sm, padding: '12px', marginBottom: '12px' }}>
                <select
                  data-testid="link-contact-select"
                  onChange={(e) => { if (e.target.value) handleLinkContact(e.target.value, ''); }}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', background: colors.surfaceCard, border: `1px solid ${colors.border}`, color: colors.textPrimary }}
                >
                  <option value="">Select a contact...</option>
                  {allContacts
                    .filter(c => !linkedContacts.find(lc => lc.id === c.id))
                    .map(contact => (
                      <option key={contact.id} value={contact.id}>{contact.name} - {contact.company || contact.email}</option>
                    ))}
                </select>
              </div>
            )}

            {linkedContacts.length === 0 ? (
              <p style={{ color: colors.textTertiary, fontSize: '14px' }}>No contacts linked</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {linkedContacts.map(contact => (
                  <div key={contact.id} style={{
                    background: colors.surfaceElevated, borderRadius: borderRadius.sm, padding: '12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ color: colors.textPrimary, fontWeight: '500' }}>{contact.name}</div>
                      <div style={{ color: colors.textTertiary, fontSize: '12px' }}>
                        {contact.contact_type} {contact.role && `\u2022 ${contact.role}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {contact.phone && (<a href={`tel:${contact.phone}`} style={{ color: colors.textTertiary }}><Phone size={16} /></a>)}
                      {contact.email && (<a href={`mailto:${contact.email}`} style={{ color: colors.textTertiary }}><Mail size={16} /></a>)}
                      {isOwner && (
                        <button onClick={() => handleUnlinkContact(contact.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          <div data-testid="deal-documents-section" style={{
            background: colors.surfaceCard, borderRadius: borderRadius.md,
            padding: spacing.lg, boxShadow: shadows.cardElevation
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Documents</h3>

            {isOwner && (
              <div
                data-testid="document-drop-zone"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.background = 'rgba(0, 184, 212, 0.05)'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = 'transparent'; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = 'transparent'; if (e.dataTransfer.files.length > 0) handleFileUpload({ target: { files: [e.dataTransfer.files[0]] } }); }}
                style={{
                  border: `2px dashed ${colors.border}`, borderRadius: borderRadius.md,
                  padding: '24px', marginBottom: '16px', textAlign: 'center',
                  transition: 'all 0.2s ease', cursor: 'pointer'
                }}
                onClick={() => document.getElementById('file-upload-input').click()}
              >
                <input
                  id="file-upload-input"
                  data-testid="file-upload-input"
                  type="file"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                />
                <Upload size={32} style={{ color: colors.textTertiary, margin: '0 auto 12px' }} />
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '4px' }}>
                  {uploading ? 'Uploading...' : 'Drag and drop files here'}
                </p>
                <p style={{ color: colors.textTertiary, fontSize: '12px' }}>or click to browse</p>
              </div>
            )}

            {documents.length === 0 ? (
              <p style={{ color: colors.textTertiary, fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>No documents uploaded yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    data-testid={`document-item-${doc.id}`}
                    onClick={() => setPreviewDoc(doc)}
                    style={{
                      background: colors.surfaceElevated, borderRadius: borderRadius.sm, padding: '12px',
                      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                      color: colors.textPrimary, transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = colors.surfaceElevated}
                  >
                    <FileText size={20} style={{ color: colors.primary }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.file_name}</div>
                      <div style={{ color: colors.textTertiary, fontSize: '12px' }}>{doc.file_type?.toUpperCase()}</div>
                    </div>
                    <Eye size={16} style={{ color: colors.textTertiary, flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div
          data-testid="document-preview-modal"
          onClick={() => setPreviewDoc(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.surfaceCard, borderRadius: borderRadius.lg,
              width: '90%', maxWidth: '900px', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', borderBottom: `1px solid ${colors.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <FileText size={20} style={{ color: colors.primary, flexShrink: 0 }} />
                <span style={{ color: colors.textPrimary, fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {previewDoc.file_name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <a
                  data-testid="document-download-button"
                  href={previewDoc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                    background: 'rgba(0,184,212,0.15)', border: '1px solid rgba(0,184,212,0.3)',
                    borderRadius: '8px', color: '#00d4ff', textDecoration: 'none',
                    fontSize: '13px', fontWeight: '500', cursor: 'pointer'
                  }}
                >
                  <Download size={14} /> Download
                </a>
                <button
                  data-testid="document-preview-close"
                  onClick={() => setPreviewDoc(null)}
                  style={{
                    background: 'transparent', border: `1px solid ${colors.border}`,
                    borderRadius: '8px', color: colors.textSecondary, cursor: 'pointer',
                    width: '36px', height: '36px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* Modal Content */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
              {(() => {
                const ext = (previewDoc.file_name || '').split('.').pop()?.toLowerCase();
                if (ext === 'pdf') {
                  return (
                    <iframe
                      data-testid="document-pdf-viewer"
                      src={previewDoc.file_url}
                      style={{ width: '100%', height: '70vh', border: 'none' }}
                      title={previewDoc.file_name}
                    />
                  );
                }
                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
                  return (
                    <img
                      data-testid="document-image-viewer"
                      src={previewDoc.file_url}
                      alt={previewDoc.file_name}
                      style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', padding: '20px' }}
                    />
                  );
                }
                return (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.textTertiary }}>
                    <FileText size={64} style={{ marginBottom: '16px', opacity: 0.4 }} />
                    <p style={{ fontSize: '16px', marginBottom: '8px' }}>Preview not available for .{ext} files</p>
                    <p style={{ fontSize: '13px' }}>Click "Download" to view this file</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealDetails;
