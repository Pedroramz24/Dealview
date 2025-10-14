import React, { useState, useMemo } from 'react';
import { Clock, User, FileText } from 'lucide-react';

const DealTimeline = ({ deal }) => {
  const [hoveredMilestone, setHoveredMilestone] = useState(null);

  // Define all possible milestones in order
  const milestoneConfig = [
    {
      id: 'under_contract',
      label: 'Under Contract',
      dateField: 'under_contract_date',
      responsibleField: 'under_contract_responsible',
      notesField: 'under_contract_notes',
    },
    {
      id: 'earnest_money',
      label: 'Earnest Money Due',
      dateField: 'earnest_money_due_date',
      responsibleField: 'earnest_money_responsible',
      notesField: 'earnest_money_notes',
    },
    {
      id: 'property_info',
      label: 'Property Info Delivery',
      dateField: 'property_info_delivery_date',
      responsibleField: 'property_info_responsible',
      notesField: 'property_info_notes',
    },
    {
      id: 'title_commitment',
      label: 'Title Commitment Due',
      dateField: 'title_commitment_due_date',
      responsibleField: 'title_commitment_responsible',
      notesField: 'title_commitment_notes',
    },
    {
      id: 'seller_survey',
      label: 'Seller Survey Delivery',
      dateField: 'seller_survey_delivery_date',
      responsibleField: 'seller_survey_responsible',
      notesField: 'seller_survey_notes',
    },
    {
      id: 'feasibility_period',
      label: 'Feasibility Period Ends',
      dateField: 'feasibility_period_ends_date',
      responsibleField: 'feasibility_period_responsible',
      notesField: 'feasibility_period_notes',
    },
    {
      id: 'buyer_objections',
      label: 'Buyer Objections Due',
      dateField: 'buyer_objections_due_date',
      responsibleField: 'buyer_objections_responsible',
      notesField: 'buyer_objections_notes',
    },
    {
      id: 'seller_response',
      label: 'Seller Response Due',
      dateField: 'seller_response_due_date',
      responsibleField: 'seller_response_responsible',
      notesField: 'seller_response_notes',
    },
    {
      id: 'closing',
      label: 'Closing',
      dateField: 'closing_date',
      responsibleField: 'closing_responsible',
      notesField: 'closing_notes',
    },
  ];

  // Build milestone data from deal
  const milestones = useMemo(() => {
    return milestoneConfig
      .map((config) => ({
        ...config,
        date: deal?.[config.dateField],
        responsible: deal?.[config.responsibleField],
        notes: deal?.[config.notesField],
      }))
      .filter((m) => m.date); // Only include milestones with dates
  }, [deal]);

  // Calculate timeline metrics
  const timelineMetrics = useMemo(() => {
    if (milestones.length < 2) return null;

    const dates = milestones.map((m) => new Date(m.date).getTime());
    const startDate = Math.min(...dates);
    const endDate = Math.max(...dates);
    const totalDuration = endDate - startDate;
    const currentDate = new Date().getTime();

    // Calculate progress percentage
    const currentProgress = ((currentDate - startDate) / totalDuration) * 100;
    const clampedProgress = Math.max(0, Math.min(100, currentProgress));

    // Calculate position for each milestone
    const milestonesWithPosition = milestones.map((m) => {
      const milestoneDate = new Date(m.date).getTime();
      const position = ((milestoneDate - startDate) / totalDuration) * 100;
      
      // Determine milestone status
      let status = 'upcoming';
      if (milestoneDate < currentDate) {
        status = 'completed';
      } else if (Math.abs(milestoneDate - currentDate) < 86400000 * 3) {
        // Within 3 days
        status = 'active';
      }

      return {
        ...m,
        position,
        status,
        timestamp: milestoneDate,
      };
    });

    return {
      startDate,
      endDate,
      totalDuration,
      currentProgress: clampedProgress,
      milestones: milestonesWithPosition,
    };
  }, [milestones]);

  // Don't render if no milestones or not enough data
  if (!timelineMetrics || milestones.length < 2) {
    return null;
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '32px 40px',
        marginBottom: '24px',
        overflow: 'hidden',
      }}
    >
      <h3
        style={{
          color: '#00b8d4',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '48px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Clock className="w-4 h-4 mr-2" />
        Transaction Timeline
      </h3>

      {/* Timeline Container with proper spacing */}
      <div style={{ position: 'relative', height: '200px', paddingLeft: '20px', paddingRight: '20px' }}>
        {/* Background track - centered vertically */}
        <div
          style={{
            position: 'absolute',
            top: '100px',
            left: '20px',
            right: '20px',
            height: '3px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
          }}
        />

        {/* Progress bar (completed portion) */}
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '0',
            height: '4px',
            width: `${timelineMetrics.currentProgress}%`,
            background: 'linear-gradient(90deg, #00b8d4, #00d4ff)',
            borderRadius: '2px',
            boxShadow: '0 0 12px rgba(0, 184, 212, 0.5)',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {/* Current date indicator (moving dot) */}
        {timelineMetrics.currentProgress > 0 && timelineMetrics.currentProgress < 100 && (
          <div
            style={{
              position: 'absolute',
              top: '72px',
              left: `${timelineMetrics.currentProgress}%`,
              transform: 'translateX(-50%)',
              width: '20px',
              height: '20px',
              background: '#00b8d4',
              borderRadius: '50%',
              boxShadow: '0 0 16px rgba(0, 184, 212, 0.8), 0 0 24px rgba(0, 184, 212, 0.4)',
              border: '3px solid rgba(0, 0, 0, 0.8)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              zIndex: 10,
            }}
          />
        )}

        {/* Milestone markers */}
        {timelineMetrics.milestones.map((milestone, index) => {
          // Alternate labels above and below the timeline
          const isAbove = index % 2 === 0;
          
          return (
            <div
              key={milestone.id}
              style={{
                position: 'absolute',
                top: '80px',
                left: `${milestone.position}%`,
                transform: 'translateX(-50%)',
                zIndex: 5,
              }}
              onMouseEnter={() => setHoveredMilestone(milestone.id)}
              onMouseLeave={() => setHoveredMilestone(null)}
            >
              {/* Milestone label - positioned above or below */}
              <div
                style={{
                  position: 'absolute',
                  textAlign: 'center',
                  minWidth: '140px',
                  maxWidth: '140px',
                  transform: 'translateX(-50%)',
                  left: '50%',
                  [isAbove ? 'bottom' : 'top']: isAbove ? '52px' : '52px',
                }}
              >
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color:
                      milestone.status === 'completed' || milestone.status === 'active'
                        ? '#FFFFFF'
                        : 'rgba(255, 255, 255, 0.5)',
                    marginBottom: '4px',
                    lineHeight: '1.3',
                  }}
                >
                  {milestone.label}
                </p>
                <p
                  style={{
                    fontSize: '10px',
                    color:
                      milestone.status === 'completed' || milestone.status === 'active'
                        ? '#00b8d4'
                        : 'rgba(255, 255, 255, 0.4)',
                  }}
                >
                  {formatDate(milestone.date)}
                </p>
              </div>

              {/* Vertical marker line - extends up or down based on position */}
              <div
                style={{
                  width: '2px',
                  height: isAbove ? '60px' : '60px',
                  background:
                    milestone.status === 'completed'
                      ? isAbove 
                        ? 'linear-gradient(0deg, #00b8d4, rgba(0, 184, 212, 0.3))'
                        : 'linear-gradient(180deg, #00b8d4, rgba(0, 184, 212, 0.3))'
                      : milestone.status === 'active'
                      ? '#00b8d4'
                      : 'rgba(255, 255, 255, 0.3)',
                  margin: '0 auto',
                  transition: 'all 0.3s ease',
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  [isAbove ? 'bottom' : 'top']: '-6px',
                }}
              />

              {/* Milestone dot */}
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background:
                    milestone.status === 'completed'
                      ? '#00b8d4'
                      : milestone.status === 'active'
                      ? '#00b8d4'
                      : 'rgba(255, 255, 255, 0.15)',
                  border:
                    milestone.status === 'completed'
                      ? '2px solid #00b8d4'
                      : milestone.status === 'active'
                      ? '2px solid #00b8d4'
                      : '2px solid rgba(255, 255, 255, 0.3)',
                  margin: '0 auto',
                  position: 'relative',
                  top: '-6px',
                  boxShadow:
                    milestone.status === 'completed'
                      ? '0 0 12px rgba(0, 184, 212, 0.6)'
                      : milestone.status === 'active'
                      ? '0 0 16px rgba(0, 184, 212, 0.8)'
                      : 'none',
                  transition: 'all 0.3s ease',
                  animation: milestone.status === 'active' ? 'pulse 2s ease-in-out infinite' : 'none',
                }}
              />

              {/* Tooltip */}
              {hoveredMilestone === milestone.id && (
                <div
                  style={{
                    position: 'absolute',
                    [isAbove ? 'bottom' : 'top']: isAbove ? '120px' : '120px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(10, 10, 10, 0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(0, 184, 212, 0.3)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    minWidth: '200px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(0, 184, 212, 0.2)',
                    zIndex: 100,
                    pointerEvents: 'none',
                  }}
                >
                  {/* Tooltip arrow */}
                  <div
                    style={{
                      position: 'absolute',
                      [isAbove ? 'top' : 'bottom']: isAbove ? '-6px' : '-6px',
                      left: '50%',
                      transform: 'translateX(-50%) rotate(180deg)',
                      width: '0',
                      height: '0',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '6px solid rgba(0, 184, 212, 0.3)',
                      ...(isAbove ? {} : { transform: 'translateX(-50%)' }),
                    }}
                  />

                  <div style={{ marginBottom: '8px' }}>
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#FFFFFF',
                        marginBottom: '4px',
                      }}
                    >
                      {milestone.label}
                    </p>
                    <p style={{ fontSize: '11px', color: '#00b8d4' }}>
                      {formatDate(milestone.date)}
                    </p>
                  </div>

                  {milestone.responsible && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '6px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <User
                        className="w-3 h-3"
                        style={{ color: 'rgba(255, 255, 255, 0.6)', marginRight: '6px' }}
                      />
                      <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        {milestone.responsible}
                      </p>
                    </div>
                  )}

                  {milestone.notes && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        marginTop: '6px',
                        paddingTop: '6px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <FileText
                        className="w-3 h-3"
                        style={{ color: 'rgba(255, 255, 255, 0.6)', marginRight: '6px', marginTop: '2px' }}
                      />
                      <p
                        style={{
                          fontSize: '11px',
                          color: 'rgba(255, 255, 255, 0.7)',
                          lineHeight: '1.4',
                        }}
                      >
                        {milestone.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add keyframes for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: translateX(-50%) scale(1);
            }
            50% {
              opacity: 0.8;
              transform: translateX(-50%) scale(1.1);
            }
          }
        `}
      </style>
    </div>
  );
};

export default DealTimeline;
