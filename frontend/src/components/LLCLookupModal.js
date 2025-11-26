import React, { useState } from 'react';
import { X, Search, User, MapPin, Phone, Building2, Calendar, ExternalLink, Copy, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../App';
import { supabase } from '../supabaseClient';

const LLCLookupModal = ({ isOpen, onClose, llcName, state = 'TX' }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState(llcName || '');
  const [selectedState, setSelectedState] = useState(state);

  const handleLookup = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter an LLC name');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(
        `${API}/llc/lookup?llc_name=${encodeURIComponent(searchQuery)}&state=${selectedState}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResult(data.result);
        if (data.result.cached) {
          toast.success('Results loaded from cache');
        } else {
          toast.success('LLC information found!');
        }
      } else {
        const error = await response.text();
        toast.error('LLC not found');
        setResult(null);
      }
    } catch (error) {
      console.error('LLC lookup error:', error);
      toast.error('Failed to lookup LLC');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, rgba(17, 17, 17, 0.98), rgba(0, 0, 0, 0.98))',
        border: '1px solid rgba(0, 184, 212, 0.2)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 100px rgba(0, 184, 212, 0.1)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(145deg, rgba(0, 184, 212, 0.05), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, rgba(0, 184, 212, 0.2), rgba(0, 184, 212, 0.1))',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(0, 184, 212, 0.3)'
            }}>
              <Search style={{ color: '#00b8d4', width: '20px', height: '20px' }} />
            </div>
            <div>
              <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
                LLC Owner Lookup
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                Find registered agent & contact info
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <X style={{ color: 'rgba(255, 255, 255, 0.6)', width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Search Form */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter LLC name..."
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 184, 212, 0.4)';
                e.currentTarget.style.background = 'rgba(0, 184, 212, 0.05)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleLookup();
              }}
            />
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                width: '100px'
              }}
            >
              <option value="TX">Texas</option>
              <option value="CA">California</option>
              <option value="FL">Florida</option>
              <option value="NY">New York</option>
              <option value="IL">Illinois</option>
            </select>
            <button
              onClick={handleLookup}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #00b8d4, #0097a7)',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 24px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {loading ? (
                <>
                  <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                  Searching...
                </>
              ) : (
                <>
                  <Search style={{ width: '16px', height: '16px' }} />
                  Lookup
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div style={{
              background: 'linear-gradient(145deg, rgba(0, 184, 212, 0.08), rgba(0, 184, 212, 0.04))',
              border: '1px solid rgba(0, 184, 212, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              animation: 'fadeSlideIn 0.4s ease-out'
            }}>
              {/* LLC Name & Status */}
              <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                      {result.llc_name}
                    </h3>
                    {result.current_status && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        background: result.current_status.toLowerCase().includes('active') 
                          ? 'rgba(16, 185, 129, 0.15)' 
                          : 'rgba(239, 68, 68, 0.15)',
                        border: `1px solid ${result.current_status.toLowerCase().includes('active') 
                          ? 'rgba(16, 185, 129, 0.3)' 
                          : 'rgba(239, 68, 68, 0.3)'}`,
                        borderRadius: '6px'
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: result.current_status.toLowerCase().includes('active') ? '#10b981' : '#ef4444'
                        }} />
                        <span style={{
                          color: result.current_status.toLowerCase().includes('active') ? '#10b981' : '#ef4444',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {result.current_status}
                        </span>
                      </div>
                    )}
                  </div>
                  {result.cached && (
                    <div style={{
                      padding: '4px 8px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: '600',
                      color: '#a78bfa',
                      textTransform: 'uppercase'
                    }}>
                      Cached
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                  {result.company_type && (
                    <InfoItem icon={Building2} label="Type" value={result.company_type} />
                  )}
                  {result.incorporation_date && (
                    <InfoItem icon={Calendar} label="Incorporated" value={new Date(result.incorporation_date).toLocaleDateString()} />
                  )}
                </div>
              </div>

              {/* Registered Agent */}
              {result.registered_agent && (
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <h4 style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '12px'
                  }}>
                    Registered Agent
                  </h4>
                  {result.registered_agent.name && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <User style={{ color: '#00b8d4', width: '16px', height: '16px' }} />
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', textTransform: 'uppercase' }}>
                          Name
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#ffffff', fontSize: '15px', fontWeight: '600' }}>
                          {result.registered_agent.name}
                        </span>
                        <button
                          onClick={() => copyToClipboard(result.registered_agent.name)}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(0, 184, 212, 0.1)',
                            border: '1px solid rgba(0, 184, 212, 0.2)',
                            borderRadius: '6px',
                            color: '#00b8d4',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Copy style={{ width: '12px', height: '12px' }} />
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                  {result.registered_agent.address && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <MapPin style={{ color: '#00b8d4', width: '16px', height: '16px' }} />
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', textTransform: 'uppercase' }}>
                          Address
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                        <span style={{ color: '#ffffff', fontSize: '14px', lineHeight: '1.5' }}>
                          {result.registered_agent.address}
                        </span>
                        <button
                          onClick={() => copyToClipboard(result.registered_agent.address)}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(0, 184, 212, 0.1)',
                            border: '1px solid rgba(0, 184, 212, 0.2)',
                            borderRadius: '6px',
                            color: '#00b8d4',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0,
                            marginLeft: '8px'
                          }}
                        >
                          <Copy style={{ width: '12px', height: '12px' }} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Officers/Directors */}
              {result.officers && result.officers.length > 0 && (
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <h4 style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '12px'
                  }}>
                    Officers & Directors
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {result.officers.map((officer, idx) => (
                      <div key={idx} style={{
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                            {officer.name}
                          </div>
                          {officer.position && (
                            <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                              {officer.position}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(officer.name)}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(0, 184, 212, 0.1)',
                            border: '1px solid rgba(0, 184, 212, 0.2)',
                            borderRadius: '6px',
                            color: '#00b8d4',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <Copy style={{ width: '12px', height: '12px' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phone Numbers (if found) */}
              {result.phone_numbers && result.phone_numbers.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '12px'
                  }}>
                    📞 Phone Numbers Found
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {result.phone_numbers.map((phone, idx) => (
                      <PhoneNumberItem key={idx} phone={phone} copyToClipboard={copyToClipboard} />
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {result.opencorporates_url && (
                  <a
                    href={result.opencorporates_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(0, 184, 212, 0.1)',
                      border: '1px solid rgba(0, 184, 212, 0.2)',
                      borderRadius: '8px',
                      color: '#00b8d4',
                      fontSize: '12px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <ExternalLink style={{ width: '14px', height: '14px' }} />
                    OpenCorporates
                  </a>
                )}
                {result.registry_url && (
                  <a
                    href={result.registry_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      borderRadius: '8px',
                      color: '#a78bfa',
                      fontSize: '12px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <ExternalLink style={{ width: '14px', height: '14px' }} />
                    State Registry
                  </a>
                )}
              </div>

              {/* Source indicator */}
              <div style={{
                marginTop: '20px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.5)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle style={{ width: '14px', height: '14px', color: '#10b981' }} />
                  Data source: {result.source === 'opencorporates' ? 'OpenCorporates' : 'Texas SOS'}
                  {result.cached && ' (Cached)'}
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result && !loading && (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '14px'
            }}>
              <Search style={{ width: '48px', height: '48px', margin: '0 auto 16px', opacity: 0.3 }} />
              <p>Enter an LLC name and click Lookup to find owner information</p>
              <p style={{ fontSize: '12px', marginTop: '8px', color: 'rgba(255, 255, 255, 0.3)' }}>
                Searches OpenCorporates database for registered agents and officers
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper components
const InfoItem = ({ icon: Icon, label, value }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
      <Icon style={{ color: '#00b8d4', width: '14px', height: '14px' }} />
      <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
    <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
      {value}
    </div>
  </div>
);

const PhoneNumberItem = ({ phone, copyToClipboard }) => {
  const confidenceColors = {
    high: { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981' },
    medium: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b' },
    low: { bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.3)', text: '#9ca3af' }
  };
  
  const color = confidenceColors[phone.confidence] || confidenceColors.medium;
  
  return (
    <div style={{
      padding: '12px',
      background: 'rgba(255, 255, 255, 0.03)',
      border: `1px solid ${color.border}`,
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Phone style={{ color: color.text, width: '14px', height: '14px' }} />
          <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>
            {phone.number}
          </span>
          <div style={{
            padding: '2px 6px',
            background: color.bg,
            border: `1px solid ${color.border}`,
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: '700',
            color: color.text,
            textTransform: 'uppercase'
          }}>
            {phone.confidence}
          </div>
        </div>
        <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', marginLeft: '22px' }}>
          Source: {phone.source}
        </div>
      </div>
      <button
        onClick={() => copyToClipboard(phone.number)}
        style={{
          padding: '6px 12px',
          background: 'rgba(0, 184, 212, 0.1)',
          border: '1px solid rgba(0, 184, 212, 0.2)',
          borderRadius: '6px',
          color: '#00b8d4',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <Copy style={{ width: '12px', height: '12px' }} />
        Copy
      </button>
    </div>
  );
};

export default LLCLookupModal;
