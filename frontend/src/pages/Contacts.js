import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext, API } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  Plus, Mail, Phone, Building2, Search, X, Save, Edit, 
  User, Grid, List, Trash2, Tag, Filter, Settings, Palette, Upload, FileText,
  ChevronUp, ChevronDown, ChevronsUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { colors, gradients, borderRadius } from '../styles/designSystem';
import ContactFormPanel from '../components/ContactFormPanel';

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
  '#ff0000', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#3b82f6', '#6b7280',
  '#f43f5e', '#84cc16', '#f97316', '#a78bfa'
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
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  
  // Panel states
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  
  // Tag management modal
  const [showTagManager, setShowTagManager] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagForm, setTagForm] = useState({ name: '', color: '#ff0000' });
  const [savingTag, setSavingTag] = useState(false);
  
  // CSV import state
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [csvColumnMap, setCsvColumnMap] = useState({});
  const [importingCsv, setImportingCsv] = useState(false);
  
  // Inline tag creation in edit panel
  const [showInlineTagCreate, setShowInlineTagCreate] = useState(false);
  const [inlineTagName, setInlineTagName] = useState('');
  const [inlineTagColor, setInlineTagColor] = useState('#ff0000');
  
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
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
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
    setEditingContact(null);
    setShowAddPanel(true);
  };

  const handleOpenEdit = (contact) => {
    setEditingContact(contact);
    setShowAddPanel(true);
  };

  const handleOpenDetails = async (contact) => {
    // Fetch full contact with linked deals
    try {
      const token = await getToken();
      const res = await fetch(`${API}/contacts/${contact.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedContact(data.contact);
        setShowDetailsPanel(true);
      }
    } catch { /* silent */ }
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
    setTagForm({ name: '', color: '#ff0000' });
    setShowTagManager(true);
  };

  const handleOpenTagEdit = (tag) => {
    setEditingTag(tag);
    setTagForm({ name: tag.name, color: tag.color || '#ff0000' });
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
        <div className="text-red-500">Loading contacts...</div>
      </div>
    );
  }

  // ---- Sorting logic ----
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    let va = a[sortField] ?? '';
    let vb = b[sortField] ?? '';
    if (sortField === 'created_at') {
      va = va ? new Date(va).getTime() : 0;
      vb = vb ? new Date(vb).getTime() : 0;
    } else {
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown size={12} style={{ opacity: 0.3, marginLeft: '4px', display: 'inline' }} />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: '#ff0000', marginLeft: '4px', display: 'inline' }} />
      : <ChevronDown size={12} style={{ color: '#ff0000', marginLeft: '4px', display: 'inline' }} />;
  };

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
                  ? 'bg-red-500/20 border border-red-500 text-red-500' 
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
                  ? 'bg-red-500/20 border border-red-500 text-red-500' 
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
            className="bg-red-600 hover:bg-red-700"
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
                ? 'bg-red-500/20 text-red-400 border border-red-500' 
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
            className="px-3 py-1 rounded-full text-sm text-gray-500 border border-dashed border-gray-700 hover:border-red-500 hover:text-red-500 transition-all flex items-center gap-1"
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
              className="mt-4 bg-red-600 hover:bg-red-700"
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
                  <th
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('name')}
                    data-testid="sort-name"
                  >Name <SortIcon field="name" /></th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                  <th
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('company')}
                    data-testid="sort-company"
                  >Company <SortIcon field="company" /></th>
                  <th
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('contact_type')}
                    data-testid="sort-type"
                  >Type <SortIcon field="contact_type" /></th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Tags</th>
                  <th
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('created_at')}
                    data-testid="sort-created"
                  >Created <SortIcon field="created_at" /></th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedContacts.map((contact) => (
                  <tr 
                    key={contact.id}
                    className="border-b border-gray-700/30 hover:bg-gray-800/50 transition-all cursor-pointer"
                    onClick={() => handleOpenEdit(contact)}
                    data-testid={`contact-row-${contact.id}`}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-white text-sm">{contact.name}</p>
                    </td>
                    <td className="px-5 py-3">
                      {contact.phone ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(contact.phone); }}
                          className="text-sm text-gray-300 hover:text-white flex items-center gap-1.5 group"
                          data-testid={`copy-phone-${contact.id}`}
                        >
                          <Phone className="w-3 h-3 text-gray-500 group-hover:text-red-400" />
                          {contact.phone}
                        </button>
                      ) : <span className="text-gray-600 text-sm">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {contact.email ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(contact.email); }}
                          className="text-sm text-gray-300 hover:text-white flex items-center gap-1.5 group"
                          data-testid={`copy-email-${contact.id}`}
                        >
                          <Mail className="w-3 h-3 text-gray-500 group-hover:text-red-400" />
                          <span className="max-w-[180px] truncate">{contact.email}</span>
                        </button>
                      ) : <span className="text-gray-600 text-sm">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-sm">
                      {contact.company || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        {contact.contact_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
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
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {contact.created_at ? new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEdit(contact)}
                          className="p-1.5 rounded-lg bg-gray-700/50 border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700"
                          data-testid={`edit-contact-${contact.id}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact)}
                          className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                          data-testid={`delete-contact-${contact.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                className="p-5 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-red-500/50 transition-all cursor-pointer group"
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
                      className="p-1.5 rounded bg-gray-700/50 text-red-400"
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
                    <span className="text-xs text-red-400">
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/20 flex items-center justify-center border border-red-500/30">
                  <Settings className="w-5 h-5 text-red-400" />
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
                <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4">
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
                            setTagForm({ name: '', color: '#ff0000' });
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
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50"
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
                            ? 'bg-red-500/10 border border-red-500/30' 
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
                          <Edit className="w-4 h-4 text-gray-500 group-hover:text-red-400 transition-colors" />
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

      {/* Unified Contact Form Panel — same as CRM Map & Pipeline */}
      <ContactFormPanel
        isOpen={showAddPanel}
        onClose={() => { setShowAddPanel(false); setEditingContact(null); }}
        onContactCreated={() => { fetchContacts(); setShowAddPanel(false); setEditingContact(null); }}
        editingContact={editingContact}
        dealId={null}
        rightOffset={0}
      />

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
                <FileText size={20} style={{ color: '#ff0000' }} />
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
                  <div key={header} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                        <th key={`th-${h}`} style={{
                          padding: '8px', textAlign: 'left', color: '#ff0000',
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
                      <tr key={`row-${i}`}>
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
                  className="bg-red-600 hover:bg-red-700"
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
