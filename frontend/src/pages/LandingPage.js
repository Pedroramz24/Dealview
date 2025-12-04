import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, Building2, Users, Shield, TrendingUp, Award, Clock, FileCheck } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      text: "DealLinked transformed how I source off-market deals. The quality control and NCND protection give me confidence every deal is legitimate.",
      author: "Sarah M.",
      role: "Commercial Real Estate Investor"
    },
    {
      text: "As a broker, the reputation system helps me stand out. My verified listings get priority visibility, and I've closed 3 deals in the first month.",
      author: "Michael R.",
      role: "Commercial Broker"
    },
    {
      text: "Finally, a marketplace that weeds out the noise. Only serious brokers with quality deals. The completeness requirements ensure I'm not wasting time.",
      author: "Jennifer L.",
      role: "Private Equity Investor"
    },
    {
      text: "The NCND digital signature system is brilliant. I feel protected sharing my off-market opportunities, and buyers appreciate the professionalism.",
      author: "David K.",
      role: "Off-Market Specialist"
    }
  ];

  return (
    <div style={{ 
      background: 'radial-gradient(circle, rgba(19, 15, 64, 1), rgba(0, 0, 0, 1))',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* Glassmorphism Sticky Navigation - Shows reflection underneath */}
      <nav style={{
        padding: '20px 60px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(30px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)'
      }}>
        <img 
          src="https://customer-assets.emergentagent.com/job_805e556f-4159-4595-8a8e-d3bb43ff0c72/artifacts/72aahevp_DealLinked.png"
          alt="DealLinked"
          style={{
            height: '48px',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/')}
        />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '10px 24px',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section - Clean with gradient background */}
      <section style={{
        position: 'relative',
        padding: '120px 60px 60px',
        textAlign: 'center',
        background: 'transparent',
        overflow: 'visible'
      }}>
        <div style={{ position: 'relative', zIndex: 10 }}>
          <h1 style={{
            fontSize: '72px',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '28px',
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
            fontSize: '19px',
            color: 'rgba(255,255,255,0.65)',
            marginBottom: '40px',
            maxWidth: '780px',
            margin: '0 auto 40px',
            lineHeight: '1.65',
            fontWeight: '400'
          }}>
            A curated off-market exchange built for serious operators. Discover real deals,
            <br />
            engage real decision-makers, and manage everything end-to-end with the
            <br />
            industry's first fully integrated deal OS.
          </p>

          {/* Get Started Button under hero - Reduced gap */}
          <button
            onClick={() => navigate('/signup')}
            style={{
              padding: '14px 32px',
              background: '#00b8d4',
              border: 'none',
              borderRadius: '30px',
              color: '#000',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '60px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Get Started
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Dashboard Screenshot - Clear glass border */}
      <section style={{
        padding: '0 60px 120px',
        position: 'relative',
        zIndex: 30
      }}>
        {/* Blue circular highlight design behind screenshot */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '900px',
          height: '900px',
          background: 'radial-gradient(circle, rgba(0, 184, 212, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
          filter: 'blur(60px)'
        }} />

        <div style={{
          maxWidth: '950px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 10
        }}>
          {/* Clear glassmorphism border container */}
          <div style={{
            padding: '1px',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%)',
            borderRadius: '24px',
            position: 'relative'
          }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderRadius: '23px',
              overflow: 'hidden',
              padding: '16px'
            }}>
              <img 
                src="https://customer-assets.emergentagent.com/job_805e556f-4159-4595-8a8e-d3bb43ff0c72/artifacts/of5y58m3_image.png" 
                alt="DealLinked Dashboard" 
                style={{ 
                  width: '100%', 
                  display: 'block',
                  borderRadius: '16px'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* What is DealLinked Section */}
      <section style={{
        padding: '100px 60px',
        background: 'transparent',
        position: 'relative',
        zIndex: 20,
        overflow: 'hidden'
      }}>
        <h2 style={{
          fontSize: '48px',
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
          What is DealLinked?
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* For Brokers */}
          <div style={{
            background: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(16px)',
            padding: '40px',
            borderRadius: '20px',
            border: '2px solid rgba(0, 184, 212, 0.3)',
            boxShadow: '0 0 40px rgba(0, 184, 212, 0.2), inset 0 0 60px rgba(0, 184, 212, 0.03)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.6)';
            e.currentTarget.style.boxShadow = '0 0 60px rgba(0, 184, 212, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.3)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 184, 212, 0.2), inset 0 0 60px rgba(0, 184, 212, 0.03)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(0, 184, 212, 0.15)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              boxShadow: '0 0 30px rgba(0, 184, 212, 0.4)',
              border: '1px solid rgba(0, 184, 212, 0.3)'
            }}>
              <Building2 size={32} color="#00b8d4" />
            </div>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '16px'
            }}>
              For Brokers
            </h3>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: '1.7',
              marginBottom: '24px'
            }}>
              Publish your off-market deals with confidence. Our quality control system ensures only complete, 
              verified listings go live. Build your reputation with every successful transaction.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'Quality-controlled publishing (80% completeness)',
                'Merit-based reputation system',
                'NCND legal protection built-in',
                'Direct investor communication',
                'Deal lifecycle tracking'
              ].map((item, idx) => (
                <li key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '12px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '15px'
                }}>
                  <CheckCircle size={20} color="#00b8d4" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* For Investors */}
          <div style={{
            background: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(16px)',
            padding: '40px',
            borderRadius: '20px',
            border: '2px solid rgba(0, 184, 212, 0.3)',
            boxShadow: '0 0 40px rgba(0, 184, 212, 0.2), inset 0 0 60px rgba(0, 184, 212, 0.03)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.6)';
            e.currentTarget.style.boxShadow = '0 0 60px rgba(0, 184, 212, 0.4), inset 0 0 60px rgba(0, 184, 212, 0.05)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.3)';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 184, 212, 0.2), inset 0 0 60px rgba(0, 184, 212, 0.03)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(0, 184, 212, 0.15)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              boxShadow: '0 0 30px rgba(0, 184, 212, 0.4)',
              border: '1px solid rgba(0, 184, 212, 0.3)'
            }}>
              <Users size={32} color="#00b8d4" />
            </div>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '16px'
            }}>
              For Investors
            </h3>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: '1.7',
              marginBottom: '24px'
            }}>
              Find verified off-market commercial properties from trusted brokers. Browse quality-controlled 
              listings with complete information and NCND protection on every deal.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'Verified off-market listings only',
                'Broker reputation scores visible',
                'NCND protection before viewing',
                'Complete deal information guaranteed',
                'Direct broker communication'
              ].map((item, idx) => (
                <li key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '12px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '15px'
                }}>
                  <CheckCircle size={20} color="#00b8d4" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: '100px 60px',
        background: 'transparent',
        position: 'relative',
        zIndex: 1
      }}>
        <h2 style={{
          fontSize: '48px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textAlign: 'center',
          marginBottom: '20px',
          letterSpacing: '-0.03em',
          fontFamily: '"Inter", sans-serif',
          filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
        }}>
          Built for Serious Professionals
        </h2>
        <p style={{
          fontSize: '18px',
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
          marginBottom: '80px',
          maxWidth: '700px',
          margin: '0 auto 80px'
        }}>
          Advanced tools that ensure deal quality, protect your information, and reward integrity.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '30px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {[
            {
              icon: <Shield size={32} />,
              title: 'NCND Protection',
              description: 'Digital signatures with complete audit trail. Every interaction is legally protected.'
            },
            {
              icon: <Award size={32} />,
              title: 'Broker Reputation',
              description: 'Data-driven quality scores. Premium brokers get priority visibility.'
            },
            {
              icon: <FileCheck size={32} />,
              title: '80% Completeness',
              description: 'Quality control on every listing. No incomplete or speculative deals.'
            },
            {
              icon: <TrendingUp size={32} />,
              title: 'Deal Tracking',
              description: 'Full lifecycle tracking from published to closed. Complete transparency.'
            },
            {
              icon: <Clock size={32} />,
              title: 'Fast Response',
              description: 'Response time tracking. Fast brokers get rewarded with better visibility.'
            },
            {
              icon: <Users size={32} />,
              title: 'Verified Community',
              description: 'Merit-based system. Only legitimate deals from committed sellers.'
            }
          ].map((feature, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(10, 10, 10, 0.6)',
                backdropFilter: 'blur(16px)',
                padding: '32px',
                borderRadius: '16px',
                border: '1px solid rgba(0, 184, 212, 0.2)',
                boxShadow: '0 0 30px rgba(0, 184, 212, 0.1), inset 0 0 40px rgba(0, 184, 212, 0.02)',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.5)';
                e.currentTarget.style.boxShadow = '0 0 50px rgba(0, 184, 212, 0.3), inset 0 0 40px rgba(0, 184, 212, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.2)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 184, 212, 0.1), inset 0 0 40px rgba(0, 184, 212, 0.02)';
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                background: 'rgba(0, 184, 212, 0.15)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                color: '#00b8d4',
                boxShadow: '0 0 20px rgba(0, 184, 212, 0.4)',
                border: '1px solid rgba(0, 184, 212, 0.3)'
              }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px'
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: '1.6'
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section - BuyBoxCartel Structure with DealLinked Aesthetic */}
      <section style={{
        padding: '100px 60px',
        background: 'transparent',
        position: 'relative',
        zIndex: 1
      }}>
        <h2 style={{
          fontSize: '48px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textAlign: 'center',
          marginBottom: '20px',
          letterSpacing: '-0.03em',
          fontFamily: '"Inter", sans-serif',
          filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
        }}>
          Simple, Transparent Pricing
        </h2>
        <p style={{
          fontSize: '18px',
          color: 'rgba(255,255,255,0.6)',
          textAlign: 'center',
          marginBottom: '60px'
        }}>
          One plan. Full access. No hidden fees.
        </p>

        <div style={{
          maxWidth: '520px',
          margin: '0 auto',
          background: 'rgba(15, 15, 15, 0.9)',
          backdropFilter: 'blur(16px)',
          borderRadius: '24px',
          padding: '48px',
          border: '3px solid #00b8d4',
          boxShadow: '0 0 80px rgba(0, 184, 212, 0.6), inset 0 0 80px rgba(0, 184, 212, 0.05)',
          position: 'relative',
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 100px rgba(0, 184, 212, 0.8), inset 0 0 80px rgba(0, 184, 212, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 80px rgba(0, 184, 212, 0.6), inset 0 0 80px rgba(0, 184, 212, 0.05)';
        }}
        >
          <div style={{
            position: 'absolute',
            top: '-16px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 24px',
            background: '#00b8d4',
            borderRadius: '20px',
            color: '#000',
            fontSize: '13px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            boxShadow: '0 0 30px rgba(0, 184, 212, 0.8)'
          }}>
            Professional
          </div>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              fontSize: '56px', 
              fontWeight: '800', 
              color: '#fff', 
              marginBottom: '8px',
              textShadow: '0 0 40px rgba(0, 184, 212, 0.4)'
            }}>
              $39.99
              <span style={{ fontSize: '24px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>/month</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px' }}>
              Full access to broker and investor features
            </p>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0' }}>
            {[
              'Unlimited deal publishing',
              'Browse entire marketplace',
              'NCND digital signatures',
              'Broker reputation system',
              'Advanced CRM tools',
              'Deal lifecycle tracking',
              'Direct messaging',
              'Priority support'
            ].map((feature, idx) => (
              <li key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '14px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '15px',
                fontWeight: '500'
              }}>
                <CheckCircle size={20} color="#00b8d4" style={{ flexShrink: 0 }} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => navigate('/signup')}
            style={{
              width: '100%',
              padding: '18px',
              background: '#00b8d4',
              border: 'none',
              borderRadius: '12px',
              color: '#000',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 0 40px rgba(0, 184, 212, 0.6), 0 6px 20px rgba(0, 184, 212, 0.3)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 0 60px rgba(0, 184, 212, 0.8), 0 10px 30px rgba(0, 184, 212, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 184, 212, 0.6), 0 6px 20px rgba(0, 184, 212, 0.3)';
            }}
          >
            Get Started Now
          </button>

          <p style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '13px',
            marginTop: '16px'
          }}>
            No credit card required to start
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      {/* Testimonials Section - Grid Layout */}
      <section style={{
        padding: '100px 60px',
        background: 'transparent',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* Header with Join Others button */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '60px'
          }}>
            <h2 style={{
              fontSize: '48px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.03em',
              fontFamily: '"Inter", sans-serif',
              filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))',
              margin: 0
            }}>
              What Our Members Say
            </h2>
            <button
              onClick={() => navigate('/signup')}
              style={{
                padding: '12px 28px',
                background: '#00b8d4',
                border: 'none',
                borderRadius: '10px',
                color: '#000',
                fontSize: '15px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Join others
            </button>
          </div>

          {/* Reviews Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px'
          }}>
            {[
              {
                text: "DealLinked transformed how I source off-market deals. The quality control and NCND protection give me confidence every deal is legitimate.",
                author: "Sarah M.",
                role: "Commercial Real Estate Investor"
              },
              {
                text: "As a broker, the reputation system helps me stand out. My verified listings get priority visibility, and I've closed 3 deals in the first month.",
                author: "Michael R.",
                role: "Commercial Broker"
              },
              {
                text: "Finally, a marketplace that weeds out the noise. Only serious brokers with quality deals. The completeness requirements ensure I'm not wasting time.",
                author: "Jennifer L.",
                role: "Private Equity Investor"
              },
              {
                text: "The NCND digital signature system is brilliant. I feel protected sharing my off-market opportunities, and buyers appreciate the professionalism.",
                author: "David K.",
                role: "Off-Market Specialist"
              },
              {
                text: "Best platform for commercial real estate. The deal tracking and CRM features keep everything organized in one place.",
                author: "Robert T.",
                role: "Real Estate Developer"
              },
              {
                text: "Quality over quantity - exactly what the industry needed. Every listing I've seen has been complete and from committed sellers.",
                author: "Amanda S.",
                role: "Institutional Investor"
              }
            ].map((review, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(10, 10, 10, 0.6)',
                  backdropFilter: 'blur(16px)',
                  padding: '32px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Profile Picture Placeholder */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.3) 0%, rgba(0, 184, 212, 0.1) 100%)',
                  border: '2px solid rgba(0, 184, 212, 0.3)',
                  marginBottom: '20px'
                }} />

                {/* Review Text */}
                <p style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.9)',
                  lineHeight: '1.6',
                  marginBottom: '20px',
                  fontFamily: '"Inter", sans-serif'
                }}>
                  "{review.text}"
                </p>

                {/* Author Info */}
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#fff',
                    marginBottom: '4px'
                  }}>
                    {review.author}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontWeight: '400'
                  }}>
                    {review.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '100px 60px',
        background: 'rgba(0, 184, 212, 0.05)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        borderTop: '1px solid rgba(0, 184, 212, 0.2)',
        borderBottom: '1px solid rgba(0, 184, 212, 0.2)'
      }}>
        <h2 style={{
          fontSize: '52px',
          fontWeight: '600',
          background: 'linear-gradient(135deg, #ffffff 0%, #b8c5d0 50%, #ffffff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '24px',
          letterSpacing: '-0.03em',
          fontFamily: '"Inter", sans-serif',
          filter: 'drop-shadow(2px 2px 8px rgba(0, 0, 0, 0.3))'
        }}>
          Ready to Get Started?
        </h2>
        <p style={{
          fontSize: '20px',
          color: 'rgba(255,255,255,0.7)',
          marginBottom: '48px',
          maxWidth: '700px',
          margin: '0 auto 48px'
        }}>
          Join the marketplace where quality meets opportunity. 
          Connect with serious investors and trusted brokers today.
        </p>
        
        <button
          onClick={() => navigate('/signup')}
          style={{
            padding: '20px 48px',
            background: '#00b8d4',
            border: 'none',
            borderRadius: '12px',
            color: '#000',
            fontSize: '20px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 0 50px rgba(0, 184, 212, 0.6), 0 10px 40px rgba(0, 184, 212, 0.3)',
            transition: 'all 0.3s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 0 70px rgba(0, 184, 212, 0.8), 0 15px 50px rgba(0, 184, 212, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 50px rgba(0, 184, 212, 0.6), 0 10px 40px rgba(0, 184, 212, 0.3)';
          }}
        >
          Start Free Trial
          <ArrowRight size={24} />
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '60px 60px 40px',
        background: 'transparent',
        color: 'rgba(255,255,255,0.5)',
        position: 'relative',
        zIndex: 1,
        borderTop: '1px solid rgba(0, 184, 212, 0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '60px',
          marginBottom: '60px'
        }}>
          <div>
            <img 
              src="https://customer-assets.emergentagent.com/job_805e556f-4159-4595-8a8e-d3bb43ff0c72/artifacts/72aahevp_DealLinked.png"
              alt="DealLinked"
              style={{
                height: '28px',
                marginBottom: '16px'
              }}
            />
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgba(255,255,255,0.5)'
            }}>
              The professional marketplace for off-market commercial real estate.
            </p>
          </div>

          <div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Product
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Features', 'Pricing', 'Marketplace', 'CRM'].map(item => (
                <li key={item} style={{ marginBottom: '10px' }}>
                  <a 
                    href="#" 
                    style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      textDecoration: 'none', 
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#00b8d4';
                      e.currentTarget.style.textShadow = '0 0 10px rgba(0, 184, 212, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                      e.currentTarget.style.textShadow = 'none';
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Company
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['About', 'Blog', 'Careers', 'Contact'].map(item => (
                <li key={item} style={{ marginBottom: '10px' }}>
                  <a 
                    href="#" 
                    style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      textDecoration: 'none', 
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#00b8d4';
                      e.currentTarget.style.textShadow = '0 0 10px rgba(0, 184, 212, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                      e.currentTarget.style.textShadow = 'none';
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Legal
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Privacy Policy', 'Terms of Service', 'NCND Agreement'].map(item => (
                <li key={item} style={{ marginBottom: '10px' }}>
                  <a 
                    href="#" 
                    style={{ 
                      color: 'rgba(255,255,255,0.5)', 
                      textDecoration: 'none', 
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#00b8d4';
                      e.currentTarget.style.textShadow = '0 0 10px rgba(0, 184, 212, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                      e.currentTarget.style.textShadow = 'none';
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(0, 184, 212, 0.1)',
          paddingTop: '32px',
          textAlign: 'center',
          fontSize: '14px',
          color: 'rgba(255,255,255,0.4)'
        }}>
          © 2025 DealLinked. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
