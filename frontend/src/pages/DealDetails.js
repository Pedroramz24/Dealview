import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { ArrowLeft, Upload, FileText, Share2, DollarSign, Home, MapPin, Calendar, Users, Building2, FileCheck, User, Mail, Phone, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import PublishDealModal from '../components/PublishDealModal';
import { 
  formatCurrency, 
  calculatePricePerSqft, 
  formatNumberWithCommas, 
  parseFormattedNumber,
  handleFormattedNumberInput 
} from '../utils/numberFormat';
import DealTimeline from '../components/DealTimeline';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DealDetails = () => {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [linkedContacts, setLinkedContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user } = useContext(AuthContext);
  
  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedDeal, setEditedDeal] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Publish Modal State
  const [showPublishModal, setShowPublishModal] = useState(false);

  
  // Contact Management
  const [allContacts, setAllContacts] = useState([]);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);

  useEffect(() => {
    if (user) {
      fetchDeal();
      fetchLinkedContacts();
      fetchAllContacts();
    }
  }, [dealId, user]);

  const fetchDeal = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', dealId)
        .single();

      if (error) throw error;
      setDeal(data);
    } catch (error) {
      console.error('Error fetching deal:', error);
      toast.error('Failed to load deal');
      navigate('/deals');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedContacts = async () => {
    try {
      const { data: links, error } = await supabase
        .from('contact_deal_links')
        .select(`
          contact_id,
          contacts:contact_id (id, name, email, phone, company, title)
        `)
        .eq('deal_id', dealId);

      if (error) throw error;
      const contacts = links?.map(link => link.contacts) || [];
      setLinkedContacts(contacts);
      setSelectedContacts(contacts.map(c => c.id));
    } catch (error) {
      console.error('Error fetching linked contacts:', error);
    }
  };
  
  const fetchAllContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, company, title')
        .order('name');
      
      if (error) throw error;
      setAllContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!user) {
      toast.error('You must be logged in to upload files');
      return;
    }

    console.log('Starting image upload:', { fileName: file.name, fileSize: file.size, fileType: file.type });
    setUploading(true);
    
    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${dealId}/${Date.now()}.${fileExt}`;
      console.log('Upload path:', fileName);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      // Update deal with new image URL
      const { error: updateError } = await supabase
        .from('deals')
        .update({ image_url: publicUrl })
        .eq('id', dealId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('Deal updated successfully');
      toast.success('Image uploaded successfully');
      fetchDeal();
      fetchLinkedContacts();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!user) {
      toast.error('You must be logged in to upload files');
      return;
    }

    console.log('Starting document upload:', { fileName: file.name, fileSize: file.size, fileType: file.type });
    setUploading(true);

    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${dealId}/${Date.now()}_${file.name}`;
      console.log('Upload path:', fileName);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('deal-documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('deal-documents')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      // Create document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert([{
          owner_id: user.id,
          deal_id: dealId,
          name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size
        }]);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Document record created successfully');
      toast.success('Document uploaded successfully');
      fetchDeal();
      fetchLinkedContacts();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/share/${dealId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard');
  };
  
  // Edit Mode Handlers
  const handleEditMode = () => {
    setEditedDeal({ ...deal });
    setIsEditMode(true);
  };
  
  const handleCancelEdit = () => {
    setEditedDeal(null);
    setIsEditMode(false);
  };
  
  const handleFieldChange = (field, value) => {
    setEditedDeal(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in to save changes');
      return;
    }
    
    setIsSaving(true);
    try {
      const updateData = {
        title: editedDeal.title,
        address: editedDeal.address,
        asset_type: editedDeal.asset_type,
        stage: editedDeal.stage,
        status: editedDeal.status,
        
        // Financial
        price: editedDeal.price ? parseFormattedNumber(editedDeal.price) : null,
        size: editedDeal.size ? parseFormattedNumber(editedDeal.size) : null,
        cap_rate: editedDeal.cap_rate ? parseFloat(editedDeal.cap_rate) : null,
        noi: editedDeal.noi ? parseFormattedNumber(editedDeal.noi) : null,
        lease_type: editedDeal.lease_type || null,
        proforma_notes: editedDeal.proforma_notes || null,
        
        // Property Details
        lot_size: editedDeal.lot_size ? parseFloat(editedDeal.lot_size) : null,
        year_built: editedDeal.year_built ? parseInt(editedDeal.year_built) : null,
        zoning: editedDeal.zoning || null,
        occupancy: editedDeal.occupancy ? parseFloat(editedDeal.occupancy) : null,
        parking_spaces: editedDeal.parking_spaces ? parseInt(editedDeal.parking_spaces) : null,
        key_features: editedDeal.key_features || null,
        
        // Deal Management
        priority: editedDeal.priority || 'Medium',
        owner_visibility: editedDeal.owner_visibility || 'Team',
        next_action: editedDeal.next_action || null,
        next_action_date: editedDeal.next_action_date || null,
        target_close_date: editedDeal.target_close_date || null,
        last_contact_date: editedDeal.last_contact_date || null,
        
        // Contact
        primary_contact_text: editedDeal.primary_contact_text || null,
        
        // Notes
        notes: editedDeal.notes,
        
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId);
      
      if (error) throw error;
      
      // Update local state
      setDeal({ ...editedDeal, ...updateData });
      setIsEditMode(false);
      setEditedDeal(null);
      toast.success('Deal updated successfully');
      
    } catch (error) {
      console.error('Error updating deal:', error);
      toast.error('Failed to update deal: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Contact Management Functions
  const handleAddContact = async (contactId) => {
    if (selectedContacts.includes(contactId)) {
      toast.info('Contact already linked');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('contact_deal_links')
        .insert({
          contact_id: contactId,
          deal_id: dealId,
          role: selectedContacts.length === 0 ? 'primary' : 'secondary'
        });
      
      if (error) throw error;
      
      setSelectedContacts([...selectedContacts, contactId]);
      await fetchLinkedContacts();
      toast.success('Contact linked successfully');
    } catch (error) {
      console.error('Error linking contact:', error);
      toast.error('Failed to link contact');
    }
  };
  
  const handleRemoveContact = async (contactId) => {
    try {
      const { error } = await supabase
        .from('contact_deal_links')
        .delete()
        .eq('contact_id', contactId)
        .eq('deal_id', dealId);
      
      if (error) throw error;
      
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
      await fetchLinkedContacts();
      toast.success('Contact unlinked successfully');
    } catch (error) {
      console.error('Error unlinking contact:', error);
      toast.error('Failed to unlink contact');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const calculatePricePerSF = () => {
    const currentDeal = isEditMode ? editedDeal : deal;
    if (!currentDeal?.size || !currentDeal?.price) return 'N/A';
    const size = typeof currentDeal.size === 'string' ? parseFormattedNumber(currentDeal.size) : currentDeal.size;
    const price = typeof currentDeal.price === 'string' ? parseFormattedNumber(currentDeal.price) : currentDeal.price;
    return formatPrice(price / size);
  };

  const calculatePricePerAcre = () => {
    const currentDeal = isEditMode ? editedDeal : deal;
    const acres = currentDeal?.lot_acres || currentDeal?.lot_size;
    if (!acres || !currentDeal?.price) return 'N/A';
    const price = typeof currentDeal.price === 'string' ? parseFormattedNumber(currentDeal.price) : currentDeal.price;
    return formatPrice(price / acres);
  };
  
  // Optimized EditableField with proper controlled input handling
  const EditableField = React.memo(({ field, type = 'text', placeholder, options = null, textarea = false }) => {
    const currentValue = isEditMode ? (editedDeal?.[field] ?? '') : (deal?.[field] ?? '');
    
    // View mode
    if (!isEditMode) {
      if (type === 'select' && options) {
        return <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{currentValue || 'N/A'}</p>;
      }
      if (type === 'date' && currentValue) {
        return <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>
          {new Date(currentValue).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>;
      }
      if (type === 'number' || field === 'price' || field === 'size' || field === 'noi') {
        return <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>
          {currentValue ? (field === 'price' || field === 'noi' ? formatPrice(currentValue) : parseFloat(currentValue).toLocaleString()) : 'N/A'}
        </p>;
      }
      return <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{currentValue || 'N/A'}</p>;
    }
    
    // Edit mode - using uncontrolled inputs with defaultValue for better performance
    const inputStyle = {
      width: '100%',
      padding: '8px 12px',
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(0, 184, 212, 0.3)',
      borderRadius: '6px',
      color: '#FFFFFF',
      fontSize: '14px'
    };
    
    if (type === 'select' && options) {
      return (
        <select
          defaultValue={currentValue}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          style={inputStyle}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }
    
    if (textarea) {
      return (
        <textarea
          defaultValue={currentValue}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          placeholder={placeholder}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      );
    }
    
    if (type === 'date') {
      return (
        <input
          type="date"
          defaultValue={currentValue}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          style={inputStyle}
        />
      );
    }
    
    return (
      <input
        type={type}
        defaultValue={currentValue}
        onChange={(e) => handleFieldChange(field, e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!deal) return null;

  return (
    <div style={{ background: '#000000', minHeight: '100vh', overflow: 'auto', height: '100%' }}>
      {/* Full-Width Header */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '40px 0'
      }} data-testid="deal-details-page">
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 40px' }}>
          {/* Back Button & Edit Toggle */}
          <div className="flex items-center justify-between w-full mb-4">
            <Button
              onClick={() => navigate('/workspace/deals')}
              variant="ghost"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              BACK TO PROPERTIES
            </Button>
            
            {/* Edit Mode Toggle */}
            {!isEditMode ? (
              <Button
                onClick={handleEditMode}
                style={{
                  background: 'rgba(0, 184, 212, 0.15)',
                  border: '1px solid rgba(0, 184, 212, 0.3)',
                  color: '#00b8d4',
                  padding: '8px 24px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                EDIT MODE
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    padding: '8px 20px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  CANCEL
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    background: '#00b8d4',
                    border: '1px solid #00d4aa',
                    color: '#FFFFFF',
                    padding: '8px 24px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                </Button>
              </div>
            )}
          </div>

          {/* Property Address - Centered */}
          <h1 style={{ 
            color: '#FFFFFF', 
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: '700',
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            textAlign: 'center',
            lineHeight: '1.2'
          }}>
            {deal.address}
          </h1>

          {/* Asset Type Tag - Centered */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{
              padding: '10px 24px',
              background: getAssetTypeColor(deal.asset_type).bg,
              color: getAssetTypeColor(deal.asset_type).color,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              border: `1px solid ${getAssetTypeColor(deal.asset_type).border}`,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {deal.asset_type}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px' }}>
        {/* Transaction Timeline - Only show for deals with milestone data */}
        {(deal.under_contract_date || deal.closing_date) && (
          <DealTimeline deal={deal} />
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Image */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
              {deal.image_url ? (
                <img src={deal.image_url} alt={deal.address} className="w-full h-96 object-cover" />
              ) : (
                <div className="w-full h-96 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="text-center">
                    <Home className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.6)' }}>No image uploaded</p>
                  </div>
                </div>
              )}
              <div className="p-6">
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                    <Upload className="w-5 h-5 mr-2" style={{ color: 'rgba(255,255,255,0.6)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Upload Property Image</span>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </div>
                </Label>
              </div>
            </div>

            {/* Core Information */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: isEditMode ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Core Information {isEditMode && <span style={{ color: 'rgba(0, 184, 212, 0.6)', fontSize: '11px', fontWeight: '400', marginLeft: '8px' }}>• EDITING</span>}
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Deal Title</p>
                  <EditableField field="title" placeholder="Deal Title" />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Address</p>
                  <EditableField field="address" placeholder="123 Main St, City, State" />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Asset Type</p>
                  <EditableField 
                    field="asset_type" 
                    type="select" 
                    options={[
                      { value: 'Office', label: 'Office' },
                      { value: 'Retail', label: 'Retail' },
                      { value: 'Industrial', label: 'Industrial' },
                      { value: 'Multifamily', label: 'Multifamily' },
                      { value: 'Land', label: 'Land' },
                      { value: 'Mixed Use', label: 'Mixed Use' }
                    ]} 
                  />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Status</p>
                  <EditableField 
                    field="stage" 
                    type="select" 
                    options={[
                      { value: 'need_to_contact', label: 'Need to Contact' },
                      { value: 'contacted', label: 'Contacted' },
                      { value: 'prospect', label: 'Prospect' },
                      { value: 'negotiations', label: 'Negotiations' },
                      { value: 'offer_sent', label: 'Offer Sent' },
                      { value: 'under_contract', label: 'Under Contract' },
                      { value: 'closed_won', label: 'Closed Won' },
                      { value: 'overpriced', label: 'Overpriced' }
                    ]} 
                  />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Priority</p>
                  <EditableField 
                    field="priority" 
                    type="select" 
                    options={[
                      { value: 'High', label: 'High' },
                      { value: 'Medium', label: 'Medium' },
                      { value: 'Low', label: 'Low' }
                    ]} 
                  />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Visibility</p>
                  <EditableField 
                    field="owner_visibility" 
                    type="select" 
                    options={[
                      { value: 'Private', label: 'Private' },
                      { value: 'Team', label: 'Team' },
                      { value: 'Public', label: 'Public' }
                    ]} 
                  />
                </div>
              </div>
            </div>

            {/* Property Facts */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: isEditMode ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Property Facts {isEditMode && <span style={{ color: 'rgba(0, 184, 212, 0.6)', fontSize: '11px', fontWeight: '400', marginLeft: '8px' }}>• EDITING</span>}
              </h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Building Size (SF)</p>
                  <EditableField field="size" placeholder="5,000" />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Lot Size (acres)</p>
                  <EditableField field="lot_size" type="number" placeholder="1.5" />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Year Built</p>
                  <EditableField field="year_built" type="number" placeholder="2020" />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Zoning</p>
                  <EditableField field="zoning" placeholder="C-2" />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Occupancy (%)</p>
                  <EditableField field="occupancy" type="number" placeholder="95.5" />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Parking Spaces</p>
                  <EditableField field="parking_spaces" type="number" placeholder="50" />
                </div>
              </div>
              <div className="mt-6">
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>Key Features</p>
                <EditableField field="key_features" textarea={true} placeholder="Highway access, Updated HVAC, Recent renovations..." />
              </div>
            </div>

            {/* Contacts & Link Management */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: isEditMode ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Contacts & Activities {isEditMode && <span style={{ color: 'rgba(0, 184, 212, 0.6)', fontSize: '11px', fontWeight: '400', marginLeft: '8px' }}>• EDITING</span>}
              </h3>
              
              {isEditMode ? (
                <div className="space-y-4">
                  {/* Link Contacts */}
                  <div>
                    <Label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Link Contacts</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search contacts by name..."
                        value={contactSearchTerm}
                        onChange={(e) => setContactSearchTerm(e.target.value)}
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(0, 184, 212, 0.3)',
                          color: '#FFFFFF',
                          fontSize: '14px'
                        }}
                      />
                      
                      {contactSearchTerm && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '4px',
                          background: 'rgba(15, 23, 42, 0.98)',
                          border: '1px solid rgba(0, 184, 212, 0.3)',
                          borderRadius: '8px',
                          maxHeight: '250px',
                          overflowY: 'auto',
                          zIndex: 50
                        }}>
                          {(() => {
                            const filteredContacts = allContacts.filter(c => 
                              c.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) &&
                              !selectedContacts.includes(c.id)
                            ).slice(0, 5);
                            
                            return (
                              <>
                                {filteredContacts.length > 0 ? (
                                  filteredContacts.map(contact => (
                                    <div
                                      key={contact.id}
                                      onClick={() => {
                                        handleAddContact(contact.id);
                                        setContactSearchTerm('');
                                      }}
                                      style={{
                                        padding: '12px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <div style={{ color: '#FFFFFF', fontWeight: '500' }}>{contact.name}</div>
                                      {contact.company && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{contact.company}</div>}
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ padding: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                                    No contacts found
                                  </div>
                                )}
                                
                                {/* Create New Contact Option */}
                                <div
                                  onClick={() => navigate(`/contacts?create=true&name=${encodeURIComponent(contactSearchTerm)}`)}
                                  style={{
                                    padding: '12px',
                                    cursor: 'pointer',
                                    background: 'rgba(0, 184, 212, 0.15)',
                                    color: '#00b8d4',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    borderTop: '1px solid rgba(0, 184, 212, 0.3)'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 184, 212, 0.25)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 184, 212, 0.15)'}
                                >
                                  <User size={16} />
                                  Create new contact "{contactSearchTerm}"
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Linked Contacts List */}
                  {linkedContacts.length > 0 && (
                    <div>
                      <Label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                        Linked Contacts ({linkedContacts.length})
                      </Label>
                      <div className="space-y-2">
                        {linkedContacts.map((contact, idx) => (
                          <div key={contact.id} style={{
                            padding: '8px 12px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(100, 116, 139, 0.3)',
                            borderRadius: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '500' }}>
                                {contact.name} {idx === 0 && <span style={{ color: '#00b8d4', fontSize: '11px' }}>(Primary)</span>}
                              </span>
                              {contact.company && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{contact.company}</div>}
                            </div>
                            <button
                              onClick={() => handleRemoveContact(contact.id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#ef4444',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Last Contact Date */}
                  <div>
                    <Label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Last Contact Date</Label>
                    <EditableField field="last_contact_date" type="date" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Linked Contacts</p>
                    {linkedContacts.length > 0 ? (
                      <div className="space-y-2">
                        {linkedContacts.map((contact, idx) => (
                          <div key={contact.id} style={{ padding: '8px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '6px' }}>
                            <div style={{ color: '#FFFFFF', fontWeight: '500' }}>
                              {contact.name} {idx === 0 && <span style={{ color: '#00b8d4', fontSize: '11px' }}>(Primary)</span>}
                            </div>
                            {contact.company && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{contact.company}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>No contacts linked</p>
                    )}
                  </div>
                  {deal.last_contact_date && (
                    <div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Last Contact Date</p>
                      <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>
                        {new Date(deal.last_contact_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Important Dates & Details */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: isEditMode ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Important Dates & Details {isEditMode && <span style={{ color: 'rgba(0, 184, 212, 0.6)', fontSize: '11px', fontWeight: '400', marginLeft: '8px' }}>• EDITING</span>}
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Target Close Date</p>
                  <EditableField field="target_close_date" type="date" />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Next Action Date</p>
                  <EditableField field="next_action_date" type="date" />
                </div>
                <div className="col-span-2">
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Next Action</p>
                  <EditableField field="next_action" placeholder="Follow up call, send proposal..." />
                </div>
              </div>
            </div>

            {/* Linked Contacts */}
            {linkedContacts.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Linked Contacts ({linkedContacts.length})
                </h3>
                <div className="space-y-3">
                  {linkedContacts.map(contact => (
                    <div 
                      key={contact.id}
                      className="p-4 rounded-lg"
                      style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(100, 116, 139, 0.3)'
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1" style={{ color: '#FFFFFF' }}>
                            {contact.name}
                          </h4>
                          {contact.title && (
                            <p className="text-xs mb-2" style={{ color: '#00b8d4' }}>
                              {contact.title}
                            </p>
                          )}
                          <div className="space-y-1">
                            {contact.email && (
                              <p className="text-xs flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                <Mail className="w-3 h-3" />
                                {contact.email}
                              </p>
                            )}
                            {contact.phone && (
                              <p className="text-xs flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                <Phone className="w-3 h-3" />
                                {contact.phone}
                              </p>
                            )}
                            {contact.company && (
                              <p className="text-xs flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                <Building2 className="w-3 h-3" />
                                {contact.company}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location & Market */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Location & Market</h3>
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Market</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.market || 'San Antonio'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Submarket</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.submarket || 'N/A'}</p>
                </div>
              </div>
              
              {/* Map */}
              {deal.latitude && deal.longitude ? (
                <div className="h-64 rounded-lg overflow-hidden custom-dark-map">
                  <MapContainer
                    center={[deal.latitude, deal.longitude]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                      maxZoom={19}
                    />
                    <Marker position={[deal.latitude, deal.longitude]} />
                  </MapContainer>
                </div>
              ) : (
                <div className="h-64 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)' }}>No location coordinates available</p>
                </div>
              )}
              <div className="flex items-start mt-3">
                <MapPin className="w-5 h-5 mr-2 mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{deal.address}</p>
              </div>
            </div>

            {/* Documents */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <FileCheck className="inline w-4 h-4 mr-2" />
                Documents & Media
              </h3>
              {deal.documents && deal.documents.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {deal.documents.map((doc, index) => (
                    <a
                      key={index}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-3 rounded-lg transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
                    >
                      <FileText className="w-5 h-5 mr-3" style={{ color: '#00b8d4' }} />
                      <span style={{ color: '#FFFFFF' }}>{doc.name}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>No documents uploaded yet.</p>
              )}
              <Label htmlFor="doc-upload" className="cursor-pointer">
                <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg transition-colors" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                  <Upload className="w-5 h-5 mr-2" style={{ color: 'rgba(255,255,255,0.6)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>Upload Document (OM, Survey, etc.)</span>
                  <input
                    id="doc-upload"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleDocumentUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>
              </Label>
            </div>
          </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Share Button */}
          <Button onClick={handleShare} data-testid="share-deal-button" style={{
            background: '#00b8d4',
            color: '#000000',
            padding: '14px 24px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '600',
            fontSize: '15px',
            boxShadow: '0 4px 12px rgba(0, 184, 212, 0.3)',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease'
          }}>
            <Share2 className="w-5 h-5" />
            Share Property
          </Button>

          {/* Publish to Marketplace Button */}
          <Button onClick={() => setShowPublishModal(true)} style={{
            background: 'linear-gradient(135deg, #00b8d4 0%, #0088a3 100%)',
            color: '#ffffff',
            padding: '14px 24px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: '600',
            fontSize: '15px',
            boxShadow: '0 4px 12px rgba(0, 184, 212, 0.3)',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s ease'
          }}>
            <Upload className="w-5 h-5" />
            Publish to Marketplace
          </Button>

          {/* Property Details Card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{ 
              color: '#FFFFFF', 
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '20px',
              letterSpacing: '-0.02em'
            }}>Property Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>BUILDING SIZE</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.size ? `${deal.size.toLocaleString()} SF` : 'N/A'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>PRICE</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{formatPrice(deal.price)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>PROPERTY TYPE</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.asset_type}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>STATUS</p>
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.stage}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{ 
              color: '#FFFFFF', 
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '20px',
              letterSpacing: '-0.02em'
            }}>Financials</h2>
            <div className="space-y-4">
              <div className="pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center mb-2">
                  <DollarSign className="w-5 h-5 mr-2" style={{ color: '#00b8d4' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Asking Price</p>
                </div>
                <p className="text-3xl font-bold" style={{ color: '#FFFFFF' }} data-testid="deal-asking-price">{formatPrice(deal.price)}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Price per SF (Building)</p>
                <p className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>{calculatePricePerSF()}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Price per Acre</p>
                <p className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>{calculatePricePerAcre()}</p>
              </div>
              {deal.noi && (
                <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>NOI</p>
                  <p className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>{formatPrice(deal.noi)}</p>
                </div>
              )}
              {deal.cap_rate && (
                <div>
                  <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Cap Rate</p>
                  <p className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>{deal.cap_rate}%</p>
                </div>
              )}
              {deal.lease_type && (
                <div>
                  <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Lease Type</p>
                  <p className="text-xl font-semibold" style={{ color: '#FFFFFF' }}>{deal.lease_type}</p>
                </div>
              )}
              {deal.proforma_notes && (
                <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>Pro Forma Notes</p>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>{deal.proforma_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Location Map */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h2 style={{ 
              color: '#FFFFFF', 
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              letterSpacing: '-0.02em'
            }}>Location</h2>
            {deal?.latitude && deal?.longitude ? (
              <div className="h-64 rounded-lg overflow-hidden mb-3 custom-dark-map">
                <MapContainer
                  key={`map-${deal.latitude}-${deal.longitude}`}
                  center={[parseFloat(deal.latitude), parseFloat(deal.longitude)]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                    maxZoom={19}
                    className="custom-dark-map"
                  />
                  <Marker position={[parseFloat(deal.latitude), parseFloat(deal.longitude)]} />
                </MapContainer>
              </div>
            ) : (
              <div className="h-64 rounded-lg overflow-hidden mb-3 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>No location coordinates available</p>
              </div>
            )}
            <div className="flex items-start">
              <MapPin className="w-5 h-5 mr-2 mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }} />
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>{deal.address}</p>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Publish to Marketplace Modal */}
      {showPublishModal && (
        <PublishDealModal
          dealId={dealId}
          deal={deal}
          onClose={() => setShowPublishModal(false)}
          onPublished={(publishedDeal) => {
            setDeal(publishedDeal);
            fetchDeal();
          }}
        />
      )}
    </div>
  );
};

export default DealDetails;
