import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Home, ShoppingBag, Star, Mail, Phone, MapPin, Award, Edit, ArrowLeft } from 'lucide-react';
import { AuthContext } from '../App';
import { API } from '../App';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

const UnifiedProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);
  const [profileUser, setProfileUser] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        // Fetch profile user data
        const profileResponse = await fetch(`${API}/roles/my-roles`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (profileResponse.ok) {
          const data = await profileResponse.json();
          setProfileUser(data);
          setActiveTab(data.primary_role);
          setIsOwner(currentUser?.id === userId || currentUser?.id === data.user_id);

          // Fetch permissions
          const permResponse = await fetch(`${API}/roles/my-permissions`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          if (permResponse.ok) {
            const permData = await permResponse.json();
            setPermissions(permData);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, currentUser]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', color: '#fff' }}>
        Loading profile...
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', color: '#fff' }}>
        Profile not found
      </div>
    );
  }

  const tabs = [
    { id: 'broker', label: 'Broker Profile', icon: Building2, show: profileUser.roles?.includes('broker') },
    { id: 'seller', label: 'Properties', icon: Home, show: profileUser.roles?.includes('seller') && (isOwner || currentUser) },
    { id: 'buyer', label: 'Preferences', icon: ShoppingBag, show: isOwner && profileUser.roles?.includes('buyer') }
  ].filter(tab => tab.show);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px'
          }}
        >
          <ArrowLeft size={18} /> Back
        </button>

        {/* Profile Header */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
            {/* Avatar */}
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00b8d4 0%, #00d4aa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              fontWeight: '700',
              color: '#000'
            }}>
              {(profileUser.broker_data?.firm?.[0] || profileUser.buyer_data?.company?.[0] || 'U').toUpperCase()}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>
                {profileUser.broker_data?.firm || profileUser.seller_data?.entity_name || profileUser.buyer_data?.company || 'User Profile'}
              </h1>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {profileUser.roles?.map(role => (
                  <span key={role} style={{
                    padding: '4px 12px',
                    background: 'rgba(0,184,212,0.15)',
                    border: '1px solid rgba(0,184,212,0.3)',
                    borderRadius: '6px',
                    color: '#00b8d4',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {role}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '16px', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                {profileUser.broker_data?.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} /> {profileUser.broker_data.phone}
                  </div>
                )}
                {profileUser.broker_data?.markets && profileUser.broker_data.markets.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} /> {profileUser.broker_data.markets.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Edit Button (if owner) */}
            {isOwner && (
              <button
                onClick={() => navigate('/settings')}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(0,184,212,0.15)',
                  border: '1px solid rgba(0,184,212,0.3)',
                  borderRadius: '8px',
                  color: '#00b8d4',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Edit size={16} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 16px',
                    background: isActive ? 'rgba(0,184,212,0.15)' : 'transparent',
                    border: isActive ? '1px solid rgba(0,184,212,0.3)' : '1px solid transparent',
                    borderRadius: '8px',
                    color: isActive ? '#00b8d4' : 'rgba(255,255,255,0.6)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div>
          {activeTab === 'broker' && <BrokerProfileContent data={profileUser.broker_data} permissions={permissions} />}
          {activeTab === 'seller' && <SellerProfileContent data={profileUser.seller_data} />}
          {activeTab === 'buyer' && <BuyerProfileContent data={profileUser.buyer_data} />}
        </div>
      </div>
    </div>
  );
};

// Broker Profile Content
const BrokerProfileContent = ({ data, permissions }) => {
  if (!data) return <EmptyState message="No broker profile data available" />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Reputation Stats */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase' }}>
          Reputation & Performance
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <StatItem label="Quality Score" value={permissions?.can_publish_as_broker ? '85' : 'Pending'} icon={Star} />
          <StatItem label="Active Listings" value="0" icon={Building2} />
          <StatItem label="Closed Deals" value="0" icon={Award} />
        </div>
      </div>

      {/* Markets & Specialties */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase' }}>
          Markets & Specialties
        </h3>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px' }}>Markets</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {data.markets?.map(market => (
              <span key={market} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                {market}
              </span>
            )) || <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No markets specified</span>}
          </div>
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px' }}>Specialties</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {data.specialties?.map(specialty => (
              <span key={specialty} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                {specialty}
              </span>
            )) || <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No specialties specified</span>}
          </div>
        </div>
      </div>

      {/* Bio */}
      {data.bio && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase' }}>About</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.6' }}>{data.bio}</p>
        </div>
      )}
    </div>
  );
};

// Seller Profile Content
const SellerProfileContent = ({ data }) => {
  if (!data) return <EmptyState message="No seller profile data available" />;

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
      <h3 style={{ color: '#00d4aa', fontSize: '14px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase' }}>
        Property Listings
      </h3>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
        No properties listed yet.
      </p>
    </div>
  );
};

// Buyer Profile Content
const BuyerProfileContent = ({ data }) => {
  if (!data) return <EmptyState message="No buyer preferences available" />;

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
      <h3 style={{ color: '#a78bfa', fontSize: '14px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase' }}>
        Investment Preferences
      </h3>
      <div style={{ display: 'grid', gap: '16px' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px' }}>Target Markets</div>
          <div style={{ color: '#fff', fontSize: '14px' }}>
            {data.buy_box_preferences?.markets?.join(', ') || 'Not specified'}
          </div>
        </div>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px' }}>Asset Types</div>
          <div style={{ color: '#fff', fontSize: '14px' }}>
            {data.buy_box_preferences?.asset_types?.join(', ') || 'Not specified'}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px' }}>Min Price</div>
            <div style={{ color: '#fff', fontSize: '14px' }}>
              {data.buy_box_preferences?.min_price ? `$${parseFloat(data.buy_box_preferences.min_price).toLocaleString()}` : 'Not set'}
            </div>
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px' }}>Max Price</div>
            <div style={{ color: '#fff', fontSize: '14px' }}>
              {data.buy_box_preferences?.max_price ? `$${parseFloat(data.buy_box_preferences.max_price).toLocaleString()}` : 'Not set'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Components
const StatItem = ({ label, value, icon: Icon }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '6px' }}>
      <Icon size={14} />
      {label}
    </div>
    <div style={{ color: '#00b8d4', fontSize: '20px', fontWeight: '600' }}>{value}</div>
  </div>
);

const EmptyState = ({ message }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{message}</p>
  </div>
);

export default UnifiedProfile;
