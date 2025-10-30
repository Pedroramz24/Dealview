import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import EmailComposeModal from '../components/EmailComposeModal';
import EmailActivityTimeline from '../components/EmailActivityTimeline';
import { 
  Plus, Mail, Phone, Building2, Search, MapPin, Calendar, 
  FileText, X, Save, Link, Eye, Edit, Filter, User, Grid, List, Network
} from 'lucide-react';
import { toast } from 'sonner';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import ForceGraph2D from 'react-force-graph-2d';

// Contact types options
const contactTypeOptions = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
  { value: 'broker', label: 'Broker' },
  { value: 'lender', label: 'Lender' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'owner', label: 'Owner' }
];

// Asset type focus options
const assetTypeOptions = [
  'Retail Centers',
  'Land',
  'Industrial',
  'Restaurants',
  'Hotels',
  'Medical',
  'Office',
  'Multifamily',
  'Mixed Use'
];

// Markets options
const marketOptions = [
  'San Antonio',
  'Austin',
  'Houston',
  'DFW',
  'RGV'
];

// Status options
const statusOptions = [
  { value: 'active_contact', label: 'Active Contact', shortLabel: 'Active' },
  { value: 'no_active_contact', label: 'No Active Contact', shortLabel: 'Inactive' },
  { value: 'need_to_call', label: 'Need to Call', shortLabel: 'Call Needed' },
  { value: 'does_not_want_to_sell', label: 'Does Not Want to Sell', shortLabel: 'Not Selling' },
  { value: 'need_to_find_contact_number', label: 'Need to Find Contact Number', shortLabel: 'No Number' }
];

