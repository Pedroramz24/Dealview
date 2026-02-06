import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import { 
  ArrowLeft, MapPin, Building2, DollarSign, Calendar, 
  Edit2, Trash2, Save, X, Users, FileText, Upload,
  Phone, Mail, Link2, Plus
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { colors, shadows, gradients, borderRadius, spacing } from '../styles/designSystem';

const assetTypes = ['Office', 'Retail', 'Industrial', 'Multifamily', 'Land', 'Mixed Use', 'Other'];

const DealDetails = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedDeal, setEditedDeal] = useState({});
  const [documents, setDocuments] = useState([]);
  const [linkedContacts, setLinkedContacts] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [showLinkContact, setShowLinkContact] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pipelines, setPipelines] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

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
        setEditedDeal(data.deal);
        setDocuments(data.deal.documents || []);
        
        // Extract linked contacts
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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

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
        // Update deal with new image
        const newImageUrl = data.image_url;
        const updatedImages = deal.image_urls ? [...deal.image_urls, newImageUrl] : [newImageUrl];
        setDeal({ ...deal, image_urls: updatedImages, image_url: deal.image_url || newImageUrl });
        toast.success('Image uploaded successfully');
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePipelineChange = async (pipelineId) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const pipeline = pipelines.find(p => p.id === pipelineId);
      const firstStage = pipeline?.stages?.[0];

      const response = await fetch(`${API}/deals/${dealId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pipeline_id: pipelineId,
          pipeline_stage_id: firstStage?.id || null
        })
      });

      if (response.ok) {
        setDeal({ ...deal, pipeline_id: pipelineId, pipeline_stage_id: firstStage?.id });
        toast.success('Pipeline updated');
      } else {
        toast.error('Failed to update pipeline');
      }
    } catch (error) {
      toast.error('Failed to update pipeline');
    }
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
        setDeal({ ...deal, pipeline_stage_id: stageId });
        toast.success('Stage updated');
      } else {
        toast.error('Failed to update stage');
      }
    } catch (error) {
      toast.error('Failed to update stage');
    }
  };

  const handleSave = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch(`${API}/deals/${dealId}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedDeal)
      });
      
      if (response.ok) {
        const data = await response.json();
        setDeal({ ...deal, ...editedDeal });
        setEditing(false);
        toast.success('Deal updated successfully');
      } else {
        toast.error('Failed to update deal');
      }
    } catch (error) {
      console.error('Error updating deal:', error);
      toast.error('Failed to update deal');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this deal?')) return;
    
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch(`${API}/deals/${dealId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Deal deleted');
        navigate('/pipeline');
      } else {
        toast.error('Failed to delete deal');
      }
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast.error('Failed to delete deal');
    }
  };

  const handleLinkContact = async (contactId, role) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch(`${API}/deals/${dealId}/contacts/${contactId}?role=${encodeURIComponent(role || '')}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Contact linked');
        fetchDeal();
        setShowLinkContact(false);
      } else {
        toast.error('Failed to link contact');
      }
    } catch (error) {
      console.error('Error linking contact:', error);
      toast.error('Failed to link contact');
    }
  };

  const handleUnlinkContact = async (contactId) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const response = await fetch(`${API}/deals/${dealId}/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Contact unlinked');
        fetchDeal();
      } else {
        toast.error('Failed to unlink contact');
      }
    } catch (error) {
      console.error('Error unlinking contact:', error);
      toast.error('Failed to unlink contact');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API}/deals/${dealId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        toast.success('Document uploaded');
        fetchDeal();
      } else {
        toast.error('Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: colors.textSecondary
      }}>
        Loading deal...
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: colors.textSecondary
      }}>
        Deal not found
      </div>
    );
  }

  const isOwner = deal.owner_id === user?.id;

  return (
    <div style={{ padding: spacing.xl, maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.xl
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.textTertiary,
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            {editing ? (
              <Input
                value={editedDeal.title || ''}
                onChange={(e) => setEditedDeal({ ...editedDeal, title: e.target.value })}
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  background: colors.surfaceElevated,
                  border: `1px solid ${colors.border}`
                }}
              />
            ) : (
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: colors.textPrimary,
                marginBottom: '4px'
              }}>
                {deal.title}
              </h1>
            )}
            <p style={{ color: colors.textTertiary, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} />
              {deal.address && `${deal.address}, `}
              {deal.city && `${deal.city}, `}
              {deal.state} {deal.zip_code}
            </p>
          </div>
        </div>
        
        {isOwner && (
          <div style={{ display: 'flex', gap: '12px' }}>
            {editing ? (
              <>
                <Button
                  onClick={() => { setEditing(false); setEditedDeal(deal); }}
                  variant="outline"
                  style={{ borderColor: colors.border, color: colors.textSecondary }}
                >
                  <X size={18} style={{ marginRight: '8px' }} />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  style={{ background: gradients.primaryButton, border: 'none' }}
                >
                  <Save size={18} style={{ marginRight: '8px' }} />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setEditing(true)}
                  variant="outline"
                  style={{ borderColor: colors.border, color: colors.textSecondary }}
                >
                  <Edit2 size={18} style={{ marginRight: '8px' }} />
                  Edit
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  style={{ borderColor: '#ef4444', color: '#ef4444' }}
                >
                  <Trash2 size={18} style={{ marginRight: '8px' }} />
                  Delete
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: spacing.xl }}>
        {/* Left Column - Main Details */}
        <div>
          {/* Property Images with Carousel */}
          <div style={{
            background: colors.surfaceCard,
            borderRadius: borderRadius.md,
            padding: spacing.lg,
            marginBottom: spacing.lg,
            boxShadow: shadows.cardElevation
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600' }}>
                Property Images
              </h3>
              {isOwner && (
                <>
                  <input
                    id="image-upload-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    disabled={uploadingImage}
                  />
                  <Button
                    onClick={() => document.getElementById('image-upload-input').click()}
                    size="sm"
                    disabled={uploadingImage}
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(0,184,212,0.2), rgba(59,130,246,0.2))',
                      border: '1px solid rgba(0,184,212,0.3)',
                      color: '#00d4ff',
                      cursor: 'pointer'
                    }}
                  >
                    <Upload size={14} style={{ marginRight: '6px' }} />
                    {uploadingImage ? 'Uploading...' : 'Add Images'}
                  </Button>
                </>
              )}
            </div>

            {/* Image Carousel */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '100%',
                height: '300px',
                borderRadius: borderRadius.md,
                overflow: 'hidden',
                background: colors.surfaceElevated,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {(deal.image_urls && deal.image_urls.length > 0) ? (
                  <img 
                    src={deal.image_urls[currentImageIndex] || deal.image_url} 
                    alt={deal.title}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }}
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

              {/* Carousel Arrows */}
              {deal.image_urls && deal.image_urls.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex(prev => prev === 0 ? deal.image_urls.length - 1 : prev - 1)}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.7)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,184,212,0.8)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex(prev => prev === deal.image_urls.length - 1 ? 0 : prev + 1)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.7)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,184,212,0.8)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                  >
                    <ChevronRight size={24} />
                  </button>
                  {/* Image Counter */}
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.7)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    {currentImageIndex + 1} / {deal.image_urls.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {deal.image_urls && deal.image_urls.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                {deal.image_urls.map((url, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setCurrentImageIndex(idx)}
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: idx === currentImageIndex ? '3px solid #00d4ff' : '3px solid transparent',
                      cursor: 'pointer',
                      opacity: idx === currentImageIndex ? 1 : 0.6,
                      transition: 'all 0.2s'
                    }}
                  >
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
                          cursor: 'pointer'
                        }}
                        onClick={() => setDeal({ ...deal, image_url: url })}
                      >
                        <img 
                          src={url} 
                          alt="" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                border: `2px dashed ${colors.border}`,
                borderRadius: borderRadius.md,
                padding: '40px',
                textAlign: 'center'
              }}>
                <Building2 size={48} style={{ color: colors.textTertiary, margin: '0 auto 12px' }} />
                <p style={{ color: colors.textTertiary, fontSize: '14px' }}>
                  No images uploaded yet
                </p>
                {isOwner && (
                  <p style={{ color: colors.textTertiary, fontSize: '12px', marginTop: '8px' }}>
                    Click "Add Image" to upload property photos
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Pipeline & Stage */}
          <div style={{
            background: colors.surfaceCard,
            borderRadius: borderRadius.md,
            padding: spacing.lg,
            marginBottom: spacing.lg,
            boxShadow: shadows.cardElevation
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Pipeline Status
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                  Pipeline
                </Label>
                <select
                  value={deal.pipeline_id || ''}
                  onChange={(e) => handlePipelineChange(e.target.value)}
                  disabled={!isOwner}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: colors.surfaceElevated,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.sm,
                    color: colors.textPrimary,
                    fontSize: '14px',
                    cursor: isOwner ? 'pointer' : 'default'
                  }}
                >
                  <option value="">Select Pipeline</option>
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                  Stage
                </Label>
                <select
                  value={deal.pipeline_stage_id || ''}
                  onChange={(e) => handleStageChange(e.target.value)}
                  disabled={!isOwner || !deal.pipeline_id}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: colors.surfaceElevated,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.sm,
                    color: colors.textPrimary,
                    fontSize: '14px',
                    cursor: isOwner && deal.pipeline_id ? 'pointer' : 'default'
                  }}
                >
                  <option value="">Select Stage</option>
                  {(pipelines.find(p => p.id === deal.pipeline_id)?.stages || []).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {deal.pipeline_stage_id && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: 'rgba(0,184,212,0.1)',
                borderRadius: borderRadius.sm,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: pipelines.find(p => p.id === deal.pipeline_id)?.stages?.find(s => s.id === deal.pipeline_stage_id)?.color || '#00d4ff'
                }} />
                <span style={{ color: colors.textPrimary, fontWeight: '500' }}>
                  Current: {pipelines.find(p => p.id === deal.pipeline_id)?.stages?.find(s => s.id === deal.pipeline_stage_id)?.name || 'Unknown Stage'}
                </span>
              </div>
            )}
          </div>

          {/* Price Card */}
          <div style={{
            background: colors.surfaceCard,
            borderRadius: borderRadius.md,
            padding: spacing.lg,
            marginBottom: spacing.lg,
            boxShadow: shadows.cardElevation
          }}>
            <div style={{ color: colors.textTertiary, fontSize: '13px', marginBottom: '8px' }}>
              Asking Price
            </div>
            {editing ? (
              <Input
                type="number"
                value={editedDeal.asking_price || ''}
                onChange={(e) => setEditedDeal({ ...editedDeal, asking_price: parseFloat(e.target.value) })}
                style={{ fontSize: '28px', background: colors.surfaceElevated }}
              />
            ) : (
              <div style={{ color: colors.primary, fontSize: '36px', fontWeight: '700' }}>
                {formatCurrency(deal.asking_price)}
              </div>
            )}
          </div>

          {/* Property Details */}
          <div style={{
            background: colors.surfaceCard,
            borderRadius: borderRadius.md,
            padding: spacing.lg,
            marginBottom: spacing.lg,
            boxShadow: shadows.cardElevation
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Property Details
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Asset Type */}
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Asset Type</Label>
                {editing ? (
                  <select
                    value={editedDeal.asset_type || ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, asset_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      marginTop: '4px',
                      borderRadius: '6px',
                      background: colors.surfaceElevated,
                      border: `1px solid ${colors.border}`,
                      color: colors.textPrimary
                    }}
                  >
                    <option value="">Select type</option>
                    {assetTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ color: colors.textPrimary, fontWeight: '500', marginTop: '4px' }}>
                    {deal.asset_type || 'N/A'}
                  </div>
                )}
              </div>

              {/* Size */}
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Size (SF)</Label>
                {editing ? (
                  <Input
                    type="number"
                    value={editedDeal.size_sqft || ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, size_sqft: parseFloat(e.target.value) })}
                    style={{ marginTop: '4px', background: colors.surfaceElevated }}
                  />
                ) : (
                  <div style={{ color: colors.textPrimary, fontWeight: '500', marginTop: '4px' }}>
                    {deal.size_sqft ? deal.size_sqft.toLocaleString() : 'N/A'}
                  </div>
                )}
              </div>

              {/* Lot Size */}
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Lot Size (acres)</Label>
                {editing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editedDeal.lot_size || ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, lot_size: parseFloat(e.target.value) })}
                    style={{ marginTop: '4px', background: colors.surfaceElevated }}
                  />
                ) : (
                  <div style={{ color: colors.textPrimary, fontWeight: '500', marginTop: '4px' }}>
                    {deal.lot_size || 'N/A'}
                  </div>
                )}
              </div>

              {/* Year Built */}
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Year Built</Label>
                {editing ? (
                  <Input
                    type="number"
                    value={editedDeal.year_built || ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, year_built: parseInt(e.target.value) })}
                    style={{ marginTop: '4px', background: colors.surfaceElevated }}
                  />
                ) : (
                  <div style={{ color: colors.textPrimary, fontWeight: '500', marginTop: '4px' }}>
                    {deal.year_built || 'N/A'}
                  </div>
                )}
              </div>

              {/* Occupancy */}
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Occupancy (%)</Label>
                {editing ? (
                  <Input
                    type="number"
                    value={editedDeal.occupancy || ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, occupancy: parseFloat(e.target.value) })}
                    style={{ marginTop: '4px', background: colors.surfaceElevated }}
                  />
                ) : (
                  <div style={{ color: colors.textPrimary, fontWeight: '500', marginTop: '4px' }}>
                    {deal.occupancy ? `${deal.occupancy}%` : 'N/A'}
                  </div>
                )}
              </div>

              {/* Zoning */}
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Zoning</Label>
                {editing ? (
                  <Input
                    value={editedDeal.zoning || ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, zoning: e.target.value })}
                    style={{ marginTop: '4px', background: colors.surfaceElevated }}
                  />
                ) : (
                  <div style={{ color: colors.textPrimary, fontWeight: '500', marginTop: '4px' }}>
                    {deal.zoning || 'N/A'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div style={{
            background: colors.surfaceCard,
            borderRadius: borderRadius.md,
            padding: spacing.lg,
            marginBottom: spacing.lg,
            boxShadow: shadows.cardElevation
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Financial Details
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* NOI */}
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>NOI</Label>
                {editing ? (
                  <Input
                    type="number"
                    value={editedDeal.noi || ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, noi: parseFloat(e.target.value) })}
                    style={{ marginTop: '4px', background: colors.surfaceElevated }}
                  />
                ) : (
                  <div style={{ color: colors.textPrimary, fontWeight: '500', marginTop: '4px' }}>
                    {formatCurrency(deal.noi)}
                  </div>
                )}
              </div>

              {/* Cap Rate */}
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Cap Rate (%)</Label>
                {editing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editedDeal.cap_rate || ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, cap_rate: parseFloat(e.target.value) })}
                    style={{ marginTop: '4px', background: colors.surfaceElevated }}
                  />
                ) : (
                  <div style={{ color: colors.textPrimary, fontWeight: '500', marginTop: '4px' }}>
                    {deal.cap_rate ? `${deal.cap_rate}%` : 'N/A'}
                  </div>
                )}
              </div>

              {/* Annual Income */}
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Annual Income</Label>
                {editing ? (
                  <Input
                    type="number"
                    value={editedDeal.annual_income || ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, annual_income: parseFloat(e.target.value) })}
                    style={{ marginTop: '4px', background: colors.surfaceElevated }}
                  />
                ) : (
                  <div style={{ color: colors.textPrimary, fontWeight: '500', marginTop: '4px' }}>
                    {formatCurrency(deal.annual_income)}
                  </div>
                )}
              </div>

              {/* Annual Expenses */}
              <div>
                <Label style={{ color: colors.textTertiary, fontSize: '12px' }}>Annual Expenses</Label>
                {editing ? (
                  <Input
                    type="number"
                    value={editedDeal.annual_expenses || ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, annual_expenses: parseFloat(e.target.value) })}
                    style={{ marginTop: '4px', background: colors.surfaceElevated }}
                  />
                ) : (
                  <div style={{ color: colors.textPrimary, fontWeight: '500', marginTop: '4px' }}>
                    {formatCurrency(deal.annual_expenses)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={{
            background: colors.surfaceCard,
            borderRadius: borderRadius.md,
            padding: spacing.lg,
            boxShadow: shadows.cardElevation
          }}>
            <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Notes
            </h3>
            {editing ? (
              <Textarea
                value={editedDeal.notes || ''}
                onChange={(e) => setEditedDeal({ ...editedDeal, notes: e.target.value })}
                rows={5}
                style={{ background: colors.surfaceElevated, border: `1px solid ${colors.border}` }}
              />
            ) : (
              <p style={{ color: colors.textSecondary, lineHeight: '1.6' }}>
                {deal.notes || 'No notes added'}
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Contacts & Documents */}
        <div>
          {/* Linked Contacts */}
          <div style={{
            background: colors.surfaceCard,
            borderRadius: borderRadius.md,
            padding: spacing.lg,
            marginBottom: spacing.lg,
            boxShadow: shadows.cardElevation
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600' }}>
                Linked Contacts
              </h3>
              {isOwner && (
                <Button
                  onClick={() => setShowLinkContact(!showLinkContact)}
                  size="sm"
                  style={{ background: colors.primary, border: 'none' }}
                >
                  <Plus size={14} />
                </Button>
              )}
            </div>

            {showLinkContact && (
              <div style={{
                background: colors.surfaceElevated,
                borderRadius: borderRadius.sm,
                padding: '12px',
                marginBottom: '12px'
              }}>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleLinkContact(e.target.value, '');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    background: colors.surfaceCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.textPrimary
                  }}
                >
                  <option value="">Select a contact...</option>
                  {allContacts
                    .filter(c => !linkedContacts.find(lc => lc.id === c.id))
                    .map(contact => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} - {contact.company || contact.email}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {linkedContacts.length === 0 ? (
              <p style={{ color: colors.textTertiary, fontSize: '14px' }}>
                No contacts linked
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {linkedContacts.map(contact => (
                  <div
                    key={contact.id}
                    style={{
                      background: colors.surfaceElevated,
                      borderRadius: borderRadius.sm,
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ color: colors.textPrimary, fontWeight: '500' }}>
                        {contact.name}
                      </div>
                      <div style={{ color: colors.textTertiary, fontSize: '12px' }}>
                        {contact.contact_type} {contact.role && `• ${contact.role}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} style={{ color: colors.textTertiary }}>
                          <Phone size={16} />
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} style={{ color: colors.textTertiary }}>
                          <Mail size={16} />
                        </a>
                      )}
                      {isOwner && (
                        <button
                          onClick={() => handleUnlinkContact(contact.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                        >
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
          <div style={{
            background: colors.surfaceCard,
            borderRadius: borderRadius.md,
            padding: spacing.lg,
            boxShadow: shadows.cardElevation
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600' }}>
                Documents
              </h3>
            </div>

            {/* Drag and Drop Zone */}
            {isOwner && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = colors.primary;
                  e.currentTarget.style.background = 'rgba(0, 184, 212, 0.05)';
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.background = 'transparent';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.background = 'transparent';
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    handleFileUpload({ target: { files: [files[0]] } });
                  }
                }}
                style={{
                  border: `2px dashed ${colors.border}`,
                  borderRadius: borderRadius.md,
                  padding: '24px',
                  marginBottom: '16px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('file-upload-input').click()}
              >
                <input
                  id="file-upload-input"
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
                <p style={{ color: colors.textTertiary, fontSize: '12px' }}>
                  or click to browse
                </p>
                <p style={{ color: colors.textTertiary, fontSize: '11px', marginTop: '8px' }}>
                  PDF, DOC, XLS, PPT, Images (max 10MB)
                </p>
              </div>
            )}

            {documents.length === 0 ? (
              <p style={{ color: colors.textTertiary, fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>
                No documents uploaded yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {documents.map(doc => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: colors.surfaceElevated,
                      borderRadius: borderRadius.sm,
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      textDecoration: 'none',
                      color: colors.textPrimary,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = colors.surfaceElevated}
                  >
                    <FileText size={20} style={{ color: colors.primary }} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ 
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {doc.file_name}
                      </div>
                      <div style={{ color: colors.textTertiary, fontSize: '12px' }}>
                        {doc.file_type?.toUpperCase()}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealDetails;
