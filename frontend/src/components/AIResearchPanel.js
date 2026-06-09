import React, { useState, useEffect, useRef, useContext } from 'react';
import { X, Send, Sparkles, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { AuthContext } from '../App';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AIResearchPanel = ({ isOpen, onClose }) => {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmitQuery = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || loading) return;

    // Add user message to conversation
    const userMessage = {
      role: 'user',
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = inputValue;
    setInputValue('');
    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      
      // Get auth token from Supabase session
      const { supabase } = await import('../supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to use AI research');
        setLoading(false);
        return;
      }

      // Call backend API with Supabase token
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          query: currentQuery,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add assistant response with citations
      const assistantMessage = {
        role: 'assistant',
        content: data.content,
        citations: data.citations || [],
        relatedQuestions: data.related_questions || []
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get research results');
      
      // Remove user message if error occurred
      setMessages(prev => prev.filter(msg => msg !== userMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleRelatedQuestionClick = (question) => {
    setInputValue(question);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: isOpen ? 0 : '-500px',
        width: '500px',
        height: '100vh',
        background: 'linear-gradient(135deg, rgba(11, 12, 14, 0.95) 0%, rgba(26, 26, 26, 0.95) 100%)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1050,
        transition: 'right 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Sparkles size={24} style={{ color: '#a855f7' }} />
          <h2
            style={{
              color: '#FFFFFF',
              fontSize: '18px',
              fontWeight: '600',
              letterSpacing: '-0.02em',
            }}
          >
            AI Market Research
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        className="custom-scrollbar"
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.5)' }}>
            <Sparkles size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <h3 style={{ fontSize: '16px', marginBottom: '8px', color: 'rgba(255,255,255,0.7)' }}>
              Ask About Market Data
            </h3>
            <p style={{ fontSize: '13px', lineHeight: '1.5' }}>
              Get cited answers about rental rates, property values, market trends, and more.
            </p>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Try asking:
              </p>
              {[
                'What are average rents in Stone Oak?',
                'Commercial property trends in San Antonio',
                'Office vacancy rates downtown'
              ].map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputValue(example)}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '6px',
                    color: '#a855f7',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    textAlign: 'left',
                    width: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)';
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {/* Message Bubble */}
            <div
              style={{
                maxWidth: '85%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: message.role === 'user'
                  ? 'rgba(255, 0, 0, 0.15)'
                  : 'rgba(168, 85, 247, 0.1)',
                border: message.role === 'user'
                  ? '1px solid rgba(255, 0, 0, 0.3)'
                  : '1px solid rgba(168, 85, 247, 0.3)',
              }}
            >
              <p
                style={{
                  color: '#FFFFFF',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
                className={message.role === 'assistant' ? 'ai-response-content' : ''}
              >
                {message.role === 'assistant' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </p>
            </div>

            {/* Citations */}
            {message.citations && message.citations.length > 0 && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  maxWidth: '85%',
                }}
              >
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
                  Sources ({message.citations.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {message.citations.map((citation, idx) => (
                    <a
                      key={idx}
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#a855f7',
                        fontSize: '12px',
                        textDecoration: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'background 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <ExternalLink size={12} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        [{idx + 1}] {citation.title}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Related Questions */}
            {message.relatedQuestions && message.relatedQuestions.length > 0 && (
              <div style={{ marginTop: '8px', maxWidth: '85%' }}>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Related Questions:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {message.relatedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRelatedQuestionClick(question)}
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(168, 85, 247, 0.05)',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        borderRadius: '6px',
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)';
                        e.currentTarget.style.color = '#a855f7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.05)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                      }}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '12px',
              maxWidth: '85%',
            }}
          >
            <div className="loading-dots" style={{ display: 'flex', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7', animation: 'pulse 1.4s infinite' }}></span>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7', animation: 'pulse 1.4s infinite 0.2s' }}></span>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a855f7', animation: 'pulse 1.4s infinite 0.4s' }}></span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Researching...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmitQuery}
        style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.3)',
          display: 'flex',
          gap: '12px',
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about market data, rental rates, trends..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          style={{
            padding: '12px 20px',
            background: loading || !inputValue.trim()
              ? 'rgba(168, 85, 247, 0.3)'
              : 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading || !inputValue.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 150ms ease',
            opacity: loading || !inputValue.trim() ? 0.5 : 1,
          }}
        >
          <Send size={16} />
          {loading ? 'Sending...' : 'Ask'}
        </button>
      </form>
    </div>
  );
};

export default AIResearchPanel;
