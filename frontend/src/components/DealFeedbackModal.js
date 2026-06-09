import React, { useState } from 'react';
import { X, Send, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../App';

const DealFeedbackModal = ({ dealId, interactionType = 'offer_submitted', onClose, onSubmitted }) => {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({
    seller_engaged: null,
    terms_accurate: null,
    would_recommend: null,
    optional_comment: ''
  });

  const handleSubmit = async () => {
    // Validate required fields
    if (feedback.seller_engaged === null || feedback.terms_accurate === null || feedback.would_recommend === null) {
      toast.error('Please answer all questions');
      return;
    }

    try {
      setSubmitting(true);
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      
      const response = await fetch(`${API}/reputation/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deal_id: dealId,
          seller_engaged: feedback.seller_engaged,
          terms_accurate: feedback.terms_accurate,
          would_recommend: feedback.would_recommend,
          optional_comment: feedback.optional_comment || null,
          interaction_type: interactionType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to submit feedback');
      }

      toast.success('Feedback submitted successfully!');
      onSubmitted?.(data);
      onClose();
      
    } catch (error) {
      console.error('Feedback error:', error);
      toast.error(error.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const renderBinaryQuestion = (question, field, description) => {
    return (
      <div style={{
        padding: '20px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
        <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>
          {question}
        </h4>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '16px' }}>
          {description}
        </p>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setFeedback({ ...feedback, [field]: true })}
            style={{
              flex: 1,
              padding: '12px',
              background: feedback[field] === true ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
              border: feedback[field] === true ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: feedback[field] === true ? '#10b981' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <ThumbsUp size={18} />
            Yes
          </button>

          <button
            onClick={() => setFeedback({ ...feedback, [field]: false })}
            style={{
              flex: 1,
              padding: '12px',
              background: feedback[field] === false ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
              border: feedback[field] === false ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: feedback[field] === false ? '#ef4444' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <ThumbsDown size={18} />
            No
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MessageSquare size={24} color="#ff0000" />
            <div>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>
                Share Your Experience
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                Help us maintain quality standards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '32px'
        }}>
          {renderBinaryQuestion(
            'Was the seller actually engaged?',
            'seller_engaged',
            'Did the seller seem genuinely committed to selling, or did it feel like a fishing expedition?'
          )}

          {renderBinaryQuestion(
            'Did the deal terms match the posting?',
            'terms_accurate',
            'Were the property details, price, and conditions materially accurate compared to what was posted?'
          )}

          {renderBinaryQuestion(
            'Would you work with this broker again?',
            'would_recommend',
            'Based on this experience, would you engage with this broker on future deals?'
          )}

          {/* Optional Comment */}
          <div style={{ marginTop: '24px' }}>
            <label style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: '14px',
              fontWeight: '600',
              display: 'block',
              marginBottom: '8px'
            }}>
              Additional Comments (Optional)
            </label>
            <textarea
              value={feedback.optional_comment}
              onChange={(e) => setFeedback({ ...feedback, optional_comment: e.target.value })}
              placeholder="Any additional details you'd like to share..."
              rows={4}
              maxLength={1000}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '6px' }}>
              {feedback.optional_comment.length}/1000 characters
            </p>
          </div>

          {/* Privacy Notice */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'rgba(255, 0, 0, 0.05)',
            border: '1px solid rgba(255, 0, 0, 0.2)',
            borderRadius: '12px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: '1.6'
          }}>
            <strong style={{ color: '#ff0000' }}>Privacy:</strong> Your feedback is private and anonymous. It will not be published publicly. We use this data solely to calculate broker quality scores and improve platform integrity.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '24px 32px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: 'rgba(255,255,255,0.6)',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={submitting || feedback.seller_engaged === null || feedback.terms_accurate === null || feedback.would_recommend === null}
            style={{
              padding: '12px 24px',
              background: (submitting || feedback.seller_engaged === null || feedback.terms_accurate === null || feedback.would_recommend === null)
                ? 'rgba(255, 0, 0, 0.3)'
                : 'linear-gradient(135deg, #ff0000 0%, #ff0000 100%)',
              border: 'none',
              borderRadius: '10px',
              color: (submitting || feedback.seller_engaged === null || feedback.terms_accurate === null || feedback.would_recommend === null) ? 'rgba(0,0,0,0.4)' : '#000',
              cursor: (submitting || feedback.seller_engaged === null || feedback.terms_accurate === null || feedback.would_recommend === null) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Send size={18} />
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealFeedbackModal;
