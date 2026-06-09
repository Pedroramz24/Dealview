import React, { useState, useEffect } from 'react';
import { TrendingUp, Send, Eye, MousePointerClick, AlertTriangle, UserX } from 'lucide-react';

const CampaignAnalyticsSummary = ({ campaigns }) => {
  const [stats, setStats] = useState({
    totalSent: 0,
    delivered: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    unsubscribeRate: 0
  });

  useEffect(() => {
    if (campaigns && campaigns.length > 0) {
      calculateAggregateStats();
    }
  }, [campaigns]);

  const calculateAggregateStats = () => {
    const totals = campaigns.reduce((acc, campaign) => ({
      sent: acc.sent + (campaign.total_sent || 0),
      delivered: acc.delivered + (campaign.total_delivered || 0),
      opened: acc.opened + (campaign.total_opened || 0),
      clicked: acc.clicked + (campaign.total_clicked || 0),
      bounced: acc.bounced + (campaign.total_bounced || 0),
      // Unsubscribes would come from campaign data if tracked
      unsubscribed: acc.unsubscribed + (campaign.total_unsubscribed || 0)
    }), { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 });

    setStats({
      totalSent: totals.sent,
      delivered: totals.delivered,
      deliveryRate: totals.sent > 0 ? (totals.delivered / totals.sent) * 100 : 0,
      openRate: totals.delivered > 0 ? (totals.opened / totals.delivered) * 100 : 0,
      clickRate: totals.opened > 0 ? (totals.clicked / totals.opened) * 100 : 0,
      bounceRate: totals.sent > 0 ? (totals.bounced / totals.sent) * 100 : 0,
      unsubscribeRate: totals.sent > 0 ? (totals.unsubscribed / totals.sent) * 100 : 0
    });
  };

  const statCards = [
    {
      label: 'Total Sent',
      value: stats.totalSent.toLocaleString(),
      icon: Send,
      color: '#ff0000',
      bgColor: 'rgba(255, 0, 0, 0.1)',
      borderColor: 'rgba(255, 0, 0, 0.2)'
    },
    {
      label: 'Delivery Rate',
      value: `${stats.deliveryRate.toFixed(1)}%`,
      subValue: `${stats.delivered.toLocaleString()} delivered`,
      icon: TrendingUp,
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.2)'
    },
    {
      label: 'Open Rate',
      value: `${stats.openRate.toFixed(1)}%`,
      icon: Eye,
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      borderColor: 'rgba(139, 92, 246, 0.2)'
    },
    {
      label: 'Click Rate',
      value: `${stats.clickRate.toFixed(1)}%`,
      icon: MousePointerClick,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.2)'
    },
    {
      label: 'Bounce Rate',
      value: `${stats.bounceRate.toFixed(1)}%`,
      icon: AlertTriangle,
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.2)'
    }
  ];

  if (campaigns.length === 0) {
    return null;
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px',
      backdropFilter: 'blur(12px)'
    }}>
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ 
          color: 'var(--text-primary)', 
          fontSize: '16px', 
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Campaign Performance
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Aggregate metrics across {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              style={{
                background: stat.bgColor,
                border: `1px solid ${stat.borderColor}`,
                borderRadius: '10px',
                padding: '18px 16px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = stat.bgColor.replace('0.1', '0.15');
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = stat.bgColor;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon size={18} style={{ color: stat.color }} />
                <span style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {stat.label}
                </span>
              </div>
              <p style={{ 
                color: stat.color, 
                fontSize: '28px', 
                fontWeight: 700,
                lineHeight: '1.2',
                marginBottom: '4px'
              }}>
                {stat.value}
              </p>
              {stat.subValue && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {stat.subValue}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CampaignAnalyticsSummary;
