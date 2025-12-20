import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, API } from '../App';
import { supabase } from '../supabaseClient';
import { useCapabilities } from '../contexts/CapabilitiesContext';
import { 
  LayoutDashboard, TrendingUp, Calendar, AlertCircle, 
  CheckCircle2, Clock, DollarSign, Target, Zap, 
  ArrowRight, Activity, RefreshCw, X, Check, MapPin,
  Eye, MessageCircle, FileText, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const CommandCenter = () => {
  const [snapshot, setSnapshot] = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [calendarData, setCalendarData] = useState({ events: [], milestones: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useContext(AuthContext);
  const { capabilities } = useCapabilities();
  const navigate = useNavigate();

  useEffect(() => {
    if (capabilities) {
      fetchDashboardData();
    }
  }, [capabilities]);

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const token = session.access_token;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch based on role
      if (capabilities.primary_role === 'broker') {
        // Broker: Use existing AI Dashboard endpoints
        const snapshotRes = await fetch(`${API}/dashboard/snapshot`, { headers });
        if (snapshotRes.ok) setSnapshot(await snapshotRes.json());

        const prioritiesRes = await fetch(`${API}/dashboard/priorities`, { headers });
        if (prioritiesRes.ok) setPriorities(await prioritiesRes.json());

        const calendarRes = await fetch(`${API}/dashboard/calendar`, { headers });
        if (calendarRes.ok) setCalendarData(await calendarRes.json());
      } else if (capabilities.primary_role === 'seller') {
        // Seller: Fetch listing performance data
        // TODO: Create /api/dashboard/seller-metrics endpoint
        setSnapshot({
          active_listings: 0,
          total_views: 0,
          total_inquiries: 0,
          pending_offers: 0
        });
      } else {
        // Buyer: Fetch buyer activity data
        // TODO: Create /api/dashboard/buyer-metrics endpoint
        setSnapshot({
          saved_deals: 0,
          active_conversations: 0,
          new_matches: 0,
          offers_pending: 0
        });
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPriorities = async () => {
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API}/dashboard/priorities/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      toast.success('Priorities refreshed');
      fetchDashboardData();
    } catch (error) {
      toast.error('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const handlePriorityAction = async (priorityId, action) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API}/dashboard/priorities/${priorityId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [action]: true })
      });
      toast.success(action === 'completed' ? 'Completed' : 'Dismissed');
      setPriorities(priorities.filter(p => p.id !== priorityId));
    } catch (error) {
      toast.error('Action failed');
    }
  };

  if (loading || !capabilities) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: '#000000' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Get dashboard title based on role
  const getDashboardTitle = () => {
    switch (capabilities.primary_role) {
      case 'broker': return 'AI Operations Dashboard';
      case 'seller': return 'Listing Performance Center';
      case 'buyer': return 'Investment Command Center';
      default: return 'Dashboard';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#130F40',
      backgroundImage: 'radial-gradient(circle, rgba(19, 15, 64, 1) 0%, rgba(0, 0, 0, 1) 100%)',
      padding: '32px',
      position: 'relative',
      overflow: 'auto'
    }}>
      {/* Header Card - Preserving Original Glassmorphism */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '32px 40px',
        marginBottom: '32px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
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
              {getDashboardTitle()}
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '15px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid - Preserving Original Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '32px', marginBottom: '32px' }}>
        {/* Left Column - Role-Adaptive Widgets */}
        <div>
          {/* Snapshot Cards - Content swaps based on role */}
          {capabilities.primary_role === 'broker' && <BrokerSnapshotCards snapshot={snapshot} navigate={navigate} />}
          {capabilities.primary_role === 'seller' && <SellerSnapshotCards snapshot={snapshot} navigate={navigate} />}
          {capabilities.primary_role === 'buyer' && <BuyerSnapshotCards snapshot={snapshot} navigate={navigate} />}

          {/* Calendar Timeline - Universal but role-scoped */}
          <CalendarTimeline 
            events={calendarData.events} 
            milestones={calendarData.milestones}
            navigate={navigate}
            role={capabilities.primary_role}
          />
        </div>

        {/* Right Column - Role-Adaptive Priorities */}
        {capabilities.primary_role === 'broker' && (
          <PrioritiesPanel 
            priorities={priorities}
            onRefresh={handleRefreshPriorities}
            onAction={handlePriorityAction}
            refreshing={refreshing}
            navigate={navigate}
          />
        )}
        {capabilities.primary_role === 'seller' && <SellerPrioritiesPanel navigate={navigate} />}
        {capabilities.primary_role === 'buyer' && <BuyerPrioritiesPanel navigate={navigate} />}
      </div>
    </div>
  );
};

// ============================================
// BROKER WIDGETS (Original AI Dashboard Logic)
// ============================================

const BrokerSnapshotCards = ({ snapshot, navigate }) => {
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
      value: snapshot.active_deals || 0,
      color: '#3b82f6',
      onClick: () => navigate('/workspace/deals')
    },
    { 
      icon: Calendar, 
      label: 'Meetings Today', 
      value: snapshot.meetings_today || 0,
      color: '#10b981',
      onClick: () => navigate('/workspace/calendar')
    },
    { 
      icon: DollarSign, 
      label: 'Pipeline Value', 
      value: formatCurrency(snapshot.total_pipeline_value || 0),
      isLarge: true,
      color: '#f59e0b',
      onClick: () => navigate('/workspace/deals')
    },
    { 
      icon: AlertCircle, 
      label: 'Overdue Items', 
      value: snapshot.overdue_milestones || 0,
      color: (snapshot.overdue_milestones || 0) > 0 ? '#ef4444' : '#6b7280',
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

// ============================================
// SELLER WIDGETS (Listing Performance Focus)
// ============================================

const SellerSnapshotCards = ({ snapshot, navigate }) => {
  const metrics = [
    { 
      icon: FileText, 
      label: 'Active Listings', 
      value: snapshot?.active_listings || 0,
      color: '#00d4aa',
      onClick: () => navigate('/workspace/deals')
    },
    { 
      icon: Eye, 
      label: 'Total Views', 
      value: snapshot?.total_views || 0,
      color: '#3b82f6',
      onClick: () => {}
    },
    { 
      icon: MessageCircle, 
      label: 'Inquiries', 
      value: snapshot?.total_inquiries || 0,
      color: '#a78bfa',
      onClick: () => {}
    },
    { 
      icon: DollarSign, 
      label: 'Pending Offers', 
      value: snapshot?.pending_offers || 0,
      color: '#f59e0b',
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

// ============================================
// BUYER WIDGETS (Investment Activity Focus)
// ============================================

const BuyerSnapshotCards = ({ snapshot, navigate }) => {
  const metrics = [
    { 
      icon: Target, 
      label: 'Saved Deals', 
      value: snapshot?.saved_deals || 0,
      color: '#a78bfa',
      onClick: () => navigate('/marketplace/saved')
    },
    { 
      icon: MessageCircle, 
      label: 'Active Conversations', 
      value: snapshot?.active_conversations || 0,
      color: '#00b8d4',
      onClick: () => {}
    },
    { 
      icon: Bell, 
      label: 'New Matches', 
      value: snapshot?.new_matches || 0,
      color: '#10b981',
      onClick: () => navigate('/marketplace')
    },
    { 
      icon: DollarSign, 
      label: 'Offers Pending', 
      value: snapshot?.offers_pending || 0,
      color: '#f59e0b',
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

// ============================================
// SHARED COMPONENTS (Preserving Original UI)
// ============================================

// Metric Card - Exact replica of original AI Dashboard styling
const MetricCard = ({ icon: Icon, label, value, color, isLarge, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 12px 40px rgba(0, 0, 0, 0.4), 0 4px 12px ${color}25, inset 0 1px 0 rgba(255, 255, 255, 0.12)`;
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
      e.currentTarget.style.borderColor = `${color}40`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
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

// Calendar Timeline - Universal with role-scoped events
const CalendarTimeline = ({ events, milestones, navigate, role }) => {
  const allItems = [
    ...(events || []).map(e => ({ ...e, type: 'event' })),
    ...(milestones || []).map(m => ({ ...m, type: 'milestone' }))
  ].sort((a, b) => {
    const dateA = new Date(a.start_time || a.due_date);
    const dateB = new Date(b.start_time || b.due_date);
    return dateA - dateB;
  }).slice(0, 5);

  const getTimelineTitle = () => {
    switch (role) {
      case 'broker': return 'Upcoming Events & Milestones';
      case 'seller': return 'Listing Deadlines & Actions';
      case 'buyer': return 'Upcoming Tours & Deadlines';
      default: return 'Upcoming Events';
    }
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '28px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
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
          {getTimelineTitle()}
        </h2>
      </div>

      {allItems.length === 0 ? (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: '14px'
        }}>
          No upcoming events
        </div>
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

// Timeline Item - Preserving original styling
const TimelineItem = ({ item, navigate }) => {
  const isEvent = item.type === 'event';
  const date = new Date(item.start_time || item.due_date);
  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <div
      onClick={() => isEvent ? navigate('/workspace/calendar') : navigate('/workspace/deals')}
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
        e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isToday ? '#00b8d4' : 'rgba(255, 255, 255, 0.3)',
          boxShadow: isToday ? '0 0 10px #00b8d4' : 'none'
        }} />
        <div style={{ flex: 1 }}>
          <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            {item.title || item.description}
          </p>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <ArrowRight size={16} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
      </div>
    </div>
  );
};

// ============================================
// BROKER PRIORITIES PANEL (Original)
// ============================================

const PrioritiesPanel = ({ priorities, onRefresh, onAction, refreshing, navigate }) => {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '28px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      height: 'fit-content',
      position: 'sticky',
      top: '32px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08))',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(139, 92, 246, 0.2)'
          }}>
            <Zap style={{ color: '#a78bfa', width: '18px', height: '18px' }} />
          </div>
          <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
            AI Priorities
          </h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          style={{
            background: 'rgba(0, 184, 212, 0.1)',
            border: '1px solid rgba(0, 184, 212, 0.2)',
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#00b8d4',
            fontSize: '13px',
            fontWeight: '600',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Priority Items */}
      {(!priorities || priorities.length === 0) ? (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: '14px'
        }}>
          No priorities at the moment
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {priorities.slice(0, 8).map((priority) => (
            <PriorityItem key={priority.id} priority={priority} onAction={onAction} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
};

const PriorityItem = ({ priority, onAction, navigate }) => {
  const urgencyColors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981'
  };
  const color = urgencyColors[priority.urgency] || '#6b7280';

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: `1px solid ${color}15`,
      borderRadius: '10px',
      padding: '16px',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: color,
          marginTop: '6px',
          boxShadow: `0 0 8px ${color}`
        }} />
        <div style={{ flex: 1 }}>
          <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
            {priority.title}
          </p>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', lineHeight: '1.5' }}>
            {priority.description}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onAction(priority.id, 'completed')}
          style={{
            flex: 1,
            padding: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '6px',
            color: '#10b981',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <Check size={14} /> Done
        </button>
        <button
          onClick={() => onAction(priority.id, 'dismissed')}
          style={{
            padding: '8px',
            background: 'rgba(107, 114, 128, 0.1)',
            border: '1px solid rgba(107, 114, 128, 0.2)',
            borderRadius: '6px',
            color: '#9ca3af',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

// ============================================
// SELLER PRIORITIES PANEL
// ============================================

const SellerPrioritiesPanel = ({ navigate }) => {
  const priorities = [
    { title: 'Respond to Inquiry', description: 'Buyer interested in 123 Main St', urgency: 'high' },
    { title: 'Upload Missing Documents', description: 'Add lease agreement for verification', urgency: 'medium' }
  ];

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '28px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      height: 'fit-content',
      position: 'sticky',
      top: '32px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.15), rgba(0, 212, 170, 0.08))',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(0, 212, 170, 0.2)'
        }}>
          <Bell style={{ color: '#00d4aa', width: '18px', height: '18px' }} />
        </div>
        <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
          Action Required
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {priorities.map((priority, idx) => (
          <div key={idx} style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '16px'
          }}>
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>{priority.title}</p>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>{priority.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// BUYER PRIORITIES PANEL
// ============================================

const BuyerPrioritiesPanel = ({ navigate }) => {
  const priorities = [
    { title: 'New Deal Matches', description: '3 new deals match your buy box', urgency: 'medium', action: () => navigate('/marketplace') },
    { title: 'Offer Deadline', description: 'Respond to counteroffer by Friday', urgency: 'high' }
  ];

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '28px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      height: 'fit-content',
      position: 'sticky',
      top: '32px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(167, 139, 250, 0.08))',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(167, 139, 250, 0.2)'
        }}>
          <Target style={{ color: '#a78bfa', width: '18px', height: '18px' }} />
        </div>
        <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
          Opportunities
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {priorities.map((priority, idx) => (
          <div 
            key={idx} 
            onClick={priority.action}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '16px',
              cursor: 'pointer'
            }}
          >
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>{priority.title}</p>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>{priority.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommandCenter;