const Contacts = () => {
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterContactType, setFilterContactType] = useState('all');
  const [filterAssetType, setFilterAssetType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'card', 'table', or 'graph' - default to table
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactLinks, setContactLinks] = useState({});
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const graphRef = useRef();
  const { user } = useContext(AuthContext);
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

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    owner_address: '',
    contact_types: [],
    asset_type_focus: [],
    markets: [],
    status: 'active_contact',
    last_followup_date: '',
    next_action_date: '',
    lead_source: '',
    notes: '',
    tags: [],
    linked_deals: []
  });

  useEffect(() => {
    if (user) {
      fetchContacts();
      fetchDeals();
    }
  }, [user]);
  
  // Handle URL params for auto-opening create contact form
  useEffect(() => {
    const shouldCreate = searchParams.get('create');
    const contactName = searchParams.get('name');
    
    if (shouldCreate === 'true') {
      setShowAddPanel(true);
      if (contactName) {
        setContactForm(prev => ({ ...prev, name: contactName }));
      }
    }
  }, [searchParams]);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, filterContactType, filterAssetType, filterStatus]);

  const fetchContacts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch link counts for each contact
      const contactsWithLinks = await Promise.all((data || []).map(async (contact) => {
        const { data: links, error: linksError } = await supabase
          .from('contact_deal_links')
          .select('deal_id')
          .eq('contact_id', contact.id);
        
        return {
          ...contact,
          linked_deals_count: links ? links.length : 0
        };
      }));
      
      setContacts(contactsWithLinks);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('id, title, address, stage, price, asset_type')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
    }
  };

  const filterContacts = () => {
    let filtered = [...contacts];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((contact) =>
        contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Contact type filter
    if (filterContactType !== 'all') {
      filtered = filtered.filter(contact => 
        contact.contact_types && contact.contact_types.includes(filterContactType)
      );
    }

    // Asset type filter
    if (filterAssetType !== 'all') {
      filtered = filtered.filter(contact => 
        contact.asset_type_focus && contact.asset_type_focus.includes(filterAssetType)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(contact => contact.status === filterStatus);
    }

    setFilteredContacts(filtered);
  };

  // Build graph data from contacts and deals
  const buildGraphData = useCallback(async () => {
    const nodes = [];
    const links = [];

    // Add contact nodes
    filteredContacts.forEach(contact => {
      nodes.push({
        id: `contact-${contact.id}`,
        label: contact.name,
        type: 'contact',
        data: contact,
        color: '#00b8d4', // Cyan
        size: 8 + (contact.linked_deals_count || 0) * 2 // Larger if more deals
      });
    });

    // Add deal nodes
    deals.forEach(deal => {
      nodes.push({
        id: `deal-${deal.id}`,
        label: deal.title || deal.address,
        type: 'deal',
        data: deal,
        color: '#f59e0b', // Orange
        size: 6
      });
    });

    // Fetch all contact-deal links
    try {
      const { data: allLinks, error } = await supabase
        .from('contact_deal_links')
        .select('contact_id, deal_id');

      if (!error && allLinks) {
        allLinks.forEach(link => {
          // Only add links for visible contacts
          const contactInView = filteredContacts.find(c => c.id === link.contact_id);
          if (contactInView) {
            links.push({
              source: `contact-${link.contact_id}`,
              target: `deal-${link.deal_id}`,
              color: 'rgba(59, 130, 246, 0.4)'
            });
          }
        });
      }
    } catch (error) {
      console.error('Error fetching links for graph:', error);
    }

    setGraphData({ nodes, links });
  }, [filteredContacts, deals]);

  useEffect(() => {
    if (viewMode === 'graph') {
      buildGraphData();
    }
  }, [viewMode, filteredContacts, deals, buildGraphData]);

  const handleOpenAdd = () => {
    setContactForm({
      name: '',
      email: '',
      phone: '',
      company: '',
      title: '',
      owner_address: '',
      contact_types: [],
      asset_type_focus: [],
      markets: [],
      status: 'active_contact',
      last_followup_date: '',
      next_action_date: '',
      lead_source: '',
      notes: '',
      tags: [],
      linked_deals: []
    });
    setEditingContact(null);
    setShowAddPanel(true);
  };

  const handleOpenEdit = (contact) => {
    setContactForm({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
      title: contact.title || '',
      owner_address: contact.owner_address || '',
      contact_types: contact.contact_types || [],
      asset_type_focus: contact.asset_type_focus || [],
      markets: contact.markets || [],
      status: contact.status || 'active_contact',
      last_followup_date: contact.last_followup_date || '',
      next_action_date: contact.next_action_date || '',
      lead_source: contact.lead_source || '',
      notes: contact.notes || '',
      tags: contact.tags || [],
      linked_deals: []
    });
    setEditingContact(contact);
    setShowAddPanel(true);
  };

  const toggleArrayField = (field, value) => {
    setContactForm(prev => {
      const current = prev[field] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  const handleSaveContact = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    // Validation
    if (!contactForm.name) {
      toast.error('Name is required');
      return;
    }

    if (contactForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
      toast.error('Invalid email format');
      return;
    }

    try {
      const contactData = {
        owner_id: user.id,
        name: contactForm.name,
        email: contactForm.email || null,
        phone: contactForm.phone || null,
        company: contactForm.company || null,
        title: contactForm.title || null,
        owner_address: contactForm.owner_address || null,
        contact_types: contactForm.contact_types,
        asset_type_focus: contactForm.asset_type_focus,
        markets: contactForm.markets,
        status: contactForm.status,
        last_followup_date: contactForm.last_followup_date || null,
        next_action_date: contactForm.next_action_date || null,
        lead_source: contactForm.lead_source || null,
        notes: contactForm.notes || null,
        tags: contactForm.tags
      };

      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', editingContact.id);

        if (error) throw error;
        toast.success('Contact updated successfully');
      } else {
        // Create new contact
        const { data, error } = await supabase
          .from('contacts')
          .insert([contactData])
          .select()
          .single();

        if (error) throw error;

        // Link deals if any selected
        if (contactForm.linked_deals.length > 0) {
          const links = contactForm.linked_deals.map(dealId => ({
            contact_id: data.id,
            deal_id: dealId,
            relationship_type: contactForm.contact_types[0] || 'contact'
          }));

          const { error: linkError } = await supabase
            .from('contact_deal_links')
            .insert(links);

          if (linkError) console.error('Error linking deals:', linkError);
        }

        toast.success('Contact created successfully');
      }

      setShowAddPanel(false);
      fetchContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact');
    }
  };

  const handleViewDetails = async (contact) => {
    setSelectedContact(contact);
    
    // Fetch linked deals for this contact
    try {
      const { data: links, error } = await supabase
        .from('contact_deal_links')
        .select(`
          deal_id,
          relationship_type,
          deals:deal_id (id, title, address, stage, price, asset_type)
        `)
        .eq('contact_id', contact.id);

      if (error) throw error;
      
      setContactLinks({ [contact.id]: links || [] });
      setShowDetailsPanel(true);
    } catch (error) {
      console.error('Error fetching contact links:', error);
      setShowDetailsPanel(true);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatPrice = (price) => {
    if (!price) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadgeStyle = (status) => {
    const styles = {
      'active_contact': { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
      'no_active_contact': { bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
      'need_to_call': { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
      'does_not_want_to_sell': { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
      'need_to_find_contact_number': { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', border: 'rgba(168, 85, 247, 0.3)' }
    };
    return styles[status] || styles['active_contact'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-base)' }} data-testid="contacts-page">
      {/* Header */}
      <div className="px-8 pt-8 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Contacts
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {filteredContacts.length} contacts found
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div 
              className="flex gap-1 p-1 rounded-lg"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)'
              }}
            >
              <button
                onClick={() => setViewMode('card')}
                className="p-2 rounded transition-all"
                style={{
                  background: viewMode === 'card' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: viewMode === 'card' ? '1px solid var(--accent)' : '1px solid transparent',
                  color: viewMode === 'card' ? 'var(--accent)' : 'var(--text-secondary)'
                }}
                title="Card View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className="p-2 rounded transition-all"
                style={{
                  background: viewMode === 'table' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: viewMode === 'table' ? '1px solid var(--accent)' : '1px solid transparent',
                  color: viewMode === 'table' ? 'var(--accent)' : 'var(--text-secondary)'
                }}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className="p-2 rounded transition-all"
                style={{
                  background: viewMode === 'graph' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                  border: viewMode === 'graph' ? '1px solid var(--accent)' : '1px solid transparent',
                  color: viewMode === 'graph' ? 'var(--accent)' : 'var(--text-secondary)'
                }}
                title="Graph View"
              >
                <Network className="w-4 h-4" />
              </button>
            </div>

            <Button
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="create-contact-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 pb-4">
        <div className="glass-surface p-4">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <Input
                placeholder="Search by name, company, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                style={{ 
                  background: 'var(--glass-bg)', 
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)'
                }}
                data-testid="search-contacts-input"
              />
            </div>

            {/* Contact Type Filter */}
            <select
              value={filterContactType}
              onChange={(e) => setFilterContactType(e.target.value)}
              className="px-4 py-2 rounded-lg"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Contact Types</option>
              {contactTypeOptions.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            {/* Asset Type Filter */}
            <select
              value={filterAssetType}
              onChange={(e) => setFilterAssetType(e.target.value)}
              className="px-4 py-2 rounded-lg"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Asset Types</option>
              {assetTypeOptions.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-lg"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Statuses</option>
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contacts Display - Card, Table, or Graph View */}
      <div className="px-8 pb-8 flex-1 overflow-y-auto">
        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContacts.map((contact) => (
              <div 
                key={contact.id} 
                className="glass-surface rounded-xl p-5 hover:border-cyan-500 transition-all cursor-pointer group"
                style={{ 
                  border: '1px solid var(--glass-border)',
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.85) 100%)',
                  backdropFilter: 'blur(20px)'
                }}
                onClick={() => handleViewDetails(contact)}
                data-testid={`contact-card-${contact.id}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      {contact.name}
                    </h3>
                    {contact.title && (
                      <p className="text-sm" style={{ color: 'var(--accent)' }}>
                        {contact.title}
                      </p>
                    )}
                    {contact.company && (
                      <p className="text-sm flex items-center mt-1" style={{ color: 'var(--text-secondary)' }}>
                        <Building2 className="w-3 h-3 mr-1" />
                        {contact.company}
                      </p>
                    )}
                  </div>
                  
                  {/* Edit Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(contact);
                    }}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)'
                    }}
                  >
                    <Edit className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </button>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  {contact.email && (
                    <p className="text-sm flex items-center" style={{ color: 'var(--text-secondary)' }}>
                      <Mail className="w-4 h-4 mr-2" style={{ color: 'var(--text-muted)' }} />
                      <span className="truncate">{contact.email}</span>
                    </p>
                  )}
                  {contact.phone && (
                    <p className="text-sm flex items-center" style={{ color: 'var(--text-secondary)' }}>
                      <Phone className="w-4 h-4 mr-2" style={{ color: 'var(--text-muted)' }} />
                      {contact.phone}
                    </p>
                  )}
                </div>

                {/* Contact Types */}
                {contact.contact_types && contact.contact_types.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {contact.contact_types.slice(0, 3).map((type) => (
                      <span 
                        key={type} 
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59, 130, 246, 0.3)'
                        }}
                      >
                        {contactTypeOptions.find(t => t.value === type)?.label || type}
                      </span>
                    ))}
                    {contact.contact_types.length > 3 && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{contact.contact_types.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Asset Types */}
                {contact.asset_type_focus && contact.asset_type_focus.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {contact.asset_type_focus.slice(0, 2).map((type) => (
                      <span 
                        key={type} 
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          background: getAssetTypeColor(type).bg,
                          color: getAssetTypeColor(type).color,
                          border: `1px solid ${getAssetTypeColor(type).border}`
                        }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  {/* Status */}
                  <span 
                    className="text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap"
                    style={{
                      background: getStatusBadgeStyle(contact.status).bg,
                      color: getStatusBadgeStyle(contact.status).color,
                      border: `1px solid ${getStatusBadgeStyle(contact.status).border}`
                    }}
                  >
                    {statusOptions.find(s => s.value === contact.status)?.shortLabel || contact.status}
                  </span>

                  {/* Linked Deals Count */}
                  {contact.linked_deals_count > 0 && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
                      <Link className="w-3 h-3" />
                      <span>{contact.linked_deals_count} {contact.linked_deals_count === 1 ? 'deal' : 'deals'}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'table' ? (
          <div className="glass-surface rounded-xl overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th className="text-left px-6 py-4" style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Name</th>
                  <th className="text-left px-6 py-4" style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Company</th>
                  <th className="text-left px-6 py-4" style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Contact Type</th>
                  <th className="text-left px-6 py-4" style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Asset Type</th>
                  <th className="text-left px-6 py-4" style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Linked Deals</th>
                  <th className="text-left px-6 py-4" style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Last Follow-Up</th>
                  <th className="text-left px-6 py-4" style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Status</th>
                  <th className="text-left px-6 py-4" style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr 
                    key={contact.id}
                    className="hover:bg-opacity-50 transition-all cursor-pointer"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    onClick={() => handleViewDetails(contact)}
                    data-testid={`contact-row-${contact.id}`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {contact.name}
                        </p>
                        {contact.email && (
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {contact.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {contact.company || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.contact_types && contact.contact_types.length > 0 ? (
                          contact.contact_types.slice(0, 2).map((type) => (
                            <span 
                              key={type}
                              className="text-xs px-2 py-1 rounded"
                              style={{
                                background: 'rgba(59, 130, 246, 0.15)',
                                color: '#3b82f6',
                                border: '1px solid rgba(59, 130, 246, 0.3)'
                              }}
                            >
                              {contactTypeOptions.find(t => t.value === type)?.label || type}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.asset_type_focus && contact.asset_type_focus.length > 0 ? (
                          contact.asset_type_focus.slice(0, 2).map((type) => (
                            <span 
                              key={type}
                              className="text-xs px-2 py-1 rounded"
                              style={{
                                background: getAssetTypeColor(type).bg,
                                color: getAssetTypeColor(type).color,
                                border: `1px solid ${getAssetTypeColor(type).border}`
                              }}
                            >
                              {type}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {contact.linked_deals_count > 0 ? (
                        <div className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                          <Link className="w-3 h-3" />
                          <span className="text-sm font-medium">{contact.linked_deals_count}</span>
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(contact.last_followup_date)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span 
                        className="text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap"
                        style={{
                          background: getStatusBadgeStyle(contact.status).bg,
                          color: getStatusBadgeStyle(contact.status).color,
                          border: `1px solid ${getStatusBadgeStyle(contact.status).border}`
                        }}
                      >
                        {statusOptions.find(s => s.value === contact.status)?.shortLabel || contact.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(contact);
                        }}
                        className="p-2 rounded-lg transition-all"
                        style={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--accent)'
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'graph' ? (
          <div className="relative h-full">
            {/* Graph Controls */}
            <div className="absolute top-4 left-4 z-10 glass-surface p-3 rounded-lg" style={{ border: '1px solid var(--glass-border)' }}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFocusMode(!focusMode)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: focusMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 0, 0, 0.4)',
                    border: focusMode ? '1px solid var(--accent)' : '1px solid rgba(100, 116, 139, 0.4)',
                    color: focusMode ? 'var(--accent)' : 'var(--text-secondary)'
                  }}
                >
                  Focus Mode {focusMode ? 'ON' : 'OFF'}
                </button>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#00b8d4' }}></div>
                    <span>Contacts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }}></div>
                    <span>Deals</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hovered Node Info Card */}
            {hoveredNode && (
              <div 
                className="absolute top-4 right-4 z-10 glass-surface p-4 rounded-lg max-w-xs"
                style={{ 
                  border: '1px solid var(--glass-border)',
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)'
                }}
              >
                <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
                  {hoveredNode.label}
                </h4>
                {hoveredNode.type === 'contact' && hoveredNode.data && (
                  <div className="space-y-1 text-xs">
                    {hoveredNode.data.company && (
                      <p style={{ color: 'var(--text-secondary)' }}>
                        <Building2 className="w-3 h-3 inline mr-1" />
                        {hoveredNode.data.company}
                      </p>
                    )}
                    {hoveredNode.data.email && (
                      <p style={{ color: 'var(--text-secondary)' }}>
                        <Mail className="w-3 h-3 inline mr-1" />
                        {hoveredNode.data.email}
                      </p>
                    )}
                    {hoveredNode.data.phone && (
                      <p style={{ color: 'var(--text-secondary)' }}>
                        <Phone className="w-3 h-3 inline mr-1" />
                        {hoveredNode.data.phone}
                      </p>
                    )}
                  </div>
                )}
                {hoveredNode.type === 'deal' && hoveredNode.data && (
                  <div className="space-y-1 text-xs">
                    <p style={{ color: 'var(--accent)' }}>
                      {formatPrice(hoveredNode.data.price)}
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      {hoveredNode.data.asset_type}
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Stage: {hoveredNode.data.stage}
                    </p>
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={() => handleViewDetails(hoveredNode.data)}
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Eye className="w-3 h-3 mr-2" />
                  View Details
                </Button>
              </div>
            )}

            {/* Force Graph */}
            <div 
              className="w-full h-full rounded-xl overflow-hidden"
              style={{
                background: `
                  radial-gradient(circle at 20% 50%, rgba(0, 184, 212, 0.03) 0%, transparent 50%),
                  radial-gradient(circle at 80% 50%, rgba(245, 158, 11, 0.03) 0%, transparent 50%),
                  repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(100, 116, 139, 0.1) 19px, rgba(100, 116, 139, 0.1) 20px),
                  repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(100, 116, 139, 0.1) 19px, rgba(100, 116, 139, 0.1) 20px),
                  #000000
                `,
                border: '1px solid var(--glass-border)'
              }}
            >
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel=""
                nodeColor={node => {
                  if (focusMode && focusedNodeId && node.id !== focusedNodeId) {
                    return 'rgba(100, 116, 139, 0.3)';
                  }
                  return node.color;
                }}
                nodeVal={node => node.size}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const label = node.label;
                  const fontSize = 12/globalScale;
                  ctx.font = `${fontSize}px Geist Sans, sans-serif`;
                  
                  // Node circle
                  const isFaded = focusMode && focusedNodeId && node.id !== focusedNodeId;
                  ctx.fillStyle = isFaded ? 'rgba(100, 116, 139, 0.3)' : node.color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
                  ctx.fill();
                  
                  // Node glow
                  if (!isFaded) {
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = node.color;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                  }
                  
                  // Label
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = isFaded ? 'rgba(255, 255, 255, 0.3)' : '#ffffff';
                  ctx.fillText(label, node.x, node.y + node.size + 8);
                }}
                linkColor={link => focusMode && focusedNodeId ? 'rgba(59, 130, 246, 0.2)' : link.color}
                linkWidth={2}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.005}
                onNodeClick={(node) => {
                  setFocusedNodeId(focusMode ? node.id : null);
                  handleViewDetails(node.data);
                }}
                onNodeHover={(node) => setHoveredNode(node)}
                enableNodeDrag={true}
                enableZoomInteraction={true}
                enablePanInteraction={true}
                cooldownTime={2000}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* Add/Edit Contact Side Panel */}
      {showAddPanel && (
        <div 
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowAddPanel(false)}
        >
          <div
            className="w-full md:w-[600px] h-full glass-surface overflow-hidden flex flex-col animate-slide-in"
            style={{
              borderLeft: '1px solid var(--glass-border)',
              boxShadow: '-10px 0 50px rgba(0, 0, 0, 0.5)',
              background: 'linear-gradient(135deg, rgba(11, 12, 14, 0.95) 0%, rgba(26, 26, 26, 0.95) 100%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h2>
              <button
                onClick={() => setShowAddPanel(false)}
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
              <div className="space-y-5">
                {/* Contact Info Section */}
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.6) 100%)',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <h3 className="text-xs font-bold uppercase mb-4" style={{ color: 'var(--accent)', letterSpacing: '1px' }}>
                    Contact Info
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        Full Name <span style={{ color: '#ef4444' }}>*</span>
                      </Label>
                      <Input
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        placeholder="John Doe"
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(100, 116, 139, 0.4)',
                          color: 'var(--text-primary)',
                          padding: '10px 12px'
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                          Email
                        </Label>
                        <Input
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          placeholder="john@example.com"
                          style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(100, 116, 139, 0.4)',
                            color: 'var(--text-primary)',
                            padding: '10px 12px'
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                          Phone
                        </Label>
                        <Input
                          type="tel"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          placeholder="(512) 555-0100"
                          style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(100, 116, 139, 0.4)',
                            color: 'var(--text-primary)',
                            padding: '10px 12px'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Details Section */}
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.6) 100%)',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <h3 className="text-xs font-bold uppercase mb-4" style={{ color: 'var(--accent)', letterSpacing: '1px' }}>
                    Company Details
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                          Company
                        </Label>
                        <Input
                          value={contactForm.company}
                          onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                          placeholder="ABC Realty"
                          style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(100, 116, 139, 0.4)',
                            color: 'var(--text-primary)',
                            padding: '10px 12px'
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                          Title
                        </Label>
                        <Input
                          value={contactForm.title}
                          onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                          placeholder="Principal, Broker, CFO"
                          style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(100, 116, 139, 0.4)',
                            color: 'var(--text-primary)',
                            padding: '10px 12px'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        Owner Address
                      </Label>
                      <Input
                        value={contactForm.owner_address}
                        onChange={(e) => setContactForm({ ...contactForm, owner_address: e.target.value })}
                        placeholder="123 Main St, Austin, TX 78701"
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(100, 116, 139, 0.4)',
                          color: 'var(--text-primary)',
                          padding: '10px 12px'
                        }}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        Contact Type(s)
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {contactTypeOptions.map(type => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => toggleArrayField('contact_types', type.value)}
                            className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                            style={{
                              background: contactForm.contact_types.includes(type.value)
                                ? 'rgba(59, 130, 246, 0.25)'
                                : 'rgba(0, 0, 0, 0.4)',
                              border: contactForm.contact_types.includes(type.value)
                                ? '2px solid var(--accent)'
                                : '1px solid rgba(100, 116, 139, 0.4)',
                              color: contactForm.contact_types.includes(type.value)
                                ? 'var(--accent)'
                                : 'var(--text-secondary)'
                            }}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        Asset Type Focus
                      </Label>
                      <select
                        value={contactForm.asset_type_focus[0] || ''}
                        onChange={(e) => setContactForm({ ...contactForm, asset_type_focus: e.target.value ? [e.target.value] : [] })}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(100, 116, 139, 0.4)',
                          color: 'var(--text-primary)',
                          padding: '10px 12px'
                        }}
                      >
                        <option value="">Select asset type...</option>
                        {assetTypeOptions.map(type => (
                          <option 
                            key={type} 
                            value={type}
                            style={{ 
                              background: '#1a1a1a',
                              color: getAssetTypeColor(type).color
                            }}
                          >
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        Markets (multi-select)
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {marketOptions.map(market => (
                          <button
                            key={market}
                            type="button"
                            onClick={() => toggleArrayField('markets', market)}
                            className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                            style={{
                              background: contactForm.markets.includes(market)
                                ? 'rgba(16, 185, 129, 0.25)'
                                : 'rgba(0, 0, 0, 0.4)',
                              border: contactForm.markets.includes(market)
                                ? '2px solid #10b981'
                                : '1px solid rgba(100, 116, 139, 0.4)',
                              color: contactForm.markets.includes(market)
                                ? '#10b981'
                                : 'var(--text-secondary)'
                            }}
                          >
                            {market}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Property Links Section */}
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.6) 100%)',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <h3 className="text-xs font-bold uppercase mb-4" style={{ color: 'var(--accent)', letterSpacing: '1px' }}>
                    Property Links
                  </h3>
                  <div>
                    <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                      Link to Existing Deals
                    </Label>
                    <div 
                      className="max-h-[200px] overflow-y-auto space-y-2 p-3 rounded-lg" 
                      style={{ 
                        background: 'rgba(0, 0, 0, 0.5)', 
                        border: '1px solid rgba(100, 116, 139, 0.3)' 
                      }}
                    >
                      {deals.length === 0 ? (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No deals available to link</p>
                      ) : (
                        deals.map(deal => (
                          <label
                            key={deal.id}
                            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                            style={{ 
                              background: contactForm.linked_deals.includes(deal.id) 
                                ? 'rgba(59, 130, 246, 0.15)' 
                                : 'rgba(0, 0, 0, 0.3)',
                              border: contactForm.linked_deals.includes(deal.id)
                                ? '1px solid var(--accent)'
                                : '1px solid rgba(100, 116, 139, 0.2)'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={contactForm.linked_deals.includes(deal.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setContactForm({ ...contactForm, linked_deals: [...contactForm.linked_deals, deal.id] });
                                } else {
                                  setContactForm({ ...contactForm, linked_deals: contactForm.linked_deals.filter(id => id !== deal.id) });
                                }
                              }}
                              className="w-4 h-4"
                              style={{ accentColor: 'var(--accent)' }}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {deal.title || deal.address}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {deal.asset_type} • {formatPrice(deal.price)}
                              </p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Status & Notes Section */}
                <div 
                  className="p-5 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.6) 100%)',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <h3 className="text-xs font-bold uppercase mb-4" style={{ color: 'var(--accent)', letterSpacing: '1px' }}>
                    Status & Notes
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        Status
                      </Label>
                      <select
                        value={contactForm.status}
                        onChange={(e) => setContactForm({ ...contactForm, status: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(100, 116, 139, 0.4)',
                          color: 'var(--text-primary)',
                          padding: '10px 12px'
                        }}
                      >
                        {statusOptions.map(status => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                          Last Follow-up
                        </Label>
                        <Input
                          type="date"
                          value={contactForm.last_followup_date}
                          onChange={(e) => setContactForm({ ...contactForm, last_followup_date: e.target.value })}
                          style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(100, 116, 139, 0.4)',
                            color: 'var(--text-primary)',
                            padding: '10px 12px'
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                          Next Action
                        </Label>
                        <Input
                          type="date"
                          value={contactForm.next_action_date}
                          onChange={(e) => setContactForm({ ...contactForm, next_action_date: e.target.value })}
                          style={{
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(100, 116, 139, 0.4)',
                            color: 'var(--text-primary)',
                            padding: '10px 12px'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        Lead Source
                      </Label>
                      <Input
                        value={contactForm.lead_source}
                        onChange={(e) => setContactForm({ ...contactForm, lead_source: e.target.value })}
                        placeholder="Referral, Website, Event"
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(100, 116, 139, 0.4)',
                          color: 'var(--text-primary)',
                          padding: '10px 12px'
                        }}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
                        Notes
                      </Label>
                      <textarea
                        value={contactForm.notes}
                        onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                        placeholder="Add notes about this contact..."
                        rows={5}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(100, 116, 139, 0.4)',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div 
              className="px-6 py-4 flex items-center justify-end gap-3"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <Button
                onClick={() => setShowAddPanel(false)}
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
                onClick={handleSaveContact}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingContact ? 'Save Changes' : 'Add Contact'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details Panel */}
      {showDetailsPanel && selectedContact && (
        <div 
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowDetailsPanel(false)}
        >
          <div
            className="w-full md:w-[700px] h-full glass-surface overflow-hidden flex flex-col animate-slide-in"
            style={{
              borderLeft: '1px solid var(--glass-border)',
              boxShadow: '-10px 0 50px rgba(0, 0, 0, 0.5)',
              background: 'linear-gradient(135deg, rgba(11, 12, 14, 0.95) 0%, rgba(26, 26, 26, 0.95) 100%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {selectedContact.name}
                </h2>
                {selectedContact.title && (
                  <p style={{ color: 'var(--accent)' }}>{selectedContact.title}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedContact.email && (
                  <button
                    onClick={() => {
                      setEmailRecipient({
                        id: selectedContact.id,
                        email: selectedContact.email,
                        name: selectedContact.name || selectedContact.full_name
                      });
                      setShowEmailCompose(true);
                    }}
                    style={{
                      padding: '10px 16px',
                      background: 'rgba(0, 184, 212, 0.1)',
                      border: '1px solid rgba(0, 184, 212, 0.3)',
                      borderRadius: '8px',
                      color: '#00b8d4',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 184, 212, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Mail size={16} />
                    Send Email
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsPanel(false)}
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
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                {/* Summary Section */}
                <div className="glass-surface p-5 rounded-xl">
                  <h3 className="text-sm font-semibold uppercase mb-4" style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedContact.email && (
                      <div>
                        <p className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Email</p>
                        <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          <Mail className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                          {selectedContact.email}
                        </p>
                      </div>
                    )}
                    {selectedContact.phone && (
                      <div>
                        <p className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Phone</p>
                        <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          <Phone className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                          {selectedContact.phone}
                        </p>
                      </div>
                    )}
                    {selectedContact.company && (
                      <div>
                        <p className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Company</p>
                        <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          <Building2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                          {selectedContact.company}
                        </p>
                      </div>
                    )}
                    {selectedContact.owner_address && (
                      <div>
                        <p className="text-xs uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Owner Address</p>
                        <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          <MapPin className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                          {selectedContact.owner_address}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {selectedContact.phone && (
                      <Button
                        size="sm"
                        onClick={() => window.open(`tel:${selectedContact.phone}`)}
                        style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: 'var(--accent)'
                        }}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </Button>
                    )}
                    {selectedContact.email && (
                      <Button
                        size="sm"
                        onClick={() => window.open(`mailto:${selectedContact.email}`)}
                        style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: 'var(--accent)'
                        }}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                    )}
                  </div>
                </div>

                {/* Linked Deals */}
                <div>
                  <h3 className="text-sm font-semibold uppercase mb-4" style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>
                    Linked Deals ({contactLinks[selectedContact.id]?.length || 0})
                  </h3>
                  <div className="space-y-3">
                    {contactLinks[selectedContact.id] && contactLinks[selectedContact.id].length > 0 ? (
                      contactLinks[selectedContact.id].map(link => {
                        const deal = link.deals;
                        if (!deal) return null;
                        return (
                          <div 
                            key={link.deal_id}
                            className="glass-surface p-4 rounded-xl cursor-pointer hover:border-cyan-500 transition-all"
                            onClick={() => window.open(`/deals/${deal.id}`, '_blank')}
                            style={{ border: '1px solid var(--glass-border)' }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                                  {deal.title || deal.address}
                                </h4>
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className="text-xs px-2 py-1 rounded"
                                    style={{
                                      background: getAssetTypeColor(deal.asset_type).bg,
                                      color: getAssetTypeColor(deal.asset_type).color,
                                      border: `1px solid ${getAssetTypeColor(deal.asset_type).border}`
                                    }}
                                  >
                                    {deal.asset_type}
                                  </span>
                                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {deal.stage}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                                  {formatPrice(deal.price)}
                                </p>
                              </div>
                              <Eye className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div 
                        className="glass-surface p-8 rounded-xl text-center"
                        style={{ border: '1px solid var(--glass-border)' }}
                      >
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          No linked deals yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Info */}
                {selectedContact.notes && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase mb-4" style={{ color: 'var(--accent)', letterSpacing: '0.5px' }}>
                      Notes
                    </h3>
                    <div className="glass-surface p-4 rounded-xl" style={{ border: '1px solid var(--glass-border)' }}>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                        {selectedContact.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Email Activity Timeline */}
                {selectedContact.email && token && (
                  <div className="glass-surface rounded-xl overflow-hidden">
                    <EmailActivityTimeline
                      contactId={selectedContact.id}
                      token={token}
                      BACKEND_URL={BACKEND_URL}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div 
              className="px-6 py-4 flex justify-end"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--glass-bg)'
              }}
            >
              <Button
                onClick={() => {
                  setShowDetailsPanel(false);
                  handleOpenEdit(selectedContact);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Contact
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Email Compose Modal */}
      <EmailComposeModal
        isOpen={showEmailCompose}
        onClose={() => {
          setShowEmailCompose(false);
          setEmailRecipient(null);
        }}
        onSend={() => {
          // Refresh email activities
          if (selectedContact) {
            window.location.reload(); // Simple refresh for now
          }
        }}
        recipient={emailRecipient}
        token={token}
        BACKEND_URL={BACKEND_URL}
      />
    </div>
  );
};

export default Contacts;
