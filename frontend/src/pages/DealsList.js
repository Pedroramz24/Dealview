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

  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Auto-calculate price per SF
  const calculatePricePerSF = () => {
    if (newDeal.asking_price && newDeal.building_size) {
      const pricePerSF = parseFloat(newDeal.asking_price) / parseFloat(newDeal.building_size);
      return pricePerSF.toFixed(2);
    }
    return 'N/A';
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <Label>Property Address</Label>
                <Input
                  value={newDeal.property_address}
                  onChange={(e) => setNewDeal({ ...newDeal, property_address: e.target.value })}
                  required
                  data-testid="deal-address-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Asset Type</Label>
                  <Select value={newDeal.asset_type} onValueChange={(value) => setNewDeal({ ...newDeal, asset_type: value })}>
                    <SelectTrigger data-testid="deal-asset-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Office">Office</SelectItem>
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Industrial">Industrial</SelectItem>
                      <SelectItem value="Land">Land</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Asking Price</Label>
                  <Input
                    type="number"
                    value={newDeal.asking_price}
                    onChange={(e) => setNewDeal({ ...newDeal, asking_price: e.target.value })}
                    required
                    data-testid="deal-price-input"
                  />
                </div>
              </div>
              <div>
                <Label>Building Size (sq ft)</Label>
                <Input
                  type="number"
                  value={newDeal.building_size}
                  onChange={(e) => setNewDeal({ ...newDeal, building_size: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <textarea
                  className="w-full border rounded-lg p-2 min-h-[100px]"
                  value={newDeal.description}
                  onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" data-testid="submit-deal-button">
                Create Deal
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
