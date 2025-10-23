import React, { useState, useRef, useContext } from 'react';
import { X, Save, MapPin, DollarSign, Building2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../App';
import { toast } from 'sonner';
import { getAssetTypeColor } from '../utils/assetTypeColors';
import { formatNumberWithCommas, parseFormattedNumber } from '../utils/numberInput';

const CreateDealPanel = ({ isOpen, onClose, location, parcelData, onDealCreated }) => {
  const { user } = useContext(AuthContext);
  const [isSaving, setIsSaving] = useState(false);

  // Refs for uncontrolled inputs
  const titleRef = useRef(null);
  const addressRef = useRef(null);
  const assetTypeRef = useRef(null);
  const priceRef = useRef(null);
  const stageRef = useRef(null);
  const sizeRef = useRef(null);
  const lotSizeRef = useRef(null);
  const notesRef = useRef(null);

  if (!isOpen) return null;

  const handleCreateDeal = async () => {
    if (!user) {
      toast.error('You must be logged in to create a deal');
      return;
    }

    setIsSaving(true);
    try {
      const newDeal = {
        owner_id: user.id,
        title: titleRef.current?.value || 'New Property',
        address: addressRef.current?.value || parcelData?.address || 'Address TBD',
        asset_type: assetTypeRef.current?.value || 'Office',
        price: priceRef.current?.value ? parseFloat(priceRef.current.value.replace(/,/g, '')) : null,
        stage: stageRef.current?.value || 'need_to_contact',
        status: stageRef.current?.value || 'need_to_contact',
        size: sizeRef.current?.value ? parseFloat(sizeRef.current.value.replace(/,/g, '')) : null,
        lot_size: lotSizeRef.current?.value ? parseFloat(lotSizeRef.current.value) : parcelData?.lot_size || null,
        notes: notesRef.current?.value || null,
        latitude: location?.lat || parcelData?.latitude || null,
        longitude: location?.lng || parcelData?.longitude || null,
        zoning: parcelData?.zoning || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('deals')
        .insert([newDeal])
        .select()
        .single();

      if (error) throw error;

      toast.success('Deal created successfully!');
      onDealCreated(data);
      onClose();
    } catch (error) {
      console.error('Error creating deal:', error);
      toast.error('Failed to create deal: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: isOpen ? 0 : '-500px',
        width: '500px',
        height: '100vh',
        background: 'rgba(11, 12, 14, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
        transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2
          style={{
            color: '#FFFFFF',
            fontSize: '16px',
            fontWeight: '600',
            letterSpacing: '-0.02em',
          }}
        >
          Create New Deal
        </h2>
        <button
          onClick={onClose}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            color: 'rgba(255, 255, 255, 0.6)',
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Form Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          padding: '24px',
        }}
        className="custom-scrollbar"
      >
        {/* Location Info Banner */}
        {(location || parcelData) && (
          <div
            style={{
              padding: '16px',
              background: 'rgba(0, 184, 212, 0.1)',
              border: '1px solid rgba(0, 184, 212, 0.3)',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <MapPin size={16} style={{ color: '#00b8d4' }} />
              <span style={{ color: '#00b8d4', fontSize: '13px', fontWeight: '600' }}>
                {parcelData ? 'Parcel Selected' : 'Location Marked'}
              </span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              {parcelData?.address || `Lat: ${location?.lat.toFixed(6)}, Lng: ${location?.lng.toFixed(6)}`}
            </div>
            {parcelData?.zoning && (
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginTop: '4px' }}>
                Zoning: {parcelData.zoning} | Lot: {parcelData.lot_size || 'N/A'} AC
              </div>
            )}
          </div>
        )}

        {/* Quick Create Form */}
        <div className="space-y-4">
          {/* Deal Title */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              Deal Title *
            </label>
            <input
              ref={titleRef}
              type="text"
              defaultValue={parcelData?.address || ''}
              placeholder="123 Main St Deal"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Address */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              Property Address *
            </label>
            <input
              ref={addressRef}
              type="text"
              defaultValue={parcelData?.address || ''}
              placeholder="123 Main St, San Antonio, TX"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Asset Type */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              Asset Type *
            </label>
            <select
              ref={assetTypeRef}
              defaultValue="Office"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '14px',
              }}
            >
              <option value="Office">Office</option>
              <option value="Retail">Retail</option>
              <option value="Industrial">Industrial</option>
              <option value="Multifamily">Multifamily</option>
              <option value="Land">Land</option>
              <option value="Mixed Use">Mixed Use</option>
            </select>
          </div>

          {/* Price */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              Asking Price
            </label>
            <input
              ref={priceRef}
              type="text"
              placeholder="2,500,000"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Stage */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              Deal Stage *
            </label>
            <select
              ref={stageRef}
              defaultValue="need_to_contact"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '14px',
              }}
            >
              <option value="need_to_contact">Need to Contact</option>
              <option value="contacted">Contacted</option>
              <option value="prospect">Prospect</option>
              <option value="negotiations">Negotiations</option>
              <option value="offer_sent">Offer Sent</option>
              <option value="under_contract">Under Contract</option>
              <option value="closed_won">Closed Won</option>
              <option value="overpriced">Overpriced</option>
            </select>
          </div>

          {/* Building Size */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              Building Size (SF)
            </label>
            <input
              ref={sizeRef}
              type="text"
              placeholder="10,000"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Lot Size */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              Lot Size (acres)
            </label>
            <input
              ref={lotSizeRef}
              type="text"
              defaultValue={parcelData?.lot_size || ''}
              placeholder="1.5"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              Notes
            </label>
            <textarea
              ref={notesRef}
              placeholder="Add notes about this property..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          gap: '12px',
        }}
      >
        <button
          onClick={onClose}
          disabled={isSaving}
          style={{
            flex: 1,
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleCreateDeal}
          disabled={isSaving}
          style={{
            flex: 2,
            padding: '12px',
            background: 'linear-gradient(135deg, #00b8d4 0%, #00d4aa 100%)',
            border: '1px solid rgba(0, 212, 170, 0.3)',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: '600',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 184, 212, 0.3)',
          }}
        >
          <Save size={16} />
          {isSaving ? 'Creating Deal...' : 'Create Deal'}
        </button>
      </div>
    </div>
  );
};

export default CreateDealPanel;
