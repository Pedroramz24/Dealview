import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { 
  Sparkles, TrendingUp, Users, Calendar, AlertCircle, 
  CheckCircle2, Clock, DollarSign, FileText, Target,
  Zap, ArrowRight, Bell, Newspaper, Activity, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalDeals: 0,
    activeDeals: 0,
    underContract: 0,
    totalValue: 0,
    avgDealSize: 0,
    newContactsThisWeek: 0,
    deals: []
  });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [newsArticles, setNewsArticles] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user: fetchedUser } } = await supabase.auth.getUser();
      
      if (!fetchedUser) {
        console.log('No user authenticated');
        setLoading(false);
        return;
      }

      console.log('Fetching dashboard data for user:', fetchedUser.id);
      setCurrentUser(fetchedUser);

    try {
      // Fetch deals
      console.log('Fetching deals...');
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .eq('owner_id', fetchedUser.id);

      if (dealsError) {
        console.error('Deals error:', dealsError);
        throw dealsError;
      }
      console.log('Deals fetched:', deals?.length || 0);

      // Ensure deals is an array
      const dealsArray = deals || [];

      // Fetch contacts
      console.log('Fetching contacts...');
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('owner_id', fetchedUser.id);

      if (contactsError) {
        console.error('Contacts error:', contactsError);
        throw contactsError;
      }
      console.log('Contacts fetched:', contactsData?.length || 0);
      setContacts(contactsData || []);

      // Fetch calendar events
      console.log('Fetching calendar events...');
      const { data: calendarEvents } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('owner_id', fetchedUser.id)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(5);

      console.log('Calendar events fetched:', calendarEvents?.length || 0);

      console.log('Calculating statistics...');
      // Calculate statistics
      const totalValue = dealsArray.reduce((sum, deal) => sum + (parseFloat(deal.price) || 0), 0);
      const activeDeals = dealsArray.filter(d => d.stage !== 'closed_won' && d.stage !== 'overpriced').length;
      const underContract = dealsArray.filter(d => d.stage === 'under_contract').length;
      
      // New contacts this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const newContactsThisWeek = (contactsData || []).filter(c => 
        c.created_at && new Date(c.created_at) >= oneWeekAgo
      ).length;

      console.log('Stats calculated:', { totalDeals: dealsArray.length, activeDeals, underContract, totalValue });

      setStats({
        totalDeals: dealsArray.length,
        activeDeals,
        underContract,
        totalValue,
        avgDealSize: dealsArray.length > 0 ? totalValue / dealsArray.length : 0,
        newContactsThisWeek,
        deals: dealsArray
      });

      // Process upcoming events
      console.log('Processing events...');
      const eventsWithDeals = await Promise.all((calendarEvents || []).map(async (event) => {
        if (event.related_deal_id) {
          const { data: dealData } = await supabase
            .from('deals')
            .select('address, price')
            .eq('id', event.related_deal_id)
            .single();
          return { ...event, dealData };
        }
        return event;
      }));

      setUpcomingEvents(eventsWithDeals);
      console.log('Events processed:', eventsWithDeals.length);

      // Generate AI insights
      console.log('Generating AI insights...');
      generateAIInsights(dealsArray, contactsData || [], calendarEvents || []);

      // Fetch market news
      console.log('Fetching market news...');
      fetchMarketNews();

      console.log('Dashboard data loaded successfully!');

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error details:', error.message, error.stack);
      toast.error(`Failed to load dashboard data: ${error.message}`);
      
      // Set empty state to prevent rendering errors
      setStats({
        totalDeals: 0,
        activeDeals: 0,
        underContract: 0,
        totalValue: 0,
        avgDealSize: 0,
        newContactsThisWeek: 0,
        deals: []
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = (deals, contacts, events) => {
    const insights = [];

    // Check for overdue follow-ups
    const today = new Date();
    contacts.forEach(contact => {
      if (contact.next_action) {
        const nextAction = new Date(contact.next_action);
        const daysDiff = Math.floor((today - nextAction) / (1000 * 60 * 60 * 24));
        if (daysDiff > 0) {
          insights.push({
            type: 'warning',
            icon: AlertCircle,
            color: '#f59e0b',
            message: `You haven't followed up with ${contact.full_name} in ${daysDiff} days.`,
            action: () => navigate('/contacts'),
            actionLabel: 'View Contact'
          });
        }
      }
    });

    // Check for upcoming deadlines
    events.forEach(event => {
      const eventDate = new Date(event.start_date);
      const daysDiff = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1 && event.event_type === 'deadline') {
        insights.push({
          type: 'urgent',
          icon: Clock,
          color: '#ef4444',
          message: `${event.title} is due tomorrow.`,
          action: () => navigate('/calendar'),
          actionLabel: 'View Calendar'
        });
      }
    });

    // Check for untouched leads
    const untouchedLeads = deals.filter(d => 
      d.stage === 'need_to_contact' || 
      (d.stage === 'prospect' && !d.last_contact_date)
    );
    if (untouchedLeads.length > 0) {
      insights.push({
        type: 'info',
        icon: Target,
        color: '#3b82f6',
        message: `${untouchedLeads.length} leads in your pipeline haven't been contacted.`,
        action: () => navigate('/pipeline'),
        actionLabel: 'View Pipeline'
      });
    }

    // Check for deals under contract
    const underContractDeals = deals.filter(d => d.stage === 'under_contract');
    if (underContractDeals.length > 0) {
      insights.push({
        type: 'success',
        icon: CheckCircle2,
        color: '#10b981',
        message: `You have ${underContractDeals.length} deal${underContractDeals.length > 1 ? 's' : ''} under contract. Keep the momentum!`,
        action: () => navigate('/pipeline'),
        actionLabel: 'Track Progress'
      });
    }

    // Performance insight (placeholder for now - could calculate from historical data)
    if (deals.length > 5) {
      insights.push({
        type: 'insight',
        icon: Activity,
        color: '#8b5cf6',
        message: `Your pipeline value is ${formatCurrency(deals.reduce((sum, d) => sum + (d.price || 0), 0))}. ${deals.length} active opportunities.`,
        action: () => navigate('/deals'),
        actionLabel: 'View Deals'
      });
    }

    setAiInsights(insights.slice(0, 6)); // Limit to 6 insights
  };

  const formatCurrency = (value) => {


  const fetchMarketNews = async () => {
    try {
      // Fetch news from backend API
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/dashboard/news`);
      
      if (response.ok) {
        const data = await response.json();
        setNewsArticles(data.articles || []);
      }
    } catch (error) {
      console.log('News feed not available yet:', error);
      // Set placeholder news
      setNewsArticles([]);
    }
  };

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const getUserFirstName = () => {
    if (currentUser?.user_metadata?.full_name) {
      return currentUser.user_metadata.full_name.split(' ')[0];
    }
    return 'there';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'var(--bg-base)' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      padding: '32px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background gradients */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle at 20% 20%, rgba(0, 184, 212, 0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.03) 0%, transparent 50%)',
        animation: 'float-gradient 20s ease-in-out infinite',
        pointerEvents: 'none',
        opacity: 0.6
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1800px', margin: '0 auto' }}>
        {/* AI Greeting Header */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(0, 184, 212, 0.06), rgba(59, 130, 246, 0.04))',
          border: '1px solid rgba(0, 184, 212, 0.15)',
          borderRadius: '20px',
          padding: '32px 40px',
          marginBottom: '32px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 184, 212, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle glow effect */}
          <div style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(0, 184, 212, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
            opacity: 0.5
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.2), rgba(59, 130, 246, 0.2))',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0, 184, 212, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              animation: 'pulse 3s ease-in-out infinite',
              border: '1px solid rgba(0, 184, 212, 0.25)'
            }}>
              <Sparkles style={{ color: '#00d4ff', width: '28px', height: '28px' }} />
            </div>
            <div>
              <h1 style={{
                color: '#ffffff',
                fontSize: '28px',
                fontWeight: '700',
                marginBottom: '8px',
                letterSpacing: '-0.02em'
              }}>
                Good {getTimeOfDay()}, {getUserFirstName()} — here's what's on your radar today
              </h1>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '15px',
                fontWeight: '500'
              }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '32px' }}>
          {/* Left Column */}
          <div>
            {/* Key Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '20px',
              marginBottom: '32px'
            }}>
              <MetricCard
                icon={Target}
                label="Active Deals"
                value={stats?.activeDeals || 0}
                color="#3b82f6"
                bgColor="rgba(59, 130, 246, 0.1)"
              />
              <MetricCard
                icon={CheckCircle2}
                label="Under Contract"
                value={stats?.underContract || 0}
                color="#10b981"
                bgColor="rgba(16, 185, 129, 0.1)"
              />
              <MetricCard
                icon={DollarSign}
                label="Pipeline Value"
                value={formatCurrency(stats?.totalValue || 0)}
                isLarge
                color="#f59e0b"
                bgColor="rgba(245, 158, 11, 0.1)"
              />
              <MetricCard
                icon={Users}
                label="New Contacts This Week"
                value={stats?.newContactsThisWeek || 0}
                color="#8b5cf6"
                bgColor="rgba(139, 92, 246, 0.1)"
              />
            </div>

            {/* Timeline Module */}
            <TimelineModule events={upcomingEvents} />

            {/* Market News Feed */}
            <NewsModule articles={newsArticles} />
          </div>

          {/* Right Column - AI Assistant Panel */}
          <AIAssistantPanel insights={aiInsights} />
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ icon: Icon, label, value, color, bgColor, isLarge }) => (
  <div style={{
    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transform: 'translateZ(0)'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px) translateZ(0)';
    e.currentTarget.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.4), 0 12px 32px ${color}15, inset 0 1px 0 rgba(255, 255, 255, 0.08)`;
    e.currentTarget.style.borderColor = `${color}20`;
    e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03))';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0) translateZ(0)';
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.03)';
    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
    e.currentTarget.style.background = 'linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))';
  }}
  >
    {/* Subtle glow accent */}
    <div style={{
      position: 'absolute',
      top: '-30%',
      right: '-30%',
      width: '60%',
      height: '60%',
      background: `radial-gradient(circle, ${color}08 0%, transparent 70%)`,
      pointerEvents: 'none',
      opacity: 0.6
    }} />
    
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{
        width: '40px',
        height: '40px',
        background: bgColor,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px',
        border: `1px solid ${color}20`,
        boxShadow: `0 2px 8px ${color}10, inset 0 1px 0 rgba(255, 255, 255, 0.05)`
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
        fontWeight: '700',
        letterSpacing: '-0.02em',
        transition: 'all 0.3s ease'
      }}>
        {value}
      </p>
    </div>
  </div>
);

