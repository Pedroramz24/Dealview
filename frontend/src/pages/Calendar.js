import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { supabase } from '../supabaseClient';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, CheckCircle, Edit2, ExternalLink, MapPin, DollarSign, FileText, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

// Event type colors - vibrant for dark theme
const EVENT_COLORS = {
  milestone: '#10b981',
  follow_up: '#3b82f6',
  general: '#a855f7',
  meeting: '#f97316',
  reminder: '#8b5cf6',
  closing: '#10b981',
  earnest: '#f59e0b'
};

const CalendarView = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventPanel, setShowEventPanel] = useState(false);
  
  const [activeFilters, setActiveFilters] = useState({
    all: true,
    closings: false,
    followUps: false,
    earnest: false
  });

  // Fetch calendar events
  const fetchCalendarEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const aggregatedEvents = [];

      // Fetch deals
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('owner_id', user.id);

      if (deals) {
        deals.forEach(deal => {
          if (deal.target_close_date) {
            aggregatedEvents.push({
              id: `closing-${deal.id}`,
              title: deal.address || deal.title,
              start: new Date(deal.target_close_date),
              end: new Date(deal.target_close_date),
              allDay: true,
              type: 'closing',
              color: EVENT_COLORS.closing,
              dealId: deal.id,
              dealData: deal,
              category: 'Closing'
            });
          }

          if (deal.next_action_date) {
            aggregatedEvents.push({
              id: `action-${deal.id}`,
              title: `${deal.next_action || 'Follow-up'} - ${deal.address || deal.title}`,
              start: new Date(deal.next_action_date),
              end: new Date(deal.next_action_date),
              allDay: true,
              type: 'follow_up',
              color: EVENT_COLORS.follow_up,
              dealId: deal.id,
              dealData: deal,
              category: 'Follow-up'
            });
          }
        });
      }

      // Fetch contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('owner_id', user.id);

      if (contacts) {
        contacts.forEach(contact => {
          if (contact.next_action) {
            aggregatedEvents.push({
              id: `contact-${contact.id}`,
              title: `Call ${contact.full_name}`,
              start: new Date(contact.next_action),
              end: new Date(contact.next_action),
              allDay: true,
              type: 'follow_up',
              color: EVENT_COLORS.follow_up,
              contactId: contact.id,
              contactData: contact,
              category: 'Follow-up'
            });
          }
        });
      }

      setEvents(aggregatedEvents);
    } catch (error) {
      console.error('Error loading calendar:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  const filteredEvents = useMemo(() => {
    if (activeFilters.all) return events;
    
    return events.filter(event => {
      if (activeFilters.closings && event.type === 'closing') return true;
      if (activeFilters.followUps && event.type === 'follow_up') return true;
      if (activeFilters.earnest && event.milestoneType === 'earnest_money') return true;
      return false;
    });
  }, [events, activeFilters]);

  const eventStyleGetter = useCallback((event) => {
    const now = new Date();
    const isOverdue = event.start < now && event.status !== 'completed';
    const isDueSoon = event.start > now && event.start < moment().add(2, 'days').toDate();

    let backgroundColor = event.color;
    let borderColor = event.color;

    if (event.status === 'completed') {
      backgroundColor = '#10b981';
      borderColor = '#10b981';
    } else if (isOverdue) {
      backgroundColor = '#ef4444';
      borderColor = '#ef4444';
    } else if (isDueSoon) {
      backgroundColor = '#f59e0b';
      borderColor = '#f59e0b';
    }

    return {
      style: {
        backgroundColor: backgroundColor + '40',
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: '6px',
        color: '#ffffff',
        padding: '3px 6px',
        fontSize: '12px',
        fontWeight: '500',
        backdropFilter: 'blur(8px)'
      }
    };
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    setShowEventPanel(true);
  }, []);

  const handleViewDeal = () => {
    if (selectedEvent?.dealId) {
      navigate(`/deals/${selectedEvent.dealId}`);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Ultra-clean header */}
      <div className="border-b border-white/[0.03] bg-gradient-to-b from-[#0a0f1e] to-black">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Calendar</h1>
              <p className="text-gray-400 text-sm">Unified timeline for all your deals and contacts</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1 border border-white/[0.05]">
                {['month', 'week', 'day', 'agenda'].map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      view === v
                        ? 'bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    {v === 'agenda' ? 'List' : v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500/80 to-blue-500/80 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mt-6">
            <button
              onClick={() => setActiveFilters({ all: true, closings: false, followUps: false, earnest: false })}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeFilters.all
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/10'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setActiveFilters({ all: false, closings: true, followUps: false, earnest: false })}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeFilters.closings
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/10'
              }`}
            >
              Closings This Month
            </button>
            <button
              onClick={() => setActiveFilters({ all: false, closings: false, followUps: true, earnest: false })}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeFilters.followUps
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/10'
              }`}
            >
              Follow-Ups Due
            </button>
          </div>
        </div>
      </div>

      {/* Main calendar container - full width, minimal padding */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        <div className="bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/[0.05] overflow-hidden" style={{ minHeight: 'calc(100vh - 280px)' }}>
          {loading ? (
            <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 280px)' }}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading calendar...</p>
              </div>
            </div>
          ) : (
            <div style={{ height: 'calc(100vh - 280px)', padding: '24px' }}>
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
                className="modern-dark-calendar"
              />
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Event Details Panel */}
      {showEventPanel && selectedEvent && (
        <div
          className="fixed top-0 right-0 h-full bg-[#0a0f1e]/98 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-50 animate-slide-in"
          style={{ width: '480px' }}
        >
          <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div className="px-6 py-5 border-b border-white/10">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-white">Event Details</h2>
                <button
                  onClick={() => setShowEventPanel(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${selectedEvent.color}20`,
                    color: selectedEvent.color,
                    border: `1px solid ${selectedEvent.color}40`
                  }}
                >
                  {selectedEvent.category || selectedEvent.type}
                </div>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Event Title & Date */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">{selectedEvent.title}</h3>
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {moment(selectedEvent.start).format('MMMM D, YYYY')}
                    {!selectedEvent.allDay && ` • ${moment(selectedEvent.start).format('h:mm A')}`}
                  </span>
                </div>
              </div>

              {/* Deal/Contact Information */}
              {selectedEvent.dealData && (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5 space-y-4">
                  {selectedEvent.dealData.image_url && (
                    <img
                      src={selectedEvent.dealData.image_url}
                      alt="Property"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  
                  <div className="space-y-3">
                    {selectedEvent.dealData.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-cyan-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Property Address</p>
                          <p className="text-sm text-white font-medium">{selectedEvent.dealData.address}</p>
                        </div>
                      </div>
                    )}

                    {selectedEvent.dealData.price && (
                      <div className="flex items-start gap-2">
                        <DollarSign className="w-4 h-4 text-cyan-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Deal Value</p>
                          <p className="text-sm text-white font-medium">
                            ${parseInt(selectedEvent.dealData.price).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedEvent.dealData.stage && (
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-cyan-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Deal Stage</p>
                          <p className="text-sm text-white font-medium">{selectedEvent.dealData.stage}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedEvent.contactData && (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-5">
                  <p className="text-xs text-gray-500 mb-1">Contact</p>
                  <p className="text-white font-semibold">{selectedEvent.contactData.full_name}</p>
                  {selectedEvent.contactData.company && (
                    <p className="text-sm text-gray-400 mt-1">{selectedEvent.contactData.company}</p>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-3">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Quick Actions</p>
                
                <button
                  className="w-full px-4 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl transition-all flex items-center justify-center gap-2 border border-green-500/20 hover:border-green-500/40"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Complete
                </button>

                <button
                  className="w-full px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-all flex items-center justify-center gap-2 border border-blue-500/20 hover:border-blue-500/40"
                >
                  <Edit2 className="w-4 h-4" />
                  Reschedule
                </button>

                {selectedEvent.dealId && (
                  <button
                    onClick={handleViewDeal}
                    className="w-full px-4 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl transition-all flex items-center justify-center gap-2 border border-cyan-500/20 hover:border-cyan-500/40"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full Deal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
