import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext, API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  Plus, Mail, Phone, Building2, Search, X, Save, Edit, 
  User, Grid, List, Trash2, Tag, Filter, Settings, Palette, Upload, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { colors, gradients, borderRadius } from '../styles/designSystem';

// Contact type options
const contactTypeOptions = [
  { value: 'Broker', label: 'Broker' },
  { value: 'Buyer', label: 'Buyer' },
  { value: 'Seller', label: 'Seller' },
  { value: 'Lender', label: 'Lender' },
  { value: 'Tenant', label: 'Tenant' },
  { value: 'Owner', label: 'Owner' }
];

// Status options
const statusOptions = [
  { value: 'Active', label: 'Active', color: '#10b981' },
  { value: 'Inactive', label: 'Inactive', color: '#6b7280' },
  { value: 'Lead', label: 'Lead', color: '#f59e0b' }
];

// Tag color options
const tagColorOptions = [
  '#00b8d4', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#3b82f6', '#6b7280',
  '#06b6d4', '#84cc16', '#f97316', '#a78bfa'
];

const Contacts = () => {
  const { user } = useContext(AuthContext);
  const [contacts, setContacts] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [viewMode, setViewMode] = useState('table');
  
  // Panel states
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  
  // Tag management modal
  const [showTagManager, setShowTagManager] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagForm, setTagForm] = useState({ name: '', color: '#00b8d4' });
  const [savingTag, setSavingTag] = useState(false);
  
  // CSV import state
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [csvColumnMap, setCsvColumnMap] = useState({});
  const [importingCsv, setImportingCsv] = useState(false);
  
  // Inline tag creation in edit panel
  const [showInlineTagCreate, setShowInlineTagCreate] = useState(false);
  const [inlineTagName, setInlineTagName] = useState('');
  const [inlineTagColor, setInlineTagColor] = useState('#00b8d4');
  
  // Form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    contact_type: 'Buyer',
    status: 'Active',
    tag_ids: [],
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchContacts();
      fetchTags();
    }
  }, [user, filterType, filterStatus, filterTag, searchTerm]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchContacts = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      let url = `${API}/contacts?`;
      if (filterType) url += `contact_type=${filterType}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterTag) url += `tag_id=${filterTag}&`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      } else {
        toast.error('Failed to load contacts');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API}/contacts/tags`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleOpenAdd = () => {
    setContactForm({
      name: '',
      email: '',
      phone: '',
      company: '',
      contact_type: 'Buyer',
      status: 'Active',
      tag_ids: [],
      notes: ''
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
      contact_type: contact.contact_type || 'Buyer',
      status: contact.status || 'Active',
      tag_ids: contact.tag_ids || [],
      notes: contact.notes || ''
    });
    setEditingContact(contact);
    setShowAddPanel(true);
  };

  const handleSaveContact = async () => {
    if (!contactForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      const token = await getToken();
      if (!token) return;

      const url = editingContact 
        ? `${API}/contacts/${editingContact.id}` 
        : `${API}/contacts`;
      
      const method = editingContact ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactForm)
      });

      if (response.ok) {
        toast.success(editingContact ? 'Contact updated' : 'Contact created');
        setShowAddPanel(false);
        fetchContacts();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to save contact');
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact');
    }
  };

  const handleDeleteContact = async (contact) => {
    if (!window.confirm(`Delete "${contact.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API}/contacts/${contact.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Contact deleted');
        fetchContacts();
        if (selectedContact?.id === contact.id) {
          setSelectedContact(null);
          setShowDetailsPanel(false);
        }
      } else {
        toast.error('Failed to delete contact');
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  const handleViewDetails = async (contact) => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API}/contacts/${contact.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedContact(data.contact);
        setShowDetailsPanel(true);
      }
    } catch (error) {
      console.error('Error fetching contact details:', error);
      toast.error('Failed to load contact details');
    }
  };

  // Tag management functions
  const handleOpenTagCreate = () => {
    setEditingTag(null);
    setTagForm({ name: '', color: '#00b8d4' });
    setShowTagManager(true);
  };

  const handleOpenTagEdit = (tag) => {
    setEditingTag(tag);
    setTagForm({ name: tag.name, color: tag.color || '#00b8d4' });
    setShowTagManager(true);
  };

  const handleSaveTag = async () => {
    if (!tagForm.name.trim()) {
      toast.error('Tag name is required');
      return;
    }

    setSavingTag(true);
    try {
      const token = await getToken();
      if (!token) return;

      if (editingTag) {
        // Update existing tag
        const response = await fetch(`${API}/contacts/tags/${editingTag.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(tagForm)
        });

        if (response.ok) {
          toast.success('Tag updated');
          fetchTags();
          setShowTagManager(false);
        } else {
          toast.error('Failed to update tag');
        }
      } else {
        // Create new tag
        const response = await fetch(`${API}/contacts/tags`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(tagForm)
        });

        if (response.ok) {
          toast.success('Tag created');
          fetchTags();
          setShowTagManager(false);
        } else {
          const errorData = await response.json();
          toast.error(errorData.detail || 'Failed to create tag');
        }
      }
    } catch (error) {
      console.error('Error saving tag:', error);
      toast.error('Failed to save tag');
    } finally {
      setSavingTag(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!editingTag) return;
    if (!window.confirm(`Delete tag "${editingTag.name}"?`)) return;

    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch(`${API}/contacts/tags/${editingTag.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Tag deleted');
        fetchTags();
        setShowTagManager(false);
        if (filterTag === editingTag.id) setFilterTag('');
      } else {
        toast.error('Failed to delete tag');
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast.error('Failed to delete tag');
    }
  };

  const toggleTagInForm = (tagId) => {
    setContactForm(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId]
    }));
  };

  const handleInlineTagCreate = async () => {
    if (!inlineTagName.trim()) return;
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(`${API}/contacts/tags`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inlineTagName.trim(), color: inlineTagColor })
      });
      if (response.ok) {
        const data = await response.json();
        const newTag = data.tag;
        await fetchTags();
        // Auto-add the new tag to the contact form
        if (newTag?.id) {
          setContactForm(prev => ({ ...prev, tag_ids: [...prev.tag_ids, newTag.id] }));
        }
        setInlineTagName('');
        setShowInlineTagCreate(false);
        toast.success('Tag created and added');
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.detail || 'Failed to create tag');
      }
    } catch (error) {
      toast.error('Failed to create tag');
    }
  };

  const getStatusColor = (status) => {
    const option = statusOptions.find(s => s.value === status);
    return option?.color || '#6b7280';
  };

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  // CSV Import handlers
  const handleCsvFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Please select a CSV file'); return; }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row'); return; }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') { inQuotes = !inQuotes; }
          else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
          else { current += char; }
        }
        values.push(current.trim());
        return values;
      });
      
      // Auto-map columns
      const targetFields = ['name', 'email', 'phone', 'company', 'contact_type', 'status', 'notes'];
      const autoMap = {};
      headers.forEach((h, i) => {
        const lower = h.toLowerCase();
        if (lower.includes('name') && !lower.includes('company')) autoMap[i] = 'name';
        else if (lower.includes('email') || lower.includes('e-mail')) autoMap[i] = 'email';
        else if (lower.includes('phone') || lower.includes('tel') || lower.includes('mobile')) autoMap[i] = 'phone';
        else if (lower.includes('company') || lower.includes('org') || lower.includes('firm')) autoMap[i] = 'company';
        else if (lower.includes('type') || lower.includes('role')) autoMap[i] = 'contact_type';
        else if (lower.includes('status')) autoMap[i] = 'status';
        else if (lower.includes('note')) autoMap[i] = 'notes';
      });
      
      setCsvData({ headers, rows });
      setCsvColumnMap(autoMap);
      setShowCsvImport(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCsvImport = async () => {
    if (!csvData) return;
    const nameColIdx = Object.entries(csvColumnMap).find(([_, v]) => v === 'name')?.[0];
    if (nameColIdx === undefined) { toast.error('Please map a column to "Name"'); return; }
    
    setImportingCsv(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const contacts = csvData.rows
        .filter(row => row[parseInt(nameColIdx)]?.trim())
        .map(row => {
          const contact = { name: row[parseInt(nameColIdx)].trim() };
          Object.entries(csvColumnMap).forEach(([colIdx, field]) => {
            if (field !== 'name' && row[parseInt(colIdx)]?.trim()) {
              contact[field] = row[parseInt(colIdx)].trim();
            }
          });
          return contact;
        });
      
      if (contacts.length === 0) { toast.error('No valid contacts found'); setImportingCsv(false); return; }
      
      const response = await fetch(`${API}/contacts/bulk-import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        setShowCsvImport(false);
        setCsvData(null);
        setCsvColumnMap({});
        fetchContacts();
      } else {
        toast.error('Failed to import contacts');
      }
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setImportingCsv(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="contacts-loading">
        <div className="text-cyan-500">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6" data-testid="contacts-page">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Contacts</h1>
          <p className="text-gray-400 text-sm">{contacts.length} contacts</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-gray-800/50 border border-gray-700">
            <button
              onClick={() => setViewMode('table')}
              data-testid="view-mode-table"
              className={`p-2 rounded transition-all ${
                viewMode === 'table' 
                  ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-500' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              data-testid="view-mode-card"
              className={`p-2 rounded transition-all ${
                viewMode === 'card' 
                  ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-500' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
          
          {/* Manage Tags Button */}
          <Button
            onClick={handleOpenTagCreate}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:text-white"
            data-testid="manage-tags-button"
          >
            <Tag className="w-4 h-4 mr-2" />
            Manage Tags
          </Button>

          {/* CSV Import */}
          <input
            id="csv-import-input"
            data-testid="csv-import-file-input"
            type="file"
            accept=".csv"
            onChange={handleCsvFileSelect}
            style={{ display: 'none' }}
          />
          <Button
            onClick={() => document.getElementById('csv-import-input').click()}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:text-white"
            data-testid="import-csv-button"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>

          <Button
            onClick={handleOpenAdd}
            className="bg-cyan-600 hover:bg-cyan-700"
            data-testid="create-contact-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Smart Tags Quick Filter */}
      {tags.length > 0 && (
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Quick Filter:</span>
          <button
            onClick={() => setFilterTag('')}
            className={`px-3 py-1 rounded-full text-sm transition-all ${
              !filterTag 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500' 
                : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-gray-600'
            }`}
          >
            All
          </button>
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => setFilterTag(filterTag === tag.id ? '' : tag.id)}
              className="px-3 py-1 rounded-full text-sm transition-all flex items-center gap-2"
              style={{
                backgroundColor: filterTag === tag.id ? `${tag.color}30` : 'transparent',
                border: filterTag === tag.id ? `1px solid ${tag.color}` : '1px solid #374151',
                color: filterTag === tag.id ? tag.color : '#9ca3af'
              }}
            >
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </button>
          ))}
          <button
            onClick={handleOpenTagCreate}
            className="px-3 py-1 rounded-full text-sm text-gray-500 border border-dashed border-gray-700 hover:border-cyan-500 hover:text-cyan-500 transition-all flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            New Tag
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-xl bg-gray-800/30 border border-gray-700/50">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search by name, email, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-900/50 border-gray-700 text-white"
            data-testid="search-contacts-input"
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-gray-300 cursor-pointer"
          data-testid="filter-type"
        >
          <option value="">All Types</option>
          {contactTypeOptions.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-gray-300 cursor-pointer"
          data-testid="filter-status"
        >
          <option value="">All Statuses</option>
          {statusOptions.map(status => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>

        {/* Tag Filter */}
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-gray-300 cursor-pointer"
          data-testid="filter-tag"
        >
          <option value="">All Tags</option>
          {tags.map(tag => (
            <option key={tag.id} value={tag.id}>{tag.name}</option>
          ))}
        </select>

        {/* Clear Filters */}
        {(filterType || filterStatus || filterTag || searchTerm) && (
          <Button
            onClick={() => {
              setFilterType('');
              setFilterStatus('');
              setFilterTag('');
              setSearchTerm('');
            }}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Contacts Display */}
      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <User className="w-12 h-12 mb-4 opacity-50" />
            <p>No contacts found</p>
            <Button
              onClick={handleOpenAdd}
              className="mt-4 bg-cyan-600 hover:bg-cyan-700"
            >
              Add Your First Contact
            </Button>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="rounded-xl overflow-hidden border border-gray-700/50 bg-gray-800/30">
            <table className="w-full" data-testid="contacts-table">
              <thead>
                <tr className="border-b border-gray-700/50 bg-gray-900/30">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Company</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tags</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Linked Deals</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr 
                    key={contact.id}
                    className="border-b border-gray-700/30 hover:bg-gray-800/50 transition-all cursor-pointer"
                    onClick={() => handleOpenEdit(contact)}
                    data-testid={`contact-row-${contact.id}`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{contact.name}</p>
                        {contact.email && (
                          <p className="text-xs text-gray-500">{contact.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {contact.company || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        {contact.contact_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tag_ids?.slice(0, 2).map(tagId => {
                          const tag = tags.find(t => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <span
                              key={tagId}
                              className="px-2 py-0.5 rounded-full text-xs"
                              style={{
                                backgroundColor: `${tag.color}20`,
                                color: tag.color,
                                border: `1px solid ${tag.color}40`
                              }}
                            >
                              {tag.name}
                            </span>
                          );
                        })}
                        {contact.tag_ids?.length > 2 && (
                          <span className="text-xs text-gray-500">+{contact.tag_ids.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-cyan-400 font-medium">
                        {contact.linked_deals_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${getStatusColor(contact.status)}20`,
                          color: getStatusColor(contact.status),
                          border: `1px solid ${getStatusColor(contact.status)}40`
                        }}
                      >
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEdit(contact)}
                          className="p-2 rounded-lg bg-gray-700/50 border border-gray-600 text-cyan-400 hover:bg-gray-700"
                          data-testid={`edit-contact-${contact.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact)}
                          className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                          data-testid={`delete-contact-${contact.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="contacts-cards">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="p-5 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-cyan-500/50 transition-all cursor-pointer group"
                onClick={() => handleOpenEdit(contact)}
                data-testid={`contact-card-${contact.id}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{contact.name}</h3>
                    {contact.company && (
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {contact.company}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenEdit(contact)}
                      className="p-1.5 rounded bg-gray-700/50 text-cyan-400"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact)}
                      className="p-1.5 rounded bg-red-500/10 text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  {contact.email && (
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="truncate">{contact.email}</span>
                    </p>
                  )}
                  {contact.phone && (
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      {contact.phone}
                    </p>
                  )}
                </div>

                {/* Type Badge */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 rounded text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    {contact.contact_type}
                  </span>
                </div>

                {/* Tags */}
                {contact.tag_ids?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {contact.tag_ids.slice(0, 3).map(tagId => {
                      const tag = tags.find(t => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <span
                          key={tagId}
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            border: `1px solid ${tag.color}40`
                          }}
                        >
                          {tag.name}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                  <span 
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${getStatusColor(contact.status)}20`,
                      color: getStatusColor(contact.status),
                      border: `1px solid ${getStatusColor(contact.status)}40`
                    }}
                  >
                    {contact.status}
                  </span>
                  
                  {contact.linked_deals_count > 0 && (
                    <span className="text-xs text-cyan-400">
                      {contact.linked_deals_count} deal{contact.linked_deals_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tag Manager Side Panel */}
      {showTagManager && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => { setShowTagManager(false); setEditingTag(null); }}
          data-testid="tag-manager-panel"
        >
          <div
            className="w-full md:w-[450px] h-full bg-gray-900 border-l border-gray-700 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
                  <Settings className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Smart Tags</h2>
                  <p className="text-xs text-gray-500">Manage and customize your tags</p>
                </div>
              </div>
              <button
                onClick={() => { setShowTagManager(false); setEditingTag(null); }}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Create New Tag Section */}
              <div className="p-6 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4">
                  {editingTag ? 'Edit Tag' : 'Create New Tag'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Tag Name</Label>
                    <Input
                      value={tagForm.name}
                      onChange={(e) => setTagForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Hot Lead, VIP Client"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-400 mb-3 block">Tag Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {tagColorOptions.map(color => (
                        <button
                          key={color}
                          onClick={() => setTagForm(prev => ({ ...prev, color }))}
                          className="w-9 h-9 rounded-lg transition-all duration-200 hover:scale-110"
                          style={{
                            background: color,
                            border: tagForm.color === color ? '3px solid white' : '2px solid transparent',
                            boxShadow: tagForm.color === color ? `0 0 12px ${color}60` : 'none'
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  {tagForm.name && (
                    <div>
                      <Label className="text-sm text-gray-500 mb-2 block">Preview</Label>
                      <span
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${tagForm.color}20`,
                          color: tagForm.color,
                          border: `1px solid ${tagForm.color}40`
                        }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tagForm.color }} />
                        {tagForm.name}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    {editingTag && (
                      <>
                        <Button
                          onClick={handleDeleteTag}
                          variant="outline"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingTag(null);
                            setTagForm({ name: '', color: '#00b8d4' });
                          }}
                          variant="outline"
                          className="flex-1 border-gray-700 text-gray-400"
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={handleSaveTag}
                      disabled={savingTag || !tagForm.name}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {savingTag ? 'Saving...' : editingTag ? 'Update Tag' : 'Create Tag'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Existing Tags List */}
              <div className="p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Your Tags ({tags.length})
                </h3>
                
                {tags.length === 0 ? (
                  <div className="text-center py-8">
                    <Tag className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p className="text-gray-500 text-sm">No tags created yet</p>
                    <p className="text-gray-600 text-xs mt-1">Create your first tag above</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tags.map(tag => (
                      <div
                        key={tag.id}
                        className={`group flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer ${
                          editingTag?.id === tag.id 
                            ? 'bg-cyan-500/10 border border-cyan-500/30' 
                            : 'bg-gray-800/50 border border-gray-700/50 hover:border-gray-600'
                        }`}
                        onClick={() => handleOpenTagEdit(tag)}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-5 h-5 rounded-md"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-white font-medium">{tag.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to edit
                          </span>
                          <Edit className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-700 bg-gray-900/50">
              <Button
                onClick={() => { setShowTagManager(false); setEditingTag(null); }}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Contact Side Panel */}
      {showAddPanel && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setShowAddPanel(false)}
          data-testid="contact-form-panel"
        >
          <div
            className="w-full md:w-[500px] h-full bg-gray-900 border-l border-gray-700 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h2>
              <button
                onClick={() => setShowAddPanel(false)}
                className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {/* Name */}
              <div>
                <Label className="text-sm font-medium text-gray-300 mb-2 block">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="contact-name-input"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-300 mb-2 block">Email</Label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="john@example.com"
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="contact-email-input"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-300 mb-2 block">Phone</Label>
                  <Input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="bg-gray-800 border-gray-700 text-white"
                    data-testid="contact-phone-input"
                  />
                </div>
              </div>

              {/* Company */}
              <div>
                <Label className="text-sm font-medium text-gray-300 mb-2 block">Company</Label>
                <Input
                  value={contactForm.company}
                  onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  placeholder="ABC Realty"
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="contact-company-input"
                />
              </div>

              {/* Type & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-300 mb-2 block">Contact Type</Label>
                  <select
                    value={contactForm.contact_type}
                    onChange={(e) => setContactForm({ ...contactForm, contact_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300"
                    data-testid="contact-type-select"
                  >
                    {contactTypeOptions.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-300 mb-2 block">Status</Label>
                  <select
                    value={contactForm.status}
                    onChange={(e) => setContactForm({ ...contactForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300"
                    data-testid="contact-status-select"
                  >
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
              {/* Tags */}
              <div>
                <Label className="text-sm font-medium text-gray-300 mb-2 block">Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTagInForm(tag.id)}
                      className="px-3 py-1.5 rounded-full text-sm transition-all"
                      style={{
                        backgroundColor: contactForm.tag_ids.includes(tag.id) ? `${tag.color}30` : 'transparent',
                        border: contactForm.tag_ids.includes(tag.id) ? `2px solid ${tag.color}` : '1px solid #374151',
                        color: contactForm.tag_ids.includes(tag.id) ? tag.color : '#9ca3af'
                      }}
                      data-testid={`tag-toggle-${tag.id}`}
                    >
                      {tag.name}
                    </button>
                  ))}
                  {/* Add Tag Button */}
                  <button
                    type="button"
                    onClick={() => setShowInlineTagCreate(!showInlineTagCreate)}
                    className="px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1 border border-dashed border-gray-600 text-gray-400 hover:border-cyan-500 hover:text-cyan-400"
                    data-testid="add-tag-inline-button"
                  >
                    <Plus className="w-3 h-3" />
                    New Tag
                  </button>
                </div>

                {/* Inline Tag Creation */}
                {showInlineTagCreate && (
                  <div className="mt-3 p-3 rounded-lg bg-gray-800/80 border border-gray-700 space-y-3" data-testid="inline-tag-form">
                    <Input
                      value={inlineTagName}
                      onChange={(e) => setInlineTagName(e.target.value)}
                      placeholder="Tag name..."
                      className="bg-gray-900 border-gray-600 text-white text-sm"
                      data-testid="inline-tag-name-input"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInlineTagCreate(); } }}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Color:</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {tagColorOptions.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setInlineTagColor(c)}
                            className="w-5 h-5 rounded-full transition-all"
                            style={{
                              backgroundColor: c,
                              border: inlineTagColor === c ? '2px solid white' : '2px solid transparent',
                              transform: inlineTagColor === c ? 'scale(1.2)' : 'scale(1)'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleInlineTagCreate}
                        disabled={!inlineTagName.trim()}
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-700 text-xs"
                        data-testid="inline-tag-create-button"
                      >
                        Create & Add
                      </Button>
                      <Button
                        type="button"
                        onClick={() => { setShowInlineTagCreate(false); setInlineTagName(''); }}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <Label className="text-sm font-medium text-gray-300 mb-2 block">Notes</Label>
                <Textarea
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={4}
                  className="bg-gray-800 border-gray-700 text-white"
                  data-testid="contact-notes-input"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex gap-3 border-t border-gray-700">
              <Button
                onClick={() => setShowAddPanel(false)}
                variant="outline"
                className="flex-1 border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveContact}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                data-testid="save-contact-button"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingContact ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Details Side Panel */}
      {showDetailsPanel && selectedContact && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDetailsPanel(false)}
          data-testid="contact-details-panel"
        >
          <div
            className="w-full md:w-[500px] h-full bg-gray-900 border-l border-gray-700 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedContact.name}</h2>
                {selectedContact.company && (
                  <p className="text-sm text-gray-400">{selectedContact.company}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDetailsPanel(false);
                    handleOpenEdit(selectedContact);
                  }}
                  className="p-2 rounded-lg bg-gray-800 text-cyan-400 hover:bg-gray-700"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowDetailsPanel(false)}
                  className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-cyan-500 uppercase tracking-wider">Contact Info</h3>
                {selectedContact.email && (
                  <a 
                    href={`mailto:${selectedContact.email}`}
                    className="flex items-center gap-3 text-gray-300 hover:text-white"
                  >
                    <Mail className="w-4 h-4 text-gray-500" />
                    {selectedContact.email}
                  </a>
                )}
                {selectedContact.phone && (
                  <a 
                    href={`tel:${selectedContact.phone}`}
                    className="flex items-center gap-3 text-gray-300 hover:text-white"
                  >
                    <Phone className="w-4 h-4 text-gray-500" />
                    {selectedContact.phone}
                  </a>
                )}
              </div>

              {/* Status & Type */}
              <div className="flex gap-3">
                <span 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: `${getStatusColor(selectedContact.status)}20`,
                    color: getStatusColor(selectedContact.status),
                    border: `1px solid ${getStatusColor(selectedContact.status)}40`
                  }}
                >
                  {selectedContact.status}
                </span>
                <span className="px-3 py-1 rounded text-sm bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  {selectedContact.contact_type}
                </span>
              </div>

              {/* Tags */}
              {selectedContact.tags?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-cyan-500 uppercase tracking-wider mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 rounded-full text-sm"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                          border: `1px solid ${tag.color}40`
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Deals */}
              {selectedContact.linked_deals?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-cyan-500 uppercase tracking-wider mb-2">
                    Linked Deals ({selectedContact.linked_deals.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedContact.linked_deals.map(deal => (
                      <div
                        key={deal.id}
                        className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                      >
                        <p className="font-medium text-white">{deal.title || deal.address}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <span className="text-cyan-400">{formatCurrency(deal.asking_price)}</span>
                          {deal.asset_type && (
                            <span className="text-gray-500">• {deal.asset_type}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedContact.notes && (
                <div>
                  <h3 className="text-xs font-semibold text-cyan-500 uppercase tracking-wider mb-2">Notes</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{selectedContact.notes}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 flex gap-3 border-t border-gray-700">
              <Button
                onClick={() => {
                  setShowDetailsPanel(false);
                  handleOpenEdit(selectedContact);
                }}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Contact
              </Button>
              <Button
                onClick={() => handleDeleteContact(selectedContact)}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvImport && csvData && (
        <div
          data-testid="csv-import-modal"
          onClick={() => { setShowCsvImport(false); setCsvData(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.85)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a1f2e', borderRadius: '12px',
              width: '90%', maxWidth: '800px', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} style={{ color: '#00d4ff' }} />
                <span style={{ color: 'white', fontWeight: '600', fontSize: '16px' }}>
                  Import Contacts from CSV
                </span>
                <span style={{ color: '#9ca3af', fontSize: '13px' }}>
                  ({csvData.rows.length} rows found)
                </span>
              </div>
              <button
                data-testid="csv-import-close"
                onClick={() => { setShowCsvImport(false); setCsvData(null); }}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', color: '#9ca3af', cursor: 'pointer',
                  width: '32px', height: '32px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Column Mapping */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '12px' }}>
                Map your CSV columns to contact fields:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {csvData.headers.map((header, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: '500' }}>{header}</span>
                    <select
                      data-testid={`csv-column-map-${idx}`}
                      value={csvColumnMap[idx] || ''}
                      onChange={(e) => {
                        setCsvColumnMap(prev => {
                          const next = { ...prev };
                          // Remove previous mapping for this field
                          Object.keys(next).forEach(k => {
                            if (next[k] === e.target.value && k !== String(idx)) delete next[k];
                          });
                          if (e.target.value) next[idx] = e.target.value;
                          else delete next[idx];
                          return next;
                        });
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px', padding: '6px 8px', color: '#e2e8f0',
                        fontSize: '13px', cursor: 'pointer', appearance: 'auto'
                      }}
                    >
                      <option value="">-- Skip --</option>
                      <option value="name">Name *</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="company">Company</option>
                      <option value="contact_type">Type</option>
                      <option value="status">Status</option>
                      <option value="notes">Notes</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>Preview (first 5 rows):</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      {csvData.headers.map((h, i) => (
                        <th key={i} style={{
                          padding: '8px', textAlign: 'left', color: '#00d4ff',
                          fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.1)',
                          whiteSpace: 'nowrap', fontSize: '11px', textTransform: 'uppercase'
                        }}>
                          {csvColumnMap[i] ? `${h} \u2192 ${csvColumnMap[i]}` : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} style={{
                            padding: '8px', color: csvColumnMap[j] ? '#e2e8f0' : '#6b7280',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}>
                            {cell || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ color: '#9ca3af', fontSize: '13px' }}>
                {Object.values(csvColumnMap).includes('name') 
                  ? `Ready to import ${csvData.rows.filter(r => r[parseInt(Object.entries(csvColumnMap).find(([_,v]) => v === 'name')?.[0])]?.trim()).length} contacts`
                  : 'Map at least the "Name" column to proceed'}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  onClick={() => { setShowCsvImport(false); setCsvData(null); }}
                  variant="outline"
                  className="border-gray-700 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  data-testid="csv-import-confirm-button"
                  onClick={handleCsvImport}
                  disabled={importingCsv || !Object.values(csvColumnMap).includes('name')}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  {importingCsv ? 'Importing...' : 'Import Contacts'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
