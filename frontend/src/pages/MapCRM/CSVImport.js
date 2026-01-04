import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { API } from '../../App';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { colors, shadows, borderRadius, spacing, gradients, transitions } from '../../styles/designSystem';

const CSVImport = ({ isOpen, onClose, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    } else {
      setError('Please select a CSV file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API}/map-crm/properties/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Import failed');
      }

      const data = await response.json();
      setResult(data);

      // Auto-close after success
      setTimeout(() => {
        onImportComplete();
      }, 2000);

    } catch (err) {
      console.error('Import error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md"
        style={{
          background: colors.surfaceCard,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.lg,
          color: colors.textPrimary
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: colors.textPrimary, fontSize: '18px', fontWeight: '600' }}>
            Import Properties
          </DialogTitle>
          <DialogDescription style={{ color: colors.textTertiary }}>
            Upload a CSV file with property data. Addresses will be automatically geocoded.
          </DialogDescription>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {/* File Input */}
          <div style={{
            border: `2px dashed ${colors.border}`,
            borderRadius: borderRadius.md,
            padding: spacing.xl,
            textAlign: 'center',
            transition: transitions.default,
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            if (!uploading) e.currentTarget.style.borderColor = colors.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = colors.border;
          }}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
              disabled={uploading}
            />
            <label htmlFor="csv-upload" style={{ cursor: 'pointer' }}>
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
                  <FileText size={32} style={{ color: colors.primary }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: colors.textPrimary }}>{file.name}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                  <Upload size={48} style={{ color: colors.textMuted, margin: '0 auto' }} />
                  <p style={{ fontSize: '14px', color: colors.textSecondary }}>Click to select CSV file</p>
                  <p style={{ fontSize: '12px', color: colors.textTertiary }}>or drag and drop here</p>
                </div>
              )}
            </label>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert 
              variant="destructive"
              style={{
                background: `${colors.danger}15`,
                border: `1px solid ${colors.danger}`,
                color: colors.danger
              }}
            >
              <XCircle size={16} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Result */}
          {result && (
            <Alert 
              style={{
                background: `${colors.success}15`,
                border: `1px solid ${colors.success}`,
                color: colors.success
              }}
            >
              <CheckCircle2 size={16} />
              <AlertDescription>
                <p style={{ fontWeight: '600', marginBottom: '4px' }}>Import Complete!</p>
                <p style={{ fontSize: '13px', opacity: 0.9 }}>
                  {result.successful_rows} of {result.total_rows} properties processed successfully.
                </p>
                {result.new_properties !== undefined && (
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>
                    • {result.new_properties} new properties added<br />
                    • {result.updated_properties} properties updated
                  </p>
                )}
                {result.failed_rows > 0 && (
                  <p style={{ fontSize: '13px', color: colors.warning, marginTop: '4px' }}>
                    {result.failed_rows} properties failed to import.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* CSV Format Help */}
          <div style={{
            background: colors.surfaceElevated,
            borderRadius: borderRadius.sm,
            padding: spacing.md,
            border: `1px solid ${colors.border}`
          }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: colors.textSecondary, marginBottom: '6px' }}>
              Required Columns:
            </p>
            <p style={{ fontSize: '12px', color: colors.textTertiary, fontFamily: 'monospace', marginBottom: spacing.sm }}>
              address, city, state, zip_code
            </p>
            <p style={{ fontSize: '12px', fontWeight: '600', color: colors.textSecondary, marginTop: spacing.sm, marginBottom: '6px' }}>
              Optional but Recommended:
            </p>
            <p style={{ fontSize: '12px', color: colors.textTertiary, marginBottom: '4px' }}>
              <strong>asset_type</strong> - Gas, Retail, Industrial, Office, Land, Multifamily
            </p>
            <p style={{ fontSize: '11px', color: colors.textMuted, fontStyle: 'italic' }}>
              (If missing, DealVisor will auto-classify based on keywords and property size)
            </p>
            <p style={{ fontSize: '12px', color: colors.textTertiary, marginTop: spacing.sm }}>
              <strong>Duplicate Handling:</strong> Existing properties will be updated automatically.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{
                flex: 1,
                background: file && !uploading ? gradients.primaryButton : colors.surfaceElevated,
                color: file && !uploading ? colors.textPrimary : colors.textMuted,
                border: 'none',
                boxShadow: file && !uploading ? shadows.glowCyan : 'none',
                transition: transitions.default,
                cursor: file && !uploading ? 'pointer' : 'not-allowed'
              }}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                'Upload & Import'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={uploading}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                transition: transitions.default
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImport;
