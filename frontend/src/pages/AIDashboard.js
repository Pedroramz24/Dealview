import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { supabase } from '../supabaseClient';
import { 
  LayoutDashboard, TrendingUp, Calendar, AlertCircle, 
  CheckCircle2, Clock, DollarSign, Target, Zap, 
  ArrowRight, Activity, RefreshCw, X, Check, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AIDashboard = () => {
  const [snapshot, setSnapshot] = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [calendarData, setCalendarData] = useState({ events: [], milestones: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get auth token from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        toast.error('Please log in to view dashboard');
        return;
      }

      const token = session.access_token;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      console.log('[Dashboard] Fetching snapshot...');
      // Fetch snapshot
      const snapshotRes = await fetch(`${API}/dashboard/snapshot`, { headers });
      if (snapshotRes.ok) {
        const data = await snapshotRes.json();
        console.log('[Dashboard] Snapshot data:', data);
        setSnapshot(data);
      } else {
        console.error('[Dashboard] Snapshot failed:', snapshotRes.status, await snapshotRes.text());
      }

      console.log('[Dashboard] Fetching priorities...');
      // Fetch priorities
      const prioritiesRes = await fetch(`${API}/dashboard/priorities`, { headers });
      if (prioritiesRes.ok) {
        const data = await prioritiesRes.json();
        console.log('[Dashboard] Priorities data:', data);
        setPriorities(data);
      } else {
        console.error('[Dashboard] Priorities failed:', prioritiesRes.status, await prioritiesRes.text());
      }

      console.log('[Dashboard] Fetching calendar...');
      // Fetch calendar data
      const calendarRes = await fetch(`${API}/dashboard/calendar`, { headers });
      if (calendarRes.ok) {
        const data = await calendarRes.json();
        console.log('[Dashboard] Calendar data:', data);
        setCalendarData(data);
      } else {
        console.error('[Dashboard] Calendar failed:', calendarRes.status, await calendarRes.text());
      }

    } catch (error) {
      console.error('[Dashboard] Error:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPriorities = async () => {
    try {
      setRefreshing(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`${API}/dashboard/priorities/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Priorities refreshed');
        fetchDashboardData();
      } else {
        const error = await response.text();
        console.error('[Dashboard] Refresh failed:', error);
        toast.error('Failed to refresh priorities');
      }
    } catch (error) {
      console.error('[Dashboard] Refresh error:', error);
      toast.error('Failed to refresh priorities');
    } finally {
      setRefreshing(false);
    }
  };

  const handlePriorityAction = async (priorityId, action) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`${API}/dashboard/priorities/${priorityId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [action]: true })
      });

      if (response.ok) {
        toast.success(action === 'completed' ? 'Priority completed' : 'Priority dismissed');
        setPriorities(priorities.filter(p => p.id !== priorityId));
      } else {
        const error = await response.text();
        console.error('[Dashboard] Priority action failed:', error);
        toast.error('Failed to update priority');
      }
    } catch (error) {
      console.error('[Dashboard] Priority action error:', error);
      toast.error('Failed to update priority');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#000000' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(0deg, rgba(2, 0, 36, 1) 66%, rgba(9, 9, 121, 1) 100%)',
      padding: '32px',
      position: 'relative',
      overflow: 'auto'
    }}>
      {/* Dark purple-blue gradient: darker at bottom (66%), brighter blue at top (100%) */}
      <div style={{
        background: '#292929',
        border: 'none',
        borderRadius: '16px',
        padding: '32px 40px',
        marginBottom: '32px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.2), rgba(59, 130, 246, 0.2))',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0, 184, 212, 0.15)',
            border: '1px solid rgba(0, 184, 212, 0.25)'
          }}>
            <LayoutDashboard style={{ color: '#00d4ff', width: '28px', height: '28px' }} />
          </div>
          <div>
            <h1 style={{
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '8px'
            }}>
              AI Operations Dashboard
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '15px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '32px', marginBottom: '32px' }}>
        {/* Left Column - Metrics & Calendar */}
        <div>
          {/* Situational Snapshot */}
          <SnapshotCards snapshot={snapshot} navigate={navigate} />

          {/* Calendar Timeline */}
          <CalendarTimeline 
            events={calendarData.events} 
            milestones={calendarData.milestones}
            navigate={navigate}
          />
        </div>

        {/* Right Column - Priorities Panel */}
        <PrioritiesPanel 
          priorities={priorities}
          onRefresh={handleRefreshPriorities}
          onAction={handlePriorityAction}
          refreshing={refreshing}
          navigate={navigate}
        />
      </div>
    </div>
  );
};

