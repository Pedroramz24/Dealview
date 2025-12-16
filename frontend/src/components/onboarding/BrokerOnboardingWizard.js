import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Upload, Building2, MapPin, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../../App';
import { supabase } from '../../supabaseClient';

const BrokerOnboardingWizard = ({ onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    full_name: '',
    broker_firm: '',
    broker_phone: '',
    
    // Step 2: License & Documents
    broker_license: '',
    broker_w9_url: '',
    broker_license_url: '',
    
    // Step 3: Markets & Specialties
    broker_markets: [],
    broker_specialties: [],
    
    // Step 4: Create Account
    email: '',
    password: ''
  });

  const totalSteps = 4;

  const marketOptions = [
    'Austin', 'San Antonio', 'Dallas', 'Houston', 'Fort Worth',
    'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Lubbock'
  ];

  const specialtyOptions = [
    'Office', 'Retail', 'Industrial', 'Multifamily', 'Land',
    'Hospitality', 'Healthcare', 'Mixed Use', 'Self Storage', 'Special Purpose'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const handleFileUpload = async (field, file) => {
    if (!file) return;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `broker-docs/${fileName}`;

      const { data, error } = await supabase.storage
        .from('user-documents')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('user-documents')
        .getPublicUrl(filePath);

      handleInputChange(field, urlData.publicUrl);
      toast.success('Document uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.full_name || !formData.broker_firm || !formData.broker_phone) {
          toast.error('Please fill in all required fields');
          return false;
        }
        break;
      case 2:
        if (!formData.broker_license) {
          toast.error('License number is required');
          return false;
        }
        break;
      case 3:
        if (formData.broker_markets.length === 0 || formData.broker_specialties.length === 0) {
          toast.error('Please select at least one market and specialty');
          return false;
        }
        break;
      case 4:
        if (!formData.email || !formData.password) {
          toast.error('Email and password are required');
          return false;
        }
        if (formData.password.length < 8) {
          toast.error('Password must be at least 8 characters');
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Step 1: Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: 'broker'
          }
        }
      });

      if (authError) throw authError;

      // Step 2: Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          id: authData.user.id,
          email: formData.email,
          full_name: formData.full_name,
          roles: ['buyer'], // Start with buyer, will add broker after verification
          primary_role: 'buyer',
          broker_firm: formData.broker_firm,
          broker_phone: formData.broker_phone
        }])
        .select()
        .single();

      if (profileError) throw profileError;

      // Step 3: Submit broker verification request
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${API}/roles/request-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requested_role: 'broker',
          broker_license: formData.broker_license,
          broker_firm: formData.broker_firm,
          broker_phone: formData.broker_phone,
          broker_markets: formData.broker_markets,
          broker_specialties: formData.broker_specialties,
          broker_w9_url: formData.broker_w9_url,
          broker_license_url: formData.broker_license_url
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to submit verification request');
      }

      toast.success('Account created! Your broker verification request has been submitted.');
      onComplete();
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <Building2 size={48} style={{ color: '#00b8d4', marginBottom: '16px' }} />
              <h2 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
                Basic Information
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                Tell us about yourself and your firm
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="John Doe"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '15px'
                  }}
                />
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                  Brokerage Firm *
                </label>
                <input
                  type="text"
                  value={formData.broker_firm}
                  onChange={(e) => handleInputChange('broker_firm', e.target.value)}
                  placeholder="ABC Commercial Realty"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '15px'
                  }}
                />
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.broker_phone}
                  onChange={(e) => handleInputChange('broker_phone', e.target.value)}
                  placeholder="(210) 555-0123"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '15px'
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <Upload size={48} style={{ color: '#00b8d4', marginBottom: '16px' }} />
              <h2 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
                License & Documents
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                Verify your credentials (W9 and license upload optional but recommended)
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                  Real Estate License Number *
                </label>
                <input
                  type="text"
                  value={formData.broker_license}
                  onChange={(e) => handleInputChange('broker_license', e.target.value)}
                  placeholder="TX-1234567"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '15px'
                  }}
                />
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', marginBottom: '12px', display: 'block' }}>
                  Upload W-9 Form (Optional)
                </label>
                <div style={{
                  border: '2px dashed rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#00b8d4';
                    e.currentTarget.style.background = 'rgba(0,184,212,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onClick={() => document.getElementById('w9-upload').click()}
                >
                  <Upload size={32} style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '4px' }}>
                    {formData.broker_w9_url ? 'W-9 Uploaded ✓' : 'Click to upload W-9 form'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                    PDF, max 10MB
                  </p>
                </div>
                <input
                  id="w9-upload"
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload('broker_w9_url', e.target.files[0])}
                />
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', marginBottom: '12px', display: 'block' }}>
                  Upload License Copy (Optional)
                </label>
                <div style={{
                  border: '2px dashed rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#00b8d4';
                    e.currentTarget.style.background = 'rgba(0,184,212,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onClick={() => document.getElementById('license-upload').click()}
                >
                  <Upload size={32} style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '4px' }}>
                    {formData.broker_license_url ? 'License Uploaded ✓' : 'Click to upload license copy'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                    PDF or Image, max 10MB
                  </p>
                </div>
                <input
                  id="license-upload"
                  type="file"
                  accept=".pdf,image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload('broker_license_url', e.target.files[0])}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <MapPin size={48} style={{ color: '#00b8d4', marginBottom: '16px' }} />
              <h2 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
                Markets & Specialties
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                Select your primary markets and property specialties
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', marginBottom: '16px', display: 'block' }}>
                  Markets Served * (Select at least one)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {marketOptions.map((market) => {
                    const isSelected = formData.broker_markets.includes(market);
                    return (
                      <button
                        key={market}
                        type="button"
                        onClick={() => toggleArrayItem('broker_markets', market)}
                        style={{
                          padding: '12px 16px',
                          background: isSelected ? 'rgba(0,184,212,0.15)' : 'rgba(255,255,255,0.05)',
                          border: isSelected ? '1px solid #00b8d4' : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: isSelected ? '#00b8d4' : 'rgba(255,255,255,0.7)',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        {market}
                        {isSelected && <Check size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', marginBottom: '16px', display: 'block' }}>
                  Property Specialties * (Select at least one)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {specialtyOptions.map((specialty) => {
                    const isSelected = formData.broker_specialties.includes(specialty);
                    return (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => toggleArrayItem('broker_specialties', specialty)}
                        style={{
                          padding: '12px 16px',
                          background: isSelected ? 'rgba(0,184,212,0.15)' : 'rgba(255,255,255,0.05)',
                          border: isSelected ? '1px solid #00b8d4' : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: isSelected ? '#00b8d4' : 'rgba(255,255,255,0.7)',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        {specialty}
                        {isSelected && <Check size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <Briefcase size={48} style={{ color: '#00b8d4', marginBottom: '16px' }} />
              <h2 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
                Create Your Account
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                Set up your login credentials
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="broker@example.com"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '15px'
                  }}
                />
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                  Password * (min 8 characters)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '15px'
                  }}
                />
              </div>

              <div style={{
                background: 'rgba(0,184,212,0.1)',
                border: '1px solid rgba(0,184,212,0.3)',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '8px'
              }}>
                <p style={{ color: '#00b8d4', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>
                  What happens next?
                </p>
                <ul style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', lineHeight: '1.6', paddingLeft: '20px', margin: 0 }}>
                  <li>Your account will be created with buyer access immediately</li>
                  <li>Your broker verification request will be submitted to our admin team</li>
                  <li>You'll receive an email when your broker role is approved (usually 1-2 business days)</li>
                  <li>Once approved, you'll get full CRM access and can publish deals</li>
                </ul>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0b0d 0%, #1a1b1e 100%)',
      padding: '40px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ maxWidth: '700px', width: '100%' }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                style={{
                  width: 'calc(25% - 12px)',
                  height: '4px',
                  background: step <= currentStep ? '#00b8d4' : 'rgba(255,255,255,0.1)',
                  borderRadius: '2px',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
            Step {currentStep} of {totalSteps}
          </div>
        </div>

        {/* Step Content */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '48px',
          marginBottom: '24px'
        }}>
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              style={{
                flex: 1,
                padding: '14px 24px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
            >
              <ArrowLeft size={20} />
              Back
            </button>
          ) : (
            <button
              onClick={onBack}
              style={{
                flex: 1,
                padding: '14px 24px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <ArrowLeft size={20} />
              Change Role
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={loading}
            style={{
              flex: 1,
              padding: '14px 24px',
              background: loading ? 'rgba(0,184,212,0.5)' : 'linear-gradient(135deg, #00b8d4 0%, #00d4aa 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0,184,212,0.4)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,184,212,0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,184,212,0.4)';
            }}
          >
            {loading ? 'Creating Account...' : currentStep === totalSteps ? 'Create Account' : 'Continue'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrokerOnboardingWizard;
