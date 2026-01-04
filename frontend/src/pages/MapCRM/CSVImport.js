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
import { 
  Upload, FileText, Loader2, CheckCircle2, XCircle, 
  ArrowRight, ArrowLeft, Zap, Check 
} from 'lucide-react';
import { colors, shadows, borderRadius, spacing, gradients, transitions } from '../../styles/designSystem';

const ASSET_TYPES = ['Gas', 'Retail', 'Industrial', 'Office', 'Land', 'Multifamily'];

const DEALVISOR_FIELDS = {
  required: [
    { key: 'address', label: 'Street Address', example: '123 Main St' },
    { key: 'city', label: 'City', example: 'Austin' },
    { key: 'state', label: 'State', example: 'TX' },
    { key: 'zip_code', label: 'ZIP Code', example: '78701' }
  ],
  optional: [
    { key: 'title', label: 'Property Title', example: 'Downtown Office Tower' },
    { key: 'asking_price', label: 'Asking Price', example: '2500000' },
    { key: 'building_size', label: 'Building Size (sqft)', example: '15000' },
    { key: 'lot_size', label: 'Lot Size (acres)', example: '0.5' },
    { key: 'owner_name', label: 'Owner Name', example: 'John Smith' },
    { key: 'owner_phone', label: 'Owner Phone', example: '512-555-0100' },
    { key: 'owner_email', label: 'Owner Email', example: 'owner@example.com' },
    { key: 'year_built', label: 'Year Built', example: '2010' },
    { key: 'zoning', label: 'Zoning', example: 'Commercial' },
    { key: 'description', label: 'Description', example: 'Prime location...' }
  ]
};