// Situational Snapshot Cards
const SnapshotCards = ({ snapshot, navigate }) => {
  if (!snapshot) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const metrics = [
    { 
      icon: Target, 
      label: 'Active Deals', 
      value: snapshot.active_deals,
      color: '#3b82f6',
      onClick: () => navigate('/deals')
    },
    { 
      icon: Calendar, 
      label: 'Meetings Today', 
      value: snapshot.meetings_today,
      color: '#10b981',
      onClick: () => navigate('/calendar')
    },
    { 
      icon: DollarSign, 
      label: 'Pipeline Value', 
      value: formatCurrency(snapshot.total_pipeline_value),
      isLarge: true,
      color: '#f59e0b',
      onClick: () => navigate('/deals')
    },
    { 
      icon: AlertCircle, 
      label: 'Overdue Items', 
      value: snapshot.overdue_milestones,
      color: snapshot.overdue_milestones > 0 ? '#ef4444' : '#6b7280',
      onClick: () => {}
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '20px',
      marginBottom: '32px'
    }}>
      {metrics.map((metric, idx) => (
        <MetricCard key={idx} {...metric} />
      ))}
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ icon: Icon, label, value, color, isLarge, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: '#292929',
      border: 'none',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 8px 20px rgba(0, 0, 0, 0.6), 0 4px 8px ${color}20`;
      e.currentTarget.style.background = '#111111';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)';
      e.currentTarget.style.background = '#0c0c0c';
    }}
  >
    <div style={{
      width: '40px',
      height: '40px',
      background: `${color}10`,
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '16px',
      border: `1px solid ${color}20`
    }}>
      <Icon style={{ color, width: '20px', height: '20px' }} />
    </div>
    <p style={{
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '13px',
      fontWeight: '600',
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {label}
    </p>
    <p style={{
      color: '#ffffff',
      fontSize: isLarge ? '18px' : '28px',
      fontWeight: '700'
    }}>
      {value}
    </p>
  </div>
);

// Calendar Timeline Component
const CalendarTimeline = ({ events, milestones, navigate }) => {
  const allItems = [
    ...events.map(e => ({ ...e, type: 'event' })),
    ...milestones.map(m => ({ ...m, type: 'milestone' }))
  ].sort((a, b) => {
    const dateA = new Date(a.start_time || a.due_date);
    const dateB = new Date(b.start_time || b.due_date);
    return dateA - dateB;
  }).slice(0, 5);

  return (
    <div style={{
      background: '#292929',
      border: 'none',
      borderRadius: '16px',
      padding: '28px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.15), rgba(0, 184, 212, 0.08))',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(0, 184, 212, 0.2)'
        }}>
          <Calendar style={{ color: '#00b8d4', width: '18px', height: '18px' }} />
        </div>
        <h2 style={{
          color: '#ffffff',
          fontSize: '20px',
          fontWeight: '700'
        }}>
          Upcoming Events & Milestones
        </h2>
      </div>

      {allItems.length === 0 ? (
        <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
          No upcoming items scheduled
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {allItems.map((item, idx) => (
            <TimelineItem key={idx} item={item} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
};

// Timeline Item Component
const TimelineItem = ({ item, navigate }) => {
  const colors = {
    event: { primary: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    milestone: { primary: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' }
  };

  const color = colors[item.type];
  const date = new Date(item.start_time || item.due_date);
  const isOverdue = item.type === 'milestone' && date < new Date() && item.status === 'pending';

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: `1px solid ${isOverdue ? '#ef4444' : color.primary}15`,
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}
    onClick={() => item.type === 'event' ? navigate('/calendar') : null}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = color.bg;
      e.currentTarget.style.borderColor = `${color.primary}30`;
      e.currentTarget.style.transform = 'translateX(6px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
      e.currentTarget.style.borderColor = `${isOverdue ? '#ef4444' : color.primary}15`;
      e.currentTarget.style.transform = 'translateX(0)';
    }}
    >
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: isOverdue ? '#ef4444' : color.primary,
        boxShadow: `0 0 8px ${isOverdue ? '#ef4444' : color.primary}80`
      }} />
      <div style={{ flex: 1 }}>
        <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
          {isOverdue && '⚠️ '}{item.title}
        </p>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
        </p>
      </div>
      <div style={{
        padding: '6px 12px',
        background: color.bg,
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: '700',
        color: color.primary,
        textTransform: 'uppercase',
        border: `1px solid ${color.primary}20`
      }}>
        {item.type}
      </div>
    </div>
  );
};

// Priorities Panel Component
const PrioritiesPanel = ({ priorities, onRefresh, onAction, refreshing, navigate }) => {
  return (
    <div style={{
      background: '#292929',
      border: 'none',
      borderRadius: '16px',
      padding: '28px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)',
      height: 'fit-content',
      position: 'sticky',
      top: '32px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)',
            border: '1px solid rgba(139, 92, 246, 0.3)'
          }}>
            <Zap style={{ color: '#a78bfa', width: '20px', height: '20px' }} />
          </div>
          <div>
            <h2 style={{
              color: '#ffffff',
              fontSize: '18px',
              fontWeight: '700'
            }}>
              Today's Priorities
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
              {priorities.length} action items
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          style={{
            width: '36px',
            height: '36px',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
          }}
        >
          <RefreshCw 
            style={{ 
              color: '#a78bfa', 
              width: '16px', 
              height: '16px',
              animation: refreshing ? 'spin 1s linear infinite' : 'none'
            }} 
          />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {priorities.length === 0 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '14px'
          }}>
            <CheckCircle2 style={{ width: '32px', height: '32px', margin: '0 auto 12px', opacity: 0.5 }} />
            All caught up! Check back later for new priorities.
          </div>
        ) : (
          priorities.map((priority, idx) => (
            <PriorityCard 
              key={priority.id} 
              priority={priority} 
              onAction={onAction}
              navigate={navigate}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Priority Card Component
const PriorityCard = ({ priority, onAction, navigate }) => {
  const levelColors = {
    critical: { primary: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    high: { primary: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    medium: { primary: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    low: { primary: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' }
  };

  const color = levelColors[priority.priority_level];

  const handleClick = () => {
    if (priority.related_deal) {
      navigate(`/deals/${priority.related_deal.id}`);
    } else if (priority.related_contact) {
      navigate('/contacts');
    }
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: `1px solid ${color.primary}15`,
      borderRadius: '14px',
      padding: '18px',
      transition: 'all 0.3s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = `${color.primary}08`;
      e.currentTarget.style.borderColor = `${color.primary}30`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
      e.currentTarget.style.borderColor = `${color.primary}15`;
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
        <div style={{
          padding: '4px 8px',
          background: color.bg,
          borderRadius: '6px',
          fontSize: '10px',
          fontWeight: '700',
          color: color.primary,
          textTransform: 'uppercase',
          border: `1px solid ${color.primary}20`
        }}>
          {priority.priority_level}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onAction(priority.id, 'completed')}
            style={{
              width: '28px',
              height: '28px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
            }}
          >
            <Check style={{ color: '#10b981', width: '14px', height: '14px' }} />
          </button>
          <button
            onClick={() => onAction(priority.id, 'dismissed')}
            style={{
              width: '28px',
              height: '28px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
          >
            <X style={{ color: '#ef4444', width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>
      
      <p onClick={handleClick} style={{
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: '600',
        marginBottom: '8px',
        lineHeight: '1.4',
        cursor: priority.related_deal || priority.related_contact ? 'pointer' : 'default'
      }}>
        {priority.title}
      </p>
      
      {priority.description && (
        <p style={{
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '12px',
          marginBottom: '12px',
          lineHeight: '1.4'
        }}>
          {priority.description}
        </p>
      )}

      {priority.related_deal && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(0, 184, 212, 0.1)',
          border: '1px solid rgba(0, 184, 212, 0.2)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer'
        }}
        onClick={handleClick}
        >
          <MapPin style={{ color: '#00b8d4', width: '12px', height: '12px' }} />
          <span style={{ color: '#00d4ff', fontSize: '11px', fontWeight: '600' }}>
            {priority.related_deal.title}
          </span>
        </div>
      )}
    </div>
  );
};

export default AIDashboard;
