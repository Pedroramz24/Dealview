import React from 'react';
import { FileText, Sparkles, Megaphone, Calendar, Home, X } from 'lucide-react';

const TemplateSelector = ({ isOpen, onClose, onSelectTemplate }) => {
  
  // Pre-built CRE templates
  const templates = [
    {
      id: 'property-listing',
      name: 'Property Listing',
      description: 'Showcase a commercial property with images and details',
      icon: Home,
      color: '#ff0000',
      design: {
        // This would be the Unlayer design JSON for a property listing template
        // For now, we'll start with blank and user can customize
        body: {
          rows: [
            {
              cells: [1],
              columns: [{
                contents: [{
                  type: 'heading',
                  values: {
                    text: 'New Property Available',
                    headingType: 'h1',
                    textAlign: 'center',
                    color: '#ff0000'
                  }
                }]
              }]
            }
          ]
        }
      }
    },
    {
      id: 'market-update',
      name: 'Market Update',
      description: 'Professional newsletter for market insights and trends',
      icon: Megaphone,
      color: '#8b5cf6',
      design: null
    },
    {
      id: 'deal-alert',
      name: 'Deal Alert',
      description: 'Time-sensitive deal notification with urgency',
      icon: Sparkles,
      color: '#ef4444',
      design: null
    },
    {
      id: 'event-invitation',
      name: 'Event Invitation',
      description: 'Invite contacts to property tours or networking events',
      icon: Calendar,
      color: '#22c55e',
      design: null
    },
    {
      id: 'simple-text',
      name: 'Simple Text Email',
      description: 'Clean, text-focused email for personal communication',
      icon: FileText,
      color: '#64748b',
      design: null
    }
  ];

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '32px'
    }}>
      <div className="glass-surface" style={{
        maxWidth: '1000px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '40px'
      }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: 600, marginBottom: '8px' }}>
              Choose a Template
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              Start with a professionally designed template for commercial real estate
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <div
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                style={{
                  padding: '24px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = template.color;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: `${template.color}15`,
                  border: `1px solid ${template.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={24} style={{ color: template.color }} />
                </div>
                
                <div>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                    {template.name}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                    {template.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Start from Scratch Option */}
        <div
          onClick={() => onSelectTemplate(null)}
          style={{
            padding: '20px 24px',
            background: 'rgba(255, 0, 0, 0.1)',
            border: '2px dashed rgba(255, 0, 0, 0.3)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 0, 0, 0.15)';
            e.currentTarget.style.borderColor = '#ff0000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
          }}
        >
          <Sparkles size={20} style={{ color: '#ff0000' }} />
          <span style={{ color: '#ff0000', fontSize: '15px', fontWeight: 600 }}>
            Start from Scratch (Blank Canvas)
          </span>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;
