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
            : `All properties will be tagged as ${assetTypeOverride}`
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
            {Object.keys(fieldMapping).filter(k => fieldMapping[k]).slice(0, 6).map(dealvisorField => (
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
          • {Object.keys(fieldMapping).length} fields mapped<br />
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
          maxWidth: step === 2 ? '750px' : '550px'
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
