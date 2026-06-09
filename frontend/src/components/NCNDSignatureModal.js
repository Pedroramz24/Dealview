import React, { useState, useEffect, useRef } from 'react';
import { X, Check, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../App';

const NCNDSignatureModal = ({ dealId, onClose, onSigned }) => {
  const [agreementText, setAgreementText] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const [signatureData, setSignatureData] = useState(null);

  useEffect(() => {
    fetchAgreementText();
  }, [dealId]);

  const fetchAgreementText = async () => {
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      
      const response = await fetch(`${API}/marketplace/deals/${dealId}/ncnd-text`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAgreementText(data.agreement_text);
        setPropertyAddress(data.property_address);
        setUserFullName(data.user_full_name);
      } else {
        throw new Error('Failed to load agreement');
      }
    } catch (error) {
      console.error('Error fetching NCND text:', error);
      toast.error('Failed to load NCND agreement');
    } finally {
      setLoading(false);
    }
  };

  // Canvas drawing functions
  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      const signatureImage = canvas.toDataURL('image/png');
      setSignatureData(signatureImage);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const handleSign = async () => {
    if (!agreed) {
      toast.error('You must agree to the terms');
      return;
    }

    if (!signatureData) {
      toast.error('Please provide your signature');
      return;
    }

    try {
      setSigning(true);
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      
      const response = await fetch(`${API}/marketplace/deals/${dealId}/sign-ncnd`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deal_id: dealId,
          signature_data: signatureData,
          agreed: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to sign NCND');
      }

      toast.success('NCND agreement signed successfully!');
      onSigned?.(data);
      onClose();
      
    } catch (error) {
      console.error('Sign error:', error);
      toast.error(error.message || 'Failed to sign NCND');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
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
        zIndex: 2000
      }}>
        <div style={{ color: '#fff', fontSize: '18px' }}>Loading agreement...</div>
      </div>
    );
  }

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
        maxWidth: '800px',
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
            <FileText size={24} color="#ff0000" />
            <div>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>
                Non-Circumvention & Non-Disclosure Agreement
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                Required to view listing details
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

        {/* Agreement Text */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '32px'
        }}>
          <div style={{
            padding: '20px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <pre style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: '13px',
              lineHeight: '1.7',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              whiteSpace: 'pre-wrap',
              margin: 0
            }}>
              {agreementText}
            </pre>
          </div>

          {/* Signature Canvas */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: '14px',
              fontWeight: '600',
              display: 'block',
              marginBottom: '12px'
            }}>
              Digital Signature *
            </label>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '8px',
              marginBottom: '12px'
            }}>
              <canvas
                ref={canvasRef}
                width={720}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{
                  width: '100%',
                  height: '150px',
                  cursor: 'crosshair',
                  border: '2px dashed rgba(0,0,0,0.1)',
                  borderRadius: '8px'
                }}
              />
            </div>
            <button
              type="button"
              onClick={clearSignature}
              style={{
                padding: '8px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              Clear Signature
            </button>
          </div>

          {/* Agreement Checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px',
            background: 'rgba(255, 0, 0, 0.05)',
            border: '1px solid rgba(255, 0, 0, 0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            marginBottom: '24px'
          }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{
                width: '20px',
                height: '20px',
                marginTop: '2px',
                cursor: 'pointer'
              }}
            />
            <span style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: '14px',
              lineHeight: '1.6',
              flex: 1
            }}>
              I have read and agree to the terms of this Non-Circumvention and Non-Disclosure Agreement. I understand that this agreement is legally binding and remains in effect for 6 months from today.
            </span>
          </label>

          {/* Warning Notice */}
          <div style={{
            padding: '16px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '12px',
            display: 'flex',
            gap: '12px'
          }}>
            <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <p style={{ color: '#f59e0b', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                Important Legal Notice
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', lineHeight: '1.5' }}>
                Your digital signature, IP address, and timestamp will be recorded for legal purposes. Unauthorized disclosure or circumvention may result in legal action.
              </p>
            </div>
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
            disabled={signing}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: 'rgba(255,255,255,0.6)',
              cursor: signing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSign}
            disabled={signing || !agreed || !signatureData}
            style={{
              padding: '12px 24px',
              background: (signing || !agreed || !signatureData)
                ? 'rgba(255, 0, 0, 0.3)'
                : 'linear-gradient(135deg, #ff0000 0%, #ff0000 100%)',
              border: 'none',
              borderRadius: '10px',
              color: (signing || !agreed || !signatureData) ? 'rgba(0,0,0,0.4)' : '#000',
              cursor: (signing || !agreed || !signatureData) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Check size={18} />
            {signing ? 'Signing...' : 'Sign & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NCNDSignatureModal;
