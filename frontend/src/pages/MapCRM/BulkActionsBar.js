import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { supabase } from '../../supabaseClient';
import { API } from '../../App';
import { toast } from 'sonner';
import { colors, shadows, borderRadius, spacing, gradients } from '../../styles/designSystem';
import { CheckSquare, UserPlus, Trash2, FileDown, X } from 'lucide-react';

const BulkActionsBar = ({ selectedCount, selectedIds, onComplete, onCancel }) => {
  const [loading, setLoading] = useState(false);

  const handleBulkClaim = async () => {
    if (!confirm(`Claim ${selectedCount} selected properties?`)) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${API}/map-crm/properties/bulk-claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedIds)
      });

      if (!response.ok) throw new Error('Bulk claim failed');
      
      const data = await response.json();
      toast.success(`Claimed ${data.claimed_count} properties`);
      onComplete();
    } catch (error) {
      console.error('Bulk claim error:', error);
      toast.error('Failed to claim properties');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusChange = async (status) => {
    if (!confirm(`Change ${selectedCount} properties to "${status}" status?`)) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${API}/map-crm/properties/bulk-status-change`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          property_ids: selectedIds,
          new_status: status
        })
      });

      if (!response.ok) throw new Error('Bulk status change failed');
      
      const data = await response.json();
      toast.success(data.message);
      onComplete();
    } catch (error) {
      console.error('Bulk status change error:', error);
      toast.error('Failed to change status');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      // Get full property data from context/parent
      // For now, we'll export selected property IDs
      // In production, you'd fetch full property data
      
      // Create CSV header
      const headers = [
        'ID', 'Address', 'City', 'State', 'ZIP', 'Asset Type',
        'Asking Price', 'Building Size', 'Lot Size', 'Status',
        'Equity %', 'Tax Delinquent', 'Created At'
      ];
      
      // Create CSV rows - note: we only have IDs, so create a minimal export
      // In a full implementation, pass full property objects
      const rows = selectedIds.map(id => [
        id,
        '', '', '', '', '', // Empty fields - would need full data
        '', '', '', '', '', '', ''
      ]);
      
      // Convert to CSV string
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `dealvisor_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${selectedCount} properties to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export properties');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: spacing.xl,
      left: '50%',
      transform: 'translateX(-50%)',
      background: colors.surfaceCard,
      border: `1px solid ${colors.border}`,
      borderRadius: borderRadius.lg,
      boxShadow: shadows.xl,
      padding: spacing.md,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md,
      zIndex: 100,
      minWidth: '600px'
    }}>
      {/* Selection Info */}
      <div style={{
        padding: `${spacing.sm} ${spacing.md}`,
        background: `${colors.primary}20`,
        borderRadius: borderRadius.sm,
        border: `1px solid ${colors.primary}40`
      }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>
          {selectedCount} selected
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: spacing.sm, flex: 1 }}>
        <Button
          onClick={handleBulkClaim}
          disabled={loading}
          size="sm"
          style={{
            background: gradients.primaryButton,
            border: 'none',
            boxShadow: shadows.glowCyan
          }}
        >
          <UserPlus size={14} className="mr-2" />
          Claim All
        </Button>

        <Button
          onClick={() => handleBulkStatusChange('dead')}
          disabled={loading}
          variant="outline"
          size="sm"
          style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.textSecondary
          }}
        >
          <Trash2 size={14} className="mr-2" />
          Mark as Dead
        </Button>

        <Button
          onClick={handleExport}
          disabled={loading}
          variant="outline"
          size="sm"
          style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.textSecondary
          }}
        >
          <FileDown size={14} className="mr-2" />
          Export
        </Button>
      </div>

      {/* Cancel */}
      <button
        onClick={onCancel}
        style={{
          background: 'transparent',
          border: 'none',
          color: colors.textTertiary,
          cursor: 'pointer',
          padding: spacing.sm
        }}
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default BulkActionsBar;
