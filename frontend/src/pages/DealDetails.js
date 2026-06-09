import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  ArrowLeft, MapPin, Building2, DollarSign, 
  Trash2, Users, FileText, Upload, Download, Eye,
  Phone, Mail, Plus, ChevronLeft, ChevronRight, X, Share2, Copy, Check,
  Calendar
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { colors, shadows, gradients, borderRadius, spacing } from '../styles/designSystem';
import CriticalDatesTimeline from '../components/CriticalDatesTimeline';

const assetTypes = ['Office', 'Retail', 'Industrial', 'Multifamily', 'Land', 'Mixed Use', 'Hotels', 'Medical', 'Gas Stations', 'Other'];

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
  const [searchParams] = useSearchParams();
  const { user } = useContext(AuthContext);
  
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [linkedContacts, setLinkedContacts] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [showLinkContact, setShowLinkContact] = useState(false);
  const [showNewContactInline, setShowNewContactInline] = useState(false);
  const [newInlineContact, setNewInlineContact] = useState({ name: '', email: '', phone: '', contact_type: 'Buyer' });
  const [savingNewContact, setSavingNewContact] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pipelines, setPipelines] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'details');
  
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
        navigate('/pipeline');
      }
    } catch (error) {
      console.error('Error fetching deal:', error);
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
      }
    } catch (error) {
      console.error('Error updating field:', error);
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
        const updatedImages = data.image_urls;
        setDeal(prev => ({ ...prev, image_urls: updatedImages, image_url: updatedImages[0] || prev.image_url }));
        initialDealRef.current = { ...initialDealRef.current, image_urls: updatedImages };
        setCurrentImageIndex(updatedImages.length - 1);
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

  const handleDeleteImage = async (index, e) => {
    if (e) e.stopPropagation();
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${dealId}/images/${index}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const updatedImages = data.image_urls;
        const newIndex = Math.max(0, Math.min(currentImageIndex, updatedImages.length - 1));
        setCurrentImageIndex(newIndex);
        setDeal(prev => ({ ...prev, image_urls: updatedImages, image_url: updatedImages[0] || null }));
        initialDealRef.current = { ...initialDealRef.current, image_urls: updatedImages };
        toast.success('Image removed');
      } else {
        toast.error('Failed to remove image');
      }
    } catch (error) {
      toast.error('Failed to remove image');
    }
  };

  const handleMoveImage = async (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= (deal.image_urls || []).length) return;
    const originalImages = [...(deal.image_urls || [])];
    const newImages = [...originalImages];
    const [moved] = newImages.splice(fromIdx, 1);
    newImages.splice(toIdx, 0, moved);
    // Optimistic update
    setCurrentImageIndex(toIdx);
    setDeal(prev => ({ ...prev, image_urls: newImages, image_url: newImages[0] || null }));
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${dealId}/images/reorder`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_urls: newImages })
      });
      if (response.ok) {
        initialDealRef.current = { ...initialDealRef.current, image_urls: newImages };
      } else {
        // Revert on failure
        setCurrentImageIndex(fromIdx);
        setDeal(prev => ({ ...prev, image_urls: originalImages, image_url: originalImages[0] || null }));
        toast.error('Failed to reorder images');
      }
    } catch (error) {
      // Revert on failure
      setCurrentImageIndex(fromIdx);
      setDeal(prev => ({ ...prev, image_urls: originalImages, image_url: originalImages[0] || null }));
      toast.error('Failed to reorder images');
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

  // ---- VISIBILITY TOGGLE ----
  const handleToggleVisibility = async () => {
    const isCurrentlyShared = !!deal.team_id;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/deals/${dealId}/visibility`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_with_team: !isCurrentlyShared })
      });
      if (response.ok) {
        const data = await response.json();
        setDeal(prev => ({ ...prev, team_id: !isCurrentlyShared ? (data.deal?.team_id || 'shared') : null }));
        toast.success(!isCurrentlyShared ? 'Deal shared with team' : 'Deal set to private');
      } else { toast.error('Failed to update visibility'); }
    } catch (error) { toast.error('Failed to update visibility'); }
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
      if (response.ok) { fetchDeal(); setShowLinkContact(false); }
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
      if (response.ok) { fetchDeal(); }
      else { toast.error('Failed to unlink contact'); }
    } catch (error) { toast.error('Failed to unlink contact'); }
  };

  const handleCreateAndLinkNewContact = async () => {
    if (!newInlineContact.name.trim()) return;
    setSavingNewContact(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const createRes = await fetch(`${API}/contacts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newInlineContact)
      });
      if (!createRes.ok) { toast.error('Failed to create contact'); return; }
      const created = await createRes.json();
      const contactId = created.contact?.id;
      if (!contactId) { toast.error('Failed to create contact'); return; }
      await fetch(`${API}/deals/${dealId}/contacts/${contactId}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeal();
      fetchContacts();
      setShowNewContactInline(false);
      setShowLinkContact(false);
      setNewInlineContact({ name: '', email: '', phone: '', contact_type: 'Buyer' });
      toast.success('Contact created and linked');
    } catch (error) { toast.error('Failed to create contact'); }
    finally { setSavingNewContact(false); }
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
      if (response.ok) { fetchDeal(); }
      else { toast.error('Failed to upload document'); }
    } catch (error) { toast.error('Failed to upload document'); }
    finally { setUploading(false); }
  };

  const handleDeleteDocument = async (docId, e) => {
    e.stopPropagation();
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const response = await fetch(`${API}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Document deleted');
        setDocuments(prev => prev.filter(d => d.id !== docId));
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Failed to delete document');
      }
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  };

  const formatNumber = (value) => {
    if (!value && value !== 0) return '';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatNumberInput = (value) => {
    if (!value) return '';
    const cleanValue = value.toString().replace(/[^\d.]/g, '');
    const parts = cleanValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const parseFormattedNumber = (value) => {
    if (!value) return '';
    return value.replace(/,/g, '');
  };

  // Mini map style - light street map
  const miniMapStyle = {
    version: 8,
    sources: {
      'osm-streets': {
        type: 'raster',
        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 18
      }
    },
    layers: [{ id: 'osm-streets-layer', type: 'raster', source: 'osm-streets', minzoom: 0, maxzoom: 18 }]
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
              onFocus={(e) => { if (isOwner) e.target.style.borderBottomColor = '#ff0000'; }}
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
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            onClick={() => {
              const shareUrl = `${window.location.origin}/share/${dealId}`;
              navigator.clipboard.writeText(shareUrl);
              setShareCopied(true);
              setTimeout(() => setShareCopied(false), 2000);
            }}
            variant="outline"
            style={{ borderColor: colors.border, color: colors.primary }}
          >
            {shareCopied ? <Check size={16} style={{ marginRight: '6px' }} /> : <Share2 size={16} style={{ marginRight: '6px' }} />}
            {shareCopied ? 'Copied!' : 'Share'}
          </Button>
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
      </div>

      {/* Tab Bar */}
      {(() => {
        const stageName = (currentStage?.name || '').toLowerCase();
        const showTimeline = stageName.includes('under contract') || stageName.includes('contract') || stageName.includes('closing') || activeTab === 'timeline';
        const tabs = [
          { id: 'details', label: 'Property Details' },
          ...(showTimeline ? [{ id: 'timeline', label: 'Closing', icon: Calendar }] : []),
        ];
        return (
          <div data-testid="deal-tabs" style={{
            display: 'flex', gap: '24px', marginBottom: spacing.lg,
            borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0',
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                data-testid={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 0', border: 'none', background: 'transparent',
                  color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.35)',
                  fontWeight: activeTab === tab.id ? '600' : '400',
                  fontSize: '14px', cursor: 'pointer', transition: 'color 0.15s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  borderBottom: activeTab === tab.id ? '2px solid #ff0000' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {tab.icon && <tab.icon size={14} />}
                {tab.label}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Tab Content */}
      {activeTab === 'timeline' ? (
        <CriticalDatesTimeline dealId={dealId} isOwner={isOwner} />
      ) : (
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
                      background: 'linear-gradient(135deg, rgba(212,18,18,0.2), rgba(59,130,246,0.2))',
                      border: '1px solid rgba(212,18,18,0.3)', color: '#ff0000', cursor: 'pointer'
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
                background: colors.surfaceElevated, display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative'
              }}>
                {(deal.image_urls && deal.image_urls.length > 0) ? (
                  <>
                    <img 
                      data-testid="deal-carousel-image"
                      src={deal.image_urls[currentImageIndex]} 
                      alt={deal.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23333" width="100" height="100"/><text fill="%23666" font-size="12" x="50%" y="50%" text-anchor="middle" dy=".3em">No Image</text></svg>'}
                    />
                    {/* Delete current image button */}
                    {isOwner && (
                      <button
                        data-testid={`delete-image-${currentImageIndex}`}
                        onClick={(e) => handleDeleteImage(currentImageIndex, e)}
                        title="Remove this image"
                        style={{
                          position: 'absolute', top: '10px', right: '10px',
                          width: '34px', height: '34px', borderRadius: '8px',
                          background: 'rgba(239,68,68,0.85)', border: '1px solid rgba(239,68,68,0.5)',
                          color: '#fff', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', zIndex: 10,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.85)'}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </>
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
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,18,18,0.8)'}
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
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,18,18,0.8)'}
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

            {deal.image_urls && deal.image_urls.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {deal.image_urls.map((url, idx) => (
                    <div 
                      key={url + idx}
                      style={{ position: 'relative', flexShrink: 0 }}
                    >
                      <div
                        data-testid={`carousel-thumbnail-${idx}`}
                        onClick={() => setCurrentImageIndex(idx)}
                        style={{
                          width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden',
                          border: idx === currentImageIndex ? '3px solid #ff0000' : '3px solid transparent',
                          cursor: 'pointer', opacity: idx === currentImageIndex ? 1 : 0.6, transition: 'all 0.2s'
                        }}
                      >
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      {isOwner && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'absolute', top: '2px', right: '2px' }}>
                          <button
                            data-testid={`thumb-delete-${idx}`}
                            onClick={(e) => handleDeleteImage(idx, e)}
                            title="Remove"
                            style={{
                              width: '18px', height: '18px', borderRadius: '4px',
                              background: 'rgba(239,68,68,0.9)', border: 'none',
                              color: '#fff', cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700',
                            }}
                          >×</button>
                        </div>
                      )}
                      {isOwner && deal.image_urls.length > 1 && (
                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '3px' }}>
                          <button
                            data-testid={`thumb-move-left-${idx}`}
                            onClick={() => handleMoveImage(idx, idx - 1)}
                            disabled={idx === 0}
                            title="Move left"
                            style={{
                              width: '28px', height: '16px', borderRadius: '3px',
                              background: idx === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
                              border: 'none', color: idx === 0 ? 'rgba(255,255,255,0.2)' : '#fff',
                              cursor: idx === 0 ? 'default' : 'pointer', fontSize: '10px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >←</button>
                          <button
                            data-testid={`thumb-move-right-${idx}`}
                            onClick={() => handleMoveImage(idx, idx + 1)}
                            disabled={idx === deal.image_urls.length - 1}
                            title="Move right"
                            style={{
                              width: '28px', height: '16px', borderRadius: '3px',
                              background: idx === deal.image_urls.length - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
                              border: 'none', color: idx === deal.image_urls.length - 1 ? 'rgba(255,255,255,0.2)' : '#fff',
                              cursor: idx === deal.image_urls.length - 1 ? 'default' : 'pointer', fontSize: '10px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >→</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(212,18,18,0.1)', borderRadius: borderRadius.sm, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: currentStage.color || '#ff0000' }} />
                <span style={{ color: colors.textPrimary, fontWeight: '500' }}>Current: {currentStage.name}</span>
              </div>
            )}
          </div>

          {/* Visibility Toggle */}
          {isOwner && (
            <div data-testid="deal-visibility-section" style={{
              background: colors.surfaceCard, borderRadius: borderRadius.md,
              padding: spacing.lg, marginBottom: spacing.lg, boxShadow: shadows.cardElevation
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Visibility</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {deal.team_id ? (
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={18} style={{ color: '#10b981' }} />
                    </div>
                  ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Eye size={18} style={{ color: colors.textTertiary }} />
                    </div>
                  )}
                  <div>
                    <p style={{ color: colors.textPrimary, fontSize: '14px', fontWeight: 600 }}>
                      {deal.team_id ? 'Shared with Team' : 'Private'}
                    </p>
                    <p style={{ color: colors.textTertiary, fontSize: '12px' }}>
                      {deal.team_id ? 'Team members can see this deal' : 'Only visible to you'}
                    </p>
                  </div>
                </div>
                <button
                  data-testid="deal-visibility-toggle"
                  onClick={handleToggleVisibility}
                  style={{
                    padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
                    background: deal.team_id ? 'rgba(255,255,255,0.05)' : 'rgba(16,185,129,0.1)',
                    border: `1px solid ${deal.team_id ? 'rgba(255,255,255,0.1)' : 'rgba(16,185,129,0.3)'}`,
                    color: deal.team_id ? colors.textSecondary : '#10b981',
                  }}
                >
                  {deal.team_id ? 'Make Private' : 'Share with Team'}
                </button>
              </div>
            </div>
          )}

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
                value={deal.asking_price ? formatNumberInput(String(deal.asking_price)) : ''}
                onChange={(e) => {
                  const raw = parseFormattedNumber(e.target.value);
                  handleFieldChange('asking_price', raw);
                }}
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
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Building Size (SF)</Label>
                <input
                  data-testid="deal-size-input"
                  value={deal.size_sqft ? formatNumberInput(String(deal.size_sqft)) : ''}
                  onChange={(e) => handleFieldChange('size_sqft', parseFormattedNumber(e.target.value))}
                  onBlur={() => handleNumericBlur('size_sqft')}
                  disabled={!isOwner}
                  placeholder="0"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Lot Size - Land (Acres)</Label>
                <input
                  data-testid="deal-lot-size-input"
                  value={deal.lot_size ? formatNumberInput(String(deal.lot_size)) : ''}
                  onChange={(e) => handleFieldChange('lot_size', parseFormattedNumber(e.target.value))}
                  onBlur={() => handleNumericBlur('lot_size')}
                  disabled={!isOwner}
                  placeholder="0"
                  style={{ ...fieldStyle, marginTop: '6px' }}
                />
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Land SQFT</Label>
                <div style={{
                  ...fieldStyle, marginTop: '6px',
                  background: 'rgba(212,18,18,0.05)', 
                  color: deal.lot_size ? '#ff0000' : colors.textTertiary,
                  fontWeight: deal.lot_size ? '600' : '400'
                }}>
                  {deal.lot_size ? formatNumber(Math.round(parseFloat(deal.lot_size) * 43560)) + ' SF' : 'Auto-calculated from Acres'}
                </div>
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
                  value={deal.noi ? formatNumberInput(String(deal.noi)) : ''}
                  onChange={(e) => handleFieldChange('noi', parseFormattedNumber(e.target.value))}
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
                  value={deal.annual_income ? formatNumberInput(String(deal.annual_income)) : ''}
                  onChange={(e) => handleFieldChange('annual_income', parseFormattedNumber(e.target.value))}
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
                  value={deal.annual_expenses ? formatNumberInput(String(deal.annual_expenses)) : ''}
                  onChange={(e) => handleFieldChange('annual_expenses', parseFormattedNumber(e.target.value))}
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
                {!showNewContactInline ? (
                  <>
                    <Label style={{ color: colors.textTertiary, fontSize: '12px', display: 'block', marginBottom: '6px' }}>Choose a contact to link</Label>
                    <select
                      data-testid="link-contact-select"
                      onChange={(e) => { if (e.target.value) handleLinkContact(e.target.value, ''); }}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', background: colors.surfaceCard, border: `1px solid ${colors.border}`, color: colors.textPrimary, fontSize: '14px', cursor: 'pointer' }}
                    >
                      <option value="">Select a contact...</option>
                      {allContacts
                        .filter(c => !linkedContacts.find(lc => lc.id === c.id))
                        .map(contact => (
                          <option key={contact.id} value={contact.id}>{contact.name} {contact.company ? `- ${contact.company}` : ''} {contact.email ? `(${contact.email})` : ''}</option>
                        ))}
                    </select>
                    <button
                      data-testid="create-new-contact-inline-btn"
                      onClick={() => setShowNewContactInline(true)}
                      style={{
                        width: '100%', marginTop: '8px', padding: '10px',
                        background: 'rgba(212,18,18,0.08)', border: '1px dashed rgba(212,18,18,0.3)',
                        borderRadius: '6px', color: '#ff0000', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                      }}
                    >
                      <Plus size={14} /> Create New Contact
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '13px', color: colors.textPrimary, fontWeight: 600, marginBottom: '10px' }}>Create New Contact</div>
                    <input data-testid="new-contact-name" placeholder="Name *" value={newInlineContact.name}
                      onChange={(e) => setNewInlineContact(p => ({ ...p, name: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', background: colors.surfaceCard, border: `1px solid ${colors.border}`, borderRadius: '6px', color: colors.textPrimary, fontSize: '13px', marginBottom: '6px' }} />
                    <input data-testid="new-contact-email" placeholder="Email" value={newInlineContact.email}
                      onChange={(e) => setNewInlineContact(p => ({ ...p, email: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', background: colors.surfaceCard, border: `1px solid ${colors.border}`, borderRadius: '6px', color: colors.textPrimary, fontSize: '13px', marginBottom: '6px' }} />
                    <input data-testid="new-contact-phone" placeholder="Phone" value={newInlineContact.phone}
                      onChange={(e) => setNewInlineContact(p => ({ ...p, phone: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', background: colors.surfaceCard, border: `1px solid ${colors.border}`, borderRadius: '6px', color: colors.textPrimary, fontSize: '13px', marginBottom: '6px' }} />
                    <select data-testid="new-contact-type" value={newInlineContact.contact_type}
                      onChange={(e) => setNewInlineContact(p => ({ ...p, contact_type: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', background: colors.surfaceCard, border: `1px solid ${colors.border}`, borderRadius: '6px', color: colors.textPrimary, fontSize: '13px', marginBottom: '8px', cursor: 'pointer' }}>
                      <option value="Buyer">Buyer</option><option value="Seller">Seller</option>
                      <option value="Broker">Broker</option><option value="Landlord">Landlord</option>
                      <option value="Tenant">Tenant</option><option value="Other">Other</option>
                    </select>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button data-testid="cancel-new-contact" onClick={() => { setShowNewContactInline(false); setNewInlineContact({ name: '', email: '', phone: '', contact_type: 'Buyer' }); }}
                        variant="outline" size="sm" style={{ flex: 1, borderColor: colors.border, color: colors.textSecondary }}>
                        Back
                      </Button>
                      <Button data-testid="save-new-contact" onClick={handleCreateAndLinkNewContact}
                        disabled={!newInlineContact.name.trim() || savingNewContact}
                        size="sm" style={{ flex: 1, background: colors.primary, border: 'none', opacity: (!newInlineContact.name.trim() || savingNewContact) ? 0.5 : 1 }}>
                        {savingNewContact ? 'Saving...' : 'Create & Link'}
                      </Button>
                    </div>
                  </>
                )}
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
                      {contact.phone && (
                        <div style={{ color: colors.textSecondary, fontSize: '12px', marginTop: '2px' }}>
                          {contact.phone}
                        </div>
                      )}
                      <div style={{ color: colors.textTertiary, fontSize: '12px', marginTop: '1px' }}>
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
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.background = 'rgba(255, 0, 0, 0.05)'; }}
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
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = colors.surfaceElevated}
                  >
                    <FileText size={20} style={{ color: colors.primary }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.file_name}</div>
                      <div style={{ color: colors.textTertiary, fontSize: '12px' }}>{doc.file_type?.toUpperCase()}</div>
                    </div>
                    {isOwner && (
                      <button
                        data-testid={`delete-doc-${doc.id}`}
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        title="Delete document"
                        style={{
                          padding: '6px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', flexShrink: 0
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <Eye size={16} style={{ color: colors.textTertiary, flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location Map */}
          {deal.latitude && deal.longitude && (
            <div data-testid="deal-location-map" style={{
              background: colors.surfaceCard, borderRadius: borderRadius.md,
              padding: spacing.lg, marginTop: spacing.lg, boxShadow: shadows.cardElevation
            }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} style={{ color: colors.primary }} />
                Location
              </h3>
              <div style={{ borderRadius: borderRadius.md, overflow: 'hidden', height: '220px' }}>
                <Map
                  initialViewState={{
                    longitude: deal.longitude,
                    latitude: deal.latitude,
                    zoom: 14
                  }}
                  style={{ width: '100%', height: '100%' }}
                  mapStyle={miniMapStyle}
                  attributionControl={false}
                  interactive={false}
                >
                  <Marker longitude={deal.longitude} latitude={deal.latitude} anchor="center">
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: colors.primary, border: '3px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Building2 size={10} color="white" />
                    </div>
                  </Marker>
                </Map>
              </div>
              <p style={{ color: colors.textTertiary, fontSize: '12px', marginTop: '8px' }}>
                {deal.address && `${deal.address}, `}{deal.city && `${deal.city}, `}{deal.state} {deal.zip_code}
              </p>
            </div>
          )}
        </div>
      </div>
      )}

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
                    background: 'rgba(212,18,18,0.15)', border: '1px solid rgba(212,18,18,0.3)',
                    borderRadius: '8px', color: '#ff0000', textDecoration: 'none',
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
