import React from 'react';
import reportallService from '../services/reportallService';

/**
 * ParcelPopup Component
 * Displays parcel information in a dark-glass styled popup
 */
const ParcelPopup = ({ parcel, onClose, onCreateDeal }) => {
  if (!parcel) return null;

  const {
    parcel_id,
    address,
    owner,
    sale_price,
    trans_date,
    mkt_val_tot,
    mkt_val_land,
    mkt_val_bldg,
    acreage_calc,
    acreage_deeded,
    land_use_class,
    land_use_code,
    buildings,
    bldg_sqft,
    county_name,
    state_abbr,
    owner_occupied,
    usps_residential,
  } = parcel;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        background: 'rgba(17, 24, 39, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 0, 0, 0.3)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#ff0000',
            }}
          >
            {address || 'Parcel Details'}
          </h3>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            {county_name}, {state_abbr} • Parcel ID: {parcel_id}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '0 8px',
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {/* Owner Section */}
        <div style={{ marginBottom: '20px' }}>
          <h4
            style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 600,
              color: '#ff0000',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Owner Information
          </h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            <InfoRow label="Owner" value={owner} />
            <InfoRow
              label="Owner Occupied"
              value={owner_occupied ? 'Yes' : 'No'}
            />
            <InfoRow
              label="Property Type"
              value={usps_residential || 'N/A'}
            />
          </div>
        </div>

        {/* Financial Section */}
        <div style={{ marginBottom: '20px' }}>
          <h4
            style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 600,
              color: '#ff0000',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Financial Details
          </h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            <InfoRow
              label="Last Sale Price"
              value={reportallService.formatCurrency(sale_price)}
              highlight={!!sale_price}
            />
            <InfoRow
              label="Sale Date"
              value={reportallService.formatDate(trans_date)}
            />
            <InfoRow
              label="Total Market Value"
              value={reportallService.formatCurrency(mkt_val_tot)}
            />
            <InfoRow
              label="Land Value"
              value={reportallService.formatCurrency(mkt_val_land)}
            />
            <InfoRow
              label="Building Value"
              value={reportallService.formatCurrency(mkt_val_bldg)}
            />
          </div>
        </div>

        {/* Property Details Section */}
        <div style={{ marginBottom: '20px' }}>
          <h4
            style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 600,
              color: '#ff0000',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Property Details
          </h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            <InfoRow
              label="Acreage"
              value={reportallService.formatAcreage(
                acreage_calc || acreage_deeded
              )}
            />
            <InfoRow label="Land Use" value={land_use_class || 'N/A'} />
            <InfoRow label="Use Code" value={land_use_code || 'N/A'} />
            <InfoRow label="Buildings" value={buildings || '0'} />
            <InfoRow
              label="Building Sqft"
              value={bldg_sqft ? `${parseInt(bldg_sqft).toLocaleString()} sqft` : 'N/A'}
            />
          </div>
        </div>

        {/* Action Button */}
        {onCreateDeal && (
          <button
            onClick={() => onCreateDeal(parcel)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 0, 0, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Create Deal for this Property
          </button>
        )}
      </div>
    </div>
  );
};

// Info Row Component
const InfoRow = ({ label, value, highlight = false }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 0',
      fontSize: '13px',
    }}
  >
    <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{label}:</span>
    <span
      style={{
        color: highlight ? '#ff0000' : 'rgba(255, 255, 255, 0.9)',
        fontWeight: highlight ? 600 : 400,
      }}
    >
      {value || 'N/A'}
    </span>
  </div>
);

export default ParcelPopup;
