import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Building2, Users, Shield, TrendingUp, Award, FileCheck } from 'lucide-react';

const LandingPageNew = () => {
  const navigate = useNavigate();

  return (
    <div style={{ 
      background: '#000',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* Transparent Navigation Overlay */}
      <nav style={{
        padding: '20px 60px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'transparent',
        borderBottom: 'none'
      }}>
        <img 
          src="https://customer-assets.emergentagent.com/job_805e556f-4159-4595-8a8e-d3bb43ff0c72/artifacts/72aahevp_DealLinked.png"
          alt="DealLinked"
          style={{
            height: '48px',
            cursor: 'pointer',
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))'
          }}
          onClick={() => navigate('/')}
        />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '10px 24px',
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              color: 'rgba(255, 255, 255, 0.95)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            Login
          </button>
        </div>
      </nav>

      {/* SECTION 1 - HERO (Keep as is from original) */}
      <section style={{
        position: 'relative',
        padding: '0',
        textAlign: 'center',
        background: '#000',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Animated Video Background - loops from 3s to end */}
        <video
          autoPlay
          loop
          muted
          playsInline
          onLoadedMetadata={(e) => {
            e.target.currentTime = 3;
          }}
          onEnded={(e) => {
            e.target.currentTime = 3;
            e.target.play();
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: '100%',
            minHeight: '100%',
            width: 'auto',
            height: 'auto',
            zIndex: 0,
            opacity: 0.6,
            objectFit: 'cover',
            pointerEvents: 'none'
          }}
        >
          <source src="https://customer-assets.emergentagent.com/job_unifydash/artifacts/gxi2bcy6_alcove_hero_remix.webm" type="video/webm" />
        </video>
        
        {/* Content overlay - Vertically Centered - Responsive */}
        <div style={{ 
          position: 'relative', 
          zIndex: 1,
          padding: 'clamp(40px, 8vh, 80px) clamp(20px, 5vw, 60px)',
          maxWidth: '100%'
        }}>
          <h1 style={{
            fontSize: 'clamp(36px, 7vw, 84px)',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 'clamp(20px, 3vh, 32px)',
            lineHeight: '1.1',
            letterSpacing: '-0.03em',
            fontFamily: '"Inter", sans-serif',
            textShadow: '0 2px 20px rgba(255, 255, 255, 0.1)',
            filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
          }}>
            The Private Marketplace for
            <br />
            Real Dealmakers
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 19px)',
            color: 'rgba(255,255,255,0.65)',
            maxWidth: '780px',
            margin: '0 auto',
            marginBottom: 'clamp(40px, 6vh, 60px)',
            lineHeight: '1.65',
            fontWeight: '400',
            padding: '0 20px'
          }}>
            A curated off-market exchange built for serious operators. Discover real deals,
            engage real decision-makers, and manage everything end-to-end with the
            industry's first fully integrated deal OS.
          </p>

          {/* Get Started Button - Responsive */}
          <button
            onClick={() => navigate('/signup')}
            style={{
              padding: 'clamp(12px, 1.5vh, 16px) clamp(28px, 4vw, 40px)',
              background: '#3063ff',
              border: 'none',
              borderRadius: '30px',
              color: '#fff',
              fontSize: 'clamp(14px, 1.5vw, 16px)',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(48, 99, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Get Started
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* SECTION 2 - THE PAIN */}
      <section style={{
        padding: '120px clamp(20px, 5vw, 60px)',
        background: 'transparent',
        position: 'relative',
        zIndex: 20,
        overflow: 'hidden',
        textAlign: 'center'
      }}>
        {/* Chaotic background effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 30% 50%, rgba(255, 50, 50, 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(150, 150, 150, 0.05) 0%, transparent 50%)',
          zIndex: 0
        }} />
        
        {/* Fragmented UI elements to show chaos */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '200px',
          height: '120px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          transform: 'rotate(-8deg)',
          filter: 'blur(2px)',
          opacity: 0.3
        }} />
        <div style={{
          position: 'absolute',
          top: '40%',
          right: '15%',
          width: '180px',
          height: '100px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          transform: 'rotate(12deg)',
          filter: 'blur(2px)',
          opacity: 0.3
        }} />
        <div style={{
          position: 'absolute',
          bottom: '25%',
          left: '20%',
          width: '150px',
          height: '90px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          transform: 'rotate(5deg)',
          filter: 'blur(2px)',
          opacity: 0.3
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '32px',
            letterSpacing: '-0.03em',
            fontFamily: '"Inter", sans-serif',
            filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
          }}>
            Off-Market Deals Shouldn't Live in Facebook Groups
          </h2>
          <p style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: '1.7',
            maxWidth: '780px',
            margin: '0 auto',
            fontWeight: '400'
          }}>
            Most off-market deal flow today is scattered across unorganized chats, comment threads, and unverifiable posts. Serious opportunities get buried in noise, time is wasted chasing intent, and real operators are left without structure or trust.
          </p>
        </div>
      </section>

      {/* SECTION 3 - THE SOLUTION */}
      <section style={{
        padding: '120px clamp(20px, 5vw, 60px)',
        background: 'transparent',
        position: 'relative',
        zIndex: 20,
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '28px',
              letterSpacing: '-0.03em',
              fontFamily: '"Inter", sans-serif',
              filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
            }}>
              DealLinked Replaces Noise With Signal
            </h2>
            <p style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              color: 'rgba(255,255,255,0.65)',
              lineHeight: '1.7',
              maxWidth: '850px',
              margin: '0 auto 20px',
              fontWeight: '400'
            }}>
              DealLinked is a private, role-aware marketplace where brokers, buyers, and owners operate inside one trusted system. Every listing, conversation, and interaction is tied to verified users, structured workflows, and real intent — not anonymous posts or DMs.
            </p>
            <p style={{
              fontSize: 'clamp(13px, 1.5vw, 15px)',
              color: 'rgba(0, 184, 212, 0.9)',
              fontWeight: '600',
              letterSpacing: '0.5px'
            }}>
              Verified participants. Structured deal flow. Private by design.
            </p>
          </div>

          {/* Glassmorphic Diagram Grid - Vortasky Style */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {/* Card 1: Verified Participants */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)',
              position: 'relative',
              minHeight: '420px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.3s'
            }}>
              {/* Icon */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 184, 212, 0.4) 0%, rgba(0, 184, 212, 0.1) 70%)',
                border: '2px solid rgba(0, 184, 212, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px',
                boxShadow: '0 0 40px rgba(0, 184, 212, 0.4)'
              }}>
                <Shield size={36} color="#00b8d4" />
              </div>

              {/* Verified User Badges */}
              <div style={{ marginBottom: '32px', width: '100%' }}>
                {['Broker', 'Buyer', 'Owner'].map((role, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(0, 184, 212, 0.12)',
                    border: '1px solid rgba(0, 184, 212, 0.25)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.3), rgba(100, 200, 255, 0.3))',
                      border: '2px solid rgba(0, 184, 212, 0.5)'
                    }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: '14px', color: '#fff', fontWeight: '600' }}>
                        {role} Verified
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(0, 184, 212, 0.8)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={12} />
                        Active
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px',
                marginTop: 'auto'
              }}>
                Verified Participants Only
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: '1.6',
                textAlign: 'center'
              }}>
                Every user is verified by role and intent. No anonymous posts, no unqualified leads.
              </p>
            </div>

            {/* Card 2: Structured Deal Flow */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)',
              position: 'relative',
              minHeight: '420px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.3s'
            }}>
              {/* Icon */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 184, 212, 0.4) 0%, rgba(0, 184, 212, 0.1) 70%)',
                border: '2px solid rgba(0, 184, 212, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px',
                boxShadow: '0 0 40px rgba(0, 184, 212, 0.4)'
              }}>
                <TrendingUp size={36} color="#00b8d4" />
              </div>

              {/* Pipeline Stages Flowchart */}
              <div style={{ marginBottom: '32px', width: '100%' }}>
                {[
                  { stage: 'Discovery', status: 'Active', color: '#00b8d4' },
                  { stage: 'NCND Signed', status: 'Completed', color: '#10b981' },
                  { stage: 'Due Diligence', status: 'In Progress', color: '#00b8d4' },
                  { stage: 'Close', status: 'Pending', color: '#6b7280' }
                ].map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '8px' }}>
                    <div style={{
                      background: item.status === 'Completed' 
                        ? 'rgba(16, 185, 129, 0.15)' 
                        : item.status === 'Active' || item.status === 'In Progress'
                        ? 'rgba(0, 184, 212, 0.15)'
                        : 'rgba(100, 100, 100, 0.1)',
                      border: `1px solid ${
                        item.status === 'Completed' 
                          ? 'rgba(16, 185, 129, 0.3)' 
                          : item.status === 'Active' || item.status === 'In Progress'
                          ? 'rgba(0, 184, 212, 0.3)'
                          : 'rgba(100, 100, 100, 0.2)'
                      }`,
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>
                        {item.stage}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        color: item.color,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {item.status}
                      </span>
                    </div>
                    {idx < 3 && (
                      <div style={{
                        width: '2px',
                        height: '12px',
                        background: 'rgba(0, 184, 212, 0.3)',
                        margin: '0 auto'
                      }} />
                    )}
                  </div>
                ))}
              </div>

              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px',
                marginTop: 'auto'
              }}>
                Structured Deal Lifecycle
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: '1.6',
                textAlign: 'center'
              }}>
                From discovery to close, every step is tracked and managed in one system.
              </p>
            </div>

            {/* Card 3: Role-Based Workspace */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)',
              position: 'relative',
              minHeight: '420px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.3s'
            }}>
              {/* Icon */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 184, 212, 0.4) 0%, rgba(0, 184, 212, 0.1) 70%)',
                border: '2px solid rgba(0, 184, 212, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px',
                boxShadow: '0 0 40px rgba(0, 184, 212, 0.4)'
              }}>
                <Users size={36} color="#00b8d4" />
              </div>

              {/* Role Dashboards */}
              <div style={{ marginBottom: '32px', width: '100%' }}>
                {[
                  { icon: Building2, role: 'Broker', color: '#00b8d4' },
                  { icon: Users, role: 'Buyer', color: '#3063ff' },
                  { icon: Award, role: 'Owner', color: '#10b981' }
                ].map((item, idx) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={idx} style={{
                      background: `rgba(${item.color === '#00b8d4' ? '0, 184, 212' : item.color === '#3063ff' ? '48, 99, 255' : '16, 185, 129'}, 0.12)`,
                      border: `1px solid rgba(${item.color === '#00b8d4' ? '0, 184, 212' : item.color === '#3063ff' ? '48, 99, 255' : '16, 185, 129'}, 0.25)`,
                      borderRadius: '10px',
                      padding: '14px 18px',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px'
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: `rgba(${item.color === '#00b8d4' ? '0, 184, 212' : item.color === '#3063ff' ? '48, 99, 255' : '16, 185, 129'}, 0.2)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <IconComponent size={20} color={item.color} />
                      </div>
                      <div style={{ fontSize: '15px', color: '#fff', fontWeight: '600' }}>
                        {item.role} Dashboard
                      </div>
                    </div>
                  );
                })}
              </div>

              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px',
                marginTop: 'auto'
              }}>
                Role-Aware Workspaces
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: '1.6',
                textAlign: 'center'
              }}>
                Each user sees only what matters to their role — no clutter, just clarity.
              </p>
            </div>

            {/* Card 4: End-to-End Platform */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)',
              position: 'relative',
              minHeight: '420px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.3s'
            }}>
              {/* Icon */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 184, 212, 0.4) 0%, rgba(0, 184, 212, 0.1) 70%)',
                border: '2px solid rgba(0, 184, 212, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px',
                boxShadow: '0 0 40px rgba(0, 184, 212, 0.4)'
              }}>
                <FileCheck size={36} color="#00b8d4" />
              </div>

              {/* Integrated Tools List */}
              <div style={{ marginBottom: '32px', width: '100%' }}>
                {[
                  { tool: 'Marketplace', emoji: '🗺️' },
                  { tool: 'CRM Pipeline', emoji: '📊' },
                  { tool: 'Messages', emoji: '💬' },
                  { tool: 'Documents', emoji: '📄' },
                  { tool: 'Calendar', emoji: '📅' }
                ].map((item, idx) => (
                  <div key={idx} style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '16px' }}>{item.emoji}</span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>
                      {item.tool}
                    </span>
                  </div>
                ))}
              </div>

              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px',
                marginTop: 'auto'
              }}>
                All Tools, One Platform
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: '1.6',
                textAlign: 'center'
              }}>
                Marketplace, CRM, messaging, docs, and calendar — fully integrated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 - THE PRODUCT */}
      <section style={{
        padding: '120px clamp(20px, 5vw, 60px)',
        position: 'relative',
        zIndex: 30,
        background: 'transparent',
        overflow: 'hidden'
      }}>
        {/* Radial gradient backdrop */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '1000px',
          height: '1000px',
          background: 'radial-gradient(circle, rgba(0, 184, 212, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
          filter: 'blur(80px)'
        }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '28px',
              letterSpacing: '-0.03em',
              fontFamily: '"Inter", sans-serif',
              filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
            }}>
              From Discovery to Close — In One Platform
            </h2>
            <p style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              color: 'rgba(255,255,255,0.65)',
              lineHeight: '1.7',
              maxWidth: '900px',
              margin: '0 auto',
              fontWeight: '400'
            }}>
              Browse off-market opportunities on a live marketplace map, engage through gated conversations and NDAs, and manage deals, documents, deadlines, and performance — all without switching tools.
            </p>
          </div>

          {/* Product Screenshot */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <img 
              src="https://customer-assets.emergentagent.com/job_unifydash/artifacts/z39y8gol_Screenshot%202025-12-23%20at%2012.04.52%E2%80%AFPM.png"
              alt="DealLinked Platform"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: '20px',
                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6), 0 0 100px rgba(0, 184, 212, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            />
          </div>
        </div>
      </section>

      {/* SECTION 5 - WHO IT'S FOR */}
      <section style={{
        padding: '120px clamp(20px, 5vw, 60px)',
        background: 'transparent',
        position: 'relative',
        zIndex: 20
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textAlign: 'center',
            marginBottom: '80px',
            letterSpacing: '-0.03em',
            fontFamily: '"Inter", sans-serif',
            filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
          }}>
            Built for Brokers, Buyers, and Owners
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px'
          }}>
            {/* Brokers */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(0, 184, 212, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)',
              textAlign: 'center',
              transition: 'all 0.3s'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 184, 212, 0.3) 0%, rgba(0, 184, 212, 0.1) 70%)',
                border: '2px solid rgba(0, 184, 212, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 0 30px rgba(0, 184, 212, 0.4)'
              }}>
                <Building2 size={32} color="#00b8d4" />
              </div>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '16px'
              }}>
                Brokers
              </h3>
              <p style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: '1.7'
              }}>
                Publish listings, manage inquiries, run your pipeline, and track performance — all in one operating system.
              </p>
            </div>

            {/* Buyers */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(48, 99, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(48, 99, 255, 0.05)',
              textAlign: 'center',
              transition: 'all 0.3s'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(48, 99, 255, 0.3) 0%, rgba(48, 99, 255, 0.1) 70%)',
                border: '2px solid rgba(48, 99, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 0 30px rgba(48, 99, 255, 0.4)'
              }}>
                <Users size={32} color="#3063ff" />
              </div>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '16px'
              }}>
                Buyers
              </h3>
              <p style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: '1.7'
              }}>
                Discover real opportunities, manage conversations and offers, and stay ahead of deadlines without chasing deals.
              </p>
            </div>

            {/* Owners */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(16, 185, 129, 0.05)',
              textAlign: 'center',
              transition: 'all 0.3s'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.1) 70%)',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)'
              }}>
                <Award size={32} color="#10b981" />
              </div>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '16px'
              }}>
                Owners
              </h3>
              <p style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: '1.7'
              }}>
                Track listing exposure, buyer interest, and next steps without unnecessary CRM complexity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 - PRICING & CTA */}
      <section style={{
        padding: '120px clamp(20px, 5vw, 60px)',
        background: 'rgba(0, 184, 212, 0.03)',
        borderTop: '1px solid rgba(0, 184, 212, 0.15)',
        borderBottom: '1px solid rgba(0, 184, 212, 0.15)',
        position: 'relative',
        zIndex: 20,
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '20px',
          letterSpacing: '-0.03em',
          fontFamily: '"Inter", sans-serif',
          filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
        }}>
          One Platform. One Price. Real Deal Flow.
        </h2>

        <div style={{
          marginTop: '60px',
          display: 'inline-block',
          background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.9) 0%, rgba(20, 20, 40, 0.9) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          padding: '60px 80px',
          borderRadius: '24px',
          border: '2px solid rgba(0, 184, 212, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 80px rgba(0, 184, 212, 0.2), inset 0 0 60px rgba(0, 184, 212, 0.05)',
          minWidth: '400px'
        }}>
          <div style={{
            fontSize: 'clamp(56px, 8vw, 72px)',
            fontWeight: '800',
            color: '#fff',
            marginBottom: '12px',
            textShadow: '0 0 40px rgba(0, 184, 212, 0.4)'
          }}>
            $50
            <span style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>/month</span>
          </div>
          <p style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 'clamp(14px, 1.8vw, 17px)',
            marginBottom: '40px',
            lineHeight: '1.6'
          }}>
            Full access to the marketplace, community, and workspace.<br/>No tiers. No noise.
          </p>

          <button
            onClick={() => navigate('/signup')}
            style={{
              width: '100%',
              padding: '18px',
              background: '#00b8d4',
              border: 'none',
              borderRadius: '12px',
              color: '#000',
              fontSize: 'clamp(16px, 2vw, 18px)',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 0 40px rgba(0, 184, 212, 0.6), 0 8px 24px rgba(0, 184, 212, 0.3)',
              transition: 'all 0.3s',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 0 60px rgba(0, 184, 212, 0.8), 0 12px 32px rgba(0, 184, 212, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 184, 212, 0.6), 0 8px 24px rgba(0, 184, 212, 0.3)';
            }}
          >
            Get Started
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px clamp(20px, 5vw, 60px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        textAlign: 'center',
        background: 'transparent'
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '14px'
        }}>
          © 2025 DealLinked. The professional marketplace for off-market commercial real estate.
        </p>
      </footer>
    </div>
  );
};

export default LandingPageNew;
