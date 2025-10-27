import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { supabase } from '../supabaseClient';
import { Calendar as CalendarIcon, List, Clock, Filter, Plus, X, CheckCircle, Edit2, ExternalLink, ChevronLeft, ChevronRight, MapPin, DollarSign, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

// Event type colors matching the design requirements - vibrant colors for dark theme
const EVENT_COLORS = {
  milestone: '#10b981', // Green - Deal milestones
  follow_up: '#3b82f6', // Blue - Contact follow-ups
  general: '#a855f7',   // Purple - General tasks
  meeting: '#f97316',   // Orange - Team/meeting events
  reminder: '#8b5cf6',  // Purple - Reminders
  closing: '#10b981',   // Green - Closings
  earnest: '#f59e0b'    // Yellow - Earnest money
};

const CalendarView = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month'); // 'month', 'week', 'day', 'agenda'
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventPanel, setShowEventPanel] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Filters
  const [activeFilters, setActiveFilters] = useState({
    allEvents: true,
    closingsThisMonth: false,
    followUpsDueToday: false,
    earnestMoneyDeadlines: false
  });

  // Fetch all calendar events from multiple sources
  const fetchCalendarEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[Calendar] No user found');
        setLoading(false);
        return;
      }

      console.log('[Calendar] Fetching events for user:', user.id);
      const aggregatedEvents = [];

      // Fetch standalone calendar events (if table exists)
      try {
        const { data: calendarEvents, error: calendarError } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('owner_id', user.id);

        if (!calendarError && calendarEvents) {
          console.log('[Calendar] Loaded', calendarEvents.length, 'calendar events');
          calendarEvents.forEach(event => {
            aggregatedEvents.push({
              id: event.id,
              title: event.title,
              start: new Date(event.start_date),
              end: event.end_date ? new Date(event.end_date) : new Date(event.start_date),
              allDay: event.all_day || false,
              type: event.event_type,
              color: event.color || EVENT_COLORS[event.event_type] || EVENT_COLORS.general,
              description: event.description,
              status: event.status,
              relatedDealId: event.related_deal_id,
              relatedContactId: event.related_contact_id,
              source: 'calendar_events',
              sourceData: event
            });
          });
        } else if (calendarError) {
          console.warn('[Calendar] Calendar events table might not exist yet:', calendarError.message);
        }
      } catch (err) {
        console.warn('[Calendar] Error fetching calendar events:', err.message);
      }

      // Fetch deals with date fields
      try {
        const { data: deals, error: dealsError } = await supabase
          .from('deals')
          .select('*')
          .eq('owner_id', user.id);

        if (!dealsError && deals) {
          console.log('[Calendar] Processing', deals.length, 'deals for calendar events');
          
          deals.forEach(deal => {
            // Closing Date
            if (deal.target_close_date) {
              aggregatedEvents.push({
                id: `deal-closing-${deal.id}`,
                title: `🏁 Closing: ${deal.address || deal.title}`,
                start: new Date(deal.target_close_date),
                end: new Date(deal.target_close_date),
                allDay: true,
                type: 'closing',
                color: EVENT_COLORS.closing,
                dealId: deal.id,
                dealData: deal,
                source: 'deal',
                milestoneType: 'closing'
              });
            }

            // Next Action Date
            if (deal.next_action_date) {
              aggregatedEvents.push({
                id: `deal-action-${deal.id}`,
                title: `📋 ${deal.next_action || 'Follow-up'}: ${deal.address || deal.title}`,
                start: new Date(deal.next_action_date),
                end: new Date(deal.next_action_date),
                allDay: true,
                type: 'follow_up',
                color: EVENT_COLORS.follow_up,
                dealId: deal.id,
                dealData: deal,
                source: 'deal'
              });
            }

            // Earnest Money (if new field exists)
            if (deal.earnest_money_deadline) {
              aggregatedEvents.push({
                id: `deal-earnest-${deal.id}`,
                title: `💰 Earnest Money Due: ${deal.address || deal.title}`,
                start: new Date(deal.earnest_money_deadline),
                end: new Date(deal.earnest_money_deadline),
                allDay: true,
                type: 'earnest',
                color: EVENT_COLORS.earnest,
                dealId: deal.id,
                dealData: deal,
                source: 'deal',
                milestoneType: 'earnest_money'
              });
            }

            // Other milestones (if new fields exist)
            if (deal.feasibility_end_date) {
              aggregatedEvents.push({
                id: `deal-feasibility-${deal.id}`,
                title: `🔍 Feasibility Ends: ${deal.address || deal.title}`,
                start: new Date(deal.feasibility_end_date),
                end: new Date(deal.feasibility_end_date),
                allDay: true,
                type: 'milestone',
                color: EVENT_COLORS.milestone,
                dealId: deal.id,
                dealData: deal,
                source: 'deal'
              });
            }
          });
        }
      } catch (err) {
        console.error('[Calendar] Error fetching deals:', err);
      }

      // Fetch contacts with follow-up dates
      try {
        const { data: contacts, error: contactsError } = await supabase
          .from('contacts')
          .select('*')
          .eq('owner_id', user.id);

        if (!contactsError && contacts) {
          console.log('[Calendar] Processing', contacts.length, 'contacts for follow-ups');
          
          contacts.forEach(contact => {
            if (contact.next_action) {
              aggregatedEvents.push({
                id: `contact-followup-${contact.id}`,
                title: `📞 Follow-up: ${contact.full_name}`,
                start: new Date(contact.next_action),
                end: new Date(contact.next_action),
                allDay: true,
                type: 'follow_up',
                color: EVENT_COLORS.follow_up,
                contactId: contact.id,
                contactData: contact,
                source: 'contact'
              });
            }
          });
        }
      } catch (err) {
        console.error('[Calendar] Error fetching contacts:', err);
      }

      console.log('[Calendar] Total events loaded:', aggregatedEvents.length);
      setEvents(aggregatedEvents);
      
      if (aggregatedEvents.length === 0) {
        toast.info('No calendar events found. Create some deals or contacts with dates!');
      }
    } catch (error) {
      console.error('[Calendar] Error fetching calendar events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    if (activeFilters.closingsThisMonth) {
      const monthStart = moment(date).startOf('month').toDate();
      const monthEnd = moment(date).endOf('month').toDate();
      filtered = filtered.filter(event => 
        event.milestoneType === 'closing' && 
        event.start >= monthStart && 
        event.start <= monthEnd
      );
    }

    if (activeFilters.followUpsDueToday) {
      const today = moment().startOf('day').toDate();
      const tomorrow = moment().endOf('day').toDate();
      filtered = filtered.filter(event => 
        event.type === 'follow_up' && 
        event.start >= today && 
        event.start <= tomorrow
      );
    }

    if (activeFilters.earnestMoneyDeadlines) {
      filtered = filtered.filter(event => event.milestoneType === 'earnest_money');
    }

    return filtered;
  }, [events, activeFilters, date]);

  // Event style getter for color coding
  const eventStyleGetter = useCallback((event) => {
    const now = new Date();
    const isOverdue = event.start < now && event.status !== 'completed';
    const isDueSoon = event.start > now && event.start < moment().add(2, 'days').toDate();

    let backgroundColor = event.color;
    let border = '1px solid rgba(255, 255, 255, 0.2)';

    if (event.status === 'completed') {
      backgroundColor = '#10b981';
      border = '2px solid #10b981';
    } else if (isOverdue) {
      backgroundColor = '#ef4444';
      border = '2px solid #ef4444';
    } else if (isDueSoon) {
      backgroundColor = '#f59e0b';
      border = '2px solid #f59e0b';
    }

    return {
      style: {
        backgroundColor,
        border,
        borderRadius: '6px',
        color: '#ffffff',
        padding: '4px 8px',
        fontSize: '13px',
        fontWeight: '500',
        opacity: event.status === 'completed' ? 0.7 : 1
      }
    };
  }, []);

  // Handle event selection
  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    setShowEventPanel(true);
  }, []);

  const toggleFilter = (filterName) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterName]: !prev[filterName]
    }));
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1e]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0f1629] to-[#0a0f1e] border-b border-white/10">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggles */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 backdrop-blur-sm border border-white/10">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === 'month' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === 'week' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === 'day' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setView('agenda')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                view === 'agenda' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Create Event Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 bg-[#0f1629]/50 border-b border-white/5 overflow-x-auto">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
        </div>
        
        <button
          onClick={() => toggleFilter('closingsThisMonth')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            activeFilters.closingsThisMonth
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
          }`}
        >
          Closings This Month
        </button>

        <button
          onClick={() => toggleFilter('followUpsDueToday')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            activeFilters.followUpsDueToday
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
          }`}
        >
          Follow-Ups Due Today
        </button>

        <button
          onClick={() => toggleFilter('earnestMoneyDeadlines')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            activeFilters.earnestMoneyDeadlines
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
          }`}
        >
          💰 Earnest Money Deadlines
        </button>
      </div>

      {/* Calendar View */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="h-full bg-[#0f1629]/30 backdrop-blur-sm rounded-xl border border-white/10 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading calendar events...</p>
              </div>
            </div>
          ) : (
            <BigCalendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              views={['month', 'week', 'day', 'agenda']}
              popup
              className="dark-calendar"
            />
          )}
        </div>
      </div>

      {/* Event Details Panel - Will be implemented next */}
      {showEventPanel && selectedEvent && (
        <div className="fixed top-0 right-0 h-full w-96 bg-[#0f1629]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Event Details</h2>
              <button
                onClick={() => setShowEventPanel(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Event details will be rendered here */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{selectedEvent.title}</h3>
                <p className="text-gray-400 text-sm">
                  {moment(selectedEvent.start).format('MMMM D, YYYY')}
                  {!selectedEvent.allDay && ` at ${moment(selectedEvent.start).format('h:mm A')}`}
                </p>
              </div>

              {selectedEvent.description && (
                <div>
                  <p className="text-sm text-gray-300">{selectedEvent.description}</p>
                </div>
              )}

              {/* Quick Actions - placeholder */}
              <div className="flex gap-2 mt-6">
                <button className="flex-1 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm font-medium">
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Mark Complete
                </button>
                <button className="flex-1 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium">
                  <Edit2 className="w-4 h-4 inline mr-2" />
                  Reschedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
