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
      background: '#fff',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Background Elements */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-5%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(0, 184, 212, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '-8%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Navigation */}
      <nav style={{
        padding: '20px 60px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div style={{
          fontSize: '28px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #00b8d4 0%, #10b981 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.02em'
        }}>
          DealLinked
        </div>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '12px 28px',
              background: 'transparent',
              border: '2px solid #00b8d4',
              borderRadius: '10px',
              color: '#00b8d4',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#00b8d4';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#00b8d4';
            }}
          >
            Login
          </button>
          <button
            onClick={() => navigate('/signup')}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #00b8d4 0%, #10b981 100%)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0, 184, 212, 0.3)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 184, 212, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 184, 212, 0.3)';
            }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '120px 60px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <h1 style={{
          fontSize: '64px',
          fontWeight: '800',
          color: '#1a1a1a',
          marginBottom: '24px',
          lineHeight: '1.1',
          letterSpacing: '-0.03em'
        }}>
          Off-Market Commercial Real Estate.<br />
          <span style={{
            background: 'linear-gradient(135deg, #00b8d4 0%, #10b981 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Simplified.
          </span>
        </h1>
        <p style={{
          fontSize: '22px',
          color: '#666',
          marginBottom: '48px',
          maxWidth: '800px',
          margin: '0 auto 48px',
          lineHeight: '1.6'
        }}>
          Connect brokers with serious investors. Post quality-controlled off-market deals. 
          Find your next investment with NCND protection.
        </p>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '80px' }}>
          <button
            onClick={() => navigate('/signup')}
            style={{
              padding: '18px 40px',
              background: 'linear-gradient(135deg, #00b8d4 0%, #10b981 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 8px 30px rgba(0, 184, 212, 0.3)',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 184, 212, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 184, 212, 0.3)';
            }}
          >
            Get Started
            <ArrowRight size={20} />
          </button>
          
          <button
            onClick={() => navigate('/marketplace')}
            style={{
              padding: '18px 40px',
              background: '#fff',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              color: '#1a1a1a',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00b8d4';
              e.currentTarget.style.color = '#00b8d4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.color = '#1a1a1a';
            }}
          >
            View Marketplace
          </button>
        </div>

        {/* Dashboard Preview Image */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(0,0,0,0.1)'
        }}>
          <img 
            src="https://via.placeholder.com/1200x700/0a0a0a/00b8d4?text=DealLinked+Dashboard+Preview" 
            alt="DealLinked Dashboard" 
            style={{ width: '100%', display: 'block' }}
          />
        </div>
      </section>

      {/* What is DealLinked Section */}
      <section style={{
        padding: '100px 60px',
        background: 'linear-gradient(180deg, #f9fafb 0%, #fff 100%)',
        position: 'relative',
        zIndex: 1
      }}>
        <h2 style={{
          fontSize: '48px',
          fontWeight: '800',
          color: '#1a1a1a',
          textAlign: 'center',
          marginBottom: '80px',
          letterSpacing: '-0.02em'
        }}>
          What is DealLinked?
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '60px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {/* For Brokers */}
          <div style={{
            background: '#fff',
            padding: '40px',
            borderRadius: '20px',
            border: '2px solid #00b8d4',
            boxShadow: '0 10px 40px rgba(0, 184, 212, 0.15)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #00b8d4 0%, #10b981 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <Building2 size={32} color="#fff" />
            </div>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1a1a1a',
              marginBottom: '16px'
            }}>
              For Brokers
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#666',
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
                  color: '#333',
                  fontSize: '15px'
                }}>
                  <CheckCircle size={20} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* For Investors */}
          <div style={{
            background: '#fff',
            padding: '40px',
            borderRadius: '20px',
            border: '2px solid #10b981',
            boxShadow: '0 10px 40px rgba(16, 185, 129, 0.15)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #10b981 0%, #00b8d4 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <Users size={32} color="#fff" />
            </div>
            <h3 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1a1a1a',
              marginBottom: '16px'
            }}>
              For Investors
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#666',
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
                  color: '#333',
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
        background: '#fff',
        position: 'relative',
        zIndex: 1
      }}>
        <h2 style={{
          fontSize: '48px',
          fontWeight: '800',
          color: '#1a1a1a',
          textAlign: 'center',
          marginBottom: '20px',
          letterSpacing: '-0.02em'
        }}>
          Built for Serious Professionals
        </h2>
        <p style={{
          fontSize: '18px',
          color: '#666',
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
          gap: '40px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          {[
            {
              icon: <Shield size={32} />,
              title: 'NCND Protection',
              description: 'Digital signatures with complete audit trail. Every interaction is legally protected.',
              color: '#00b8d4'
            },
            {
              icon: <Award size={32} />,
              title: 'Broker Reputation',
              description: 'Data-driven quality scores. Premium brokers get priority visibility.',
              color: '#10b981'
            },
            {
              icon: <FileCheck size={32} />,
              title: '80% Completeness',
              description: 'Quality control on every listing. No incomplete or speculative deals.',
              color: '#f59e0b'
            },
            {
              icon: <TrendingUp size={32} />,
              title: 'Deal Tracking',
              description: 'Full lifecycle tracking from published to closed. Complete transparency.',
              color: '#8b5cf6'
            },
            {
              icon: <Clock size={32} />,
              title: 'Fast Response',
              description: 'Response time tracking. Fast brokers get rewarded with better visibility.',
              color: '#ec4899'
            },
            {
              icon: <Users size={32} />,
              title: 'Verified Community',
              description: 'Merit-based system. Only legitimate deals from committed sellers.',
              color: '#00b8d4'
            }
          ].map((feature, idx) => (
            <div
              key={idx}
              style={{
                background: '#fff',
                padding: '32px',
                borderRadius: '16px',
                border: '1px solid #e5e7eb',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = `0 20px 40px ${feature.color}20`;
                e.currentTarget.style.borderColor = feature.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                background: `${feature.color}15`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                color: feature.color
              }}>
                {feature.icon}
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1a1a1a',
                marginBottom: '12px'
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: '15px',
                color: '#666',
                lineHeight: '1.6'
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{
        padding: '100px 60px',
        background: 'linear-gradient(180deg, #fff 0%, #f9fafb 100%)',
        position: 'relative',
        zIndex: 1
      }}>
        <h2 style={{
          fontSize: '48px',
          fontWeight: '800',
          color: '#1a1a1a',
          textAlign: 'center',
          marginBottom: '20px',
          letterSpacing: '-0.02em'
        }}>
          Simple, Transparent Pricing
        </h2>
        <p style={{
          fontSize: '18px',
          color: '#666',
          textAlign: 'center',
          marginBottom: '60px'
        }}>
          One plan. Full access. No hidden fees.
        </p>

        <div style={{
          maxWidth: '500px',
          margin: '0 auto',
          background: '#fff',
          borderRadius: '24px',
          padding: '48px',
          border: '3px solid #00b8d4',
          boxShadow: '0 20px 60px rgba(0, 184, 212, 0.2)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '-16px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 24px',
            background: 'linear-gradient(135deg, #00b8d4 0%, #10b981 100%)',
            borderRadius: '20px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Professional
          </div>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '56px', fontWeight: '800', color: '#1a1a1a', marginBottom: '8px' }}>
              $39.99
              <span style={{ fontSize: '24px', fontWeight: '600', color: '#666' }}>/month</span>
            </div>
            <p style={{ color: '#666', fontSize: '15px' }}>
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
                color: '#333',
                fontSize: '15px',
                fontWeight: '500'
              }}>
                <CheckCircle size={20} color="#10b981" style={{ flexShrink: 0 }} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => navigate('/signup')}
            style={{
              width: '100%',
              padding: '18px',
              background: 'linear-gradient(135deg, #00b8d4 0%, #10b981 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0, 184, 212, 0.3)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 184, 212, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 184, 212, 0.3)';
            }}
          >
            Get Started Now
          </button>

          <p style={{
            textAlign: 'center',
            color: '#999',
            fontSize: '13px',
            marginTop: '16px'
          }}>
            No credit card required to start
          </p>
        </div>
      </section>

      {/* Testimonials Section */}
      <section style={{
        padding: '100px 60px',
        background: '#fff',
        position: 'relative',
        zIndex: 1
      }}>
        <h2 style={{
          fontSize: '48px',
          fontWeight: '800',
          color: '#1a1a1a',
          textAlign: 'center',
          marginBottom: '60px',
          letterSpacing: '-0.02em'
        }}>
          What Our Members Say
        </h2>

        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          background: 'linear-gradient(135deg, #f9fafb 0%, #fff 100%)',
          padding: '60px',
          borderRadius: '24px',
          border: '1px solid #e5e7eb',
          position: 'relative',
          minHeight: '280px'
        }}>
          <div style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            fontSize: '80px',
            color: '#00b8d420',
            fontFamily: 'Georgia, serif',
            lineHeight: '1'
          }}>
            "
          </div>

          <p style={{
            fontSize: '22px',
            color: '#333',
            lineHeight: '1.7',
            marginBottom: '32px',
            fontStyle: 'italic',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1
          }}>
            {testimonials[currentTestimonial].text}
          </p>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#1a1a1a',
              marginBottom: '4px'
            }}>
              {testimonials[currentTestimonial].author}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#00b8d4',
              fontWeight: '600'
            }}>
              {testimonials[currentTestimonial].role}
            </div>
          </div>

          {/* Testimonial Navigation Dots */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginTop: '40px'
          }}>
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentTestimonial(idx)}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  background: currentTestimonial === idx ? '#00b8d4' : '#d1d5db',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: '100px 60px',
        background: 'linear-gradient(135deg, #00b8d4 0%, #10b981 100%)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <h2 style={{
          fontSize: '52px',
          fontWeight: '800',
          color: '#fff',
          marginBottom: '24px',
          letterSpacing: '-0.02em'
        }}>
          Ready to Get Started?
        </h2>
        <p style={{
          fontSize: '20px',
          color: 'rgba(255,255,255,0.9)',
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
            background: '#fff',
            border: 'none',
            borderRadius: '12px',
            color: '#00b8d4',
            fontSize: '20px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 15px 50px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.2)';
          }}
        >
          Start Free Trial
          <ArrowRight size={24} />
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '60px 60px 40px',
        background: '#1a1a1a',
        color: '#999',
        position: 'relative',
        zIndex: 1
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
            <div style={{
              fontSize: '24px',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '16px'
            }}>
              DealLinked
            </div>
            <p style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#999'
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
                  <a href="#" style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>
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
                  <a href="#" style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>
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
                  <a href="#" style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid #333',
          paddingTop: '32px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#666'
        }}>
          © 2025 DealLinked. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
