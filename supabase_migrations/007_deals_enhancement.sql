-- =====================================================
-- DealView CRM - Deals Table Enhancement
-- Add missing fields for complete deal management
-- =====================================================

-- Add Property Facts fields
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS lot_size DECIMAL,
ADD COLUMN IF NOT EXISTS year_built INTEGER,
ADD COLUMN IF NOT EXISTS zoning TEXT,
ADD COLUMN IF NOT EXISTS occupancy DECIMAL,
ADD COLUMN IF NOT EXISTS parking_spaces INTEGER,
ADD COLUMN IF NOT EXISTS key_features TEXT;

-- Add Financial fields
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS lease_type TEXT,
ADD COLUMN IF NOT EXISTS proforma_notes TEXT;

-- Add Contact & Activity fields
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS primary_contact_text TEXT,
ADD COLUMN IF NOT EXISTS last_contact_date DATE;

-- Add Important Dates
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS target_close_date DATE,
ADD COLUMN IF NOT EXISTS next_action TEXT,
ADD COLUMN IF NOT EXISTS next_action_date DATE;

-- Add Deal Management fields
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium',
ADD COLUMN IF NOT EXISTS owner_visibility TEXT DEFAULT 'Team';

-- Add Display settings
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS display_on_map BOOLEAN DEFAULT true;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_primary_contact_id ON public.deals(primary_contact_id);

-- Add comment
COMMENT ON TABLE public.deals IS 'Enhanced deals table with complete property, financial, and activity tracking';
