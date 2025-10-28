import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../supabaseClient';
import { Plus, X, CheckCircle, Edit2, ExternalLink, MapPin, DollarSign, FileText, Clock, User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import CreateEventPanel from '../components/CreateEventPanel';

const EVENT_COLORS = {
  deal: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', shadow: 'rgba(16, 185, 129, 0.3)' },
  followup: { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)', shadow: 'rgba(59, 130, 246, 0.3)' },
  deadline: { primary: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', shadow: 'rgba(239, 68, 68, 0.3)' },
  meeting: { primary: '#f97316', glow: 'rgba(249, 115, 22, 0.4)', shadow: 'rgba(249, 115, 22, 0.3)' },
  task: { primary: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', shadow: 'rgba(168, 85, 247, 0.3)' }
};

const CalendarView = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventPanel, setShowEventPanel] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  const calendarRef = React.useRef(null);

  const fetchCalendarEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const aggregatedEvents = [];

      // Fetch standalone calendar events
      try {
        const { data: calendarEvents } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('owner_id', user.id);

        if (calendarEvents) {
          calendarEvents.forEach(event => {
            const eventColor = EVENT_COLORS[event.event_type] || EVENT_COLORS.task;
            aggregatedEvents.push({
              id: event.id,
              title: event.title,
              start: event.start_date,
              end: event.end_date || event.start_date,
              allDay: event.all_day,
              backgroundColor: eventColor.primary,
              borderColor: 'transparent',
              classNames: [`event-${event.event_type}`, 'premium-event'],
              extendedProps: {
                type: event.event_type,
                category: event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1),
                description: event.description,
                relatedDealId: event.related_deal_id,
                relatedContactId: event.related_contact_id,
                colorScheme: eventColor,
                icon: '📅'
              }
            });
          });
        }
      } catch (err) {
        console.warn('Calendar events table may not exist yet:', err);
      }

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
              start: deal.target_close_date,
              allDay: true,
              backgroundColor: EVENT_COLORS.deal.primary,
              borderColor: 'transparent',
              classNames: ['event-deal', 'premium-event'],
              extendedProps: {
                type: 'deal',
                dealId: deal.id,
                dealData: deal,
                category: 'Closing',
                icon: '🏁',
                colorScheme: EVENT_COLORS.deal
              }
            });
          }

          if (deal.next_action_date) {
            aggregatedEvents.push({
              id: `action-${deal.id}`,
              title: deal.next_action || 'Follow-up',
              start: deal.next_action_date,
              allDay: true,
              backgroundColor: EVENT_COLORS.followup.primary,
              borderColor: 'transparent',
              classNames: ['event-followup', 'premium-event'],
              extendedProps: {
                type: 'followup',
                dealId: deal.id,
                dealData: deal,
                category: 'Follow-up',
                icon: '📋',
                colorScheme: EVENT_COLORS.followup
              }
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
              title: contact.full_name,
              start: contact.next_action,
              allDay: true,
              backgroundColor: EVENT_COLORS.followup.primary,
              borderColor: 'transparent',
              classNames: ['event-followup', 'premium-event'],
              extendedProps: {
                type: 'followup',
                contactId: contact.id,
                contactData: contact,
                category: 'Call',
                icon: '📞',
                colorScheme: EVENT_COLORS.followup
              }
            });
          }
        });
      }

      console.log('[Calendar] Loaded', aggregatedEvents.length, 'total events');
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

  const handleEventClick = async (info) => {
    const event = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      allDay: info.event.allDay,
      backgroundColor: info.event.backgroundColor,
      ...info.event.extendedProps
    };

    // Fetch related deal if linked
    if (event.relatedDealId && !event.dealData) {
      try {
        const { data: dealData } = await supabase
          .from('deals')
          .select('*')
          .eq('id', event.relatedDealId)
          .single();
        
        if (dealData) {
          event.dealData = dealData;
        }
      } catch (err) {
        console.error('Error fetching related deal:', err);
      }
    }

    // Fetch related contact if linked
    if (event.relatedContactId && !event.contactData) {
      try {
        const { data: contactData } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', event.relatedContactId)
          .single();
        
        if (contactData) {
          event.contactData = contactData;
        }
      } catch (err) {
        console.error('Error fetching related contact:', err);
      }
    }

    setSelectedEvent(event);
    setShowEventPanel(true);
  };

  const handleMarkComplete = async () => {
    try {
      // For standalone calendar events
      if (selectedEvent?.id && typeof selectedEvent.id === 'string' && !selectedEvent.id.includes('closing-') && !selectedEvent.id.includes('action-') && !selectedEvent.id.includes('contact-')) {
        const { error } = await supabase
          .from('calendar_events')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', selectedEvent.id);

        if (error) throw error;
      } 
      // For deal-based events - mark the deal's next action as complete
      else if (selectedEvent?.dealId && selectedEvent.id.includes('action-')) {
        const { error } = await supabase
          .from('deals')
          .update({ 
            next_action_date: null,
            last_contact_date: new Date().toISOString().split('T')[0]
          })
          .eq('id', selectedEvent.dealId);

        if (error) throw error;
      }

      toast.success('Event marked as complete!');
      setShowEventPanel(false);
      fetchCalendarEvents();
    } catch (error) {
      console.error('Error marking complete:', error);
      toast.error('Failed to mark event complete');
    }
  };

  const handleReschedule = async () => {
    const newDate = prompt('Enter new date and time (e.g., October 27, 2025 3:30 PM):');
    if (!newDate) return;

    try {
      const parsedDate = new Date(newDate);
      if (isNaN(parsedDate.getTime())) {
        toast.error('Invalid date format');
        return;
      }

      // For standalone calendar events
      if (selectedEvent?.id && typeof selectedEvent.id === 'string' && !selectedEvent.id.includes('closing-') && !selectedEvent.id.includes('action-') && !selectedEvent.id.includes('contact-')) {
        const { error } = await supabase
          .from('calendar_events')
          .update({ 
            start_date: parsedDate.toISOString(),
            end_date: parsedDate.toISOString()
          })
          .eq('id', selectedEvent.id);

        if (error) throw error;
      }
      // For deal closing dates
      else if (selectedEvent?.dealId && selectedEvent.id.includes('closing-')) {
        const { error } = await supabase
          .from('deals')
          .update({ target_close_date: parsedDate.toISOString().split('T')[0] })
          .eq('id', selectedEvent.dealId);

        if (error) throw error;
      }
      // For deal follow-up dates
      else if (selectedEvent?.dealId && selectedEvent.id.includes('action-')) {
        const { error } = await supabase
          .from('deals')
          .update({ next_action_date: parsedDate.toISOString().split('T')[0] })
          .eq('id', selectedEvent.dealId);

        if (error) throw error;
      }
      // For contact follow-ups
      else if (selectedEvent?.contactId) {
        const { error } = await supabase
          .from('contacts')
          .update({ next_action: parsedDate.toISOString().split('T')[0] })
          .eq('id', selectedEvent.contactId);

        if (error) throw error;
      }

      toast.success('Event rescheduled successfully!');
      setShowEventPanel(false);
      fetchCalendarEvents();
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error('Failed to reschedule event');
    }
  };

  const handleViewDeal = () => {
    if (selectedEvent?.dealId) {
      navigate(`/deals/${selectedEvent.dealId}`);
      setShowEventPanel(false);
    }
  };

  const handleEventCreated = () => {
    fetchCalendarEvents();
    setShowCreatePanel(false);
    toast.success('Event created successfully!');
  };

  return (
    <div style={{ height: '100vh', background: '#000000', position: 'relative', overflow: 'hidden' }}>
      {/* Animated background gradients - TONED DOWN */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle at 30% 30%, rgba(0, 184, 212, 0.03) 0%, transparent 40%), radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.02) 0%, transparent 40%)',
        animation: 'float-gradient 15s ease-in-out infinite',
        pointerEvents: 'none',
        opacity: 0.4
      }} />

      {/* Main Container */}
      <div style={{ height: '100%', position: 'relative', zIndex: 1, padding: '20px' }}>
        {/* Premium Elevated Calendar Card */}
        <div style={{
          height: '100%',
          background: 'linear-gradient(145deg, rgba(12, 16, 22, 0.96) 0%, rgba(8, 12, 18, 0.96) 100%)',
          borderRadius: '28px',
          padding: '0',
          boxShadow: '0 40px 100px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.04), inset 0 2px 0 rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(30px)'
        }}>
          {/* Glowing top edge - TONED DOWN */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '0',
            right: '0',
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(0, 184, 212, 0.3) 50%, transparent 100%)',
            boxShadow: '0 0 15px rgba(0, 184, 212, 0.2)',
            pointerEvents: 'none'
          }} />

          {/* Custom Toolbar */}
          <div style={{
            padding: '28px 40px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            background: 'linear-gradient(180deg, rgba(0, 184, 212, 0.02) 0%, transparent 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div className="flex items-center gap-4">
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, rgba(0,184,212,0.2), rgba(0,184,212,0.1))',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(0,184,212,0.3)',
                boxShadow: '0 8px 24px rgba(0,184,212,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
              }}>
                <Sparkles className="w-6 h-6" style={{ color: '#00d4ff' }} />
              </div>
              <div>
                <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '2px' }}>Calendar</h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.02em' }}>Your unified command center</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Month Navigation */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(255,255,255,0.03)',
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                <button
                  onClick={() => calendarRef.current?.getApi().prev()}
                  style={{
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,184,212,0.1)';
                    e.currentTarget.style.color = '#00b8d4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <span id="calendar-month-label" style={{ 
                  color: '#ffffff', 
                  fontSize: '16px', 
                  fontWeight: '800', 
                  minWidth: '140px', 
                  textAlign: 'center',
                  letterSpacing: '-0.01em'
                }}>
                  {currentMonth}
                </span>
                <button
                  onClick={() => calendarRef.current?.getApi().next()}
                  style={{
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,184,212,0.1)';
                    e.currentTarget.style.color = '#00b8d4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>

              {/* View Toggles */}
              <div style={{
                display: 'flex',
                gap: '6px',
                background: 'rgba(255,255,255,0.03)',
                padding: '4px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                {[
                  { view: 'dayGridMonth', label: 'Month' },
                  { view: 'timeGridWeek', label: 'Week' },
                  { view: 'timeGridDay', label: 'Day' },
                  { view: 'listWeek', label: 'List' }
                ].map(({ view: viewName, label }) => (
                  <button
                    key={viewName}
                    onClick={() => calendarRef.current?.getApi().changeView(viewName)}
                    style={{
                      padding: '10px 18px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0,184,212,0.1)';
                      e.currentTarget.style.color = '#00b8d4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Create Event Button */}
              <button
                onClick={() => setShowCreatePanel(true)}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.25), rgba(59, 130, 246, 0.25))',
                  border: '1px solid rgba(0, 184, 212, 0.4)',
                  borderRadius: '12px',
                  color: '#00d4ff',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 8px 32px rgba(0, 184, 212, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 184, 212, 0.35), rgba(59, 130, 246, 0.35))';
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 184, 212, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 184, 212, 0.25), rgba(59, 130, 246, 0.25))';
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 184, 212, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
                }}
              >
                <Plus className="w-5 h-5" />
                Create Event
              </button>
            </div>
          </div>

          {/* Calendar - Full Height */}
          {loading ? (
            <div className="flex items-center justify-center" style={{ height: 'calc(100% - 110px)' }}>
              <div className="text-center">
                <div style={{
                  width: '70px',
                  height: '70px',
                  border: '4px solid rgba(0, 184, 212, 0.1)',
                  borderTop: '4px solid #00b8d4',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 24px',
                  boxShadow: '0 0 40px rgba(0, 184, 212, 0.3)'
                }} />
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', fontWeight: '600' }}>Loading your schedule...</p>
              </div>
            </div>
          ) : (
            <div style={{ height: 'calc(100% - 110px)', padding: '0 40px 40px' }}>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={false}
                events={events}
                eventClick={handleEventClick}
                datesSet={(dateInfo) => {
                  const monthYear = dateInfo.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  setCurrentMonth(monthYear);
                }}
                height="100%"
                expandRows={true}
                handleWindowResize={true}
                dayMaxEvents={false}
                moreLinkClick="popover"
                weekends={true}
                fixedWeekCount={false}
                showNonCurrentDates={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Ultra-Premium Event Details Panel */}
      {showEventPanel && selectedEvent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: showEventPanel ? '0' : '-600px',
            width: '520px',
            height: '100vh',
            background: 'linear-gradient(145deg, rgba(8, 10, 14, 0.98) 0%, rgba(12, 15, 20, 0.98) 100%)',
            backdropFilter: 'blur(40px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '-40px 0 100px rgba(0, 0, 0, 0.9), inset 1px 0 0 rgba(255, 255, 255, 0.04)',
            zIndex: 2000,
            transition: 'right 500ms cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Animated gradient overlay - SUBTLE */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '300px',
            background: `radial-gradient(circle at 50% 0%, ${selectedEvent.colorScheme?.glow || 'rgba(0,184,212,0.08)'} 0%, transparent 70%)`,
            pointerEvents: 'none',
            opacity: 0.3
          }} />

          {/* Panel Header */}
          <div style={{
            padding: '32px 36px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            position: 'relative',
            zIndex: 1
          }}>
            <div className="flex items-center justify-between mb-5">
              <h2 style={{ color: '#ffffff', fontSize: '26px', fontWeight: '900', letterSpacing: '-0.03em' }}>Event Details</h2>
              <button
                onClick={() => setShowEventPanel(false)}
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.15))';
                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.transform = 'rotate(90deg) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(239,68,68,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                  e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Glowing category badge */}
            {selectedEvent.category && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '800',
                background: `linear-gradient(135deg, ${selectedEvent.colorScheme?.primary || '#a855f7'}20, ${selectedEvent.colorScheme?.primary || '#a855f7'}10)`,
                color: selectedEvent.colorScheme?.primary || '#a855f7',
                border: `1px solid ${selectedEvent.colorScheme?.primary || '#a855f7'}35`,
                boxShadow: `0 0 30px ${selectedEvent.colorScheme?.glow || 'rgba(168,85,247,0.3)'}, inset 0 1px 0 rgba(255,255,255,0.1)`,
                animation: 'pulse-glow-badge 3s ease-in-out infinite'
              }}>
                <span style={{ fontSize: '18px' }}>{selectedEvent.icon}</span>
                <span>{selectedEvent.category}</span>
              </div>
            )}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '36px', position: 'relative', zIndex: 1 }}>
            {/* Event Title & Date */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ color: '#ffffff', fontSize: '32px', fontWeight: '900', letterSpacing: '-0.03em', lineHeight: '1.2', marginBottom: '20px' }}>
                {selectedEvent.title}
              </h3>
              <div className="flex items-center gap-4" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  background: 'linear-gradient(135deg, rgba(0,184,212,0.15), rgba(0,184,212,0.08))',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(0,184,212,0.25)',
                  boxShadow: '0 4px 20px rgba(0,184,212,0.2)'
                }}>
                  <Clock className="w-5 h-5" style={{ color: '#00b8d4' }} />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Scheduled</p>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>
                    {new Date(selectedEvent.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    {!selectedEvent.allDay && ` • ${new Date(selectedEvent.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                  </p>
                </div>
              </div>

              {/* Event Description/Notes */}
              {selectedEvent.description && (
                <div style={{
                  padding: '20px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  marginTop: '20px'
                }}>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800', marginBottom: '12px' }}>Notes</p>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.6', fontWeight: '500' }}>
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>

            {/* Deal Card - Ultra Premium */}
            {selectedEvent.dealData && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '32px',
                marginBottom: '32px',
                boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), inset 0 2px 0 rgba(255,255,255,0.06)`,
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Glowing corner effect */}
                <div style={{
                  position: 'absolute',
                  top: '-100px',
                  right: '-100px',
                  width: '250px',
                  height: '250px',
                  background: `radial-gradient(circle, ${selectedEvent.colorScheme?.glow || 'rgba(0,184,212,0.15)'} 0%, transparent 70%)`,
                  pointerEvents: 'none',
                  animation: 'rotate-glow 10s linear infinite'
                }} />

                {selectedEvent.dealData.image_url && (
                  <div style={{ position: 'relative', zIndex: 1, marginBottom: '28px' }}>
                    <img
                      src={selectedEvent.dealData.image_url}
                      alt="Property"
                      style={{
                        width: '100%',
                        height: '260px',
                        objectFit: 'cover',
                        borderRadius: '16px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)'
                      }}
                    />
                    {/* Image overlay glow */}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '50%',
                      background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
                      borderRadius: '0 0 16px 16px'
                    }} />
                  </div>
                )}
                
                <div className="space-y-6" style={{ position: 'relative', zIndex: 1 }}>
                  {selectedEvent.dealData.address && (
                    <div className="flex items-start gap-4">
                      <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'linear-gradient(135deg, rgba(0,184,212,0.2), rgba(0,184,212,0.1))',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(0,184,212,0.3)',
                        boxShadow: '0 8px 24px rgba(0,184,212,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                      }}>
                        <MapPin className="w-5 h-5" style={{ color: '#00d4ff' }} />
                      </div>
                      <div className="flex-1">
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800', marginBottom: '8px' }}>Property Address</p>
                        <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: '700', lineHeight: '1.5' }}>
                          {selectedEvent.dealData.address}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.dealData.price && (
                    <div className="flex items-start gap-4">
                      <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(16,185,129,0.3)',
                        boxShadow: '0 8px 24px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                      }}>
                        <DollarSign className="w-5 h-5" style={{ color: '#10b981' }} />
                      </div>
                      <div className="flex-1">
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800', marginBottom: '8px' }}>Deal Value</p>
                        <p style={{ color: '#ffffff', fontSize: '26px', fontWeight: '900', letterSpacing: '-0.03em' }}>
                          ${parseInt(selectedEvent.dealData.price || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.dealData.stage && (
                    <div className="flex items-start gap-4">
                      <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.1))',
                        borderRadius: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(168,85,247,0.3)',
                        boxShadow: '0 8px 24px rgba(168,85,247,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                      }}>
                        <FileText className="w-5 h-5" style={{ color: '#a855f7' }} />
                      </div>
                      <div className="flex-1">
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800', marginBottom: '8px' }}>Pipeline Stage</p>
                        <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: '800' }}>
                          {selectedEvent.dealData.stage}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Card */}
            {selectedEvent.contactData && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '28px',
                marginBottom: '32px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)'
              }}>
                <div className="flex items-center gap-4 mb-3">
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.1))',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(59,130,246,0.3)',
                    boxShadow: '0 6px 20px rgba(59,130,246,0.2)'
                  }}>
                    <User className="w-5 h-5" style={{ color: '#3b82f6' }} />
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800' }}>Contact</p>
                </div>
                <p style={{ color: '#ffffff', fontSize: '22px', fontWeight: '900', marginBottom: '8px' }}>
                  {selectedEvent.contactData.full_name}
                </p>
                {selectedEvent.contactData.company && (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', fontWeight: '600' }}>
                    {selectedEvent.contactData.company}
                  </p>
                )}
              </div>
            )}

            {/* Ultra-Premium Action Buttons */}
            <div className="space-y-4">
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '20px' }}>
                Quick Actions
              </p>
              
              {[
                { icon: CheckCircle, label: 'Mark Complete', color: EVENT_COLORS.deal, action: handleMarkComplete },
                { icon: Edit2, label: 'Reschedule Event', color: EVENT_COLORS.followup, action: handleReschedule },
                ...(selectedEvent.dealId ? [{ icon: ExternalLink, label: 'View Full Deal', color: { primary: '#00b8d4', glow: 'rgba(0,184,212,0.4)' }, action: handleViewDeal }] : [])
              ].map((btn, idx) => (
                <button
                  key={idx}
                  onClick={btn.action}
                  style={{
                    width: '100%',
                    padding: '18px 28px',
                    background: `linear-gradient(135deg, ${btn.color.primary}15, ${btn.color.primary}08)`,
                    border: `1px solid ${btn.color.primary}25`,
                    borderRadius: '16px',
                    color: btn.color.primary,
                    fontWeight: '800',
                    fontSize: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '14px',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: `0 6px 24px ${btn.color.primary}10, inset 0 1px 0 rgba(255,255,255,0.08)`,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${btn.color.primary}25, ${btn.color.primary}15)`;
                    e.currentTarget.style.borderColor = `${btn.color.primary}40`;
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)';
                    e.currentTarget.style.boxShadow = `0 16px 48px ${btn.color.glow}, inset 0 1px 0 rgba(255,255,255,0.15)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${btn.color.primary}15, ${btn.color.primary}08)`;
                    e.currentTarget.style.borderColor = `${btn.color.primary}25`;
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = `0 6px 24px ${btn.color.primary}10, inset 0 1px 0 rgba(255,255,255,0.08)`;
                  }}
                >
                  <btn.icon className="w-5 h-5" />
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Event Panel */}
      <CreateEventPanel
        isOpen={showCreatePanel}
        onClose={() => setShowCreatePanel(false)}
        onEventCreated={handleEventCreated}
      />
    </div>
  );
};

export default CalendarView;
