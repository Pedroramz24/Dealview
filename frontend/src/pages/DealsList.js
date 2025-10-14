import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
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
      const response = await axios.get(`${API}/deals`);
      setDeals(response.data);
    } catch (error) {
      toast.error('Failed to load deals');
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
    try {
      // First, upload image if provided
      let imageUrl = null;
      if (imageFile) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('file', imageFile);
        
        try {
          const uploadResponse = await axios.post(`${API}/deals/temp/upload-image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          imageUrl = uploadResponse.data.url;
        } catch (uploadError) {
          toast.error('Failed to upload image');
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      const response = await axios.post(`${API}/deals`, {
        ...newDeal,
        asking_price: parseFloat(newDeal.asking_price),
        building_size: newDeal.building_size ? parseFloat(newDeal.building_size) : null,
        primary_image_url: imageUrl,
      });
      toast.success('Deal created successfully');
      setShowCreateDialog(false);
      setNewDeal({
        property_address: '',
        asset_type: 'Office',
        asking_price: '',
        building_size: '',
        latitude: 29.4241,
        longitude: -98.4936,
        notes: '',
        stage: 'New',
        primary_image_url: null,
        documents: []
      });
      setImageFile(null);
      fetchDeals();
    } catch (error) {
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '700' }}>Create New Deal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateDeal} className="space-y-6">
              {/* Property Image Upload */}
              <div style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                padding: '20px'
              }}>
                <Label style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: '12px', display: 'block' }}>Property Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#FFFFFF'
                  }}
                />
                {imageFile && (
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '8px' }}>
                    Selected: {imageFile.name}
                  </p>
                )}
              </div>

              {/* Property Details */}
              <div>
                <Label style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Property Address *</Label>
                <Input
                  value={newDeal.property_address}
                  onChange={(e) => setNewDeal({ ...newDeal, property_address: e.target.value })}
                  required
                  placeholder="123 Main St, San Antonio, TX"
                  data-testid="deal-address-input"
                  className="premium-glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Property Type *</Label>
                  <Select value={newDeal.asset_type} onValueChange={(value) => setNewDeal({ ...newDeal, asset_type: value })}>
                    <SelectTrigger data-testid="deal-asset-type-select" className="premium-glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.15)' }}>
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
                  <Label style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Status *</Label>
                  <Select value={newDeal.stage} onValueChange={(value) => setNewDeal({ ...newDeal, stage: value })}>
                    <SelectTrigger className="premium-glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.15)' }}>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Qualified">Qualified</SelectItem>
                      <SelectItem value="Underwriting">Underwriting</SelectItem>
                      <SelectItem value="Negotiation">Negotiation</SelectItem>
                      <SelectItem value="Under Contract">Under Contract</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Financials Section */}
              <div style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h3 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Financials</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Asking Price *</Label>
                    <Input
                      type="number"
                      value={newDeal.asking_price}
                      onChange={(e) => setNewDeal({ ...newDeal, asking_price: e.target.value })}
                      required
                      placeholder="1000000"
                      data-testid="deal-price-input"
                      className="premium-glass-input"
                    />
                  </div>
                  <div>
                    <Label style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Building Size (sq ft)</Label>
                    <Input
                      type="number"
                      value={newDeal.building_size}
                      onChange={(e) => setNewDeal({ ...newDeal, building_size: e.target.value })}
                      placeholder="5000"
                      className="premium-glass-input"
                    />
                  </div>
                </div>
                
                {/* Auto-calculated Price per SF */}
                {newDeal.asking_price && newDeal.building_size && (
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,184,212,0.1)', borderRadius: '8px', border: '1px solid rgba(0,184,212,0.3)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Price per SF: </span>
                    <span style={{ color: '#00b8d4', fontSize: '16px', fontWeight: '600' }}>${calculatePricePerSF()}</span>
                  </div>
                )}
              </div>

              {/* Notes Section */}
              <div>
                <Label style={{ color: '#FFFFFF', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Notes</Label>
                <textarea
                  className="premium-glass-input w-full min-h-[120px] p-3"
                  value={newDeal.notes}
                  onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })}
                  placeholder="Add property notes, observations, or important details..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <Button 
                type="submit" 
                disabled={uploadingImage}
                style={{
                  width: '100%',
                  background: '#00b8d4',
                  color: '#000000',
                  padding: '14px',
                  fontWeight: '600',
                  fontSize: '15px'
                }}
                data-testid="submit-deal-button"
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
