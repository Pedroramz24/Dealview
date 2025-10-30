import React, { useRef, useState } from 'react';
import EmailEditor from 'react-email-editor';
import { X, Monitor, Smartphone, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';

const EmailBuilderModal = ({ isOpen, onClose, onSave, initialDesign = null, campaignName = '' }) => {
  const emailEditorRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' or 'mobile'

  const saveDesign = () => {
    setSaving(true);
    
    emailEditorRef.current?.editor?.exportHtml((data) => {
      const { design, html } = data;
      
      // Save both the design JSON (for future editing) and the HTML
      onSave({
        design: JSON.stringify(design),
        html: html
      });
      
      toast.success('Email design saved!');
      setSaving(false);
      onClose();
    });
  };

  const onReady = () => {
    // Editor is ready
    if (initialDesign) {
      try {
        const design = JSON.parse(initialDesign);
        emailEditorRef.current?.editor?.loadDesign(design);
      } catch (error) {
        console.error('Error loading design:', error);
      }
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
      background: 'rgba(0, 0, 0, 0.95)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        background: 'rgba(0, 0, 0, 0.8)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
            Email Campaign Builder
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {campaignName || 'Design your email campaign'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Preview Mode Toggle */}
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '4px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px'
          }}>
            <button
              onClick={() => setPreviewMode('desktop')}
              style={{
                padding: '8px 12px',
                background: previewMode === 'desktop' ? 'rgba(0, 184, 212, 0.2)' : 'transparent',
                border: previewMode === 'desktop' ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid transparent',
                borderRadius: '4px',
                color: previewMode === 'desktop' ? '#00b8d4' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px'
              }}
            >
              <Monitor size={16} />
              Desktop
            </button>
            <button
              onClick={() => setPreviewMode('mobile')}
              style={{
                padding: '8px 12px',
                background: previewMode === 'mobile' ? 'rgba(0, 184, 212, 0.2)' : 'transparent',
                border: previewMode === 'mobile' ? '1px solid rgba(0, 184, 212, 0.3)' : '1px solid transparent',
                borderRadius: '4px',
                color: previewMode === 'mobile' ? '#00b8d4' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px'
              }}
            >
              <Smartphone size={16} />
              Mobile
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={saveDesign}
            disabled={saving}
            style={{
              padding: '10px 20px',
              background: saving ? 'rgba(255, 255, 255, 0.05)' : '#00b8d4',
              color: saving ? 'rgba(255, 255, 255, 0.3)' : '#000',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save & Close'}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Email Editor */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <EmailEditor
          ref={emailEditorRef}
          onReady={onReady}
          projectId={123456} // You can use any number here
          options={{
            displayMode: previewMode === 'desktop' ? 'email' : 'web',
            appearance: {
              theme: 'dark',
              panels: {
                tools: {
                  dock: 'left'
                }
              }
            },
            features: {
              preview: true,
              imageEditor: true,
              undoRedo: true,
              stockImages: true
            },
            tools: {
              image: {
                enabled: true
              },
              form: {
                enabled: true
              }
            },
            mergeTags: {
              firstName: {
                name: 'First Name',
                value: '{{firstName}}',
                sample: 'John'
              },
              lastName: {
                name: 'Last Name',
                value: '{{lastName}}',
                sample: 'Doe'
              },
              email: {
                name: 'Email',
                value: '{{email}}',
                sample: 'john@example.com'
              },
              company: {
                name: 'Company',
                value: '{{company}}',
                sample: 'Acme Corp'
              },
              phone: {
                name: 'Phone',
                value: '{{phone}}',
                sample: '(210) 555-0123'
              },
              propertyAddress: {
                name: 'Property Address',
                value: '{{propertyAddress}}',
                sample: '123 Main St, San Antonio, TX'
              },
              price: {
                name: 'Price',
                value: '{{price}}',
                sample: '$1,500,000'
              },
              assetType: {
                name: 'Asset Type',
                value: '{{assetType}}',
                sample: 'Retail Center'
              },
              size: {
                name: 'Size (SF)',
                value: '{{size}}',
                sample: '10,000'
              },
              capRate: {
                name: 'Cap Rate',
                value: '{{capRate}}',
                sample: '7.5%'
              },
              senderName: {
                name: 'Your Name',
                value: '{{senderName}}',
                sample: 'Pedro Armando'
              },
              senderEmail: {
                name: 'Your Email',
                value: '{{senderEmail}}',
                sample: 'pedro@dealview.com'
              }
            }
          }}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
    </div>
  );
};

export default EmailBuilderModal;
