import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { supabase } from '../supabaseClient';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, CheckCircle, Edit2, ExternalLink, MapPin, DollarSign, FileText, Clock, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

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

  const fetchCalendarEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const aggregatedEvents = [];

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

  const eventStyleGetter = useCallback((event) => {
    const now = new Date();
    const isOverdue = event.start < now;

    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '6px',
        border: 'none',
        color: '#ffffff',
        padding: '5px 9px',
        fontSize: '12px',
        fontWeight: '500',
        opacity: isOverdue ? 0.6 : 0.95
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
    <div style={{ minHeight: '100vh', background: '#000000', padding: '32px' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2" style={{ color: '#ffffff', letterSpacing: '-0.02em' }}>Calendar</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>Your unified timeline for deals and contacts</p>
      </div>

      {/* Calendar Container with Depth */}
      <div style={{
        background: '#0f1419',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        minHeight: 'calc(100vh - 180px)',
        position: 'relative'
      }}>
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: '600px' }}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
              <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading calendar...</p>
            </div>
          </div>
        ) : (
          <div style={{ height: 'calc(100vh - 300px)' }}>
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
              className="premium-dark-calendar"
            />
          </div>
        )}
      </div>

      {/* Right Panel - Event Details */}
      {showEventPanel && selectedEvent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '480px',
            height: '100vh',
            background: 'rgba(10, 15, 25, 0.98)',
            backdropFilter: 'blur(24px)',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
            zIndex: 1000,
            animation: 'slideInFromRight 0.3s ease-out'
          }}
        >
          <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div style={{
              padding: '28px 28px 20px 28px',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold" style={{ color: '#ffffff', letterSpacing: '-0.01em' }}>Event Details</h2>
                <button
                  onClick={() => setShowEventPanel(false)}
                  style={{
                    padding: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: `${selectedEvent.color}20`,
                  color: selectedEvent.color,
                  border: `1px solid ${selectedEvent.color}30`
                }}
              >
                {selectedEvent.category || selectedEvent.type}
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto" style={{ padding: '28px' }}>
              {/* Event Title & Date */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-4" style={{ color: '#ffffff', letterSpacing: '-0.01em', lineHeight: '1.3' }}>
                  {selectedEvent.title}
                </h3>
                <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {moment(selectedEvent.start).format('MMMM D, YYYY')}
                    {!selectedEvent.allDay && ` • ${moment(selectedEvent.start).format('h:mm A')}`}
                  </span>
                </div>
              </div>

              {/* Deal Information */}
              {selectedEvent.dealData && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '24px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}>
                  {selectedEvent.dealData.image_url && (
                    <img
                      src={selectedEvent.dealData.image_url}
                      alt="Property"
                      style={{
                        width: '100%',
                        height: '220px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                      }}
                    />
                  )}
                  
                  <div className="space-y-4">
                    {selectedEvent.dealData.address && (
                      <div className="flex items-start gap-3">
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: 'rgba(0,184,212,0.1)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <MapPin className="w-4 h-4" style={{ color: '#00b8d4' }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Address</p>
                          <p className="text-sm font-medium" style={{ color: '#ffffff', lineHeight: '1.5' }}>
                            {selectedEvent.dealData.address}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedEvent.dealData.price && (
                      <div className="flex items-start gap-3">
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: 'rgba(0,184,212,0.1)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <DollarSign className="w-4 h-4" style={{ color: '#00b8d4' }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Value</p>
                          <p className="text-sm font-medium" style={{ color: '#ffffff' }}>
                            ${parseInt(selectedEvent.dealData.price || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedEvent.dealData.stage && (
                      <div className="flex items-start gap-3">
                        <div style={{
                          width: '32px',
                          height: '32px',
                          background: 'rgba(0,184,212,0.1)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <FileText className="w-4 h-4" style={{ color: '#00b8d4' }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Stage</p>
                          <p className="text-sm font-medium" style={{ color: '#ffffff' }}>
                            {selectedEvent.dealData.stage}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Info */}
              {selectedEvent.contactData && (
                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px'
                }}>
                  <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Contact</p>
                  <p className="font-semibold text-lg" style={{ color: '#ffffff' }}>
                    {selectedEvent.contactData.full_name}
                  </p>
                  {selectedEvent.contactData.company && (
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {selectedEvent.contactData.company}
                    </p>
                  )}
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-3">
                <p className="text-xs font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Quick Actions
                </p>
                
                <button
                  className="premium-glass-btn"
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    borderRadius: '12px',
                    color: '#10b981',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                >
                  <CheckCircle className="w-5 h-5" />
                  Mark Complete
                </button>

                <button
                  className="premium-glass-btn"
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.15)',
                    borderRadius: '12px',
                    color: '#3b82f6',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                >
                  <Edit2 className="w-5 h-5" />
                  Reschedule Event
                </button>

                {selectedEvent.dealId && (
                  <button
                    onClick={handleViewDeal}
                    className="premium-glass-btn"
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: 'rgba(0, 184, 212, 0.08)',
                      border: '1px solid rgba(0, 184, 212, 0.15)',
                      borderRadius: '12px',
                      color: '#00b8d4',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 184, 212, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.25)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 184, 212, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 184, 212, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.15)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                  >
                    <ExternalLink className="w-5 h-5" />
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
