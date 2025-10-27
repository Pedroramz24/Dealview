import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { X, Save, Calendar, Clock, FileText, Tag } from 'lucide-react';
import { toast } from 'sonner';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const eventTypeOptions = [
  { value: 'deal', label: 'Deal Milestone', color: '#10b981' },
  { value: 'call', label: 'Call / Follow-up', color: '#3b82f6' },
  { value: 'task', label: 'Task', color: '#a855f7' },
  { value: 'deadline', label: 'Deadline', color: '#ef4444' },
  { value: 'meeting', label: 'Meeting', color: '#f97316' }
];

const CreateEventPanel = ({ isOpen, onClose, onEventCreated }) => {
  const { user } = useContext(AuthContext);
  const [isSaving, setIsSaving] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
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
    start_date: new Date().toISOString(),
    end_date: null,
    all_day: true,
    related_deal_id: null,
    related_contact_id: null,
    description: '',
    reminder_enabled: false,
    reminder_minutes_before: 60
  });

  useEffect(() => {
    if (isOpen && user) {
      fetchDealsAndContacts();
    }
  }, [isOpen, user]);

  const fetchDealsAndContacts = async () => {
    try {
      const { data: dealsData } = await supabase
        .from('deals')
        .select('id, title, address')
        .eq('owner_id', user.id)
        .limit(50);
      
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('id, full_name, company')
        .eq('owner_id', user.id)
        .limit(50);

      setDeals(dealsData || []);
      setContacts(contactsData || []);
    } catch (error) {
      console.error('Error fetching deals/contacts:', error);
    }
  };

  const handleSubmit = async () => {
    if (!eventForm.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    setIsSaving(true);
    try {
      const eventData = {
        title: eventForm.title,
        event_type: eventForm.event_type,
        start_date: startDate.toISOString(),
        end_date: endDate ? endDate.toISOString() : startDate.toISOString(),
        all_day: eventForm.all_day,
        related_deal_id: eventForm.related_deal_id,
        related_contact_id: eventForm.related_contact_id,
        description: eventForm.description,
        reminder_enabled: eventForm.reminder_enabled,
        reminder_minutes_before: eventForm.reminder_minutes_before,
        owner_id: user.id,
        status: 'pending'
      };

      const { error } = await supabase
        .from('calendar_events')
        .insert([eventData]);

      if (error) {
        console.error('Supabase error:', error);
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          toast.error('Calendar table not set up yet. Please run the migration in Supabase SQL Editor.');
        } else {
          toast.error(`Failed to create event: ${error.message}`);
        }
        throw error;
      }

      toast.success('Event created successfully!');
      onEventCreated();
      resetForm();
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEventForm({
      title: '',
      event_type: 'task',
      start_date: new Date().toISOString(),
      end_date: null,
      all_day: false,
      related_deal_id: null,
      related_contact_id: null,
      description: '',
      reminder_enabled: false,
      reminder_minutes_before: 60
    });
    setStartDate(new Date());
    setEndDate(new Date());
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
    (c.full_name || '').toLowerCase().includes(searchContact.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: isOpen ? '0' : '-600px',
        width: '500px',
        height: '100vh',
        background: 'linear-gradient(135deg, rgba(11, 12, 14, 0.95) 0%, rgba(26, 26, 26, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 3000,
        transition: 'right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-30px 0 80px rgba(0, 0, 0, 0.8), inset 1px 0 0 rgba(255,255,255,0.03)'
      }}
    >
      <div style={{
        padding: '24px 28px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(180deg, rgba(0,184,212,0.04) 0%, transparent 100%)'
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
            border: '1px solid rgba(0,184,212,0.25)',
            boxShadow: '0 4px 20px rgba(0,184,212,0.2)'
          }}>
            <Calendar className="w-5 h-5" style={{ color: '#00d4ff' }} />
          </div>
          <h2 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em' }}>Create Event</h2>
        </div>
        <button
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
          }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: '28px' }}>
        <div className="space-y-6">
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Event Title *
            </label>
            <input
              type="text"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              placeholder="Enter event title..."
              className="premium-input"
            />
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Event Type *
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {eventTypeOptions.map(type => (
                <button
                  key={type.value}
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
                    transition: 'all 0.2s ease',
                    boxShadow: eventForm.event_type === type.value ? `0 0 20px ${type.color}20` : 'none'
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Start Date & Time *
            </label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              showTimeSelect={!eventForm.all_day}
              dateFormat={eventForm.all_day ? 'MMMM d, yyyy' : 'MMMM d, yyyy h:mm aa'}
              className="premium-date-input"
              wrapperClassName="w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setEventForm({ ...eventForm, all_day: !eventForm.all_day })}
              style={{
                width: '52px',
                height: '28px',
                background: eventForm.all_day ? 'linear-gradient(135deg, rgba(0,184,212,0.3), rgba(0,184,212,0.2))' : 'rgba(255,255,255,0.05)',
                border: eventForm.all_day ? '1px solid rgba(0,184,212,0.4)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: eventForm.all_day ? '0 0 20px rgba(0,184,212,0.2)' : 'none'
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
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }} />
            </button>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>All Day Event</span>
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Link to Deal (Optional)
            </label>
            <input
              type="text"
              value={searchDeal}
              onChange={(e) => setSearchDeal(e.target.value)}
              onFocus={() => setSearchDeal('')}
              placeholder="Search deals..."
              className="premium-input"
            />
            {searchDeal && filteredDeals.length > 0 && (
              <div style={{
                marginTop: '8px',
                background: 'rgba(15,20,30,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
              }}>
                {filteredDeals.map(deal => (
                  <div
                    key={deal.id}
                    onClick={() => {
                      setEventForm({ ...eventForm, related_deal_id: deal.id });
                      setSearchDeal(deal.address || deal.title);
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
            {eventForm.related_deal_id && !searchDeal.includes(filteredDeals.find(d => d.id === eventForm.related_deal_id)?.address) && (
              <div style={{
                marginTop: '8px',
                padding: '10px 14px',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <p style={{ color: '#10b981', fontSize: '13px', fontWeight: '600' }}>
                  Deal linked
                </p>
                <button
                  onClick={() => {
                    setEventForm({ ...eventForm, related_deal_id: null });
                    setSearchDeal('');
                  }}
                  style={{
                    padding: '4px',
                    background: 'rgba(239,68,68,0.1)',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#ef4444',
                    cursor: 'pointer'
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Link to Contact (Optional)
            </label>
            <input
              type="text"
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
              onFocus={() => setSearchContact('')}
              placeholder="Search contacts..."
              className="premium-input"
            />
            {searchContact && filteredContacts.length > 0 && (
              <div style={{
                marginTop: '8px',
                background: 'rgba(15,20,30,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
              }}>
                {filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setEventForm({ ...eventForm, related_contact_id: contact.id });
                      setSearchContact(contact.full_name);
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
                    <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>{contact.full_name}</p>
                    {contact.company && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{contact.company}</p>}
                  </div>
                ))}
              </div>
            )}
            {eventForm.related_contact_id && !searchContact.includes(filteredContacts.find(c => c.id === eventForm.related_contact_id)?.full_name) && (
              <div style={{
                marginTop: '8px',
                padding: '10px 14px',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <p style={{ color: '#10b981', fontSize: '13px', fontWeight: '600' }}>
                  Contact linked
                </p>
                <button
                  onClick={() => {
                    setEventForm({ ...eventForm, related_contact_id: null });
                    setSearchContact('');
                  }}
                  style={{
                    padding: '4px',
                    background: 'rgba(239,68,68,0.1)',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#ef4444',
                    cursor: 'pointer'
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notes / Description
            </label>
            <textarea
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              placeholder="Add notes or details..."
              rows={4}
              className="premium-input"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      <div style={{
        padding: '24px 28px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(0,0,0,0.3)'
      }}>
        <button
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
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isSaving ? 'none' : '0 8px 32px rgba(0,184,212,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}
          onMouseEnter={(e) => {
            if (!isSaving) {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 184, 212, 0.35), rgba(59, 130, 246, 0.35))';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 48px rgba(0,184,212,0.35), inset 0 1px 0 rgba(255,255,255,0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSaving) {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 184, 212, 0.25), rgba(59, 130, 246, 0.25))';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,184,212,0.25), inset 0 1px 0 rgba(255,255,255,0.1)';
            }
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
