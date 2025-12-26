import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Building2, Users, Shield, TrendingUp, Award, FileCheck, MapPin, BarChart3, MessageSquare, Layers, Calendar, Share2, X } from 'lucide-react';

const LandingPage = () => {
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

      {/* SECTION 1 - HERO */}
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
        {/* Animated Video Background */}
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
        
        {/* Content overlay */}
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

      {/* SECTION 2 - THE PRODUCT */}
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
              From Discovery to Close in One Platform
            </h2>
            <p style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              color: 'rgba(255,255,255,0.65)',
              lineHeight: '1.7',
              maxWidth: '900px',
              margin: '0 auto',
              fontWeight: '400'
            }}>
              Browse off-market opportunities on a live marketplace map, engage through gated conversations and NDAs, and manage deals, documents, deadlines, and performance without switching tools.
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

      {/* SECTION 3 - PROBLEM + SOLUTION (Side by Side - Symmetrical) */}
      <section style={{
        padding: '120px clamp(20px, 5vw, 60px)',
        background: 'transparent',
        position: 'relative',
        zIndex: 20,
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(40px, 6vw, 80px)',
            alignItems: 'stretch'
          }}>
            {/* LEFT: The Problem - Symmetrical Height */}
            <div style={{ 
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '400px'
            }}>
              {/* Chaotic background elements */}
              <div style={{
                position: 'absolute',
                top: '10%',
                left: '5%',
                width: '160px',
                height: '100px',
                background: 'rgba(255, 50, 50, 0.08)',
                border: '1px solid rgba(255, 100, 100, 0.15)',
                borderRadius: '12px',
                transform: 'rotate(-8deg)',
                filter: 'blur(1px)',
                opacity: 0.5
              }} />
              <div style={{
                position: 'absolute',
                top: '35%',
                right: '10%',
                width: '140px',
                height: '80px',
                background: 'rgba(150, 150, 150, 0.06)',
                border: '1px solid rgba(150, 150, 150, 0.1)',
                borderRadius: '12px',
                transform: 'rotate(12deg)',
                filter: 'blur(1px)',
                opacity: 0.5
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  background: 'rgba(255, 50, 50, 0.15)',
                  border: '1px solid rgba(255, 50, 50, 0.3)',
                  borderRadius: '20px',
                  fontSize: '13px',
                  color: 'rgba(255, 100, 100, 0.9)',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '24px'
                }}>
                  The Problem
                </div>
                <h2 style={{
                  fontSize: 'clamp(28px, 4.5vw, 48px)',
                  fontWeight: '600',
                  color: '#fff',
                  marginBottom: '24px',
                  lineHeight: '1.2',
                  letterSpacing: '-0.02em'
                }}>
                  Off-Market Deals Shouldn't Live in Facebook Groups
                </h2>
                <p style={{
                  fontSize: 'clamp(15px, 1.8vw, 18px)',
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: '1.7',
                  fontWeight: '400'
                }}>
                  Scattered chats, unverifiable posts, buried opportunities. Time wasted chasing intent. No structure, no trust, no accountability.
                </p>
              </div>
            </div>

            {/* RIGHT: The Solution - Symmetrical Height */}
            <div style={{ 
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '400px'
            }}>
              {/* Clean structured background */}
              <div style={{
                position: 'absolute',
                top: '15%',
                left: '8%',
                width: '140px',
                height: '100px',
                background: 'rgba(0, 184, 212, 0.08)',
                border: '1px solid rgba(0, 184, 212, 0.2)',
                borderRadius: '12px',
                opacity: 0.6
              }} />
              <div style={{
                position: 'absolute',
                bottom: '20%',
                right: '5%',
                width: '120px',
                height: '90px',
                background: 'rgba(0, 184, 212, 0.08)',
                border: '1px solid rgba(0, 184, 212, 0.2)',
                borderRadius: '12px',
                opacity: 0.6
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  background: 'rgba(0, 184, 212, 0.15)',
                  border: '1px solid rgba(0, 184, 212, 0.3)',
                  borderRadius: '20px',
                  fontSize: '13px',
                  color: 'rgba(0, 184, 212, 0.9)',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '24px'
                }}>
                  The Solution
                </div>
                <h2 style={{
                  fontSize: 'clamp(28px, 4.5vw, 48px)',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '24px',
                  lineHeight: '1.2',
                  letterSpacing: '-0.02em'
                }}>
                  DealLinked Replaces Noise With Signal
                </h2>
                <p style={{
                  fontSize: 'clamp(15px, 1.8vw, 18px)',
                  color: 'rgba(255,255,255,0.7)',
                  lineHeight: '1.7',
                  fontWeight: '400',
                  marginBottom: '20px'
                }}>
                  A private, role-aware marketplace where brokers, buyers, and owners operate inside one trusted system. Every listing, conversation, and interaction is tied to verified users, structured workflows, and real intent.
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
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 - PLATFORM FEATURES (Everything You Need to Close Deals) */}
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
            Everything You Need to Close Deals
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {/* Feature 1: Marketplace Map */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)',
              minHeight: '320px',
              display: 'flex',
              flexDirection: 'column'
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
                marginBottom: '24px',
                boxShadow: '0 0 30px rgba(0, 184, 212, 0.4)'
              }}>
                <MapPin size={32} color="#00b8d4" />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                Marketplace Map
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.65)',
                lineHeight: '1.6',
                flex: 1
              }}>
                Browse off-market deals on an interactive map with real-time filters, save listings, and discover opportunities by location.
              </p>
              {/* Mini visual indicator */}
              <div style={{
                marginTop: '20px',
                padding: '12px',
                background: 'rgba(0, 184, 212, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(0, 184, 212, 0.2)',
                fontSize: '12px',
                color: 'rgba(0, 184, 212, 0.9)',
                fontWeight: '600',
                textAlign: 'center'
              }}>
                Live Property Mapping
              </div>
            </div>

            {/* Feature 2: Pipeline & CRM */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)',
              minHeight: '320px',
              display: 'flex',
              flexDirection: 'column'
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
                marginBottom: '24px',
                boxShadow: '0 0 30px rgba(0, 184, 212, 0.4)'
              }}>
                <BarChart3 size={32} color="#00b8d4" />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                Pipeline & CRM
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.65)',
                lineHeight: '1.6',
                flex: 1
              }}>
                Manage your entire deal flow from first contact to close. Track stages, tasks, and performance in one visual pipeline.
              </p>
              {/* Pipeline stages mini visual */}
              <div style={{ marginTop: '20px' }}>
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {['Discovery', 'NCND', 'DD', 'Close'].map((stage, idx) => (
                    <div key={idx} style={{
                      flex: 1,
                      padding: '8px 4px',
                      background: idx < 2 ? 'rgba(0, 184, 212, 0.15)' : 'rgba(100, 100, 100, 0.1)',
                      border: `1px solid ${idx < 2 ? 'rgba(0, 184, 212, 0.3)' : 'rgba(100, 100, 100, 0.2)'}`,
                      borderRadius: '6px',
                      fontSize: '10px',
                      color: idx < 2 ? '#00b8d4' : 'rgba(255,255,255,0.5)',
                      fontWeight: '700',
                      textAlign: 'center'
                    }}>
                      {stage}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 3: Messaging */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)',
              minHeight: '320px',
              display: 'flex',
              flexDirection: 'column'
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
                marginBottom: '24px',
                boxShadow: '0 0 30px rgba(0, 184, 212, 0.4)'
              }}>
                <MessageSquare size={32} color="#00b8d4" />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                Secure Messaging
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.65)',
                lineHeight: '1.6',
                flex: 1
              }}>
                Gated conversations with verified participants. NCND protection before disclosure. Every message tied to a deal.
              </p>
              {/* Message visual */}
              <div style={{ marginTop: '20px' }}>
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(0, 184, 212, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 184, 212, 0.2)',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.7)',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Shield size={14} color="#00b8d4" />
                  <span>NCND Required</span>
                </div>
              </div>
            </div>

            {/* Feature 4: Active Investor Network */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)',
              minHeight: '320px',
              display: 'flex',
              flexDirection: 'column'
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
                marginBottom: '24px',
                boxShadow: '0 0 30px rgba(0, 184, 212, 0.4)'
              }}>
                <Users size={32} color="#00b8d4" />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                Active Investor Network
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.65)',
                lineHeight: '1.6',
                flex: 1
              }}>
                Connect with hundreds of verified investors actively searching for off-market opportunities. Your listings reach serious buyers from day one.
              </p>
              {/* Network activity indicators */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
                {[
                  { count: '200+', label: 'Investors' },
                  { count: '150+', label: 'Brokers' }
                ].map((stat, idx) => (
                  <div key={idx} style={{
                    flex: 1,
                    padding: '10px 8px',
                    background: 'rgba(0, 184, 212, 0.1)',
                    border: '1px solid rgba(0, 184, 212, 0.2)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '16px', color: '#00b8d4', fontWeight: '700' }}>{stat.count}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 5: Calendar & Tasks */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)',
              minHeight: '320px',
              display: 'flex',
              flexDirection: 'column'
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
                marginBottom: '24px',
                boxShadow: '0 0 30px rgba(0, 184, 212, 0.4)'
              }}>
                <Calendar size={32} color="#00b8d4" />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                Calendar & Deadlines
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.65)',
                lineHeight: '1.6',
                flex: 1
              }}>
                Never miss a showing, deadline, or follow up with integrated scheduling tied to every deal and contact.
              </p>
              {/* Calendar visual */}
              <div style={{ marginTop: '20px' }}>
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(0, 184, 212, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 184, 212, 0.2)',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.7)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Due Diligence Deadline</span>
                  <span style={{ color: '#00b8d4', fontWeight: '700' }}>Jan 15</span>
                </div>
              </div>
            </div>

            {/* Feature 6: Deal Sharing */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)',
              minHeight: '320px',
              display: 'flex',
              flexDirection: 'column'
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
                marginBottom: '24px',
                boxShadow: '0 0 30px rgba(0, 184, 212, 0.4)'
              }}>
                <Share2 size={32} color="#00b8d4" />
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                Easy Deal Sharing
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.65)',
                lineHeight: '1.6',
                flex: 1
              }}>
                Share curated deals with clients instantly. No forwarding PDFs, no email chains. Just one clean link.
              </p>
              {/* Share visual */}
              <div style={{ marginTop: '20px' }}>
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(0, 184, 212, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 184, 212, 0.2)',
                  fontSize: '11px',
                  color: '#00b8d4',
                  fontWeight: '600',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}>
                  <Share2 size={12} />
                  Share Deal
                </div>
              </div>
            </div>
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
            marginBottom: '24px',
            letterSpacing: '-0.03em',
            fontFamily: '"Inter", sans-serif',
            filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
          }}>
            Built for Brokers, Investors, and Owners
          </h2>
          <p style={{
            fontSize: 'clamp(14px, 1.6vw, 16px)',
            color: 'rgba(0, 184, 212, 0.8)',
            textAlign: 'center',
            marginBottom: '80px',
            fontWeight: '600'
          }}>
            Join a growing network of active investors searching for off-market opportunities daily.
          </p>

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
              textAlign: 'center'
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
                Publish listings, manage inquiries, run your pipeline, and track performance all in one operating system.
              </p>
            </div>

            {/* Investors */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              padding: '40px 32px',
              borderRadius: '20px',
              border: '1px solid rgba(48, 99, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(48, 99, 255, 0.05)',
              textAlign: 'center'
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
                <TrendingUp size={32} color="#3063ff" />
              </div>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '16px'
              }}>
                Investors
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
              textAlign: 'center'
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
        <p style={{
          fontSize: 'clamp(14px, 1.6vw, 16px)',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '60px',
          maxWidth: '700px',
          margin: '0 auto 60px'
        }}>
          Unlike LoopNet or CoStar, we don't hide deals behind expensive paywalls or tiered access.
        </p>

        <div style={{
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
            Full access to the marketplace, community, and workspace.<br/>One tier. No fluff.
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

      {/* TESTIMONIALS SECTION - Conveyor Belt Animation */}
      <section style={{
        padding: '80px 0',
        background: 'transparent',
        position: 'relative',
        zIndex: 20,
        overflow: 'hidden'
      }}>
        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textAlign: 'center',
          marginBottom: '60px',
          letterSpacing: '-0.03em',
          fontFamily: '"Inter", sans-serif',
          filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))',
          padding: '0 20px'
        }}>
          Trusted by Real Estate Professionals
        </h2>

        {/* Scrolling testimonials container */}
        <div style={{
          width: '100%',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Gradient fade edges */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '100px',
            background: 'linear-gradient(to right, #000 0%, transparent 100%)',
            zIndex: 10,
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: '100px',
            background: 'linear-gradient(to left, #000 0%, transparent 100%)',
            zIndex: 10,
            pointerEvents: 'none'
          }} />

          {/* Animated testimonials track */}
          <div style={{
            display: 'flex',
            gap: '24px',
            animation: 'scroll-left 40s linear infinite',
            paddingLeft: '24px'
          }}>
            {[
              {
                text: "DealLinked streamlined our entire deal flow. We've closed 3 off-market acquisitions in the last 2 months.",
                role: "Investor"
              },
              {
                text: "Finally, a marketplace that connects me with serious buyers. The NCND protection gives me confidence to share exclusive listings.",
                role: "Broker"
              },
              {
                text: "The quality control is refreshing. Every inquiry I receive is from a verified, qualified buyer.",
                role: "Owner"
              },
              {
                text: "Best platform for sourcing off-market commercial deals. The map view and filters save me hours every week.",
                role: "Investor"
              },
              {
                text: "My reputation score has helped me stand out. I'm getting more inquiries than ever before.",
                role: "Broker"
              },
              {
                text: "Love the integrated CRM. I can manage everything in one place without switching between tools.",
                role: "Broker"
              },
              {
                text: "The network of active investors is impressive. My listings get visibility to the right audience immediately.",
                role: "Broker"
              },
              {
                text: "Game changer for finding off-market opportunities. Much better than Facebook groups and cold calls.",
                role: "Investor"
              }
            ].concat([
              {
                text: "DealLinked streamlined our entire deal flow. We've closed 3 off-market acquisitions in the last 2 months.",
                role: "Investor"
              },
              {
                text: "Finally, a marketplace that connects me with serious buyers. The NCND protection gives me confidence to share exclusive listings.",
                role: "Broker"
              },
              {
                text: "The quality control is refreshing. Every inquiry I receive is from a verified, qualified buyer.",
                role: "Owner"
              },
              {
                text: "Best platform for sourcing off-market commercial deals. The map view and filters save me hours every week.",
                role: "Investor"
              }
            ]).map((testimonial, idx) => (
              <div
                key={idx}
                style={{
                  minWidth: '400px',
                  maxWidth: '400px',
                  height: '260px',
                  background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  padding: '32px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                {/* Stars */}
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  marginBottom: '16px'
                }}>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} style={{
                      width: '16px',
                      height: '16px',
                      color: '#00b8d4',
                      fontSize: '16px',
                      lineHeight: '1'
                    }}>★</div>
                  ))}
                </div>

                {/* Review text - Fixed height */}
                <p style={{
                  fontSize: '15px',
                  color: 'rgba(255,255,255,0.8)',
                  lineHeight: '1.6',
                  marginBottom: '20px',
                  fontStyle: 'italic',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  "{testimonial.text}"
                </p>

                {/* Author - Fixed position at bottom */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  height: '48px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.3), rgba(100, 200, 255, 0.3))',
                    border: '2px solid rgba(0, 184, 212, 0.4)',
                    flexShrink: 0
                  }} />
                  <div>
                    <div style={{
                      fontSize: '14px',
                      color: '#fff',
                      fontWeight: '600',
                      lineHeight: '1.4'
                    }}>
                      DealLinked User
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'rgba(0, 184, 212, 0.8)',
                      lineHeight: '1.4'
                    }}>
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add keyframes animation */}
        <style>{`
          @keyframes scroll-left {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
        `}</style>
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

export default LandingPage;