// Timeline Module Component
const TimelineModule = ({ events }) => (
  <div style={{
    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '20px',
    padding: '28px',
    marginBottom: '32px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 12px 28px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
    transition: 'all 0.3s ease'
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
        border: '1px solid rgba(0, 184, 212, 0.2)',
        boxShadow: '0 2px 8px rgba(0, 184, 212, 0.1)'
      }}>
        <Calendar style={{ color: '#00b8d4', width: '18px', height: '18px' }} />
      </div>
      <h2 style={{
        color: '#ffffff',
        fontSize: '20px',
        fontWeight: '700',
        letterSpacing: '-0.01em'
      }}>
        Upcoming Events & Milestones
      </h2>
    </div>

    {events.length === 0 ? (
      <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
        No upcoming events scheduled
      </p>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {events.map((event, idx) => (
          <EventItem key={idx} event={event} index={idx} />
        ))}
      </div>
    )}
  </div>
);

// Event Item Component
const EventItem = ({ event, index }) => {
  const eventColors = {
    deal: { primary: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    followup: { primary: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    deadline: { primary: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
    meeting: { primary: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
    task: { primary: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' }
  };

  const color = eventColors[event.event_type] || eventColors.task;
  const eventDate = new Date(event.start_date);

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: `1px solid ${color.primary}15`,
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
      animation: `fadeSlideIn 0.4s ease-out ${index * 0.1}s both`,
      transform: 'translateZ(0)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = color.bg;
      e.currentTarget.style.borderColor = `${color.primary}30`;
      e.currentTarget.style.transform = 'translateX(6px) translateZ(0)';
      e.currentTarget.style.boxShadow = `0 2px 8px ${color.primary}10, 0 6px 16px rgba(0, 0, 0, 0.2)`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
      e.currentTarget.style.borderColor = `${color.primary}15`;
      e.currentTarget.style.transform = 'translateX(0) translateZ(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';
    }}
    >
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: color.primary,
        boxShadow: `0 0 8px ${color.primary}80, 0 0 3px ${color.primary}`
      }} />
      <div style={{ flex: 1 }}>
        <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
          {event.title}
        </p>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
          {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
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
        {event.event_type}
      </div>
    </div>
  );
};

// News Module Component
const NewsModule = ({ articles }) => (
  <div style={{
    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '20px',
    padding: '28px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 12px 28px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.04)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
      <div style={{
        width: '36px',
        height: '36px',
        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(249, 115, 22, 0.08))',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(249, 115, 22, 0.2)',
        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.1)'
      }}>
        <Newspaper style={{ color: '#f97316', width: '18px', height: '18px' }} />
      </div>
      <h2 style={{
        color: '#ffffff',
        fontSize: '20px',
        fontWeight: '700',
        letterSpacing: '-0.01em'
      }}>
        Market Updates
      </h2>
    </div>
    
    {articles.length === 0 ? (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        background: 'rgba(249, 115, 22, 0.04)',
        border: '1px solid rgba(249, 115, 22, 0.1)',
        borderRadius: '12px'
      }}>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', marginBottom: '12px' }}>
          Market news feed coming soon
        </p>
        <p style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px' }}>
          Connect a news API to display commercial real estate updates from CoStar, Bloomberg, and industry sources
        </p>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {articles.slice(0, 5).map((article, idx) => (
          <NewsArticle key={idx} article={article} index={idx} />
        ))}
      </div>
    )}
  </div>
);

