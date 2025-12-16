import React, { useState, useEffect, useContext } from 'react';
import { Building2, Home, ShoppingBag } from 'lucide-react';
import { AuthContext } from '../App';
import { API } from '../App';
import { supabase } from '../supabaseClient';

const UnifiedDashboard = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(null);
  const [userRoles, setUserRoles] = useState({ roles: ['buyer'], primary_role: 'buyer' });
  const [loading, setLoading] = useState(true);

  // Fetch user roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`${API}/roles/my-roles`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setUserRoles(data);
          setActiveTab(data.primary_role);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>;

  const tabs = [
    { id: 'broker', label: 'Broker Tools', icon: Building2, show: userRoles.roles.includes('broker') },
    { id: 'seller', label: 'My Properties', icon: Home, show: userRoles.roles.includes('seller') },
    { id: 'buyer', label: 'Buying Activity', icon: ShoppingBag, show: true } // Everyone is a buyer
  ].filter(tab => tab.show);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '24px' }}>
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '32px' }}>
        <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>Dashboard</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Welcome back, {user?.user_metadata?.full_name || 'there'}</p>
      </div>

      {/* Tabs - Only show if multiple roles */}
      {tabs.length > 1 && (
        <div style={{ maxWidth: '1400px', margin: '0 auto', marginBottom: '24px', display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
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

      {/* Content - Conditional based on activeTab */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {activeTab === 'broker' && <BrokerContent />}
        {activeTab === 'seller' && <SellerContent />}
        {activeTab === 'buyer' && <BuyerContent />}
      </div>
    </div>
  );
};

// Broker Dashboard Content
const BrokerContent = () => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
      <StatCard title="Active Listings" value="0" color="#00b8d4" />
      <StatCard title="Pending Approvals" value="0" color="#f59e0b" />
      <StatCard title="Reputation Score" value="50" color="#10b981" />
      <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <ActionButton href="/deals" label="Publish New Deal" />
          <ActionButton href="/marketplace" label="Browse Marketplace" />
          <ActionButton href="/contacts" label="Manage Contacts" />
        </div>
      </div>
    </div>
  );
};

// Seller Dashboard Content
const SellerContent = () => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
      <StatCard title="My Listings" value="0" color="#00d4aa" />
      <StatCard title="Total Views" value="0" color="#a78bfa" />
      <StatCard title="Inquiries" value="0" color="#f59e0b" />
      <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ color: '#00d4aa', fontSize: '14px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase' }}>Your Properties</h3>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>No properties listed yet. List your first property to get started.</p>
        <ActionButton href="/deals" label="List Property" style={{ marginTop: '16px' }} />
      </div>
    </div>
  );
};

// Buyer Dashboard Content
const BuyerContent = () => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
      <StatCard title="Saved Deals" value="0" color="#a78bfa" />
      <StatCard title="Active Conversations" value="0" color="#00b8d4" />
      <StatCard title="Marketplace Deals" value="0" color="#00d4aa" />
      <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
        <h3 style={{ color: '#a78bfa', fontSize: '14px', fontWeight: '600', marginBottom: '16px', textTransform: 'uppercase' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <ActionButton href="/marketplace" label="Browse Marketplace" />
          <ActionButton href="/dashboard" label="Update Buy Box" />
        </div>
      </div>
    </div>
  );
};

// Reusable Components
const StatCard = ({ title, value, color }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
    <div style={{ color: color, fontSize: '32px', fontWeight: '700' }}>{value}</div>
  </div>
);

const ActionButton = ({ href, label, style }) => (
  <a href={href} style={{ padding: '10px 20px', background: 'rgba(0,184,212,0.15)', border: '1px solid rgba(0,184,212,0.3)', borderRadius: '8px', color: '#00b8d4', fontSize: '14px', fontWeight: '500', textDecoration: 'none', display: 'inline-block', ...style }}>
    {label}
  </a>
);

export default UnifiedDashboard;
