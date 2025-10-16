import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Plus, Mail, Phone, Building2, Search } from 'lucide-react';
import { toast } from 'sonner';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { user } = useContext(AuthContext);

  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm]);

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
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = [...contacts];

    if (searchTerm) {
      filtered = filtered.filter((contact) =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredContacts(filtered);
  };

  const handleCreateContact = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create contacts');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert([{
          ...newContact,
          owner_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Contact created successfully');
      setShowCreateDialog(false);
      setNewContact({
        name: '',
        email: '',
        phone: '',
        company: '',
        title: '',
        notes: '',
      });
      fetchContacts();
    } catch (error) {
      console.error('Error creating contact:', error);
      toast.error('Failed to create contact');
    }
  };

  const addTag = (tag) => {
    if (!newContact.tags.includes(tag)) {
      setNewContact({ ...newContact, tags: [...newContact.tags, tag] });
    }
  };

  const removeTag = (tag) => {
    setNewContact({ ...newContact, tags: newContact.tags.filter((t) => t !== tag) });
  };

  const toggleFilterTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="p-8" data-testid="contacts-page">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Contacts</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{filteredContacts.length} contacts found</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="create-contact-button">
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateContact} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  required
                  data-testid="contact-name-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    data-testid="contact-email-input"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    data-testid="contact-phone-input"
                  />
                </div>
              </div>
              <div>
                <Label>Company</Label>
                <Input
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                />
              </div>
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newContact.tags.map((tag) => (
                    <Badge key={tag} className="bg-blue-100 text-blue-800">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ml-2 text-blue-600 hover:text-blue-800">
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {allTags.filter((tag) => !newContact.tags.includes(tag)).map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      + {tag}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <textarea
                  className="w-full border rounded-lg p-2 min-h-[80px]"
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" data-testid="submit-contact-button">
                Add Contact
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="glass-surface p-4 mb-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-contacts-input"
            />
          </div>
        </div>
        <div>
          <Label className="mb-2 block" style={{ color: 'var(--text-secondary)' }}>Filter by tags:</Label>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleFilterTag(tag)}
                className="px-3 py-1 rounded-full text-sm font-medium transition-colors"
                style={selectedTags.includes(tag) 
                  ? { background: 'var(--accent)', color: 'white', border: '1px solid var(--accent)' }
                  : { background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }
                }
                data-testid={`filter-tag-${tag}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map((contact) => (
          <div key={contact.id} className="contact-card" data-testid={`contact-card-${contact.id}`}>
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{contact.name}</h3>
              {contact.company && (
                <p className="text-sm flex items-center" style={{ color: 'var(--text-secondary)' }}>
                  <Building2 className="w-4 h-4 mr-1" />
                  {contact.company}
                </p>
              )}
            </div>

            <div className="space-y-2 mb-4">
              {contact.email && (
                <p className="text-sm flex items-center" style={{ color: 'var(--text-secondary)' }}>
                  <Mail className="w-4 h-4 mr-2" style={{ color: 'var(--text-muted)' }} />
                  {contact.email}
                </p>
              )}
              {contact.phone && (
                <p className="text-sm flex items-center" style={{ color: 'var(--text-secondary)' }}>
                  <Phone className="w-4 h-4 mr-2" style={{ color: 'var(--text-muted)' }} />
                  {contact.phone}
                </p>
              )}
            </div>

            {contact.tags && contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {contact.tags.map((tag) => (
                  <span key={tag} className="badge text-xs" style={{ background: 'rgba(59, 130, 246, 0.12)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {contact.notes && (
              <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{contact.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Contacts;