// News Article Component
const NewsArticle = ({ article, index }) => (
  <a
    href={article.url}
    target="_blank"
    rel="noopener noreferrer"
    style={{
      display: 'block',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(249, 115, 22, 0.1)',
      borderRadius: '12px',
      padding: '16px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      textDecoration: 'none',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
      animation: `fadeSlideIn 0.4s ease-out ${index * 0.1}s both`,
      transform: 'translateZ(0)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(249, 115, 22, 0.06)';
      e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.25)';
      e.currentTarget.style.transform = 'translateX(6px) translateZ(0)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(249, 115, 22, 0.1), 0 6px 16px rgba(0, 0, 0, 0.2)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
      e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.1)';
      e.currentTarget.style.transform = 'translateX(0) translateZ(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
      <div style={{ flex: 1 }}>
        <h3 style={{
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '6px',
          lineHeight: '1.4'
        }}>
          {article.title}
        </h3>
        <p style={{
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '12px',
          marginBottom: '8px',
          lineHeight: '1.4'
        }}>
          {article.description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            color: '#f97316',
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase'
          }}>
            {article.source}
          </span>
          <span style={{
            color: 'rgba(255, 255, 255, 0.3)',
            fontSize: '11px'
          }}>
            {article.publishedAt}
          </span>
        </div>
      </div>
      <ExternalLink style={{ color: 'rgba(249, 115, 22, 0.5)', width: '16px', height: '16px', flexShrink: 0 }} />
    </div>
  </a>
);

