import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Mail, ArrowLeft, Send, Users, Filter, CheckSquare, Square, Loader2, 
  TrendingUp, ExternalLink, BarChart3, X
} from 'lucide-react';
import { toast } from 'sonner';

const CampaignDetails = ({ campaignId, onBack, token, BACKEND_URL }) => {
  const [campaign, setCampaign] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    assetTypes: [],
    markets: [],
    statuses: []
  });

  const assetTypes = ['Retail Centers', 'Land', 'Industrial', 'Restaurants', 'Hotels', 'Medical', 'Office', 'Multifamily', 'Mixed Use'];
  const markets = ['San Antonio', 'Austin', 'Houston', 'DFW', 'RGV'];
  const statuses = ['Hot', 'Warm', 'Cold', 'Qualified', 'Unqualified'];

  useEffect(() => {
    fetchCampaignDetails();
    fetchContacts();
  }, [campaignId]);

  const fetchCampaignDetails = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/email/campaigns/${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setCampaign(data.campaign);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign details');
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter out contacts without email
      const validContacts = data.filter(contact => contact.email);
      setContacts(validContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
    }
  };

  const getFilteredContacts = () => {
    let filtered = contacts;

    if (filters.assetTypes.length > 0) {
      filtered = filtered.filter(contact => 
        contact.asset_type_focus && 
        filters.assetTypes.some(type => contact.asset_type_focus.includes(type))
      );
    }

    if (filters.markets.length > 0) {
      filtered = filtered.filter(contact => 
        contact.markets && 
        filters.markets.some(market => contact.markets.includes(market))
      );
    }

    if (filters.statuses.length > 0) {
      filtered = filtered.filter(contact => 
        filters.statuses.includes(contact.status)
      );
    }

    return filtered;
  };

  const toggleFilter = (category, value) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  const toggleContact = (contactId) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAll = () => {
    const filtered = getFilteredContacts();
    setSelectedContacts(filtered.map(c => c.id));
  };

  const deselectAll = () => {
    setSelectedContacts([]);
  };

  const sendCampaign = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }

    setSending(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/email/campaigns/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          contact_ids: selectedContacts
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`Campaign sent to ${result.results.total_sent} contacts!`);
        setShowContactSelector(false);
        setSelectedContacts([]);
        fetchCampaignDetails(); // Refresh stats
      } else {
        toast.dismiss();
        toast.error(result.detail || 'Failed to send campaign', { duration: 4000 });
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.dismiss();
      toast.error('Failed to send campaign', { duration: 4000 });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Campaign not found</p>
      </div>
    );
  }

  const filteredContacts = getFilteredContacts();

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-base)', padding: '32px' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            style={{
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: 600 }}>
              {campaign.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {campaign.subject}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowContactSelector(true)}
          disabled={campaign.status === 'sending'}
          style={{
            padding: '12px 24px',
            background: campaign.status === 'sending' ? 'rgba(255, 255, 255, 0.05)' : '#00b8d4',
            color: campaign.status === 'sending' ? 'rgba(255, 255, 255, 0.3)' : '#000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: campaign.status === 'sending' ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Send size={18} />
          Send Campaign
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
        <div className="glass-surface p-6">
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Total Sent</p>
          <p style={{ color: 'var(--text-primary)', fontSize: '32px', fontWeight: 600 }}>
            {campaign.total_sent || 0}
          </p>
        </div>
        <div className="glass-surface p-6">
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Delivered</p>
          <p style={{ color: '#00b8d4', fontSize: '32px', fontWeight: 600 }}>
            {campaign.total_delivered || 0}
          </p>
        </div>
        <div className="glass-surface p-6">
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Opened</p>
          <p style={{ color: '#22c55e', fontSize: '32px', fontWeight: 600 }}>
            {campaign.total_opened || 0}
          </p>
          {campaign.total_sent > 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
              {((campaign.total_opened / campaign.total_sent) * 100).toFixed(1)}%
            </p>
          )}
        </div>
        <div className="glass-surface p-6">
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Clicked</p>
          <p style={{ color: '#8b5cf6', fontSize: '32px', fontWeight: 600 }}>
            {campaign.total_clicked || 0}
          </p>
          {campaign.total_sent > 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
              {((campaign.total_clicked / campaign.total_sent) * 100).toFixed(1)}%
            </p>
          )}
        </div>
        <div className="glass-surface p-6">
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Bounced</p>
          <p style={{ color: '#ef4444', fontSize: '32px', fontWeight: 600 }}>
            {campaign.total_bounced || 0}
          </p>
        </div>
      </div>

      {/* Email Preview */}
      <div className="glass-surface p-8">
        <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
          Email Preview
        </h3>
        <div style={{
          padding: '24px',
          background: '#fff',
          borderRadius: '8px',
          color: '#333',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          <div style={{ borderBottom: '2px solid #00b8d4', paddingBottom: '12px', marginBottom: '20px' }}>
            <strong>Subject: {campaign.subject}</strong>
          </div>
          <div dangerouslySetInnerHTML={{ __html: campaign.html_content }} />
        </div>
      </div>

      {/* Contact Selector Modal */}
      {showContactSelector && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '32px'
        }}>
          <div className="glass-surface" style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh', overflow: 'auto', padding: '32px' }}>
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 600 }}>
                Select Recipients
              </h2>
              <button
                onClick={() => setShowContactSelector(false)}
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

            {/* Filters */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
                  Filter Contacts
                </p>
              </div>

              {/* Asset Types Filter */}
              <div className="mb-4">
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Asset Types</p>
                <div className="flex flex-wrap gap-2">
                  {assetTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleFilter('assetTypes', type)}
                      style={{
                        padding: '6px 12px',
                        background: filters.assetTypes.includes(type) ? 'rgba(0, 184, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: filters.assetTypes.includes(type) ? '1px solid #00b8d4' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: filters.assetTypes.includes(type) ? '#00b8d4' : 'var(--text-secondary)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Markets Filter */}
              <div className="mb-4">
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Markets</p>
                <div className="flex flex-wrap gap-2">
                  {markets.map(market => (
                    <button
                      key={market}
                      onClick={() => toggleFilter('markets', market)}
                      style={{
                        padding: '6px 12px',
                        background: filters.markets.includes(market) ? 'rgba(0, 184, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: filters.markets.includes(market) ? '1px solid #00b8d4' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: filters.markets.includes(market) ? '#00b8d4' : 'var(--text-secondary)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      {market}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="mb-4">
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>Status</p>
                <div className="flex flex-wrap gap-2">
                  {statuses.map(status => (
                    <button
                      key={status}
                      onClick={() => toggleFilter('statuses', status)}
                      style={{
                        padding: '6px 12px',
                        background: filters.statuses.includes(status) ? 'rgba(0, 184, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: filters.statuses.includes(status) ? '1px solid #00b8d4' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: filters.statuses.includes(status) ? '#00b8d4' : 'var(--text-secondary)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selection Actions */}
            <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div>
                <p style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600 }}>
                  {selectedContacts.length} of {filteredContacts.length} selected
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {filteredContacts.length} contacts match filters
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(0, 184, 212, 0.1)',
                    border: '1px solid rgba(0, 184, 212, 0.3)',
                    borderRadius: '6px',
                    color: '#00b8d4',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Contacts List */}
            <div style={{ maxHeight: '300px', overflow: 'auto', marginBottom: '24px' }}>
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users size={48} style={{ color: 'rgba(255, 255, 255, 0.1)', margin: '0 auto 12px' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No contacts match your filters</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredContacts.map(contact => (
                    <div
                      key={contact.id}
                      onClick={() => toggleContact(contact.id)}
                      style={{
                        padding: '12px 16px',
                        background: selectedContacts.includes(contact.id) ? 'rgba(0, 184, 212, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        border: selectedContacts.includes(contact.id) ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {selectedContacts.includes(contact.id) ? (
                        <CheckSquare size={20} style={{ color: '#00b8d4' }} />
                      ) : (
                        <Square size={20} style={{ color: 'var(--text-secondary)' }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>
                          {contact.full_name}
                        </p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                          {contact.email}
                        </p>
                      </div>
                      {contact.company && (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {contact.company}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Send Button */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowContactSelector(false)}
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
                Cancel
              </button>
              <button
                onClick={sendCampaign}
                disabled={sending || selectedContacts.length === 0}
                style={{
                  flex: 2,
                  padding: '14px 24px',
                  background: sending || selectedContacts.length === 0 ? 'rgba(255, 255, 255, 0.05)' : '#00b8d4',
                  color: sending || selectedContacts.length === 0 ? 'rgba(255, 255, 255, 0.3)' : '#000',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: sending || selectedContacts.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {sending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send to {selectedContacts.length} Contact{selectedContacts.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetails;
