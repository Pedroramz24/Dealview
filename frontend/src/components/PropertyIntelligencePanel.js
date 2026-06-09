import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Edit, Save, Share2, MapPin, DollarSign, Home, Users, FileText, Calendar, ChevronLeft, ChevronRight, Upload, Download, ExternalLink, Trash2, Search, ChevronDown, ChevronUp, Loader2, Copy, Phone } from 'lucide-react';
import { getAssetTypeColor, assetTypeColors } from '../utils/assetTypeColors';
import { toast } from 'sonner';
import { formatNumberWithCommas, parseFormattedNumber } from '../utils/numberInput';
import ContactFormPanel from './ContactFormPanel';
import { supabase } from '../supabaseClient';
import { API } from '../App';

// Pipeline stage colors - matching Pipeline.js
const stageColors = {
  'need_to_contact': '#94a3b8',
  'contacted': '#60a5fa',
  'prospect': '#a78bfa',
  'negotiations': '#ec4899',
  'offer_sent': '#f59e0b',
  'under_contract': '#10b981',
  'closed_won': '#00d4aa',
  'overpriced': '#ef4444'
};

// Helper component for editable fields - defined outside to prevent re-creation on each render
const EditableField = ({ label, value, field, type = 'text', isCurrency = false, suffix = '', isEditing, editedData, setEditedData, formatPrice }) => {
  if (!isEditing) {
    let displayValue = value;
    if (isCurrency && value) {
      displayValue = formatPrice(value);
    } else if (type === 'number' && value) {
      // Display with commas when not editing
      displayValue = formatNumberWithCommas(value);
      if (suffix) displayValue = `${displayValue} ${suffix}`;
    } else if (suffix && value) {
      displayValue = `${value} ${suffix}`;
    } else if (!value) {
      displayValue = 'N/A';
    }
    
    return (
      <div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '500' }}>
          {displayValue}
        </div>
      </div>
    );
  }

  // Safety check for editedData
  if (!editedData) return null;

  const handleChange = (e) => {
    let newValue = e.target.value;
    
    // For number inputs, format with commas as user types
    if (type === 'number') {
      // Allow only digits, commas, and decimal points
      newValue = newValue.replace(/[^\d,.-]/g, '');
      
      // Format with commas
      if (newValue) {
        const formatted = formatNumberWithCommas(newValue);
        e.target.value = formatted;
        newValue = formatted;
      }
    }
    
    setEditedData({ ...editedData, [field]: newValue });
  };

  return (
    <div>
      <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>
        {label}
      </label>
      <input
        type="text"
        value={editedData[field] || ''}
        onChange={handleChange}
        className="editable-input"
        inputMode={type === 'number' ? 'decimal' : 'text'}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: '500',
          outline: 'none',
        }}
      />
    </div>
  );
};