// AI Assistant Panel Component
const AIAssistantPanel = ({ insights }) => (
  <div style={{
    background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.06), rgba(59, 130, 246, 0.04))',
    border: '1px solid rgba(139, 92, 246, 0.15)',
    borderRadius: '20px',
    padding: '28px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 12px 32px rgba(139, 92, 246, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    height: 'fit-content',
    position: 'sticky',
    top: '32px',
    transition: 'all 0.3s ease'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
      <div style={{
        width: '40px',
        height: '40px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        animation: 'pulse 2s ease-in-out infinite',
        border: '1px solid rgba(139, 92, 246, 0.3)'
      }}>
        <Zap style={{ color: '#a78bfa', width: '20px', height: '20px' }} />
      </div>
      <div>
        <h2 style={{
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: '700',
          letterSpacing: '-0.01em'
        }}>
          AI Assistant
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
          Intelligent insights & actions
        </p>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {insights.length === 0 ? (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: '14px'
        }}>
          <Sparkles style={{ width: '32px', height: '32px', margin: '0 auto 12px', opacity: 0.5 }} />
          Everything's looking good! Check back later for new insights.
        </div>
      ) : (
        insights.map((insight, idx) => (
          <InsightCard key={idx} insight={insight} index={idx} />
        ))
      )}
    </div>
  </div>
);

// Insight Card Component
const InsightCard = ({ insight, index }) => {
  const Icon = insight.icon;
  
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: `1px solid ${insight.color}15`,
      borderRadius: '14px',
      padding: '18px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
      animation: `fadeSlideIn 0.4s ease-out ${index * 0.1}s both`,
      transform: 'translateZ(0)'
    }}
    onClick={insight.action}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = `${insight.color}08`;
      e.currentTarget.style.borderColor = `${insight.color}30`;
      e.currentTarget.style.transform = 'translateX(4px) translateZ(0)';
      e.currentTarget.style.boxShadow = `0 2px 8px ${insight.color}15, 0 6px 16px rgba(0, 0, 0, 0.2)`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
      e.currentTarget.style.borderColor = `${insight.color}15`;
      e.currentTarget.style.transform = 'translateX(0) translateZ(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';
    }}
    >
      <div style={{ display: 'flex', gap: '14px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: `${insight.color}10`,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: `1px solid ${insight.color}20`,
          boxShadow: `0 2px 6px ${insight.color}08`
        }}>
          <Icon style={{ color: insight.color, width: '18px', height: '18px' }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: '500',
            lineHeight: '1.5',
            marginBottom: '8px'
          }}>
            {insight.message}
          </p>
          <button style={{
            background: 'transparent',
            border: 'none',
            color: insight.color,
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.gap = '8px';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.gap = '6px';
          }}
          >
            {insight.actionLabel}
            <ArrowRight style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
