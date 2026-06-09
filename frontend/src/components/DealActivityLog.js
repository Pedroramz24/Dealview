import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { API } from '../App';
import { toast } from 'sonner';
import {
  Clock, MessageSquare, Send, User, FileText, DollarSign,
  Image, Upload, UserPlus, Settings, Activity
} from 'lucide-react';
import { Button } from './ui/button';
import { colors, shadows, borderRadius, spacing } from '../styles/designSystem';

const ACTION_ICONS = {
  'comment': MessageSquare,
  'note': FileText,
  'price_change': DollarSign,
  'image_upload': Image,
  'document_upload': Upload,
  'contact_linked': UserPlus,
  'stage_change': Settings,
  'deal_created': Activity,
  'deal_updated': Settings,
};

const ACTION_COLORS = {
  'comment': '#3b82f6',
  'note': '#8b5cf6',
  'price_change': '#f59e0b',
  'image_upload': '#10b981',
  'document_upload': '#10b981',
  'contact_linked': '#ec4899',
  'stage_change': '#ff0000',
  'deal_created': '#10b981',
  'deal_updated': '#94a3b8',
};

const DealActivityLog = ({ dealId, isOwner }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const getToken = useCallback(async () => {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token;
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API}/deals/${dealId}/activity?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (e) {
      console.error('Failed to fetch activity:', e);
    } finally {
      setLoading(false);
    }
  }, [dealId, getToken]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const addComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/deals/${dealId}/activity`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'comment', description: comment.trim() })
      });
      if (res.ok) {
        setComment('');
        await fetchActivity();
      }
    } catch (e) {
      toast.error('Failed to add comment');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textTertiary }}>
        Loading activity...
      </div>
    );
  }

  return (
    <div data-testid="deal-activity-log" style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Comment input */}
      <div style={{
        background: colors.surfaceCard, borderRadius: borderRadius.md,
        padding: spacing.lg, boxShadow: shadows.cardElevation
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            data-testid="activity-comment-input"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
            placeholder="Add a comment or note..."
            rows={2}
            style={{
              flex: 1, padding: '10px 12px', borderRadius: '8px', resize: 'none',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
              lineHeight: '1.5'
            }}
          />
          <Button
            data-testid="activity-send-btn"
            onClick={addComment}
            disabled={!comment.trim() || sending}
            size="sm"
            style={{ background: colors.primary, border: 'none', color: '#fff', height: '40px', width: '40px', padding: 0, flexShrink: 0 }}
          >
            <Send size={16} />
          </Button>
        </div>
      </div>

      {/* Activity feed */}
      <div style={{
        background: colors.surfaceCard, borderRadius: borderRadius.md,
        padding: spacing.lg, boxShadow: shadows.cardElevation
      }}>
        <h3 style={{ color: colors.textPrimary, fontSize: '15px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={16} style={{ color: colors.primary }} />
          Activity
        </h3>

        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: colors.textTertiary, fontSize: '14px' }}>
            No activity yet. Add a comment to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activities.map((a, idx) => {
              const IconComp = ACTION_ICONS[a.action] || Activity;
              const accentColor = ACTION_COLORS[a.action] || '#94a3b8';

              return (
                <div key={a.id} data-testid={`activity-item-${idx}`} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                  {/* Timeline line */}
                  {idx < activities.length - 1 && (
                    <div style={{
                      position: 'absolute', left: '17px', top: '38px', bottom: '-4px',
                      width: '2px', background: 'rgba(255,255,255,0.06)'
                    }} />
                  )}

                  {/* Icon */}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                    background: `${accentColor}15`, border: `1.5px solid ${accentColor}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1
                  }}>
                    <IconComp size={14} style={{ color: accentColor }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingBottom: '20px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ color: colors.textPrimary, fontSize: '13px', fontWeight: '500' }}>
                        {a.user_name || 'Unknown'}
                      </span>
                      <span style={{ color: colors.textMuted, fontSize: '12px' }}>
                        {formatTime(a.created_at)}
                      </span>
                    </div>
                    {a.description && (
                      <div style={{
                        color: a.action === 'comment' ? colors.textSecondary : colors.textTertiary,
                        fontSize: '13px', lineHeight: '1.5',
                        ...(a.action === 'comment' ? {
                          background: 'rgba(255,255,255,0.03)', padding: '8px 12px',
                          borderRadius: '8px', marginTop: '4px', border: '1px solid rgba(255,255,255,0.05)'
                        } : {})
                      }}>
                        {a.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealActivityLog;