// Helper component for editable textarea - defined outside to prevent re-creation on each render
const EditableTextarea = ({ label, value, field, isEditing, editedData, setEditedData }) => {
  if (!isEditing) {
    return (
      <div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
          {label}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.6' }}>
          {value || 'N/A'}
        </div>
      </div>
    );
  }

  // Safety check for editedData
  if (!editedData) return null;

  return (
    <div>
      <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>
        {label}
      </label>
      <textarea
        value={editedData[field] || ''}
        onChange={(e) => setEditedData({ ...editedData, [field]: e.target.value })}
        rows={4}
        className="editable-textarea"
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          color: '#FFFFFF',
          fontSize: '14px',
          lineHeight: '1.6',
          outline: 'none',
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
};

const PropertyIntelligencePanel = ({ isOpen, onClose, data, type, onCreateDeal, onDealDeleted, onUpdate }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(true); // Always editing - all fields editable
  const [editedData, setEditedData] = useState(data || {});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [linkedContacts, setLinkedContacts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showContactFormPanel, setShowContactFormPanel] = useState(false);
  const [editingContactForPanel, setEditingContactForPanel] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLLCLookup, setShowLLCLookup] = useState(false);
  const [ownerLookupExpanded, setOwnerLookupExpanded] = useState(false);
  const [ownerLookupData, setOwnerLookupData] = useState(null);
  const [ownerLookupLoading, setOwnerLookupLoading] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [editingContactData, setEditingContactData] = useState({});
  
  // Pipeline & Stage management
  const [pipelines, setPipelines] = useState([]);
  const [pipelineStages, setPipelineStages] = useState([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);

  // Custom dropdown state
  const [pipelineDropdownOpen, setPipelineDropdownOpen] = useState(false);
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);

  // Link existing contact state
  const [showLinkContactSearch, setShowLinkContactSearch] = useState(false);
  const [allContacts, setAllContacts] = useState([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  const isDeal = type === 'deal';

  useEffect(() => {
    if (data) {
      setEditedData({ ...data });
      setPipelineDropdownOpen(false);
      setStageDropdownOpen(false);
      setEditingContactId(null);
      if (isDeal && data.id) {
        fetchLinkedContacts();
        fetchDocuments();
        fetchPipelines();
      }
      
      // Debug parcel data
      if (!isDeal && data.isParcel) {
        console.log('%c=== PARCEL DATA CLICKED ===', 'background: #00d4aa; color: black; font-size: 16px; padding: 4px;');
        console.log('%cAll Available Fields:', 'color: #00d4aa; font-weight: bold;');
        console.log(Object.keys(data).sort());
        console.log('%cFull Parcel Data Object:', 'color: #00d4aa; font-weight: bold;');
        console.table(data);
        console.log('%cSearching for address fields containing "mail", "addr", "address":', 'color: yellow; font-weight: bold;');
        const addressFields = Object.keys(data).filter(key => 
          key.toLowerCase().includes('mail') || 
          key.toLowerCase().includes('addr') || 
          key.toLowerCase().includes('address')
        );
        console.log('Address-related fields found:', addressFields);
        addressFields.forEach(field => {
          console.log(`  ${field}:`, data[field]);
        });
      }
    }
  }, [data?.id, isDeal]);

  // Fetch user pipelines and stages
  const fetchPipelines = async () => {
    setLoadingPipelines(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${API}/pipelines`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch pipelines');
      
      const responseData = await response.json();
      const pipelinesData = (responseData.pipelines || []).map(pipeline => ({
        ...pipeline,
        pipeline_stages: (pipeline.stages || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      }));
      
      setPipelines(pipelinesData);
      
      // Load stages for current pipeline
      if (data.pipeline_id) {
        const currentPipeline = pipelinesData.find(p => p.id === data.pipeline_id);
        if (currentPipeline) {
          setPipelineStages(currentPipeline.pipeline_stages || []);
        }
      } else if (pipelinesData.length > 0) {
        setPipelineStages(pipelinesData[0].pipeline_stages || []);
      }
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
      toast.error('Failed to load pipelines');
    } finally {
      setLoadingPipelines(false);
    }
  };

  const fetchLinkedContacts = async () => {
    try {
      const { supabase } = await import('../supabaseClient');
      const { data: links, error } = await supabase
        .from('contact_deal_links')
        .select(`
          contact_id,
          contacts:contact_id (id, name, email, phone, company, title)
        `)
        .eq('deal_id', data.id);
      
      if (error) throw error;
      const contacts = links?.map(link => link.contacts) || [];
      setLinkedContacts(contacts);
    } catch (error) {
      console.error('Error fetching linked contacts:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const { supabase } = await import('../supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      
      const response = await fetch(`${API}/deals/${data.id}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        setDocuments(result.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleContactCreated = async (newContact) => {
    // Refresh the linked contacts list
    await fetchLinkedContacts();
    setShowContactFormPanel(false);
  };

  const handleUnlinkContact = async (contactId) => {
    if (!data?.id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`${API}/deals/${data.id}/contacts/${contactId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Contact unlinked');
        await fetchLinkedContacts();
      } else {
        toast.error('Failed to unlink contact');
      }
    } catch (err) {
      toast.error('Failed to unlink contact');
    }
  };

  const fetchAllContacts = async () => {
    setLoadingContacts(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API}/contacts`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const result = await res.json();
        setAllContacts(result.contacts || []);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleLinkExistingContact = async (contactId) => {
    if (!data?.id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`${API}/deals/${data.id}/contacts/${contactId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Contact linked');
        setShowLinkContactSearch(false);
        setContactSearchQuery('');
        await fetchLinkedContacts();
        if (onUpdate) onUpdate();
      } else {
        toast.error('Failed to link contact');
      }
    } catch (err) {
      toast.error('Failed to link contact');
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      const { supabase } = await import('../supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error('Session expired'); return; }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API}/deals/${data.id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        toast.success('Document uploaded successfully');
        fetchDocuments();
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      const { supabase } = await import('../supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { toast.error('Session expired'); return; }

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
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  if (!data) return null;

  // Support both single image (image_url) and multiple images (image_urls array)
  // Prefer editedData (reflects latest uploads/deletes) over raw data prop
  const images = (editedData.image_urls && Array.isArray(editedData.image_urls) && editedData.image_urls.length > 0)
    ? editedData.image_urls
    : (data.image_urls && Array.isArray(data.image_urls) && data.image_urls.length > 0)
    ? data.image_urls
    : data.image_url
    ? [data.image_url]
    : [];

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const calculatePricePerSQFT = () => {
    // Price per SQFT (lot) = purchase_price / (lot_size_in_acres * 43560)
    const price = parseFormattedNumber(editedData.asking_price) ?? data?.asking_price;
    const lot = parseFormattedNumber(editedData.lot_size) ?? data?.lot_size;
    if (!lot || !price) return 'N/A';
    const sqft = lot * 43560;
    const pricePerSqft = price / sqft;
    return formatPrice(pricePerSqft);
  };

  const calculatePricePerAC = () => {
    // Price per AC = purchase_price / lot_size_in_acres
    const price = parseFormattedNumber(editedData.asking_price) ?? data?.asking_price;
    const lot = parseFormattedNumber(editedData.lot_size) ?? data?.lot_size;
    if (!lot || !price) return 'N/A';
    const pricePerAc = price / lot;
    return formatPrice(pricePerAc);
  };

  const calculatePricePerSQFTBuilding = () => {
    // Price per SQFT (Building) = purchase_price / building_size
    const price = parseFormattedNumber(editedData.asking_price) ?? data?.asking_price;
    const size = parseFormattedNumber(editedData.size_sqft) ?? data?.size_sqft;
    if (!size || !price) return 'N/A';
    const pricePerSqft = price / size;
    return formatPrice(pricePerSqft);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const handleSave = async () => {
    try {
      // Parse formatted numbers back to raw numbers before saving
      const parseNumber = (value) => {
        if (!value) return null;
        return parseFormattedNumber(value);
      };
      
      const updatePayload = {
        title: editedData.title,
        address: editedData.address,
        city: editedData.city,
        state: editedData.state,
        zip_code: editedData.zip_code,
        asset_type: editedData.asset_type,
        asking_price: parseNumber(editedData.asking_price),
        size_sqft: parseNumber(editedData.size_sqft),
        lot_size: parseNumber(editedData.lot_size),
        year_built: parseNumber(editedData.year_built),
        description: editedData.description,
        cap_rate: parseNumber(editedData.cap_rate),
        noi: parseNumber(editedData.noi),
        annual_income: parseNumber(editedData.annual_income),
        annual_expenses: parseNumber(editedData.annual_expenses),
        zoning: editedData.zoning,
        occupancy: parseNumber(editedData.occupancy),
        parking_spaces: parseNumber(editedData.parking_spaces),
        key_features: editedData.key_features,
        lease_type: editedData.lease_type,
        notes: editedData.notes,
      };

      // Remove undefined/null fields
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) delete updatePayload[key];
      });

      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${API}/deals/${data.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      
      if (!response.ok) throw new Error('Failed to save changes');

      const result = await response.json();
      toast.success('Deal updated successfully');
      
      // Merge saved fields back into local data reference and editedData
      const mergedData = { ...editedData, ...updatePayload };
      setEditedData(prev => ({ ...prev, ...mergedData }));
      if (data && data.id) {
        Object.assign(data, mergedData);
      }
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving deal:', error);
      toast.error('Failed to save changes');
    }
  };

  const handleShare = () => {
    if (data && data.id) {
      const shareUrl = `${window.location.origin}/share/${data.id}`;
      navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard');
    } else {
      toast.error('Cannot share this item');
    }
  };

  const handleDelete = async () => {
    if (!data || !data.id) {
      toast.error('Cannot delete this property');
      return;
    }

    try {
      const { supabase } = await import('../supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error('Session expired, please log in again');
        return;
      }

      const response = await fetch(`${API}/deals/${data.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete deal');
      }

      toast.success('Property deleted successfully');
      setShowDeleteConfirm(false);
      onClose();
      
      if (onDealDeleted) {
        onDealDeleted(data.id);
      } else if (window.location.pathname.includes('/deals/')) {
        navigate('/deals');
      }
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error(error.message || 'Failed to delete property');
    }
  };

  const handleOwnerLookup = async () => {
    const ownerName = data.owner || data.owner_name || data.ownername;
    
    if (!ownerName) {
      toast.error('No owner name available');
      return;
    }

    setOwnerLookupLoading(true);
    setOwnerLookupExpanded(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      console.log('[Owner Lookup] Searching for:', ownerName);
      
      const response = await fetch(
        `${API}/llc/lookup?owner_name=${encodeURIComponent(ownerName)}&state=TX&find_phone=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('[Owner Lookup] Results:', data);
        setOwnerLookupData(data.result);
        toast.success(data.result.cached ? 'Owner info loaded (cached)' : 'Owner info found!');
      } else {
        const error = await response.text();
        console.error('[Owner Lookup] Failed:', error);
        toast.error('Owner information not found');
        setOwnerLookupData(null);
      }
    } catch (error) {
      console.error('[Owner Lookup] Error:', error);
      toast.error('Failed to lookup owner');
      setOwnerLookupData(null);
    } finally {
      setOwnerLookupLoading(false);
    }
  };

  const handleSelectPipeline = async (newPipelineId) => {
    setPipelineDropdownOpen(false);
    setEditedData(prev => ({ ...prev, pipeline_id: newPipelineId, pipeline_stage_id: null }));
    
    const selectedPipeline = pipelines.find(p => p.id === newPipelineId);
    if (selectedPipeline) {
      setPipelineStages(selectedPipeline.pipeline_stages || []);
    }
    
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${API}/deals/${data.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_id: newPipelineId, pipeline_stage_id: null })
      });
      if (!response.ok) throw new Error('Failed to update pipeline');
      Object.assign(data, { pipeline_id: newPipelineId, pipeline_stage_id: null });
      toast.success('Pipeline updated');
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to update pipeline:', err);
      toast.error('Failed to update pipeline');
      setEditedData(prev => ({ ...prev, pipeline_id: data.pipeline_id }));
    }
  };

  const handleSelectStage = async (newStageId) => {
    setStageDropdownOpen(false);
    setEditedData(prev => ({ ...prev, pipeline_stage_id: newStageId }));
    
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${API}/deals/${data.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage_id: newStageId })
      });
      if (!response.ok) throw new Error('Failed to update stage');
      Object.assign(data, { pipeline_stage_id: newStageId });
      toast.success('Stage updated');
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to update stage:', err);
      toast.error('Failed to update stage');
      setEditedData(prev => ({ ...prev, pipeline_stage_id: data.pipeline_stage_id }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !data?.id) return;
    setIsUploadingImage(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API}/deals/${data.id}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        const result = await response.json();
        const updatedImages = result.image_urls;
        Object.assign(data, { image_urls: updatedImages, image_url: updatedImages[0] || null });
        setEditedData(prev => ({ ...prev, image_urls: updatedImages, image_url: updatedImages[0] || null }));
        setCurrentImageIndex(updatedImages.length - 1);
        toast.success('Image uploaded');
        // Note: no onUpdate() here — editedData is already updated; calling onUpdate() would
        // re-fetch and overwrite any unsaved field edits the user has in progress.
      } else {
        toast.error('Failed to upload image');
      }
    } catch (err) {
      console.error('Image upload error:', err);
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (index) => {
    if (!data?.id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`${API}/deals/${data.id}/images/${index}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        const updatedImages = result.image_urls;
        const newIndex = Math.max(0, Math.min(currentImageIndex, updatedImages.length - 1));
        setCurrentImageIndex(newIndex);
        Object.assign(data, { image_urls: updatedImages, image_url: updatedImages[0] || null });
        setEditedData(prev => ({ ...prev, image_urls: updatedImages, image_url: updatedImages[0] || null }));
        toast.success('Image removed');
        // Note: no onUpdate() — editedData already updated in-place.
      } else {
        toast.error('Failed to remove image');
      }
    } catch (err) {
      console.error('Delete image error:', err);
      toast.error('Failed to remove image');
    }
  };

  const handleToggleVisibility = async () => {
    if (!data?.id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const isCurrentlyShared = !!editedData.team_id;
      const response = await fetch(`${API}/deals/${data.id}/visibility`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_with_team: !isCurrentlyShared })
      });
      if (response.ok) {
        const result = await response.json();
        const newTeamId = result.deal?.team_id ?? null;
        Object.assign(data, { team_id: newTeamId });
        setEditedData(prev => ({ ...prev, team_id: newTeamId }));
        toast.success(newTeamId ? 'Shared with team' : 'Set to private');
        if (onUpdate) onUpdate();
      } else {
        toast.error('Failed to toggle visibility');
      }
    } catch (err) {
      console.error('Visibility toggle error:', err);
      toast.error('Failed to toggle visibility');
    }
  };

  const handleEditContact = (contact) => {
    setEditingContactForPanel(contact);
    setShowContactFormPanel(true);
  };

  const handleSaveContact = async (contactId) => {
    try {
      const { supabase: sb } = await import('../supabaseClient');
      const { error } = await sb.from('contacts').update({
        name: editingContactData.name,
        email: editingContactData.email,
        phone: editingContactData.phone,
        company: editingContactData.company,
      }).eq('id', contactId);
      if (error) throw error;
      toast.success('Contact updated');
      setEditingContactId(null);
      fetchLinkedContacts();
    } catch (err) {
      console.error('Contact save error:', err);
      toast.error('Failed to update contact');
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <>
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: isOpen ? 0 : '-500px',
        width: '500px',
        height: '100vh',
        background: 'rgba(11, 12, 14, 0.95)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1050,
        transition: 'right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header with close button */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2
          style={{
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: '600',
            letterSpacing: '-0.02em',
          }}
        >
          {isDeal ? 'Deal Details' : 'Property Intelligence'}
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Save button for deals - always visible */}
          {isDeal && (
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: '#ff0000',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          )}
          {/* Create Deal button for parcels */}
          {!isDeal && onCreateDeal && (
            <button
              onClick={() => onCreateDeal(data)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: '#ff0000',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Home className="w-4 h-4" />
              Create Deal
            </button>
          )}
          {/* Visibility toggle for deals */}
          {isDeal && (
            <button
              onClick={handleToggleVisibility}
              data-testid="panel-visibility-toggle"
              title={editedData.team_id ? 'Make Private' : 'Share with Team'}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: editedData.team_id ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${editedData.team_id ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                color: editedData.team_id ? '#10b981' : 'rgba(255,255,255,0.6)',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 150ms ease',
              }}
            >
              <Users size={12} />
              {editedData.team_id ? 'Team' : 'Private'}
            </button>
          )}
          {isDeal && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              data-testid="panel-delete-deal"
              title="Delete deal"
              style={{
                width: '32px', height: '32px', borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'rgba(255, 255, 255, 0.4)', transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0, // Critical for flex scrolling
        }}
        className="custom-scrollbar"
        onClick={(e) => {
          // Close dropdowns when clicking outside them
          if (!e.target.closest('[data-testid="pipeline-dropdown-trigger"]') && !e.target.closest('[data-testid="pipeline-dropdown-options"]')) {
            setPipelineDropdownOpen(false);
          }
          if (!e.target.closest('[data-testid="stage-dropdown-trigger"]') && !e.target.closest('[data-testid="stage-dropdown-options"]')) {
            setStageDropdownOpen(false);
          }
        }}
      >
        {/* Image Carousel */}
        {images.length > 0 && (
          <div 
            style={{ position: 'relative', width: '100%', height: '280px', background: '#000' }}
            className="property-image-carousel"
          >
            <img
              src={images[currentImageIndex]}
              alt="Property"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {/* Delete current image button */}
            {isDeal && (
              <button
                data-testid={`panel-delete-image-${currentImageIndex}`}
                onClick={() => handleDeleteImage(currentImageIndex)}
                title="Remove this image"
                style={{
                  position: 'absolute', top: '10px', right: '10px',
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.85)', backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(239,68,68,0.5)', color: '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 20, transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'rgba(239,68,68,1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(239,68,68,0.85)'; }}
              >
                <Trash2 size={14} />
              </button>
            )}
            {/* Image counter badge */}
            {images.length > 1 && (
              <div style={{
                position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                padding: '4px 12px', borderRadius: '20px', color: 'white', fontSize: '12px', fontWeight: '600', zIndex: 10,
              }}>
                {currentImageIndex + 1} / {images.length}
              </div>
            )}
            {images.length > 1 && (
              <>
                {/* Left Arrow - More visible on hover */}
                <button
                  onClick={prevImage}
                  className="carousel-nav-button carousel-nav-left"
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    opacity: 0.6,
                    zIndex: 10,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.background = 'rgba(255, 0, 0, 0.9)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 0, 0, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.6';
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <ChevronLeft size={24} strokeWidth={3} />
                </button>
                
                {/* Right Arrow - More visible on hover */}
                <button
                  onClick={nextImage}
                  className="carousel-nav-button carousel-nav-right"
                  style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    opacity: 0.6,
                    zIndex: 10,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.background = 'rgba(255, 0, 0, 0.9)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 0, 0, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.6';
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <ChevronRight size={24} strokeWidth={3} />
                </button>
              </>
            )}
          </div>
        )}

        {/* Thumbnail strip */}
        {isDeal && images.length > 1 && (
          <div style={{
            display: 'flex', gap: '6px', padding: '8px 16px',
            overflowX: 'auto', background: 'rgba(0,0,0,0.6)',
          }}>
            {images.map((url, idx) => (
              <div
                key={url}
                style={{ position: 'relative', flexShrink: 0 }}
              >
                <div
                  onClick={() => setCurrentImageIndex(idx)}
                  style={{
                    width: '56px', height: '44px', borderRadius: '6px', overflow: 'hidden',
                    border: idx === currentImageIndex ? '2px solid #ff0000' : '2px solid transparent',
                    cursor: 'pointer', opacity: idx === currentImageIndex ? 1 : 0.55,
                    transition: 'all 0.15s',
                  }}
                >
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <button
                  data-testid={`panel-thumb-delete-${idx}`}
                  onClick={(e) => { e.stopPropagation(); handleDeleteImage(idx); }}
                  title="Remove image"
                  style={{
                    position: 'absolute', top: '-6px', right: '-6px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: '#ef4444', border: 'none',
                    color: '#fff', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 5,
                    fontSize: '10px', fontWeight: '700',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Image Upload */}
        {isDeal && (
          <div style={{ padding: images.length > 0 ? '8px 24px 0' : '24px 24px 0' }}>
            {images.length === 0 && (
              <div style={{
                height: '120px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: '8px', marginBottom: '8px'
              }}>
                <Upload size={20} style={{ color: 'rgba(255,255,255,0.2)' }} />
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>No images yet</span>
              </div>
            )}
            <label
              htmlFor="panel-image-upload"
              data-testid="panel-image-upload-btn"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px 12px', background: 'rgba(255, 0, 0, 0.08)', border: '1px solid rgba(255, 0, 0, 0.2)',
                borderRadius: '6px', color: '#ff0000', fontSize: '12px', fontWeight: '600',
                cursor: isUploadingImage ? 'not-allowed' : 'pointer', width: '100%',
                opacity: isUploadingImage ? 0.6 : 1, transition: 'all 150ms ease',
              }}
            >
              <Upload size={13} />
              {isUploadingImage ? 'Uploading...' : 'Add Image'}
              <input
                id="panel-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploadingImage}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}

        <div style={{ padding: '24px' }}>
          {/* Core Summary */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <MapPin size={16} style={{ color: '#ff0000' }} />
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isDeal ? 'Property Details' : 'Parcel Address'}
              </span>
            </div>
            
            {isDeal && isEditing ? (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={editedData.title || ''}
                    onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                    className="editable-input"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '18px',
                      fontWeight: '600',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>
                    Address
                  </label>
                  <input
                    type="text"
                    value={editedData.address || ''}
                    onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
                    className="editable-input"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '16px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>
                      City
                    </label>
                    <input
                      type="text"
                      value={editedData.city || ''}
                      onChange={(e) => setEditedData({ ...editedData, city: e.target.value })}
                      className="editable-input"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>
                      State
                    </label>
                    <input
                      type="text"
                      value={editedData.state || ''}
                      onChange={(e) => setEditedData({ ...editedData, state: e.target.value })}
                      className="editable-input"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>
                      ZIP
                    </label>
                    <input
                      type="text"
                      value={editedData.zip_code || ''}
                      onChange={(e) => setEditedData({ ...editedData, zip_code: e.target.value })}
                      className="editable-input"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Asset Type Selector */}
                <div style={{ marginTop: '12px' }}>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>
                    Asset Type
                  </label>
                  <select
                    data-testid="panel-asset-type-select"
                    value={editedData.asset_type || ''}
                    onChange={(e) => setEditedData({ ...editedData, asset_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${editedData.asset_type ? getAssetTypeColor(editedData.asset_type).border : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '6px',
                      color: editedData.asset_type ? getAssetTypeColor(editedData.asset_type).color : 'rgba(255,255,255,0.4)',
                      fontSize: '14px',
                      fontWeight: '600',
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'auto',
                    }}
                  >
                    <option value="">Select asset type...</option>
                    {Object.keys(assetTypeColors).map(type => (
                      <option key={type} value={type} style={{ background: '#1a1a1e', color: '#fff' }}>{type}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '600', marginBottom: '8px', lineHeight: '1.3' }}>
                  {isDeal ? (data.title || data.address) : (data.address || data.property_address || data.addr || 'Address not available')}
                </h3>
                {isDeal && data.address && data.address !== data.title && (
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '12px' }}>
                    {data.address}
                    {data.city && `, ${data.city}`}
                    {data.state && `, ${data.state}`}
                    {data.zip_code && ` ${data.zip_code}`}
                  </div>
                )}
              </>
            )}
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              {isDeal && (editedData.asset_type || data.asset_type) && (
                <span
                  style={{
                    padding: '6px 12px',
                    background: getAssetTypeColor(editedData.asset_type || data.asset_type).bg,
                    color: getAssetTypeColor(editedData.asset_type || data.asset_type).color,
                    border: `1px solid ${getAssetTypeColor(editedData.asset_type || data.asset_type).border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {editedData.asset_type || data.asset_type}
                </span>
              )}
              {isDeal && data.pipeline_stage_id && pipelineStages.length > 0 && (
                <span
                  style={{
                    padding: '6px 12px',
                    background: pipelineStages.find(s => s.id === data.pipeline_stage_id)?.color || stageColors[data.stage] || '#94a3b8',
                    color: '#FFFFFF',
                    border: `1px solid ${pipelineStages.find(s => s.id === data.pipeline_stage_id)?.color || stageColors[data.stage] || '#94a3b8'}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    boxShadow: `0 0 12px ${pipelineStages.find(s => s.id === data.pipeline_stage_id)?.color || stageColors[data.stage] || '#94a3b8'}40`
                  }}
                >
                  {pipelineStages.find(s => s.id === data.pipeline_stage_id)?.name || data.stage?.replace(/_/g, ' ') || 'No Stage'}
              </span>
            )}
            {!isDeal && data.parcel_id && (
              <span
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255, 0, 0, 0.1)',
                  color: '#ff0000',
                  border: '1px solid rgba(255, 0, 0, 0.3)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  fontFamily: 'monospace'
                }}
              >
                ID: {data.parcel_id}
              </span>
            )}
            {!isDeal && data.land_use_class && (
              <span
                style={{
                  padding: '6px 12px',
                  background: 'rgba(0, 212, 170, 0.1)',
                  color: '#00d4aa',
                  border: '1px solid rgba(0, 212, 170, 0.3)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                {data.land_use_class}
              </span>
            )}
          </div>

          {/* Pipeline & Stage Selectors - Custom Dropdowns */}
          {isDeal && (
            <div style={{ marginTop: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Pipeline Selector */}
              <div style={{ position: 'relative' }}>
                <div style={{ 
                  color: '#ff0000', 
                  fontSize: '11px', 
                  marginBottom: '8px', 
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                  PIPELINE
                </div>
                <button
                  data-testid="pipeline-dropdown-trigger"
                  onClick={() => { setPipelineDropdownOpen(!pipelineDropdownOpen); setStageDropdownOpen(false); }}
                  disabled={loadingPipelines || pipelines.length === 0}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${pipelineDropdownOpen ? '#ff0000' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s',
                    opacity: loadingPipelines ? 0.5 : 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textAlign: 'left',
                    boxShadow: pipelineDropdownOpen ? '0 0 0 3px rgba(255, 0, 0, 0.15)' : 'none',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {loadingPipelines ? 'Loading...' : (pipelines.find(p => p.id === (editedData.pipeline_id || data.pipeline_id))?.name || 'Select Pipeline')}
                  </span>
                  <ChevronDown size={14} style={{ flexShrink: 0, transform: pipelineDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {pipelineDropdownOpen && pipelines.length > 0 && (
                  <div data-testid="pipeline-dropdown-options" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                    background: '#1a1a1e', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px',
                    maxHeight: '200px', overflowY: 'auto', zIndex: 9999,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                  }}>
                    {pipelines.map(pipeline => (
                      <div
                        key={pipeline.id}
                        data-testid={`pipeline-option-${pipeline.id}`}
                        onClick={() => handleSelectPipeline(pipeline.id)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', fontSize: '14px',
                          color: pipeline.id === (editedData.pipeline_id || data.pipeline_id) ? '#ff0000' : '#fff',
                          background: pipeline.id === (editedData.pipeline_id || data.pipeline_id) ? 'rgba(255, 0, 0, 0.08)' : 'transparent',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { if (pipeline.id !== (editedData.pipeline_id || data.pipeline_id)) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                        onMouseLeave={(e) => { if (pipeline.id !== (editedData.pipeline_id || data.pipeline_id)) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {pipeline.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stage Selector */}
              <div style={{ position: 'relative' }}>
                <div style={{ 
                  color: '#ff0000', 
                  fontSize: '11px', 
                  marginBottom: '8px', 
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                  STAGE
                </div>
                <button
                  data-testid="stage-dropdown-trigger"
                  onClick={() => { setStageDropdownOpen(!stageDropdownOpen); setPipelineDropdownOpen(false); }}
                  disabled={!editedData.pipeline_id && !data.pipeline_id}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${stageDropdownOpen ? '#ff0000' : 'rgba(255, 255, 255, 0.15)'}`,
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s',
                    opacity: (!editedData.pipeline_id && !data.pipeline_id) ? 0.5 : 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textAlign: 'left',
                    boxShadow: stageDropdownOpen ? '0 0 0 3px rgba(255, 0, 0, 0.15)' : 'none',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    {(() => {
                      const currentStage = pipelineStages.find(s => s.id === (editedData.pipeline_stage_id || data.pipeline_stage_id));
                      if (currentStage) {
                        return (
                          <>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: currentStage.color || '#94a3b8', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentStage.name}</span>
                          </>
                        );
                      }
                      return <span style={{ color: 'rgba(255,255,255,0.4)' }}>{pipelineStages.length === 0 ? 'Select a pipeline first' : 'Select Stage'}</span>;
                    })()}
                  </span>
                  <ChevronDown size={14} style={{ flexShrink: 0, transform: stageDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>
                {stageDropdownOpen && pipelineStages.length > 0 && (
                  <div data-testid="stage-dropdown-options" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                    background: '#1a1a1e', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px',
                    maxHeight: '200px', overflowY: 'auto', zIndex: 9999,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                  }}>
                    {pipelineStages.map(stage => (
                      <div
                        key={stage.id}
                        data-testid={`stage-option-${stage.id}`}
                        onClick={() => handleSelectStage(stage.id)}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', fontSize: '14px',
                          display: 'flex', alignItems: 'center', gap: '8px',
                          color: stage.id === (editedData.pipeline_stage_id || data.pipeline_stage_id) ? '#ff0000' : '#fff',
                          background: stage.id === (editedData.pipeline_stage_id || data.pipeline_stage_id) ? 'rgba(255, 0, 0, 0.08)' : 'transparent',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { if (stage.id !== (editedData.pipeline_stage_id || data.pipeline_stage_id)) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                        onMouseLeave={(e) => { if (stage.id !== (editedData.pipeline_stage_id || data.pipeline_stage_id)) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color || '#94a3b8', flexShrink: 0 }} />
                        {stage.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          </div>

          {/* Parcel Owner Information - Only for parcels */}
          {!isDeal && (
            <div
              style={{
                marginBottom: '24px',
                padding: '20px',
                background: 'rgba(0, 212, 170, 0.05)',
                border: '1px solid rgba(0, 212, 170, 0.15)',
                borderRadius: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Users size={16} style={{ color: '#00d4aa' }} />
                <span style={{ color: '#00d4aa', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Owner Information
                </span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase' }}>
                    Owner Name
                  </div>
                  {/* Find Owner button - for ALL owners, not just LLCs */}
                  {(data.owner || data.owner_name || data.ownername) && (
                    <button
                      onClick={handleOwnerLookup}
                      disabled={ownerLookupLoading}
                      style={{
                        padding: '4px 10px',
                        background: ownerLookupExpanded 
                          ? 'linear-gradient(135deg, rgba(255, 0, 0, 0.25), rgba(255, 0, 0, 0.15))'
                          : 'linear-gradient(135deg, rgba(255, 0, 0, 0.15), rgba(255, 0, 0, 0.08))',
                        border: '1px solid rgba(255, 0, 0, 0.3)',
                        borderRadius: '6px',
                        color: '#ff0000',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: ownerLookupLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                        opacity: ownerLookupLoading ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!ownerLookupLoading) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 0, 0.25), rgba(255, 0, 0, 0.15))';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!ownerLookupExpanded && !ownerLookupLoading) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 0, 0, 0.15), rgba(255, 0, 0, 0.08))';
                        }
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {ownerLookupLoading ? (
                        <><Loader2 style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite' }} /> Searching...</>
                      ) : (
                        <><Search style={{ width: '12px', height: '12px' }} /> Find Owner</>
                      )}
                    </button>
                  )}
                </div>
                <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '500' }}>
                  {data.owner || data.owner_name || data.ownername || 'N/A'}
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Mailing Address
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', lineHeight: '1.5' }}>
                  {/* Try all possible mailing address field variations */}
                  {data.mail_addr || 
                   data.mail_address || 
                   data.owner_addr || 
                   data.owner_address || 
                   data.owneraddr ||
                   data.situs_addr ||
                   data.situs_address ||
                   'N/A'}
                  {(data.owner_city || data.owner_state || data.owner_zip || 
                    data.mail_city || data.mail_state || data.mail_zip) && (
                    <>
                      <br />
                      {[
                        data.owner_city || data.mail_city, 
                        data.owner_state || data.mail_state, 
                        data.owner_zip || data.mail_zip
                      ].filter(Boolean).join(', ')}
                    </>
                  )}
                </div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  County ID
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontFamily: 'monospace' }}>
                  {data.county_id || data.fips || data.countyfips || data.county_fips || 'N/A'}
                </div>
              </div>

              {/* Inline Owner Lookup Results */}
              {ownerLookupExpanded && (
                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  background: 'linear-gradient(145deg, rgba(255, 0, 0, 0.08), rgba(255, 0, 0, 0.04))',
                  border: '1px solid rgba(255, 0, 0, 0.25)',
                  borderRadius: '10px',
                  animation: 'fadeSlideIn 0.3s ease-out'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Search style={{ color: '#ff0000', width: '14px', height: '14px' }} />
                      <span style={{ color: '#ff0000', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                        Enhanced Owner Lookup
                      </span>
                    </div>
                    <button
                      onClick={() => setOwnerLookupExpanded(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.5)',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <ChevronUp style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>

                  {ownerLookupLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255, 255, 255, 0.6)' }}>
                      <Loader2 style={{ width: '24px', height: '24px', margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
                      <div style={{ fontSize: '13px' }}>Searching databases...</div>
                    </div>
                  ) : ownerLookupData ? (
                    <div>
                      {/* Entity Type & Status */}
                      <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          <div style={{
                            padding: '4px 10px',
                            background: 'rgba(139, 92, 246, 0.15)',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: '700',
                            color: '#a78bfa',
                            textTransform: 'uppercase'
                          }}>
                            {ownerLookupData.entity_type}
                          </div>
                          {ownerLookupData.current_status && (
                            <div style={{
                              padding: '4px 10px',
                              background: ownerLookupData.current_status.toLowerCase().includes('active')
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(107, 114, 128, 0.15)',
                              border: `1px solid ${ownerLookupData.current_status.toLowerCase().includes('active') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`,
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: '700',
                              color: ownerLookupData.current_status.toLowerCase().includes('active') ? '#10b981' : '#9ca3af',
                              textTransform: 'uppercase'
                            }}>
                              {ownerLookupData.current_status}
                            </div>
                          )}
                          {ownerLookupData.cached && (
                            <div style={{
                              padding: '4px 8px',
                              background: 'rgba(245, 158, 11, 0.15)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: '6px',
                              fontSize: '9px',
                              fontWeight: '700',
                              color: '#f59e0b',
                              textTransform: 'uppercase'
                            }}>
                              Cached
                            </div>
                          )}
                        </div>
                        {ownerLookupData.incorporation_date && (
                          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px' }}>
                            Incorporated: {new Date(ownerLookupData.incorporation_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {/* Registered Agent */}
                      {ownerLookupData.registered_agent && (ownerLookupData.registered_agent.name || ownerLookupData.registered_agent.address) && (
                        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '10px' }}>
                            Registered Agent
                          </div>
                          {ownerLookupData.registered_agent.name && (
                            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px', marginBottom: '2px' }}>Name</div>
                                <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                                  {ownerLookupData.registered_agent.name}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(ownerLookupData.registered_agent.name);
                                  toast.success('Copied to clipboard');
                                }}
                                style={{
                                  padding: '4px 8px',
                                  background: 'rgba(255, 0, 0, 0.1)',
                                  border: '1px solid rgba(255, 0, 0, 0.2)',
                                  borderRadius: '6px',
                                  color: '#ff0000',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Copy style={{ width: '10px', height: '10px' }} />
                              </button>
                            </div>
                          )}
                          {ownerLookupData.registered_agent.address && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px', marginBottom: '2px' }}>Address</div>
                                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', lineHeight: '1.4' }}>
                                  {ownerLookupData.registered_agent.address}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(ownerLookupData.registered_agent.address);
                                  toast.success('Copied to clipboard');
                                }}
                                style={{
                                  padding: '4px 8px',
                                  background: 'rgba(255, 0, 0, 0.1)',
                                  border: '1px solid rgba(255, 0, 0, 0.2)',
                                  borderRadius: '6px',
                                  color: '#ff0000',
                                  fontSize: '10px',
                                  cursor: 'pointer',
                                  marginLeft: '8px',
                                  flexShrink: 0
                                }}
                              >
                                <Copy style={{ width: '10px', height: '10px' }} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Phone Numbers */}
                      {ownerLookupData.phone_numbers && ownerLookupData.phone_numbers.length > 0 && (
                        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '10px' }}>
                            📞 Phone Numbers
                          </div>
                          {ownerLookupData.phone_numbers.map((phone, idx) => {
                            const confidenceColors = {
                              high: '#10b981',
                              medium: '#f59e0b',
                              low: '#9ca3af'
                            };
                            const color = confidenceColors[phone.confidence] || '#9ca3af';
                            
                            return (
                              <div key={phone.number || idx} style={{
                                marginBottom: '8px',
                                padding: '10px 12px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: `1px solid ${color}20`,
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                                    <Phone style={{ color: color, width: '12px', height: '12px' }} />
                                    <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                                      {phone.number}
                                    </span>
                                    <div style={{
                                      padding: '2px 6px',
                                      background: `${color}15`,
                                      border: `1px solid ${color}30`,
                                      borderRadius: '4px',
                                      fontSize: '9px',
                                      fontWeight: '700',
                                      color: color,
                                      textTransform: 'uppercase'
                                    }}>
                                      {phone.confidence}
                                    </div>
                                  </div>
                                  <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '10px', marginLeft: '20px' }}>
                                    {phone.source}
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(phone.number);
                                    toast.success('Phone copied');
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    background: `${color}15`,
                                    border: `1px solid ${color}30`,
                                    borderRadius: '6px',
                                    color: color,
                                    fontSize: '10px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Copy style={{ width: '10px', height: '10px' }} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Officers */}
                      {ownerLookupData.officers && ownerLookupData.officers.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '10px' }}>
                            Officers & Directors
                          </div>
                          {ownerLookupData.officers.slice(0, 5).map((officer, idx) => (
                            <div key={officer.name || idx} style={{
                              marginBottom: '6px',
                              padding: '8px 10px',
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              borderRadius: '6px',
                              fontSize: '12px'
                            }}>
                              <div style={{ color: '#ffffff', fontWeight: '600', marginBottom: '2px' }}>
                                {officer.name}
                              </div>
                              {officer.position && (
                                <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px' }}>
                                  {officer.position}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Links */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {ownerLookupData.opencorporates_url && (
                          <a
                            href={ownerLookupData.opencorporates_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '6px 10px',
                              background: 'rgba(255, 0, 0, 0.1)',
                              border: '1px solid rgba(255, 0, 0, 0.2)',
                              borderRadius: '6px',
                              color: '#ff0000',
                              fontSize: '11px',
                              fontWeight: '600',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <ExternalLink style={{ width: '11px', height: '11px' }} />
                            OpenCorporates
                          </a>
                        )}
                        {ownerLookupData.registry_url && (
                          <a
                            href={ownerLookupData.registry_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '6px 10px',
                              background: 'rgba(139, 92, 246, 0.1)',
                              border: '1px solid rgba(139, 92, 246, 0.2)',
                              borderRadius: '6px',
                              color: '#a78bfa',
                              fontSize: '11px',
                              fontWeight: '600',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <ExternalLink style={{ width: '11px', height: '11px' }} />
                            State Registry
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>
                      No additional owner information found
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Financial Overview */}
          <div
            style={{
              marginBottom: '24px',
              padding: '20px',
              background: 'rgba(255, 0, 0, 0.05)',
              border: '1px solid rgba(255, 0, 0, 0.15)',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <DollarSign size={16} style={{ color: '#ff0000' }} />
              <span style={{ color: '#ff0000', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isDeal ? 'Financial Overview' : 'Valuation & Sales'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {isDeal ? (
                <>
                  <EditableField 
                    label="Asking Price" 
                    value={editedData.asking_price} 
                    field="asking_price" 
                    type="number" 
                    isCurrency={true}
                    isEditing={isEditing}
                    editedData={editedData}
                    setEditedData={setEditedData}
                    formatPrice={formatPrice}
                  />
                  <EditableField 
                    label="Lot Size" 
                    value={editedData.lot_size} 
                    field="lot_size" 
                    type="number" 
                    suffix="AC"
                    isEditing={isEditing}
                    editedData={editedData}
                    setEditedData={setEditedData}
                    formatPrice={formatPrice}
                  />
                  <EditableField 
                    label="Building Size" 
                    value={editedData.size_sqft} 
                    field="size_sqft" 
                    type="number" 
                    suffix="SF"
                    isEditing={isEditing}
                    editedData={editedData}
                    setEditedData={setEditedData}
                    formatPrice={formatPrice}
                  />
                  
                  {/* Price per SQFT Calculations - Read Only */}
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Price per SQFT (Lot)
                    </div>
                    <div style={{ color: '#00d4aa', fontSize: '16px', fontWeight: '600' }}>
                      {calculatePricePerSQFT()}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Price per SQFT (Building)
                    </div>
                    <div style={{ color: '#00d4aa', fontSize: '16px', fontWeight: '600' }}>
                      {calculatePricePerSQFTBuilding()}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Price per AC
                    </div>
                    <div style={{ color: '#00d4aa', fontSize: '16px', fontWeight: '600' }}>
                      {calculatePricePerAC()}
                    </div>
                  </div>
                  
                  <EditableField 
                    label="Cap Rate" 
                    value={editedData.cap_rate} 
                    field="cap_rate" 
                    type="number" 
                    suffix="%"
                    isEditing={isEditing}
                    editedData={editedData}
                    setEditedData={setEditedData}
                    formatPrice={formatPrice}
                  />
                  <EditableField 
                    label="NOI" 
                    value={editedData.noi} 
                    field="noi" 
                    type="number" 
                    isCurrency={true}
                    isEditing={isEditing}
                    editedData={editedData}
                    setEditedData={setEditedData}
                    formatPrice={formatPrice}
                  />
                  <EditableField 
                    label="Annual Income" 
                    value={editedData.annual_income} 
                    field="annual_income" 
                    type="number" 
                    isCurrency={true}
                    isEditing={isEditing}
                    editedData={editedData}
                    setEditedData={setEditedData}
                    formatPrice={formatPrice}
                  />
                  <EditableField 
                    label="Annual Expenses" 
                    value={editedData.annual_expenses} 
                    field="annual_expenses" 
                    type="number" 
                    isCurrency={true}
                    isEditing={isEditing}
                    editedData={editedData}
                    setEditedData={setEditedData}
                    formatPrice={formatPrice}
                  />
                  <EditableField 
                    label="Year Built" 
                    value={editedData.year_built} 
                    field="year_built" 
                    type="number"
                    isEditing={isEditing}
                    editedData={editedData}
                    setEditedData={setEditedData}
                    formatPrice={formatPrice}
                  />
                  <EditableField 
                    label="Parking Spaces" 
                    value={editedData.parking_spaces} 
                    field="parking_spaces" 
                    type="number"
                    isEditing={isEditing}
                    editedData={editedData}
                    setEditedData={setEditedData}
                    formatPrice={formatPrice}
                  />
                  <EditableField 
                    label="Occupancy" 
                    value={editedData.occupancy} 
                    field="occupancy" 
                    type="number" 
                    suffix="%"
                    isEditing={isEditing}
                    editedData={editedData}
                    setEditedData={setEditedData}
                    formatPrice={formatPrice}
                  />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <EditableField 
                      label="Zoning" 
                      value={editedData.zoning} 
                      field="zoning" 
                      type="text"
                      isEditing={isEditing}
                      editedData={editedData}
                      setEditedData={setEditedData}
                      formatPrice={formatPrice}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <EditableField 
                      label="Lease Type" 
                      value={editedData.lease_type} 
                      field="lease_type" 
                      type="text"
                      isEditing={isEditing}
                      editedData={editedData}
                      setEditedData={setEditedData}
                      formatPrice={formatPrice}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Market Value
                    </div>
                    <div style={{ color: '#00d4aa', fontSize: '18px', fontWeight: '700' }}>
                      {formatPrice(data.mkt_val_tot || data.market_value)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Last Sale Price
                    </div>
                    <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '500' }}>
                      {formatPrice(data.sale_price || data.last_sale_price)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Land Value
                    </div>
                    <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '500' }}>
                      {formatPrice(data.land_val || data.land_value)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Improvement Value
                    </div>
                    <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '500' }}>
                      {formatPrice(data.impr_val || data.improvement_value)}
                    </div>
                  </div>
                  {(data.sale_date || data.last_sale_date) && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                        Last Sale Date
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '500' }}>
                        {formatDate(data.sale_date || data.last_sale_date)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Additional Details for Deals */}
          {isDeal && (
            <div
              style={{
                marginBottom: '24px',
                padding: '20px',
                background: 'rgba(0, 212, 170, 0.05)',
                border: '1px solid rgba(0, 212, 170, 0.15)',
                borderRadius: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <FileText size={16} style={{ color: '#00d4aa' }} />
                <span style={{ color: '#00d4aa', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Additional Details
                </span>
              </div>
              <div style={{ display: 'grid', gap: '16px' }}>
                <EditableTextarea 
                  label="Description" 
                  value={editedData.description} 
                  field="description"
                  isEditing={isEditing}
                  editedData={editedData}
                  setEditedData={setEditedData}
                />
                <EditableField 
                  label="Key Features" 
                  value={editedData.key_features} 
                  field="key_features" 
                  type="text"
                  isEditing={isEditing}
                  editedData={editedData}
                  setEditedData={setEditedData}
                  formatPrice={formatPrice}
                />
                <EditableTextarea 
                  label="Notes" 
                  value={editedData.notes} 
                  field="notes"
                  isEditing={isEditing}
                  editedData={editedData}
                  setEditedData={setEditedData}
                />
              </div>
            </div>
          )}

          {/* Property Details for Parcels */}
          {!isDeal && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Home size={16} style={{ color: '#ff0000' }} />
                <span style={{ color: '#ff0000', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Property Details
                </span>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {/* Property Address Details */}
                {(data.addr_city || data.city) && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>City</span>
                    <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '600' }}>
                      {data.addr_city || data.city}
                    </span>
                  </div>
                )}
                {(data.addr_zip || data.zip) && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Zip Code</span>
                    <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '600' }}>
                      {data.addr_zip || data.zip}
                    </span>
                  </div>
                )}
                {(data.acreage_calc || data.acreage || data.acres) && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Lot Size</span>
                    <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '600' }}>
                      {parseFloat(data.acreage_calc || data.acreage || data.acres).toFixed(2)} AC
                    </span>
                  </div>
                )}
                {(data.sqft || data.bldg_sqft || data.building_sqft) && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Building Size</span>
                    <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '600' }}>
                      {parseFloat(data.sqft || data.bldg_sqft || data.building_sqft).toLocaleString()} SF
                    </span>
                  </div>
                )}
                {data.year_built && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Year Built</span>
                    <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '600' }}>
                      {data.year_built}
                    </span>
                  </div>
                )}
                {data.zoning && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Zoning</span>
                    <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '600' }}>
                      {data.zoning}
                    </span>
                  </div>
                )}
                {data.county && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>County</span>
                    <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '600' }}>
                      {data.county}
                    </span>
                  </div>
                )}
                {(data.muni_name || data.municipality) && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Municipality</span>
                    <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '600' }}>
                      {data.muni_name || data.municipality}
                    </span>
                  </div>
                )}
                {data.school_district && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>School District</span>
                    <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '600' }}>
                      {data.school_district}
                    </span>
                  </div>
                )}
                {data.section_township_range && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Section/Township/Range</span>
                    <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '600' }}>
                      {data.section_township_range}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Property Details for Deals */}
          {isDeal && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Home size={16} style={{ color: '#ff0000' }} />
                <span style={{ color: '#ff0000', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Property Details
                </span>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {data.year_built && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Year Built</span>
                    <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>{data.year_built}</span>
                  </div>
                )}
                {data.zoning && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Zoning</span>
                    <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>{data.zoning}</span>
                  </div>
                )}
                {data.occupancy && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Occupancy</span>
                    <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>{data.occupancy}%</span>
                  </div>
                )}
                {data.parking_spaces && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Parking Spaces</span>
                    <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '500' }}>{data.parking_spaces}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Linked Contacts - ALWAYS VISIBLE */}
          {isDeal && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Users size={16} style={{ color: '#ff0000' }} />
                <span style={{ color: '#ff0000', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Linked Contacts {linkedContacts.length > 0 && `(${linkedContacts.length})`}
                </span>
              </div>
              
              {linkedContacts.length > 0 ? (
                <>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {linkedContacts.map((contact, idx) => (
                      <div
                        key={contact.id}
                        style={{
                          padding: '12px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                        }}
                      >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                                {contact.name} {idx === 0 && <span style={{ color: '#ff0000', fontSize: '11px' }}>(Primary)</span>}
                              </div>
                              {contact.company && (
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{contact.company}</div>
                              )}
                              {contact.phone && (
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>{contact.phone}</div>
                              )}
                              {contact.email && (
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>{contact.email}</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                              <button
                                onClick={() => handleEditContact(contact)}
                                data-testid={`edit-contact-${contact.id}`}
                                title="Edit contact"
                                style={{
                                  padding: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: '6px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center',
                                }}
                              >
                                <Edit size={12} />
                              </button>
                              {contact.email && (
                                <button
                                  onClick={() => window.open(`mailto:${contact.email}`, '_blank')}
                                  style={{
                                    padding: '6px 10px', background: 'rgba(255, 0, 0, 0.1)', border: '1px solid rgba(255, 0, 0, 0.3)',
                                    borderRadius: '6px', color: '#ff0000', fontSize: '11px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                  }}
                                >
                                  <ExternalLink size={12} />
                                  Email
                                </button>
                              )}
                              <button
                                onClick={() => handleUnlinkContact(contact.id)}
                                data-testid={`unlink-contact-${contact.id}`}
                                title="Unlink contact from this deal"
                                style={{
                                  padding: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                                  borderRadius: '6px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Contact action buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => { setEditingContactForPanel(null); setShowContactFormPanel(true); }}
                      style={{
                        flex: 1, padding: '10px 12px',
                        background: 'rgba(255, 0, 0, 0.08)', border: '1px solid rgba(255, 0, 0, 0.25)',
                        borderRadius: '8px', color: '#ff0000', fontSize: '13px', fontWeight: '600',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
                      }}
                    >
                      <Users size={14} />
                      New Contact
                    </button>
                    <button
                      onClick={() => { setShowLinkContactSearch(p => !p); if (!allContacts.length) fetchAllContacts(); }}
                      data-testid="link-existing-contact-btn"
                      style={{
                        flex: 1, padding: '10px 12px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
                      }}
                    >
                      <Search size={14} />
                      Link Existing
                    </button>
                  </div>
                </>
              ) : (
                <div style={{
                  padding: '20px',
                  background: 'rgba(255, 0, 0, 0.05)',
                  border: '1px solid rgba(255, 0, 0, 0.2)',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '16px' }}>
                    No contacts linked to this deal yet
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => { setEditingContactForPanel(null); setShowContactFormPanel(true); }}
                      style={{
                        flex: 1, padding: '10px 12px',
                        background: 'rgba(255, 0, 0, 0.1)', border: '1px solid rgba(255, 0, 0, 0.3)',
                        borderRadius: '8px', color: '#ff0000', fontSize: '13px', fontWeight: '600',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
                      }}
                    >
                      <Users size={14} />
                      New Contact
                    </button>
                    <button
                      onClick={() => { setShowLinkContactSearch(p => !p); if (!allContacts.length) fetchAllContacts(); }}
                      data-testid="link-existing-contact-btn-empty"
                      style={{
                        flex: 1, padding: '10px 12px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
                      }}
                    >
                      <Search size={14} />
                      Link Existing
                    </button>
                  </div>
                </div>
              )}

              {/* Link Existing Contact — searchable dropdown */}
              {showLinkContactSearch && (
                <div style={{
                  marginTop: '12px', padding: '12px',
                  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>
                      Link Existing Contact
                    </span>
                    <button onClick={() => { setShowLinkContactSearch(false); setContactSearchQuery(''); }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name, company, email..."
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%', padding: '8px 12px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none',
                      marginBottom: '8px',
                    }}
                  />
                  {loadingContacts ? (
                    <div style={{ textAlign: 'center', padding: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Loading...</div>
                  ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {allContacts
                        .filter(c =>
                          !linkedContacts.find(lc => lc.id === c.id) &&
                          (
                            !contactSearchQuery ||
                            c.name?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                            c.company?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                            c.email?.toLowerCase().includes(contactSearchQuery.toLowerCase())
                          )
                        )
                        .slice(0, 20)
                        .map(c => (
                          <button
                            key={c.id}
                            data-testid={`link-contact-option-${c.id}`}
                            onClick={() => handleLinkExistingContact(c.id)}
                            style={{
                              padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
                              color: '#fff', cursor: 'pointer', textAlign: 'left',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,0,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,0,0,0.3)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '500' }}>{c.name}</div>
                              {c.company && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{c.company}</div>}
                            </div>
                            <span style={{ fontSize: '11px', color: '#ff0000', fontWeight: '600' }}>Link</span>
                          </button>
                        ))
                      }
                      {allContacts.filter(c =>
                        !linkedContacts.find(lc => lc.id === c.id) &&
                        (!contactSearchQuery ||
                          c.name?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                          c.company?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                          c.email?.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                      ).length === 0 && (
                        <div style={{ textAlign: 'center', padding: '12px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                          {contactSearchQuery ? 'No contacts match your search' : 'All contacts are already linked'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Documents & Media */}
          {isDeal && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} style={{ color: '#ff0000' }} />
                  <span style={{ color: '#ff0000', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Documents ({documents.length})
                  </span>
                </div>
                <label
                  htmlFor="doc-upload"
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(255, 0, 0, 0.15)',
                    border: '1px solid rgba(255, 0, 0, 0.3)',
                    borderRadius: '6px',
                    color: '#ff0000',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: isUploadingDoc ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Upload size={12} />
                  {isUploadingDoc ? 'Uploading...' : 'Upload'}
                  <input
                    id="doc-upload"
                    type="file"
                    onChange={handleDocumentUpload}
                    disabled={isUploadingDoc}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Documents Table - Mac Finder Style */}
              {documents.length > 0 ? (
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Table Header */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 120px 60px',
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                      Name
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                      Date Uploaded
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' }}>
                      Actions
                    </div>
                  </div>

                  {/* Table Rows */}
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 120px 80px',
                        padding: '10px 12px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 0, 0, 0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ color: '#FFFFFF', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.file_name || doc.name}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                        {new Date(doc.uploaded_at || doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                        <button
                          data-testid={`download-doc-${doc.id}`}
                          onClick={() => {
                            if (doc.file_url) window.open(doc.file_url, '_blank');
                          }}
                          style={{
                            padding: '4px 6px', background: 'transparent', border: 'none',
                            color: '#ff0000', cursor: 'pointer', display: 'flex', alignItems: 'center',
                          }}
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          data-testid={`delete-doc-${doc.id}`}
                          onClick={() => handleDeleteDocument(doc.id)}
                          style={{
                            padding: '4px 6px', background: 'transparent', border: 'none',
                            color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center',
                          }}
                          title="Delete document"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '24px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '13px',
                  }}
                >
                  No documents uploaded yet
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {data.notes && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <FileText size={16} style={{ color: '#ff0000' }} />
                <span style={{ color: '#ff0000', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Notes
                </span>
              </div>
              <div
                style={{
                  padding: '16px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {data.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          gap: '12px',
        }}
      >
        <button
          onClick={() => navigate(`/deals/${data.id}`)}
          style={{
            flex: 1,
            padding: '12px',
            background: 'rgba(255, 0, 0, 0.15)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            borderRadius: '8px',
            color: '#ff0000',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Edit size={16} />
          Edit Full Details
        </button>
        <button
          onClick={handleShare}
          style={{
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Share2 size={16} />
        </button>
        {isDeal && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>


      {/* Contact Form Panel */}
      {isDeal && (
        <ContactFormPanel
          isOpen={showContactFormPanel}
          onClose={() => { setShowContactFormPanel(false); setEditingContactForPanel(null); }}
          onContactCreated={handleContactCreated}
          editingContact={editingContactForPanel}
          dealId={data?.id}
        />
      )}
    </div>

    {/* Delete Confirmation Modal — rendered via portal to escape backdropFilter containing block */}
    {showDeleteConfirm && ReactDOM.createPortal(
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          background: 'linear-gradient(145deg, rgba(20, 22, 28, 0.98), rgba(15, 17, 23, 0.98))',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '450px',
          width: '90%',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9)',
        }}>
          <h3 style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>
            Delete Property?
          </h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
            Are you sure you want to delete "{editedData.address || editedData.title}"? This action cannot be undone and will permanently remove all associated data including documents and contacts.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              data-testid="delete-cancel-btn"
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                flex: 1, padding: '14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px', color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              data-testid="delete-confirm-btn"
              onClick={handleDelete}
              style={{
                flex: 1, padding: '14px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.15))',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '10px', color: '#ef4444',
                fontSize: '14px', fontWeight: '700', cursor: 'pointer',
              }}
            >
              Delete Property
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

export default PropertyIntelligencePanel;
