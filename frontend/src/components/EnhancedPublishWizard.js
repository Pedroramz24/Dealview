import React, { useState, useEffect } from 'react';
import { X, Check, ChevronRight, ChevronLeft, AlertCircle, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../App';

const SALE_CONDITIONS = [
  '1031 Exchange', 'Build to Suit', 'Shell Condition', 
  'Bulk/Portfolio Sale', 'Deferred Maintenance', 'Distress Sale',
  'Ground Lease (Leased Fee)', 'Ground Lease (Leasehold)',
  'High Vacancy Property', 'Lease Option', 'Redevelopment Project',
  'REO Sale', 'Sale Leaseback', 'Short Sale'
];

const BUILDING_STATUS_OPTIONS = ['Existing', 'Under Construction', 'Under Renovation'];
const SECONDARY_TYPE_OPTIONS = ['Commercial', 'Industrial', 'Residential', 'Agricultural'];
const TOPOGRAPHY_OPTIONS = ['Level', 'Rolling', 'Sloping', 'Steep'];
const GRADING_OPTIONS = [
  'Asphalt Paved', 'Finish Grade', 'Finished Lot',
  'Previously Developed Lot', 'Raw Land', 'Agricultural Land'
];

const EnhancedPublishWizard = ({ dealId, deal, onClose, onPublished }) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [completeness, setCompleteness] = useState(null);
  
  const [formData, setFormData] = useState({
    // Property Type
    is_land_listing: false,
    
    // Basic (Required)
    public_asset_type: '',
    public_market: '',
    public_price: '',
    public_strategy: 'Core',
    
    // Financial
    cap_rate: '',
    noi: '',
    
    // Sale Details
    sale_conditions: [],
    sale_notes: '',
    highlights: [''],
    seller_commitment_level: 'written_auth', // Default to written auth
    
    // Media
    image_urls: [],
    brochure_document_ids: [],
    
    // Property Fields
    building_status: '',
    buildings: '',
    units: '',
    gba: '',
    floors: '',
    year_built: '',
    year_renovated: '',
    metering: '',
    construction: '',
    parking: '',
    land_area: '',
    zoning: '',
    zoning_description: '',
    unit_mix: {},
    
    // Land Fields
    lot_number: '',
    lot_size: '',
    lot_description: '',
    secondary_type: '',
    topography: '',
    grading: ''
  });

  useEffect(() => {
    // Auto-fill from existing deal data
    if (deal) {
      setFormData(prev => ({
        ...prev,
        public_asset_type: deal.asset_type || deal.public_asset_type || '',
        public_market: deal.city || deal.public_market || '',
        public_price: deal.price || deal.public_price || '',
        image_urls: deal.image_urls || (deal.image_url ? [deal.image_url] : []),
        zoning: deal.zoning || '',
        land_area: deal.lot_size || deal.land_area || ''
      }));
    }
  }, [deal]);

  // Fetch completeness score
  const fetchCompleteness = async () => {
    try {
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      const response = await fetch(`${API}/deals/${dealId}/completeness`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCompleteness(data.completeness);
      }
    } catch (error) {
      console.error('Error fetching completeness:', error);
    }
  };

  useEffect(() => {
    fetchCompleteness();
  }, [dealId]);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const { data: { session } } = await (await import('../supabaseClient')).supabase.auth.getSession();
      
      // Clean up data - remove empty strings and convert to proper types
      const cleanedData = {};
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (value !== '' && value !== null && value !== undefined) {
          if (Array.isArray(value) && value.length === 0) return;
          if (typeof value === 'string' && value.trim() === '') return;
          
          // Convert numeric strings to numbers
          if (['public_price', 'cap_rate', 'noi', 'gba', 'land_area', 'lot_size', 
               'buildings', 'units', 'floors', 'year_built', 'year_renovated'].includes(key)) {
            cleanedData[key] = value ? parseFloat(value) : null;
          } else {
            cleanedData[key] = value;
          }
        }
      });

      const response = await fetch(`${API}/deals/${dealId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedData)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to publish');
      }

      if (data.can_publish) {
        toast.success(data.message || 'Deal submitted for approval!');
        onPublished?.(data);
        onClose();
      } else {
        toast.error(data.message || 'Listing incomplete');
        // Show which step has missing fields
        setCompleteness(data);
      }
      
    } catch (error) {
      console.error('Publish error:', error);
      toast.error(error.message || 'Failed to publish deal');
    } finally {
      setSubmitting(false);
    }
  };

  const updateFormData = (updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const toggleSaleCondition = (condition) => {
    setFormData(prev => ({
      ...prev,
      sale_conditions: prev.sale_conditions.includes(condition)
        ? prev.sale_conditions.filter(c => c !== condition)
        : [...prev.sale_conditions, condition]
    }));
  };

  const addHighlight = () => {
    setFormData(prev => ({
      ...prev,
      highlights: [...prev.highlights, '']
    }));
  };

  const updateHighlight = (index, value) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.map((h, i) => i === index ? value : h)
    }));
  };

  const removeHighlight = (index) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  };

  const renderProgressBar = () => {
    const score = completeness?.total_score || 0;
    const canPublish = score >= 80;
    
    return (
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '500' }}>
            Listing Completeness
          </span>
          <span style={{ 
            color: canPublish ? '#10b981' : '#f59e0b', 
            fontSize: '16px', 
            fontWeight: '700' 
          }}>
            {score}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${score}%`,
            height: '100%',
            background: canPublish 
              ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
            transition: 'width 0.3s ease'
          }} />
        </div>
        {!canPublish && (
          <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={14} />
            Need 80% to publish
          </p>
        )}
      </div>
    );
  };

  const renderStep1 = () => (
    <div style={{ padding: '32px' }}>
      <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>
        Step 1: Property Type
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <button
          type="button"
          onClick={() => updateFormData({ is_land_listing: false })}
          style={{
            padding: '24px',
            background: !formData.is_land_listing ? 'rgba(0, 184, 212, 0.1)' : 'rgba(255,255,255,0.05)',
            border: !formData.is_land_listing ? '2px solid #00b8d4' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Building2 size={32} style={{ marginBottom: '8px', color: !formData.is_land_listing ? '#00b8d4' : 'rgba(255,255,255,0.5)' }} />
          <div style={{ fontWeight: '600' }}>Property</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            Building, Retail, Office, etc.
          </div>
        </button>

        <button
          type="button"
          onClick={() => updateFormData({ is_land_listing: true })}
          style={{
            padding: '24px',
            background: formData.is_land_listing ? 'rgba(0, 184, 212, 0.1)' : 'rgba(255,255,255,0.05)',
            border: formData.is_land_listing ? '2px solid #00b8d4' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color: '#fff',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <MapPin size={32} style={{ marginBottom: '8px', color: formData.is_land_listing ? '#00b8d4' : 'rgba(255,255,255,0.5)' }} />
          <div style={{ fontWeight: '600' }}>Land</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            Lot, Parcel, Raw Land
          </div>
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={{ padding: '32px' }}>
      <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>
        Step 2: Basic Information
      </h3>

      <div style={{ display: 'grid', gap: '20px' }}>
        <div>
          <label style={labelStyle}>Asset Type *</label>
          <input
            type="text"
            required
            value={formData.public_asset_type}
            onChange={(e) => updateFormData({ public_asset_type: e.target.value })}
            placeholder="e.g., Retail, Office, Multifamily"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Market/City *</label>
          <input
            type="text"
            required
            value={formData.public_market}
            onChange={(e) => updateFormData({ public_market: e.target.value })}
            placeholder="e.g., San Antonio, Austin"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Price *</label>
          <input
            type="number"
            required
            value={formData.public_price}
            onChange={(e) => updateFormData({ public_price: e.target.value })}
            placeholder="e.g., 2500000"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Investment Strategy</label>
          <select
            value={formData.public_strategy}
            onChange={(e) => updateFormData({ public_strategy: e.target.value })}
            style={inputStyle}
          >
            <option value="Core">Core</option>
            <option value="Core+">Core+</option>
            <option value="Value-Add">Value-Add</option>
            <option value="Development">Development</option>
            <option value="Reposition">Reposition</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={{ padding: '32px' }}>
      <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>
        Step 3: Financial Details & Sale Conditions
      </h3>

      <div style={{ display: 'grid', gap: '20px' }}>
        {/* Only show CAP Rate and NOI for Property listings, not Land */}
        {!formData.is_land_listing && (
          <>
            <div>
              <label style={labelStyle}>CAP Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.cap_rate}
                onChange={(e) => updateFormData({ cap_rate: e.target.value })}
                placeholder="e.g., 6.5"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>NOI (Net Operating Income)</label>
              <input
                type="number"
                value={formData.noi}
                onChange={(e) => updateFormData({ noi: e.target.value })}
                placeholder="e.g., 150000"
                style={inputStyle}
              />
            </div>
          </>
        )}

        <div>
          <label style={labelStyle}>Sale Conditions</label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '8px',
            marginTop: '8px'
          }}>
            {SALE_CONDITIONS.map(condition => (
              <label key={condition} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                background: formData.sale_conditions.includes(condition) ? 'rgba(0, 184, 212, 0.1)' : 'rgba(255,255,255,0.03)',
                border: formData.sale_conditions.includes(condition) ? '1px solid #00b8d4' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.9)'
              }}>
                <input
                  type="checkbox"
                  checked={formData.sale_conditions.includes(condition)}
                  onChange={() => toggleSaleCondition(condition)}
                  style={{ marginRight: '8px' }}
                />
                {condition}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Sale Notes</label>
          <textarea
            value={formData.sale_notes}
            onChange={(e) => updateFormData({ sale_notes: e.target.value })}
            placeholder="Additional information about the sale..."
            rows={4}
            style={{...inputStyle, resize: 'vertical'}}
          />
        </div>
      </div>
    </div>
  );

  const renderStep4Property = () => (
    <div style={{ padding: '32px' }}>
      <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>
        Step 4: Property Details
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <label style={labelStyle}>Building Status</label>
          <select
            value={formData.building_status}
            onChange={(e) => updateFormData({ building_status: e.target.value })}
            style={inputStyle}
          >
            <option value="">Select...</option>
            {BUILDING_STATUS_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Buildings</label>
          <input
            type="number"
            value={formData.buildings}
            onChange={(e) => updateFormData({ buildings: e.target.value })}
            placeholder="Number of buildings"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Units</label>
          <input
            type="number"
            value={formData.units}
            onChange={(e) => updateFormData({ units: e.target.value })}
            placeholder="Number of units"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>GBA (sq ft)</label>
          <input
            type="number"
            value={formData.gba}
            onChange={(e) => updateFormData({ gba: e.target.value })}
            placeholder="Gross Building Area"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Floors</label>
          <input
            type="number"
            value={formData.floors}
            onChange={(e) => updateFormData({ floors: e.target.value })}
            placeholder="Number of floors"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Year Built</label>
          <input
            type="number"
            value={formData.year_built}
            onChange={(e) => updateFormData({ year_built: e.target.value })}
            placeholder="e.g., 2005"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Year Renovated</label>
          <input
            type="number"
            value={formData.year_renovated}
            onChange={(e) => updateFormData({ year_renovated: e.target.value })}
            placeholder="e.g., 2020"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Metering</label>
          <input
            type="text"
            value={formData.metering}
            onChange={(e) => updateFormData({ metering: e.target.value })}
            placeholder="e.g., Individual"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Construction</label>
          <input
            type="text"
            value={formData.construction}
            onChange={(e) => updateFormData({ construction: e.target.value })}
            placeholder="e.g., Steel Frame"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Parking</label>
          <input
            type="text"
            value={formData.parking}
            onChange={(e) => updateFormData({ parking: e.target.value })}
            placeholder="e.g., 50 spaces"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Land Area (acres)</label>
          <input
            type="number"
            step="0.01"
            value={formData.land_area}
            onChange={(e) => updateFormData({ land_area: e.target.value })}
            placeholder="e.g., 2.5"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Zoning</label>
          <input
            type="text"
            value={formData.zoning}
            onChange={(e) => updateFormData({ zoning: e.target.value })}
            placeholder="e.g., C-2"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={labelStyle}>Zoning Description</label>
        <textarea
          value={formData.zoning_description}
          onChange={(e) => updateFormData({ zoning_description: e.target.value })}
          placeholder="Describe the zoning..."
          rows={3}
          style={{...inputStyle, resize: 'vertical'}}
        />
      </div>
    </div>
  );

  const renderStep4Land = () => (
    <div style={{ padding: '32px' }}>
      <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>
        Step 4: Land Details
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <label style={labelStyle}>Lot Number</label>
          <input
            type="text"
            value={formData.lot_number}
            onChange={(e) => updateFormData({ lot_number: e.target.value })}
            placeholder="e.g., Lot 42"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Lot Size (acres)</label>
          <input
            type="number"
            step="0.01"
            value={formData.lot_size}
            onChange={(e) => updateFormData({ lot_size: e.target.value })}
            placeholder="e.g., 5.0"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Secondary Type</label>
          <select
            value={formData.secondary_type}
            onChange={(e) => updateFormData({ secondary_type: e.target.value })}
            style={inputStyle}
          >
            <option value="">Select...</option>
            {SECONDARY_TYPE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Topography</label>
          <select
            value={formData.topography}
            onChange={(e) => updateFormData({ topography: e.target.value })}
            style={inputStyle}
          >
            <option value="">Select...</option>
            {TOPOGRAPHY_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Grading</label>
          <select
            value={formData.grading}
            onChange={(e) => updateFormData({ grading: e.target.value })}
            style={inputStyle}
          >
            <option value="">Select...</option>
            {GRADING_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Zoning</label>
          <input
            type="text"
            value={formData.zoning}
            onChange={(e) => updateFormData({ zoning: e.target.value })}
            placeholder="e.g., AG-1"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={labelStyle}>Lot Description</label>
        <textarea
          value={formData.lot_description}
          onChange={(e) => updateFormData({ lot_description: e.target.value })}
          placeholder="Describe the lot..."
          rows={3}
          style={{...inputStyle, resize: 'vertical'}}
        />
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={labelStyle}>Zoning Description</label>
        <textarea
          value={formData.zoning_description}
          onChange={(e) => updateFormData({ zoning_description: e.target.value })}
          placeholder="Describe the zoning..."
          rows={3}
          style={{...inputStyle, resize: 'vertical'}}
        />
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div style={{ padding: '32px' }}>
      <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>
        Step 5: Highlights
      </h3>

      <div>
        <label style={labelStyle}>Key Highlights</label>
        {formData.highlights.map((highlight, index) => (
          <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              value={highlight}
              onChange={(e) => updateHighlight(index, e.target.value)}
              placeholder="e.g., Prime location near highway"
              style={{...inputStyle, flex: 1}}
            />
            {formData.highlights.length > 1 && (
              <button
                type="button"
                onClick={() => removeHighlight(index)}
                style={{
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addHighlight}
          style={{
            padding: '10px 16px',
            background: 'rgba(0, 184, 212, 0.1)',
            border: '1px solid rgba(0, 184, 212, 0.2)',
            borderRadius: '8px',
            color: '#00b8d4',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          + Add Highlight
        </button>
      </div>

      <div style={{ 
        marginTop: '24px', 
        padding: '16px', 
        background: 'rgba(0, 184, 212, 0.1)', 
        border: '1px solid rgba(0, 184, 212, 0.2)', 
        borderRadius: '10px' 
      }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.5' }}>
          <strong style={{ color: '#00b8d4' }}>Note:</strong> Photos and documents will be automatically pulled from your deal's property details page.
        </p>
      </div>
    </div>
  );

  const renderStep6 = () => {
    const score = completeness?.total_score || 0;
    const canPublish = score >= 80;
    
    return (
      <div style={{ padding: '32px' }}>
        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>
          Step 6: Review & Submit
        </h3>

        <div style={{
          padding: '20px',
          background: canPublish ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: canPublish ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: canPublish ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: canPublish ? '#10b981' : '#f59e0b'
            }}>
              {canPublish ? <Check size={24} /> : <AlertCircle size={24} />}
            </div>
            <div>
              <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>
                Completeness: {score}%
              </h4>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                {canPublish ? 'Ready to publish' : 'Need 80% to publish'}
              </p>
            </div>
          </div>

          {completeness && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Required</div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>
                  {completeness.required_fields_score}/40
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Financial</div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>
                  {completeness.financial_fields_score}/20
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Details</div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>
                  {completeness.details_fields_score}/20
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Media</div>
                <div style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>
                  {completeness.media_score}/20
                </div>
              </div>
            </div>
          )}

          {!canPublish && completeness?.missing_fields && completeness.missing_fields.length > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <p style={{ color: '#f59e0b', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                Missing Required Fields:
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                {completeness.missing_fields.join(', ')}
              </p>
            </div>
          )}
        </div>

        <div style={{
          padding: '16px',
          background: 'rgba(0, 184, 212, 0.1)',
          border: '1px solid rgba(0, 184, 212, 0.2)',
          borderRadius: '10px',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '13px',
          lineHeight: '1.5'
        }}>
          <strong style={{ color: '#00b8d4' }}>Review Process:</strong><br />
          Your deal will be reviewed by our team before appearing in the Marketplace. You'll be notified once it's approved.
        </div>
      </div>
    );
  };

  const totalSteps = 6;
  const canGoNext = step < totalSteps;
  const canSubmit = step === totalSteps;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              Publish to Marketplace
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
              Step {step} of {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && (formData.is_land_listing ? renderStep4Land() : renderStep4Property())}
          {step === 5 && renderStep5()}
          {step === 6 && renderStep6()}
        </div>

        {/* Footer */}
        <div style={{
          padding: '24px 32px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: '12px',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: step === 1 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
              cursor: step === 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ChevronLeft size={18} />
            Back
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '12px 24px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: 'rgba(255,255,255,0.6)',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>

            {canGoNext && (
              <button
                onClick={() => setStep(s => s + 1)}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #00b8d4 0%, #00b8d4 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#000',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Next
                <ChevronRight size={18} />
              </button>
            )}

            {canSubmit && (
              <button
                onClick={handleSubmit}
                disabled={submitting || (completeness && !completeness.can_publish)}
                style={{
                  padding: '12px 24px',
                  background: submitting || (completeness && !completeness.can_publish)
                    ? 'rgba(0, 184, 212, 0.3)' 
                    : 'linear-gradient(135deg, #00b8d4 0%, #00b8d4 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#000',
                  cursor: submitting || (completeness && !completeness.can_publish) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Check size={18} />
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Shared styles
const labelStyle = {
  color: 'rgba(255,255,255,0.8)',
  fontSize: '14px',
  fontWeight: '500',
  display: 'block',
  marginBottom: '8px'
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '14px'
};

export default EnhancedPublishWizard;
