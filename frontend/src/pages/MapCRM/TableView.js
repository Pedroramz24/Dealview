import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMapCRM } from '../../contexts/MapCRMContext';
import ColumnSelector from './ColumnSelector';
import BulkActionsBar from './BulkActionsBar';
import { COLUMN_CONFIG } from './columnConfig';
import { colors, shadows, borderRadius, transitions, spacing } from '../../styles/designSystem';
import { 
  MapPin, DollarSign, Building2, Calendar, User, 
  ChevronUp, ChevronDown, Search, Filter, Columns
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';

// Utility functions for formatting
const formatCurrency = (value) => {
  if (!value && value !== 0) return '—';
  return `$${value.toLocaleString('en-US')}`;
};

const formatNumber = (value, suffix = '') => {
  if (!value && value !== 0) return '—';
  return `${value.toLocaleString('en-US')}${suffix ? ' ' + suffix : ''}`;
};

const formatPercent = (value) => {
  if (!value && value !== 0) return '—';
  return `${value.toFixed(1)}%`;
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-US');
  } catch {
    return dateString;
  }
};

const TableView = ({ filters: parentFilters }) => {
  const { properties, setSelectedProperty, fetchProperties } = useMapCRM();
  const navigate = useNavigate();
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState('all');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(['address', 'city', 'asset_type', 'asking_price', 'building_size', 'status']);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  
  // Use parent filters if provided, otherwise use defaults
  const advancedFilters = parentFilters || {
    equityMin: 0,
    equityMax: 100,
    taxDelinquentMin: 0,
    highEquity: false,
    foreclosure: false,
    underwater: false,
    bankruptcy: false,
    ownerOccupied: null,
    cashBuyer: false
  };

  // Get unique asset types
  const assetTypes = useMemo(() => {
    const types = [...new Set(properties.map(p => p.asset_type))];
    return types.sort();
  }, [properties]);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let filtered = [...properties];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.address?.toLowerCase().includes(query) ||
        p.city?.toLowerCase().includes(query) ||
        p.state?.toLowerCase().includes(query) ||
        p.title?.toLowerCase().includes(query) ||
        p.owner_name?.toLowerCase().includes(query)
      );
    }

    // Asset type filter
    if (assetTypeFilter !== 'all') {
      filtered = filtered.filter(p => p.asset_type === assetTypeFilter);
    }

    // Advanced Filters
    
    // Equity % range
    filtered = filtered.filter(p => {
      if (p.est_equity_percent === null || p.est_equity_percent === undefined) return true;
      return p.est_equity_percent >= advancedFilters.equityMin && 
             p.est_equity_percent <= advancedFilters.equityMax;
    });

    // Tax Delinquent minimum
    if (advancedFilters.taxDelinquentMin > 0) {
      filtered = filtered.filter(p => 
        p.tax_delinquent_dollars && p.tax_delinquent_dollars >= advancedFilters.taxDelinquentMin
      );
    }

    // Boolean flags
    if (advancedFilters.highEquity) {
      filtered = filtered.filter(p => p.high_equity === true);
    }
    if (advancedFilters.foreclosure) {
      filtered = filtered.filter(p => p.foreclosure === true);
    }
    if (advancedFilters.underwater) {
      filtered = filtered.filter(p => p.underwater === true);
    }
    if (advancedFilters.bankruptcy) {
      filtered = filtered.filter(p => p.bankruptcy === true);
    }
    if (advancedFilters.cashBuyer) {
      filtered = filtered.filter(p => p.cash_buyer === true);
    }

    // Owner Occupancy filter
    if (advancedFilters.ownerOccupied !== null) {
      filtered = filtered.filter(p => p.owner_occupied === advancedFilters.ownerOccupied);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [properties, searchQuery, assetTypeFilter, advancedFilters, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const togglePropertySelection = (propertyId) => {
    if (selectedProperties.includes(propertyId)) {
      setSelectedProperties(selectedProperties.filter(id => id !== propertyId));
    } else {
      setSelectedProperties([...selectedProperties, propertyId]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProperties.length === filteredProperties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(filteredProperties.map(p => p.id));
    }
  };

  const handleBulkComplete = () => {
    setSelectedProperties([]);
    setBulkSelectMode(false);
    fetchProperties(); // Refresh
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp size={14} style={{ opacity: 0.3 }} />;
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} style={{ color: colors.primary }} />
      : <ChevronDown size={14} style={{ color: colors.primary }} />;
  };

  const ASSET_COLORS = {
    'Gas': '#ef4444',
    'Retail': '#3b82f6',
    'Industrial': '#f97316',
    'Office': '#22c55e',
    'Land': '#92400e',
    'Multifamily': '#a855f7'
  };

  if (properties.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: colors.void
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <Building2 size={48} style={{ color: colors.textMuted, margin: '0 auto 16px' }} />
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: colors.textPrimary,
            marginBottom: '8px'
          }}>
            No properties to display
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: colors.textTertiary 
          }}>
            Import a CSV file to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: colors.void,
      padding: spacing.lg
    }}>
      {/* Filters Bar */}
      <div style={{
        display: 'flex',
        gap: spacing.md,
        marginBottom: spacing.lg
      }}>
        {/* Search */}
        <div style={{
          flex: 1,
          position: 'relative'
        }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.textTertiary
          }} />
          <input
            type="text"
            placeholder="Search by address, city, owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              background: colors.surfaceCard,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              color: colors.textPrimary,
              fontSize: '14px',
              transition: transitions.fast,
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = colors.primary;
              e.target.style.boxShadow = shadows.glowCyan;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = colors.border;
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Asset Type Filter */}
        <div style={{ position: 'relative' }}>
          <Filter size={18} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.textTertiary,
            pointerEvents: 'none'
          }} />
          <select
            value={assetTypeFilter}
            onChange={(e) => setAssetTypeFilter(e.target.value)}
            style={{
              padding: '10px 12px 10px 40px',
              background: colors.surfaceCard,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.md,
              color: colors.textPrimary,
              fontSize: '14px',
              cursor: 'pointer',
              transition: transitions.fast,
              outline: 'none',
              minWidth: '180px'
            }}
          >
            <option value="all">All Asset Types</option>
            {assetTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Columns Button */}
        <Button
          onClick={() => setShowColumnSelector(true)}
          style={{
            background: colors.surfaceCard,
            border: `1px solid ${colors.border}`,
            color: colors.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            transition: transitions.fast
          }}
        >
          <Columns size={16} />
          Columns
        </Button>

        {/* Bulk Select Toggle */}
        <Button
          onClick={() => {
            setBulkSelectMode(!bulkSelectMode);
            setSelectedProperties([]);
          }}
          style={{
            background: bulkSelectMode ? `${colors.primary}20` : colors.surfaceCard,
            border: bulkSelectMode ? `1px solid ${colors.primary}` : `1px solid ${colors.border}`,
            color: bulkSelectMode ? colors.primary : colors.textSecondary,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            transition: transitions.fast
          }}
        >
          <CheckSquare size={16} />
          {bulkSelectMode ? 'Cancel Select' : 'Bulk Select'}
        </Button>

        {/* Results Count */}
        <div style={{
          padding: '10px 16px',
          background: colors.surfaceCard,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.md,
          color: colors.textSecondary,
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap'
        }}>
          {filteredProperties.length} properties
        </div>
      </div>

      {/* Table */}
      <div style={{
        flex: 1,
        background: colors.surfaceCard,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.border}`,
        boxShadow: shadows.cardElevation,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: bulkSelectMode 
            ? `40px ${visibleColumns.map(col => COLUMN_CONFIG[col]?.width || '1fr').join(' ')}`
            : visibleColumns.map(col => COLUMN_CONFIG[col]?.width || '1fr').join(' '),
          padding: `${spacing.md} ${spacing.lg}`,
          background: colors.surfaceElevated,
          borderBottom: `1px solid ${colors.border}`,
          gap: spacing.md
        }}>
          {/* Select All Checkbox */}
          {bulkSelectMode && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Checkbox
                checked={selectedProperties.length === filteredProperties.length && filteredProperties.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </div>
          )}
          
          {visibleColumns.map(colKey => {
            const col = COLUMN_CONFIG[colKey];
            if (!col) return null;
            
            return (
              <button
                key={colKey}
                onClick={() => handleSort(colKey)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: colors.textTertiary,
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  transition: transitions.fast
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = colors.primary}
                onMouseLeave={(e) => e.currentTarget.style.color = colors.textTertiary}
              >
                {col.label}
                <SortIcon field={colKey} />
              </button>
            );
          })}
        </div>

        {/* Table Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto'
        }}>
          {filteredProperties.map((property, index) => (
            <div
              key={property.id}
              onClick={(e) => {
                if (bulkSelectMode) {
                  e.stopPropagation();
                  togglePropertySelection(property.id);
                } else {
                  navigate(`/internal/map-crm/property/${property.id}`);
                }
              }}
              style={{
                display: 'grid',
                gridTemplateColumns: bulkSelectMode 
                  ? `40px ${visibleColumns.map(col => COLUMN_CONFIG[col]?.width || '1fr').join(' ')}`
                  : visibleColumns.map(col => COLUMN_CONFIG[col]?.width || '1fr').join(' '),
                padding: `${spacing.md} ${spacing.lg}`,
                borderBottom: index < filteredProperties.length - 1 ? `1px solid ${colors.border}` : 'none',
                gap: spacing.md,
                cursor: 'pointer',
                transition: transitions.fast,
                background: selectedProperties.includes(property.id) ? `${colors.primary}10` : colors.surfaceCard,
                border: selectedProperties.includes(property.id) ? `1px solid ${colors.primary}40` : 'none'
              }}
              onMouseEnter={(e) => {
                if (!selectedProperties.includes(property.id)) {
                  e.currentTarget.style.background = colors.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (!selectedProperties.includes(property.id)) {
                  e.currentTarget.style.background = colors.surfaceCard;
                }
              }}
            >
              {/* Checkbox for bulk select */}
              {bulkSelectMode && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Checkbox
                    checked={selectedProperties.includes(property.id)}
                    onCheckedChange={() => togglePropertySelection(property.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              
              {visibleColumns.map(colKey => {
                const col = COLUMN_CONFIG[colKey];
                if (!col) return <div key={colKey}>—</div>;
                
                const value = typeof col.render === 'function' 
                  ? col.render(property, ASSET_COLORS, borderRadius, formatCurrency, formatNumber, formatPercent, colors)
                  : property[colKey] || '—';

                return (
                  <div key={colKey} style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    color: colors.textSecondary,
                    fontSize: '14px'
                  }}>
                    {value}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Column Selector Panel */}
      {showColumnSelector && (
        <ColumnSelector
          visibleColumns={visibleColumns}
          setVisibleColumns={setVisibleColumns}
          onClose={() => setShowColumnSelector(false)}
        />
      )}

      {/* Bulk Actions Bar */}
      {bulkSelectMode && selectedProperties.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedProperties.length}
          selectedIds={selectedProperties}
          onComplete={handleBulkComplete}
          onCancel={() => {
            setSelectedProperties([]);
            setBulkSelectMode(false);
          }}
        />
      )}
    </div>
  );
};

export default TableView;
