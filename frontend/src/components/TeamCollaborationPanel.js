import React from 'react';
import { Users, Save } from 'lucide-react';

const TeamCollaborationPanel = ({ 
  deal,
  isSharedWithTeam,
  assignedTo,
  teamMembers,
  teamNotesRef,
  onToggleSharing,
  onAssignDeal,
  onSaveTeamNotes
}) => {
  if (!deal?.team_id) {
    return null;
  }

  return (
    <div className="glass-surface" style={{
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      marginTop: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'rgba(0, 184, 212, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Users size={18} style={{ color: '#00b8d4' }} />
        </div>
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
          Team Collaboration
        </h3>
      </div>

      {/* Share with Team Toggle */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 600 }}>
            Share with Team
          </label>
          <button
            onClick={onToggleSharing}
            style={{
              width: '52px',
              height: '28px',
              borderRadius: '14px',
              background: isSharedWithTeam ? '#00b8d4' : 'rgba(255, 255, 255, 0.1)',
              border: `1px solid ${isSharedWithTeam ? '#00b8d4' : 'rgba(255, 255, 255, 0.15)'}`,
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.25s ease'
            }}
          >
            <div style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: '2px',
              left: isSharedWithTeam ? '27px' : '3px',
              transition: 'all 0.25s ease',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
            }} />
          </button>
        </div>
        <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>
          {isSharedWithTeam ? 'All team members can view this deal' : 'Only you can view this deal'}
        </p>
      </div>

      {/* Assign to Team Member */}
      {teamMembers.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            Assign to
          </label>
          <select
            value={assignedTo || ''}
            onChange={(e) => onAssignDeal(e.target.value || null)}
            style={{
              width: '100%',
              padding: '11px 14px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="" style={{ background: '#0a0a0a' }}>Unassigned</option>
            {teamMembers.map(member => (
              <option key={member.user_id} value={member.user_id} style={{ background: '#0a0a0a' }}>
                {member.full_name || member.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Team Notes */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 600 }}>
            Team Notes
          </label>
          <button
            onClick={onSaveTeamNotes}
            style={{
              padding: '6px 14px',
              background: 'rgba(0, 184, 212, 0.1)',
              border: '1px solid rgba(0, 184, 212, 0.3)',
              borderRadius: '6px',
              color: '#00b8d4',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Save size={13} />
            Save
          </button>
        </div>
        <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px', marginBottom: '8px' }}>
          Shared notes visible to all team members
        </p>
        <textarea
          ref={teamNotesRef}
          defaultValue={deal?.team_notes || ''}
          placeholder="Add notes for your team..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px 14px',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            lineHeight: '1.5',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
      </div>
    </div>
  );
};

export default TeamCollaborationPanel;
