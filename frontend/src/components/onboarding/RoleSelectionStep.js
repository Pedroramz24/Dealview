import React from 'react';
import { Building2, Home, ShoppingBag } from 'lucide-react';

const RoleSelectionStep = ({ onSelect }) => {
  const roles = [
    {
      id: 'broker',
      title: 'Broker',
      icon: Building2,
      description: 'I represent clients and facilitate commercial real estate transactions',
      features: [
        'Publish deals to marketplace',
        'Access full CRM tools',
        'Build broker reputation',
        'Earn commissions'
      ],
      color: '#00b8d4'
    },
    {
      id: 'seller',
      title: 'Property Owner',
      icon: Home,
      description: 'I own commercial property and want to list it for sale',
      features: [
        'List your properties',
        'Direct buyer access',
        'No broker commissions',
        'Control your listing'
      ],
      color: '#00d4aa'
    },
    {
      id: 'buyer',
      title: 'Buyer',
      icon: ShoppingBag,
      description: 'I am looking to invest in commercial real estate',
      features: [
        'Browse marketplace deals',
        'Save favorite properties',
        'Connect with brokers',
        'Track opportunities'
      ],
      color: '#a78bfa'
    }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0b0d 0%, #1a1b1e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1200px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{
            color: '#FFFFFF',
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: '700',
            marginBottom: '16px',
            letterSpacing: '-0.02em'
          }}>
            Welcome to Dealview
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '18px',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Select your role to get started with the right tools for your needs
          </p>
        </div>

        {/* Role Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => onSelect(role.id)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '32px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = role.color;
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = `0 12px 40px ${role.color}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${role.color}20, ${role.color}10)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px',
                  border: `1px solid ${role.color}40`
                }}>
                  <Icon size={32} style={{ color: role.color }} />
                </div>

                {/* Title */}
                <h3 style={{
                  color: '#FFFFFF',
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '12px'
                }}>
                  {role.title}
                </h3>

                {/* Description */}
                <p style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  marginBottom: '24px'
                }}>
                  {role.description}
                </p>

                {/* Features */}
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0
                }}>
                  {role.features.map((feature, index) => (
                    <li key={index} style={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '13px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: role.color
                      }} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Footer Note */}
        <div style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '13px'
        }}>
          You can request additional roles later from your profile settings
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionStep;
