import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Calendar, DollarSign } from 'lucide-react';
import { API } from '../App';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AdminApprovalQueue = () => {
  const navigate = useNavigate();
  const [pendingDeals, setPendingDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPendingDeals();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      const response = await fetch(`${API}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPendingDeals = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      
      const response = await fetch(`${API}/admin/pending-deals`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch pending deals');
      
      const data = await response.json();
      setPendingDeals(data.pending_deals || []);
    } catch (error) {
      console.error('Error fetching pending deals:', error);
      toast.error('Failed to load pending deals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (dealId) => {
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      
      const response = await fetch(`${API}/admin/deals/${dealId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'approve' })
      });

      if (!response.ok) throw new Error('Failed to approve deal');
      
      toast.success('Deal approved and published!');
      fetchPendingDeals();
      fetchStats();
    } catch (error) {
      console.error('Error approving deal:', error);
      toast.error('Failed to approve deal');
    }
  };

  const handleReject = async (dealId) => {
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      
      const response = await fetch(`${API}/admin/deals/${dealId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'reject',
          reason: rejectReason 
        })
      });

      if (!response.ok) throw new Error('Failed to reject deal');
      
      toast.success('Deal rejected');
      setShowRejectModal(null);
      setRejectReason('');
      fetchPendingDeals();
      fetchStats();
    } catch (error) {
      console.error('Error rejecting deal:', error);
      toast.error('Failed to reject deal');
    }
  };

  return (
    <div style={{ background: 'transparent', minHeight: '100vh', padding: '40px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ color: '#fff', fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            Deal Approval Queue
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px' }}>
            Review and approve deals for marketplace publication
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '8px' }}>Pending Approval</div>
              <div style={{ color: '#00b8d4', fontSize: '28px', fontWeight: '700' }}>{stats.pending_approvals}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '8px' }}>Approved Deals</div>
              <div style={{ color: '#fff', fontSize: '28px', fontWeight: '700' }}>{stats.approved_deals}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '8px' }}>Total Inquiries</div>
              <div style={{ color: '#fff', fontSize: '28px', fontWeight: '700' }}>{stats.total_inquiries}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '8px' }}>Total Messages</div>
              <div style={{ color: '#fff', fontSize: '28px', fontWeight: '700' }}>{stats.total_messages}</div>
            </div>
          </div>
        )}

        {/* Pending Deals List */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Loading pending deals...
            </div>
          ) : pendingDeals.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No deals pending approval
            </div>
          ) : (
            <div>
              {pendingDeals.map((deal) => (
                <div
                  key={deal.id}
                  style={{
                    padding: '24px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '24px' }}>
                    {/* Deal Info */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                        {deal.title || deal.address}
                      </h3>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                        <span style={{
                          padding: '4px 12px',
                          background: 'rgba(0, 184, 212, 0.15)',
                          border: '1px solid rgba(0, 184, 212, 0.3)',
                          borderRadius: '6px',
                          color: '#00b8d4',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {deal.public_asset_type}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                          {deal.public_market}
                        </span>
                        <span style={{ color: '#00b8d4', fontSize: '14px', fontWeight: '600' }}>
                          ${deal.public_price?.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                        Submitted: {new Date(deal.published_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => navigate(`/workspace/deals/${deal.id}`)}
                        style={{
                          padding: '10px 16px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Eye size={16} />
                        Review
                      </button>

                      <button
                        onClick={() => handleApprove(deal.id)}
                        style={{
                          padding: '10px 16px',
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          borderRadius: '8px',
                          color: '#22c55e',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle size={16} />
                        Approve
                      </button>

                      <button
                        onClick={() => setShowRejectModal(deal.id)}
                        style={{
                          padding: '10px 16px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '8px',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              Reject Deal
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '20px' }}>
              Please provide a reason for rejection (optional):
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Missing required information, pricing concerns, etc."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                marginBottom: '20px',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                style={{
                  padding: '10px 20px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovalQueue;
