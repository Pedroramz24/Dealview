// Column configuration with rendering logic
export const COLUMN_CONFIG = {
  address: {
    label: 'Address',
    width: '1fr',
    render: (property) => (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '14px', fontWeight: '500', marginBottom: '2px' }}>
          {property.title || property.address}
        </span>
        <span style={{ fontSize: '12px', opacity: 0.7 }}>
          {property.address}
        </span>
      </div>
    )
  },
  city: {
    label: 'City',
    width: '150px',
    render: (property) => `${property.city}, ${property.state}`
  },
  asset_type: {
    label: 'Asset Type',
    width: '120px',
    render: (property, ASSET_COLORS, borderRadius) => (
      <span style={{
        fontSize: '12px',
        fontWeight: '500',
        color: ASSET_COLORS[property.asset_type],
        padding: '4px 8px',
        background: `${ASSET_COLORS[property.asset_type]}15`,
        borderRadius: borderRadius.sm,
        display: 'inline-block'
      }}>
        {property.asset_type}
      </span>
    )
  },
  asking_price: {
    label: 'Asking Price',
    width: '140px',
    render: (property, _, __, formatCurrency) => (
      <span style={{ fontSize: '14px', fontWeight: '600' }}>
        {formatCurrency(property.asking_price)}
      </span>
    )
  },
  building_size: {
    label: 'Size',
    width: '120px',
    render: (property, _, __, formatCurrency, formatNumber) => (
      <span style={{ fontSize: '13px' }}>
        {formatNumber(property.building_size, 'sqft')}
      </span>
    )
  },
  status: {
    label: 'Status',
    width: '100px',
    render: (property, ASSET_COLORS, borderRadius, formatCurrency, formatNumber, formatPercent, colors) => (
      <span style={{
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        padding: '3px 8px',
        borderRadius: borderRadius.sm,
        display: 'inline-block',
        background: property.status === 'available' ? `${colors.success}20` :
                    property.status === 'claimed' ? `${colors.primary}20` :
                    property.status === 'converted' ? `${colors.warning}20` :
                    `${colors.textMuted}20`,
        color: property.status === 'available' ? colors.success :
               property.status === 'claimed' ? colors.primary :
               property.status === 'converted' ? colors.warning :
               colors.textMuted
      }}>
        {property.status}
      </span>
    )
  },
  est_value: {
    label: 'Est Value',
    width: '140px',
    render: (property, _, __, formatCurrency) => formatCurrency(property.est_value)
  },
  est_equity_percent: {
    label: 'Equity %',
    width: '100px',
    render: (property, _, __, formatCurrency, formatNumber, formatPercent, colors) => (
      <span style={{ 
        fontWeight: '600',
        color: property.est_equity_percent > 50 ? colors.success : 'inherit'
      }}>
        {formatPercent(property.est_equity_percent)}
      </span>
    )
  },
  tax_delinquent_dollars: {
    label: 'Tax Delinquent',
    width: '130px',
    render: (property, _, __, formatCurrency, formatNumber, formatPercent, colors) => (
      <span style={{ 
        fontWeight: '600',
        color: property.tax_delinquent_dollars > 0 ? colors.warning : 'inherit'
      }}>
        {formatCurrency(property.tax_delinquent_dollars)}
      </span>
    )
  },
  beds: {
    label: 'Beds',
    width: '80px',
    render: (property) => property.beds || '—'
  },
  baths: {
    label: 'Baths',
    width: '80px',
    render: (property) => property.baths || '—'
  },
  owner_name: {
    label: 'Owner',
    width: '180px',
    render: (property) => property.owner_name || '—'
  },
  owner_type: {
    label: 'Owner Type',
    width: '120px',
    render: (property) => property.owner_type || '—'
  },
  county: {
    label: 'County',
    width: '120px',
    render: (property) => property.county || '—'
  },
  year_built: {
    label: 'Year',
    width: '80px',
    render: (property) => property.year_built || '—'
  },
  purchase_date: {
    label: 'Purchase Date',
    width: '120px',
    render: (property) => property.purchase_date ? new Date(property.purchase_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'
  },
  purchase_amount: {
    label: 'Purchase Amt',
    width: '130px',
    render: (property, _, __, formatCurrency) => formatCurrency(property.purchase_amount)
  },
  lot_size: {
    label: 'Lot Size',
    width: '100px',
    render: (property) => property.lot_size ? `${property.lot_size} ac` : '—'
  },
  zoning: {
    label: 'Zoning',
    width: '100px',
    render: (property) => property.zoning || '—'
  },
  apn: {
    label: 'APN',
    width: '140px',
    render: (property) => property.apn || '—'
  }
};
