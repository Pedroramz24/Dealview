import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { supabase } from '../supabaseClient';
import CampaignWizard from '../components/CampaignWizard';
import { 
  Mail, Plus, Send, Eye, Settings, CheckCircle2, Clock,
  Search, Filter, X, TrendingUp, MousePointerClick, AlertTriangle,
  Calendar, Tag, Users, BarChart3, Zap, UserX, ArrowUp, ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';

const Campaigns = () => {
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

  // Setup wizard
  const [setupStep, setSetupStep] = useState(1);
  const [setupData, setSetupData] = useState({
    apiKey: '',
    senderEmail: '',
    senderName: '',
    testing: false
  });

  // Get token
  useEffect(() => {
    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setToken(session.access_token);
      }
    };
    getToken();
  }, [user]);

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

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, searchTerm, statusFilter, tagFilter]);

  const checkEmailSettings = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setEmailSettingsConfigured(data.configured);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/campaigns?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
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
        headers: { 'Content-Type': 'application/json' },
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
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  // Calculate aggregate stats
  const calculateAggregateStats = () => {
    if (campaigns.length === 0) {
      return {
        totalSent: 0,
        delivered: 0,
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0
      };
    }

    const totals = campaigns.reduce((acc, c) => ({
      sent: acc.sent + (c.total_sent || 0),
      delivered: acc.delivered + (c.total_delivered || 0),
      opened: acc.opened + (c.total_opened || 0),
      clicked: acc.clicked + (c.total_clicked || 0),
      bounced: acc.bounced + (c.total_bounced || 0),
      unsubscribed: acc.unsubscribed + (c.total_unsubscribed || 0)
    }), { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 });

    return {
      totalSent: totals.sent,
      delivered: totals.delivered,
      deliveryRate: totals.sent > 0 ? (totals.delivered / totals.sent) * 100 : 0,
      openRate: totals.delivered > 0 ? (totals.opened / totals.delivered) * 100 : 0,
      clickRate: totals.opened > 0 ? (totals.clicked / totals.opened) * 100 : 0,
      bounceRate: totals.sent > 0 ? (totals.bounced / totals.sent) * 100 : 0,
      unsubscribeRate: totals.sent > 0 ? (totals.unsubscribed / totals.sent) * 100 : 0
    };
  };

  const stats = calculateAggregateStats();

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.25)', text: '#22c55e' };
      case 'scheduled': return { bg: 'rgba(0, 184, 212, 0.12)', border: 'rgba(0, 184, 212, 0.25)', text: '#00b8d4' };
      case 'sending': return { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', text: '#f59e0b' };
      case 'draft': return { bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.25)', text: '#94a3b8' };
      case 'paused': return { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', text: '#ef4444' };
      default: return { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)', text: 'rgba(255, 255, 255, 0.6)' };
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

  // Loading
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
                  <li>Click button below to open SendGrid</li>
                  <li>Click "Create API Key"</li>
                  <li>Name: <strong style={{ color: 'var(--text-primary)' }}>DealView CRM</strong></li>
                  <li>Permissions: <strong style={{ color: 'var(--text-primary)' }}>"Full Access"</strong></li>
                  <li>Copy key and paste below</li>
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
                  textDecoration: 'none'
                }}
              >
                <Settings size={18} />
                Open SendGrid API Keys
              </a>

              <div className="mb-6">
                <label style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                  SendGrid API Key *
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
                  cursor: setupData.testing || !setupData.apiKey ? 'not-allowed' : 'pointer'
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
                  placeholder="Your Name"
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
                    cursor: !setupData.senderEmail || !setupData.senderName ? 'not-allowed' : 'pointer'
                  }}
                >
                  Complete Setup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main view
  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-base)', overflow: 'hidden' }}>
      {/* Ambient gradient background */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '1200px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(0, 184, 212, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', padding: '32px' }}>
        {/* Header with gradient accent */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                border: '1px solid rgba(0, 184, 212, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(0, 184, 212, 0.15)'
              }}>
                <Mail size={24} style={{ color: '#00b8d4' }} />
              </div>
              <h1 style={{ 
                color: 'var(--text-primary)', 
                fontSize: '32px', 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #FFFFFF 0%, rgba(255, 255, 255, 0.7) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em'
              }}>
                Email Campaigns
              </h1>
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '15px', marginLeft: '60px' }}>
              Manage and track your email marketing campaigns
            </p>
          </div>

          <button
            onClick={() => setShowCampaignWizard(true)}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.25), rgba(59, 130, 246, 0.25))',
              border: '1px solid rgba(0, 184, 212, 0.4)',
              borderRadius: '12px',
              color: '#00d4ff',
              fontWeight: '800',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 8px 32px rgba(0, 184, 212, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 184, 212, 0.35), rgba(59, 130, 246, 0.35))';
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 184, 212, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 184, 212, 0.25), rgba(59, 130, 246, 0.25))';
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 184, 212, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
            }}
          >
            <Plus size={20} />
            Create Campaign
          </button>
        </div>

        {/* Search & Filters with enhanced design */}
        <div className="flex gap-3 mb-6">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ 
              position: 'absolute', 
              left: '16px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'rgba(0, 184, 212, 0.6)',
              zIndex: 1
            }} />
            <input
              type="text"
              placeholder="Search campaigns by name or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.4)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '140px'
            }}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
            <option value="paused">Paused</option>
          </select>

          {getAllTags().length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              style={{
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                cursor: 'pointer',
                minWidth: '140px'
              }}
            >
              <option value="all">All Tags</option>
              {getAllTags().map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}
        </div>

        {/* Analytics Summary Ribbon - ALWAYS VISIBLE */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid rgba(0, 184, 212, 0.15)',
          borderRadius: '14px',
          padding: '24px',
          marginBottom: '24px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(0, 184, 212, 0.15)',
                border: '1px solid rgba(0, 184, 212, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BarChart3 size={20} style={{ color: '#00b8d4' }} />
              </div>
              <div>
                <h3 style={{ 
                  color: '#FFFFFF', 
                  fontSize: '17px', 
                  fontWeight: 700,
                  marginBottom: '2px',
                  letterSpacing: '-0.01em'
                }}>
                  Campaign Performance
                </h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>
                  Aggregate metrics across {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            {/* Total Sent */}
            <div style={{
              background: 'rgba(0, 184, 212, 0.08)',
              border: '1px solid rgba(0, 184, 212, 0.2)',
              borderRadius: '10px',
              padding: '18px 16px'
            }}>
              <div className="flex items-center gap-2 mb-2">
                <Send size={14} style={{ color: '#00b8d4' }} />
                <p style={{ 
                  color: 'rgba(0, 184, 212, 0.8)', 
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Total Sent
                </p>
              </div>
              <p style={{ 
                color: '#00b8d4', 
                fontSize: '32px', 
                fontWeight: 800,
                lineHeight: '1',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {stats.totalSent.toLocaleString()}
              </p>
            </div>

            {/* Delivery Rate */}
            <div style={{
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              borderRadius: '10px',
              padding: '18px 16px'
            }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                <p style={{ 
                  color: 'rgba(34, 197, 94, 0.8)', 
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Delivered
                </p>
              </div>
              <p style={{ 
                color: '#22c55e', 
                fontSize: '32px', 
                fontWeight: 800,
                lineHeight: '1',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {stats.deliveryRate.toFixed(1)}%
              </p>
              <p style={{ color: 'rgba(34, 197, 94, 0.6)', fontSize: '12px', marginTop: '4px' }}>
                {stats.delivered.toLocaleString()} emails
              </p>
            </div>

            {/* Open Rate */}
            <div style={{
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '10px',
              padding: '18px 16px'
            }}>
              <div className="flex items-center gap-2 mb-2">
                <Eye size={14} style={{ color: '#8b5cf6' }} />
                <p style={{ 
                  color: 'rgba(139, 92, 246, 0.8)', 
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Open Rate
                </p>
              </div>
              <p style={{ 
                color: '#8b5cf6', 
                fontSize: '32px', 
                fontWeight: 800,
                lineHeight: '1',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {stats.openRate.toFixed(1)}%
              </p>
            </div>

            {/* Click Rate */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '10px',
              padding: '18px 16px'
            }}>
              <div className="flex items-center gap-2 mb-2">
                <MousePointerClick size={14} style={{ color: '#f59e0b' }} />
                <p style={{ 
                  color: 'rgba(245, 158, 11, 0.8)', 
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Click Rate
                </p>
              </div>
              <p style={{ 
                color: '#f59e0b', 
                fontSize: '32px', 
                fontWeight: 800,
                lineHeight: '1',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {stats.clickRate.toFixed(1)}%
              </p>
            </div>

            {/* Bounce Rate */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px',
              padding: '18px 16px'
            }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                <p style={{ 
                  color: 'rgba(239, 68, 68, 0.8)', 
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Bounce Rate
                </p>
              </div>
              <p style={{ 
                color: '#ef4444', 
                fontSize: '32px', 
                fontWeight: 800,
                lineHeight: '1',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {stats.bounceRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="flex-1 overflow-hidden">
          <div className="glass-surface" style={{ 
            borderRadius: '14px', 
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}>
            {filteredCampaigns.length === 0 ? (
              /* Empty state inside table */
              <div className="h-full flex items-center justify-center">
                <div className="text-center" style={{ maxWidth: '500px', padding: '60px 40px' }}>
                  {/* Simple icon - no animation */}
                  <div style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 24px',
                    borderRadius: '16px',
                    background: 'rgba(0, 184, 212, 0.08)',
                    border: '1px solid rgba(0, 184, 212, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Mail size={40} style={{ color: '#00b8d4', opacity: 0.6 }} />
                  </div>

                  <h3 style={{ 
                    color: '#FFFFFF', 
                    fontSize: '22px', 
                    fontWeight: 600, 
                    marginBottom: '8px',
                    letterSpacing: '-0.01em'
                  }}>
                    {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns match filters'}
                  </h3>
                  <p style={{ 
                    color: 'rgba(255, 255, 255, 0.5)', 
                    fontSize: '14px', 
                    lineHeight: '1.6'
                  }}>
                    {campaigns.length === 0 
                      ? 'Create your first email campaign to get started'
                      : 'Try adjusting your search or filter criteria'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 1.5fr 1fr 2.5fr 1fr',
                  padding: '18px 24px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 5
                }}>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                    Campaign
                  </p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                    Audience
                  </p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                    Status
                  </p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                    Health Metrics
                  </p>
                  <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', textAlign: 'right' }}>
                    Updated
                  </p>
                </div>

                {/* Table Body - Scrollable */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {filteredCampaigns.map((campaign, index) => {
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
                      className="campaign-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2.5fr 1.5fr 1fr 2.5fr 1fr',
                        padding: '20px 24px',
                        borderBottom: index === filteredCampaigns.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 184, 212, 0.04)';
                        e.currentTarget.style.borderLeftColor = '#00b8d4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderLeftColor = 'transparent';
                      }}
                    >
                      {/* Left accent bar on hover */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '3px',
                        background: 'transparent',
                        transition: 'all 0.25s ease'
                      }} />

                      {/* Campaign Name */}
                      <div>
                        <p style={{ 
                          color: '#FFFFFF', 
                          fontSize: '15px', 
                          fontWeight: 600, 
                          marginBottom: '6px',
                          letterSpacing: '-0.01em'
                        }}>
                          {campaign.name}
                        </p>
                        <p style={{ 
                          color: 'rgba(255, 255, 255, 0.5)', 
                          fontSize: '13px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '90%'
                        }}>
                          {campaign.subject}
                        </p>
                      </div>

                      {/* Audience */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Users size={14} style={{ color: '#00b8d4' }} />
                          <p style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 600 }}>
                            {campaign.total_recipients || 0}
                          </p>
                        </div>
                        {campaign.segment_filters?.tags && campaign.segment_filters.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {campaign.segment_filters.tags.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                style={{
                                  padding: '3px 8px',
                                  background: 'rgba(0, 184, 212, 0.12)',
                                  border: '1px solid rgba(0, 184, 212, 0.25)',
                                  borderRadius: '5px',
                                  color: '#00b8d4',
                                  fontSize: '11px',
                                  fontWeight: 600
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                            {campaign.segment_filters.tags.length > 2 && (
                              <span style={{ 
                                color: 'rgba(255, 255, 255, 0.4)', 
                                fontSize: '11px',
                                padding: '3px 4px'
                              }}>
                                +{campaign.segment_filters.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        <span style={{
                          padding: '6px 14px',
                          background: statusStyle.bg,
                          border: `1px solid ${statusStyle.border}`,
                          borderRadius: '7px',
                          color: statusStyle.text,
                          fontSize: '12px',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          letterSpacing: '0.3px'
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: statusStyle.text,
                            display: 'inline-block',
                            animation: campaign.status === 'sending' ? 'pulse-dot 1.5s ease-in-out infinite' : 'none'
                          }} />
                          {campaign.status}
                        </span>
                      </div>

                      {/* Health Strip */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#22c55e',
                              boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)'
                            }} />
                            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 500 }}>
                              Delivered
                            </span>
                            <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 700, marginLeft: 'auto' }}>
                              {deliveredRate.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#8b5cf6',
                              boxShadow: '0 0 8px rgba(139, 92, 246, 0.4)'
                            }} />
                            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 500 }}>
                              Opened
                            </span>
                            <span style={{ color: '#8b5cf6', fontSize: '13px', fontWeight: 700, marginLeft: 'auto' }}>
                              {openRate.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#f59e0b',
                              boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)'
                            }} />
                            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 500 }}>
                              Clicked
                            </span>
                            <span style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 700, marginLeft: 'auto' }}>
                              {clickRate.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#ef4444',
                              boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)'
                            }} />
                            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', fontWeight: 500 }}>
                              Bounced
                            </span>
                            <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 700, marginLeft: 'auto' }}>
                              {bounceRate.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Last Updated */}
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ 
                          color: 'rgba(255, 255, 255, 0.6)', 
                          fontSize: '13px',
                          fontWeight: 500
                        }}>
                          {formatDate(campaign.updated_at || campaign.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
            )}
          </div>
        </div>
      </div>

      {/* Campaign Analytics Panel */}
      {showAnalyticsPanel && selectedCampaign && (
        <div 
          className="fixed inset-0 z-50 flex justify-end animate-fade-in"
          style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowAnalyticsPanel(false)}
        >
          <div
            className="w-full md:w-[800px] h-full animate-slide-in"
            style={{
              background: 'linear-gradient(135deg, rgba(11, 12, 14, 0.98) 0%, rgba(20, 20, 25, 0.98) 100%)',
              borderLeft: '1px solid rgba(0, 184, 212, 0.15)',
              boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.5), inset 1px 0 0 rgba(0, 184, 212, 0.1)',
              backdropFilter: 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div style={{ 
              padding: '28px 32px', 
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.3)',
              position: 'relative'
            }}>
              {/* Subtle gradient accent */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(90deg, #00b8d4 0%, #8b5cf6 50%, #00b8d4 100%)',
                opacity: 0.6
              }} />

              <div className="flex justify-between items-start">
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 style={{ 
                      color: '#FFFFFF', 
                      fontSize: '26px', 
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      lineHeight: '1.2'
                    }}>
                      {selectedCampaign.name}
                    </h2>
                    <span style={{
                      padding: '5px 12px',
                      background: getStatusColor(selectedCampaign.status).bg,
                      border: `1px solid ${getStatusColor(selectedCampaign.status).border}`,
                      borderRadius: '6px',
                      color: getStatusColor(selectedCampaign.status).text,
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {selectedCampaign.status}
                    </span>
                  </div>
                  <p style={{ 
                    color: 'rgba(255, 255, 255, 0.5)', 
                    fontSize: '14px',
                    marginBottom: '12px'
                  }}>
                    {selectedCampaign.subject}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>
                        {formatDate(selectedCampaign.created_at)}
                      </span>
                    </div>
                    {selectedCampaign.sent_at && (
                      <div className="flex items-center gap-2">
                        <Send size={14} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
                        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '13px' }}>
                          Sent {formatDate(selectedCampaign.sent_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowAnalyticsPanel(false)}
                  style={{
                    padding: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                  }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-5 mb-8">
                {/* Total Sent */}
                <div className="glass-surface" style={{ 
                  padding: '20px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 184, 212, 0.15)',
                  background: 'rgba(0, 184, 212, 0.03)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    background: 'radial-gradient(circle, rgba(0, 184, 212, 0.2) 0%, transparent 70%)',
                    pointerEvents: 'none'
                  }} />
                  <div className="flex items-center justify-between mb-3">
                    <Send size={16} style={{ color: '#00b8d4' }} />
                    <p style={{ color: 'rgba(0, 184, 212, 0.7)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Total Sent
                    </p>
                  </div>
                  <p style={{ color: '#00b8d4', fontSize: '36px', fontWeight: 800, lineHeight: '1', fontVariantNumeric: 'tabular-nums' }}>
                    {(selectedCampaign.total_sent || 0).toLocaleString()}
                  </p>
                </div>

                {/* Opened */}
                <div className="glass-surface" style={{ 
                  padding: '20px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  background: 'rgba(139, 92, 246, 0.03)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
                    pointerEvents: 'none'
                  }} />
                  <div className="flex items-center justify-between mb-3">
                    <Eye size={16} style={{ color: '#8b5cf6' }} />
                    <p style={{ color: 'rgba(139, 92, 246, 0.7)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Opened
                    </p>
                  </div>
                  <p style={{ color: '#8b5cf6', fontSize: '36px', fontWeight: 800, lineHeight: '1', marginBottom: '6px', fontVariantNumeric: 'tabular-nums' }}>
                    {(selectedCampaign.total_opened || 0).toLocaleString()}
                  </p>
                  <p style={{ color: 'rgba(139, 92, 246, 0.6)', fontSize: '13px', fontWeight: 600 }}>
                    {selectedCampaign.total_sent > 0 
                      ? ((selectedCampaign.total_opened / selectedCampaign.total_sent) * 100).toFixed(1) 
                      : '0'}% rate
                  </p>
                </div>

                {/* Clicked */}
                <div className="glass-surface" style={{ 
                  padding: '20px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.15)',
                  background: 'rgba(245, 158, 11, 0.03)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)',
                    pointerEvents: 'none'
                  }} />
                  <div className="flex items-center justify-between mb-3">
                    <MousePointerClick size={16} style={{ color: '#f59e0b' }} />
                    <p style={{ color: 'rgba(245, 158, 11, 0.7)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Clicked
                    </p>
                  </div>
                  <p style={{ color: '#f59e0b', fontSize: '36px', fontWeight: 800, lineHeight: '1', marginBottom: '6px', fontVariantNumeric: 'tabular-nums' }}>
                    {(selectedCampaign.total_clicked || 0).toLocaleString()}
                  </p>
                  <p style={{ color: 'rgba(245, 158, 11, 0.6)', fontSize: '13px', fontWeight: 600 }}>
                    {selectedCampaign.total_opened > 0 
                      ? ((selectedCampaign.total_clicked / selectedCampaign.total_opened) * 100).toFixed(1) 
                      : '0'}% CTR
                  </p>
                </div>
              </div>

              {/* Campaign Details Card */}
              <div className="glass-surface" style={{ 
                padding: '24px', 
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <h3 style={{ 
                  color: '#00b8d4', 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  letterSpacing: '1.2px',
                  marginBottom: '20px'
                }}>
                  Campaign Details
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginBottom: '6px', fontWeight: 500 }}>
                      Recipients
                    </p>
                    <p style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 600 }}>
                      {selectedCampaign.total_recipients || 0} contacts
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginBottom: '6px', fontWeight: 500 }}>
                      Delivered
                    </p>
                    <p style={{ color: '#22c55e', fontSize: '16px', fontWeight: 600 }}>
                      {selectedCampaign.total_delivered || 0}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginBottom: '6px', fontWeight: 500 }}>
                      Bounced
                    </p>
                    <p style={{ color: '#ef4444', fontSize: '16px', fontWeight: 600 }}>
                      {selectedCampaign.total_bounced || 0}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', marginBottom: '6px', fontWeight: 500 }}>
                      Failed
                    </p>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '16px', fontWeight: 600 }}>
                      {selectedCampaign.total_failed || 0}
                    </p>
                  </div>
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

export default Campaigns;
