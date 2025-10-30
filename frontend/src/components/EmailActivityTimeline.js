import React, { useState, useEffect } from 'react';
import { Mail, Eye, MousePointerClick, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const EmailActivityTimeline = ({ contactId = null, dealId = null, token, BACKEND_URL }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contactId || dealId) {
      fetchActivities();
    }
  }, [contactId, dealId]);

  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams();
      if (contactId) params.append('contact_id', contactId);
      if (dealId) params.append('deal_id', dealId);
      params.append('limit', '20');

      const response = await fetch(`${BACKEND_URL}/api/email/activities?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching email activities:', error);
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <Send size={14} style={{ color: '#00b8d4' }} />;
      case 'delivered':
        return <CheckCircle2 size={14} style={{ color: '#22c55e' }} />;
      case 'opened':
        return <Eye size={14} style={{ color: '#8b5cf6' }} />;
      case 'clicked':
        return <MousePointerClick size={14} style={{ color: '#f59e0b' }} />;
      case 'bounced':
      case 'failed':
        return <AlertCircle size={14} style={{ color: '#ef4444' }} />;
      default:
        return <Mail size={14} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return '#00b8d4';
      case 'delivered':
        return '#22c55e';
      case 'opened':
        return '#8b5cf6';
      case 'clicked':
        return '#f59e0b';
      case 'bounced':
      case 'failed':
        return '#ef4444';
      default:
        return 'var(--text-secondary)';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes === 0 ? 'Just now' : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="p-6 text-center">
        <Mail size={32} style={{ color: 'rgba(255, 255, 255, 0.1)', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          No emails sent yet
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <h3 style={{ 
        color: 'var(--text-primary)', 
        fontSize: '16px', 
        fontWeight: 600, 
        marginBottom: '16px',
        paddingLeft: '16px'
      }}>
        Email History
      </h3>
      
      <div className="space-y-3" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
        {activities.map((activity) => (
          <div
            key={activity.id}
            style={{
              padding: '14px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(activity.status)}
                <span style={{ 
                  color: getStatusColor(activity.status), 
                  fontSize: '12px', 
                  fontWeight: 600,
                  textTransform: 'capitalize'
                }}>
                  {activity.status}
                </span>
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                {formatDate(activity.created_at)}
              </span>
            </div>

            {/* Subject */}
            <p style={{ 
              color: 'var(--text-primary)', 
              fontSize: '14px', 
              fontWeight: 500,
              marginBottom: '6px'
            }}>
              {activity.subject}
            </p>

            {/* To */}
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
              To: {activity.to_name || activity.to_email}
            </p>

            {/* Preview */}
            {activity.plain_text_content && (
              <p style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '13px',
                marginBottom: '8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {activity.plain_text_content}
              </p>
            )}

            {/* Engagement Stats */}
            {(activity.opened_at || activity.clicked_at) && (
              <div className="flex gap-4 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                {activity.opened_at && (
                  <div className="flex items-center gap-1">
                    <Eye size={12} style={{ color: '#8b5cf6' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      Opened {formatDate(activity.opened_at)}
                    </span>
                  </div>
                )}
                {activity.clicked_at && (
                  <div className="flex items-center gap-1">
                    <MousePointerClick size={12} style={{ color: '#f59e0b' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      Clicked {formatDate(activity.clicked_at)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailActivityTimeline;
