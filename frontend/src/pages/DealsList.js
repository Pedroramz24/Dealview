import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { getAssetTypeColor } from '../utils/assetTypeColors';

const DealsList = () => {
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterAssetType, setFilterAssetType] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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
      setDeals(data || []);
    } catch (error) {
      console.error('[DealsList] Error fetching deals:', error);
      // Only show error if it's not just empty results
      if (error.code !== 'PGRST116') {
        toast.error('Failed to load deals: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

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
            price: newDeal.asking_price ? parseFloat(newDeal.asking_price) : null,
            size: newDeal.building_size ? parseFloat(newDeal.building_size) : null,
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
                      onChange={(e) => setNewDeal({ ...newDeal, property_address: e.target.value })}
                      required
                      placeholder="123 Main St, San Antonio, TX 78201"
                      className="premium-glass-input"
                    />
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
                      type="number"
                      value={newDeal.building_size}
                      onChange={(e) => setNewDeal({ ...newDeal, building_size: e.target.value })}
                      placeholder="5000"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Lot Size (acres)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newDeal.lot_size}
                      onChange={(e) => setNewDeal({ ...newDeal, lot_size: e.target.value })}
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
                      type="number"
                      value={newDeal.asking_price}
                      onChange={(e) => setNewDeal({ ...newDeal, asking_price: e.target.value })}
                      required
                      placeholder="1000000"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>NOI</Label>
                    <Input
                      type="number"
                      value={newDeal.noi}
                      onChange={(e) => setNewDeal({ ...newDeal, noi: e.target.value })}
                      placeholder="75000"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Cap Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newDeal.cap_rate}
                      onChange={(e) => setNewDeal({ ...newDeal, cap_rate: e.target.value })}
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
                    <Input
                      value={newDeal.primary_contact}
                      onChange={(e) => setNewDeal({ ...newDeal, primary_contact: e.target.value })}
                      placeholder="John Doe - Seller/Owner/Broker"
                      className="premium-glass-input"
                    />
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
              <th>Last Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeals.map((deal) => (
              <tr key={deal.id} data-testid={`deal-row-${deal.id}`}>
                <td>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{deal.property_address}</div>
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
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatPrice(deal.asking_price)}</span>
                </td>
                <td>
                  <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                    {deal.stage}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(deal.last_contact)}
                </td>
                <td>
                  <Button
                    onClick={() => navigate(`/deals/${deal.id}`)}
                    variant="outline"
                    size="sm"
                    data-testid={`view-deal-${deal.id}`}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DealsList;
