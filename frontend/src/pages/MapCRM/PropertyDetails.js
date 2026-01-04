import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { API } from '../../App';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ArrowLeft, Edit, Save, X, Building2, DollarSign, MapPin, TrendingUp, AlertTriangle, User, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { colors, shadows, borderRadius, spacing, gradients, transitions } from '../../styles/designSystem';

// Utility formatting functions
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

const ASSET_COLORS = {
  'Gas': '#ef4444',
  'Retail': '#3b82f6',
  'Industrial': '#f97316',
  'Office': '#22c55e',
  'Land': '#92400e',
  'Multifamily': '#a855f7'
};

const PropertyDetails = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProperty, setEditedProperty] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProperty();
  }, [propertyId]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API}/map-crm/properties/${propertyId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Property not found');
      const data = await response.json();
      setProperty(data);
      setEditedProperty(data);
    } catch (error) {
      console.error('Failed to fetch property:', error);
      toast.error('Failed to load property');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`${API}/map-crm/properties/${propertyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedProperty)
      });

      if (!response.ok) throw new Error('Failed to update property');
      const updated = await response.json();
      setProperty(updated);
      setEditedProperty(updated);
      setIsEditMode(false);
      toast.success('Property updated successfully');
    } catch (error) {
      console.error('Failed to save property:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProperty(property);
    setIsEditMode(false);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: colors.void 
      }}>
        <p style={{ color: colors.textSecondary }}>Loading property...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: colors.void 
      }}>
        <p style={{ color: colors.textSecondary }}>Property not found</p>
      </div>
    );
  }

  const dataToDisplay = isEditMode ? editedProperty : property;

  return (
    <div style={{ 
      minHeight: '100vh',
      background: colors.void,
      padding: spacing.xl
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: spacing.xl
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
          <Button
            onClick={() => navigate('/internal/map-crm')}
            variant="outline"
            style={{
              background: colors.surfaceCard,
              border: `1px solid ${colors.border}`,
              color: colors.textSecondary
            }}
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to DealVisor
          </Button>

          <div style={{ display: 'flex', gap: spacing.sm }}>
            {!isEditMode ? (
              <Button
                onClick={() => setIsEditMode(true)}
                style={{
                  background: gradients.primaryButton,
                  border: 'none',
                  boxShadow: shadows.glowCyan
                }}
              >
                <Edit size={16} className="mr-2" />
                Edit Property
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    color: colors.textSecondary
                  }}
                >
                  <X size={16} className="mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    background: gradients.primaryButton,
                    border: 'none',
                    boxShadow: shadows.glowCyan
                  }}
                >
                  {isSaving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Property Title */}
        <div style={{
          background: colors.surfaceCard,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
          border: `1px solid ${colors.border}`,
          boxShadow: shadows.cardElevation
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.lg }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: borderRadius.md,
              background: `${ASSET_COLORS[property.asset_type]}20`,
              border: `2px solid ${ASSET_COLORS[property.asset_type]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 20px ${ASSET_COLORS[property.asset_type]}40`
            }}>
              <Building2 size={28} style={{ color: ASSET_COLORS[property.asset_type] }} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: colors.textPrimary,
                marginBottom: spacing.sm
              }}>
                {property.title || property.address}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} style={{ color: colors.textTertiary }} />
                  <span style={{ fontSize: '14px', color: colors.textSecondary }}>
                    {property.address}, {property.city}, {property.state} {property.zip_code}
                  </span>
                </div>
                <span style={{
                  padding: '4px 10px',
                  background: `${ASSET_COLORS[property.asset_type]}20`,
                  border: `1px solid ${ASSET_COLORS[property.asset_type]}`,
                  borderRadius: borderRadius.sm,
                  fontSize: '12px',
                  fontWeight: '600',
                  color: ASSET_COLORS[property.asset_type]
                }}>
                  {property.asset_type}
                </span>
                {property.high_equity && (
                  <span style={{
                    padding: '4px 10px',
                    background: `${colors.success}20`,
                    border: `1px solid ${colors.success}`,
                    borderRadius: borderRadius.sm,
                    fontSize: '11px',
                    fontWeight: '600',
                    color: colors.success
                  }}>
                    HIGH EQUITY
                  </span>
                )}
                {property.foreclosure && (
                  <span style={{
                    padding: '4px 10px',
                    background: `${colors.danger}20`,
                    border: `1px solid ${colors.danger}`,
                    borderRadius: borderRadius.sm,
                    fontSize: '11px',
                    fontWeight: '600',
                    color: colors.danger
                  }}>
                    FORECLOSURE
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: spacing.lg
      }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {/* Property Details Section */}
          <Section title="Property Details" icon={Building2}>
            <Field 
              label="Title" 
              value={dataToDisplay.title} 
              isEditMode={isEditMode}
              onChange={(value) => setEditedProperty({...editedProperty, title: value})}
            />
            <Field 
              label="Address" 
              value={dataToDisplay.address} 
              isEditMode={isEditMode}
              onChange={(value) => setEditedProperty({...editedProperty, address: value})}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing.md }}>
              <Field 
                label="City" 
                value={dataToDisplay.city} 
                isEditMode={isEditMode}
                onChange={(value) => setEditedProperty({...editedProperty, city: value})}
              />
              <Field 
                label="State" 
                value={dataToDisplay.state} 
                isEditMode={isEditMode}
                onChange={(value) => setEditedProperty({...editedProperty, state: value})}
              />
              <Field 
                label="ZIP" 
                value={dataToDisplay.zip_code} 
                isEditMode={isEditMode}
                onChange={(value) => setEditedProperty({...editedProperty, zip_code: value})}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <Field 
                label="Building Size (sqft)" 
                value={formatNumber(dataToDisplay.building_size)} 
                isEditMode={isEditMode}
                onChange={(value) => setEditedProperty({...editedProperty, building_size: parseFloat(value) || null})}
                type="number"
              />
              <Field 
                label="Lot Size (acres)" 
                value={dataToDisplay.lot_size} 
                isEditMode={isEditMode}
                onChange={(value) => setEditedProperty({...editedProperty, lot_size: parseFloat(value) || null})}
                type="number"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing.md }}>
              <Field 
                label="Beds" 
                value={dataToDisplay.beds} 
                isEditMode={isEditMode}
                onChange={(value) => setEditedProperty({...editedProperty, beds: parseInt(value) || null})}
                type="number"
              />
              <Field 
                label="Baths" 
                value={dataToDisplay.baths} 
                isEditMode={isEditMode}
                onChange={(value) => setEditedProperty({...editedProperty, baths: parseFloat(value) || null})}
                type="number"
              />
              <Field 
                label="Year Built" 
                value={dataToDisplay.year_built} 
                isEditMode={isEditMode}
                onChange={(value) => setEditedProperty({...editedProperty, year_built: parseInt(value) || null})}
                type="number"
              />
            </div>
          </Section>

          {/* Financial Overview Section */}
          <Section title="Financial Intelligence" icon={DollarSign}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <Field 
                label="Asking Price" 
                value={formatCurrency(dataToDisplay.asking_price)} 
                isEditMode={isEditMode}
                onChange={(value) => setEditedProperty({...editedProperty, asking_price: parseFloat(value) || null})}
                type="number"
              />
              <Field 
                label="Est Value" 
                value={formatCurrency(dataToDisplay.est_value)} 
                isEditMode={isEditMode}
                onChange={(value) => setEditedProperty({...editedProperty, est_value: parseFloat(value) || null})}
                type="number"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <Field 
                label="Assessed Value" 
                value={formatCurrency(dataToDisplay.assessed_value)} 
                isEditMode={isEditMode}
                onChange={(value) => setEditedProperty({...editedProperty, assessed_value: parseFloat(value) || null})}
                type="number"
              />
              <Field 
                label="Equity %" 
                value={formatPercent(dataToDisplay.est_equity_percent)} 
                isEditMode={false}
                readOnly={true}
              />
            </div>
            {dataToDisplay.tax_delinquent_dollars > 0 && (
              <div style={{
                padding: spacing.md,
                background: `${colors.warning}10`,
                border: `1px solid ${colors.warning}`,
                borderRadius: borderRadius.md,
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm
              }}>
                <AlertTriangle size={18} style={{ color: colors.warning }} />
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: colors.warning }}>
                    Tax Delinquent
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: colors.textPrimary }}>
                    {formatCurrency(dataToDisplay.tax_delinquent_dollars)}
                  </p>
                </div>
              </div>
            )}
          </Section>

          {/* Owner Information Section */}
          <Section title="Owner Information" icon={User}>
            <Field 
              label="Owner Name" 
              value={dataToDisplay.owner_name} 
              isEditMode={isEditMode}
              onChange={(value) => setEditedProperty({...editedProperty, owner_name: value})}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <Field 
                label="Owner Type" 
                value={dataToDisplay.owner_type} 
                isEditMode={false}
              />
              <Field 
                label="Owner Occupied" 
                value={dataToDisplay.owner_occupied ? 'Yes' : 'No'} 
                isEditMode={false}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <Field 
                label="Owner Phone" 
                value={dataToDisplay.owner_phone} 
                isEditMode={isEditMode}
                onChange={(value) => setEditedProperty({...editedProperty, owner_phone: value})}
              />
              <Field 
                label="Owner Email" 
                value={dataToDisplay.owner_email} 
                isEditMode={isEditMode}
                onChange={(value) => setEditedProperty({...editedProperty, owner_email: value})}
              />
            </div>
          </Section>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {/* Notes Section */}
          <Section title="Notes" icon={Edit}>
            {isEditMode ? (
              <Textarea
                value={editedProperty.notes || ''}
                onChange={(e) => setEditedProperty({...editedProperty, notes: e.target.value})}
                placeholder="Add notes about this property..."
                rows={6}
                style={{
                  background: colors.surfaceCard,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  color: colors.textPrimary,
                  padding: spacing.md,
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            ) : (
              <p style={{ fontSize: '14px', color: colors.textSecondary, whiteSpace: 'pre-wrap' }}>
                {property.notes || 'No notes yet'}
              </p>
            )}
          </Section>

          {/* PropertyRadar Intelligence */}
          {(property.high_equity || property.foreclosure || property.underwater || property.bankruptcy) && (
            <Section title="Property Flags" icon={AlertTriangle}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                {property.high_equity && <Badge label="High Equity" color={colors.success} />}
                {property.foreclosure && <Badge label="Foreclosure" color={colors.danger} />}
                {property.underwater && <Badge label="Underwater" color={colors.warning} />}
                {property.bankruptcy && <Badge label="Bankruptcy" color={colors.danger} />}
                {property.owner_occupied === false && <Badge label="Absentee Owner" color={colors.primary} />}
                {property.cash_buyer && <Badge label="Cash Buyer" color={colors.success} />}
              </div>
            </Section>
          )}

          {/* Additional Details */}
          <Section title="Additional Information" icon={FileText}>
            <Field label="County" value={dataToDisplay.county} isEditMode={false} />
            <Field label="APN" value={dataToDisplay.apn} isEditMode={false} />
            <Field label="Zoning" value={dataToDisplay.zoning} isEditMode={isEditMode} onChange={(value) => setEditedProperty({...editedProperty, zoning: value})} />
            {property.purchase_date && (
              <Field label="Purchase Date" value={property.purchase_date} isEditMode={false} />
            )}
            {property.purchase_amount && (
              <Field label="Purchase Amount" value={formatCurrency(property.purchase_amount)} isEditMode={false} />
            )}
          </Section>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, icon: Icon, children }) => (
  <div style={{
    background: colors.surfaceCard,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.cardElevation
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
      <Icon size={20} style={{ color: colors.primary }} />
      <h2 style={{ fontSize: '18px', fontWeight: '600', color: colors.textPrimary }}>
        {title}
      </h2>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      {children}
    </div>
  </div>
);

const Field = ({ label, value, isEditMode, onChange, type = 'text', readOnly = false }) => (
  <div>
    <Label style={{ fontSize: '12px', color: colors.textTertiary, marginBottom: '6px', display: 'block' }}>
      {label}
    </Label>
    {isEditMode && !readOnly ? (
      <Input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: colors.surfaceElevated,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.sm,
          color: colors.textPrimary,
          padding: '8px 12px'
        }}
      />
    ) : (
      <p style={{ fontSize: '14px', color: colors.textPrimary, fontWeight: '500' }}>
        {value || '—'}
      </p>
    )}
  </div>
);

const Badge = ({ label, color }) => (
  <span style={{
    padding: '6px 12px',
    background: `${color}20`,
    border: `1px solid ${color}`,
    borderRadius: borderRadius.sm,
    fontSize: '12px',
    fontWeight: '600',
    color: color
  }}>
    {label}
  </span>
);

export default PropertyDetails;
