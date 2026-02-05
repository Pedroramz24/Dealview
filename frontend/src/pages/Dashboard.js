import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, API } from '../App';
import { supabase } from '../supabaseClient';
import { 
  Building2, Users, Calendar, TrendingUp, DollarSign, 
  MapPin, Clock, ArrowRight, Plus
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { colors, shadows, gradients, borderRadius, spacing } from '../styles/designSystem';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [recentDeals, setRecentDeals] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        setLoading(false);
        return;
      }

      // Fetch dashboard stats
      const statsRes = await fetch(`${API}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }

      // Fetch recent activity
      const activityRes = await fetch(`${API}/dashboard/recent-activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (activityRes.ok) {
        const data = await activityRes.json();
        setRecentDeals(data.activity?.recent_deals || []);
        setUpcomingEvents(data.activity?.upcoming_events || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: colors.textSecondary
      }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{
      padding: spacing.xl,
      minHeight: '100%'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: spacing.xs
          }}>
            Dashboard
          </h1>
          <p style={{ color: colors.textTertiary, fontSize: '14px' }}>
            Welcome back! Here's your CRM overview.
          </p>
        </div>
        <Button
          onClick={() => navigate('/pipeline')}
          style={{
            background: gradients.primaryButton,
            border: 'none',
            color: '#fff'
          }}
        >
          <Plus size={18} style={{ marginRight: '8px' }} />
          Add Deal
        </Button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: spacing.lg,
        marginBottom: spacing.xl
      }}>
        {/* Total Deals */}
        <div style={{
          background: colors.surfaceCard,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          boxShadow: shadows.cardElevation
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.md
          }}>
            <span style={{ color: colors.textTertiary, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Deals
            </span>
            <Building2 size={20} style={{ color: colors.primary }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: colors.textPrimary }}>
            {stats?.total_deals || 0}
          </div>
          <div style={{ color: colors.textTertiary, fontSize: '13px', marginTop: spacing.xs }}>
            {stats?.active_deals || 0} active
          </div>
        </div>

        {/* Pipeline Value */}
        <div style={{
          background: colors.surfaceCard,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          boxShadow: shadows.cardElevation
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.md
          }}>
            <span style={{ color: colors.textTertiary, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pipeline Value
            </span>
            <DollarSign size={20} style={{ color: colors.success }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: colors.textPrimary }}>
            {formatCurrency(stats?.total_pipeline_value)}
          </div>
          <div style={{ color: colors.textTertiary, fontSize: '13px', marginTop: spacing.xs }}>
            Active deals
          </div>
        </div>

        {/* Contacts */}
        <div style={{
          background: colors.surfaceCard,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          boxShadow: shadows.cardElevation
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.md
          }}>
            <span style={{ color: colors.textTertiary, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Contacts
            </span>
            <Users size={20} style={{ color: '#a78bfa' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: colors.textPrimary }}>
            {stats?.total_contacts || 0}
          </div>
          <div style={{ color: colors.textTertiary, fontSize: '13px', marginTop: spacing.xs }}>
            In your network
          </div>
        </div>

        {/* Upcoming Events */}
        <div style={{
          background: colors.surfaceCard,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          boxShadow: shadows.cardElevation
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.md
          }}>
            <span style={{ color: colors.textTertiary, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              This Week
            </span>
            <Calendar size={20} style={{ color: colors.warning }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: colors.textPrimary }}>
            {stats?.upcoming_events || 0}
          </div>
          <div style={{ color: colors.textTertiary, fontSize: '13px', marginTop: spacing.xs }}>
            Upcoming events
          </div>
        </div>
      </div>

      {/* Recent Activity & Upcoming */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: spacing.lg
      }}>
        {/* Recent Deals */}
        <div style={{
          background: colors.surfaceCard,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          boxShadow: shadows.cardElevation
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.lg
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary }}>
              Recent Deals
            </h2>
            <button
              onClick={() => navigate('/pipeline')}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.primary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '13px'
              }}
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          
          {recentDeals.length === 0 ? (
            <div style={{ 
              color: colors.textTertiary, 
              textAlign: 'center', 
              padding: spacing.xl,
              fontSize: '14px'
            }}>
              No deals yet. Create your first deal!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {recentDeals.slice(0, 5).map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => navigate(`/deals/${deal.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: spacing.md,
                    background: colors.surfaceElevated,
                    borderRadius: borderRadius.sm,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.surfaceElevated;
                  }}
                >
                  <div>
                    <div style={{ color: colors.textPrimary, fontWeight: '500', marginBottom: '2px' }}>
                      {deal.title}
                    </div>
                    <div style={{ color: colors.textTertiary, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} />
                      {deal.address || 'No address'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: colors.primary, fontWeight: '600' }}>
                      {formatCurrency(deal.asking_price)}
                    </div>
                    <div style={{ 
                      color: colors.textTertiary, 
                      fontSize: '12px',
                      background: 'rgba(0, 184, 212, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      marginTop: '4px'
                    }}>
                      {deal.asset_type || 'Other'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div style={{
          background: colors.surfaceCard,
          borderRadius: borderRadius.md,
          padding: spacing.lg,
          boxShadow: shadows.cardElevation
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.lg
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary }}>
              Upcoming
            </h2>
            <button
              onClick={() => navigate('/calendar')}
              style={{
                background: 'transparent',
                border: 'none',
                color: colors.primary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '13px'
              }}
            >
              Calendar <ArrowRight size={14} />
            </button>
          </div>
          
          {upcomingEvents.length === 0 ? (
            <div style={{ 
              color: colors.textTertiary, 
              textAlign: 'center', 
              padding: spacing.xl,
              fontSize: '14px'
            }}>
              No upcoming events
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {upcomingEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: spacing.md,
                    padding: spacing.md,
                    background: colors.surfaceElevated,
                    borderRadius: borderRadius.sm
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: borderRadius.sm,
                    background: 'rgba(0, 184, 212, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Clock size={18} style={{ color: colors.primary }} />
                  </div>
                  <div>
                    <div style={{ color: colors.textPrimary, fontWeight: '500', marginBottom: '2px' }}>
                      {event.title}
                    </div>
                    <div style={{ color: colors.textTertiary, fontSize: '12px' }}>
                      {formatDate(event.start_time)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
