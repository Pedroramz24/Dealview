import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { supabase } from '../supabaseClient';
import CampaignWizard from '../components/CampaignWizard';
import CampaignAnalyticsSummary from '../components/CampaignAnalyticsSummary';
import { 
  Mail, Plus, Send, Eye, Settings, CheckCircle2, Clock,
  Search, Filter, X, TrendingUp, MousePointerClick, AlertTriangle,
  Calendar, Tag, Users, BarChart3, Zap
} from 'lucide-react';
import { toast } from 'sonner';

const CampaignsNew = () => {
  const { user } = useContext(AuthContext);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [token, setToken] = useState(null);

  // State
  const [emailSettingsConfigured, setEmailSettingsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  // Setup wizard state
  const [setupStep, setSetupStep] = useState(1);
  const [setupData, setSetupData] = useState({
    apiKey: '',
    senderEmail: '',
    senderName: '',
    testing: false
  });

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

  // Check email settings and fetch campaigns
  useEffect(() => {
    if (token) {
      checkEmailSettings();
    }
  }, [token]);

  useEffect(() => {
    if (emailSettingsConfigured && token) {
      fetchCampaigns();
    }
  }, [emailSettingsConfigured, token]);

  // Filter campaigns
  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchTerm, statusFilter, tagFilter]);

  const checkEmailSettings = async () => {
    if (!token) return;
    
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
    if (!token) return;
    
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

  const filterCampaigns = () => {
    let filtered = [...campaigns];

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subject?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (tagFilter !== 'all') {
      filtered = filtered.filter(c => 
        c.segment_filters?.tags?.includes(tagFilter)
      );
    }

    setFilteredCampaigns(filtered);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' };
      case 'scheduled': return { bg: 'rgba(0, 184, 212, 0.1)', border: 'rgba(0, 184, 212, 0.3)', text: '#00b8d4' };
      case 'sending': return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' };
      case 'draft': return { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)', text: '#64748b' };
      case 'paused': return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444' };
      default: return { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', text: 'var(--text-secondary)' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getAllTags = () => {
    const tags = new Set();
    campaigns.forEach(c => {
      if (c.segment_filters?.tags) {
        c.segment_filters.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Setup wizard
  if (!emailSettingsConfigured) {
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

          {/* Setup steps remain unchanged - they're already good */}
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
                  <li>Click the button below to open SendGrid</li>
                  <li>Click "Create API Key"</li>
                  <li>Name it: <strong style={{ color: 'var(--text-primary)' }}>DealView CRM</strong></li>
                  <li>Permissions: Select <strong style={{ color: 'var(--text-primary)' }}>"Full Access"</strong></li>
                  <li>Click "Create & View"</li>
                  <li>Copy the key and paste below</li>
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
                  cursor: 'pointer'
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
                {setupData.testing ? 'Testing...' : 'Test & Continue'}
              </button>
            </div>
          )}

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

  // Main campaigns view with table
  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-base)', padding: '32px' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '32px', fontWeight: 600, marginBottom: '8px' }}>
            Email Campaigns
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Create and send email campaigns to your contacts
          </p>
        </div>
        <button
          onClick={() => setShowCampaignWizard(true)}
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

      {/* Analytics Summary */}
      <CampaignAnalyticsSummary campaigns={campaigns} />

      {/* Search & Filters */}
      <div className="flex gap-3 mb-6">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ 
            position: 'absolute', 
            left: '14px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: 'var(--text-secondary)' 
          }} />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 44px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="sending">Sending</option>
          <option value="sent">Sent</option>
          <option value="paused">Paused</option>
        </select>

        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          style={{
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Tags</option>
          {getAllTags().map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      {/* Campaigns Table */}
      {filteredCampaigns.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Mail size={64} style={{ color: 'rgba(255, 255, 255, 0.1)', margin: '0 auto 24px' }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
              {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns match filters'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '24px' }}>
              {campaigns.length === 0 ? 'Create your first email campaign to get started' : 'Try adjusting your filters'}
            </p>
            {campaigns.length === 0 && (
              <button
                onClick={() => setShowCampaignWizard(true)}
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
            )}
          </div>
        </div>
      ) : (
        <div className="glass-surface" style={{ 
          borderRadius: '12px', 
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.5fr 0.8fr 2fr 1fr',
            padding: '16px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Campaign
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Audience
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Status
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Health
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>
              Last Updated
            </p>
          </div>

          {/* Table Rows */}
          {filteredCampaigns.map((campaign) => {
            const statusStyle = getStatusColor(campaign.status);
            const deliveredRate = campaign.total_sent > 0 ? (campaign.total_delivered / campaign.total_sent) * 100 : 0;
            const openRate = campaign.total_delivered > 0 ? (campaign.total_opened / campaign.total_delivered) * 100 : 0;
            const clickRate = campaign.total_opened > 0 ? (campaign.total_clicked / campaign.total_opened) * 100 : 0;
            const bounceRate = campaign.total_sent > 0 ? (campaign.total_bounced / campaign.total_sent) * 100 : 0;

            return (
              <div
                key={campaign.id}
                onClick={() => {
                  setSelectedCampaign(campaign);
                  setShowAnalyticsPanel(true);
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 0.8fr 2fr 1fr',
                  padding: '18px 20px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Campaign Name & Subject */}
                <div>
                  <p style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                    {campaign.name}
                  </p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>
                    {campaign.subject}
                  </p>
                </div>

                {/* Audience */}
                <div>
                  <p style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>
                    {campaign.total_recipients || 0} contact{campaign.total_recipients !== 1 ? 's' : ''}
                  </p>
                  {campaign.segment_filters?.tags && campaign.segment_filters.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {campaign.segment_filters.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          style={{
                            padding: '3px 8px',
                            background: 'rgba(0, 184, 212, 0.15)',
                            border: '1px solid rgba(0, 184, 212, 0.3)',
                            borderRadius: '4px',
                            color: '#00b8d4',
                            fontSize: '11px',
                            fontWeight: 500
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {campaign.segment_filters.tags.length > 2 && (
                        <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px' }}>
                          +{campaign.segment_filters.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span style={{
                    padding: '6px 12px',
                    background: statusStyle.bg,
                    border: `1px solid ${statusStyle.border}`,
                    borderRadius: '6px',
                    color: statusStyle.text,
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    display: 'inline-block'
                  }}>
                    {campaign.status}
                  </span>
                </div>

                {/* Health Strip */}
                <div className="flex items-center gap-3">
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 size={12} style={{ color: '#22c55e' }} />
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>
                        {deliveredRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Eye size={12} style={{ color: '#8b5cf6' }} />
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>
                        {openRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MousePointerClick size={12} style={{ color: '#f59e0b' }} />
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>
                        {clickRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={12} style={{ color: '#ef4444' }} />
                      <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>
                        {bounceRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Last Updated */}
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                    {formatDate(campaign.updated_at || campaign.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Campaign Analytics Side Panel */}
      {showAnalyticsPanel && selectedCampaign && (
        <div 
          className="fixed inset-0 z-50 flex justify-end"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowAnalyticsPanel(false)}
        >
          <div
            className="w-full md:w-[700px] h-full glass-surface overflow-y-auto"
            style={{
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '-10px 0 50px rgba(0, 0, 0, 0.5)',
              background: 'linear-gradient(135deg, rgba(11, 12, 14, 0.95) 0%, rgba(26, 26, 26, 0.95) 100%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div style={{ 
              padding: '24px', 
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              position: 'sticky',
              top: 0,
              background: 'rgba(11, 12, 14, 0.98)',
              backdropFilter: 'blur(12px)',
              zIndex: 10
            }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 600, marginBottom: '6px' }}>
                    {selectedCampaign.name}
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                    {selectedCampaign.subject}
                  </p>
                </div>
                <button
                  onClick={() => setShowAnalyticsPanel(false)}
                  style={{
                    padding: '8px',
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

              {/* Status */}
              <span style={{
                padding: '6px 14px',
                background: getStatusColor(selectedCampaign.status).bg,
                border: `1px solid ${getStatusColor(selectedCampaign.status).border}`,
                borderRadius: '6px',
                color: getStatusColor(selectedCampaign.status).text,
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'capitalize',
                display: 'inline-block'
              }}>
                {selectedCampaign.status}
              </span>
            </div>

            {/* Panel Content */}
            <div style={{ padding: '24px' }}>
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="glass-surface" style={{ padding: '16px', borderRadius: '10px' }}>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Total Sent
                  </p>
                  <p style={{ color: '#00b8d4', fontSize: '28px', fontWeight: 700 }}>
                    {selectedCampaign.total_sent || 0}
                  </p>
                </div>
                <div className="glass-surface" style={{ padding: '16px', borderRadius: '10px' }}>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Opened
                  </p>
                  <p style={{ color: '#8b5cf6', fontSize: '28px', fontWeight: 700 }}>
                    {selectedCampaign.total_opened || 0}
                  </p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '4px' }}>
                    {selectedCampaign.total_sent > 0 
                      ? ((selectedCampaign.total_opened / selectedCampaign.total_sent) * 100).toFixed(1) 
                      : '0'}%
                  </p>
                </div>
                <div className="glass-surface" style={{ padding: '16px', borderRadius: '10px' }}>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Clicked
                  </p>
                  <p style={{ color: '#f59e0b', fontSize: '28px', fontWeight: 700 }}>
                    {selectedCampaign.total_clicked || 0}
                  </p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginTop: '4px' }}>
                    {selectedCampaign.total_opened > 0 
                      ? ((selectedCampaign.total_clicked / selectedCampaign.total_opened) * 100).toFixed(1) 
                      : '0'}%
                  </p>
                </div>
              </div>

              {/* More analytics content here */}
              <div className="glass-surface" style={{ padding: '20px', borderRadius: '10px' }}>
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
                <div className="space-y-3">
                  <div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginBottom: '4px' }}>
                      Created
                    </p>
                    <p style={{ color: '#FFFFFF', fontSize: '14px' }}>
                      {formatDate(selectedCampaign.created_at)}
                    </p>
                  </div>
                  {selectedCampaign.sent_at && (
                    <div>
                      <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginBottom: '4px' }}>
                        Sent
                      </p>
                      <p style={{ color: '#FFFFFF', fontSize: '14px' }}>
                        {formatDate(selectedCampaign.sent_at)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Wizard */}
      <CampaignWizard
        isOpen={showCampaignWizard}
        onClose={() => setShowCampaignWizard(false)}
        onComplete={() => {
          setShowCampaignWizard(false);
          fetchCampaigns();
        }}
        token={token}
        BACKEND_URL={BACKEND_URL}
      />
    </div>
  );
};

export default CampaignsNew;
