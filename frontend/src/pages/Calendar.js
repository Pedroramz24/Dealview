import React, { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { supabase } from '../supabaseClient';
import { Plus, X, CheckCircle, Edit2, ExternalLink, MapPin, DollarSign, FileText, Clock, Calendar as CalendarIcon, User, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import CreateEventPanel from '../components/CreateEventPanel';

const EVENT_COLORS = {
  deal: { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' }, // Green
  followup: { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.3)' }, // Blue  
  deadline: { primary: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' }, // Red
  meeting: { primary: '#f97316', glow: 'rgba(249, 115, 22, 0.3)' }, // Orange
  task: { primary: '#a855f7', glow: 'rgba(168, 85, 247, 0.3)' } // Purple
};

const CalendarView = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventPanel, setShowEventPanel] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
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
              borderColor: EVENT_COLORS.deal.primary,
              classNames: ['event-deal'],
              extendedProps: {
                type: 'deal',
                dealId: deal.id,
                dealData: deal,
                category: 'Closing',
                icon: '🏁'
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
              borderColor: EVENT_COLORS.followup.primary,
              classNames: ['event-followup'],
              extendedProps: {
                type: 'followup',
                dealId: deal.id,
                dealData: deal,
                category: 'Follow-up',
                icon: '📋'
              }
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
              title: contact.full_name,
              start: contact.next_action,
              allDay: true,
              backgroundColor: EVENT_COLORS.followup.primary,
              borderColor: EVENT_COLORS.followup.primary,
              classNames: ['event-followup'],
              extendedProps: {
                type: 'followup',
                contactId: contact.id,
                contactData: contact,
                category: 'Call',
                icon: '📞'
              }
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

  const handleEventClick = (info) => {
    const event = {
      title: info.event.title,
      start: info.event.start,
      allDay: info.event.allDay,
      ...info.event.extendedProps
    };
    setSelectedEvent(event);
    setShowEventPanel(true);
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
  };

  return (
    <div style={{ minHeight: '100vh', background: '#000000', position: 'relative' }}>
      {/* Ultra-Premium Calendar Container */}
      <div style={{
        height: '100vh',
        background: 'radial-gradient(circle at 20% 20%, rgba(0, 184, 212, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.02) 0%, transparent 50%), #000000',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Floating action button */}
        <button
          onClick={() => setShowCreatePanel(true)}
          style={{
            position: 'absolute',
            top: '32px',
            right: '32px',
            padding: '14px 24px',
            background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.2), rgba(59, 130, 246, 0.2))',
            border: '1px solid rgba(0, 184, 212, 0.3)',
            borderRadius: '12px',
            color: '#00d4ff',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 8px 32px rgba(0, 184, 212, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            zIndex: 100,
            backdropFilter: 'blur(16px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 184, 212, 0.3), rgba(59, 130, 246, 0.3))';
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 184, 212, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 184, 212, 0.2), rgba(59, 130, 246, 0.2))';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 184, 212, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
          }}
        >
          <Plus className="w-5 h-5" />
          Create Event
        </button>

        {/* Premium Elevated Calendar Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 20, 26, 0.95) 0%, rgba(10, 15, 20, 0.95) 100%)',
          borderRadius: '24px',
          padding: '40px',
          height: 'calc(100vh - 48px)',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(20px)'
        }}>
          {/* Subtle glow effect overlay */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'radial-gradient(circle, rgba(0, 184, 212, 0.03) 0%, transparent 70%)',
            pointerEvents: 'none',
            animation: 'pulse-glow 8s ease-in-out infinite'
          }} />

          {loading ? (
            <div className="flex items-center justify-center" style={{ height: '100%', position: 'relative', zIndex: 1 }}>
              <div className="text-center">
                <div style={{
                  width: '60px',
                  height: '60px',
                  border: '3px solid rgba(0, 184, 212, 0.1)',
                  borderTop: '3px solid #00b8d4',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px'
                }} />
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', fontWeight: '500' }}>Loading your schedule...</p>
              </div>
            </div>
          ) : (
            <div style={{ height: 'calc(100% - 80px)', position: 'relative', zIndex: 1 }}>
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'title',
                  center: '',
                  right: 'prev,next today dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                }}
                events={events}
                eventClick={handleEventClick}
                height="100%"
                editable={false}
                selectable={true}
                dayMaxEvents={3}
                weekends={true}
                eventDisplay="block"
              />
            </div>
          )}
        </div>
      </div>

      {/* Premium Event Details Panel - Right Side */}
      {showEventPanel && selectedEvent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: showEventPanel ? '0' : '-600px',
            width: '500px',
            height: '100vh',
            background: 'linear-gradient(135deg, rgba(11, 12, 14, 0.98) 0%, rgba(18, 20, 24, 0.98) 100%)',
            backdropFilter: 'blur(30px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '-30px 0 80px rgba(0, 0, 0, 0.7), inset 1px 0 0 rgba(255, 255, 255, 0.03)',
            zIndex: 2000,
            transition: 'right 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Panel Header with Glow */}
          <div style={{
            padding: '28px 32px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'linear-gradient(180deg, rgba(0, 184, 212, 0.04) 0%, transparent 100%)'
          }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em' }}>Event Details</h2>
              <button
                onClick={() => setShowEventPanel(false)}
                style={{
                  padding: '10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {selectedEvent.category && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                background: `${EVENT_COLORS[selectedEvent.type]?.primary || '#a855f7'}15`,
                color: EVENT_COLORS[selectedEvent.type]?.primary || '#a855f7',
                border: `1px solid ${EVENT_COLORS[selectedEvent.type]?.primary || '#a855f7'}30`,
                boxShadow: `0 0 20px ${EVENT_COLORS[selectedEvent.type]?.glow || 'rgba(168,85,247,0.2)'}`
              }}>
                <span>{selectedEvent.icon}</span>
                <span>{selectedEvent.category}</span>
              </div>
            )}
          </div>

          {/* Panel Content - Scrollable */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '32px' }}>
            {/* Event Title & Date */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: '1.2', marginBottom: '16px' }}>
                {selectedEvent.title}
              </h3>
              <div className="flex items-center gap-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  background: 'rgba(0,184,212,0.1)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(0,184,212,0.2)'
                }}>
                  <Clock className="w-4 h-4" style={{ color: '#00b8d4' }} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                  {new Date(selectedEvent.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Deal Information - Premium Card */}
            {selectedEvent.dealData && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '28px',
                marginBottom: '28px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Glow effect */}
                <div style={{
                  position: 'absolute',
                  top: '-100%',
                  right: '-50%',
                  width: '200%',
                  height: '200%',
                  background: `radial-gradient(circle, ${EVENT_COLORS[selectedEvent.type]?.glow || 'rgba(168,85,247,0.1)'} 0%, transparent 70%)`,
                  pointerEvents: 'none'
                }} />

                {selectedEvent.dealData.image_url && (
                  <img
                    src={selectedEvent.dealData.image_url}
                    alt="Property"
                    style={{
                      width: '100%',
                      height: '240px',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      marginBottom: '24px',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)',
                      position: 'relative',
                      zIndex: 1
                    }}
                  />
                )}
                
                <div className="space-y-5" style={{ position: 'relative', zIndex: 1 }}>
                  {selectedEvent.dealData.address && (
                    <div className="flex items-start gap-4">
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, rgba(0,184,212,0.15), rgba(0,184,212,0.08))',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(0,184,212,0.2)',
                        boxShadow: '0 4px 16px rgba(0,184,212,0.15)'
                      }}>
                        <MapPin className="w-5 h-5" style={{ color: '#00d4ff' }} />
                      </div>
                      <div className="flex-1">
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700', marginBottom: '6px' }}>Address</p>
                        <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: '600', lineHeight: '1.5' }}>
                          {selectedEvent.dealData.address}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.dealData.price && (
                    <div className="flex items-start gap-4">
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(16,185,129,0.2)',
                        boxShadow: '0 4px 16px rgba(16,185,129,0.15)'
                      }}>
                        <DollarSign className="w-5 h-5" style={{ color: '#10b981' }} />
                      </div>
                      <div className="flex-1">
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700', marginBottom: '6px' }}>Deal Value</p>
                        <p style={{ color: '#ffffff', fontSize: '22px', fontWeight: '800', letterSpacing: '-0.02em' }}>
                          ${parseInt(selectedEvent.dealData.price || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.dealData.stage && (
                    <div className="flex items-start gap-4">
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.08))',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid rgba(168,85,247,0.2)',
                        boxShadow: '0 4px 16px rgba(168,85,247,0.15)'
                      }}>
                        <FileText className="w-5 h-5" style={{ color: '#a855f7' }} />
                      </div>
                      <div className="flex-1">
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700', marginBottom: '6px' }}>Pipeline Stage</p>
                        <p style={{ color: '#ffffff', fontSize: '15px', fontWeight: '700' }}>
                          {selectedEvent.dealData.stage}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Info Card */}
            {selectedEvent.contactData && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '28px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
              }}>
                <div className="flex items-center gap-3 mb-2">
                  <div style={{
                    width: '36px',
                    height: '36px',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.08))',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(59,130,246,0.2)'
                  }}>
                    <User className="w-4 h-4" style={{ color: '#3b82f6' }} />
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>Contact</p>
                </div>
                <p style={{ color: '#ffffff', fontSize: '20px', fontWeight: '800', marginBottom: '6px' }}>
                  {selectedEvent.contactData.full_name}
                </p>
                {selectedEvent.contactData.company && (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: '500' }}>
                    {selectedEvent.contactData.company}
                  </p>
                )}
              </div>
            )}

            {/* Premium Action Buttons */}
            <div className="space-y-3">
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
                Quick Actions
              </p>
              
              <button
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '14px',
                  color: '#10b981',
                  fontWeight: '700',
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 16px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.08)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.12) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.35)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.08)';
                }}
              >
                <CheckCircle className="w-5 h-5" />
                Mark Complete
              </button>

              <button
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '14px',
                  color: '#3b82f6',
                  fontWeight: '700',
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.12), inset 0 1px 0 rgba(255,255,255,0.08)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.18) 0%, rgba(59, 130, 246, 0.12) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.12), inset 0 1px 0 rgba(255,255,255,0.08)';
                }}
              >
                <Edit2 className="w-5 h-5" />
                Reschedule
              </button>

              {selectedEvent.dealId && (
                <button
                  onClick={handleViewDeal}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.12) 0%, rgba(0, 184, 212, 0.08) 100%)',
                    border: '1px solid rgba(0, 184, 212, 0.2)',
                    borderRadius: '14px',
                    color: '#00b8d4',
                    fontWeight: '700',
                    fontSize: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 16px rgba(0,184,212,0.12), inset 0 1px 0 rgba(255,255,255,0.08)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 184, 212, 0.18) 0%, rgba(0, 184, 212, 0.12) 100%)';
                    e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.35)';
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,184,212,0.3), inset 0 1px 0 rgba(255,255,255,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 184, 212, 0.12) 0%, rgba(0, 184, 212, 0.08) 100%)';
                    e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,184,212,0.12), inset 0 1px 0 rgba(255,255,255,0.08)';
                  }}
                >
                  <ExternalLink className="w-5 h-5" />
                  View Full Deal
                </button>
              )}
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
