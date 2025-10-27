import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { supabase } from '../supabaseClient';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, CheckCircle, Edit2, ExternalLink, MapPin, DollarSign, FileText, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

// Event type colors matching CRM theme
const EVENT_COLORS = {
  milestone: '#10b981',
  follow_up: '#3b82f6',
  general: '#a855f7',
  meeting: '#f97316',
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
              title: `Closing: ${deal.address || deal.title}`,
              start: new Date(deal.target_close_date),
              end: new Date(deal.target_close_date),
              allDay: true,
              type: 'closing',
              color: EVENT_COLORS.closing,
              dealId: deal.id,
              dealData: deal
            });
          }

          if (deal.next_action_date) {
            aggregatedEvents.push({
              id: `action-${deal.id}`,
              title: `${deal.next_action || 'Follow-up'}: ${deal.address || deal.title}`,
              start: new Date(deal.next_action_date),
              end: new Date(deal.next_action_date),
              allDay: true,
              type: 'follow_up',
              color: EVENT_COLORS.follow_up,
              dealId: deal.id,
              dealData: deal
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
              title: `Call: ${contact.full_name}`,
              start: new Date(contact.next_action),
              end: new Date(contact.next_action),
              allDay: true,
              type: 'follow_up',
              color: EVENT_COLORS.follow_up,
              contactId: contact.id,
              contactData: contact
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

  const eventStyleGetter = useCallback((event) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '6px',
        border: 'none',
        color: '#ffffff',
        padding: '4px 8px',
        fontSize: '13px',
        fontWeight: '500'
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
      setShowEventPanel(false);
    }
  };

  return (
    <div className="p-8" style={{ minHeight: '100vh', background: '#000000' }}>
      {/* Header matching Dashboard style */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Calendar</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Your unified timeline for deals and contacts</p>
      </div>

      {/* Calendar Container - matching Dashboard cards */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '24px',
        minHeight: 'calc(100vh - 200px)',
        backdropFilter: 'blur(12px)'
      }}>
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: '600px' }}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <p style={{ color: 'var(--text-secondary)' }}>Loading calendar...</p>
            </div>
          </div>
        ) : (
          <div style={{ height: 'calc(100vh - 280px)' }}>
            <BigCalendar
              localizer={localizer}
              events={events}
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
              className="notion-style-calendar"
            />
          </div>
        )}
      </div>

      {/* Event Details Panel - matching PropertyIntelligencePanel style */}
      {showEventPanel && selectedEvent && (
        <div
          className="fixed top-0 right-0 h-full z-50"
          style={{
            width: '500px',
            background: 'rgba(15, 22, 41, 0.98)',
            backdropFilter: 'blur(24px)',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
            animation: 'slideInFromRight 0.3s ease-out'
          }}
        >
          <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Event Details</h2>
                <button
                  onClick={() => setShowEventPanel(false)}
                  style={{
                    padding: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(0,184,212,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
              {/* Event Title & Date */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {selectedEvent.title}
                </h3>
                <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {moment(selectedEvent.start).format('MMMM D, YYYY')}
                    {!selectedEvent.allDay && ` • ${moment(selectedEvent.start).format('h:mm A')}`}
                  </span>
                </div>
              </div>

              {/* Deal Information Card */}
              {selectedEvent.dealData && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  {selectedEvent.dealData.image_url && (
                    <img
                      src={selectedEvent.dealData.image_url}
                      alt="Property"
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        marginBottom: '16px'
                      }}
                    />
                  )}
                  
                  <div className="space-y-3">
                    {selectedEvent.dealData.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4" style={{ color: 'var(--accent)', marginTop: '2px' }} />
                        <div className="flex-1">
                          <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Address</p>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {selectedEvent.dealData.address}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedEvent.dealData.price && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-4 h-4" style={{ color: 'var(--accent)', marginTop: '2px' }} />
                        <div className="flex-1">
                          <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Value</p>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            ${parseInt(selectedEvent.dealData.price || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedEvent.dealData.stage && (
                      <div className="flex items-start gap-3">
                        <FileText className="w-4 h-4" style={{ color: 'var(--accent)', marginTop: '2px' }} />
                        <div className="flex-1">
                          <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Stage</p>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {selectedEvent.dealData.stage}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {selectedEvent.contactData && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Contact</p>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {selectedEvent.contactData.full_name}
                  </p>
                  {selectedEvent.contactData.company && (
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {selectedEvent.contactData.company}
                    </p>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-3">
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Quick Actions
                </p>
                
                <button
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '10px',
                    color: '#10b981',
                    fontWeight: '500',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                  }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Complete
                </button>

                <button
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '10px',
                    color: '#3b82f6',
                    fontWeight: '500',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                  Reschedule
                </button>

                {selectedEvent.dealId && (
                  <button
                    onClick={handleViewDeal}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(0, 184, 212, 0.1)',
                      border: '1px solid rgba(0, 184, 212, 0.2)',
                      borderRadius: '10px',
                      color: '#00b8d4',
                      fontWeight: '500',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 184, 212, 0.15)';
                      e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 184, 212, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.2)';
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Deal
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
