import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { API } from '../../App';
import { colors, shadows, borderRadius, spacing } from '../../styles/designSystem';
import { Clock, User, Edit, CheckCircle, XCircle, MessageSquare, Zap } from 'lucide-react';

const ActivityTimeline = ({ propertyId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, [propertyId]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API}/map-crm/properties/${propertyId}/activity`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch activity');
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'viewed': return <Eye size={16} style={{ color: colors.textTertiary }} />;
      case 'edited': return <Edit size={16} style={{ color: colors.primary }} />;
      case 'note_added': return <MessageSquare size={16} style={{ color: colors.primary }} />;
      case 'claimed': return <CheckCircle size={16} style={{ color: colors.success }} />;
      case 'unclaimed': return <XCircle size={16} style={{ color: colors.textTertiary }} />;
      case 'converted': return <Zap size={16} style={{ color: colors.warning }} />;
      case 'status_changed': return <Clock size={16} style={{ color: colors.primary }} />;
      default: return <Clock size={16} style={{ color: colors.textTertiary }} />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.textTertiary }}>
        Loading activity...
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: spacing.xl }}>
        <Clock size={32} style={{ color: colors.textMuted, margin: '0 auto 12px' }} />
        <p style={{ fontSize: '14px', color: colors.textTertiary }}>
          No activity yet
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Timeline line */}
      <div style={{
        position: 'absolute',
        left: '20px',
        top: '12px',
        bottom: '12px',
        width: '2px',
        background: colors.border
      }} />

      {/* Activity items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            style={{
              display: 'flex',
              gap: spacing.md,
              position: 'relative',
              paddingLeft: spacing.sm
            }}
          >
            {/* Icon */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: colors.surfaceElevated,
              border: `2px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              zIndex: 1
            }}>
              {getActivityIcon(activity.activity_type)}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingTop: '4px' }}>
              <div style={{
                background: colors.surfaceElevated,
                borderRadius: borderRadius.md,
                padding: spacing.md,
                border: `1px solid ${colors.border}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: colors.textPrimary }}>
                    {activity.user_name}
                  </span>
                  <span style={{ fontSize: '12px', color: colors.textTertiary }}>
                    {formatTimestamp(activity.created_at)}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: colors.textSecondary }}>
                  {activity.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Eye = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={style}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

export default ActivityTimeline;
