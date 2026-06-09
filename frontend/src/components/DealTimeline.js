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
      }}
    >
      <h3
        style={{
          color: '#ff0000',
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

      {/* Scrollable container for timeline */}
      <div
        style={{
          overflowX: 'auto',
          overflowY: 'visible',
          paddingBottom: '10px',
        }}
        className="timeline-scroll-container"
      >
        {/* Timeline Container - centered timeline bar */}
        <div style={{ position: 'relative', height: '240px', minWidth: '900px', paddingLeft: '40px', paddingRight: '40px' }}>
          
          {/* Timeline bar - absolutely centered */}
          <div
            style={{
              position: 'absolute',
              top: '120px',
              left: '40px',
              right: '40px',
              height: '3px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '2px',
            }}
          />

          {/* Progress bar (completed portion) */}
          <div
            style={{
              position: 'absolute',
              top: '120px',
              left: '40px',
              height: '3px',
              width: `calc((100% - 80px) * ${timelineMetrics.currentProgress / 100})`,
              background: 'linear-gradient(90deg, #ff0000, #cc0000)',
              borderRadius: '2px',
              boxShadow: '0 0 10px rgba(255, 0, 0, 0.5)',
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />

          {/* Current date indicator */}
          {timelineMetrics.currentProgress > 0 && timelineMetrics.currentProgress < 100 && (
            <div
              style={{
                position: 'absolute',
                top: '113px',
                left: `calc(40px + (100% - 80px) * ${timelineMetrics.currentProgress / 100})`,
                width: '16px',
                height: '16px',
                background: '#ff0000',
                borderRadius: '50%',
                boxShadow: '0 0 12px rgba(255, 0, 0, 0.8)',
                border: '3px solid rgba(0, 0, 0, 0.9)',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '6px',
                  height: '6px',
                  background: '#fff',
                  borderRadius: '50%',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              />
            </div>
          )}

          {/* Milestone markers */}
          {timelineMetrics.milestones.map((milestone, index) => {
            const isAbove = index % 2 === 0;
            const isNearLeftEdge = milestone.position < 25;
            const isNearRightEdge = milestone.position > 75;
            
            return (
              <div
                key={milestone.id}
                onMouseEnter={() => setHoveredMilestone(milestone.id)}
                onMouseLeave={() => setHoveredMilestone(null)}
                style={{
                  position: 'absolute',
                  top: '120px',
                  left: `calc(40px + (100% - 80px) * ${milestone.position / 100})`,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  zIndex: 5,
                }}
              >
                {/* Milestone dot - centered on timeline */}
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background:
                      milestone.status === 'completed' || milestone.status === 'active'
                        ? '#ff0000'
                        : 'rgba(255, 255, 255, 0.15)',
                    border:
                      milestone.status === 'completed' || milestone.status === 'active'
                        ? '3px solid #ff0000'
                        : '3px solid rgba(255, 255, 255, 0.3)',
                    boxShadow:
                      milestone.status === 'completed'
                        ? '0 0 10px rgba(255, 0, 0, 0.6)'
                        : milestone.status === 'active'
                        ? '0 0 14px rgba(255, 0, 0, 0.8)'
                        : 'none',
                    transition: 'all 0.3s ease',
                    animation: milestone.status === 'active' ? 'pulseDot 2s ease-in-out infinite' : 'none',
                  }}
                />

                {/* Connector line to label */}
                <div
                  style={{
                    position: 'absolute',
                    width: '2px',
                    height: '50px',
                    background:
                      milestone.status === 'completed' || milestone.status === 'active'
                        ? 'rgba(255, 0, 0, 0.5)'
                        : 'rgba(255, 255, 255, 0.25)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    [isAbove ? 'bottom' : 'top']: '14px',
                  }}
                />

                {/* Label container */}
                <div
                  style={{
                    position: 'absolute',
                    [isAbove ? 'bottom' : 'top']: '68px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    width: '110px',
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
                      wordWrap: 'break-word',
                    }}
                  >
                    {milestone.label}
                  </p>
                  <p
                    style={{
                      fontSize: '10px',
                      color:
                        milestone.status === 'completed' || milestone.status === 'active'
                          ? '#ff0000'
                          : 'rgba(255, 255, 255, 0.4)',
                    }}
                  >
                    {formatDate(milestone.date)}
                  </p>
                </div>

                {/* Tooltip */}
                {hoveredMilestone === milestone.id && (
                  <div
                    style={{
                      position: 'absolute',
                      [isAbove ? 'bottom' : 'top']: isAbove ? '150px' : '150px',
                      left: isNearLeftEdge ? '-50px' : isNearRightEdge ? 'auto' : '50%',
                      right: isNearRightEdge ? '-50px' : 'auto',
                      transform: isNearLeftEdge || isNearRightEdge ? 'none' : 'translateX(-50%)',
                      background: 'rgba(10, 10, 10, 0.98)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 0, 0, 0.4)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      width: '220px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(255, 0, 0, 0.3)',
                      zIndex: 1000,
                      pointerEvents: 'none',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        [isAbove ? 'bottom' : 'top']: '-6px',
                        left: isNearLeftEdge ? '60px' : isNearRightEdge ? 'auto' : '50%',
                        right: isNearRightEdge ? '60px' : 'auto',
                        transform: `${isNearLeftEdge || isNearRightEdge ? 'none' : 'translateX(-50%)'} ${isAbove ? 'rotate(180deg)' : ''}`,
                        width: '0',
                        height: '0',
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '6px solid rgba(255, 0, 0, 0.4)',
                      }}
                    />

                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#FFFFFF', marginBottom: '4px', lineHeight: '1.3' }}>
                        {milestone.label}
                      </p>
                      <p style={{ fontSize: '11px', color: '#ff0000' }}>
                        {formatDate(milestone.date)}
                      </p>
                    </div>

                    {milestone.responsible && (
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <User className="w-3 h-3" style={{ color: 'rgba(255, 255, 255, 0.6)', marginRight: '6px', flexShrink: 0 }} />
                        <p style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.3' }}>
                          {milestone.responsible}
                        </p>
                      </div>
                    )}

                    {milestone.notes && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <FileText className="w-3 h-3" style={{ color: 'rgba(255, 255, 255, 0.6)', marginRight: '6px', marginTop: '2px', flexShrink: 0 }} />
                        <p style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.4' }}>
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
      </div>

      {/* Styles */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
            50% {
              opacity: 0.7;
              transform: translate(-50%, -50%) scale(1.15);
            }
          }
          
          @keyframes pulseDot {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
          }
          
          .timeline-scroll-container::-webkit-scrollbar {
            height: 8px;
          }
          
          .timeline-scroll-container::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
          }
          
          .timeline-scroll-container::-webkit-scrollbar-thumb {
            background: rgba(255, 0, 0, 0.4);
            border-radius: 4px;
            transition: background 0.3s ease;
          }
          
          .timeline-scroll-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 0, 0, 0.6);
          }
          
          .timeline-scroll-container {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 0, 0, 0.4) rgba(255, 255, 255, 0.05);
          }
        `}
      </style>
    </div>
  );
};

export default DealTimeline;
