import React, { useState, useEffect } from 'react';
import { TrendingUp, Eye, MessageCircle, Heart, ExternalLink, Clock, User, Send } from 'lucide-react';
import { API } from '../App';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import MessagingPanel from '../components/MessagingPanel';

const BrokerAnalytics = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [publishedDeals, setPublishedDeals] = useState([]);
  const [messagesByProperty, setMessagesByProperty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMessaging, setShowMessaging] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    fetchPublishedDeals();
    fetchMessagesByProperty();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      const supabase = (await import('../supabaseClient')).supabase;
      
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

  const fetchMessagesByProperty = async () => {
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      const supabase = (await import('../supabaseClient')).supabase;
      
      // Get all messages where user is recipient (broker)
      const { data: messages } = await supabase
        .from('marketplace_messages')
        .select('*, deal:deal_id(id, title, address, image_url), sender:sender_id(user_profiles(full_name))')
        .eq('recipient_id', session.user.id)
        .order('created_at', { ascending: false });
      
      // Group by property
      const grouped = {};
      messages?.forEach(msg => {
        const dealId = msg.deal_id;
        if (!grouped[dealId]) {
          grouped[dealId] = {
            deal: msg.deal,
            conversations: {}
          };
        }
        
        // Group by conversation
        const convId = msg.conversation_id;
        if (!grouped[dealId].conversations[convId]) {
          grouped[dealId].conversations[convId] = {
            conversation_id: convId,
            sender_name: msg.sender?.user_profiles?.full_name || 'Anonymous',
            sender_id: msg.sender_id,
            messages: [],
            unread_count: 0
          };
        }
        
        grouped[dealId].conversations[convId].messages.push(msg);
        if (!msg.read) {
          grouped[dealId].conversations[convId].unread_count++;
        }
      });
      
      // Convert to array
      const result = Object.keys(grouped).map(dealId => ({
        deal: grouped[dealId].deal,
        conversations: Object.values(grouped[dealId].conversations)
      }));
      
      setMessagesByProperty(result);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  return (
    <div style={{ 
      background: '#130f40',
      backgroundImage: 'linear-gradient(315deg, #130f40 0%, #000000 74%)',
      minHeight: '100vh', 
      padding: '40px' 
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Diagonal purple gradient for comparison with Dashboard */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ color: '#fff', fontSize: '32px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingUp size={32} color="#ff0000" />
            Marketplace Analytics
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px' }}>
            Track performance of your published listings
          </p>
        </div>

        {/* Stats Overview - Ultra-light glass cards */}
        {analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '48px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Eye size={24} color="#ff0000" />
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Views
                </div>
              </div>
              <div style={{ color: '#fff', fontSize: '36px', fontWeight: '700' }}>
                {analytics.views.toLocaleString()}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <MessageCircle size={24} color="#ff0000" />
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Total Messages
                </div>
              </div>
              <div style={{ color: '#fff', fontSize: '36px', fontWeight: '700' }}>
                {analytics.inquiries.toLocaleString()}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Heart size={24} color="#ff0000" />
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

        {/* SECTION 1: Your Published Listings */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
            Your Published Listings
          </h2>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Loading...
            </div>
          ) : publishedDeals.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No published deals yet
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {publishedDeals.map((deal) => (
                <div
                  key={deal.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                  }}
                >
                  {/* Property Image */}
                  <div style={{
                    width: '200px',
                    height: '150px',
                    flexShrink: 0,
                    background: deal.image_url 
                      ? `url(${deal.image_url})` 
                      : 'linear-gradient(135deg, rgba(255, 0, 0, 0.2) 0%, rgba(0, 212, 170, 0.2) 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }} />

                  {/* Property Info */}
                  <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ marginBottom: '12px' }}>
                        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                          {deal.title || deal.address}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
                            {deal.public_market} • {deal.public_asset_type}
                          </span>
                          <span style={{
                            padding: '6px 12px',
                            background: deal.approval_status === 'approved' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                            border: deal.approval_status === 'approved' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)',
                            borderRadius: '6px',
                            color: deal.approval_status === 'approved' ? '#22c55e' : '#fbbf24',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            {deal.approval_status === 'approved' ? 'Published' : deal.approval_status}
                          </span>
                        </div>
                      </div>

                      <div style={{ color: '#ff0000', fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>
                        ${deal.public_price?.toLocaleString()}
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: '24px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Eye size={16} color="rgba(255,255,255,0.5)" />
                        <span style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>
                          {deal.marketplace_views_count || 0}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>views</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MessageCircle size={16} color="rgba(255,255,255,0.5)" />
                        <span style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>
                          {deal.marketplace_inquiries_count || 0}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>messages</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Heart size={16} color="rgba(255,255,255,0.5)" />
                        <span style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>
                          {deal.marketplace_saves_count || 0}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>saves</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ padding: '20px', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={() => navigate(`/workspace/deals/${deal.id}`)}
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(255, 0, 0, 0.15)',
                        border: '1px solid rgba(255, 0, 0, 0.3)',
                        borderRadius: '8px',
                        color: '#ff0000',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      View in CRM
                    </button>
                    <button
                      onClick={() => navigate(`/marketplace/deals/${deal.id}`)}
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ExternalLink size={14} />
                      View Live
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: Messages by Property */}
        <div>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
            Messages by Property
          </h2>

          {messagesByProperty.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No messages yet
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '24px' }}>
              {messagesByProperty.map((property) => (
                <div
                  key={property.deal.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Property Header */}
                  <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'rgba(255,255,255,0.02)'
                  }}>
                    {/* Thumbnail */}
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '8px',
                      background: property.deal.image_url 
                        ? `url(${property.deal.image_url})` 
                        : 'linear-gradient(135deg, rgba(255, 0, 0, 0.2) 0%, rgba(0, 212, 170, 0.2) 100%)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }} />

                    <div style={{ flex: 1 }}>
                      <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                        {property.deal.title || property.deal.address}
                      </h4>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                        {property.conversations.length} conversation{property.conversations.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Conversations */}
                  <div>
                    {property.conversations.map((conv) => {
                      const lastMsg = conv.messages[0]; // Already sorted desc
                      return (
                        <div
                          key={conv.conversation_id}
                          onClick={() => setShowMessaging({ dealId: property.deal.id, dealTitle: property.deal.title || property.deal.address, recipientId: conv.sender_id })}
                          style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <User size={16} color="#ff0000" />
                                <span style={{ color: '#fff', fontWeight: '600', fontSize: '15px' }}>
                                  {conv.sender_name}
                                </span>
                                {conv.unread_count > 0 && (
                                  <span style={{
                                    padding: '3px 8px',
                                    background: '#ff0000',
                                    borderRadius: '10px',
                                    color: '#000',
                                    fontSize: '11px',
                                    fontWeight: '700'
                                  }}>
                                    {conv.unread_count} new
                                  </span>
                                )}
                              </div>

                              <div style={{
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '14px',
                                marginBottom: '6px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {lastMsg.message}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                                  {new Date(lastMsg.created_at).toLocaleString()}
                                </span>
                                <button
                                  style={{
                                    padding: '4px 12px',
                                    background: 'rgba(255, 0, 0, 0.15)',
                                    border: '1px solid rgba(255, 0, 0, 0.3)',
                                    borderRadius: '6px',
                                    color: '#ff0000',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Send size={12} />
                                  Reply
                                </button>
                              </div>
                            </div>

                            <div>
                              {conv.messages.length > 1 && (
                                <span style={{
                                  padding: '6px 12px',
                                  background: 'rgba(255,255,255,0.05)',
                                  borderRadius: '6px',
                                  color: 'rgba(255,255,255,0.6)',
                                  fontSize: '12px'
                                }}>
                                  {conv.messages.length} messages
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messaging Panel */}
      {showMessaging && (
        <MessagingPanel
          dealId={showMessaging.dealId}
          dealTitle={showMessaging.dealTitle}
          brokerId={showMessaging.recipientId}
          onClose={() => setShowMessaging(null)}
        />
      )}
    </div>
  );
};

export default BrokerAnalytics;