const CSVImportWizard = ({ isOpen, onClose, onImportComplete }) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvPreview, setCsvPreview] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [assetTypeOverride, setAssetTypeOverride] = useState('auto');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile || !selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // Parse CSV to extract headers and preview
    try {
      const text = await selectedFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        setError('CSV file is empty');
        return;
      }

      // Extract headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      setCsvHeaders(headers);

      // Extract preview rows (first 5 data rows)
      const preview = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        return row;
      });
      setCsvPreview(preview);

      // Auto-detect field mappings
      const autoMapping = autoDetectFieldMappings(headers);
      setFieldMapping(autoMapping);

      // Move to mapping step
      setStep(2);
    } catch (err) {
      setError('Failed to parse CSV file');
      console.error(err);
    }
  };

  const autoDetectFieldMappings = (headers) => {
    const mapping = {};
    const lowerHeaders = headers.map(h => h.toLowerCase());

    // Auto-detect common patterns
    const patterns = {
      address: ['address', 'street', 'street_address', 'street address', 'property_address'],
      city: ['city', 'town', 'municipality'],
      state: ['state', 'province', 'st'],
      zip_code: ['zip', 'zipcode', 'zip_code', 'postal', 'postal_code', 'zip code'],
      title: ['title', 'name', 'property_name', 'property name'],
      asking_price: ['price', 'asking_price', 'asking price', 'list_price', 'list price', 'value'],
      building_size: ['building_size', 'building size', 'sqft', 'square_feet', 'building_sqft', 'size'],
      lot_size: ['lot_size', 'lot size', 'acres', 'lot_acres', 'land_size'],
      owner_name: ['owner', 'owner_name', 'owner name', 'contact', 'contact_name'],
      owner_phone: ['phone', 'owner_phone', 'owner phone', 'contact_phone', 'telephone'],
      owner_email: ['email', 'owner_email', 'owner email', 'contact_email'],
      year_built: ['year_built', 'year built', 'built', 'year'],
      zoning: ['zoning', 'zone', 'zoning_code'],
      description: ['description', 'desc', 'notes', 'comments']
    };

    Object.keys(patterns).forEach(field => {
      const matchingHeader = headers.find((header, idx) => 
        patterns[field].some(pattern => lowerHeaders[idx].includes(pattern))
      );
      if (matchingHeader) {
        mapping[field] = matchingHeader;
      }
    });

    return mapping;
  };

  const validateMapping = () => {
    const required = ['address', 'city', 'state', 'zip_code'];
    const missing = required.filter(field => !fieldMapping[field]);
    
    if (missing.length > 0) {
      setError(`Required fields not mapped: ${missing.join(', ')}`);
      return false;
    }
    
    setError(null);
    return true;
  };

  const handleImport = async () => {
    if (!file || !validateMapping()) return;

    setUploading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Read CSV and apply field mapping
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Create remapped CSV with DealVisor field names
      const remappedLines = [
        // New header row with DealVisor field names
        Object.keys(fieldMapping).join(','),
        // Data rows with remapped columns
        ...lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          csvHeaders.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });

          // Remap fields
          const remapped = Object.keys(fieldMapping).map(dealvisorField => {
            const csvColumn = fieldMapping[dealvisorField];
            return `"${row[csvColumn] || ''}"`;
          });

          return remapped.join(',');
        })
      ];

      const remappedCSV = remappedLines.join('\n');
      const remappedBlob = new Blob([remappedCSV], { type: 'text/csv' });
      const remappedFile = new File([remappedBlob], file.name, { type: 'text/csv' });

      // Upload remapped CSV
      const formData = new FormData();
      formData.append('file', remappedFile);

      const url = assetTypeOverride !== 'auto'
        ? `${API}/map-crm/properties/import?asset_type_override=${assetTypeOverride}`
        : `${API}/map-crm/properties/import`;

      const response = await fetch(url, {
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
      setStep(5);

      // Auto-close after success
      setTimeout(() => {
        onImportComplete();
        resetWizard();
      }, 3000);

    } catch (err) {
      console.error('Import error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setFile(null);
    setCsvHeaders([]);
    setCsvPreview([]);
    setFieldMapping({});
    setAssetTypeOverride('auto');
    setResult(null);
    setError(null);
  };

  const renderStep1 = () => (
    <>
      <DialogHeader>
        <DialogTitle style={{ color: colors.textPrimary }}>
          Upload CSV File
        </DialogTitle>
        <DialogDescription style={{ color: colors.textTertiary }}>
          Step 1 of 4: Select a CSV file containing property data
        </DialogDescription>
      </DialogHeader>

      <div style={{
        border: `2px dashed ${colors.border}`,
        borderRadius: borderRadius.md,
        padding: spacing.xl,
        textAlign: 'center',
        transition: transitions.default,
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.primary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border;
      }}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload" style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <Upload size={48} style={{ color: colors.textMuted, margin: '0 auto' }} />
            <p style={{ fontSize: '14px', color: colors.textSecondary }}>
              Click to select CSV file or drag and drop
            </p>
            <p style={{ fontSize: '12px', color: colors.textTertiary }}>
              Any CSV format accepted - you'll map fields in the next step
            </p>
          </div>
        </label>
      </div>

      {error && (
        <Alert variant="destructive" style={{
          background: `${colors.danger}15`,
          border: `1px solid ${colors.danger}`
        }}>
          <XCircle size={16} />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  );

  const renderStep2 = () => {
    const isMappingComplete = ['address', 'city', 'state', 'zip_code'].every(field => fieldMapping[field]);

    return (
      <>
        <DialogHeader>
          <DialogTitle style={{ color: colors.textPrimary }}>
            Map CSV Fields
          </DialogTitle>
          <DialogDescription style={{ color: colors.textTertiary }}>
            Step 2 of 4: Match your CSV columns to DealVisor fields
          </DialogDescription>
        </DialogHeader>

        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md
        }}>
          {/* Required Fields */}
          <div>
            <h3 style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: spacing.sm
            }}>
              Required Fields
            </h3>
            {DEALVISOR_FIELDS.required.map(field => (
              <div key={field.key} style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr',
                gap: spacing.md,
                alignItems: 'center',
                marginBottom: spacing.sm,
                padding: spacing.sm,
                background: colors.surfaceElevated,
                borderRadius: borderRadius.sm,
                border: fieldMapping[field.key] ? `1px solid ${colors.success}40` : `1px solid ${colors.border}`
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '500', color: colors.textPrimary, marginBottom: '2px' }}>
                    {field.label} *
                  </p>
                  <p style={{ fontSize: '11px', color: colors.textTertiary }}>
                    e.g., {field.example}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                  <select
                    value={fieldMapping[field.key] || ''}
                    onChange={(e) => setFieldMapping({ ...fieldMapping, [field.key]: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: colors.surfaceCard,
                      border: `1px solid ${colors.border}`,
                      borderRadius: borderRadius.sm,
                      color: colors.textPrimary,
                      fontSize: '13px',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="">-- Select Column --</option>
                    {csvHeaders.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                  {fieldMapping[field.key] && (
                    <Check size={16} style={{ color: colors.success }} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Optional Fields */}
          <div>
            <h3 style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: spacing.sm
            }}>
              Optional Fields
            </h3>
            {DEALVISOR_FIELDS.optional.map(field => (
              <div key={field.key} style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr',
                gap: spacing.md,
                alignItems: 'center',
                marginBottom: spacing.sm,
                padding: spacing.sm,
                background: colors.surfaceCard,
                borderRadius: borderRadius.sm,
                border: `1px solid ${colors.border}`
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '500', color: colors.textSecondary }}>
                    {field.label}
                  </p>
                </div>
                <select
                  value={fieldMapping[field.key] || ''}
                  onChange={(e) => setFieldMapping({ ...fieldMapping, [field.key]: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    background: colors.surfaceCard,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.sm,
                    color: colors.textPrimary,
                    fontSize: '13px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">-- Skip --</option>
                  {csvHeaders.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" style={{
            background: `${colors.danger}15`,
            border: `1px solid ${colors.danger}`
          }}>
            <XCircle size={16} />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            variant="outline"
            onClick={() => {
              setStep(1);
              setFile(null);
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.textSecondary
            }}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
          <Button
            onClick={() => {
              if (validateMapping()) setStep(3);
            }}
            disabled={!isMappingComplete}
            style={{
              flex: 1,
              background: isMappingComplete ? gradients.primaryButton : colors.surfaceElevated,
              color: isMappingComplete ? colors.textPrimary : colors.textMuted,
              border: 'none',
              boxShadow: isMappingComplete ? shadows.glowCyan : 'none'
            }}
          >
            Next: Asset Type
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </>
    );
  };

  const renderStep3 = () => (
    <>
      <DialogHeader>
        <DialogTitle style={{ color: colors.textPrimary }}>
          Asset Type Classification
        </DialogTitle>
        <DialogDescription style={{ color: colors.textTertiary }}>
          Step 3 of 4: How should properties be classified?
        </DialogDescription>
      </DialogHeader>

      <div style={{
        background: colors.surfaceElevated,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        border: `1px solid ${colors.border}`
      }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          color: colors.textSecondary,
          marginBottom: spacing.sm,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Classification Strategy
        </label>
        <select
          value={assetTypeOverride}
          onChange={(e) => setAssetTypeOverride(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: colors.surfaceCard,
            border: `1px solid ${colors.border}`,
            borderRadius: borderRadius.sm,
            color: colors.textPrimary,
            fontSize: '14px',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="auto">🧠 Auto-Classify (intelligent keywords)</option>
          {ASSET_TYPES.map(type => (
            <option key={type} value={type}>Classify all as {type}</option>
          ))}
        </select>
        <p style={{
          fontSize: '11px',
          color: colors.textMuted,
          marginTop: spacing.sm,
          fontStyle: 'italic'
        }}>
          {assetTypeOverride === 'auto' 
            ? 'DealVisor will scan keywords and property sizes to classify each property'
            : `All ${csvPreview.length}+ properties will be tagged as ${assetTypeOverride}`
          }
        </p>
      </div>

      <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
        <Button
          variant="outline"
          onClick={() => setStep(2)}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.textSecondary
          }}
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <Button
          onClick={() => setStep(4)}
          style={{
            flex: 1,
            background: gradients.primaryButton,
            color: colors.textPrimary,
            border: 'none',
            boxShadow: shadows.glowCyan
          }}
        >
          Preview Import
          <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </>
  );

  const renderStep4 = () => (
    <>
      <DialogHeader>
        <DialogTitle style={{ color: colors.textPrimary }}>
          Preview Import
        </DialogTitle>
        <DialogDescription style={{ color: colors.textTertiary }}>
          Step 4 of 4: Review how your data will be imported
        </DialogDescription>
      </DialogHeader>

      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        background: colors.surfaceElevated,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        border: `1px solid ${colors.border}`
      }}>
        <p style={{ fontSize: '12px', fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm }}>
          First 5 rows preview:
        </p>
        {csvPreview.map((row, idx) => (
          <div key={idx} style={{
            padding: spacing.sm,
            background: colors.surfaceCard,
            borderRadius: borderRadius.sm,
            marginBottom: spacing.sm,
            border: `1px solid ${colors.border}`
          }}>
            <p style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>
              Row {idx + 1}
            </p>
            {Object.keys(fieldMapping).filter(k => fieldMapping[k]).map(dealvisorField => (
              <div key={dealvisorField} style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '2px' }}>
                <strong>{dealvisorField}:</strong> {row[fieldMapping[dealvisorField]] || '(empty)'}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{
        background: `${colors.primary}10`,
        border: `1px solid ${colors.primary}40`,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginTop: spacing.md
      }}>
        <p style={{ fontSize: '13px', color: colors.textPrimary, fontWeight: '600', marginBottom: '4px' }}>
          Ready to Import
        </p>
        <p style={{ fontSize: '12px', color: colors.textSecondary }}>
          • Classification: {assetTypeOverride === 'auto' ? 'Auto-classify' : `All as ${assetTypeOverride}`}<br />
          • Duplicate handling: Existing properties will be updated<br />
          • Geocoding: Automatic via Radar.io
        </p>
      </div>

      {error && (
        <Alert variant="destructive" style={{
          background: `${colors.danger}15`,
          border: `1px solid ${colors.danger}`
        }}>
          <XCircle size={16} />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
        <Button
          variant="outline"
          onClick={() => setStep(3)}
          disabled={uploading}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.textSecondary
          }}
        >
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <Button
          onClick={handleImport}
          disabled={uploading}
          style={{
            flex: 1,
            background: gradients.primaryButton,
            color: colors.textPrimary,
            border: 'none',
            boxShadow: shadows.glowCyan
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Importing...
            </>
          ) : (
            <>
              <Zap size={16} className="mr-2" />
              Start Import
            </>
          )}
        </Button>
      </div>
    </>
  );

  const renderStep5 = () => (
    <>
      <DialogHeader>
        <DialogTitle style={{ color: colors.textPrimary }}>
          Import Complete!
        </DialogTitle>
      </DialogHeader>

      <Alert style={{
        background: `${colors.success}15`,
        border: `1px solid ${colors.success}`
      }}>
        <CheckCircle2 size={16} style={{ color: colors.success }} />
        <AlertDescription>
          <p style={{ fontWeight: '600', marginBottom: '4px', color: colors.success }}>
            Successfully Imported
          </p>
          <p style={{ fontSize: '13px', opacity: 0.9, color: colors.textPrimary }}>
            {result?.successful_rows} of {result?.total_rows} properties processed
          </p>
          {result?.new_properties !== undefined && (
            <p style={{ fontSize: '12px', marginTop: '4px', color: colors.textSecondary }}>
              • {result.new_properties} new properties added<br />
              • {result.updated_properties} properties updated
            </p>
          )}
        </AlertDescription>
      </Alert>

      <div style={{
        background: colors.surfaceElevated,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        border: `1px solid ${colors.border}`
      }}>
        <p style={{ fontSize: '12px', color: colors.textTertiary }}>
          Properties are now visible on the map. Pan and zoom to explore.
        </p>
      </div>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      if (!uploading) {
        onClose();
        resetWizard();
      }
    }}>
      <DialogContent 
        className="sm:max-w-2xl"
        style={{
          background: colors.surfaceCard,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.lg,
          color: colors.textPrimary,
          maxWidth: step === 2 ? '700px' : '500px'
        }}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </DialogContent>
    </Dialog>
  );
};

export default CSVImportWizard;
