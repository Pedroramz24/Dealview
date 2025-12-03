import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ArrowLeft } from 'lucide-react';
import { API } from '../App';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';

const MessagingPanel = ({ dealId, dealTitle, brokerId, onClose }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    getCurrentUser();
    if (dealId && brokerId) {
      // Start new conversation for this deal
      startNewConversation();
    } else {
      // Load existing conversations
      fetchConversations();
    }
  }, []);

  useEffect(() => {
    // Subscribe to real-time messages if conversation selected
    if (selectedConversation) {
      fetchMessages(selectedConversation.conversation_id);
      subscribeToMessages();
    }
    
    return () => {
      // Cleanup subscription
    };
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUserId(session.user.id);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startNewConversation = () => {
    // Create a virtual conversation for new message
    setSelectedConversation({
      conversation_id: null,
      deal_id: dealId,
      deal_title: dealTitle,
      other_user_id: brokerId,
      other_user_name: 'Broker',
      is_new: true
    });
    setMessages([]);
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${API}/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch conversations');
      
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${API}/messages/conversation/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch messages');
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const subscribeToMessages = () => {
    // Subscribe to Supabase Realtime for new messages
    if (selectedConversation) {
      const channel = supabase
        .channel(`messages:${selectedConversation.conversation_id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_messages',
          filter: `conversation_id=eq.${selectedConversation.conversation_id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new]);
        })
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const payload = {
        recipient_id: selectedConversation.other_user_id,
        deal_id: selectedConversation.deal_id,
        message: newMessage,
        conversation_id: selectedConversation.conversation_id
      };

      const response = await fetch(`${API}/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      const data = await response.json();
      
      // Update conversation ID if it was a new conversation
      if (selectedConversation.is_new) {
        setSelectedConversation({
          ...selectedConversation,
          conversation_id: data.conversation_id,
          is_new: false
        });
      }
      
      // Add message to local state
      setMessages(prev => [...prev, data.message]);
      setNewMessage('');
      
      if (data.inquiry_created) {
        toast.success('Inquiry sent to broker!');
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '450px',
      background: '#0a0a0a',
      borderLeft: '1px solid rgba(255,255,255,0.1)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.5)'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selectedConversation && conversations.length > 0 && (
            <button
              onClick={() => setSelectedConversation(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600' }}>
            {selectedConversation ? 'Messages' : 'Conversations'}
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      {selectedConversation ? (
        /* Message Thread */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Deal Info Banner */}
          <div style={{
            padding: '12px 24px',
            background: 'rgba(0, 184, 212, 0.1)',
            borderBottom: '1px solid rgba(0, 184, 212, 0.2)',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.8)'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '2px' }}>
              {selectedConversation.deal_title}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              With: {selectedConversation.other_user_name}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '40px 20px' }}>
                Start the conversation by sending a message
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMine = msg.sender_id === currentUserId;
                return (
                  <div
                    key={msg.id || idx}
                    style={{
                      display: 'flex',
                      justifyContent: isMine ? 'flex-end' : 'flex-start',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{
                      maxWidth: '75%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: isMine ? '#00b8d4' : 'rgba(255,255,255,0.05)',
                      color: isMine ? '#000' : '#fff',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>
                      {msg.message}
                      <div style={{
                        fontSize: '10px',
                        marginTop: '4px',
                        opacity: 0.6
                      }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} style={{
            padding: '20px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={sending}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                style={{
                  padding: '12px 16px',
                  background: newMessage.trim() ? '#00b8d4' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '10px',
                  color: newMessage.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                  cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Conversation List */
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.conversation_id}
                onClick={() => setSelectedConversation(conv)}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                      {conv.deal_title}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '6px' }}>
                      {conv.other_user_name}
                    </div>
                    <div style={{
                      color: 'rgba(255,255,255,0.6)',
                      fontSize: '13px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {conv.last_message}
                    </div>
                  </div>
                  {conv.unread_count > 0 && (
                    <div style={{
                      background: '#00b8d4',
                      color: '#000',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '700'
                    }}>
                      {conv.unread_count}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MessagingPanel;
