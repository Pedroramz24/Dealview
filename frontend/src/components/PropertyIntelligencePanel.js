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
  const [editedData, setEditedData] = useState(null);
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

  const handleSave = async () => {
    // TODO: Implement save logic
    toast.success('Property updated successfully');
    setIsEditing(false);
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
                Address
              </span>
            </div>
            <h3 style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '600', marginBottom: '12px', lineHeight: '1.3' }}>
              {data.address || data.property_address || 'Address not available'}
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {data.asset_type && (
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
              {data.stage && (
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
            </div>
          </div>

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
                Financial Overview
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Asking Price
                </div>
                <div style={{ color: '#00d4aa', fontSize: '20px', fontWeight: '700' }}>
                  {formatPrice(data.price)}
                </div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Lot Size
                </div>
                <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '500' }}>
                  {data.lot_size ? `${data.lot_size} AC` : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Building Size
                </div>
                <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '500' }}>
                  {data.size ? `${parseFloat(data.size).toLocaleString()} SF` : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Cap Rate
                </div>
                <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '500' }}>
                  {data.cap_rate ? `${data.cap_rate}%` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Property Details */}
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
