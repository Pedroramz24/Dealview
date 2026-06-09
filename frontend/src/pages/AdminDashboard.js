import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, User, Building2, Home, FileText, AlertCircle } from 'lucide-react';
import { API } from '../App';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('role_verifications');
  const [roleVerifications, setRoleVerifications] = useState([]);
  const [ownershipVerifications, setOwnershipVerifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      if (activeTab === 'role_verifications') {
        const response = await fetch(`${API}/roles/admin/pending-role-verifications`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setRoleVerifications(data.pending_requests || []);
        }
      }
      // Add other tab data fetching here as needed
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId, type) => {
    setProcessingId(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const endpoint = type === 'role' 
        ? `${API}/roles/admin/approve-role-verification`
        : `${API}/roles/admin/approve-ownership-verification`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: requestId })
      });

      if (response.ok) {
        toast.success(`${type === 'role' ? 'Role' : 'Ownership'} verification approved`);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to approve');
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve verification');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId, type) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setProcessingId(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const endpoint = type === 'role'
        ? `${API}/roles/admin/reject-role-verification`
        : `${API}/roles/admin/reject-ownership-verification`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: requestId, rejection_reason: reason })
      });

      if (response.ok) {
        toast.success('Verification rejected');
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to reject');
      }
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Failed to reject verification');
    } finally {
      setProcessingId(null);
    }
  };

  const tabs = [
    { id: 'role_verifications', label: 'Role Verifications', icon: User, count: roleVerifications.length },
    { id: 'ownership_verifications', label: 'Ownership Verifications', icon: Home, count: ownershipVerifications.length },
    { id: 'analytics', label: 'Analytics', icon: FileText, count: 0 }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: '600', marginBottom: '8px' }}>Admin Dashboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Manage verification requests and approvals</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '24px' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 16px',
                  background: isActive ? 'rgba(212,18,18,0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(212,18,18,0.3)' : '1px solid transparent',
                  borderRadius: '8px',
                  color: isActive ? '#ff0000' : 'rgba(255,255,255,0.6)',
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
                {tab.count > 0 && (
                  <span style={{
                    padding: '2px 8px',
                    background: '#f59e0b',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#000'
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.6)' }}>
              Loading...
            </div>
          ) : (
            <>
              {activeTab === 'role_verifications' && (
                <RoleVerificationsTab
                  requests={roleVerifications}
                  onApprove={(id) => handleApprove(id, 'role')}
                  onReject={(id) => handleReject(id, 'role')}
                  processingId={processingId}
                />
              )}
              {activeTab === 'ownership_verifications' && (
                <OwnershipVerificationsTab
                  requests={ownershipVerifications}
                  onApprove={(id) => handleApprove(id, 'ownership')}
                  onReject={(id) => handleReject(id, 'ownership')}
                  processingId={processingId}
                />
              )}
              {activeTab === 'analytics' && <AnalyticsTab />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Role Verifications Tab
const RoleVerificationsTab = ({ requests, onApprove, onReject, processingId }) => {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        message="No pending role verifications"
        description="All verification requests have been processed"
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {requests.map(request => (
        <div
          key={request.id}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '24px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600' }}>
                  {request.requested_role === 'broker' ? 'Broker' : 'Seller'} Verification Request
                </h3>
                <span style={{
                  padding: '4px 12px',
                  background: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#f59e0b',
                  textTransform: 'uppercase'
                }}>
                  Pending
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                Submitted {new Date(request.submitted_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Request Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {request.requested_role === 'broker' ? (
              <>
                <DetailItem label="Firm" value={request.broker_firm} />
                <DetailItem label="License #" value={request.broker_license} />
                <DetailItem label="Phone" value={request.broker_phone} />
                <DetailItem label="Markets" value={request.broker_markets?.join(', ') || 'N/A'} />
                <DetailItem label="Specialties" value={request.broker_specialties?.join(', ') || 'N/A'} />
              </>
            ) : (
              <>
                <DetailItem label="Entity" value={request.seller_entity_name} />
                <DetailItem label="Type" value={request.seller_entity_type} />
                <DetailItem label="Phone" value={request.seller_phone} />
              </>
            )}
          </div>

          {/* Documents */}
          {(request.broker_w9_url || request.broker_license_url) && (
            <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px' }}>Documents</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {request.broker_w9_url && (
                  <a href={request.broker_w9_url} target="_blank" rel="noopener noreferrer" style={{
                    padding: '6px 12px',
                    background: 'rgba(212,18,18,0.15)',
                    border: '1px solid rgba(212,18,18,0.3)',
                    borderRadius: '6px',
                    color: '#ff0000',
                    fontSize: '12px',
                    textDecoration: 'none'
                  }}>
                    View W-9
                  </a>
                )}
                {request.broker_license_url && (
                  <a href={request.broker_license_url} target="_blank" rel="noopener noreferrer" style={{
                    padding: '6px 12px',
                    background: 'rgba(212,18,18,0.15)',
                    border: '1px solid rgba(212,18,18,0.3)',
                    borderRadius: '6px',
                    color: '#ff0000',
                    fontSize: '12px',
                    textDecoration: 'none'
                  }}>
                    View License
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => onApprove(request.id)}
              disabled={processingId === request.id}
              style={{
                flex: 1,
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: processingId === request.id ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: processingId === request.id ? 0.5 : 1
              }}
            >
              <CheckCircle size={16} />
              {processingId === request.id ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={() => onReject(request.id)}
              disabled={processingId === request.id}
              style={{
                flex: 1,
                padding: '10px 20px',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: '600',
                cursor: processingId === request.id ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: processingId === request.id ? 0.5 : 1
              }}
            >
              <XCircle size={16} />
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Ownership Verifications Tab
const OwnershipVerificationsTab = ({ requests, onApprove, onReject, processingId }) => {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={Home}
        message="No pending ownership verifications"
        description="All ownership verification requests have been processed"
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {requests.map(request => (
        <div
          key={request.id}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '24px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                Property Ownership Verification
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                Submitted {new Date(request.submitted_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <DetailItem label="Property Address" value={request.property_address} />
            <DetailItem label="Proof Type" value={request.proof_type} />
          </div>

          {request.proof_document_url && (
            <div style={{ marginBottom: '20px' }}>
              <a href={request.proof_document_url} target="_blank" rel="noopener noreferrer" style={{
                padding: '8px 16px',
                background: 'rgba(212,18,18,0.15)',
                border: '1px solid rgba(212,18,18,0.3)',
                borderRadius: '6px',
                color: '#ff0000',
                fontSize: '13px',
                textDecoration: 'none',
                display: 'inline-block'
              }}>
                View Proof Document
              </a>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => onApprove(request.id)}
              disabled={processingId === request.id}
              style={{
                flex: 1,
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: processingId === request.id ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle size={16} />
              {processingId === request.id ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={() => onReject(request.id)}
              disabled={processingId === request.id}
              style={{
                flex: 1,
                padding: '10px 20px',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: '600',
                cursor: processingId === request.id ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <XCircle size={16} />
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Analytics Tab
const AnalyticsTab = () => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
      <StatCard title="Total Users" value="0" color="#ff0000" />
      <StatCard title="Verified Brokers" value="0" color="#10b981" />
      <StatCard title="Active Listings" value="0" color="#a78bfa" />
      <StatCard title="Pending Approvals" value="0" color="#f59e0b" />
    </div>
  );
};

// Reusable Components
const DetailItem = ({ label, value }) => (
  <div style={{ marginBottom: '12px' }}>
    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ color: '#fff', fontSize: '14px' }}>{value || 'N/A'}</div>
  </div>
);

const StatCard = ({ title, value, color }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px' }}>
    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
    <div style={{ color: color, fontSize: '32px', fontWeight: '700' }}>{value}</div>
  </div>
);

const EmptyState = ({ icon: Icon, message, description }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '64px 24px',
    textAlign: 'center'
  }}>
    <Icon size={48} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }} />
    <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{message}</h3>
    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{description}</p>
  </div>
);

export default AdminDashboard;
