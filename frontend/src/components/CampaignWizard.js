import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import EmailEditor from 'react-email-editor';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { 
  ArrowRight, ArrowLeft, Send, Calendar, Zap, Tag, Users, 
  CheckSquare, Square, Filter, Eye, Save, Loader2, X, Monitor, Smartphone, Clock
} from 'lucide-react';
import { toast } from 'sonner';

const CampaignWizard = ({ isOpen, onClose, onComplete, token, BACKEND_URL, initialTemplate = null }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Design, 2: Configure, 3: Review
  const emailEditorRef = useRef(null);
  
  // Step 1: Email Design
  const [emailDesign, setEmailDesign] = useState(null);
  const [emailHTML, setEmailHTML] = useState('');
  const [previewMode, setPreviewMode] = useState('desktop');
  
  // Step 2: Configuration
  const [campaignConfig, setCampaignConfig] = useState({
    name: '',
    senderEmail: '',
    senderName: '',
    subject: '',
    previewText: '',
    recipientType: 'choose_contacts', // 'choose_contacts', 'smart_list', 'tags'
    selectedContacts: [],
    selectedTags: [],
    sendOption: 'now', // 'now', 'schedule', 'batch'
    scheduleDate: null,
    scheduleTime: null,
    batchSchedule: {
      startDate: null,
      endDate: null,
      emailsPerDay: 50
    }
  });

  // Contacts and tags data
  const [contacts, setContacts] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load initial template if provided
  useEffect(() => {
    if (isOpen && initialTemplate && initialTemplate.html_content) {
      setEmailHTML(initialTemplate.html_content);
      // Load design if available (from custom templates)
      if (initialTemplate.design) {
        setEmailDesign(initialTemplate.design);
      }
    }
  }, [isOpen, initialTemplate]);

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
      fetchEmailSettings();
    }
  }, [isOpen]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, full_name, email, tags, asset_type_focus, markets, status')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter contacts with valid emails
      const validContacts = (data || []).filter(c => c.email);
      setContacts(validContacts);
      
      // Extract all unique tags
      const tags = Array.from(new Set(validContacts.flatMap(c => c.tags || []))).sort();
      setAllTags(tags);
      
      setFilteredContacts(validContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchEmailSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.configured && data.settings) {
        setCampaignConfig(prev => ({
          ...prev,
          senderEmail: data.settings.sender_email,
          senderName: data.settings.sender_name
        }));
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    }
  };

  // Step 1: Save Email Design
  const handleSaveDesign = () => {
    emailEditorRef.current?.editor?.exportHtml((data) => {
      const { design, html } = data;
      setEmailDesign(JSON.stringify(design));
      setEmailHTML(html);
      setCurrentStep(2);
      toast.success('Email design saved!');
    });
  };

  const onEditorReady = () => {
    // Load initial template if provided
    if (initialTemplate && initialTemplate.html_content && !emailDesign) {
      // First time loading a template
      try {
        if (initialTemplate.design) {
          const design = typeof initialTemplate.design === 'string' 
            ? JSON.parse(initialTemplate.design) 
            : initialTemplate.design;
          emailEditorRef.current?.editor?.loadDesign(design);
        }
      } catch (error) {
        console.error('Error loading template design:', error);
      }
    } else if (emailDesign) {
      // Loading existing design when navigating back
      try {
        const design = JSON.parse(emailDesign);
        emailEditorRef.current?.editor?.loadDesign(design);
      } catch (error) {
        console.error('Error loading existing design:', error);
      }
    }
  };

  // Step 2: Filter contacts based on recipient type
  useEffect(() => {
    if (campaignConfig.recipientType === 'tags' && campaignConfig.selectedTags.length > 0) {
      const filtered = contacts.filter(contact => 
        contact.tags && campaignConfig.selectedTags.some(tag => contact.tags.includes(tag))
      );
      setFilteredContacts(filtered);
      
      // Auto-select contacts with these tags
      const taggedContactIds = filtered.map(c => c.id);
      setCampaignConfig(prev => ({
        ...prev,
        selectedContacts: taggedContactIds
      }));
    } else {
      setFilteredContacts(contacts);
    }
  }, [campaignConfig.recipientType, campaignConfig.selectedTags, contacts]);

  // Toggle contact selection - OPTIMIZED
  const toggleContact = (contactId) => {
    setCampaignConfig(prev => ({
      ...prev,
      selectedContacts: prev.selectedContacts.includes(contactId)
        ? prev.selectedContacts.filter(id => id !== contactId)
        : [...prev.selectedContacts, contactId]
    }));
  };

  // Update campaign config - MEMOIZED to prevent re-renders
  const updateConfig = (field, value) => {
    setCampaignConfig(prev => ({ ...prev, [field]: value }));
  };

  const selectAll = () => {
    setCampaignConfig(prev => ({
      ...prev,
      selectedContacts: filteredContacts.map(c => c.id)
    }));
  };

  const deselectAll = () => {
    setCampaignConfig(prev => ({
      ...prev,
      selectedContacts: []
    }));
  };

  // Step 3: Final send
  const handleFinalSend = async () => {
    if (campaignConfig.selectedContacts.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setSaving(true);

    try {
      // Create campaign
      const createResponse = await fetch(`${BACKEND_URL}/api/email/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: campaignConfig.name,
          subject: campaignConfig.subject,
          html_content: emailHTML,
          plain_text_content: campaignConfig.previewText,
          design: emailDesign,
          segment_filters: {
            tags: campaignConfig.selectedTags,
            recipientType: campaignConfig.recipientType
          }
        })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create campaign');
      }

      const createResult = await createResponse.json();
      const campaignId = createResult.campaign.id;

      // Handle different send options
      if (campaignConfig.sendOption === 'now') {
        // Send immediately
        const sendResponse = await fetch(`${BACKEND_URL}/api/email/campaigns/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            contact_ids: campaignConfig.selectedContacts
          })
        });

        const sendResult = await sendResponse.json();
        
        if (sendResponse.ok) {
          toast.success(`🎉 Campaign sent to ${sendResult.results.total_sent} recipients!`);
          onComplete && onComplete();
          onClose();
        } else {
          throw new Error(sendResult.detail || 'Failed to send campaign');
        }
      } 
      else if (campaignConfig.sendOption === 'schedule') {
        // Schedule for specific time
        const scheduleResponse = await fetch(`${BACKEND_URL}/api/email/campaigns/schedule`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            contact_ids: campaignConfig.selectedContacts,
            scheduled_time: campaignConfig.scheduleDate.toISOString(),
            timezone: 'America/Chicago'
          })
        });

        const scheduleResult = await scheduleResponse.json();
        
        if (scheduleResponse.ok) {
          toast.success(`📅 Campaign scheduled for ${campaignConfig.scheduleDate.toLocaleString()}!`);
          onComplete && onComplete();
          onClose();
        } else {
          throw new Error(scheduleResult.detail || 'Failed to schedule campaign');
        }
      }
      else if (campaignConfig.sendOption === 'batch') {
        // Batch schedule over time
        const batchResponse = await fetch(`${BACKEND_URL}/api/email/campaigns/schedule/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            campaign_id: campaignId,
            contact_ids: campaignConfig.selectedContacts,
            start_date: campaignConfig.batchSchedule.startDate.toISOString(),
            end_date: campaignConfig.batchSchedule.endDate.toISOString(),
            emails_per_day: campaignConfig.batchSchedule.emailsPerDay
          })
        });

        const batchResult = await batchResponse.json();
        
        if (batchResponse.ok) {
          toast.success(`🔄 Batch campaign scheduled: ${batchResult.queued_count} emails over ${batchResult.days} days!`);
          onComplete && onComplete();
          onClose();
        } else {
          throw new Error(batchResult.detail || 'Failed to schedule batch campaign');
        }
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error(error.message || 'Failed to send campaign');
    } finally {
      setSaving(false);
    }
  };

  // Email builder state
  const [showTemplateNameInput, setShowTemplateNameInput] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const handleSaveTemplate = async () => {
    if (!templateName || !templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    emailEditorRef.current?.editor?.exportHtml(async (data) => {
      const { design, html } = data;
      
      try {
        const { data: templateData, error } = await supabase
          .from('email_templates')
          .insert({
            name: templateName.trim(),
            description: 'Custom email template',
            category: 'custom',
            subject: campaignConfig.subject || 'Email Template',
            html_content: html,
            plain_text_content: '',
            is_default: false,
            design: JSON.stringify(design)
          })
          .select()
          .single();
        
        if (error) throw error;
        
        toast.success(`✅ Template "${templateName}" saved!`);
        setTemplateName('');
        setShowTemplateNameInput(false);
        setEmailDesign(JSON.stringify(design));
        setEmailHTML(html);
      } catch (error) {
        console.error('Error saving template:', error);
        toast.error('Failed to save template');
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#000',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Progress Header */}
      <div style={{
        padding: '20px 32px',
        background: 'rgba(0, 0, 0, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div className="flex items-center gap-8">
          {/* Step 1 */}
          <div className="flex items-center gap-3">
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: currentStep >= 1 ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)',
              color: currentStep >= 1 ? '#000' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '14px'
            }}>
              1
            </div>
            <span style={{ 
              color: currentStep === 1 ? '#00b8d4' : 'var(--text-secondary)', 
              fontSize: '14px',
              fontWeight: currentStep === 1 ? 600 : 400
            }}>
              Build Template
            </span>
          </div>

          <ArrowRight size={20} style={{ color: 'var(--text-secondary)' }} />

          {/* Step 2 */}
          <div className="flex items-center gap-3">
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: currentStep >= 2 ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)',
              color: currentStep >= 2 ? '#000' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '14px'
            }}>
              2
            </div>
            <span style={{ 
              color: currentStep === 2 ? '#00b8d4' : 'var(--text-secondary)', 
              fontSize: '14px',
              fontWeight: currentStep === 2 ? 600 : 400
            }}>
              Preview & Plan
            </span>
          </div>

          <ArrowRight size={20} style={{ color: 'var(--text-secondary)' }} />

          {/* Step 3 */}
          <div className="flex items-center gap-3">
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: currentStep >= 3 ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)',
              color: currentStep >= 3 ? '#000' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '14px'
            }}>
              3
            </div>
            <span style={{ 
              color: currentStep === 3 ? '#00b8d4' : 'var(--text-secondary)', 
              fontSize: '14px',
              fontWeight: currentStep === 3 ? 600 : 400
            }}>
              Review & Send
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Step Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* STEP 1: Build Template */}
        {currentStep === 1 && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div style={{
              padding: '12px 24px',
              background: 'rgba(0, 0, 0, 0.9)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
              zIndex: 100000
            }}>
              {/* Left - Template Name Input */}
              <div style={{ flex: 1, maxWidth: '400px' }}>
                {showTemplateNameInput ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Enter template name..."
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(0, 184, 212, 0.3)',
                        borderRadius: '6px',
                        color: '#FFFFFF',
                        fontSize: '14px'
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveTemplate();
                        }
                      }}
                    />
                    <button
                      onClick={handleSaveTemplate}
                      disabled={!templateName.trim()}
                      style={{
                        padding: '8px 16px',
                        background: !templateName.trim() ? 'rgba(255, 255, 255, 0.05)' : '#00b8d4',
                        color: !templateName.trim() ? 'rgba(255, 255, 255, 0.3)' : '#000',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: !templateName.trim() ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowTemplateNameInput(false);
                        setTemplateName('');
                      }}
                      style={{
                        padding: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTemplateNameInput(true)}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(139, 92, 246, 0.12)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '6px',
                      color: '#8b5cf6',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Save size={14} />
                    Save as Template
                  </button>
                )}
              </div>

              {/* Center - Preview Mode Toggle */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setPreviewMode('desktop')}
                  style={{
                    padding: '8px 14px',
                    background: previewMode === 'desktop' ? 'rgba(0, 184, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${previewMode === 'desktop' ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '6px',
                    color: previewMode === 'desktop' ? '#00b8d4' : 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Monitor size={14} />
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  style={{
                    padding: '8px 14px',
                    background: previewMode === 'mobile' ? 'rgba(0, 184, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${previewMode === 'mobile' ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '6px',
                    color: previewMode === 'mobile' ? '#00b8d4' : 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Smartphone size={14} />
                  Mobile
                </button>
              </div>

              {/* Right - Review and Send Button */}
              <div>
                <button
                  onClick={handleSaveDesign}
                  style={{
                    padding: '10px 20px',
                    background: '#00b8d4',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Review and Send
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Unlayer Editor */}
            <div className="email-editor-iframe" style={{ 
              flex: 1, 
              minHeight: 'calc(100vh - 140px)', 
              height: '100%' 
            }}>
              <EmailEditor
                ref={emailEditorRef}
                onReady={onEditorReady}
                projectId={123456}
                options={{
                  displayMode: previewMode === 'desktop' ? 'email' : 'web',
                  appearance: {
                    theme: 'dark',
                    panels: {
                      tools: {
                        dock: 'left'
                      }
                    }
                  },
                  features: {
                    preview: true,
                    imageEditor: true,
                    undoRedo: true,
                    stockImages: true
                  },
                  mergeTags: {
                    firstName: { name: 'First Name', value: '{{firstName}}', sample: 'John' },
                    lastName: { name: 'Last Name', value: '{{lastName}}', sample: 'Doe' },
                    email: { name: 'Email', value: '{{email}}', sample: 'john@example.com' },
                    company: { name: 'Company', value: '{{company}}', sample: 'Acme Corp' },
                    phone: { name: 'Phone', value: '{{phone}}', sample: '(210) 555-0123' }
                  }
                }}
                minHeight="calc(100vh - 140px)"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Configure & Schedule */}
        {currentStep === 2 && (
          <div style={{ height: '100%', display: 'flex' }}>
            {/* Left Panel - Configuration */}
            <div style={{
              width: '50%',
              padding: '32px',
              overflowY: 'auto',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>
                Configure Campaign
              </h2>

              {/* Campaign Details Card */}
              <div className="glass-surface" style={{ padding: '20px', marginBottom: '20px', borderRadius: '10px' }}>
                <h3 style={{ 
                  color: '#00b8d4', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  marginBottom: '16px'
                }}>
                  Campaign Details
                </h3>

                <div className="mb-4">
                  <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={campaignConfig.name}
                    onChange={(e) => updateConfig('name', e.target.value)}
                    placeholder="Q1 2025 Retail Listings"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div className="mb-4">
                  <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    value={campaignConfig.subject}
                    onChange={(e) => updateConfig('subject', e.target.value)}
                    placeholder="New Retail Opportunities in San Antonio"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                    Preview Text
                  </label>
                  <input
                    type="text"
                    value={campaignConfig.previewText}
                    onChange={(e) => updateConfig('previewText', e.target.value)}
                    placeholder="Shows in email inbox preview..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Audience Card */}
              <div className="glass-surface" style={{ padding: '20px', marginBottom: '20px', borderRadius: '10px' }}>
                <h3 style={{ 
                  color: '#00b8d4', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  marginBottom: '16px'
                }}>
                  Audience
                </h3>

                {/* Recipient Type Options */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => updateConfig('recipientType', 'choose_contacts')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      background: campaignConfig.recipientType === 'choose_contacts' ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${campaignConfig.recipientType === 'choose_contacts' ? 'rgba(0, 184, 212, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '6px',
                      color: campaignConfig.recipientType === 'choose_contacts' ? '#00b8d4' : 'rgba(255, 255, 255, 0.6)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Users size={14} />
                    Choose Contacts
                  </button>
                  <button
                    onClick={() => updateConfig('recipientType', 'tags')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      background: campaignConfig.recipientType === 'tags' ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${campaignConfig.recipientType === 'tags' ? 'rgba(0, 184, 212, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '6px',
                      color: campaignConfig.recipientType === 'tags' ? '#00b8d4' : 'rgba(255, 255, 255, 0.6)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Tag size={14} />
                    Smart Tags
                  </button>
                </div>

                {/* Choose Contacts */}
                {campaignConfig.recipientType === 'choose_contacts' && (
                  <div style={{
                    maxHeight: '280px',
                    overflowY: 'auto',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <div className="flex justify-between mb-3 pb-2" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                        {campaignConfig.selectedContacts.length} of {contacts.length} selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={selectAll}
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(0, 184, 212, 0.1)',
                            border: '1px solid rgba(0, 184, 212, 0.2)',
                            borderRadius: '4px',
                            color: '#00b8d4',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Select All
                        </button>
                        <button
                          onClick={deselectAll}
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '4px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    {contacts.map(contact => (
                      <div
                        key={contact.id}
                        onClick={() => toggleContact(contact.id)}
                        style={{
                          padding: '10px 12px',
                          marginBottom: '4px',
                          background: campaignConfig.selectedContacts.includes(contact.id) ? 'rgba(0, 184, 212, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${campaignConfig.selectedContacts.includes(contact.id) ? 'rgba(0, 184, 212, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {campaignConfig.selectedContacts.includes(contact.id) ? (
                          <CheckSquare size={16} style={{ color: '#00b8d4' }} />
                        ) : (
                          <Square size={16} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 500 }}>
                            {contact.full_name || contact.name}
                          </p>
                          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                            {contact.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Smart Tags Selection */}
                {campaignConfig.recipientType === 'tags' && (
                  <div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '10px' }}>
                      Select tags to target:
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            setCampaignConfig(prev => ({
                              ...prev,
                              selectedTags: prev.selectedTags.includes(tag)
                                ? prev.selectedTags.filter(t => t !== tag)
                                : [...prev.selectedTags, tag],
                              selectedContacts: prev.selectedTags.includes(tag)
                                ? prev.selectedContacts
                                : [...prev.selectedContacts, ...filteredContacts.filter(c => c.tags?.includes(tag)).map(c => c.id)]
                            }));
                          }}
                          style={{
                            padding: '8px 14px',
                            background: campaignConfig.selectedTags.includes(tag) ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            border: `1px solid ${campaignConfig.selectedTags.includes(tag) ? 'rgba(0, 184, 212, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                            borderRadius: '6px',
                            color: campaignConfig.selectedTags.includes(tag) ? '#00b8d4' : 'rgba(255, 255, 255, 0.6)',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Tag size={12} />
                          {tag}
                        </button>
                      ))}
                    </div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                      {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} with selected tag{campaignConfig.selectedTags.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Schedule Card */}
              <div className="glass-surface" style={{ padding: '20px', marginBottom: '20px', borderRadius: '10px' }}>
                <h3 style={{ 
                  color: '#00b8d4', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px',
                  marginBottom: '16px'
                }}>
                  When to Send
                </h3>

                <div className="space-y-2">
                  {/* Send Now */}
                  <button
                    onClick={() => updateConfig('sendOption', 'now')}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: campaignConfig.sendOption === 'now' ? 'rgba(0, 184, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${campaignConfig.sendOption === 'now' ? 'rgba(0, 184, 212, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '8px',
                      color: campaignConfig.sendOption === 'now' ? '#00b8d4' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Zap size={18} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, marginBottom: '2px' }}>Send Now</p>
                      <p style={{ fontSize: '12px', opacity: 0.7 }}>Send immediately to all recipients</p>
                    </div>
                  </button>

                  {/* Schedule */}
                  <button
                    onClick={() => updateConfig('sendOption', 'schedule')}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: campaignConfig.sendOption === 'schedule' ? 'rgba(0, 184, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${campaignConfig.sendOption === 'schedule' ? 'rgba(0, 184, 212, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '8px',
                      color: campaignConfig.sendOption === 'schedule' ? '#00b8d4' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Calendar size={18} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, marginBottom: '2px' }}>Schedule</p>
                      <p style={{ fontSize: '12px', opacity: 0.7 }}>Choose a specific date and time</p>
                    </div>
                  </button>

                  {campaignConfig.sendOption === 'schedule' && (
                    <div className="mt-3 p-4" style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(0, 184, 212, 0.2)',
                      borderRadius: '8px'
                    }}>
                      <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '10px', display: 'block' }}>
                        Select Date & Time *
                      </label>
                      <DatePicker
                        selected={campaignConfig.scheduleDate}
                        onChange={(date) => updateConfig('scheduleDate', date)}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="MM/dd/yyyy h:mm aa"
                        minDate={new Date()}
                        placeholderText="Select date and time"
                        className="datetime-picker-dark"
                      />
                    </div>
                  )}

                  {/* Batch Schedule */}
                  <button
                    onClick={() => updateConfig('sendOption', 'batch')}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: campaignConfig.sendOption === 'batch' ? 'rgba(0, 184, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${campaignConfig.sendOption === 'batch' ? 'rgba(0, 184, 212, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '8px',
                      color: campaignConfig.sendOption === 'batch' ? '#00b8d4' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Clock size={18} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, marginBottom: '2px' }}>Batch Schedule</p>
                      <p style={{ fontSize: '12px', opacity: 0.7 }}>Spread emails over multiple days</p>
                    </div>
                  </button>

                  {campaignConfig.sendOption === 'batch' && (
                    <div className="mt-3 p-4 space-y-3" style={{
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      borderRadius: '8px'
                    }}>
                      <div>
                        <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                          Start Date & Time *
                        </label>
                        <DatePicker
                          selected={campaignConfig.batchSchedule.startDate}
                          onChange={(date) => {
                            setCampaignConfig(prev => ({
                              ...prev,
                              batchSchedule: { ...prev.batchSchedule, startDate: date }
                            }));
                          }}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="MM/dd/yyyy h:mm aa"
                          minDate={new Date()}
                          placeholderText="Select start date and time"
                          className="datetime-picker-dark"
                        />
                      </div>
                      <div>
                        <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                          End Date & Time *
                        </label>
                        <DatePicker
                          selected={campaignConfig.batchSchedule.endDate}
                          onChange={(date) => {
                            setCampaignConfig(prev => ({
                              ...prev,
                              batchSchedule: { ...prev.batchSchedule, endDate: date }
                            }));
                          }}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="MM/dd/yyyy h:mm aa"
                          minDate={campaignConfig.batchSchedule.startDate || new Date()}
                          placeholderText="Select end date and time"
                          className="datetime-picker-dark"
                        />
                      </div>
                      <div>
                        <label style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                          Emails Per Day
                        </label>
                        <input
                          type="number"
                          value={campaignConfig.batchSchedule.emailsPerDay}
                          onChange={(e) => {
                            setCampaignConfig(prev => ({
                              ...prev,
                              batchSchedule: { ...prev.batchSchedule, emailsPerDay: parseInt(e.target.value) || 50 }
                            }));
                          }}
                          min="1"
                          max="500"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: '#FFFFFF',
                            fontSize: '14px'
                          }}
                        />
                        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', marginTop: '6px' }}>
                          Recommended: 50-100 emails/day for best deliverability
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button
                  onClick={() => setCurrentStep(1)}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ArrowLeft size={16} />
                  Back to Design
                </button>
                <button
                  onClick={() => {
                    // Validate scheduling fields
                    if (campaignConfig.sendOption === 'schedule' && !campaignConfig.scheduleDate) {
                      toast.error('Please select a date and time for scheduled send');
                      return;
                    }
                    if (campaignConfig.sendOption === 'batch' && (!campaignConfig.batchSchedule.startDate || !campaignConfig.batchSchedule.endDate)) {
                      toast.error('Please select start and end dates for batch schedule');
                      return;
                    }
                    setCurrentStep(3);
                  }}
                  disabled={!campaignConfig.name || !campaignConfig.subject || campaignConfig.selectedContacts.length === 0}
                  style={{
                    flex: 2,
                    padding: '12px 20px',
                    background: (!campaignConfig.name || !campaignConfig.subject || campaignConfig.selectedContacts.length === 0) 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : '#00b8d4',
                    color: (!campaignConfig.name || !campaignConfig.subject || campaignConfig.selectedContacts.length === 0) 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: (!campaignConfig.name || !campaignConfig.subject || campaignConfig.selectedContacts.length === 0) 
                      ? 'not-allowed' 
                      : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  Review and Send
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Right Panel - Email Preview */}
            <div style={{
              width: '50%',
              padding: '32px',
              background: 'rgba(0, 0, 0, 0.4)',
              overflowY: 'auto'
            }}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600 }}>
                  Email Preview
                </h3>
                <div className="flex items-center gap-2">
                  <Eye size={16} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                  <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                    Live Preview
                  </span>
                </div>
              </div>
              
              <div style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '24px',
                minHeight: '600px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}>
                <div dangerouslySetInnerHTML={{ __html: emailHTML || '<p style="color: #999; text-align: center; padding: 40px;">Design your email to see preview</p>' }} />
              </div>
            </div>
          </div>
        )}
          <div style={{ height: '100%', display: 'flex' }}>
            {/* Left Panel - Configuration */}
            <div style={{
              width: '50%',
              padding: '32px',
              overflowY: 'auto',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>
                Configure Campaign
              </h2>

              {/* Campaign Name */}
              <div className="mb-6">
                <label style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignConfig.name}
                  onChange={(e) => setCampaignConfig({ ...campaignConfig, name: e.target.value })}
                  placeholder="Q1 2025 Retail Listings"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Sender Email */}
              <div className="mb-6">
                <label style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  Sender Email *
                </label>
                <input
                  type="email"
                  value={campaignConfig.senderEmail}
                  onChange={(e) => setCampaignConfig({ ...campaignConfig, senderEmail: e.target.value })}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    cursor: 'not-allowed'
                  }}
                />
                <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>
                  From SendGrid settings
                </p>
              </div>

              {/* Sender Name */}
              <div className="mb-6">
                <label style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  Sender Name *
                </label>
                <input
                  type="text"
                  value={campaignConfig.senderName}
                  onChange={(e) => setCampaignConfig({ ...campaignConfig, senderName: e.target.value })}
                  placeholder="Your Name or Company"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Subject Line */}
              <div className="mb-6">
                <label style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  Subject Line *
                </label>
                <input
                  type="text"
                  value={campaignConfig.subject}
                  onChange={(e) => setCampaignConfig({ ...campaignConfig, subject: e.target.value })}
                  placeholder="New Retail Opportunities in San Antonio"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Preview Text */}
              <div className="mb-6">
                <label style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  Preview Text
                </label>
                <input
                  type="text"
                  value={campaignConfig.previewText}
                  onChange={(e) => setCampaignConfig({ ...campaignConfig, previewText: e.target.value })}
                  placeholder="Shows in email inbox preview..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '24px 0' }}></div>

              {/* Recipient Selection */}
              <div className="mb-6">
                <label style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '10px', display: 'block', fontWeight: 600 }}>
                  Recipient (To) *
                </label>

                {/* Recipient Type Options */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => updateConfig('recipientType', 'choose_contacts')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      background: campaignConfig.recipientType === 'choose_contacts' ? 'rgba(0, 184, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${campaignConfig.recipientType === 'choose_contacts' ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '6px',
                      color: campaignConfig.recipientType === 'choose_contacts' ? '#00b8d4' : 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Users size={14} />
                    Choose Contacts
                  </button>
                  <button
                    onClick={() => updateConfig('recipientType', 'tags')}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      background: campaignConfig.recipientType === 'tags' ? 'rgba(0, 184, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${campaignConfig.recipientType === 'tags' ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '6px',
                      color: campaignConfig.recipientType === 'tags' ? '#00b8d4' : 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Tag size={14} />
                    Smart Tags
                  </button>
                </div>

                {/* Choose Contacts */}
                {campaignConfig.recipientType === 'choose_contacts' && (
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <div className="flex justify-between mb-3">
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {campaignConfig.selectedContacts.length} of {contacts.length} selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={selectAll}
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(0, 184, 212, 0.1)',
                            border: '1px solid rgba(0, 184, 212, 0.3)',
                            borderRadius: '4px',
                            color: '#00b8d4',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Select All
                        </button>
                        <button
                          onClick={deselectAll}
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '4px',
                            color: 'var(--text-secondary)',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    {contacts.map(contact => (
                      <div
                        key={contact.id}
                        onClick={() => toggleContact(contact.id)}
                        style={{
                          padding: '10px 12px',
                          marginBottom: '6px',
                          background: campaignConfig.selectedContacts.includes(contact.id) ? 'rgba(0, 184, 212, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${campaignConfig.selectedContacts.includes(contact.id) ? 'rgba(0, 184, 212, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        {campaignConfig.selectedContacts.includes(contact.id) ? (
                          <CheckSquare size={16} style={{ color: '#00b8d4' }} />
                        ) : (
                          <Square size={16} style={{ color: 'var(--text-secondary)' }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>
                            {contact.full_name || contact.name}
                          </p>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                            {contact.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Smart Tags Selection */}
                {campaignConfig.recipientType === 'tags' && (
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '10px' }}>
                      Select tags to target:
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            setCampaignConfig(prev => ({
                              ...prev,
                              selectedTags: prev.selectedTags.includes(tag)
                                ? prev.selectedTags.filter(t => t !== tag)
                                : [...prev.selectedTags, tag]
                            }));
                          }}
                          style={{
                            padding: '8px 14px',
                            background: campaignConfig.selectedTags.includes(tag) ? 'rgba(0, 184, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${campaignConfig.selectedTags.includes(tag) ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: '6px',
                            color: campaignConfig.selectedTags.includes(tag) ? '#00b8d4' : 'var(--text-secondary)',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Tag size={12} />
                          {tag}
                        </button>
                      ))}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} with selected tag{campaignConfig.selectedTags.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '24px 0' }}></div>

              {/* Send Options */}
              <div className="mb-6">
                <label style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '10px', display: 'block', fontWeight: 600 }}>
                  When to Send
                </label>
                <div className="space-y-2">
                  {/* Send Now */}
                  <button
                    onClick={() => updateConfig('sendOption', 'now')}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: campaignConfig.sendOption === 'now' ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${campaignConfig.sendOption === 'now' ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '6px',
                      color: campaignConfig.sendOption === 'now' ? '#00b8d4' : 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'left'
                    }}
                  >
                    <Zap size={18} />
                    <div>
                      <p style={{ fontWeight: 600 }}>Send Now</p>
                      <p style={{ fontSize: '12px', opacity: 0.7 }}>Send immediately to all recipients</p>
                    </div>
                  </button>

                  {/* Schedule */}
                  <button
                    onClick={() => updateConfig('sendOption', 'schedule')}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: campaignConfig.sendOption === 'schedule' ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${campaignConfig.sendOption === 'schedule' ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '6px',
                      color: campaignConfig.sendOption === 'schedule' ? '#00b8d4' : 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'left'
                    }}
                  >
                    <Calendar size={18} />
                    <div>
                      <p style={{ fontWeight: 600 }}>Schedule</p>
                      <p style={{ fontSize: '12px', opacity: 0.7 }}>Choose a specific date and time</p>
                    </div>
                  </button>

                  {campaignConfig.sendOption === 'schedule' && (
                    <div className="mt-3 p-4" style={{
                      background: 'rgba(0, 184, 212, 0.05)',
                      border: '1px solid rgba(0, 184, 212, 0.2)',
                      borderRadius: '6px'
                    }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                        Select Date & Time
                      </label>
                      <DatePicker
                        selected={campaignConfig.scheduleDate}
                        onChange={(date) => setCampaignConfig({ ...campaignConfig, scheduleDate: date })}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="MM/dd/yyyy h:mm aa"
                        minDate={new Date()}
                        placeholderText="Select date and time"
                        className="datetime-picker-dark"
                      />
                    </div>
                  )}

                  {/* Batch Schedule */}
                  <button
                    onClick={() => updateConfig('sendOption', 'batch')}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: campaignConfig.sendOption === 'batch' ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${campaignConfig.sendOption === 'batch' ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '6px',
                      color: campaignConfig.sendOption === 'batch' ? '#00b8d4' : 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'left'
                    }}
                  >
                    <Clock size={18} />
                    <div>
                      <p style={{ fontWeight: 600 }}>Batch Schedule</p>
                      <p style={{ fontSize: '12px', opacity: 0.7 }}>Spread emails over multiple days</p>
                    </div>
                  </button>

                  {campaignConfig.sendOption === 'batch' && (
                    <div className="mt-3 p-4" style={{
                      background: 'rgba(139, 92, 246, 0.05)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      borderRadius: '6px'
                    }}>
                      <div className="mb-3">
                        <label style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px', display: 'block' }}>
                          Start Date
                        </label>
                        <DatePicker
                          selected={campaignConfig.batchSchedule.startDate}
                          onChange={(date) => {
                            setCampaignConfig(prev => ({
                              ...prev,
                              batchSchedule: { ...prev.batchSchedule, startDate: date }
                            }));
                          }}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="MM/dd/yyyy h:mm aa"
                          minDate={new Date()}
                          placeholderText="Select start date and time"
                          className="datetime-picker-dark"
                        />
                      </div>
                      <div className="mb-3">
                        <label style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px', display: 'block' }}>
                          End Date
                        </label>
                        <DatePicker
                          selected={campaignConfig.batchSchedule.endDate}
                          onChange={(date) => {
                            setCampaignConfig(prev => ({
                              ...prev,
                              batchSchedule: { ...prev.batchSchedule, endDate: date }
                            }));
                          }}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="MM/dd/yyyy h:mm aa"
                          minDate={campaignConfig.batchSchedule.startDate || new Date()}
                          placeholderText="Select end date and time"
                          className="datetime-picker-dark"
                        />
                      </div>
                      <div>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px', display: 'block' }}>
                          Emails Per Day
                        </label>
                        <input
                          type="number"
                          value={campaignConfig.batchSchedule.emailsPerDay}
                          onChange={(e) => {
                            setCampaignConfig(prev => ({
                              ...prev,
                              batchSchedule: { ...prev.batchSchedule, emailsPerDay: parseInt(e.target.value) || 50 }
                            }));
                          }}
                          min="1"
                          max="500"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                            fontSize: '14px'
                          }}
                        />
                        <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px' }}>
                          Recommended: 50-100 emails/day for best deliverability
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '32px' }}>
                <button
                  onClick={() => setCurrentStep(1)}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <ArrowLeft size={16} />
                  Back to Design
                </button>
                <button
                  onClick={() => {
                    // Validate scheduling fields
                    if (campaignConfig.sendOption === 'schedule' && !campaignConfig.scheduleDate) {
                      toast.error('Please select a date and time for scheduled send');
                      return;
                    }
                    if (campaignConfig.sendOption === 'batch' && (!campaignConfig.batchSchedule.startDate || !campaignConfig.batchSchedule.endDate)) {
                      toast.error('Please select start and end dates for batch schedule');
                      return;
                    }
                    setCurrentStep(3);
                  }}
                  disabled={!campaignConfig.name || !campaignConfig.subject || campaignConfig.selectedContacts.length === 0}
                  style={{
                    flex: 2,
                    padding: '12px 20px',
                    background: (!campaignConfig.name || !campaignConfig.subject || campaignConfig.selectedContacts.length === 0) 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : '#00b8d4',
                    color: (!campaignConfig.name || !campaignConfig.subject || campaignConfig.selectedContacts.length === 0) 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : '#000',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: (!campaignConfig.name || !campaignConfig.subject || campaignConfig.selectedContacts.length === 0) 
                      ? 'not-allowed' 
                      : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  Review and Send
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Right Panel - Email Preview */}
            <div style={{
              width: '50%',
              padding: '32px',
              background: 'rgba(0, 0, 0, 0.5)',
              overflowY: 'auto'
            }}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600 }}>
                  Email Preview
                </h3>
                <div className="flex items-center gap-2">
                  <Eye size={16} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Live Preview
                  </span>
                </div>
              </div>
              
              <div style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '24px',
                minHeight: '600px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}>
                <div dangerouslySetInnerHTML={{ __html: emailHTML || '<p style="color: #999; text-align: center; padding: 40px;">Design your email to see preview</p>' }} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Send */}
        {currentStep === 3 && (
          <div style={{ height: '100%', display: 'flex' }}>
            {/* Left Panel - Email Preview */}
            <div style={{
              width: '60%',
              padding: '32px',
              background: 'rgba(0, 0, 0, 0.5)',
              overflowY: 'auto'
            }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>
                Final Review
              </h2>
              <div style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '32px',
                minHeight: '700px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{ borderBottom: '2px solid #00b8d4', paddingBottom: '12px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>SUBJECT</p>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: '#000' }}>
                    {campaignConfig.subject}
                  </p>
                </div>
                <div dangerouslySetInnerHTML={{ __html: emailHTML }} />
              </div>
            </div>

            {/* Right Panel - Campaign Summary */}
            <div style={{
              width: '40%',
              padding: '32px',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              overflowY: 'auto'
            }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>
                Campaign Summary
              </h2>

              {/* Campaign Info */}
              <div className="glass-surface p-5 rounded-xl mb-6">
                <div className="mb-4">
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                    Campaign Name
                  </p>
                  <p style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600 }}>
                    {campaignConfig.name}
                  </p>
                </div>
                <div className="mb-4">
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                    From
                  </p>
                  <p style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                    {campaignConfig.senderName} &lt;{campaignConfig.senderEmail}&gt;
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                    Subject
                  </p>
                  <p style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                    {campaignConfig.subject}
                  </p>
                </div>
              </div>

              {/* Recipients */}
              <div className="glass-surface p-5 rounded-xl mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Recipients
                  </p>
                  <p style={{ color: '#00b8d4', fontSize: '24px', fontWeight: 700 }}>
                    {campaignConfig.selectedContacts.length}
                  </p>
                </div>
                {campaignConfig.recipientType === 'tags' && campaignConfig.selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {campaignConfig.selectedTags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(0, 184, 212, 0.15)',
                          border: '1px solid rgba(0, 184, 212, 0.3)',
                          borderRadius: '4px',
                          color: '#00b8d4',
                          fontSize: '12px'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Send Option */}
              <div className="glass-surface p-5 rounded-xl mb-6">
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px' }}>
                  Send Option
                </p>
                {campaignConfig.sendOption === 'now' && (
                  <p style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600 }}>
                    ⚡ Send Now
                  </p>
                )}
                {campaignConfig.sendOption === 'schedule' && (
                  <div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
                      📅 Scheduled Send
                    </p>
                    {campaignConfig.scheduleDate && (
                      <p style={{ color: '#00b8d4', fontSize: '13px' }}>
                        {campaignConfig.scheduleDate.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </p>
                    )}
                  </div>
                )}
                {campaignConfig.sendOption === 'batch' && (
                  <div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
                      🔄 Batch Schedule
                    </p>
                    {campaignConfig.batchSchedule.startDate && campaignConfig.batchSchedule.endDate && (
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <p style={{ marginBottom: '4px' }}>
                          {campaignConfig.batchSchedule.startDate.toLocaleDateString()} - {campaignConfig.batchSchedule.endDate.toLocaleDateString()}
                        </p>
                        <p style={{ color: '#8b5cf6' }}>
                          {campaignConfig.batchSchedule.emailsPerDay} emails/day
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={handleFinalSend}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: saving ? 'rgba(255, 255, 255, 0.05)' : '#00b8d4',
                    color: saving ? 'rgba(255, 255, 255, 0.3)' : '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Send Campaign
                    </>
                  )}
                </button>
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <ArrowLeft size={16} />
                  Back to Configure
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignWizard;
