import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { X, Save, User } from 'lucide-react';
import { toast } from 'sonner';

const ContactFormPanel = ({ isOpen, onClose, onContactCreated, editingContact = null, dealId = null }) => {
  const { user } = useContext(AuthContext);
  const [isSaving, setIsSaving] = useState(false);

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
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
        notes: editingContact.notes || ''
      });
    } else {
      // Reset form when creating new
      setContactForm({
        name: '',
        email: '',
        phone: '',
        company: '',
        title: '',
        notes: ''
      });
    }
  }, [editingContact, isOpen]);

  const handleSaveContact = async () => {
    if (!contactForm.name) {
      toast.error('Contact name is required');
      return;
    }

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setIsSaving(true);
    try {
      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('contacts')
          .update({
            name: contactForm.name,
            email: contactForm.email || null,
            phone: contactForm.phone || null,
            company: contactForm.company || null,
            title: contactForm.title || null,
            notes: contactForm.notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingContact.id);

        if (error) throw error;
        toast.success('Contact updated successfully');
        
        if (onContactCreated) {
          onContactCreated({ ...editingContact, ...contactForm });
        }
      } else {
        // Create new contact
        const { data: newContact, error } = await supabase
          .from('contacts')
          .insert([{
            owner_id: user.id,
            name: contactForm.name,
            email: contactForm.email || null,
            phone: contactForm.phone || null,
            company: contactForm.company || null,
            title: contactForm.title || null,
            notes: contactForm.notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        toast.success('Contact created successfully');

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
            toast.warning('Contact created but failed to link to deal');
          } else {
            toast.success('Contact linked to deal');
          }
        }

        if (onContactCreated) {
          onContactCreated(newContact);
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving contact:', error);
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
        right: isOpen ? 0 : '-600px',
        width: '600px',
        height: '100vh',
        background: 'linear-gradient(135deg, rgba(11, 12, 14, 0.95) 0%, rgba(26, 26, 26, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1100,
        transition: 'right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 50px rgba(0, 0, 0, 0.5)',
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
              fontSize: '20px',
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
            width: '36px',
            height: '36px',
            borderRadius: '8px',
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
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}
        className="custom-scrollbar"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Contact Info Section */}
          <div
            style={{
              padding: '20px',
              background: 'rgba(0, 184, 212, 0.05)',
              border: '1px solid rgba(0, 184, 212, 0.15)',
              borderRadius: '12px',
            }}
          >
            <h3
              style={{
                color: '#00b8d4',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '16px',
              }}
            >
              Contact Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Name */}
              <div>
                <Label
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '13px',
                    fontWeight: '500',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </Label>
                <Input
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="John Doe"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(100, 116, 139, 0.4)',
                    color: '#FFFFFF',
                    padding: '10px 12px',
                    borderRadius: '6px',
                  }}
                />
              </div>

              {/* Email and Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <Label
                    style={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '13px',
                      fontWeight: '500',
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
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
                      color: '#FFFFFF',
                      padding: '10px 12px',
                      borderRadius: '6px',
                    }}
                  />
                </div>
                <div>
                  <Label
                    style={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '13px',
                      fontWeight: '500',
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
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
                      color: '#FFFFFF',
                      padding: '10px 12px',
                      borderRadius: '6px',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Company Details Section */}
          <div
            style={{
              padding: '20px',
              background: 'rgba(0, 212, 170, 0.05)',
              border: '1px solid rgba(0, 212, 170, 0.15)',
              borderRadius: '12px',
            }}
          >
            <h3
              style={{
                color: '#00d4aa',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '16px',
              }}
            >
              Company Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <Label
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '13px',
                    fontWeight: '500',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Company
                </Label>
                <Input
                  value={contactForm.company}
                  onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  placeholder="ABC Realty"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(100, 116, 139, 0.4)',
                    color: '#FFFFFF',
                    padding: '10px 12px',
                    borderRadius: '6px',
                  }}
                />
              </div>
              <div>
                <Label
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '13px',
                    fontWeight: '500',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Title
                </Label>
                <Input
                  value={contactForm.title}
                  onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                  placeholder="Principal, Broker, CFO"
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(100, 116, 139, 0.4)',
                    color: '#FFFFFF',
                    padding: '10px 12px',
                    borderRadius: '6px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div
            style={{
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
            }}
          >
            <h3
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '16px',
              }}
            >
              Notes
            </h3>

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
                padding: '10px 12px',
                borderRadius: '6px',
                resize: 'vertical',
                fontFamily: 'inherit',
                fontSize: '14px',
                lineHeight: '1.5',
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer with Action Buttons */}
      <div
        style={{
          padding: '20px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={onClose}
          disabled={isSaving}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '14px',
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
            padding: '12px 24px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #00b8d4 0%, #00d4aa 100%)',
            border: 'none',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 150ms ease',
          }}
        >
          <Save size={16} />
          {isSaving ? 'Saving...' : (editingContact ? 'Save Changes' : 'Create Contact')}
        </button>
      </div>
    </div>
  );
};

export default ContactFormPanel;
