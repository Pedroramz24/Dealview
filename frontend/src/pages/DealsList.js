import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Eye, Edit, Trash2, X, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import { geocodeAddress } from '../utils/geocoding';
import { 
  formatNumberWithCommas, 
  parseFormattedNumber, 
  handleFormattedNumberInput,
  calculatePricePerSqft 
} from '../utils/numberFormat';

const DealsList = () => {
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [dealContactLinks, setDealContactLinks] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterAssetType, setFilterAssetType] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [originalDeal, setOriginalDeal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [newDeal, setNewDeal] = useState({
    // Core
    deal_title: '',
    property_address: '',
    asset_type: 'Office',
    deal_status: 'New',
    pipeline_stage: 'New',
    priority: 'Medium',
    owner_visibility: 'Team',
    
    // Location
    latitude: 29.4241,
    longitude: -98.4936,
    display_on_map: true,
    market: 'San Antonio',
    submarket: '',
    
    // Property Facts
    building_size: '',
    lot_size: '',
    year_built: '',
    zoning: '',
    occupancy: '',
    parking_spaces: '',
    key_features: '',
    
    // Financials
    asking_price: '',
    noi: '',
    cap_rate: '',
    lease_type: '',
    proforma_notes: '',
    
    // Contacts
    primary_contact: '',
    additional_contacts: [],
    last_contact_date: '',
    
    // Activities
    next_action: '',
    next_action_date: '',
    notes: '',
    
    // Media
    primary_image_url: null,
    gallery_images: [],
    documents: [],
    
    // Dates
    target_close_date: '',
    external_ids: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  // Geocode address handler
  const handleAddressChange = async (address) => {
    setNewDeal({ ...newDeal, property_address: address });
    
    // Geocode if address is long enough
    if (address && address.length > 10) {
      setIsGeocoding(true);
      const result = await geocodeAddress(address);
      setIsGeocoding(false);
      
      if (result) {
        setNewDeal(prev => ({
          ...prev,
          property_address: address,
          latitude: result.lat,
          longitude: result.lon
        }));
        console.log('Geocoded:', address, '→', result.lat, result.lon);
      }
    }
  };

  // Geocode address for edit panel
  const handleEditAddressChange = async (address) => {
    handleEditChange('address', address);
    
    if (address && address.length > 10) {
      setIsGeocoding(true);
      const result = await geocodeAddress(address);
      setIsGeocoding(false);
      
      if (result) {
        handleEditChange('latitude', result.lat);
        handleEditChange('longitude', result.lon);
        console.log('Geocoded:', address, '→', result.lat, result.lon);
      }
    }
  };
  
  // Auto-calculate functions
  const calculatePricePerSFBuilding = () => {
    if (newDeal.asking_price && newDeal.building_size) {
      return (parseFloat(newDeal.asking_price) / parseFloat(newDeal.building_size)).toFixed(2);
    }
    return null;
  };
  
  const calculatePricePerSFLand = () => {
    if (newDeal.asking_price && newDeal.lot_size) {
      const sqft = parseFloat(newDeal.lot_size) * 43560;
      return (parseFloat(newDeal.asking_price) / sqft).toFixed(2);
    }
    return null;
  };
  
  const calculatePricePerAcre = () => {
    if (newDeal.asking_price && newDeal.lot_size) {
      return (parseFloat(newDeal.asking_price) / parseFloat(newDeal.lot_size)).toFixed(2);
    }
    return null;
  };
  
  const calculateCapRate = () => {
    if (newDeal.noi && newDeal.asking_price) {
      return ((parseFloat(newDeal.noi) / parseFloat(newDeal.asking_price)) * 100).toFixed(2);
    }
    return null;
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  useEffect(() => {
    filterDeals();
  }, [deals, searchTerm, filterStage, filterAssetType]);

  const fetchDeals = async () => {
    try {
      console.log('[DealsList] Fetching deals for user:', user?.id);
      
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[DealsList] Supabase error:', error);
        throw error;
      }
      
      console.log('[DealsList] Fetched deals:', data?.length || 0);
      
      // Fetch contact links for each deal
      const dealsWithContactCounts = await Promise.all((data || []).map(async (deal) => {
        const { data: links, error: linksError } = await supabase
          .from('contact_deal_links')
          .select('contact_id')
          .eq('deal_id', deal.id);
        
        return {
          ...deal,
          linked_contacts_count: links ? links.length : 0
        };
      }));
      
      setDeals(dealsWithContactCounts);
    } catch (error) {
      console.error('[DealsList] Error fetching deals:', error);
      if (error.code !== 'PGRST116') {
        toast.error('Failed to load deals: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, company, title')
        .order('name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDeals();
      fetchContacts();
    }
  }, [user]);

  const filterDeals = () => {
    let filtered = [...deals];

    if (searchTerm) {
      filtered = filtered.filter((deal) =>
        deal.property_address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStage !== 'all') {
      filtered = filtered.filter((deal) => deal.stage === filterStage);
    }

    if (filterAssetType !== 'all') {
      filtered = filtered.filter((deal) => deal.asset_type === filterAssetType);
    }

    setFilteredDeals(filtered);
  };

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create deals');
      return;
    }

    try {
      // First, upload image if provided
      let imageUrl = null;
      if (imageFile) {
        setUploadingImage(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(fileName, imageFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('Failed to upload image');
          setUploadingImage(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
        setUploadingImage(false);
      }

      // Create deal in Supabase
      const { data, error } = await supabase
        .from('deals')
        .insert([
          {
            owner_id: user.id,
            title: newDeal.deal_title || newDeal.property_address,
            address: newDeal.property_address,
            asset_type: newDeal.asset_type,
            price: newDeal.asking_price ? parseFormattedNumber(newDeal.asking_price) : null,
            size: newDeal.building_size ? parseFormattedNumber(newDeal.building_size) : null,
            latitude: newDeal.latitude,
            longitude: newDeal.longitude,
            notes: newDeal.notes,
            status: newDeal.deal_status || 'active',
            stage: newDeal.pipeline_stage || 'prospecting',
            image_url: imageUrl,
          },
        ])
        .select();

      if (error) throw error;

      toast.success('Deal created successfully');
      setShowCreateDialog(false);
      setNewDeal({
        deal_title: '',
        property_address: '',
        asset_type: 'Office',
        deal_status: 'New',
        pipeline_stage: 'New',
        asking_price: '',
        building_size: '',
        latitude: 29.4241,
        longitude: -98.4936,
        notes: '',
      });
      setImageFile(null);
      fetchDeals();
    } catch (error) {
      console.error('Error creating deal:', error);
      toast.error('Failed to create deal');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Edit Deal Handlers
  const handleEditClick = async (deal) => {
    setEditingDeal({ ...deal });
    setOriginalDeal({ ...deal });
    
    // Fetch existing contact links for this deal
    try {
      const { data: links, error } = await supabase
        .from('contact_deal_links')
        .select('contact_id')
        .eq('deal_id', deal.id);

      if (!error && links) {
        setSelectedContacts(links.map(link => link.contact_id));
      }
    } catch (error) {
      console.error('Error fetching contact links:', error);
    }
    
    setShowEditPanel(true);
  };

  const handleEditChange = (field, value) => {
    setEditingDeal(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateDeal = (deal) => {
    const errors = [];
    
    if (!deal.title && !deal.address) {
      errors.push('Either title or address is required');
    }
    
    if (deal.price && isNaN(parseFloat(deal.price))) {
      errors.push('Price must be a valid number');
    }
    
    if (deal.size && isNaN(parseFloat(deal.size))) {
      errors.push('Building size must be a valid number');
    }
    
    return errors;
  };

  const getChangedFields = (original, updated) => {
    const changes = [];
    const fields = Object.keys(updated);
    
    fields.forEach(field => {
      if (original[field] !== updated[field]) {
        changes.push({
          field,
          oldValue: original[field],
          newValue: updated[field]
        });
      }
    });
    
    return changes;
  };

  const handleSaveDeal = async () => {
    if (!user) {
      toast.error('You must be logged in to edit deals');
      return;
    }

    // Validate
    const errors = validateDeal(editingDeal);
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }

    // Get changed fields for audit
    const changes = getChangedFields(originalDeal, editingDeal);
    
    // Check if contacts have changed (this is a change even if deal fields haven't)
    const hasContactChanges = selectedContacts.length > 0;
    
    if (changes.length === 0 && !hasContactChanges) {
      toast.info('No changes to save');
      setShowEditPanel(false);
      return;
    }

    // Optimistic update
    const updatedDeals = deals.map(d => 
      d.id === editingDeal.id ? { ...editingDeal } : d
    );
    setDeals(updatedDeals);
    setShowEditPanel(false);

    try {
      // Only update deal if fields changed
      if (changes.length > 0) {
        // Prepare update data
        const updateData = {
          title: editingDeal.title,
          address: editingDeal.address,
          asset_type: editingDeal.asset_type,
          stage: editingDeal.stage,
          price: editingDeal.price ? parseFloat(editingDeal.price) : null,
          size: editingDeal.size ? parseFloat(editingDeal.size) : null,
          status: editingDeal.status,
          notes: editingDeal.notes,
          cap_rate: editingDeal.cap_rate ? parseFloat(editingDeal.cap_rate) : null,
          noi: editingDeal.noi ? parseFloat(editingDeal.noi) : null,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('deals')
          .update(updateData)
          .eq('id', editingDeal.id);

        if (error) throw error;
      }

      // Always update contact links (even if deal fields didn't change)
      // First, remove existing links
      await supabase
        .from('contact_deal_links')
        .delete()
        .eq('deal_id', editingDeal.id);

      // Then add new links if any selected
      if (selectedContacts.length > 0) {
        const links = selectedContacts.map(contactId => ({
          contact_id: contactId,
          deal_id: editingDeal.id,
          relationship_type: 'contact'
        }));

        const { error: linkError } = await supabase
          .from('contact_deal_links')
          .insert(links);

        if (linkError) throw linkError;
      }

      // Log audit entry (simplified - could be a separate audit table)
      console.log(`Deal ${editingDeal.id} edited by ${user.email} on ${new Date().toISOString()}`);
      console.log('Changed fields:', changes);

      toast.success('Deal updated successfully');
      setSelectedContacts([]); // Clear selections
      fetchDeals(); // Refresh to ensure sync
      
    } catch (error) {
      console.error('Error updating deal:', error);
      toast.error('Failed to update deal');
      
      // Revert optimistic update
      setDeals(deals);
    }
  };

  const handleDeleteDeal = async () => {
    if (!user) {
      toast.error('You must be logged in to delete deals');
      return;
    }

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', editingDeal.id);

      if (error) throw error;

      toast.success('Deal deleted successfully');
      setShowDeleteConfirm(false);
      setShowEditPanel(false);
      fetchDeals();
      
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast.error('Failed to delete deal');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditPanel(false);
    setEditingDeal(null);
    setOriginalDeal(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="deals-list-page">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Deals</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{filteredDeals.length} deals found</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="create-deal-button">
              <Plus className="w-4 h-4 mr-2" />
              Create Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Create New Deal</DialogTitle>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Fill in the property details to create a new deal</p>
            </DialogHeader>
            
            <form onSubmit={handleCreateDeal} className="space-y-8">
              {/* CORE SECTION */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '16px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Core Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Deal Title *</Label>
                    <Input
                      value={newDeal.deal_title}
                      onChange={(e) => setNewDeal({ ...newDeal, deal_title: e.target.value })}
                      required
                      placeholder="e.g., 5619 Evers Rd – Retail Center"
                      className="premium-glass-input"
                    />
                  </div>
                  
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Property Address *</Label>
                    <Input
                      value={newDeal.property_address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      required
                      placeholder="123 Main St, San Antonio, TX 78201"
                      className="premium-glass-input"
                    />
                    {isGeocoding && (
                      <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>
                        📍 Finding location...
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Asset Type *</Label>
                      <Select value={newDeal.asset_type} onValueChange={(value) => setNewDeal({ ...newDeal, asset_type: value })}>
                        <SelectTrigger className="premium-glass-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Office">Office</SelectItem>
                          <SelectItem value="Retail Centers">Retail Centers</SelectItem>
                          <SelectItem value="Industrial">Industrial</SelectItem>
                          <SelectItem value="Land">Land</SelectItem>
                          <SelectItem value="Restaurants">Restaurants</SelectItem>
                          <SelectItem value="Hotels">Hotels</SelectItem>
                          <SelectItem value="Medical">Medical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Deal Status *</Label>
                      <Select value={newDeal.deal_status} onValueChange={(value) => setNewDeal({ ...newDeal, deal_status: value, pipeline_stage: value })}>
                        <SelectTrigger className="premium-glass-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Qualified">Qualified</SelectItem>
                          <SelectItem value="Underwriting">Underwriting</SelectItem>
                          <SelectItem value="Negotiation">Negotiation</SelectItem>
                          <SelectItem value="Under Contract">Under Contract</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                          <SelectItem value="Lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Priority</Label>
                      <Select value={newDeal.priority} onValueChange={(value) => setNewDeal({ ...newDeal, priority: value })}>
                        <SelectTrigger className="premium-glass-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Owner Visibility</Label>
                    <Select value={newDeal.owner_visibility} onValueChange={(value) => setNewDeal({ ...newDeal, owner_visibility: value })}>
                      <SelectTrigger className="premium-glass-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Private">Private</SelectItem>
                        <SelectItem value="Team">Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* LOCATION & MAP */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '16px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location & Map</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Market</Label>
                    <Input
                      value={newDeal.market}
                      onChange={(e) => setNewDeal({ ...newDeal, market: e.target.value })}
                      placeholder="e.g., San Antonio"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Submarket</Label>
                    <Input
                      value={newDeal.submarket}
                      onChange={(e) => setNewDeal({ ...newDeal, submarket: e.target.value })}
                      placeholder="e.g., NW"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={newDeal.latitude}
                      onChange={(e) => setNewDeal({ ...newDeal, latitude: e.target.value })}
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={newDeal.longitude}
                      onChange={(e) => setNewDeal({ ...newDeal, longitude: e.target.value })}
                      className="premium-glass-input"
                    />
                  </div>
                </div>
              </div>

              {/* PROPERTY FACTS */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '16px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Property Facts</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Building Size (SF)</Label>
                    <Input
                      type="text"
                      value={formatNumberWithCommas(newDeal.building_size)}
                      onChange={(e) => handleFormattedNumberInput(e, (val) => setNewDeal({ ...newDeal, building_size: val }))}
                      placeholder="5,000"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Lot Size (acres)</Label>
                    <Input
                      type="text"
                      value={newDeal.lot_size}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setNewDeal({ ...newDeal, lot_size: val });
                        }
                      }}
                      placeholder="1.5"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Year Built</Label>
                    <Input
                      type="number"
                      value={newDeal.year_built}
                      onChange={(e) => setNewDeal({ ...newDeal, year_built: e.target.value })}
                      placeholder="2020"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Zoning</Label>
                    <Input
                      value={newDeal.zoning}
                      onChange={(e) => setNewDeal({ ...newDeal, zoning: e.target.value })}
                      placeholder="C-2"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Occupancy (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={newDeal.occupancy}
                      onChange={(e) => setNewDeal({ ...newDeal, occupancy: e.target.value })}
                      placeholder="95"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Parking Spaces</Label>
                    <Input
                      type="number"
                      value={newDeal.parking_spaces}
                      onChange={(e) => setNewDeal({ ...newDeal, parking_spaces: e.target.value })}
                      placeholder="50"
                      className="premium-glass-input"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Key Features</Label>
                  <Input
                    value={newDeal.key_features}
                    onChange={(e) => setNewDeal({ ...newDeal, key_features: e.target.value })}
                    placeholder="Corner lot, highway visibility, new HVAC"
                    className="premium-glass-input"
                  />
                </div>
              </div>

              {/* FINANCIALS */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '16px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financials</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Asking Price *</Label>
                    <Input
                      type="text"
                      value={formatNumberWithCommas(newDeal.asking_price)}
                      onChange={(e) => handleFormattedNumberInput(e, (val) => setNewDeal({ ...newDeal, asking_price: val }))}
                      required
                      placeholder="1,000,000"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>NOI</Label>
                    <Input
                      type="text"
                      value={formatNumberWithCommas(newDeal.noi)}
                      onChange={(e) => handleFormattedNumberInput(e, (val) => setNewDeal({ ...newDeal, noi: val }))}
                      placeholder="75,000"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Cap Rate (%)</Label>
                    <Input
                      type="text"
                      value={newDeal.cap_rate}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setNewDeal({ ...newDeal, cap_rate: val });
                        }
                      }}
                      placeholder="7.5"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Lease Type</Label>
                    <Select value={newDeal.lease_type} onValueChange={(value) => setNewDeal({ ...newDeal, lease_type: value })}>
                      <SelectTrigger className="premium-glass-input">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NNN">NNN</SelectItem>
                        <SelectItem value="Gross">Gross</SelectItem>
                        <SelectItem value="Modified Gross">Modified Gross</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Price per SQFT Display */}
                {newDeal.asking_price && newDeal.building_size && (
                  <div className="mt-4">
                    <div style={{ padding: '12px', background: 'rgba(0,184,212,0.1)', borderRadius: '8px', border: '1px solid rgba(0,184,212,0.3)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'block' }}>Price per SQFT</span>
                      <span style={{ color: '#00b8d4', fontSize: '18px', fontWeight: '600' }}>
                        {calculatePricePerSqft(newDeal.asking_price, newDeal.building_size)}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="mt-4">
                  <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Pro Forma Notes</Label>
                  <textarea
                    className="premium-glass-input w-full min-h-[80px] p-3"
                    value={newDeal.proforma_notes}
                    onChange={(e) => setNewDeal({ ...newDeal, proforma_notes: e.target.value })}
                    placeholder="Add financial assumptions or pro forma details..."
                  />
                </div>
                
                {/* Auto-Calculations Display */}
                {(calculatePricePerSFBuilding() || calculatePricePerSFLand() || calculatePricePerAcre() || calculateCapRate()) && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {calculatePricePerSFBuilding() && (
                      <div style={{ padding: '12px', background: 'rgba(0,184,212,0.1)', borderRadius: '8px', border: '1px solid rgba(0,184,212,0.3)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'block' }}>Price/SF (Building)</span>
                        <span style={{ color: '#00b8d4', fontSize: '18px', fontWeight: '600' }}>${calculatePricePerSFBuilding()}</span>
                      </div>
                    )}
                    {calculatePricePerAcre() && (
                      <div style={{ padding: '12px', background: 'rgba(0,184,212,0.1)', borderRadius: '8px', border: '1px solid rgba(0,184,212,0.3)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'block' }}>Price/Acre</span>
                        <span style={{ color: '#00b8d4', fontSize: '18px', fontWeight: '600' }}>${calculatePricePerAcre()}</span>
                      </div>
                    )}
                    {calculateCapRate() && (
                      <div style={{ padding: '12px', background: 'rgba(0,184,212,0.1)', borderRadius: '8px', border: '1px solid rgba(0,184,212,0.3)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', display: 'block' }}>Auto Cap Rate</span>
                        <span style={{ color: '#00b8d4', fontSize: '18px', fontWeight: '600' }}>{calculateCapRate()}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CONTACTS & ROLES */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '16px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contacts & Roles</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Primary Contact</Label>
                    <div className="relative">
                      <Input
                        value={newDeal.primary_contact}
                        onChange={(e) => {
                          setNewDeal({ ...newDeal, primary_contact: e.target.value });
                          setContactSearchTerm(e.target.value);
                        }}
                        onFocus={() => setContactSearchTerm(newDeal.primary_contact || '')}
                        placeholder="Search or type contact name..."
                        className="premium-glass-input"
                      />
                      
                      {/* Contact Suggestions Dropdown */}
                      {contactSearchTerm && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '4px',
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(0, 184, 212, 0.3)',
                          borderRadius: '8px',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          zIndex: 50,
                          backdropFilter: 'blur(20px)'
                        }}>
                          {contacts
                            .filter(c => 
                              c.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                              (c.email && c.email.toLowerCase().includes(contactSearchTerm.toLowerCase())) ||
                              (c.company && c.company.toLowerCase().includes(contactSearchTerm.toLowerCase()))
                            )
                            .slice(0, 5)
                            .map(contact => (
                              <div
                                key={contact.id}
                                onClick={() => {
                                  setNewDeal({ ...newDeal, primary_contact: contact.name });
                                  setContactSearchTerm('');
                                }}
                                style={{
                                  padding: '12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <div style={{ color: '#FFFFFF', fontWeight: '500' }}>{contact.name}</div>
                                {contact.company && (
                                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{contact.company}</div>
                                )}
                                {contact.email && (
                                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{contact.email}</div>
                                )}
                              </div>
                            ))}
                          
                          {/* Create New Contact Option */}
                          <div
                            onClick={() => {
                              navigate('/contacts?create=true&name=' + encodeURIComponent(contactSearchTerm));
                            }}
                            style={{
                              padding: '12px',
                              cursor: 'pointer',
                              background: 'rgba(0, 184, 212, 0.15)',
                              color: '#00b8d4',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 184, 212, 0.25)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 184, 212, 0.15)'}
                          >
                            <Plus size={16} />
                            Create new contact "{contactSearchTerm}"
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Last Contact Date</Label>
                    <Input
                      type="date"
                      value={newDeal.last_contact_date}
                      onChange={(e) => setNewDeal({ ...newDeal, last_contact_date: e.target.value })}
                      className="premium-glass-input"
                    />
                  </div>
                </div>
              </div>

              {/* ACTIVITIES & NOTES */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '16px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Activities & Notes</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Next Action</Label>
                    <Input
                      value={newDeal.next_action}
                      onChange={(e) => setNewDeal({ ...newDeal, next_action: e.target.value })}
                      placeholder="e.g., Schedule tour, Send OM"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Next Action Date</Label>
                    <Input
                      type="date"
                      value={newDeal.next_action_date}
                      onChange={(e) => setNewDeal({ ...newDeal, next_action_date: e.target.value })}
                      className="premium-glass-input"
                    />
                  </div>
                </div>
                
                <div>
                  <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Internal Notes</Label>
                  <textarea
                    className="premium-glass-input w-full min-h-[120px] p-3"
                    value={newDeal.notes}
                    onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })}
                    placeholder="Add detailed notes, observations, or important information about this deal..."
                  />
                </div>
              </div>

              {/* MEDIA & DOCS */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '16px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Media & Documents</h3>
                
                <div>
                  <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '12px', display: 'block' }}>Primary Image</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="premium-glass-input"
                  />
                  {imageFile && (
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '8px' }}>
                      Selected: {imageFile.name}
                    </p>
                  )}
                </div>
              </div>

              {/* DATES & IDS */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#00b8d4', fontSize: '16px', fontWeight: '600', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dates & IDs</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Target Close Date</Label>
                    <Input
                      type="date"
                      value={newDeal.target_close_date}
                      onChange={(e) => setNewDeal({ ...newDeal, target_close_date: e.target.value })}
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>External IDs</Label>
                    <Input
                      value={newDeal.external_ids}
                      onChange={(e) => setNewDeal({ ...newDeal, external_ids: e.target.value })}
                      placeholder="MLS#, LoopNet ID, CoStar ID"
                      className="premium-glass-input"
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={uploadingImage}
                style={{
                  width: '100%',
                  background: '#00b8d4',
                  color: '#000000',
                  padding: '16px',
                  fontWeight: '600',
                  fontSize: '16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: uploadingImage ? 'not-allowed' : 'pointer'
                }}
              >
                {uploadingImage ? 'Uploading Image...' : 'Create Deal'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="glass-surface p-4 mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <Input
            placeholder="Search by address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-deals-input"
          />
        </div>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-48" data-testid="filter-stage-select">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="Qualified">Qualified</SelectItem>
            <SelectItem value="Underwriting">Underwriting</SelectItem>
            <SelectItem value="Negotiation">Negotiation</SelectItem>
            <SelectItem value="Under Contract">Under Contract</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAssetType} onValueChange={setFilterAssetType}>
          <SelectTrigger className="w-48" data-testid="filter-asset-type-select">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Office">Office</SelectItem>
            <SelectItem value="Retail">Retail</SelectItem>
            <SelectItem value="Industrial">Industrial</SelectItem>
            <SelectItem value="Land">Land</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Deals Table */}
      <div className="glass-surface overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th>Property</th>
              <th>Asset Type</th>
              <th>Asking Price</th>
              <th>Stage</th>
              <th>Linked Contacts</th>
              <th>Last Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeals.map((deal) => (
              <tr key={deal.id} data-testid={`deal-row-${deal.id}`}>
                <td>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{deal.address}</div>
                </td>
                <td>
                  <span style={{ 
                    padding: '4px 12px',
                    background: getAssetTypeColor(deal.asset_type).bg,
                    color: getAssetTypeColor(deal.asset_type).color,
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    border: `1px solid ${getAssetTypeColor(deal.asset_type).border}`,
                    display: 'inline-block'
                  }}>
                    {deal.asset_type}
                  </span>
                </td>
                <td>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatPrice(deal.price)}</span>
                </td>
                <td>
                  <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                    {deal.stage}
                  </span>
                </td>
                <td>
                  {deal.linked_contacts_count > 0 ? (
                    <div className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                      <User className="w-3 h-3" />
                      <span className="text-sm font-medium">{deal.linked_contacts_count}</span>
                    </div>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>0</span>
                  )}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(deal.last_contact)}
                </td>
                <td>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditClick(deal)}
                      variant="outline"
                      size="sm"
                      data-testid={`edit-deal-${deal.id}`}
                      style={{
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--accent)'
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => navigate(`/deals/${deal.id}`)}
                      variant="outline"
                      size="sm"
                      data-testid={`view-deal-${deal.id}`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Deal Side Panel */}
      {showEditPanel && editingDeal && (
        <div 
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={handleCancelEdit}
        >
          <div
            className="w-full md:w-[600px] h-full glass-surface overflow-hidden flex flex-col animate-slide-in"
            style={{
              borderLeft: '1px solid var(--glass-border)',
              boxShadow: '-10px 0 50px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Edit Deal
              </h2>
              <button
                onClick={handleCancelEdit}
                className="p-2 rounded-lg transition-colors"
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)'
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                {/* Core Information */}
                <div>
                  <h3 className="text-sm font-semibold uppercase mb-4" style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>
                    Core Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        Title <span style={{ color: '#ef4444' }}>*</span>
                      </Label>
                      <Input
                        value={editingDeal.title || ''}
                        onChange={(e) => handleEditChange('title', e.target.value)}
                        placeholder="Deal title"
                        style={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        Address
                      </Label>
                      <Input
                        value={editingDeal.address || ''}
                        onChange={(e) => handleEditAddressChange(e.target.value)}
                        placeholder="Property address"
                        style={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--text-primary)'
                        }}
                      />
                      {isGeocoding && (
                        <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>
                          📍 Finding location...
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                          Asset Type
                        </Label>
                        <select
                          value={editingDeal.asset_type || 'Office'}
                          onChange={(e) => handleEditChange('asset_type', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg"
                          style={{
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          <option value="Office">Office</option>
                          <option value="Retail">Retail</option>
                          <option value="Industrial">Industrial</option>
                          <option value="Multifamily">Multifamily</option>
                          <option value="Land">Land</option>
                          <option value="Mixed Use">Mixed Use</option>
                        </select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                          Stage
                        </Label>
                        <select
                          value={editingDeal.stage || 'need_to_contact'}
                          onChange={(e) => handleEditChange('stage', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg"
                          style={{
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          <option value="need_to_contact">Need to Contact</option>
                          <option value="contacted">Contacted</option>
                          <option value="prospect">Prospect</option>
                          <option value="offer_sent">Offer Sent</option>
                          <option value="under_contract">Under Contract</option>
                          <option value="closed_won">Closed Won</option>
                          <option value="overpriced">Overpriced</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        Status
                      </Label>
                      <select
                        value={editingDeal.status || 'active'}
                        onChange={(e) => handleEditChange('status', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="closed">Closed</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div>
                  <h3 className="text-sm font-semibold uppercase mb-4" style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>
                    Financial Information
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                          Asking Price ($)
                        </Label>
                        <Input
                          type="number"
                          value={editingDeal.price || ''}
                          onChange={(e) => handleEditChange('price', e.target.value)}
                          placeholder="0"
                          style={{
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                          Cap Rate (%)
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={editingDeal.cap_rate || ''}
                          onChange={(e) => handleEditChange('cap_rate', e.target.value)}
                          placeholder="0.0"
                          style={{
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        NOI ($)
                      </Label>
                      <Input
                        type="number"
                        value={editingDeal.noi || ''}
                        onChange={(e) => handleEditChange('noi', e.target.value)}
                        placeholder="0"
                        style={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div>
                  <h3 className="text-sm font-semibold uppercase mb-4" style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>
                    Property Details
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                          Building Size (SF)
                        </Label>
                        <Input
                          type="number"
                          value={editingDeal.size || ''}
                          onChange={(e) => handleEditChange('size', e.target.value)}
                          placeholder="0"
                          style={{
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                          Lot Size (Acres)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingDeal.lot_size || ''}
                          onChange={(e) => handleEditChange('lot_size', e.target.value)}
                          placeholder="0.00"
                          style={{
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        Notes
                      </Label>
                      <textarea
                        value={editingDeal.notes || ''}
                        onChange={(e) => handleEditChange('notes', e.target.value)}
                        placeholder="Add notes about this deal..."
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--text-primary)',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Linked Contacts Section */}
                <div>
                  <h3 className="text-sm font-semibold uppercase mb-4" style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>
                    Linked Contacts
                  </h3>
                  <div className="space-y-3">
                    {/* Contact Search */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        Search & Link Contacts
                      </Label>
                      <Input
                        value={contactSearchTerm}
                        onChange={(e) => setContactSearchTerm(e.target.value)}
                        placeholder="Type contact name to search..."
                        style={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>

                    {/* Filtered Contacts List */}
                    {contactSearchTerm && (
                      <div 
                        className="max-h-[200px] overflow-y-auto space-y-2 p-3 rounded-lg"
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid var(--glass-border)'
                        }}
                      >
                        {contacts
                          .filter(c => 
                            c.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                            c.email?.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                            c.company?.toLowerCase().includes(contactSearchTerm.toLowerCase())
                          )
                          .slice(0, 10)
                          .map(contact => (
                            <label
                              key={contact.id}
                              className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-opacity-80 transition-all"
                              style={{
                                background: selectedContacts.includes(contact.id)
                                  ? 'rgba(59, 130, 246, 0.2)'
                                  : 'rgba(0, 0, 0, 0.3)',
                                border: selectedContacts.includes(contact.id)
                                  ? '1px solid var(--accent)'
                                  : '1px solid rgba(100, 116, 139, 0.2)'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedContacts.includes(contact.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedContacts([...selectedContacts, contact.id]);
                                  } else {
                                    setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                                  }
                                }}
                                className="w-4 h-4"
                                style={{ accentColor: 'var(--accent)' }}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {contact.name}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  {contact.company || contact.email}
                                </p>
                              </div>
                            </label>
                          ))}
                        
                        {contacts.filter(c => 
                          c.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                          c.email?.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                          c.company?.toLowerCase().includes(contactSearchTerm.toLowerCase())
                        ).length === 0 && (
                          <div className="text-center py-4">
                            <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                              No contact found: "{contactSearchTerm}"
                            </p>
                            <Button
                              size="sm"
                              onClick={() => {
                                setShowEditPanel(false);
                                navigate('/contacts');
                                toast.info('Opening Contacts page to create new contact');
                              }}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Create New Contact
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected Contacts Display */}
                    {selectedContacts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedContacts.map(contactId => {
                          const contact = contacts.find(c => c.id === contactId);
                          if (!contact) return null;
                          return (
                            <span
                              key={contactId}
                              className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm"
                              style={{
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: 'var(--accent)'
                              }}
                            >
                              {contact.name}
                              <button
                                onClick={() => setSelectedContacts(selectedContacts.filter(id => id !== contactId))}
                                className="hover:opacity-70"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div 
              className="px-6 py-4 flex items-center justify-between"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                className="text-red-500 hover:bg-red-500 hover:text-white"
                style={{
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>

              <div className="flex gap-3">
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDeal}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="glass-surface p-6 rounded-xl max-w-md mx-4"
            style={{ border: '1px solid var(--glass-border)' }}
          >
            <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Delete Deal?
            </h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to delete this deal? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                disabled={isDeleting}
                style={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)'
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteDeal}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete Deal'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DealsList;
