import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { X, Columns } from 'lucide-react';
import { colors, shadows, borderRadius, spacing, gradients, transitions } from '../../styles/designSystem';

const AVAILABLE_COLUMNS = [
  { key: 'address', label: 'Address', alwaysVisible: true },
  { key: 'city', label: 'City', default: true },
  { key: 'asset_type', label: 'Asset Type', default: true },
  { key: 'asking_price', label: 'Asking Price', default: true },
  { key: 'building_size', label: 'Building Size', default: true },
  { key: 'status', label: 'Status', default: true },
  // PropertyRadar columns
  { key: 'est_value', label: 'Est Value', default: false, propertyRadar: true },
  { key: 'est_equity_percent', label: 'Equity %', default: false, propertyRadar: true },
  { key: 'tax_delinquent_dollars', label: 'Tax Delinquent $', default: false, propertyRadar: true },
  { key: 'beds', label: 'Beds', default: false, propertyRadar: true },
  { key: 'baths', label: 'Baths', default: false, propertyRadar: true },
  { key: 'owner_name', label: 'Owner Name', default: false, propertyRadar: true },
  { key: 'owner_type', label: 'Owner Type', default: false, propertyRadar: true },
  { key: 'county', label: 'County', default: false, propertyRadar: true },
  { key: 'year_built', label: 'Year Built', default: false },
  { key: 'purchase_date', label: 'Purchase Date', default: false, propertyRadar: true },
  { key: 'purchase_amount', label: 'Purchase Amount', default: false, propertyRadar: true },
  { key: 'lot_size', label: 'Lot Size', default: false },
  { key: 'zoning', label: 'Zoning', default: false },
  { key: 'apn', label: 'APN', default: false }
];

const ColumnSelector = ({ visibleColumns, setVisibleColumns, onClose }) => {
  const [localColumns, setLocalColumns] = useState(visibleColumns);

  const toggleColumn = (key) => {
    if (localColumns.includes(key)) {
      setLocalColumns(localColumns.filter(k => k !== key));
    } else {
      setLocalColumns([...localColumns, key]);
    }
  };

  const handleApply = () => {
    setVisibleColumns(localColumns);
    onClose();
  };

  const selectDefaults = () => {
    const defaults = AVAILABLE_COLUMNS.filter(col => col.default || col.alwaysVisible).map(col => col.key);
    setLocalColumns(defaults);
  };

  const selectAll = () => {
    setLocalColumns(AVAILABLE_COLUMNS.map(col => col.key));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      height: '100vh',
      width: '400px',
      background: colors.surfaceCard,
      borderLeft: `1px solid ${colors.border}`,
      boxShadow: shadows.xl,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: spacing.lg,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <Columns size={20} style={{ color: colors.primary }} />
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: colors.textPrimary }}>
            Customize Columns
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.textTertiary,
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Quick Actions */}
      <div style={{
        padding: spacing.md,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        gap: spacing.sm
      }}>
        <Button
          variant="outline"
          size="sm"
          onClick={selectDefaults}
          style={{
            flex: 1,
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.textSecondary,
            fontSize: '12px'
          }}
        >
          Default View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={selectAll}
          style={{
            flex: 1,
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.textSecondary,
            fontSize: '12px'
          }}
        >
          Select All
        </Button>
      </div>

      {/* Column List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: spacing.lg
      }}>
        <div style={{ marginBottom: spacing.lg }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: spacing.sm }}>
            Core Columns
          </p>
          {AVAILABLE_COLUMNS.filter(col => !col.propertyRadar).map(col => (
            <div
              key={col.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.sm,
                marginBottom: '4px',
                background: localColumns.includes(col.key) ? `${colors.primary}10` : colors.surfaceElevated,
                borderRadius: borderRadius.sm,
                border: localColumns.includes(col.key) ? `1px solid ${colors.primary}40` : `1px solid ${colors.border}`,
                cursor: col.alwaysVisible ? 'not-allowed' : 'pointer',
                opacity: col.alwaysVisible ? 0.6 : 1
              }}
              onClick={() => !col.alwaysVisible && toggleColumn(col.key)}
            >
              <Checkbox
                checked={localColumns.includes(col.key)}
                onCheckedChange={() => !col.alwaysVisible && toggleColumn(col.key)}
                disabled={col.alwaysVisible}
              />
              <Label style={{ fontSize: '14px', color: colors.textPrimary, cursor: col.alwaysVisible ? 'not-allowed' : 'pointer', flex: 1 }}>
                {col.label}
                {col.alwaysVisible && (
                  <span style={{ fontSize: '11px', color: colors.textMuted, marginLeft: spacing.sm }}>
                    (required)
                  </span>
                )}
              </Label>
            </div>
          ))}
        </div>

        <div>
          <p style={{ fontSize: '12px', fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: spacing.sm }}>
            PropertyRadar Columns
          </p>
          {AVAILABLE_COLUMNS.filter(col => col.propertyRadar).map(col => (
            <div
              key={col.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.sm,
                marginBottom: '4px',
                background: localColumns.includes(col.key) ? `${colors.primary}10` : colors.surfaceElevated,
                borderRadius: borderRadius.sm,
                border: localColumns.includes(col.key) ? `1px solid ${colors.primary}40` : `1px solid ${colors.border}`,
                cursor: 'pointer'
              }}
              onClick={() => toggleColumn(col.key)}
            >
              <Checkbox
                checked={localColumns.includes(col.key)}
                onCheckedChange={() => toggleColumn(col.key)}
              />
              <Label style={{ fontSize: '14px', color: colors.textPrimary, cursor: 'pointer', flex: 1 }}>
                {col.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: spacing.lg,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        gap: spacing.sm
      }}>
        <Button
          variant="outline"
          onClick={onClose}
          style={{
            flex: 1,
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.textSecondary
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleApply}
          style={{
            flex: 1,
            background: gradients.primaryButton,
            border: 'none',
            boxShadow: shadows.glow
          }}
        >
          Apply ({localColumns.length} columns)
        </Button>
      </div>
    </div>
  );
};

export default ColumnSelector;
