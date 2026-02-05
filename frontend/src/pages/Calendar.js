import React, { useState, useEffect, useCallback, useContext } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { AuthContext } from '../App';
import { supabase } from '../supabaseClient';
import { Plus, X, CheckCircle, Edit2, Clock, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EVENT_COLORS = {
  meeting: { primary: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  call: { primary: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  task: { primary: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
  deadline: { primary: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  deal: { primary: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  other: { primary: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)' }
};

const EVENT_TYPE_OPTIONS = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'call', label: 'Call' },
  { value: 'task', label: 'Task' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'deal', label: 'Deal' },
  { value: 'other', label: 'Other' }
];

const CalendarView = () => {
  const { session } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventPanel, setShowEventPanel] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  const calendarRef = React.useRef(null);

  // Form state for creating/editing events
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    all_day: false,
    event_type: 'task',
    color: '#00b8d4'
  });

  const getAuthHeaders = useCallback(() => {
    if (!session?.access_token) return null;
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }, [session]);

  // Fetch events from V2 API
  const fetchEvents = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/calendar/events`, { headers });
      const data = await response.json();

      if (data.success && data.events) {
        const formattedEvents = data.events.map(event => {
          const colorScheme = EVENT_COLORS[event.event_type] || EVENT_COLORS.other;
          return {
            id: event.id,
            title: event.title,
            start: event.start_time,
            end: event.end_time || event.start_time,
            allDay: event.all_day,
            backgroundColor: colorScheme.primary,
            borderColor: 'transparent',
            extendedProps: {
              ...event,
              colorScheme
            }
          };
        });
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Create new event
  const handleCreateEvent = async () => {
    if (!eventForm.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }
    if (!eventForm.start_time) {
      toast.error('Please select a start time');
      return;
    }

    const headers = getAuthHeaders();
    if (!headers) return;

    try {
      const response = await fetch(`${API_URL}/api/calendar/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: eventForm.title,
          description: eventForm.description,
          start_time: new Date(eventForm.start_time).toISOString(),
          end_time: eventForm.end_time ? new Date(eventForm.end_time).toISOString() : null,
          all_day: eventForm.all_day,
          event_type: eventForm.event_type,
          color: EVENT_COLORS[eventForm.event_type]?.primary || '#00b8d4'
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Event created successfully!');
        setShowCreateModal(false);
        resetForm();
        fetchEvents();
      } else {
        toast.error(data.detail || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  // Update event
  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;

    const headers = getAuthHeaders();
    if (!headers) return;

    try {
      const response = await fetch(`${API_URL}/api/calendar/events/${selectedEvent.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: eventForm.title,
          description: eventForm.description,
          start_time: eventForm.start_time ? new Date(eventForm.start_time).toISOString() : undefined,
          end_time: eventForm.end_time ? new Date(eventForm.end_time).toISOString() : null,
          all_day: eventForm.all_day,
          event_type: eventForm.event_type
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Event updated successfully!');
        setShowEditMode(false);
        setShowEventPanel(false);
        fetchEvents();
      } else {
        toast.error(data.detail || 'Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  };

  // Delete event
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    const headers = getAuthHeaders();
    if (!headers) return;

    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`${API_URL}/api/calendar/events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Event deleted successfully!');
        setShowEventPanel(false);
        setSelectedEvent(null);
        fetchEvents();
      } else {
        toast.error(data.detail || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  // Handle event click
  const handleEventClick = (info) => {
    const event = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      allDay: info.event.allDay,
      ...info.event.extendedProps
    };
    setSelectedEvent(event);
    setShowEventPanel(true);
    setShowEditMode(false);
  };

  // Start editing
  const startEditing = () => {
    if (!selectedEvent) return;
    setEventForm({
      title: selectedEvent.title || '',
      description: selectedEvent.description || '',
      start_time: selectedEvent.start_time ? new Date(selectedEvent.start_time).toISOString().slice(0, 16) : '',
      end_time: selectedEvent.end_time ? new Date(selectedEvent.end_time).toISOString().slice(0, 16) : '',
      all_day: selectedEvent.all_day || false,
      event_type: selectedEvent.event_type || 'task',
      color: selectedEvent.color || '#00b8d4'
    });
    setShowEditMode(true);
  };

  // Reset form
  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      all_day: false,
      event_type: 'task',
      color: '#00b8d4'
    });
  };

  // Open create modal
  const openCreateModal = () => {
    resetForm();
    // Set default start time to now
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
    setEventForm(prev => ({
      ...prev,
      start_time: now.toISOString().slice(0, 16)
    }));
    setShowCreateModal(true);
  };

  return (
    <div data-testid="calendar-page" style={{ height: '100vh', background: 'transparent', position: 'relative', overflow: 'hidden' }}>
      {/* Main Container */}
      <div style={{ height: '100%', position: 'relative', zIndex: 1, padding: '20px' }}>
        {/* Calendar Card */}
        <div style={{
          height: '100%',
          background: 'linear-gradient(145deg, rgba(12, 16, 22, 0.96) 0%, rgba(8, 12, 18, 0.96) 100%)',
          borderRadius: '28px',
          padding: '0',
          boxShadow: '0 40px 100px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(30px)'
        }}>
          {/* Top edge glow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '0',
            right: '0',
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(0, 184, 212, 0.3) 50%, transparent 100%)',
            pointerEvents: 'none'
          }} />

          {/* Toolbar */}
          <div style={{
            padding: '28px 40px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
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
                border: '1px solid rgba(0,184,212,0.3)'
              }}>
                <CalendarIcon className="w-6 h-6" style={{ color: '#00d4ff' }} />
              </div>
              <div>
                <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '900', letterSpacing: '-0.03em', marginBottom: '2px' }}>Calendar</h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: '600' }}>Manage your events</p>
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
                  data-testid="calendar-prev-btn"
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
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <span style={{ 
                  color: '#ffffff', 
                  fontSize: '16px', 
                  fontWeight: '800', 
                  minWidth: '140px', 
                  textAlign: 'center'
                }}>
                  {currentMonth}
                </span>
                <button
                  data-testid="calendar-next-btn"
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
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>

              {/* Today Button */}
              <button
                data-testid="calendar-today-btn"
                onClick={() => calendarRef.current?.getApi().today()}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.15), rgba(0, 184, 212, 0.08))',
                  border: '1px solid rgba(0, 184, 212, 0.25)',
                  borderRadius: '10px',
                  color: '#00b8d4',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Today
              </button>

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
                    data-testid={`calendar-view-${viewName}`}
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
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Create Event Button */}
              <button
                data-testid="create-event-btn"
                onClick={openCreateModal}
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
                  transition: 'all 0.3s ease'
                }}
              >
                <Plus className="w-5 h-5" />
                Create Event
              </button>
            </div>
          </div>

          {/* Calendar */}
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="loading-spinner"></div>
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
                  const displayedDate = dateInfo.view.currentStart;
                  const monthYear = displayedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  setCurrentMonth(monthYear);
                }}
                height="100%"
                expandRows={true}
                dayMaxEvents={3}
                weekends={true}
                fixedWeekCount={false}
                showNonCurrentDates={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* Event Details Panel */}
      {showEventPanel && selectedEvent && (
        <div
          data-testid="event-details-panel"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '480px',
            height: '100vh',
            background: 'linear-gradient(145deg, rgba(8, 10, 14, 0.98) 0%, rgba(12, 15, 20, 0.98) 100%)',
            backdropFilter: 'blur(40px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '-40px 0 100px rgba(0, 0, 0, 0.9)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Panel Header */}
          <div style={{
            padding: '28px 32px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '900' }}>
                {showEditMode ? 'Edit Event' : 'Event Details'}
              </h2>
              <button
                data-testid="close-event-panel-btn"
                onClick={() => {
                  setShowEventPanel(false);
                  setShowEditMode(false);
                }}
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Event Type Badge */}
            {selectedEvent.event_type && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                background: EVENT_COLORS[selectedEvent.event_type]?.bg || EVENT_COLORS.other.bg,
                color: EVENT_COLORS[selectedEvent.event_type]?.primary || EVENT_COLORS.other.primary,
                border: `1px solid ${EVENT_COLORS[selectedEvent.event_type]?.primary || EVENT_COLORS.other.primary}30`
              }}>
                {selectedEvent.event_type.charAt(0).toUpperCase() + selectedEvent.event_type.slice(1)}
              </div>
            )}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '28px 32px' }}>
            {showEditMode ? (
              /* Edit Form */
              <div className="space-y-5">
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Title *
                  </label>
                  <input
                    data-testid="edit-event-title"
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Event Type
                  </label>
                  <select
                    data-testid="edit-event-type"
                    value={eventForm.event_type}
                    onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  >
                    {EVENT_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Start Time *
                  </label>
                  <input
                    data-testid="edit-event-start"
                    type="datetime-local"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    End Time
                  </label>
                  <input
                    data-testid="edit-event-end"
                    type="datetime-local"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    data-testid="edit-event-allday"
                    onClick={() => setEventForm({ ...eventForm, all_day: !eventForm.all_day })}
                    style={{
                      width: '48px',
                      height: '26px',
                      background: eventForm.all_day ? 'rgba(0,184,212,0.3)' : 'rgba(255,255,255,0.05)',
                      border: eventForm.all_day ? '1px solid rgba(0,184,212,0.4)' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '13px',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: eventForm.all_day ? '24px' : '2px',
                      width: '20px',
                      height: '20px',
                      background: eventForm.all_day ? '#00d4ff' : 'rgba(255,255,255,0.4)',
                      borderRadius: '10px',
                      transition: 'all 0.3s ease'
                    }} />
                  </button>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>All Day Event</span>
                </div>

                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Description
                  </label>
                  <textarea
                    data-testid="edit-event-description"
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-6">
                <div>
                  <h3 style={{ color: '#ffffff', fontSize: '28px', fontWeight: '900', lineHeight: '1.2', marginBottom: '16px' }}>
                    {selectedEvent.title}
                  </h3>
                  
                  <div className="flex items-center gap-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, rgba(0,184,212,0.15), rgba(0,184,212,0.08))',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(0,184,212,0.25)'
                    }}>
                      <Clock className="w-5 h-5" style={{ color: '#00b8d4' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Scheduled</p>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>
                        {new Date(selectedEvent.start_time || selectedEvent.start).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                        {!selectedEvent.all_day && (
                          <span> at {new Date(selectedEvent.start_time || selectedEvent.start).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit', 
                            hour12: true 
                          })}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedEvent.description && (
                  <div style={{
                    padding: '16px 20px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px'
                  }}>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700', marginBottom: '10px' }}>Description</p>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: '1.6' }}>
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 pt-4">
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                    Actions
                  </p>
                  
                  <button
                    data-testid="edit-event-btn"
                    onClick={startEditing}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.08))',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '12px',
                      color: '#3b82f6',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Event
                  </button>

                  <button
                    data-testid="delete-event-btn"
                    onClick={handleDeleteEvent}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.08))',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '12px',
                      color: '#ef4444',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Event
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer for Edit Mode */}
          {showEditMode && (
            <div style={{
              padding: '20px 32px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                data-testid="cancel-edit-btn"
                onClick={() => setShowEditMode(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'rgba(255,255,255,0.6)',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                data-testid="save-edit-btn"
                onClick={handleUpdateEvent}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.25), rgba(59, 130, 246, 0.25))',
                  border: '1px solid rgba(0, 184, 212, 0.4)',
                  borderRadius: '12px',
                  color: '#00d4ff',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div
          data-testid="create-event-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div style={{
            width: '500px',
            maxHeight: '90vh',
            background: 'linear-gradient(145deg, rgba(12, 16, 22, 0.98) 0%, rgba(18, 22, 28, 0.98) 100%)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 40px 100px rgba(0, 0, 0, 0.9)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, rgba(0,184,212,0.2), rgba(0,184,212,0.1))',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(0,184,212,0.3)'
                }}>
                  <Plus className="w-5 h-5" style={{ color: '#00d4ff' }} />
                </div>
                <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '800' }}>Create Event</h2>
              </div>
              <button
                data-testid="close-create-modal-btn"
                onClick={() => setShowCreateModal(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px 28px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div className="space-y-5">
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Event Title *
                  </label>
                  <input
                    data-testid="create-event-title"
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="Enter event title..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Event Type
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {EVENT_TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        data-testid={`event-type-${opt.value}`}
                        onClick={() => setEventForm({ ...eventForm, event_type: opt.value })}
                        style={{
                          padding: '10px 16px',
                          background: eventForm.event_type === opt.value 
                            ? EVENT_COLORS[opt.value].bg 
                            : 'rgba(255, 255, 255, 0.03)',
                          border: eventForm.event_type === opt.value 
                            ? `1px solid ${EVENT_COLORS[opt.value].primary}40` 
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          color: eventForm.event_type === opt.value 
                            ? EVENT_COLORS[opt.value].primary 
                            : 'rgba(255, 255, 255, 0.6)',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Start Time *
                  </label>
                  <input
                    data-testid="create-event-start"
                    type="datetime-local"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    End Time (Optional)
                  </label>
                  <input
                    data-testid="create-event-end"
                    type="datetime-local"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    data-testid="create-event-allday"
                    onClick={() => setEventForm({ ...eventForm, all_day: !eventForm.all_day })}
                    style={{
                      width: '48px',
                      height: '26px',
                      background: eventForm.all_day ? 'rgba(0,184,212,0.3)' : 'rgba(255,255,255,0.05)',
                      border: eventForm.all_day ? '1px solid rgba(0,184,212,0.4)' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '13px',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: eventForm.all_day ? '24px' : '2px',
                      width: '20px',
                      height: '20px',
                      background: eventForm.all_day ? '#00d4ff' : 'rgba(255,255,255,0.4)',
                      borderRadius: '10px',
                      transition: 'all 0.3s ease'
                    }} />
                  </button>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '600' }}>All Day Event</span>
                </div>

                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Description (Optional)
                  </label>
                  <textarea
                    data-testid="create-event-description"
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    placeholder="Add notes or details..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '20px 28px',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                data-testid="cancel-create-btn"
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'rgba(255,255,255,0.6)',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                data-testid="submit-create-btn"
                onClick={handleCreateEvent}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.25), rgba(59, 130, 246, 0.25))',
                  border: '1px solid rgba(0, 184, 212, 0.4)',
                  borderRadius: '12px',
                  color: '#00d4ff',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle className="w-4 h-4" />
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
