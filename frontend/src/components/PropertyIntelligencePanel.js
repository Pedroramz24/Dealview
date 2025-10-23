import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Edit, Save, Share2, MapPin, DollarSign, Home, Users, FileText, Calendar, ChevronLeft, ChevronRight, Upload, Download, ExternalLink } from 'lucide-react';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import { toast } from 'sonner';

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

const PropertyIntelligencePanel = ({ isOpen, onClose, data, type, onCreateDeal }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(data || {});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [linkedContacts, setLinkedContacts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  useEffect(() => {
    if (data) {
      setEditedData({ ...data });
      if (isDeal && data.id) {
        fetchLinkedContacts();
        fetchDocuments();
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
  }, [data]);

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
      const { data: docs, error } = await supabase
        .from('documents')
        .select('*')
        .eq('deal_id', data.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDocuments(docs || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      const { supabase } = await import('../supabaseClient');
      const { AuthContext } = await import('../App');
      
      // Get user from auth context (you'll need to pass this as prop or use context)
      const userId = data.owner_id; // Fallback to deal owner
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${data.id}/${Date.now()}_${file.name}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('deal-documents')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('deal-documents')
        .getPublicUrl(fileName);
      
      const { error: insertError } = await supabase
        .from('documents')
        .insert([{
          owner_id: userId,
          deal_id: data.id,
          name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size
        }]);
      
      if (insertError) throw insertError;
      
      toast.success('Document uploaded successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  if (!data) return null;

  const isDeal = type === 'deal';
  const images = data.image_url ? [data.image_url] : [];

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Helper component for editable fields
  const EditableField = ({ label, value, field, type = 'text', isCurrency = false, suffix = '' }) => {
    if (!isEditing) {
      let displayValue = value;
      if (isCurrency && value) {
        displayValue = formatPrice(value);
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

    return (
      <div>
        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>
          {label}
        </label>
        <input
          type={type}
          value={editedData[field] || ''}
          onChange={(e) => setEditedData({ ...editedData, [field]: e.target.value })}
          className="editable-input"
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

  // Helper component for editable textarea
  const EditableTextarea = ({ label, value, field }) => {
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
            transition: 'all 150ms ease',
          }}
          onFocus={(e) => {
            e.target.style.border = '1px solid rgba(0, 184, 212, 0.5)';
            e.target.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
          onBlur={(e) => {
            e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            e.target.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
        />
      </div>
    );
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
      const { supabase } = await import('../supabaseClient');
      
      // Update deal in Supabase
      const { error } = await supabase
        .from('deals')
        .update({
          title: editedData.title,
          address: editedData.address,
          city: editedData.city,
          state: editedData.state,
          zip_code: editedData.zip_code,
          asset_type: editedData.asset_type,
          price: editedData.price,
          size: editedData.size,
          lot_size: editedData.lot_size,
          year_built: editedData.year_built,
          description: editedData.description,
          cap_rate: editedData.cap_rate,
          noi: editedData.noi,
          annual_income: editedData.annual_income,
          annual_expenses: editedData.annual_expenses,
          zoning: editedData.zoning,
          occupancy: editedData.occupancy,
          parking_spaces: editedData.parking_spaces,
          key_features: editedData.key_features,
          lease_type: editedData.lease_type,
          notes: editedData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);
      
      if (error) throw error;
      
      toast.success('✓ Deal updated successfully');
      setIsEditing(false);
      
      // Update the local data without reloading the page
      // This keeps the map position intact
      if (data && data.id) {
        Object.assign(data, editedData);
      }
    } catch (error) {
      console.error('Error saving deal:', error);
      toast.error('Failed to save changes');
    }
  };

  const handleShare = () => {
    // TODO: Implement share logic
    toast.success('Share link copied to clipboard');
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: isOpen ? 0 : '-500px',
        width: '500px',
        height: '100vh',
        background: 'rgba(11, 12, 14, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
        transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)',
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
          {/* Edit/Save buttons for deals */}
          {isDeal && (
            <>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'rgba(0, 184, 212, 0.1)',
                    border: '1px solid rgba(0, 184, 212, 0.3)',
                    color: '#00b8d4',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 184, 212, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)';
                  }}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #00b8d4 0%, #00d4aa 100%)',
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
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 184, 212, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditedData({ ...data });
                      setIsEditing(false);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </>
          )}
          {/* Create Deal button for parcels */}
          {!isDeal && onCreateDeal && (
            <button
              onClick={() => onCreateDeal(data)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #00b8d4 0%, #00d4aa 100%)',
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
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 184, 212, 0.4)';
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
      >
        {/* Image Carousel */}
        {images.length > 0 && (
          <div style={{ position: 'relative', width: '100%', height: '280px', background: '#000' }}>
            <img
              src={images[currentImageIndex]}
              alt="Property"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextImage}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ padding: '24px' }}>
          {/* Core Summary */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <MapPin size={16} style={{ color: '#00b8d4' }} />
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
                    onFocus={(e) => e.target.style.border = '1px solid rgba(0, 184, 212, 0.5)'}
                    onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
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
                    onFocus={(e) => e.target.style.border = '1px solid rgba(0, 184, 212, 0.5)'}
                    onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
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
                      onFocus={(e) => e.target.style.border = '1px solid rgba(0, 184, 212, 0.5)'}
                      onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
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
                      onFocus={(e) => e.target.style.border = '1px solid rgba(0, 184, 212, 0.5)'}
                      onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
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
                      onFocus={(e) => e.target.style.border = '1px solid rgba(0, 184, 212, 0.5)'}
                      onBlur={(e) => e.target.style.border = '1px solid rgba(255, 255, 255, 0.1)'}
                    />
                  </div>
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
              {isDeal && data.asset_type && (
                <span
                  style={{
                    padding: '6px 12px',
                    background: getAssetTypeColor(data.asset_type).bg,
                    color: getAssetTypeColor(data.asset_type).color,
                    border: `1px solid ${getAssetTypeColor(data.asset_type).border}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {data.asset_type}
                </span>
              )}
              {isDeal && data.stage && (
                <span
                  style={{
                    padding: '6px 12px',
                    background: stageColors[data.stage] || '#94a3b8',
                    color: '#FFFFFF',
                    border: `1px solid ${stageColors[data.stage] || '#94a3b8'}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    boxShadow: `0 0 12px ${stageColors[data.stage] || '#94a3b8'}40`
                  }}
                >
                  {data.stage.replace(/_/g, ' ')}
                </span>
              )}
              {!isDeal && data.parcel_id && (
                <span
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(0, 184, 212, 0.1)',
                    color: '#00b8d4',
                    border: '1px solid rgba(0, 184, 212, 0.3)',
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
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Owner Name
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
            </div>
          )}

          {/* Financial Overview */}
          <div
            style={{
              marginBottom: '24px',
              padding: '20px',
              background: 'rgba(0, 184, 212, 0.05)',
              border: '1px solid rgba(0, 184, 212, 0.15)',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <DollarSign size={16} style={{ color: '#00b8d4' }} />
              <span style={{ color: '#00b8d4', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {isDeal ? 'Financial Overview' : 'Valuation & Sales'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {isDeal ? (
                <>
                  <EditableField label="Asking Price" value={editedData.price} field="price" type="number" isCurrency={true} />
                  <EditableField label="Lot Size" value={editedData.lot_size} field="lot_size" type="number" suffix="AC" />
                  <EditableField label="Building Size" value={editedData.size} field="size" type="number" suffix="SF" />
                  <EditableField label="Cap Rate" value={editedData.cap_rate} field="cap_rate" type="number" suffix="%" />
                  <EditableField label="NOI" value={editedData.noi} field="noi" type="number" isCurrency={true} />
                  <EditableField label="Annual Income" value={editedData.annual_income} field="annual_income" type="number" isCurrency={true} />
                  <EditableField label="Annual Expenses" value={editedData.annual_expenses} field="annual_expenses" type="number" isCurrency={true} />
                  <EditableField label="Year Built" value={editedData.year_built} field="year_built" type="number" />
                  <EditableField label="Parking Spaces" value={editedData.parking_spaces} field="parking_spaces" type="number" />
                  <EditableField label="Occupancy" value={editedData.occupancy} field="occupancy" type="number" suffix="%" />
                  <div style={{ gridColumn: '1 / -1' }}>
                    <EditableField label="Zoning" value={editedData.zoning} field="zoning" type="text" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <EditableField label="Lease Type" value={editedData.lease_type} field="lease_type" type="text" />
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
                <EditableTextarea label="Description" value={editedData.description} field="description" />
                <EditableField label="Key Features" value={editedData.key_features} field="key_features" type="text" />
                <EditableTextarea label="Notes" value={editedData.notes} field="notes" />
              </div>
            </div>
          )}

          {/* Property Details for Parcels */}
          {!isDeal && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Home size={16} style={{ color: '#00b8d4' }} />
                <span style={{ color: '#00b8d4', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                <Home size={16} style={{ color: '#00b8d4' }} />
                <span style={{ color: '#00b8d4', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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

          {/* Linked Contacts */}
          {isDeal && linkedContacts.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Users size={16} style={{ color: '#00b8d4' }} />
                <span style={{ color: '#00b8d4', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Linked Contacts ({linkedContacts.length})
                </span>
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {linkedContacts.map((contact, idx) => (
                  <div
                    key={contact.id}
                    style={{
                      padding: '12px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                        {contact.name} {idx === 0 && <span style={{ color: '#00b8d4', fontSize: '11px' }}>(Primary)</span>}
                      </div>
                      {contact.company && (
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{contact.company}</div>
                      )}
                      {contact.email && (
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '2px' }}>{contact.email}</div>
                      )}
                    </div>
                    <button
                      onClick={() => window.open(`mailto:${contact.email}`, '_blank')}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(0, 184, 212, 0.1)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#00b8d4',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ExternalLink size={12} />
                      Email
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents & Media */}
          {isDeal && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} style={{ color: '#00b8d4' }} />
                  <span style={{ color: '#00b8d4', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Documents ({documents.length})
                  </span>
                </div>
                <label
                  htmlFor="doc-upload"
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(0, 184, 212, 0.15)',
                    border: '1px solid rgba(0, 184, 212, 0.3)',
                    borderRadius: '6px',
                    color: '#00b8d4',
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
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 184, 212, 0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ color: '#FFFFFF', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.name}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                        {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            // Download logic here
                            toast.info('Download feature coming soon');
                          }}
                          style={{
                            padding: '4px 8px',
                            background: 'transparent',
                            border: 'none',
                            color: '#00b8d4',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Download size={14} />
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
                <FileText size={16} style={{ color: '#00b8d4' }} />
                <span style={{ color: '#00b8d4', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
            background: 'rgba(0, 184, 212, 0.15)',
            border: '1px solid rgba(0, 184, 212, 0.3)',
            borderRadius: '8px',
            color: '#00b8d4',
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
      </div>
    </div>
  );
};

export default PropertyIntelligencePanel;
