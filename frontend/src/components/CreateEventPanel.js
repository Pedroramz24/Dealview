import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { X, Save, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EVENT_TYPE_OPTIONS = [
  { value: 'meeting', label: 'Meeting', color: '#f97316' },
  { value: 'call', label: 'Call', color: '#3b82f6' },
  { value: 'task', label: 'Task', color: '#a855f7' },
  { value: 'deadline', label: 'Deadline', color: '#ef4444' },
  { value: 'deal', label: 'Deal Milestone', color: '#10b981' }
];

const CreateEventPanel = ({ isOpen, onClose, onEventCreated }) => {
  const { session } = useContext(AuthContext);
  const [isSaving, setIsSaving] = useState(false);
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [searchDeal, setSearchDeal] = useState('');
  const [searchContact, setSearchContact] = useState('');
  const [showDealDropdown, setShowDealDropdown] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);

  const [eventForm, setEventForm] = useState({
    title: '',
    event_type: 'task',
    start_time: '',
    end_time: '',
    all_day: true,
    deal_id: null,
    contact_id: null,
    description: ''
  });

  const getAuthHeaders = () => {
    if (!session?.access_token) return null;
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  };

  useEffect(() => {
    if (isOpen && session) {
      fetchDealsAndContacts();
      // Set default start time
      const now = new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
      setEventForm(prev => ({
        ...prev,
        start_time: now.toISOString().slice(0, 16)
      }));
    }
  }, [isOpen, session]);

  const fetchDealsAndContacts = async () => {
    const headers = getAuthHeaders();
    if (!headers) return;

    try {
      // Fetch deals
      const dealsRes = await fetch(`${API_URL}/api/deals`, { headers });
      const dealsData = await dealsRes.json();
      if (dealsData.success) {
        setDeals(dealsData.deals || []);
      }

      // Fetch contacts
      const contactsRes = await fetch(`${API_URL}/api/contacts`, { headers });
      const contactsData = await contactsRes.json();
      if (contactsData.success) {
        setContacts(contactsData.contacts || []);
      }
    } catch (error) {
      console.error('Error fetching deals/contacts:', error);
    }
  };

  const handleSubmit = async () => {
    if (!eventForm.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }
    if (!eventForm.start_time) {
      toast.error('Please select a start time');
      return;
    }

    const headers = getAuthHeaders();
    if (!headers) {
      toast.error('Authentication required');
      return;
    }

    setIsSaving(true);
    try {
      const eventColor = EVENT_TYPE_OPTIONS.find(opt => opt.value === eventForm.event_type)?.color || '#00b8d4';
      
      const response = await fetch(`${API_URL}/api/calendar/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: eventForm.title,
          description: eventForm.description,
          start_time: new Date(eventForm.start_time).toISOString(),
          end_time: eventForm.end_time ? new Date(eventForm.end_time).toISOString() : null,
          all_day: eventForm.all_day,
          deal_id: eventForm.deal_id,
          contact_id: eventForm.contact_id,
          event_type: eventForm.event_type,
          color: eventColor
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Event created successfully!');
        onEventCreated();
        resetForm();
      } else {
        toast.error(data.detail || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEventForm({
      title: '',
      event_type: 'task',
      start_time: '',
      end_time: '',
      all_day: true,
      deal_id: null,
      contact_id: null,
      description: ''
    });
    setSearchDeal('');
    setSearchContact('');
    setShowDealDropdown(false);
    setShowContactDropdown(false);
    setSelectedDeal(null);
    setSelectedContact(null);
  };

  const filteredDeals = deals.filter(d => 
    (d.address || d.title || '').toLowerCase().includes(searchDeal.toLowerCase())
  );

  const filteredContacts = contacts.filter(c => 
    (c.name || '').toLowerCase().includes(searchContact.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      data-testid="create-event-panel"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '500px',
        height: '100vh',
        background: 'linear-gradient(135deg, rgba(11, 12, 14, 0.98) 0%, rgba(26, 26, 26, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-30px 0 80px rgba(0, 0, 0, 0.8)'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '24px 28px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, rgba(0,184,212,0.15), rgba(0,184,212,0.08))',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(0,184,212,0.25)'
          }}>
            <Calendar className="w-5 h-5" style={{ color: '#00d4ff' }} />
          </div>
          <h2 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '800' }}>Create Event</h2>
        </div>
        <button
          data-testid="close-panel-btn"
          onClick={onClose}
          style={{
            width: '40px',
            height: '40px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '28px' }}>
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Event Title *
            </label>
            <input
              data-testid="event-title-input"
              type="text"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              placeholder="Enter event title..."
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Event Type */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Event Type *
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {EVENT_TYPE_OPTIONS.map(type => (
                <button
                  key={type.value}
                  data-testid={`type-btn-${type.value}`}
                  onClick={() => setEventForm({ ...eventForm, event_type: type.value })}
                  style={{
                    padding: '10px 18px',
                    background: eventForm.event_type === type.value ? `linear-gradient(135deg, ${type.color}20, ${type.color}10)` : 'rgba(255, 255, 255, 0.03)',
                    border: eventForm.event_type === type.value ? `1px solid ${type.color}40` : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    color: eventForm.event_type === type.value ? type.color : 'rgba(255, 255, 255, 0.6)',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date & Time */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Start Date & Time *
            </label>
            <input
              data-testid="start-time-input"
              type="datetime-local"
              value={eventForm.start_time}
              onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '14px'
              }}
            />
          </div>

          {/* End Date & Time */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              End Date & Time (Optional)
            </label>
            <input
              data-testid="end-time-input"
              type="datetime-local"
              value={eventForm.end_time}
              onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '14px'
              }}
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-3">
            <button
              data-testid="all-day-toggle"
              onClick={() => setEventForm({ ...eventForm, all_day: !eventForm.all_day })}
              style={{
                width: '52px',
                height: '28px',
                background: eventForm.all_day ? 'linear-gradient(135deg, rgba(0,184,212,0.3), rgba(0,184,212,0.2))' : 'rgba(255,255,255,0.05)',
                border: eventForm.all_day ? '1px solid rgba(0,184,212,0.4)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: eventForm.all_day ? '26px' : '2px',
                width: '22px',
                height: '22px',
                background: eventForm.all_day ? '#00d4ff' : 'rgba(255,255,255,0.4)',
                borderRadius: '11px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </button>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>All Day Event</span>
          </div>

          {/* Link to Deal (Optional) */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Link to Deal (Optional)
            </label>
            {selectedDeal ? (
              <div style={{
                padding: '14px 16px',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <p style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                  {selectedDeal.address || selectedDeal.title}
                </p>
                <button
                  onClick={() => {
                    setSelectedDeal(null);
                    setEventForm({ ...eventForm, deal_id: null });
                    setSearchDeal('');
                  }}
                  style={{
                    padding: '6px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '6px',
                    color: '#ef4444',
                    cursor: 'pointer'
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  data-testid="deal-search-input"
                  type="text"
                  value={searchDeal}
                  onChange={(e) => {
                    setSearchDeal(e.target.value);
                    setShowDealDropdown(true);
                  }}
                  onFocus={() => setShowDealDropdown(true)}
                  placeholder="Search deals..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
                {showDealDropdown && searchDeal && filteredDeals.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '8px',
                    background: 'rgba(15,20,30,0.98)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 100,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                  }}>
                    {filteredDeals.map(deal => (
                      <div
                        key={deal.id}
                        onClick={() => {
                          setSelectedDeal(deal);
                          setEventForm({ ...eventForm, deal_id: deal.id });
                          setSearchDeal('');
                          setShowDealDropdown(false);
                        }}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,184,212,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>{deal.address || deal.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Link to Contact (Optional) */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Link to Contact (Optional)
            </label>
            {selectedContact ? (
              <div style={{
                padding: '14px 16px',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                    {selectedContact.name}
                  </p>
                  {selectedContact.company && (
                    <p style={{ color: 'rgba(16,185,129,0.6)', fontSize: '12px' }}>{selectedContact.company}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedContact(null);
                    setEventForm({ ...eventForm, contact_id: null });
                    setSearchContact('');
                  }}
                  style={{
                    padding: '6px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '6px',
                    color: '#ef4444',
                    cursor: 'pointer'
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  data-testid="contact-search-input"
                  type="text"
                  value={searchContact}
                  onChange={(e) => {
                    setSearchContact(e.target.value);
                    setShowContactDropdown(true);
                  }}
                  onFocus={() => setShowContactDropdown(true)}
                  placeholder="Search contacts..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
                {showContactDropdown && searchContact && filteredContacts.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '8px',
                    background: 'rgba(15,20,30,0.98)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 100,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                  }}>
                    {filteredContacts.map(contact => (
                      <div
                        key={contact.id}
                        onClick={() => {
                          setSelectedContact(contact);
                          setEventForm({ ...eventForm, contact_id: contact.id });
                          setSearchContact('');
                          setShowContactDropdown(false);
                        }}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,184,212,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>{contact.name}</p>
                        {contact.company && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{contact.company}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notes / Description
            </label>
            <textarea
              data-testid="description-input"
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              placeholder="Add notes or details..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '24px 28px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(0,0,0,0.3)'
      }}>
        <button
          data-testid="create-event-submit-btn"
          onClick={handleSubmit}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '16px',
            background: isSaving ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, rgba(0, 184, 212, 0.25), rgba(59, 130, 246, 0.25))',
            border: '1px solid rgba(0, 184, 212, 0.4)',
            borderRadius: '14px',
            color: isSaving ? 'rgba(255,255,255,0.4)' : '#00d4ff',
            fontWeight: '800',
            fontSize: '15px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'all 0.3s ease'
          }}
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Creating Event...' : 'Create Event'}
        </button>
      </div>
    </div>
  );
};

export default CreateEventPanel;
