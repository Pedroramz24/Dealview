import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
  { value: 'active_contact', label: 'Active Contact' },
  { value: 'no_active_contact', label: 'No Active Contact' },
  { value: 'need_to_call', label: 'Need to Call' },
  { value: 'does_not_want_to_sell', label: 'Does Not Want to Sell' },
  { value: 'need_to_find_contact_number', label: 'Need to Find Contact Number' }
];

const ContactFormPanel = ({ isOpen, onClose, onContactCreated, editingContact = null, dealId = null }) => {
  const { user } = useContext(AuthContext);
  const [isSaving, setIsSaving] = useState(false);
  const [lastFollowupDate, setLastFollowupDate] = useState(null);
  const [nextActionDate, setNextActionDate] = useState(null);

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
    notes: ''
  });

  useEffect(() => {
    if (editingContact) {
      setContactForm({
        name: editingContact.name || '',
        email: editingContact.email || '',
        phone: editingContact.phone || '',
        company: editingContact.company || '',
        title: editingContact.title || '',
        owner_address: editingContact.owner_address || '',
        contact_types: editingContact.contact_types || [],
        asset_type_focus: editingContact.asset_type_focus || [],
        markets: editingContact.markets || [],
        status: editingContact.status || 'active_contact',
        last_followup_date: editingContact.last_followup_date || '',
        next_action_date: editingContact.next_action_date || '',
        lead_source: editingContact.lead_source || '',
        notes: editingContact.notes || ''
      });
      
      if (editingContact.last_followup_date) {
        setLastFollowupDate(new Date(editingContact.last_followup_date));
      }
      if (editingContact.next_action_date) {
        setNextActionDate(new Date(editingContact.next_action_date));
      }
    } else {
      // Reset form when creating new
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
        notes: ''
      });
      setLastFollowupDate(null);
      setNextActionDate(null);
    }
  }, [editingContact, isOpen]);

  const handleContactTypeToggle = (value) => {
    const currentTypes = contactForm.contact_types || [];
    if (currentTypes.includes(value)) {
      setContactForm({
        ...contactForm,
        contact_types: currentTypes.filter(t => t !== value)
      });
    } else {
      setContactForm({
        ...contactForm,
        contact_types: [...currentTypes, value]
      });
    }
  };

  const handleAssetTypeToggle = (value) => {
    const currentTypes = contactForm.asset_type_focus || [];
    if (currentTypes.includes(value)) {
      setContactForm({
        ...contactForm,
        asset_type_focus: currentTypes.filter(t => t !== value)
      });
    } else {
      setContactForm({
        ...contactForm,
        asset_type_focus: [...currentTypes, value]
      });
    }
  };

  const handleMarketToggle = (value) => {
    const currentMarkets = contactForm.markets || [];
    if (currentMarkets.includes(value)) {
      setContactForm({
        ...contactForm,
        markets: currentMarkets.filter(m => m !== value)
      });
    } else {
      setContactForm({
        ...contactForm,
        markets: [...currentMarkets, value]
      });
    }
  };

  const handleSaveContact = async () => {
    if (!contactForm.name) {
      toast.dismiss(); // Dismiss any existing toasts
      toast.error('Contact name is required');
      return;
    }

    if (!user) {
      toast.dismiss();
      toast.error('You must be logged in');
      return;
    }

    setIsSaving(true);
    try {
      const contactData = {
        name: contactForm.name,
        email: contactForm.email || null,
        phone: contactForm.phone || null,
        company: contactForm.company || null,
        title: contactForm.title || null,
        owner_address: contactForm.owner_address || null,
        contact_types: contactForm.contact_types || [],
        asset_type_focus: contactForm.asset_type_focus || [],
        markets: contactForm.markets || [],
        status: contactForm.status || 'active_contact',
        last_followup_date: lastFollowupDate ? lastFollowupDate.toISOString() : null,
        next_action_date: nextActionDate ? nextActionDate.toISOString() : null,
        lead_source: contactForm.lead_source || null,
        notes: contactForm.notes || null,
        updated_at: new Date().toISOString()
      };

      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', editingContact.id);

        if (error) throw error;
        
        toast.dismiss(); // Dismiss any existing toasts
        toast.success('Contact updated successfully');
        
        if (onContactCreated) {
          onContactCreated({ ...editingContact, ...contactData });
        }
      } else {
        // Create new contact
        const { data: newContact, error } = await supabase
          .from('contacts')
          .insert([{
            owner_id: user.id,
            ...contactData,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;

        // If dealId is provided, automatically link the contact to the deal
        if (dealId && newContact) {
          const { error: linkError } = await supabase
            .from('contact_deal_links')
            .insert([{
              contact_id: newContact.id,
              deal_id: dealId,
              created_at: new Date().toISOString()
            }]);

          if (linkError) {
            console.error('Error linking contact to deal:', linkError);
            toast.dismiss();
            toast.warning('Contact created but failed to link to deal');
          } else {
            // Show single success message for both create and link
            toast.dismiss();
            toast.success('Contact created and linked to deal');
          }
        } else {
          // Show success for create only
          toast.dismiss();
          toast.success('Contact created successfully');
        }

        if (onContactCreated) {
          onContactCreated(newContact);
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.dismiss();
      toast.error('Failed to save contact: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: isOpen ? '500px' : '-600px',
        width: '500px',
        height: '100vh',
        background: 'linear-gradient(135deg, rgba(11, 12, 14, 0.95) 0%, rgba(26, 26, 26, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
        transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <User size={24} style={{ color: '#00b8d4' }} />
          <h2
            style={{
              color: '#FFFFFF',
              fontSize: '18px',
              fontWeight: '600',
              letterSpacing: '-0.02em',
            }}
          >
            {editingContact ? 'Edit Contact' : 'Create New Contact'}
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
        }}
        className="custom-scrollbar"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Contact Info Section */}
          <div
            style={{
              padding: '16px',
              background: 'rgba(0, 184, 212, 0.05)',
              border: '1px solid rgba(0, 184, 212, 0.15)',
              borderRadius: '12px',
            }}
          >
            <h3
              style={{
                color: '#00b8d4',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '12px',
              }}
            >
              Contact Info
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Name */}
              <div>
                <Label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </Label>
                <Input
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="John Doe"
                  style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(100, 116, 139, 0.4)', color: '#FFFFFF', padding: '8px 10px', borderRadius: '6px' }}
                />
              </div>

              {/* Email and Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="john@example.com"
                    style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(100, 116, 139, 0.4)', color: '#FFFFFF', padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <Label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                    Phone
                  </Label>
                  <Input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="(512) 555-0100"
                    style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(100, 116, 139, 0.4)', color: '#FFFFFF', padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Company Details Section */}
          <div style={{ padding: '16px', background: 'rgba(0, 212, 170, 0.05)', border: '1px solid rgba(0, 212, 170, 0.15)', borderRadius: '12px' }}>
            <h3 style={{ color: '#00d4aa', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              Company Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                    Company
                  </Label>
                  <Input
                    value={contactForm.company}
                    onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                    placeholder="ABC Realty"
                    style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(100, 116, 139, 0.4)', color: '#FFFFFF', padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <Label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                    Title
                  </Label>
                  <Input
                    value={contactForm.title}
                    onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                    placeholder="Principal, Broker"
                    style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(100, 116, 139, 0.4)', color: '#FFFFFF', padding: '8px 10px', borderRadius: '6px' }}
                  />
                </div>
              </div>
              <div>
                <Label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                  Owner Address
                </Label>
                <Input
                  value={contactForm.owner_address}
                  onChange={(e) => setContactForm({ ...contactForm, owner_address: e.target.value })}
                  placeholder="123 Main St, Austin, TX 78701"
                  style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(100, 116, 139, 0.4)', color: '#FFFFFF', padding: '8px 10px', borderRadius: '6px' }}
                />
              </div>
            </div>
          </div>

          {/* Contact Type(s) */}
          <div style={{ padding: '16px', background: 'rgba(100, 116, 139, 0.05)', border: '1px solid rgba(100, 116, 139, 0.15)', borderRadius: '12px' }}>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              Contact Type(s)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {contactTypeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleContactTypeToggle(option.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    background: (contactForm.contact_types || []).includes(option.value) ? 'rgba(0, 184, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: (contactForm.contact_types || []).includes(option.value) ? '1px solid rgba(0, 184, 212, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: (contactForm.contact_types || []).includes(option.value) ? '#00b8d4' : 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Asset Type Focus */}
          <div style={{ padding: '16px', background: 'rgba(100, 116, 139, 0.05)', border: '1px solid rgba(100, 116, 139, 0.15)', borderRadius: '12px' }}>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              Asset Type Focus
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {assetTypeOptions.map(option => (
                <button
                  key={option}
                  onClick={() => handleAssetTypeToggle(option)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    background: (contactForm.asset_type_focus || []).includes(option) ? 'rgba(0, 212, 170, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: (contactForm.asset_type_focus || []).includes(option) ? '1px solid rgba(0, 212, 170, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: (contactForm.asset_type_focus || []).includes(option) ? '#00d4aa' : 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Markets */}
          <div style={{ padding: '16px', background: 'rgba(100, 116, 139, 0.05)', border: '1px solid rgba(100, 116, 139, 0.15)', borderRadius: '12px' }}>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              Markets
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {marketOptions.map(option => (
                <button
                  key={option}
                  onClick={() => handleMarketToggle(option)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    background: (contactForm.markets || []).includes(option) ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: (contactForm.markets || []).includes(option) ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: (contactForm.markets || []).includes(option) ? '#a855f7' : 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Status & Notes */}
          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              Status & Notes
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Status */}
              <div>
                <Label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                  Status
                </Label>
                <select
                  value={contactForm.status}
                  onChange={(e) => setContactForm({ ...contactForm, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(100, 116, 139, 0.4)',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '13px'
                  }}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* Date Pickers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                    Last Follow-up
                  </Label>
                  <DatePicker
                    selected={lastFollowupDate}
                    onChange={(date) => setLastFollowupDate(date)}
                    placeholderText="mm/dd/yyyy"
                    dateFormat="MM/dd/yyyy"
                    className="custom-datepicker"
                    wrapperClassName="w-full"
                    customInput={
                      <input
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(100, 116, 139, 0.4)',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      />
                    }
                  />
                </div>
                <div>
                  <Label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                    Next Action
                  </Label>
                  <DatePicker
                    selected={nextActionDate}
                    onChange={(date) => setNextActionDate(date)}
                    placeholderText="mm/dd/yyyy"
                    dateFormat="MM/dd/yyyy"
                    className="custom-datepicker"
                    wrapperClassName="w-full"
                    customInput={
                      <input
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(100, 116, 139, 0.4)',
                          borderRadius: '6px',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      />
                    }
                  />
                </div>
              </div>

              {/* Lead Source */}
              <div>
                <Label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                  Lead Source
                </Label>
                <Input
                  value={contactForm.lead_source}
                  onChange={(e) => setContactForm({ ...contactForm, lead_source: e.target.value })}
                  placeholder="Referral, Website, Event"
                  style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(100, 116, 139, 0.4)', color: '#FFFFFF', padding: '8px 10px', borderRadius: '6px' }}
                />
              </div>

              {/* Notes */}
              <div>
                <Label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                  Notes
                </Label>
                <textarea
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  placeholder="Add notes about this contact..."
                  rows={4}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(100, 116, 139, 0.4)',
                    color: '#FFFFFF',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    lineHeight: '1.5',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Action Buttons */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={onClose}
          disabled={isSaving}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: '600',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.5 : 1,
            transition: 'all 150ms ease',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSaveContact}
          disabled={isSaving}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #00b8d4 0%, #00d4aa 100%)',
            border: 'none',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: '600',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 150ms ease',
          }}
        >
          <Save size={14} />
          {isSaving ? 'Saving...' : (editingContact ? 'Save Changes' : 'Create Contact')}
        </button>
      </div>
    </div>
  );
};

export default ContactFormPanel;
