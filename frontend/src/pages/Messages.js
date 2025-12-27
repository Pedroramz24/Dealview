import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, ArrowLeft, Home, DollarSign, MapPin, Phone, Mail, Calendar as CalendarIcon, Clock, Trash2 } from 'lucide-react';
import { API } from '../App';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Messages = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    getCurrentUser();
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.conversation_id);
      const cleanup = subscribeToMessages();
      return cleanup;
    }
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

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${API}/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
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
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        
        // Mark messages as read
        await fetch(`${API}/messages/conversation/${conversationId}/mark-read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedConversation?.conversation_id) return;

    const channel = supabase
      .channel(`messages:${selectedConversation.conversation_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'marketplace_messages',
        filter: `conversation_id=eq.${selectedConversation.conversation_id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        scrollToBottom();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${API}/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient_id: selectedConversation.other_user_id,
          deal_id: selectedConversation.deal_id,
          message: newMessage,
          conversation_id: selectedConversation.conversation_id || undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data.message]);
        setNewMessage('');
        
        // Update conversation with new message
        if (!selectedConversation.conversation_id) {
          setSelectedConversation({ ...selectedConversation, conversation_id: data.message.conversation_id });
        }
        
        // Refresh conversations list
        fetchConversations();
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(conv => 
    conv.deal_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.other_user_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      background: 'var(--bg-base)',
      overflow: 'hidden'
    }}>
      {/* Left Sidebar - Conversations List (35%) */}
      <div style={{
        width: '35%',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(16px)'
        }}>
          <h1 style={{ 
            color: '#fff', 
            fontSize: '24px', 
            fontWeight: '700', 
            marginBottom: '16px' 
          }}>
            Messages
          </h1>
          
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.4)'
            }} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px 12px 44px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Conversations List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
              {searchTerm ? 'No conversations found' : 'No messages yet'}
            </div>
          ) : (
            filteredConversations.map(conv => (
              <ConversationItem
                key={conv.conversation_id}
                conversation={conv}
                selected={selectedConversation?.conversation_id === conv.conversation_id}
                onClick={() => setSelectedConversation(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Main - Active Conversation (65%) */}
      <div style={{
        width: '65%',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255, 255, 255, 0.01)'
      }}>
        {selectedConversation ? (
          <>
            {/* Deal Context Header */}
            <DealContextHeader 
              conversation={selectedConversation} 
              navigate={navigate}
            />

            {/* Messages Thread */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  message={msg}
                  isOwn={msg.sender_id === currentUserId}
                  onDelete={(msgId) => {
                    setMessages(messages.filter(m => m.id !== msgId));
                  }}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} style={{
              padding: '20px 24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(16px)'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  style={{
                    padding: '14px 24px',
                    background: newMessage.trim() && !sending 
                      ? 'linear-gradient(135deg, #00b8d4 0%, #00d4aa 100%)' 
                      : 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '10px',
                    color: newMessage.trim() && !sending ? '#000' : 'rgba(255, 255, 255, 0.4)',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: newMessage.trim() && !sending ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: newMessage.trim() && !sending ? '0 4px 12px rgba(0, 184, 212, 0.3)' : 'none'
                  }}
                >
                  <Send size={18} />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};

// Conversation List Item
const ConversationItem = ({ conversation, selected, onClick }) => {
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        cursor: 'pointer',
        background: selected ? 'rgba(0, 184, 212, 0.1)' : 'transparent',
        borderLeft: selected ? '3px solid #00b8d4' : '3px solid transparent',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Deal Thumbnail */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '8px',
          background: conversation.deal_image 
            ? `url(${conversation.deal_image})` 
            : 'linear-gradient(135deg, rgba(0, 184, 212, 0.2), rgba(0, 184, 212, 0.1))',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {!conversation.deal_image && <Home size={20} style={{ color: '#00b8d4' }} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Deal Title */}
          <div style={{ 
            color: '#fff', 
            fontSize: '14px', 
            fontWeight: '600', 
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {conversation.deal_title || 'Property'}
          </div>
          
          {/* Other User Name */}
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.5)', 
            fontSize: '12px',
            marginBottom: '6px'
          }}>
            {conversation.other_user_name}
          </div>
          
          {/* Last Message Preview */}
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '13px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {conversation.last_message}
          </div>
        </div>

        {/* Time + Unread Badge */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px',
          flexShrink: 0
        }}>
          <div style={{
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '11px'
          }}>
            {getTimeAgo(conversation.last_message_at)}
          </div>
          {conversation.unread_count > 0 && (
            <div style={{
              padding: '2px 8px',
              background: '#00b8d4',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '700',
              color: '#000'
            }}>
              {conversation.unread_count}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Deal Context Header
const DealContextHeader = ({ conversation, navigate }) => {
  return (
    <div style={{
      padding: '20px 24px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Deal Image */}
        {conversation.deal_image && (
          <img 
            src={conversation.deal_image} 
            alt={conversation.deal_title}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />
        )}
        
        {/* Deal Info */}
        <div style={{ flex: 1 }}>
          <h2 style={{ 
            color: '#fff', 
            fontSize: '18px', 
            fontWeight: '600', 
            marginBottom: '6px' 
          }}>
            {conversation.deal_title}
          </h2>
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            fontSize: '13px',
            marginBottom: '8px'
          }}>
            Conversation with {conversation.other_user_name}
          </div>
        </div>

        {/* Quick Actions */}
        <button
          onClick={() => navigate(`/marketplace/deals/${conversation.deal_id}`)}
          style={{
            padding: '10px 16px',
            background: 'rgba(0, 184, 212, 0.15)',
            border: '1px solid rgba(0, 184, 212, 0.3)',
            borderRadius: '8px',
            color: '#00b8d4',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Home size={16} />
          View Property
        </button>
      </div>
    </div>
  );
};

// Message Bubble
const MessageBubble = ({ message, isOwn, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this message? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      const { API } = await import('../App');
      const { toast } = await import('sonner');
      
      const response = await fetch(`${API}/messages/${message.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        onDelete(message.id);
        toast.success('Message deleted');
      } else {
        toast.error('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      const { toast } = await import('sonner');
      toast.error('Failed to delete message');
    }
  };

  return (
    <div 
      style={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: '4px',
        position: 'relative'
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div style={{ position: 'relative', maxWidth: '70%' }}>
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          background: isOwn 
            ? 'linear-gradient(135deg, #00b8d4 0%, #00a8c0 100%)'
            : 'rgba(255, 255, 255, 0.05)',
          border: isOwn ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: isOwn ? '0 2px 8px rgba(0, 184, 212, 0.2)' : 'none',
          position: 'relative'
        }}>
          <p style={{
            color: isOwn ? '#000' : '#fff',
            fontSize: '14px',
            lineHeight: '1.5',
            marginBottom: '6px',
            wordWrap: 'break-word'
          }}>
            {message.message}
          </p>
          <div style={{
            color: isOwn ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)',
            fontSize: '11px',
            textAlign: 'right'
          }}>
            {formatTime(message.created_at)}
          </div>
        </div>
        
        {/* Delete Button - Appears below message bubble on hover for own messages */}
        {showActions && isOwn && (
          <button
            onClick={handleDelete}
            style={{
              position: 'absolute',
              bottom: '-32px',
              right: 0,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

// Empty State
const EmptyState = () => {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
      color: 'rgba(255, 255, 255, 0.4)'
    }}>
      <Mail size={64} style={{ opacity: 0.3 }} />
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.6)' }}>
          Select a conversation
        </h3>
        <p style={{ fontSize: '14px' }}>
          Choose a conversation from the left to start messaging
        </p>
      </div>
    </div>
  );
};

export default Messages;
