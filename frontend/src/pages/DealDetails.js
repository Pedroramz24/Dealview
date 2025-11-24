import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { ArrowLeft, Upload, Edit, Save, X, Home, User, MapPin, Trash2, Mail, Share2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import DealTimeline from '../components/DealTimeline';
import EmailComposeModal from '../components/EmailComposeModal';
import TeamCollaborationPanel from '../components/TeamCollaborationPanel';
import EmailActivityTimeline from '../components/EmailActivityTimeline';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatNumberWithCommas, parseFormattedNumber } from '../utils/numberInput';
import ContactFormPanel from '../components/ContactFormPanel';

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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { user } = useContext(AuthContext);
  
  // Pipeline & Stage Management
  const [pipelines, setPipelines] = useState([]);
  const [availableStages, setAvailableStages] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState(null);
  const [selectedStageId, setSelectedStageId] = useState(null);
  
  // Saving State
  const [isSaving, setIsSaving] = useState(false);
  const isEditMode = true; // Always in edit mode - all fields editable
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // Contact Management
  const [allContacts, setAllContacts] = useState([]);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showContactFormPanel, setShowContactFormPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const contactDropdownRef = useRef(null);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  // Email compose state
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState(null);
  const [token, setToken] = useState(null);
  
  // Get Supabase session token
  useEffect(() => {
    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setToken(session.access_token);
      }
    };
    getToken();
  }, [user]);
  
  // Date States for DatePicker
  const [targetCloseDate, setTargetCloseDate] = useState(null);
  const [nextActionDate, setNextActionDate] = useState(null);
  const [lastContactDate, setLastContactDate] = useState(null);
  
  // Refs for ALL uncontrolled inputs
  const titleRef = useRef(null);
  const addressRef = useRef(null);
  const assetTypeRef = useRef(null);
  const stageRef = useRef(null);
  const priorityRef = useRef(null);
  const visibilityRef = useRef(null);
  const sizeRef = useRef(null);
  const lotSizeRef = useRef(null);
  const yearBuiltRef = useRef(null);
  const zoningRef = useRef(null);
  const occupancyRef = useRef(null);
  const parkingSpacesRef = useRef(null);
  const keyFeaturesRef = useRef(null);
  const priceRef = useRef(null);
  const capRateRef = useRef(null);
  const noiRef = useRef(null);
  const leaseTypeRef = useRef(null);
  const proformaNotesRef = useRef(null);
  const nextActionRef = useRef(null);
  const notesRef = useRef(null);


  // Team collaboration state
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isSharedWithTeam, setIsSharedWithTeam] = useState(false);
  const [assignedTo, setAssignedTo] = useState(null);
  const [teamNotes, setTeamNotes] = useState('');
  const teamNotesRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchDeal();
      fetchLinkedContacts();
      fetchAllContacts();
      fetchPipelines();
    }
  }, [dealId, user]);
  
  // Update available stages when pipeline selection changes
  useEffect(() => {
    if (selectedPipelineId && pipelines.length > 0) {
      const pipeline = pipelines.find(p => p.id === selectedPipelineId);
      if (pipeline) {
        const sortedStages = (pipeline.pipeline_stages || []).sort((a, b) => a.display_order - b.display_order);
        setAvailableStages(sortedStages);
      }
    }
  }, [selectedPipelineId, pipelines]);
  
  const fetchPipelines = async () => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/pipelines`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        const pipelinesWithSortedStages = data.pipelines.map(p => ({
          ...p,
          pipeline_stages: (p.pipeline_stages || []).sort((a, b) => a.display_order - b.display_order)
        }));
        setPipelines(pipelinesWithSortedStages);
      }
    } catch (error) {
      console.error('Error fetching pipelines:', error);
    }
  };
  
  // Click away handler for contact dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(event.target)) {
        setShowContactDropdown(false);
        setContactSearchTerm('');
      }
      // Close More menu when clicking outside
      if (showMoreMenu && !event.target.closest('[data-more-menu]')) {
        setShowMoreMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMoreMenu]);

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
      
      // Set pipeline and stage state
      setSelectedPipelineId(data.pipeline_id);
      setSelectedStageId(data.pipeline_stage_id);
      
      // Set team states
      setIsSharedWithTeam(data.is_shared_with_team || false);
      setAssignedTo(data.assigned_to);
      setTeamNotes(data.team_notes || '');
      
      // Set date states
      if (data.target_close_date) setTargetCloseDate(new Date(data.target_close_date));
      if (data.next_action_date) setNextActionDate(new Date(data.next_action_date));
      if (data.last_contact_date) setLastContactDate(new Date(data.last_contact_date));
      
      // Load teams if deal has team_id
      if (data.team_id) {
        await loadTeamMembers(data.team_id);
      }
    } catch (error) {
      console.error('Error fetching deal:', error);
      toast.error('Failed to load deal');
      navigate('/deals');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async (teamId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/teams/${teamId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const handleToggleTeamSharing = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/deals/${dealId}/share`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setIsSharedWithTeam(data.is_shared);
        toast.success(data.message);
        await fetchDeal();
      } else {
        toast.error('Failed to update sharing');
      }
    } catch (error) {
      console.error('Error toggling team sharing:', error);
      toast.error('Failed to update sharing');
    }
  };

  const handleAssignDeal = async (userId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/deals/${dealId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assigned_to: userId })
      });

      if (response.ok) {
        setAssignedTo(userId);
        toast.success('Deal assigned successfully');
        await fetchDeal();
      } else {
        toast.error('Failed to assign deal');
      }
    } catch (error) {
      console.error('Error assigning deal:', error);
      toast.error('Failed to assign deal');
    }
  };

  const handleSaveTeamNotes = async () => {
    try {
      const notes = teamNotesRef.current?.value || '';
      
      const response = await fetch(`${BACKEND_URL}/api/deals/${dealId}/team-notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes })
      });

      if (response.ok) {
        setTeamNotes(notes);
        toast.success('Team notes saved');
      } else {
        toast.error('Failed to save team notes');
      }
    } catch (error) {
      console.error('Error saving team notes:', error);
      toast.error('Failed to save team notes');
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

    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${dealId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('deals')
        .update({ image_url: publicUrl })
        .eq('id', dealId);

      if (updateError) throw updateError;

      toast.success('Image uploaded successfully');
      fetchDeal();
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

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${dealId}/${Date.now()}_${file.name}`;

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
          owner_id: user.id,
          deal_id: dealId,
          name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size
        }]);

      if (insertError) throw insertError;

      toast.success('Document uploaded successfully');
      fetchDeal();
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
  
  

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in to save changes');
      return;
    }
    
    setIsSaving(true);
    try {
      // Collect all values from refs
      const updateData = {
        title: titleRef.current?.value || deal.title,
        address: addressRef.current?.value || deal.address,
        asset_type: assetTypeRef.current?.value || deal.asset_type,
        
        // Pipeline & Stage - NEW
        pipeline_id: selectedPipelineId,
        pipeline_stage_id: selectedStageId,
        stage: stageRef.current?.value || deal.stage, // Keep for backward compatibility
        status: stageRef.current?.value || deal.status,
        
        priority: priorityRef.current?.value || 'Medium',
        owner_visibility: visibilityRef.current?.value || 'Team',
        
        // Property Details
        size: sizeRef.current?.value ? parseFloat(sizeRef.current.value.replace(/,/g, '')) : null,
        lot_size: lotSizeRef.current?.value ? parseFloat(lotSizeRef.current.value) : null,
        year_built: yearBuiltRef.current?.value ? parseInt(yearBuiltRef.current.value) : null,
        zoning: zoningRef.current?.value || null,
        occupancy: occupancyRef.current?.value ? parseFloat(occupancyRef.current.value) : null,
        parking_spaces: parkingSpacesRef.current?.value ? parseInt(parkingSpacesRef.current.value) : null,
        key_features: keyFeaturesRef.current?.value || null,
        
        // Financial
        price: priceRef.current?.value ? parseFloat(priceRef.current.value.replace(/,/g, '')) : null,
        cap_rate: capRateRef.current?.value ? parseFloat(capRateRef.current.value) : null,
        noi: noiRef.current?.value ? parseFloat(noiRef.current.value.replace(/,/g, '')) : null,
        lease_type: leaseTypeRef.current?.value || null,
        proforma_notes: proformaNotesRef.current?.value || null,
        
        // Deal Management
        next_action: nextActionRef.current?.value || null,
        next_action_date: nextActionDate ? nextActionDate.toISOString().split('T')[0] : null,
        target_close_date: targetCloseDate ? targetCloseDate.toISOString().split('T')[0] : null,
        last_contact_date: lastContactDate ? lastContactDate.toISOString().split('T')[0] : null,
        
        // Notes
        notes: notesRef.current?.value || null,
        
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId);
      
      if (error) throw error;
      
      // Refresh deal data
      await fetchDeal();
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
      
      if (error) {
        console.error('Contact link error:', error);
        throw error;
      }
      
      setSelectedContacts([...selectedContacts, contactId]);
      await fetchLinkedContacts();
      setContactSearchTerm('');
      setShowContactDropdown(false);
      toast.success('Contact linked successfully');
    } catch (error) {
      console.error('Error linking contact:', error);
      toast.error('Failed to link contact: ' + error.message);
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

  const handleContactCreated = async (newContact) => {
    // Refresh the linked contacts list
    await fetchLinkedContacts();
    await fetchAllContacts();
    setShowContactFormPanel(false);
  };


  const handleDelete = async () => {
    if (!deal || !deal.id) {
      toast.error('Cannot delete this property');
      return;
    }

    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', deal.id);

      if (error) throw error;

      toast.success('Property deleted successfully');
      navigate('/deals');
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };


  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Price calculations
  const calculatePricePerSQFT = () => {
    // Price per SQFT (lot) = purchase_price / (lot_size_in_acres * 43560)
    if (!deal?.lot_size || !deal?.price) return 'N/A';
    const sqft = deal.lot_size * 43560; // Convert acres to square feet
    const pricePerSqft = deal.price / sqft;
    return formatPrice(pricePerSqft);
  };

  const calculatePricePerAC = () => {
    // Price per AC = purchase_price / lot_size_in_acres
    if (!deal?.lot_size || !deal?.price) return 'N/A';
    const pricePerAc = deal.price / deal.lot_size;
    return formatPrice(pricePerAc);
  };

  const calculatePricePerSQFTBuilding = () => {
    // Price per SQFT (Building) = purchase_price / building_size
    if (!deal?.size || !deal?.price) return 'N/A';
    const pricePerSqft = deal.price / deal.size;
    return formatPrice(pricePerSqft);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!deal) return null;
  
  const hasValidCoordinates = deal.latitude && deal.longitude && 
                              !isNaN(parseFloat(deal.latitude)) && 
                              !isNaN(parseFloat(deal.longitude));

  return (
    <div style={{ background: '#000000', minHeight: '100vh' }}>
      {/* Full-Width Header */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '40px 0'
      }} data-testid="deal-details-page">
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 40px' }}>
          {/* Clean Symmetrical Header */}
          <div style={{
            padding: '32px 32px 24px 32px',
            marginBottom: '0'
          }}>
            {/* Action Bar - Symmetrical Layout */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '32px'
            }}>
              {/* Left: Back Button */}
              <button
                onClick={() => navigate('/deals')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  padding: '8px 0',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'color 0.2s',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#00b8d4'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
              >
                <ArrowLeft size={16} />
                Back
              </button>

              {/* Right: Action Buttons */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '8px'
              }}>
                {/* Primary Action: Save */}
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    background: '#00b8d4',
                    border: 'none',
                    color: '#FFFFFF',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    boxShadow: '0 2px 8px rgba(0, 184, 212, 0.25)'
                  }}
                >
                  <Save size={16} className="mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>

                {/* Secondary: Share */}
                <Button
                  onClick={handleShare}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  <Share2 size={16} className="mr-2" />
                  Share
                </Button>

                {/* More Menu */}
                <div style={{ position: 'relative' }} data-more-menu>
                  <Button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.7)',
                      padding: '8px 12px',
                      borderRadius: '8px'
                    }}
                  >
                    <MoreVertical size={16} />
                  </Button>

                  {/* Dropdown Menu */}
                  {showMoreMenu && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      background: 'rgba(15, 23, 42, 0.98)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '8px',
                      minWidth: '180px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(20px)',
                      zIndex: 1000
                    }}>
                      {linkedContacts.length > 0 && linkedContacts[0].email && (
                        <button
                          onClick={() => {
                            setEmailRecipient({
                              id: linkedContacts[0].id,
                              email: linkedContacts[0].email,
                              name: linkedContacts[0].full_name || linkedContacts[0].name
                            });
                            setShowEmailCompose(true);
                            setShowMoreMenu(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.2s',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                            e.currentTarget.style.color = '#8b5cf6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                          }}
                        >
                          <Mail size={16} />
                          Send Email
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          setShowMoreMenu(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.2s',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                          e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                        }}
                      >
                        <Trash2 size={16} />
                        Delete Deal
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Centered Hero Section - Address & Tags */}
            <div style={{ textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
              {/* Property Address - Hero Text */}
              <h1 style={{ 
                color: '#FFFFFF', 
                fontSize: 'clamp(24px, 4vw, 38px)',
                fontWeight: '700',
                letterSpacing: '-0.02em',
                marginBottom: '20px',
                lineHeight: '1.3'
              }}>
                {deal.address || 'Untitled Property'}
              </h1>

              {/* Property Tags - Centered Below Address */}
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '10px', 
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* Asset Type Badge */}
                {deal.asset_type && (
                  <span style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: `${getAssetTypeColor(deal.asset_type).bg}`,
                    color: getAssetTypeColor(deal.asset_type).color,
                    border: `1px solid ${getAssetTypeColor(deal.asset_type).border}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Home size={14} />
                    {deal.asset_type}
                  </span>
                )}

                {/* Stage Badge */}
                {deal.pipeline_stages && (
                  <span style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: `${deal.pipeline_stages.color}20`,
                    color: deal.pipeline_stages.color,
                    border: `1px solid ${deal.pipeline_stages.color}40`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {deal.pipeline_stages.name}
                  </span>
                )}

                {/* Price Badge */}
                {deal.price && (
                  <span style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: 'rgba(0, 184, 212, 0.1)',
                    color: '#00b8d4',
                    border: '1px solid rgba(0, 184, 212, 0.2)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <DollarSign size={14} />
                    {formatPrice(deal.price)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px' }}>
        {/* Transaction Timeline */}
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
                  {isEditMode ? (
                    <input
                      ref={titleRef}
                      type="text"
                      defaultValue={deal.title}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.title || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Address</p>
                  {isEditMode ? (
                    <input
                      ref={addressRef}
                      type="text"
                      defaultValue={deal.address}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.address || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Asset Type</p>
                  {isEditMode ? (
                    <select
                      ref={assetTypeRef}
                      defaultValue={deal.asset_type}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    >
                      <option value="Office">Office</option>
                      <option value="Retail">Retail</option>
                      <option value="Industrial">Industrial</option>
                      <option value="Multifamily">Multifamily</option>
                      <option value="Land">Land</option>
                      <option value="Mixed Use">Mixed Use</option>
                    </select>
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.asset_type || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Pipeline</p>
                  <select
                    value={selectedPipelineId || ''}
                    onChange={(e) => {
                      setSelectedPipelineId(e.target.value);
                      setSelectedStageId(null); // Reset stage when pipeline changes
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 184, 212, 0.3)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Select Pipeline...</option>
                    {pipelines.map((pipeline) => (
                      <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Stage</p>
                  <select
                    value={selectedStageId || ''}
                    onChange={(e) => setSelectedStageId(e.target.value)}
                    disabled={!selectedPipelineId}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 184, 212, 0.3)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      opacity: selectedPipelineId ? 1 : 0.5
                    }}
                  >
                    <option value="">Select Stage...</option>
                    {availableStages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Priority</p>
                  <select
                    ref={priorityRef}
                    defaultValue={deal.priority || 'Medium'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 184, 212, 0.3)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '14px'
                    }}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Visibility</p>
                  <select
                    ref={visibilityRef}
                    defaultValue={deal.owner_visibility || 'Team'}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 184, 212, 0.3)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '14px'
                    }}
                  >
                    <option value="Private">Private</option>
                    <option value="Team">Team</option>
                    <option value="Public">Public</option>
                  </select>
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
                  {isEditMode ? (
                    <input
                      ref={sizeRef}
                      type="text"
                      defaultValue={deal.size || ''}
                      placeholder="5,000"
                      onChange={(e) => {
                        const formatted = formatNumberWithCommas(e.target.value);
                        e.target.value = formatted;
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>
                      {deal.size ? parseFloat(deal.size).toLocaleString() : 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Lot Size (acres)</p>
                  {isEditMode ? (
                    <input
                      ref={lotSizeRef}
                      type="text"
                      defaultValue={deal.lot_size || ''}
                      placeholder="1.5"
                      onChange={(e) => {
                        const formatted = formatNumberWithCommas(e.target.value);
                        e.target.value = formatted;
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>
                      {deal.lot_size ? parseFloat(deal.lot_size).toLocaleString() : 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Year Built</p>
                  {isEditMode ? (
                    <input
                      ref={yearBuiltRef}
                      type="text"
                      defaultValue={deal.year_built || ''}
                      placeholder="2020"
                      onChange={(e) => {
                        const formatted = formatNumberWithCommas(e.target.value);
                        e.target.value = formatted;
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.year_built || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Zoning</p>
                  {isEditMode ? (
                    <input
                      ref={zoningRef}
                      type="text"
                      defaultValue={deal.zoning || ''}
                      placeholder="C-2"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.zoning || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Occupancy (%)</p>
                  {isEditMode ? (
                    <input
                      ref={occupancyRef}
                      type="text"
                      defaultValue={deal.occupancy || ''}
                      placeholder="95.5"
                      onChange={(e) => {
                        const formatted = formatNumberWithCommas(e.target.value);
                        e.target.value = formatted;
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.occupancy || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Parking Spaces</p>
                  {isEditMode ? (
                    <input
                      ref={parkingSpacesRef}
                      type="text"
                      defaultValue={deal.parking_spaces || ''}
                      placeholder="50"
                      onChange={(e) => {
                        const formatted = formatNumberWithCommas(e.target.value);
                        e.target.value = formatted;
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.parking_spaces || 'N/A'}</p>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>Key Features</p>
                {isEditMode ? (
                  <textarea
                    ref={keyFeaturesRef}
                    defaultValue={deal.key_features || ''}
                    placeholder="Highway access, Updated HVAC, Recent renovations..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 184, 212, 0.3)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                ) : (
                  <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.key_features || 'N/A'}</p>
                )}
              </div>
            </div>

            {/* Contacts & Activities - ALWAYS VISIBLE */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: isEditMode ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Linked Contacts {isEditMode && <span style={{ color: 'rgba(0, 184, 212, 0.6)', fontSize: '11px', fontWeight: '400', marginLeft: '8px' }}>• EDITING</span>}
              </h3>
              
              {isEditMode ? (
                <div className="space-y-4">
                  {/* Link Contacts */}
                  <div>
                    <Label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>Search & Link Contacts</Label>
                    <div className="relative" ref={contactDropdownRef}>
                      <input
                        type="text"
                        placeholder="Search contacts by name..."
                        value={contactSearchTerm}
                        onChange={(e) => {
                          setContactSearchTerm(e.target.value);
                          setShowContactDropdown(e.target.value.length > 0);
                        }}
                        onFocus={() => contactSearchTerm && setShowContactDropdown(true)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(0, 184, 212, 0.3)',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          fontSize: '14px'
                        }}
                      />
                      
                      {showContactDropdown && contactSearchTerm && (
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
                                      onClick={() => handleAddContact(contact.id)}
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
                  <div>
                    <Label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                      Linked Contacts ({linkedContacts.length})
                    </Label>
                    
                    {linkedContacts.length > 0 ? (
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
                    ) : (
                      <div style={{
                        padding: '20px',
                        background: 'rgba(0, 184, 212, 0.05)',
                        border: '1px solid rgba(0, 184, 212, 0.2)',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '16px' }}>
                          No contacts linked to this deal yet
                        </p>
                        <button
                          onClick={() => setShowContactFormPanel(true)}
                          style={{
                            padding: '10px 16px',
                            background: 'rgba(0, 184, 212, 0.1)',
                            border: '1px solid rgba(0, 184, 212, 0.3)',
                            borderRadius: '8px',
                            color: '#00b8d4',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 150ms ease',
                            width: '100%',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 184, 212, 0.15)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <User size={16} />
                          Create New Contact
                        </button>
                      </div>
                    )}
                    
                    {/* Add Contact button when contacts exist */}
                    {linkedContacts.length > 0 && (
                      <button
                        onClick={() => setShowContactFormPanel(true)}
                        style={{
                          marginTop: '12px',
                          padding: '10px 16px',
                          background: 'rgba(0, 184, 212, 0.1)',
                          border: '1px solid rgba(0, 184, 212, 0.3)',
                          borderRadius: '8px',
                          color: '#00b8d4',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 150ms ease',
                          width: '100%',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 184, 212, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <User size={16} />
                        Add Another Contact
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* View Mode - Always show contact management */}
                  <div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Contact Management
                    </p>
                    {linkedContacts.length > 0 ? (
                      <>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                          {linkedContacts.length} contact{linkedContacts.length !== 1 ? 's' : ''} linked to this deal
                        </p>
                        <div className="space-y-2">
                          {linkedContacts.map((contact, idx) => (
                            <div key={contact.id} style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(100, 116, 139, 0.2)', borderRadius: '8px' }}>
                              <div style={{ color: '#FFFFFF', fontWeight: '500', fontSize: '14px', marginBottom: '4px' }}>
                                {contact.name} {idx === 0 && <span style={{ color: '#00b8d4', fontSize: '11px' }}>(Primary)</span>}
                              </div>
                              {contact.company && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{contact.company}</div>}
                              {contact.email && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '2px' }}>{contact.email}</div>}
                            </div>
                          ))}
                        </div>
                        {/* Add Another Contact button in view mode */}
                        <button
                          onClick={() => setShowContactFormPanel(true)}
                          style={{
                            marginTop: '12px',
                            padding: '10px 16px',
                            background: 'rgba(0, 184, 212, 0.1)',
                            border: '1px solid rgba(0, 184, 212, 0.3)',
                            borderRadius: '8px',
                            color: '#00b8d4',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 150ms ease',
                            width: '100%',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 184, 212, 0.15)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <User size={16} />
                          Add Another Contact
                        </button>
                      </>
                    ) : (
                      <div style={{
                        padding: '20px',
                        background: 'rgba(0, 184, 212, 0.05)',
                        border: '1px solid rgba(0, 184, 212, 0.2)',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '16px' }}>
                          No contacts linked to this deal yet
                        </p>
                        <button
                          onClick={() => setShowContactFormPanel(true)}
                          style={{
                            padding: '10px 16px',
                            background: 'rgba(0, 184, 212, 0.1)',
                            border: '1px solid rgba(0, 184, 212, 0.3)',
                            borderRadius: '8px',
                            color: '#00b8d4',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 150ms ease',
                            width: '100%',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 184, 212, 0.15)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <User size={16} />
                          Create New Contact
                        </button>
                      </div>
                    )}
                  </div>
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
                  {isEditMode ? (
                    <DatePicker
                      selected={targetCloseDate}
                      onChange={(date) => setTargetCloseDate(date)}
                      placeholderText="mm/dd/yyyy"
                      dateFormat="MM/dd/yyyy"
                      className="custom-datepicker"
                      wrapperClassName="w-full"
                      customInput={
                        <input
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(0, 184, 212, 0.3)',
                            borderRadius: '6px',
                            color: '#FFFFFF',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        />
                      }
                    />
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>
                      {deal.target_close_date ? new Date(deal.target_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Next Action Date</p>
                  {isEditMode ? (
                    <DatePicker
                      selected={nextActionDate}
                      onChange={(date) => setNextActionDate(date)}
                      placeholderText="mm/dd/yyyy"
                      dateFormat="MM/dd/yyyy"
                      className="custom-datepicker"
                      wrapperClassName="w-full"
                      customInput={
                        <input
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(0, 184, 212, 0.3)',
                            borderRadius: '6px',
                            color: '#FFFFFF',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        />
                      }
                    />
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>
                      {deal.next_action_date ? new Date(deal.next_action_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Last Contact Date</p>
                  {isEditMode ? (
                    <DatePicker
                      selected={lastContactDate}
                      onChange={(date) => setLastContactDate(date)}
                      placeholderText="mm/dd/yyyy"
                      dateFormat="MM/dd/yyyy"
                      className="custom-datepicker"
                      wrapperClassName="w-full"
                      customInput={
                        <input
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(0, 184, 212, 0.3)',
                            borderRadius: '6px',
                            color: '#FFFFFF',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        />
                      }
                    />
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>
                      {deal.last_contact_date ? new Date(deal.last_contact_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Next Action</p>
                  {isEditMode ? (
                    <input
                      ref={nextActionRef}
                      type="text"
                      defaultValue={deal.next_action || ''}
                      placeholder="Follow up call, send proposal..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>{deal.next_action || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: isEditMode ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Notes {isEditMode && <span style={{ color: 'rgba(0, 184, 212, 0.6)', fontSize: '11px', fontWeight: '400', marginLeft: '8px' }}>• EDITING</span>}
              </h3>
              {isEditMode ? (
                <textarea
                  ref={notesRef}
                  defaultValue={deal.notes || ''}
                  placeholder="Add detailed notes about this property..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 184, 212, 0.3)',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              ) : (
                <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500', whiteSpace: 'pre-wrap' }}>{deal.notes || 'No notes added'}</p>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: isEditMode ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Financial Details {isEditMode && <span style={{ color: 'rgba(0, 184, 212, 0.6)', fontSize: '11px', fontWeight: '400', marginLeft: '8px' }}>• EDITING</span>}
              </h3>
              <div className="space-y-4">
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Asking Price</p>
                  {isEditMode ? (
                    <input
                      ref={priceRef}
                      type="text"
                      defaultValue={deal.price || ''}
                      placeholder="2,500,000"
                      onChange={(e) => {
                        const formatted = formatNumberWithCommas(e.target.value);
                        e.target.value = formatted;
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '24px', color: '#00d4aa', fontWeight: '700' }}>
                      {formatPrice(deal.price)}
                    </p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Price per SQFT</p>
                  <p style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '500' }}>
                    {calculatePricePerSQFT()}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Price per AC</p>
                  <p style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '500' }}>
                    {calculatePricePerAC()}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Price per SQFT (Building)</p>
                  <p style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '500' }}>
                    {calculatePricePerSQFTBuilding()}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Cap Rate</p>
                  {isEditMode ? (
                    <input
                      ref={capRateRef}
                      type="text"
                      defaultValue={deal.cap_rate || ''}
                      placeholder="7.5"
                      onChange={(e) => {
                        const formatted = formatNumberWithCommas(e.target.value);
                        e.target.value = formatted;
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '500' }}>
                      {deal.cap_rate ? `${deal.cap_rate}%` : 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>NOI</p>
                  {isEditMode ? (
                    <input
                      ref={noiRef}
                      type="text"
                      defaultValue={deal.noi || ''}
                      placeholder="187,500"
                      onChange={(e) => {
                        const formatted = formatNumberWithCommas(e.target.value);
                        e.target.value = formatted;
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: '500' }}>
                      {formatPrice(deal.noi)}
                    </p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Lease Type</p>
                  {isEditMode ? (
                    <input
                      ref={leaseTypeRef}
                      type="text"
                      defaultValue={deal.lease_type || ''}
                      placeholder="NNN, Gross, Modified Gross"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '16px', color: '#FFFFFF', fontWeight: '500' }}>
                      {deal.lease_type || 'N/A'}
                    </p>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>Proforma Notes</p>
                  {isEditMode ? (
                    <textarea
                      ref={proformaNotesRef}
                      defaultValue={deal.proforma_notes || ''}
                      placeholder="Financial notes and assumptions..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: '500', whiteSpace: 'pre-wrap' }}>
                      {deal.proforma_notes || 'N/A'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Location Map */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Location Map</h3>
              {hasValidCoordinates ? (
                <div style={{ height: '300px', borderRadius: '8px', overflow: 'hidden' }}>
                  <MapContainer
                    center={[parseFloat(deal.latitude), parseFloat(deal.longitude)]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    <Marker position={[parseFloat(deal.latitude), parseFloat(deal.longitude)]} />
                  </MapContainer>
                </div>
              ) : (
                <div style={{ 
                  height: '300px', 
                  borderRadius: '8px', 
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                    <MapPin className="w-12 h-12 mx-auto mb-2" style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: '14px' }}>No location data available</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Email Activity Timeline */}
            {token && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                <EmailActivityTimeline
                  dealId={dealId}
                  token={token}
                  BACKEND_URL={BACKEND_URL}
                />
              </div>
            )}

            {/* Team Collaboration Panel */}
            <TeamCollaborationPanel
              deal={deal}
              isSharedWithTeam={isSharedWithTeam}
              assignedTo={assignedTo}
              teamMembers={teamMembers}
              teamNotesRef={teamNotesRef}
              onToggleSharing={handleToggleTeamSharing}
              onAssignDeal={handleAssignDeal}
              onSaveTeamNotes={handleSaveTeamNotes}
            />
          </div>
        </div>
      </div>

      {/* Email Compose Modal */}
      <EmailComposeModal
        isOpen={showEmailCompose}
        onClose={() => {
          setShowEmailCompose(false);
          setEmailRecipient(null);
        }}
        onSend={() => {
          // Refresh page to show new email activity
          fetchDeal();
        }}
        recipient={emailRecipient}
        dealContext={deal ? {
          id: deal.id,
          title: deal.title,
          address: deal.address,
          price: deal.price
        } : null}
        token={token}
        BACKEND_URL={BACKEND_URL}
      />

      {/* Contact Form Panel */}
      <ContactFormPanel
        isOpen={showContactFormPanel}
        onClose={() => setShowContactFormPanel(false)}
        onContactCreated={handleContactCreated}
        editingContact={null}
        dealId={dealId}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
          zIndex: 2000
        }}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(20, 22, 28, 0.98), rgba(15, 17, 23, 0.98))',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '450px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9)',
          }}>
            <h3 style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>
              Delete Property?
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
              Are you sure you want to delete "{deal?.address || deal?.title}"? This action cannot be undone and will permanently remove all associated data including documents, contacts, and timeline history.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.15))',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '10px',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(239, 68, 68, 0.25))';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.15))';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Delete Property
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealDetails;