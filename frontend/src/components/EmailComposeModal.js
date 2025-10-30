import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Plus, Minus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const EmailComposeModal = ({ 
  isOpen, 
  onClose, 
  onSend,
  recipient = null, // { email, name, id }
  dealContext = null, // { id, title, address, price }
  token,
  BACKEND_URL 
}) => {
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showMergeTags, setShowMergeTags] = useState(false);
  
  const [emailData, setEmailData] = useState({
    to: recipient?.email || '',
    toName: recipient?.name || '',
    cc: [],
    bcc: [],
    subject: '',
    message: ''
  });

  const messageRef = useRef(null);

  // Reset form when modal opens with new recipient
  useEffect(() => {
    if (isOpen && recipient) {
      setEmailData({
        to: recipient.email || '',
        toName: recipient.name || '',
        cc: [],
        bcc: [],
        subject: '',
        message: dealContext 
          ? `Hi ${recipient.name?.split(' ')[0] || 'there'},\n\nI wanted to reach out regarding ${dealContext.title || dealContext.address}.\n\n`
          : `Hi ${recipient.name?.split(' ')[0] || 'there'},\n\n`
      });
    }
  }, [isOpen, recipient, dealContext]);

  const insertMergeTag = (tag) => {
    const textarea = messageRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = emailData.message;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newMessage = before + tag + after;
    setEmailData({ ...emailData, message: newMessage });
    
    // Set cursor position after inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
    
    setShowMergeTags(false);
  };

  const mergeTags = [
    { label: 'First Name', value: '{{firstName}}' },
    { label: 'Company', value: '{{company}}' },
    { label: 'Property Address', value: '{{propertyAddress}}' },
    { label: 'Price', value: '{{price}}' },
  ];

  const addCcEmail = () => {
    setEmailData({ ...emailData, cc: [...emailData.cc, ''] });
  };

  const removeCcEmail = (index) => {
    setEmailData({ ...emailData, cc: emailData.cc.filter((_, i) => i !== index) });
  };

  const updateCcEmail = (index, value) => {
    const newCc = [...emailData.cc];
    newCc[index] = value;
    setEmailData({ ...emailData, cc: newCc });
  };

  const addBccEmail = () => {
    setEmailData({ ...emailData, bcc: [...emailData.bcc, ''] });
  };

  const removeBccEmail = (index) => {
    setEmailData({ ...emailData, bcc: emailData.bcc.filter((_, i) => i !== index) });
  };

  const updateBccEmail = (index, value) => {
    const newBcc = [...emailData.bcc];
    newBcc[index] = value;
    setEmailData({ ...emailData, bcc: newBcc });
  };

  const handleSend = async () => {
    if (!emailData.to || !emailData.subject || !emailData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSending(true);

    try {
      // Convert plain text to simple HTML
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${emailData.message.split('\n').map(line => `<p>${line}</p>`).join('')}
          </div>
        </body>
        </html>
      `;

      const response = await fetch(`${BACKEND_URL}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contact_id: recipient?.id || null,
          deal_id: dealContext?.id || null,
          to_email: emailData.to,
          to_name: emailData.toName,
          subject: emailData.subject,
          html_content: htmlContent,
          plain_text_content: emailData.message,
          cc_emails: emailData.cc.filter(email => email.trim() !== ''),
          bcc_emails: emailData.bcc.filter(email => email.trim() !== '')
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('✅ Email sent successfully!');
        onSend && onSend(result);
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '32px'
    }}>
      <div className="glass-surface" style={{
        maxWidth: '700px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '32px'
      }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 style={{ color: 'var(--text-primary)', fontSize: '24px', fontWeight: 600 }}>
            Send Email
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* To Field */}
        <div className="mb-4">
          <label style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
            To *
          </label>
          <input
            type="email"
            value={emailData.to}
            onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
            placeholder="recipient@example.com"
            disabled={!!recipient}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: recipient ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: recipient ? 'not-allowed' : 'text'
            }}
          />
        </div>

        {/* CC/BCC Toggle Buttons */}
        <div className="flex gap-2 mb-4">
          {!showCc && (
            <button
              onClick={() => setShowCc(true)}
              style={{
                padding: '6px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              + Cc
            </button>
          )}
          {!showBcc && (
            <button
              onClick={() => setShowBcc(true)}
              style={{
                padding: '6px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              + Bcc
            </button>
          )}
        </div>

        {/* CC Fields */}
        {showCc && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Cc
              </label>
              <button
                onClick={() => setShowCc(false)}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Remove
              </button>
            </div>
            {emailData.cc.map((email, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => updateCcEmail(index, e.target.value)}
                  placeholder="cc@example.com"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={() => removeCcEmail(index)}
                  style={{
                    padding: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <Minus size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={addCcEmail}
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Plus size={14} />
              Add Cc
            </button>
          </div>
        )}

        {/* BCC Fields */}
        {showBcc && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Bcc
              </label>
              <button
                onClick={() => setShowBcc(false)}
                style={{
                  padding: '4px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Remove
              </button>
            </div>
            {emailData.bcc.map((email, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => updateBccEmail(index, e.target.value)}
                  placeholder="bcc@example.com"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={() => removeBccEmail(index)}
                  style={{
                    padding: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <Minus size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={addBccEmail}
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Plus size={14} />
              Add Bcc
            </button>
          </div>
        )}

        {/* Subject Field */}
        <div className="mb-4">
          <label style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px', display: 'block' }}>
            Subject *
          </label>
          <input
            type="text"
            value={emailData.subject}
            onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
            placeholder="Email subject..."
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Message Field */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Message *
            </label>
            <button
              onClick={() => setShowMergeTags(!showMergeTags)}
              style={{
                padding: '6px 10px',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                color: '#8b5cf6',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={14} />
              Merge Tags
            </button>
          </div>

          {/* Merge Tags Dropdown */}
          {showMergeTags && (
            <div style={{
              marginBottom: '8px',
              padding: '8px',
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '6px'
            }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>
                Click to insert:
              </p>
              <div className="flex flex-wrap gap-2">
                {mergeTags.map((tag) => (
                  <button
                    key={tag.value}
                    onClick={() => insertMergeTag(tag.value)}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '4px',
                      color: '#8b5cf6',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            ref={messageRef}
            value={emailData.message}
            onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
            placeholder="Type your message here..."
            rows={12}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              lineHeight: '1.6',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Deal Context Preview */}
        {dealContext && (
          <div className="mb-6 p-4" style={{
            background: 'rgba(0, 184, 212, 0.05)',
            border: '1px solid rgba(0, 184, 212, 0.2)',
            borderRadius: '8px'
          }}>
            <p style={{ color: '#00b8d4', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              📌 Email linked to deal:
            </p>
            <p style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500 }}>
              {dealContext.title || dealContext.address}
            </p>
            {dealContext.price && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                ${dealContext.price.toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: sending ? 'not-allowed' : 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !emailData.to || !emailData.subject || !emailData.message}
            style={{
              flex: 2,
              padding: '12px 24px',
              background: (sending || !emailData.to || !emailData.subject || !emailData.message) 
                ? 'rgba(255, 255, 255, 0.05)' 
                : '#00b8d4',
              color: (sending || !emailData.to || !emailData.subject || !emailData.message) 
                ? 'rgba(255, 255, 255, 0.3)' 
                : '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: (sending || !emailData.to || !emailData.subject || !emailData.message) 
                ? 'not-allowed' 
                : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {sending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailComposeModal;
