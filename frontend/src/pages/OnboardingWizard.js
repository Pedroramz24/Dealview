import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Briefcase, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { API } from '../App';
import { toast } from 'sonner';

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [buyBox, setBuyBox] = useState({
    markets: [],
    asset_types: [],
    min_price: '',
    max_price: '',
    strategies: []
  });
  const [brokerInfo, setBrokerInfo] = useState({
    license_number: '',
    brokerage_name: '',
    specialization_markets: [],
    specialization_asset_types: []
  });
  const [submitting, setSubmitting] = useState(false);

  const markets = ['San Antonio', 'Austin', 'Houston', 'DFW', 'RGV', 'El Paso', 'Corpus Christi'];
  const assetTypes = ['Office', 'Retail', 'Industrial', 'Multifamily', 'Land', 'Mixed Use', 'Special Purpose'];
  const strategies = ['Core', 'Core+', 'Value-Add', 'Development', 'Reposition'];

  const toggleArrayItem = (array, item) => {
    return array.includes(item) ? array.filter(i => i !== item) : [...array, item];
  };

  const handleComplete = async () => {
    try {
      setSubmitting(true);
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      
      const payload = {
        user_role: role,
        buy_box_preferences: role === 'investor' ? buyBox : null,
        broker_info: role === 'broker' ? brokerInfo : null
      };

      const response = await fetch(`${API}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to complete onboarding');
      
      toast.success('Welcome to DealLinked!');
      navigate('/marketplace');
      
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Failed to complete onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px'
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '48px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ color: '#00b8d4', fontSize: '36px', fontWeight: '700', marginBottom: '12px' }}>
            Welcome to DealLinked
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>
            Let's personalize your experience
          </p>
        </div>

        {/* Progress Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '48px' }}>
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: step >= s ? '#00b8d4' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div>
            <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '600', marginBottom: '32px', textAlign: 'center' }}>
              What brings you to DealLinked?
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Investor Card */}
              <button
                onClick={() => { setRole('investor'); setStep(2); }}
                style={{
                  padding: '32px',
                  background: role === 'investor' ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255,255,255,0.05)',
                  border: role === 'investor' ? '2px solid rgba(0, 184, 212, 0.5)' : '2px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'center'
                }}
              >
                <Store size={48} style={{ color: '#00b8d4', margin: '0 auto 16px' }} />
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                  I'm an Investor
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                  Browse deals and find opportunities
                </div>
              </button>

              {/* Broker Card */}
              <button
                onClick={() => { setRole('broker'); setStep(2); }}
                style={{
                  padding: '32px',
                  background: role === 'broker' ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255,255,255,0.05)',
                  border: role === 'broker' ? '2px solid rgba(0, 184, 212, 0.5)' : '2px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'center'
                }}
              >
                <Briefcase size={48} style={{ color: '#00b8d4', margin: '0 auto 16px' }} />
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                  I'm a Broker
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                  List properties and manage deals
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2a: Investor Buy Box */}
        {step === 2 && role === 'investor' && (
          <div>
            <button
              onClick={() => setStep(1)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px',
                fontSize: '14px'
              }}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
              Tell us about your investment criteria
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '32px' }}>
              We'll personalize your marketplace feed based on these preferences
            </p>

            {/* Markets */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ color: '#fff', fontSize: '16px', fontWeight: '600', display: 'block', marginBottom: '12px' }}>
                Primary Markets
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {markets.map(market => (
                  <button
                    key={market}
                    type="button"
                    onClick={() => setBuyBox({...buyBox, markets: toggleArrayItem(buyBox.markets, market)})}
                    style={{
                      padding: '10px 20px',
                      background: buyBox.markets.includes(market) ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255,255,255,0.05)',
                      border: buyBox.markets.includes(market) ? '1px solid rgba(0, 184, 212, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: buyBox.markets.includes(market) ? '#00b8d4' : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {market}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Types */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ color: '#fff', fontSize: '16px', fontWeight: '600', display: 'block', marginBottom: '12px' }}>
                Asset Types
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {assetTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBuyBox({...buyBox, asset_types: toggleArrayItem(buyBox.asset_types, type)})}
                    style={{
                      padding: '10px 20px',
                      background: buyBox.asset_types.includes(type) ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255,255,255,0.05)',
                      border: buyBox.asset_types.includes(type) ? '1px solid rgba(0, 184, 212, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: buyBox.asset_types.includes(type) ? '#00b8d4' : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ color: '#fff', fontSize: '16px', fontWeight: '600', display: 'block', marginBottom: '12px' }}>
                Price Range
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                    Min Price
                  </label>
                  <input
                    type="number"
                    value={buyBox.min_price}
                    onChange={(e) => setBuyBox({...buyBox, min_price: e.target.value})}
                    placeholder="500000"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                    Max Price
                  </label>
                  <input
                    type="number"
                    value={buyBox.max_price}
                    onChange={(e) => setBuyBox({...buyBox, max_price: e.target.value})}
                    placeholder="5000000"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Strategies */}
            <div style={{ marginBottom: '40px' }}>
              <label style={{ color: '#fff', fontSize: '16px', fontWeight: '600', display: 'block', marginBottom: '12px' }}>
                Investment Strategies
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {strategies.map(strategy => (
                  <button
                    key={strategy}
                    type="button"
                    onClick={() => setBuyBox({...buyBox, strategies: toggleArrayItem(buyBox.strategies, strategy)})}
                    style={{
                      padding: '10px 20px',
                      background: buyBox.strategies.includes(strategy) ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255,255,255,0.05)',
                      border: buyBox.strategies.includes(strategy) ? '1px solid rgba(0, 184, 212, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: buyBox.strategies.includes(strategy) ? '#00b8d4' : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {strategy}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleComplete}
              disabled={submitting || buyBox.markets.length === 0}
              style={{
                width: '100%',
                padding: '16px',
                background: buyBox.markets.length > 0 ? '#00b8d4' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '12px',
                color: buyBox.markets.length > 0 ? '#000' : 'rgba(255,255,255,0.3)',
                fontWeight: '600',
                fontSize: '16px',
                cursor: buyBox.markets.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={20} />
              {submitting ? 'Saving...' : 'Complete Setup'}
            </button>
          </div>
        )}

        {/* Step 2b: Broker Info */}
        {step === 2 && role === 'broker' && (
          <div>
            <button
              onClick={() => setStep(1)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px',
                fontSize: '14px'
              }}
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
              Broker Information
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '32px' }}>
              Help us verify your credentials and set up your profile
            </p>

            {/* License Number */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ color: '#fff', fontSize: '15px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                License Number *
              </label>
              <input
                type="text"
                value={brokerInfo.license_number}
                onChange={(e) => setBrokerInfo({...brokerInfo, license_number: e.target.value})}
                placeholder="TX-123456"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Brokerage Name */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ color: '#fff', fontSize: '15px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                Brokerage Name *
              </label>
              <input
                type="text"
                value={brokerInfo.brokerage_name}
                onChange={(e) => setBrokerInfo({...brokerInfo, brokerage_name: e.target.value})}
                placeholder="ABC Commercial Realty"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Specialization Markets */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ color: '#fff', fontSize: '15px', fontWeight: '500', display: 'block', marginBottom: '12px' }}>
                Markets You Cover
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {markets.map(market => (
                  <button
                    key={market}
                    type="button"
                    onClick={() => setBrokerInfo({...brokerInfo, specialization_markets: toggleArrayItem(brokerInfo.specialization_markets, market)})}
                    style={{
                      padding: '10px 20px',
                      background: brokerInfo.specialization_markets.includes(market) ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255,255,255,0.05)',
                      border: brokerInfo.specialization_markets.includes(market) ? '1px solid rgba(0, 184, 212, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: brokerInfo.specialization_markets.includes(market) ? '#00b8d4' : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {market}
                  </button>
                ))}
              </div>
            </div>

            {/* Specialization Asset Types */}
            <div style={{ marginBottom: '40px' }}>
              <label style={{ color: '#fff', fontSize: '15px', fontWeight: '500', display: 'block', marginBottom: '12px' }}>
                Asset Types You Specialize In
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {assetTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBrokerInfo({...brokerInfo, specialization_asset_types: toggleArrayItem(brokerInfo.specialization_asset_types, type)})}
                    style={{
                      padding: '10px 20px',
                      background: brokerInfo.specialization_asset_types.includes(type) ? 'rgba(0, 184, 212, 0.15)' : 'rgba(255,255,255,0.05)',
                      border: brokerInfo.specialization_asset_types.includes(type) ? '1px solid rgba(0, 184, 212, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: brokerInfo.specialization_asset_types.includes(type) ? '#00b8d4' : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleComplete}
              disabled={submitting || !brokerInfo.license_number || !brokerInfo.brokerage_name}
              style={{
                width: '100%',
                padding: '16px',
                background: (brokerInfo.license_number && brokerInfo.brokerage_name) ? '#00b8d4' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '12px',
                color: (brokerInfo.license_number && brokerInfo.brokerage_name) ? '#000' : 'rgba(255,255,255,0.3)',
                fontWeight: '600',
                fontSize: '16px',
                cursor: (brokerInfo.license_number && brokerInfo.brokerage_name) ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={20} />
              {submitting ? 'Saving...' : 'Complete Setup'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
