import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../App';
import { supabase } from '../supabaseClient';
import { 
  Mail, Plus, Send, Users, BarChart3, Settings, CheckCircle2,
  Eye, Edit3, Trash2, Play, Pause, Calendar, TrendingUp, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const Campaigns = () => {
  const { user } = useContext(AuthContext);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [token, setToken] = useState(null);

  // State management
  const [emailSettingsConfigured, setEmailSettingsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [currentView, setCurrentView] = useState('list'); // 'list', 'setup', 'create', 'details'
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Setup wizard state
  const [setupStep, setSetupStep] = useState(1);
  const [setupData, setSetupData] = useState({
    apiKey: '',
    senderEmail: '',
    senderName: '',
    testing: false
  });

  // Campaign creation state
  const [campaignData, setCampaignData] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    plainTextContent: ''
  });

  const editorRef = useRef(null);

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

  // Check if email settings are configured
  useEffect(() => {
    if (token) {
      checkEmailSettings();
      if (emailSettingsConfigured) {
        fetchCampaigns();
      }
    }
  }, [token, emailSettingsConfigured]);

  const checkEmailSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setEmailSettingsConfigured(data.configured);
      setLoading(false);
    } catch (error) {
      console.error('Error checking email settings:', error);
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/campaigns?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    }
  };

  const testSendGridConnection = async () => {
    if (!setupData.apiKey) {
      toast.error('Please enter your SendGrid API key');
      return;
    }

    setSetupData({ ...setupData, testing: true });

    try {
      const response = await fetch(`${BACKEND_URL}/api/email/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: setupData.apiKey })
      });

      const result = await response.json();

      if (result.valid) {
        toast.success('✅ SendGrid connection successful!');
        setSetupStep(2);
      } else {
        toast.error(result.message || 'Invalid API key');
      }
    } catch (error) {
      toast.error('Connection test failed');
    } finally {
      setSetupData({ ...setupData, testing: false });
    }
  };

  const saveEmailSettings = async () => {
    if (!setupData.senderEmail || !setupData.senderName) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/email/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sendgrid_api_key: setupData.apiKey,
          sender_email: setupData.senderEmail,
          sender_name: setupData.senderName
        })
      });

      if (response.ok) {
        toast.success('🎉 Email setup complete!');
        setEmailSettingsConfigured(true);
        setCurrentView('list');
        setSetupStep(1);
        setSetupData({ apiKey: '', senderEmail: '', senderName: '', testing: false });
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const createCampaign = async () => {
    if (!campaignData.name || !campaignData.subject || !campaignData.htmlContent) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/email/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(campaignData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Campaign created successfully!');
        setCampaignData({ name: '', subject: '', htmlContent: '', plainTextContent: '' });
        setCurrentView('list');
        fetchCampaigns();
      } else {
        toast.error('Failed to create campaign');
      }
    } catch (error) {
      toast.error('Failed to create campaign');
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Render setup wizard if not configured
  if (!emailSettingsConfigured || currentView === 'setup') {
    return (
      <div className="h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg-base)' }}>
        <div className="glass-surface p-10 max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(0, 184, 212, 0.1)',
                border: '2px solid rgba(0, 184, 212, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Mail size={40} style={{ color: '#00b8d4' }} />
              </div>
            </div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: 600, marginBottom: '12px' }}>
              Email Campaigns Setup
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              Connect your SendGrid account to start sending campaigns
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center mb-10">
            <div className="flex items-center gap-4">
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: setupStep >= 1 ? 'rgba(0, 184, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: setupStep >= 1 ? '2px solid #00b8d4' : '2px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: setupStep >= 1 ? '#00b8d4' : 'var(--text-secondary)',
                fontWeight: 600
              }}>
                1
              </div>
              <div style={{
                width: '60px',
                height: '2px',
                background: setupStep >= 2 ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)'
              }} />
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: setupStep >= 2 ? 'rgba(0, 184, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: setupStep >= 2 ? '2px solid #00b8d4' : '2px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: setupStep >= 2 ? '#00b8d4' : 'var(--text-secondary)',
                fontWeight: 600
              }}>
                2
              </div>
            </div>
          </div>

          {/* Step 1: API Key */}
          {setupStep === 1 && (
            <div>
              <div className="mb-6 p-4" style={{
                background: 'rgba(0, 184, 212, 0.05)',
                border: '1px solid rgba(0, 184, 212, 0.2)',
                borderRadius: '8px'
              }}>
                <p style={{ color: '#00b8d4', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                  📝 Quick Setup (2 minutes)
                </p>
                <ol style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
                  <li>Click the button below to open SendGrid API Keys page</li>
                  <li>Click the blue "Create API Key" button (top right)</li>
                  <li>Name it: <strong style={{ color: 'var(--text-primary)' }}>DealView CRM</strong></li>
                  <li>Permissions: Select <strong style={{ color: 'var(--text-primary)' }}>"Full Access"</strong></li>
                  <li>Click "Create & View"</li>
                  <li>Copy the key (starts with SG.) and paste below</li>
                </ol>
              </div>

              <a
                href="https://app.sendgrid.com/settings/api_keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 24px',
                  marginBottom: '20px',
                  background: 'rgba(0, 184, 212, 0.1)',
                  border: '1px solid rgba(0, 184, 212, 0.3)',
                  borderRadius: '8px',
                  color: '#00b8d4',
                  fontSize: '15px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  cursor: 'pointer',
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
                <Settings size={18} />
                Open SendGrid API Keys Page
              </a>

              <div className="mb-6">
                <label style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                  Paste Your SendGrid API Key *
                </label>
                <input
                  type="password"
                  value={setupData.apiKey}
                  onChange={(e) => setSetupData({ ...setupData, apiKey: e.target.value })}
                  placeholder="SG.xxxxxxxxxxxx"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '15px'
                  }}
                />
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>
                  The key should start with "SG." - make sure you copy the entire key!
                </p>
              </div>

              <div className="mb-6 p-4" style={{
                background: 'rgba(34, 197, 94, 0.05)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '8px'
              }}>
                <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                  ✓ 100 free emails/day with SendGrid
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  SendGrid's free tier includes 100 emails per day forever - perfect for most CRE professionals. No credit card required!
                </p>
              </div>

              <button
                onClick={testSendGridConnection}
                disabled={setupData.testing || !setupData.apiKey}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: setupData.testing || !setupData.apiKey ? 'rgba(255, 255, 255, 0.05)' : '#00b8d4',
                  color: setupData.testing || !setupData.apiKey ? 'rgba(255, 255, 255, 0.3)' : '#000',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: setupData.testing || !setupData.apiKey ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {setupData.testing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {setupData.testing ? 'Testing Connection...' : 'Test & Continue'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <a
                  href="https://sendgrid.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#00b8d4',
                    fontSize: '14px',
                    textDecoration: 'none',
                    display: 'inline-block'
                  }}
                >
                  Don't have a SendGrid account? Sign up free →
                </a>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '8px' }}>
                  No credit card required
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Sender Info */}
          {setupStep === 2 && (
            <div>
              <div className="mb-6">
                <label style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                  Sender Email *
                </label>
                <input
                  type="email"
                  value={setupData.senderEmail}
                  onChange={(e) => setSetupData({ ...setupData, senderEmail: e.target.value })}
                  placeholder="you@yourcompany.com"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '15px'
                  }}
                />
              </div>

              <div className="mb-6">
                <label style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                  Sender Name *
                </label>
                <input
                  type="text"
                  value={setupData.senderName}
                  onChange={(e) => setSetupData({ ...setupData, senderName: e.target.value })}
                  placeholder="Your Name or Company"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '15px'
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSetupStep(1)}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Back
                </button>
                <button
                  onClick={saveEmailSettings}
                  disabled={!setupData.senderEmail || !setupData.senderName}
                  style={{
                    flex: 2,
                    padding: '14px 24px',
                    background: !setupData.senderEmail || !setupData.senderName ? 'rgba(255, 255, 255, 0.05)' : '#00b8d4',
                    color: !setupData.senderEmail || !setupData.senderName ? 'rgba(255, 255, 255, 0.3)' : '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: !setupData.senderEmail || !setupData.senderName ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <CheckCircle2 size={18} />
                  Complete Setup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render campaigns list
  if (currentView === 'list') {
    return (
      <div className="h-screen flex flex-col" style={{ background: 'var(--bg-base)', padding: '32px' }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '32px', fontWeight: 600, marginBottom: '8px' }}>
              Email Campaigns
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              Create and send email campaigns to your contacts
            </p>
          </div>
          <button
            onClick={() => setCurrentView('create')}
            style={{
              padding: '12px 24px',
              background: '#00b8d4',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={18} />
            Create Campaign
          </button>
        </div>

        {/* Campaigns Grid */}
        {campaigns.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Mail size={64} style={{ color: 'rgba(255, 255, 255, 0.1)', margin: '0 auto 24px' }} />
              <h3 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
                No campaigns yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '24px' }}>
                Create your first email campaign to get started
              </p>
              <button
                onClick={() => setCurrentView('create')}
                style={{
                  padding: '12px 24px',
                  background: '#00b8d4',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Create Your First Campaign
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="glass-surface p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                      {campaign.name}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {campaign.subject}
                    </p>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    background: campaign.status === 'sent' ? 'rgba(0, 200, 100, 0.1)' : 'rgba(255, 200, 0, 0.1)',
                    border: campaign.status === 'sent' ? '1px solid rgba(0, 200, 100, 0.3)' : '1px solid rgba(255, 200, 0, 0.3)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: campaign.status === 'sent' ? '#00c864' : '#ffc800',
                    fontWeight: 600
                  }}>
                    {campaign.status}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                      Sent
                    </p>
                    <p style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600 }}>
                      {campaign.total_sent || 0}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                      Opened
                    </p>
                    <p style={{ color: '#00c864', fontSize: '20px', fontWeight: 600 }}>
                      {campaign.total_opened || 0}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                      Clicked
                    </p>
                    <p style={{ color: '#00b8d4', fontSize: '20px', fontWeight: 600 }}>
                      {campaign.total_clicked || 0}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCampaign(campaign);
                      setCurrentView('details');
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Eye size={14} />
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render campaign creation form
  if (currentView === 'create') {
    return (
      <div className="h-screen flex flex-col" style={{ background: 'var(--bg-base)', padding: '32px' }}>
        <div className="flex justify-between items-center mb-8">
          <h1 style={{ color: 'var(--text-primary)', fontSize: '32px', fontWeight: 600 }}>
            Create Campaign
          </h1>
          <button
            onClick={() => setCurrentView('list')}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="glass-surface p-8">
            <div className="mb-6">
              <label style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                Campaign Name *
              </label>
              <input
                type="text"
                value={campaignData.name}
                onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                placeholder="Q1 Retail Listings"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '15px'
                }}
              />
            </div>

            <div className="mb-6">
              <label style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                Subject Line *
              </label>
              <input
                type="text"
                value={campaignData.subject}
                onChange={(e) => setCampaignData({ ...campaignData, subject: e.target.value })}
                placeholder="New Retail Opportunities in San Antonio"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '15px'
                }}
              />
            </div>

            <div className="mb-6">
              <label style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                Email Content *
              </label>
              <textarea
                ref={editorRef}
                value={campaignData.htmlContent}
                onChange={(e) => setCampaignData({ ...campaignData, htmlContent: e.target.value })}
                placeholder="Write your email content here..."
                rows={15}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
                You can use HTML or plain text. Merge fields: {"{{firstName}}"}, {"{{company}}"}, {"{{email}}"}
              </p>
            </div>

            <button
              onClick={createCampaign}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: '#00b8d4',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={18} />
              Create Campaign
            </button>
          </div>

          {/* Preview */}
          <div className="glass-surface p-8">
            <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
              Preview
            </h3>
            <div style={{
              padding: '24px',
              background: '#fff',
              borderRadius: '8px',
              minHeight: '400px',
              color: '#333'
            }}>
              <div style={{ borderBottom: '2px solid #00b8d4', paddingBottom: '12px', marginBottom: '20px' }}>
                <strong>{campaignData.subject || 'Subject Line'}</strong>
              </div>
              <div dangerouslySetInnerHTML={{ __html: campaignData.htmlContent || '<p style="color: #999;">Your email content will appear here...</p>' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Campaigns;
