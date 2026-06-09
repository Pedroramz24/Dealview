import React, { useState } from 'react';
import { Slider } from '../../components/ui/slider';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { X, Filter, Sparkles } from 'lucide-react';
import { colors, shadows, borderRadius, spacing, gradients, transitions } from '../../styles/designSystem';

const AdvancedFilters = ({ filters, setFilters, onClose, onApply }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    setFilters(localFilters);
    onApply();
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      equityMin: 0,
      equityMax: 100,
      taxDelinquentMin: 0,
      highEquity: false,
      foreclosure: false,
      underwater: false,
      bankruptcy: false,
      ownerOccupied: null,
      cashBuyer: false,
      purchaseDateFrom: null,
      purchaseDateTo: null
    };
    setLocalFilters(resetFilters);
    setFilters(resetFilters);
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
          <Filter size={20} style={{ color: colors.primary }} />
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: colors.textPrimary }}>
            Advanced Filters
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

      {/* Filters Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: spacing.lg,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.lg
      }}>
        {/* Equity % Range */}
        <div>
          <Label style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: spacing.sm, display: 'block' }}>
            Equity % Range
          </Label>
          <div style={{
            background: colors.surfaceElevated,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            border: `1px solid ${colors.border}`,
            marginBottom: spacing.sm
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>
                {localFilters.equityMin}%
              </span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>
                {localFilters.equityMax}%
              </span>
            </div>
            <div style={{ position: 'relative', height: '40px', marginBottom: spacing.sm }}>
              {/* Min Range */}
              <input
                type="range"
                min="0"
                max="100"
                value={localFilters.equityMin}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val <= localFilters.equityMax) {
                    setLocalFilters({ ...localFilters, equityMin: val });
                  }
                }}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '6px',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  background: 'transparent',
                  outline: 'none',
                  zIndex: 2,
                  pointerEvents: 'auto'
                }}
              />
              {/* Max Range */}
              <input
                type="range"
                min="0"
                max="100"
                value={localFilters.equityMax}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= localFilters.equityMin) {
                    setLocalFilters({ ...localFilters, equityMax: val });
                  }
                }}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '6px',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  background: `linear-gradient(to right, ${colors.border} 0%, ${colors.border} ${localFilters.equityMin}%, ${colors.primary} ${localFilters.equityMin}%, ${colors.primary} ${localFilters.equityMax}%, ${colors.border} ${localFilters.equityMax}%, ${colors.border} 100%)`,
                  outline: 'none',
                  borderRadius: '3px',
                  zIndex: 1,
                  pointerEvents: 'auto'
                }}
              />
            </div>
            <p style={{ fontSize: '11px', color: colors.textTertiary, textAlign: 'center' }}>
              Show properties with {localFilters.equityMin}% to {localFilters.equityMax}% equity
            </p>
          </div>
        </div>

        {/* Tax Delinquent Minimum */}
        <div>
          <Label style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: spacing.sm, display: 'block' }}>
            Min Tax Delinquent
          </Label>
          <input
            type="number"
            placeholder="$0"
            value={localFilters.taxDelinquentMin || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, taxDelinquentMin: parseInt(e.target.value) || 0 })}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: colors.surfaceElevated,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              color: colors.textPrimary,
              fontSize: '14px'
            }}
          />
        </div>

        {/* Boolean Flags */}
        <div>
          <Label style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: spacing.md, display: 'block' }}>
            Property Flags
          </Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <FilterSwitch 
              label="High Equity Only" 
              checked={localFilters.highEquity} 
              onChange={(val) => setLocalFilters({ ...localFilters, highEquity: val })}
            />
            <FilterSwitch 
              label="Foreclosure" 
              checked={localFilters.foreclosure} 
              onChange={(val) => setLocalFilters({ ...localFilters, foreclosure: val })}
            />
            <FilterSwitch 
              label="Underwater" 
              checked={localFilters.underwater} 
              onChange={(val) => setLocalFilters({ ...localFilters, underwater: val })}
            />
            <FilterSwitch 
              label="Bankruptcy" 
              checked={localFilters.bankruptcy} 
              onChange={(val) => setLocalFilters({ ...localFilters, bankruptcy: val })}
            />
            <FilterSwitch 
              label="Cash Buyer" 
              checked={localFilters.cashBuyer} 
              onChange={(val) => setLocalFilters({ ...localFilters, cashBuyer: val })}
            />
          </div>
        </div>

        {/* Owner Occupied Filter */}
        <div>
          <Label style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: spacing.sm, display: 'block' }}>
            Owner Occupancy
          </Label>
          <select
            value={localFilters.ownerOccupied === null ? 'all' : localFilters.ownerOccupied ? 'yes' : 'no'}
            onChange={(e) => {
              const val = e.target.value === 'all' ? null : e.target.value === 'yes';
              setLocalFilters({ ...localFilters, ownerOccupied: val });
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: colors.surfaceElevated,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              color: colors.textPrimary,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Properties</option>
            <option value="no">Absentee Only</option>
            <option value="yes">Owner Occupied Only</option>
          </select>
        </div>

        {/* Quick Presets */}
        <div>
          <Label style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: spacing.sm, display: 'block' }}>
            Quick Presets
          </Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
            <Button
              variant="outline"
              onClick={() => setLocalFilters({
                ...localFilters,
                equityMin: 50,
                ownerOccupied: false,
                highEquity: true
              })}
              style={{
                background: colors.surfaceElevated,
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                justifyContent: 'flex-start'
              }}
            >
              <Sparkles size={14} className="mr-2" />
              High Equity Absentee Landlords
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocalFilters({
                ...localFilters,
                foreclosure: true,
                taxDelinquentMin: 5000
              })}
              style={{
                background: colors.surfaceElevated,
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                justifyContent: 'flex-start'
              }}
            >
              <Sparkles size={14} className="mr-2" />
              Distressed Properties
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{
        padding: spacing.lg,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        gap: spacing.sm
      }}>
        <Button
          variant="outline"
          onClick={handleReset}
          style={{
            flex: 1,
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.textSecondary
          }}
        >
          Reset All
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
          Apply Filters
        </Button>
      </div>
    </div>
  );
};

const FilterSwitch = ({ label, checked, onChange }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    background: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    border: checked ? `1px solid ${colors.primary}40` : `1px solid ${colors.border}`
  }}>
    <Label style={{ fontSize: '14px', color: colors.textPrimary, cursor: 'pointer' }}>
      {label}
    </Label>
    <Switch 
      checked={checked} 
      onCheckedChange={onChange}
    />
  </div>
);

export default AdvancedFilters;
