import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Upload, Building2, MapPin, Briefcase, Home, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../../App';
import { supabase } from '../../supabaseClient';

const UnifiedOnboardingWizard = ({ selectedRole, onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Common fields
    full_name: '',
    email: '',
    password: '',
    
    // Broker-specific
    broker_firm: '',
    broker_phone: '',
    broker_license: '',
    broker_w9_url: '',
    broker_license_url: '',
    broker_markets: [],
    broker_specialties: [],
    
    // Seller-specific
    seller_entity_name: '',
    seller_entity_type: '',
    seller_phone: '',
    property_address: '',
    proof_type: 'deed',
    proof_document_url: '',
    
    // Buyer-specific
    buyer_company: '',
    buyer_markets: [],
    buyer_asset_types: [],
    min_price: '',
    max_price: ''
  });

  // Configuration based on role
  const getRoleConfig = () => {
    switch (selectedRole) {
      case 'broker':
        return {
          totalSteps: 4,
          icon: Building2,
          color: '#00b8d4',
          title: 'Broker Onboarding'
        };
      case 'seller':
        return {
          totalSteps: 4,
          icon: Home,
          color: '#00d4aa',
          title: 'Property Owner Onboarding'
        };
      case 'buyer':
        return {
          totalSteps: 3,
          icon: ShoppingBag,
          color: '#a78bfa',
          title: 'Buyer Onboarding'
        };
      default:
        return { totalSteps: 3, icon: Briefcase, color: '#00b8d4', title: 'Onboarding' };
    }
  };

  const config = getRoleConfig();
  const marketOptions = ['Austin', 'San Antonio', 'Dallas', 'Houston', 'Fort Worth'];
  const specialtyOptions = ['Office', 'Retail', 'Industrial', 'Multifamily', 'Land', 'Hospitality', 'Mixed Use'];

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
      const filePath = `${selectedRole}-docs/${fileName}`;

      const { error } = await supabase.storage
        .from('user-documents')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('user-documents')
        .getPublicUrl(filePath);

      handleInputChange(field, urlData.publicUrl);
      toast.success('Document uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    }
  };

  const validateStep = () => {
    // Role-specific validation
    if (selectedRole === 'broker') {
      if (currentStep === 1 && (!formData.full_name || !formData.broker_firm || !formData.broker_phone)) {
        toast.error('Please fill in all required fields');
        return false;
      }
      if (currentStep === 2 && !formData.broker_license) {
        toast.error('License number is required');
        return false;
      }
      if (currentStep === 3 && (formData.broker_markets.length === 0 || formData.broker_specialties.length === 0)) {
        toast.error('Please select at least one market and specialty');
        return false;
      }
    } else if (selectedRole === 'seller') {
      if (currentStep === 1 && (!formData.full_name || !formData.seller_entity_name || !formData.seller_phone)) {
        toast.error('Please fill in all required fields');
        return false;
      }
      if (currentStep === 2 && !formData.property_address) {
        toast.error('Property address is required');
        return false;
      }
    } else if (selectedRole === 'buyer') {
      if (currentStep === 1 && !formData.full_name) {
        toast.error('Please enter your name');
        return false;
      }
      if (currentStep === 2 && (formData.buyer_markets.length === 0 || formData.buyer_asset_types.length === 0)) {
        toast.error('Please select your investment preferences');
        return false;
      }
    }
    
    // Final step validation (common)
    const finalStep = config.totalSteps;
    if (currentStep === finalStep) {
      if (!formData.email || !formData.password) {
        toast.error('Email and password are required');
        return false;
      }
      if (formData.password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return false;
      }
    }
    
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (currentStep < config.totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: selectedRole
          }
        }
      });

      if (authError) throw authError;

      // Create user profile with role-specific data
      const profileData = {
        id: authData.user.id,
        email: formData.email,
        full_name: formData.full_name,
        roles: ['buyer'],
        primary_role: 'buyer'
      };

      // Add role-specific profile fields
      if (selectedRole === 'broker') {
        profileData.broker_firm = formData.broker_firm;
        profileData.broker_phone = formData.broker_phone;
      } else if (selectedRole === 'seller') {
        profileData.seller_entity_name = formData.seller_entity_name;
        profileData.seller_entity_type = formData.seller_entity_type;
        profileData.seller_phone = formData.seller_phone;
      } else if (selectedRole === 'buyer') {
        profileData.buyer_company = formData.buyer_company;
        profileData.buy_box_preferences = {
          markets: formData.buyer_markets,
          asset_types: formData.buyer_asset_types,
          min_price: formData.min_price,
          max_price: formData.max_price
        };
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([profileData]);

      if (profileError) throw profileError;

      // Submit verification request for broker/seller
      if (selectedRole === 'broker' || selectedRole === 'seller') {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (selectedRole === 'broker') {
          await fetch(`${API}/roles/request-verification`, {
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
        } else if (selectedRole === 'seller') {
          // Request seller role
          await fetch(`${API}/roles/request-verification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requested_role: 'seller',
              seller_entity_name: formData.seller_entity_name,
              seller_entity_type: formData.seller_entity_type,
              seller_phone: formData.seller_phone
            })
          });

          // Request ownership verification if property provided
          if (formData.property_address) {
            await fetch(`${API}/roles/request-ownership-verification`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                property_address: formData.property_address,
                proof_type: formData.proof_type,
                proof_document_url: formData.proof_document_url
              })
            });
          }
        }
      }

      toast.success('Account created successfully!');
      onComplete();
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    const Icon = config.icon;

    // BROKER FLOW
    if (selectedRole === 'broker') {
      if (currentStep === 1) {
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <Icon size={48} style={{ color: config.color, marginBottom: '12px' }} />
              <h2 style={{ color: '#FFF', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Basic Information</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Tell us about yourself and your firm</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" placeholder="Full Name *" value={formData.full_name} onChange={(e) => handleInputChange('full_name', e.target.value)} style={inputStyle} />
              <input type="text" placeholder="Brokerage Firm *" value={formData.broker_firm} onChange={(e) => handleInputChange('broker_firm', e.target.value)} style={inputStyle} />
              <input type="tel" placeholder="Phone Number *" value={formData.broker_phone} onChange={(e) => handleInputChange('broker_phone', e.target.value)} style={inputStyle} />
            </div>
          </div>
        );
      } else if (currentStep === 2) {
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <Upload size={48} style={{ color: config.color, marginBottom: '12px' }} />
              <h2 style={{ color: '#FFF', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>License & Documents</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" placeholder="License Number *" value={formData.broker_license} onChange={(e) => handleInputChange('broker_license', e.target.value)} style={inputStyle} />
              <div style={uploadBoxStyle} onClick={() => document.getElementById('w9-upload').click()}>
                <Upload size={24} style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }} />
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{formData.broker_w9_url ? 'W-9 Uploaded ✓' : 'Upload W-9 (Optional)'}</p>
              </div>
              <input id="w9-upload" type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => handleFileUpload('broker_w9_url', e.target.files[0])} />
            </div>
          </div>
        );
      } else if (currentStep === 3) {
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <MapPin size={48} style={{ color: config.color, marginBottom: '12px' }} />
              <h2 style={{ color: '#FFF', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Markets & Specialties</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Markets *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {marketOptions.map(market => (
                    <button key={market} type="button" onClick={() => toggleArrayItem('broker_markets', market)} style={getChipStyle(formData.broker_markets.includes(market), config.color)}>
                      {market} {formData.broker_markets.includes(market) && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Specialties *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {specialtyOptions.map(specialty => (
                    <button key={specialty} type="button" onClick={() => toggleArrayItem('broker_specialties', specialty)} style={getChipStyle(formData.broker_specialties.includes(specialty), config.color)}>
                      {specialty} {formData.broker_specialties.includes(specialty) && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }
    }

    // SELLER FLOW
    if (selectedRole === 'seller') {
      if (currentStep === 1) {
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <Icon size={48} style={{ color: config.color, marginBottom: '12px' }} />
              <h2 style={{ color: '#FFF', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Owner Information</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" placeholder="Full Name *" value={formData.full_name} onChange={(e) => handleInputChange('full_name', e.target.value)} style={inputStyle} />
              <input type="text" placeholder="Entity Name (LLC, Corp, etc.) *" value={formData.seller_entity_name} onChange={(e) => handleInputChange('seller_entity_name', e.target.value)} style={inputStyle} />
              <select value={formData.seller_entity_type} onChange={(e) => handleInputChange('seller_entity_type', e.target.value)} style={inputStyle}>
                <option value="">Entity Type</option>
                <option value="Individual">Individual</option>
                <option value="LLC">LLC</option>
                <option value="Corporation">Corporation</option>
                <option value="Partnership">Partnership</option>
              </select>
              <input type="tel" placeholder="Phone Number *" value={formData.seller_phone} onChange={(e) => handleInputChange('seller_phone', e.target.value)} style={inputStyle} />
            </div>
          </div>
        );
      } else if (currentStep === 2) {
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <Home size={48} style={{ color: config.color, marginBottom: '12px' }} />
              <h2 style={{ color: '#FFF', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Property to List</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" placeholder="Property Address *" value={formData.property_address} onChange={(e) => handleInputChange('property_address', e.target.value)} style={inputStyle} />
              <select value={formData.proof_type} onChange={(e) => handleInputChange('proof_type', e.target.value)} style={inputStyle}>
                <option value="deed">Deed</option>
                <option value="tax_record">Tax Record</option>
                <option value="title_report">Title Report</option>
                <option value="other">Other</option>
              </select>
              <div style={uploadBoxStyle} onClick={() => document.getElementById('proof-upload').click()}>
                <Upload size={24} style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }} />
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{formData.proof_document_url ? 'Proof Uploaded ✓' : 'Upload Ownership Proof (Optional)'}</p>
              </div>
              <input id="proof-upload" type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload('proof_document_url', e.target.files[0])} />
            </div>
          </div>
        );
      } else if (currentStep === 3) {
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <Briefcase size={48} style={{ color: config.color, marginBottom: '12px' }} />
              <h2 style={{ color: '#FFF', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Property Verification</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5' }}>
                Your ownership will be verified by our team. Once approved, you can list your property directly.
              </p>
            </div>
          </div>
        );
      }
    }

    // BUYER FLOW
    if (selectedRole === 'buyer') {
      if (currentStep === 1) {
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <Icon size={48} style={{ color: config.color, marginBottom: '12px' }} />
              <h2 style={{ color: '#FFF', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Basic Information</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" placeholder="Full Name *" value={formData.full_name} onChange={(e) => handleInputChange('full_name', e.target.value)} style={inputStyle} />
              <input type="text" placeholder="Company (Optional)" value={formData.buyer_company} onChange={(e) => handleInputChange('buyer_company', e.target.value)} style={inputStyle} />
            </div>
          </div>
        );
      } else if (currentStep === 2) {
        return (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <MapPin size={48} style={{ color: config.color, marginBottom: '12px' }} />
              <h2 style={{ color: '#FFF', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Investment Preferences</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={labelStyle}>Target Markets *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {marketOptions.map(market => (
                    <button key={market} type="button" onClick={() => toggleArrayItem('buyer_markets', market)} style={getChipStyle(formData.buyer_markets.includes(market), config.color)}>
                      {market} {formData.buyer_markets.includes(market) && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Asset Types *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {specialtyOptions.map(type => (
                    <button key={type} type="button" onClick={() => toggleArrayItem('buyer_asset_types', type)} style={getChipStyle(formData.buyer_asset_types.includes(type), config.color)}>
                      {type} {formData.buyer_asset_types.includes(type) && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input type="number" placeholder="Min Price" value={formData.min_price} onChange={(e) => handleInputChange('min_price', e.target.value)} style={inputStyle} />
                <input type="number" placeholder="Max Price" value={formData.max_price} onChange={(e) => handleInputChange('max_price', e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>
        );
      }
    }

    // FINAL STEP (Account Creation) - Common for all roles
    if (currentStep === config.totalSteps) {
      return (
        <div>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Briefcase size={48} style={{ color: config.color, marginBottom: '12px' }} />
            <h2 style={{ color: '#FFF', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Create Account</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="email" placeholder="Email *" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Password (min 8 characters) *" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} style={inputStyle} />
            {(selectedRole === 'broker' || selectedRole === 'seller') && (
              <div style={{ background: `${config.color}15`, border: `1px solid ${config.color}40`, borderRadius: '8px', padding: '12px', marginTop: '8px' }}>
                <p style={{ color: config.color, fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                  Your {selectedRole} verification request will be submitted. You'll get marketplace access immediately and full {selectedRole} access once approved (1-2 business days).
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0b0d 0%, #1a1b1e 100%)', padding: '40px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {[...Array(config.totalSteps)].map((_, i) => (
              <div key={i} style={{ flex: 1, height: '3px', background: i < currentStep ? config.color : 'rgba(255,255,255,0.1)', borderRadius: '2px', transition: 'all 0.3s' }} />
            ))}
          </div>
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
            Step {currentStep} of {config.totalSteps}
          </div>
        </div>

        {/* Content */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '40px', marginBottom: '20px' }}>
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={currentStep === 1 ? onBack : () => setCurrentStep(currentStep - 1)} style={{ ...buttonStyle, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' }}>
            <ArrowLeft size={18} /> {currentStep === 1 ? 'Change Role' : 'Back'}
          </button>
          <button onClick={handleNext} disabled={loading} style={{ ...buttonStyle, background: config.color, color: '#000', flex: 1 }}>
            {loading ? 'Creating...' : currentStep === config.totalSteps ? 'Create Account' : 'Continue'} <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles
const inputStyle = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#FFF', fontSize: '14px' };
const labelStyle = { color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '500', marginBottom: '10px', display: 'block' };
const buttonStyle = { padding: '12px 20px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' };
const uploadBoxStyle = { border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '10px', padding: '24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' };

const getChipStyle = (isSelected, color) => ({
  padding: '10px 12px',
  background: isSelected ? `${color}20` : 'rgba(255,255,255,0.05)',
  border: isSelected ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px',
  color: isSelected ? color : 'rgba(255,255,255,0.7)',
  fontSize: '13px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
});

export default UnifiedOnboardingWizard;
