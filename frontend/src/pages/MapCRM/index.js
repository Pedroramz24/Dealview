import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapCRMProvider, useMapCRM } from '../../contexts/MapCRMContext';
import MapView from './MapView';
import TableView from './TableView';
import CSVImport from './CSVImport';
import { Button } from '../../components/ui/button';
import { Upload, MapIcon, Grid3x3, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { colors, shadows, gradients, borderRadius, transitions, spacing } from '../../styles/designSystem';

const DealVisorContent = () => {
  const { hasAccess, checkingAccess, fetchProperties, loading, properties } = useMapCRM();
  const [showImport, setShowImport] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!checkingAccess && !hasAccess) {
      navigate('/workspace');
    }
  }, [hasAccess, checkingAccess, navigate]);

  useEffect(() => {
    if (hasAccess) {
      fetchProperties();
    }
  }, [hasAccess]);

  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: colors.void }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.primary }} />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: colors.void }}>
        <Alert className="max-w-md" style={{ background: colors.surfaceCard, border: `1px solid ${colors.border}` }}>
          <AlertDescription style={{ color: colors.textSecondary }}>
            Access denied. This internal tool requires special permissions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: colors.void
    }}>
      {/* Header */}
      <div style={{
        background: colors.surfaceCard,
        borderBottom: `1px solid ${colors.border}`,
        padding: `${spacing.md} ${spacing.xl}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: shadows.sm
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: borderRadius.md,
            background: `${colors.primary}20`,
            border: `1px solid ${colors.primary}50`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: shadows.glowCyan
          }}>
            <MapIcon size={20} style={{ color: colors.primary }} />
          </div>
          <div>
            <h1 style={{ 
              fontSize: '20px',
              fontWeight: '700',
              color: colors.textPrimary,
              margin: 0,
              letterSpacing: '-0.01em'
            }}>DealVisor</h1>
            <p style={{ 
              fontSize: '13px',
              color: colors.textTertiary,
              margin: 0
            }}>
              {loading ? 'Loading...' : `${properties.length} properties`}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md
        }}>
          <div style={{
            display: 'flex',
            background: colors.surfaceElevated,
            borderRadius: borderRadius.md,
            padding: '4px',
            border: `1px solid ${colors.border}`
          }}>
            <button
              onClick={() => setShowMap(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: borderRadius.sm,
                background: showMap ? `${colors.primary}20` : 'transparent',
                border: showMap ? `1px solid ${colors.primary}50` : '1px solid transparent',
                color: showMap ? colors.primary : colors.textTertiary,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: transitions.fast,
                boxShadow: showMap ? shadows.glowCyan : 'none'
              }}
            >
              <MapIcon size={16} />
              Map View
            </button>
            <button
              onClick={() => setShowMap(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: borderRadius.sm,
                background: !showMap ? `${colors.primary}20` : 'transparent',
                border: !showMap ? `1px solid ${colors.primary}50` : '1px solid transparent',
                color: !showMap ? colors.primary : colors.textTertiary,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: transitions.fast,
                boxShadow: !showMap ? shadows.glowCyan : 'none'
              }}
            >
              <Grid3x3 size={16} />
              Table View
            </button>
          </div>

          <Button 
            onClick={() => setShowImport(true)} 
            style={{
              background: gradients.primaryButton,
              color: colors.textPrimary,
              border: 'none',
              boxShadow: shadows.glowCyan,
              transition: transitions.default
            }}
            className="flex items-center gap-2"
          >
            <Upload size={16} />
            Import CSV
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loading ? (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.void
          }}>
            <div style={{ textAlign: 'center' }}>
              <Loader2 size={32} style={{ color: colors.primary }} className="animate-spin mb-4" />
              <p style={{ color: colors.textTertiary }}>Loading properties...</p>
            </div>
          </div>
        ) : (
          <>
            {showMap ? <MapView /> : <TableView />}
          </>
        )}
      </div>

      {/* CSV Import Modal */}
      {showImport && (
        <CSVImport
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onImportComplete={() => {
            setShowImport(false);
            fetchProperties();
          }}
        />
      )}
    </div>
  );
};

const DealVisor = () => {
  return (
    <MapCRMProvider>
      <DealVisorContent />
    </MapCRMProvider>
  );
};

export default DealVisor;
