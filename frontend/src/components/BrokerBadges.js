import React from 'react';
import { Award, CheckCircle, Zap, TrendingUp } from 'lucide-react';

const BrokerBadges = ({ brokerId, badges = [], stats = {}, quality_score = 50, compact = false }) => {
  
  const getBadgeIcon = (badgeName) => {
    switch(badgeName) {
      case 'Trusted Broker':
        return <CheckCircle size={compact ? 14 : 16} />;
      case 'Verified Track Record':
        return <Award size={compact ? 14 : 16} />;
      case 'Fast Responder':
        return <Zap size={compact ? 14 : 16} />;
      default:
        return <TrendingUp size={compact ? 14 : 16} />;
    }
  };

  const getBadgeColor = (badgeName) => {
    switch(badgeName) {
      case 'Trusted Broker':
        return '#10b981'; // green
      case 'Verified Track Record':
        return '#3b82f6'; // blue
      case 'Fast Responder':
        return '#f59e0b'; // amber
      default:
        return '#6b7280'; // gray
    }
  };

  const getQualityTier = () => {
    if (quality_score >= 70) return { name: 'Premium', color: '#10b981' };
    if (quality_score >= 40) return { name: 'Standard', color: '#3b82f6' };
    return { name: 'New', color: '#6b7280' };
  };

  const tier = getQualityTier();

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {badges.length > 0 && badges.slice(0, 2).map((badge, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              background: `${getBadgeColor(badge)}15`,
              border: `1px solid ${getBadgeColor(badge)}30`,
              borderRadius: '6px',
              color: getBadgeColor(badge),
              fontSize: '11px',
              fontWeight: '600'
            }}
          >
            {getBadgeIcon(badge)}
            <span>{badge}</span>
          </div>
        ))}
        {badges.length > 2 && (
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
            +{badges.length - 2}
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Quality Tier */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: `${tier.color}15`,
        border: `1px solid ${tier.color}30`,
        borderRadius: '8px',
        alignSelf: 'flex-start'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: tier.color
        }} />
        <span style={{
          color: tier.color,
          fontSize: '13px',
          fontWeight: '700'
        }}>
          {tier.name} Broker
        </span>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {badges.map((badge, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: `${getBadgeColor(badge)}15`,
                border: `1px solid ${getBadgeColor(badge)}30`,
                borderRadius: '8px',
                color: getBadgeColor(badge),
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              {getBadgeIcon(badge)}
              <span>{badge}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {Object.keys(stats).length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px'
        }}>
          {stats.response_time && (
            <div style={{
              padding: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px' }}>
                Response Time
              </div>
              <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>
                {stats.response_time}
              </div>
            </div>
          )}

          {stats.closed_deals && (
            <div style={{
              padding: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px' }}>
                Closed Deals
              </div>
              <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>
                {stats.closed_deals}
              </div>
            </div>
          )}

          {stats.total_listings && (
            <div style={{
              padding: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px'
            }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px' }}>
                Total Listings
              </div>
              <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600' }}>
                {stats.total_listings}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrokerBadges;
