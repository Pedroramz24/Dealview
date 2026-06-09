import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { API } from '../App';
import { toast } from 'sonner';
import {
  Calendar, Clock, Plus, Trash2, Edit2, Save, X,
  AlertTriangle, CheckCircle2, Upload, FileText, Download
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { colors, shadows, borderRadius, spacing } from '../styles/designSystem';

const getDateColor = (targetDate) => {
  if (!targetDate) return { bar: '#334155', text: '#94a3b8', label: 'No date set' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate + 'T00:00:00');
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { bar: '#ef4444', text: '#ef4444', label: `${Math.abs(diffDays)}d overdue`, pulse: true };
  if (diffDays <= 3) return { bar: '#ef4444', text: '#ef4444', label: `${diffDays}d left`, pulse: true };
  if (diffDays <= 14) return { bar: '#f59e0b', text: '#f59e0b', label: `${diffDays}d left`, pulse: false };
  return { bar: '#3b82f6', text: '#3b82f6', label: `${diffDays}d left`, pulse: false };
};

const getStatusIcon = (status, dateColor) => {
  if (status === 'completed') return <CheckCircle2 size={18} style={{ color: '#10b981' }} />;
  if (dateColor.bar === '#ef4444') return <AlertTriangle size={18} style={{ color: '#ef4444' }} />;
  return <Clock size={18} style={{ color: dateColor.text }} />;
};

const CriticalDatesTimeline = ({ dealId, isOwner }) => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', target_date: '', notes: '' });
  const [initializing, setInitializing] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);
  const fileInputRef = useRef(null);

  const getToken = useCallback(async () => {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token;
  }, []);

  const fetchTimeline = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API}/deals/${dealId}/timeline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMilestones(data.milestones || []);
      }
    } catch (e) {
      console.error('Failed to fetch timeline:', e);
    } finally {
      setLoading(false);
    }
  }, [dealId, getToken]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const initializeDefaults = async () => {
    setInitializing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/deals/${dealId}/timeline/initialize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        await fetchTimeline();
        toast.success('Timeline initialized with default milestones');
      }
    } catch (e) {
      toast.error('Failed to initialize timeline');
    } finally {
      setInitializing(false);
    }
  };

  const addMilestone = async () => {
    if (!newForm.name.trim()) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API}/deals/${dealId}/timeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newForm.name.trim(),
          target_date: newForm.target_date || null,
          notes: newForm.notes || ''
        })
      });
      if (res.ok) {
        setNewForm({ name: '', target_date: '', notes: '' });
        setShowAddForm(false);
        await fetchTimeline();
        toast.success('Milestone added');
      }
    } catch (e) {
      toast.error('Failed to add milestone');
    }
  };

  const updateMilestone = async (id, updates) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/deals/${dealId}/timeline/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        await fetchTimeline();
        setEditingId(null);
      }
    } catch (e) {
      toast.error('Failed to update milestone');
    }
  };

  const deleteMilestone = async (id) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/deals/${dealId}/timeline/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchTimeline();
      }
    } catch (e) {
      toast.error('Failed to delete milestone');
    }
  };

  const toggleStatus = async (milestone) => {
    const next = milestone.status === 'completed' ? 'pending' : 'completed';
    await updateMilestone(milestone.id, { status: next });
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditForm({ name: m.name, target_date: m.target_date || '', notes: m.notes || '' });
  };

  const saveEdit = () => {
    if (!editForm.name?.trim()) return;
    updateMilestone(editingId, {
      name: editForm.name.trim(),
      target_date: editForm.target_date || null,
      notes: editForm.notes || ''
    });
  };

  // Document upload for a milestone
  const handleDocUpload = async (milestoneId, file) => {
    if (!file) return;
    setUploadingFor(milestoneId);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API}/deals/${dealId}/timeline/${milestoneId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        await fetchTimeline();
        toast.success('Document uploaded');
      } else {
        toast.error('Failed to upload document');
      }
    } catch (e) {
      toast.error('Failed to upload document');
    } finally {
      setUploadingFor(null);
    }
  };

  const handleDeleteDoc = async (milestoneId, docId) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/deals/${dealId}/timeline/${milestoneId}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchTimeline();
      }
    } catch (e) {
      toast.error('Failed to delete document');
    }
  };

  const triggerFileInput = (milestoneId) => {
    setUploadingFor(milestoneId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && uploadingFor) {
      handleDocUpload(uploadingFor, file);
    }
  };

  // Compute overall progress
  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const progressPct = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return (
      <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textTertiary }}>
        Loading timeline...
      </div>
    );
  }

  // Empty state - offer to initialize
  if (milestones.length === 0 && !showAddForm) {
    return (
      <div data-testid="timeline-empty-state" style={{
        padding: spacing.xl, textAlign: 'center',
        background: colors.surfaceCard, borderRadius: borderRadius.md,
        boxShadow: shadows.cardElevation
      }}>
        <Calendar size={48} style={{ color: colors.primary, margin: '0 auto 16px', opacity: 0.6 }} />
        <h3 style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
          No Timeline Set Up Yet
        </h3>
        <p style={{ color: colors.textTertiary, fontSize: '14px', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
          Track critical dates like feasibility deadlines, loan commitment, and closing dates with a visual timeline.
        </p>
        {isOwner && (
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button
              data-testid="initialize-timeline-btn"
              onClick={initializeDefaults}
              disabled={initializing}
              style={{ background: colors.primary, border: 'none', color: '#fff' }}
            >
              <Plus size={16} style={{ marginRight: '8px' }} />
              {initializing ? 'Setting up...' : 'Initialize Default Timeline'}
            </Button>
            <Button
              data-testid="add-first-milestone-btn"
              onClick={() => setShowAddForm(true)}
              variant="outline"
              style={{ borderColor: colors.border, color: colors.textSecondary }}
            >
              <Plus size={16} style={{ marginRight: '8px' }} />
              Add Custom Milestone
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="critical-dates-timeline" style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Hidden file input for document uploads */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={onFileChange}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
      />

      {/* Header with today's date */}
      <div style={{
        background: colors.surfaceCard, borderRadius: borderRadius.md,
        padding: spacing.lg, boxShadow: shadows.cardElevation,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ color: colors.textTertiary, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
            Today's Date
          </div>
          <div data-testid="timeline-today-date" style={{ color: colors.textPrimary, fontSize: '20px', fontWeight: '700' }}>
            {today}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: colors.textTertiary, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Progress
            </div>
            <div style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: '600' }}>
              {completedCount}/{milestones.length}
            </div>
          </div>
          {isOwner && (
            <Button
              data-testid="toggle-edit-mode-btn"
              onClick={() => { setEditMode(!editMode); setEditingId(null); }}
              variant="outline"
              size="sm"
              style={{
                borderColor: editMode ? colors.primary : colors.border,
                color: editMode ? colors.primary : colors.textSecondary,
                background: editMode ? 'rgba(255,0,0,0.1)' : 'transparent'
              }}
            >
              <Edit2 size={14} style={{ marginRight: '6px' }} />
              {editMode ? 'Done Editing' : 'Edit Timeline'}
            </Button>
          )}
        </div>
      </div>

      {/* Overall progress bar */}
      <div style={{
        background: colors.surfaceCard, borderRadius: borderRadius.md,
        padding: '16px 24px', boxShadow: shadows.cardElevation
      }}>
        <div style={{
          height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px',
          overflow: 'hidden', position: 'relative'
        }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            background: 'linear-gradient(90deg, #ff0000, #cc0000)',
            width: `${progressPct}%`,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: progressPct > 0 ? '0 0 12px rgba(255,0,0,0.4)' : 'none'
          }} />
        </div>
      </div>

      {/* Milestone pipeline */}
      <div style={{
        background: colors.surfaceCard, borderRadius: borderRadius.md,
        padding: spacing.lg, boxShadow: shadows.cardElevation
      }}>
        {milestones.map((m, idx) => {
          const dateColor = getDateColor(m.target_date);
          const isCompleted = m.status === 'completed';
          const isEditing = editingId === m.id;
          const docs = m.documents || [];

          return (
            <div key={m.id} data-testid={`milestone-${idx}`}>
              {/* Connecting bar */}
              {idx > 0 && (
                <div style={{
                  display: 'flex', justifyContent: 'center', padding: '0 0 0 23px'
                }}>
                  <div style={{
                    width: '3px', height: '32px',
                    background: isCompleted || milestones[idx - 1]?.status === 'completed'
                      ? '#10b981'
                      : dateColor.bar,
                    borderRadius: '2px',
                    boxShadow: dateColor.pulse && !isCompleted
                      ? `0 0 8px ${dateColor.bar}80`
                      : 'none',
                    animation: dateColor.pulse && !isCompleted ? 'pulse-glow 2s ease-in-out infinite' : 'none',
                  }} />
                </div>
              )}

              {/* Milestone node */}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '16px',
                padding: '12px', borderRadius: '10px',
                background: isEditing ? 'rgba(255,0,0,0.05)' : isCompleted ? 'rgba(16,185,129,0.05)' : 'transparent',
                border: isEditing ? '1px solid rgba(255,0,0,0.2)' : '1px solid transparent',
                transition: 'all 0.2s'
              }}>
                {/* Node circle */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isOwner) toggleStatus(m);
                  }}
                  style={{
                    width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                    background: isCompleted
                      ? 'rgba(16,185,129,0.15)'
                      : `${dateColor.bar}20`,
                    border: `2px solid ${isCompleted ? '#10b981' : dateColor.bar}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: isOwner ? 'pointer' : 'default',
                    transition: 'all 0.3s',
                    boxShadow: dateColor.pulse && !isCompleted
                      ? `0 0 16px ${dateColor.bar}40`
                      : isCompleted ? '0 0 12px rgba(16,185,129,0.3)' : 'none',
                  }}
                  data-testid={`milestone-status-${idx}`}
                >
                  {getStatusIcon(m.status, dateColor)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <Input
                        data-testid={`milestone-name-input-${idx}`}
                        value={editForm.name}
                        onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Milestone name"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                      />
                      <input
                        data-testid={`milestone-date-input-${idx}`}
                        type="date"
                        value={editForm.target_date}
                        onChange={(e) => setEditForm(f => ({ ...f, target_date: e.target.value }))}
                        style={{
                          padding: '8px 10px', borderRadius: '6px',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#e2e8f0', fontSize: '14px', outline: 'none',
                          colorScheme: 'dark'
                        }}
                      />
                      <textarea
                        data-testid={`milestone-notes-input-${idx}`}
                        value={editForm.notes}
                        onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Notes (optional)"
                        rows={2}
                        style={{
                          padding: '8px 10px', borderRadius: '6px', resize: 'vertical',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#e2e8f0', fontSize: '13px', outline: 'none', fontFamily: 'inherit'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button onClick={saveEdit} size="sm" style={{ background: colors.primary, border: 'none', color: '#fff' }}>
                          <Save size={14} style={{ marginRight: '4px' }} /> Save
                        </Button>
                        <Button onClick={() => setEditingId(null)} size="sm" variant="outline" style={{ borderColor: colors.border, color: colors.textSecondary }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{
                          color: isCompleted ? '#10b981' : colors.textPrimary,
                          fontSize: '15px', fontWeight: '600',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          opacity: isCompleted ? 0.7 : 1
                        }}>
                          {m.name}
                        </span>
                        {m.target_date && !isCompleted && (
                          <span style={{
                            fontSize: '11px', fontWeight: '600', padding: '2px 8px',
                            borderRadius: '12px',
                            background: `${dateColor.bar}20`,
                            color: dateColor.text
                          }}>
                            {dateColor.label}
                          </span>
                        )}
                        {isCompleted && (
                          <span style={{
                            fontSize: '11px', fontWeight: '600', padding: '2px 8px',
                            borderRadius: '12px', background: 'rgba(16,185,129,0.15)', color: '#10b981'
                          }}>
                            Done
                          </span>
                        )}
                      </div>
                      {m.target_date && (
                        <div style={{ color: colors.textTertiary, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={12} />
                          {new Date(m.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                      {m.notes && (
                        <div style={{ color: colors.textTertiary, fontSize: '12px', marginTop: '4px', fontStyle: 'italic' }}>
                          {m.notes}
                        </div>
                      )}

                      {/* Documents section per milestone */}
                      {(docs.length > 0 || isOwner) && (
                        <div style={{ marginTop: '8px' }}>
                          {docs.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px' }}>
                              {docs.map(doc => (
                                <div key={doc.id} data-testid={`milestone-doc-${doc.id}`} style={{
                                  display: 'flex', alignItems: 'center', gap: '8px',
                                  padding: '4px 8px', borderRadius: '6px',
                                  background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.06)'
                                }}>
                                  <FileText size={13} style={{ color: colors.primary, flexShrink: 0 }} />
                                  <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: colors.textSecondary, fontSize: '12px',
                                      textDecoration: 'none', flex: 1,
                                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                    }}
                                    title={doc.file_name}
                                  >
                                    {doc.file_name}
                                  </a>
                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                                    style={{ color: colors.textTertiary, flexShrink: 0 }}>
                                    <Download size={12} />
                                  </a>
                                  {isOwner && (
                                    <button
                                      onClick={() => handleDeleteDoc(m.id, doc.id)}
                                      data-testid={`delete-milestone-doc-${doc.id}`}
                                      style={{
                                        background: 'transparent', border: 'none',
                                        color: '#ef4444', cursor: 'pointer', padding: '2px', flexShrink: 0
                                      }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {isOwner && (
                            <button
                              onClick={() => triggerFileInput(m.id)}
                              disabled={uploadingFor === m.id}
                              data-testid={`upload-doc-milestone-${idx}`}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '4px 10px', borderRadius: '6px',
                                background: 'transparent',
                                border: '1px dashed rgba(255,255,255,0.12)',
                                color: colors.textTertiary, fontSize: '12px',
                                cursor: 'pointer', transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.color = colors.primary; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = colors.textTertiary; }}
                            >
                              <Upload size={12} />
                              {uploadingFor === m.id ? 'Uploading...' : 'Upload Document'}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Actions (edit mode only) */}
                {editMode && isOwner && !isEditing && (
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                    <button
                      onClick={() => startEdit(m)}
                      style={{ background: 'transparent', border: 'none', color: colors.textSecondary, cursor: 'pointer', padding: '4px' }}
                      data-testid={`milestone-edit-${idx}`}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteMilestone(m.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                      data-testid={`milestone-delete-${idx}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add new milestone */}
        {isOwner && !showAddForm && (
          <div style={{ marginTop: '16px' }}>
            <button
              data-testid="show-add-milestone-btn"
              onClick={() => setShowAddForm(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                padding: '12px', borderRadius: '10px',
                border: '1px dashed rgba(255,255,255,0.1)',
                background: 'transparent', color: colors.textTertiary,
                cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.color = colors.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = colors.textTertiary; }}
            >
              <Plus size={16} /> Add Milestone
            </button>
          </div>
        )}

        {/* Add new milestone form - inline with date and notes */}
        {isOwner && showAddForm && (
          <div data-testid="add-milestone-form" style={{
            marginTop: '16px', padding: '16px', borderRadius: '10px',
            border: '1px solid rgba(255,0,0,0.2)', background: 'rgba(255,0,0,0.03)'
          }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: colors.textPrimary, marginBottom: '12px' }}>
              New Milestone
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Input
                data-testid="new-milestone-name-input"
                value={newForm.name}
                onChange={(e) => setNewForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Milestone name (e.g., Loan Commitment)"
                autoFocus
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
              <input
                data-testid="new-milestone-date-input"
                type="date"
                value={newForm.target_date}
                onChange={(e) => setNewForm(f => ({ ...f, target_date: e.target.value }))}
                style={{
                  padding: '8px 10px', borderRadius: '6px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0', fontSize: '14px', outline: 'none',
                  colorScheme: 'dark'
                }}
              />
              <textarea
                data-testid="new-milestone-notes-input"
                value={newForm.notes}
                onChange={(e) => setNewForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes (optional)"
                rows={2}
                style={{
                  padding: '8px 10px', borderRadius: '6px', resize: 'vertical',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0', fontSize: '13px', outline: 'none', fontFamily: 'inherit'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  data-testid="add-milestone-btn"
                  onClick={addMilestone}
                  disabled={!newForm.name.trim()}
                  size="sm"
                  style={{ background: colors.primary, border: 'none', color: '#fff' }}
                >
                  <Plus size={14} style={{ marginRight: '4px' }} /> Add Milestone
                </Button>
                <Button
                  data-testid="cancel-add-milestone-btn"
                  onClick={() => { setShowAddForm(false); setNewForm({ name: '', target_date: '', notes: '' }); }}
                  size="sm"
                  variant="outline"
                  style={{ borderColor: colors.border, color: colors.textSecondary }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pulse animation CSS */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default CriticalDatesTimeline;
