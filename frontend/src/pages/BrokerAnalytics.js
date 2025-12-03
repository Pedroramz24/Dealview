import React, { useState, useEffect } from 'react';
import { TrendingUp, Eye, MessageCircle, Heart, ExternalLink, CheckCircle, Clock } from 'lucide-react';
import { API } from '../App';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const BrokerAnalytics = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [publishedDeals, setPublishedDeals] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchPublishedDeals();
    fetchInquiries();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      const supabase = (await import('../supabaseClient')).supabase;
      
      // Get user's published deals
      const { data: deals } = await supabase
        .from('deals')
        .select('marketplace_views_count, marketplace_inquiries_count, marketplace_saves_count')
        .eq('owner_id', session.user.id)
        .eq('is_published', true);
      
      if (deals) {
        const totals = deals.reduce((acc, deal) => ({
          views: acc.views + (deal.marketplace_views_count || 0),
          inquiries: acc.inquiries + (deal.marketplace_inquiries_count || 0),
          saves: acc.saves + (deal.marketplace_saves_count || 0)
        }), { views: 0, inquiries: 0, saves: 0 });
        
        setAnalytics(totals);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchPublishedDeals = async () => {
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      const supabase = (await import('../supabaseClient')).supabase;
      
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('owner_id', session.user.id)
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      
      setPublishedDeals(deals || []);
    } catch (error) {
      console.error('Error fetching published deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInquiries = async () => {
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      const supabase = (await import('../supabaseClient')).supabase;
      
      const { data } = await supabase
        .from('marketplace_inquiries')
        .select('*, deal:deal_id(title, address), inquirer:inquirer_id(user_profiles(full_name))')
        .eq('broker_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setInquiries(data || []);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    }
  };

  return (
    <div style={{ background: '#000', minHeight: '100vh', padding: '40px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ color: '#fff', fontSize: '32px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingUp size={32} color="#00b8d4" />
            Marketplace Analytics
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px' }}>
            Track performance of your published listings
          </p>
        </div>

        {/* Stats Overview */}
        {analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Eye size={24} color="#00b8d4" />
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Views
                </div>
              </div>
              <div style={{ color: '#fff', fontSize: '36px', fontWeight: '700' }}>
                {analytics.views.toLocaleString()}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <MessageCircle size={24} color="#00b8d4" />
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Inquiries
                </div>
              </div>
              <div style={{ color: '#fff', fontSize: '36px', fontWeight: '700' }}>
                {analytics.inquiries.toLocaleString()}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Heart size={24} color="#00b8d4" />
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Saves
                </div>
              </div>
              <div style={{ color: '#fff', fontSize: '36px', fontWeight: '700' }}>
                {analytics.saves.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Published Deals Table */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden', marginBottom: '32px' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '600' }}>
              Your Published Listings
            </h2>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Loading...
            </div>
          ) : publishedDeals.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No published deals yet
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Property</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                    <th style={{ padding: '16px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Views</th>
                    <th style={{ padding: '16px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inquiries</th>
                    <th style={{ padding: '16px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saves</th>
                    <th style={{ padding: '16px 24px', textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {publishedDeals.map((deal) => (
                    <tr key={deal.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ color: '#fff', fontWeight: '600', marginBottom: '4px' }}>
                          {deal.title || deal.address}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                          {deal.public_market} • {deal.public_asset_type}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <span style={{
                          padding: '6px 12px',
                          background: deal.approval_status === 'approved' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                          border: deal.approval_status === 'approved' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)',
                          borderRadius: '6px',
                          color: deal.approval_status === 'approved' ? '#22c55e' : '#fbbf24',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {deal.approval_status === 'approved' ? 'Published' : deal.approval_status}
                        </span>
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'center', color: '#fff', fontSize: '18px', fontWeight: '600' }}>
                        {deal.marketplace_views_count || 0}
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'center', color: '#fff', fontSize: '18px', fontWeight: '600' }}>
                        {deal.marketplace_inquiries_count || 0}
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'center', color: '#fff', fontSize: '18px', fontWeight: '600' }}>
                        {deal.marketplace_saves_count || 0}
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                        <button
                          onClick={() => navigate(`/workspace/deals/${deal.id}`)}
                          style={{
                            padding: '8px 16px',
                            background: 'rgba(0, 184, 212, 0.15)',
                            border: '1px solid rgba(0, 184, 212, 0.3)',
                            borderRadius: '8px',
                            color: '#00b8d4',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600'
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Inquiries */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '600' }}>
              Recent Inquiries
            </h2>
          </div>

          {inquiries.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No inquiries yet
            </div>
          ) : (
            <div>
              {inquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: '600', marginBottom: '6px' }}>
                        {inquiry.deal?.title || inquiry.deal?.address || 'Unknown Property'}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '8px' }}>
                        From: {inquiry.inquirer?.user_profiles?.full_name || 'Anonymous'}
                      </div>
                      <div style={{
                        padding: '12px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '8px',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '14px',
                        lineHeight: '1.5'
                      }}>
                        {inquiry.message}
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(inquiry.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {inquiry.status === 'new' ? (
                        <span style={{
                          padding: '6px 12px',
                          background: 'rgba(251, 191, 36, 0.15)',
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                          borderRadius: '6px',
                          color: '#fbbf24',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Clock size={14} />
                          New
                        </span>
                      ) : (
                        <span style={{
                          padding: '6px 12px',
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          borderRadius: '6px',
                          color: '#22c55e',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <CheckCircle size={14} />
                          {inquiry.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrokerAnalytics;
