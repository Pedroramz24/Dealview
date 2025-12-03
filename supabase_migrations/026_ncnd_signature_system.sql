-- =====================================================
-- NCND Digital Signature System
-- Phase 2: Create signatures table and tracking
-- =====================================================

-- Create NCND signatures table
CREATE TABLE IF NOT EXISTS public.ncnd_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  
  -- Deal & User Info (captured at signing for legal purposes)
  property_address TEXT NOT NULL,
  user_full_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  
  -- Signature Data
  signature_data TEXT, -- Base64 encoded signature image or digital signature token
  ip_address TEXT,
  user_agent TEXT,
  
  -- Agreement Text (snapshot at time of signing)
  agreement_text TEXT NOT NULL,
  
  -- Timestamps
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- 6 months from signed_at
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one active signature per user per deal
  UNIQUE(user_id, deal_id, is_active)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS ncnd_signatures_user_id_idx ON public.ncnd_signatures(user_id);
CREATE INDEX IF NOT EXISTS ncnd_signatures_deal_id_idx ON public.ncnd_signatures(deal_id);
CREATE INDEX IF NOT EXISTS ncnd_signatures_signed_at_idx ON public.ncnd_signatures(signed_at DESC);
CREATE INDEX IF NOT EXISTS ncnd_signatures_expires_at_idx ON public.ncnd_signatures(expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS ncnd_signatures_active_idx ON public.ncnd_signatures(user_id, deal_id) WHERE is_active = true;

-- Function to automatically set expiration date (6 months)
CREATE OR REPLACE FUNCTION set_ncnd_expiration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NEW.signed_at + INTERVAL '6 months';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set expiration on insert
DROP TRIGGER IF EXISTS set_ncnd_expiration_trigger ON public.ncnd_signatures;
CREATE TRIGGER set_ncnd_expiration_trigger
  BEFORE INSERT ON public.ncnd_signatures
  FOR EACH ROW
  EXECUTE FUNCTION set_ncnd_expiration();

-- RLS Policies
ALTER TABLE public.ncnd_signatures ENABLE ROW LEVEL SECURITY;

-- Users can view their own signatures
CREATE POLICY "Users can view own signatures"
  ON public.ncnd_signatures FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own signatures
CREATE POLICY "Users can create signatures"
  ON public.ncnd_signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only system can update signatures (to expire them)
CREATE POLICY "System can update signatures"
  ON public.ncnd_signatures FOR UPDATE
  USING (auth.uid() = user_id); -- Allow user to update their own

-- Comments
COMMENT ON TABLE public.ncnd_signatures IS 'Digital NCND signatures for marketplace deal access';
COMMENT ON COLUMN public.ncnd_signatures.property_address IS 'Property address at time of signing (immutable)';
COMMENT ON COLUMN public.ncnd_signatures.user_full_name IS 'User full name at time of signing (immutable)';
COMMENT ON COLUMN public.ncnd_signatures.signature_data IS 'Base64 encoded signature or digital token';
COMMENT ON COLUMN public.ncnd_signatures.agreement_text IS 'Full NCND text at time of signing';
COMMENT ON COLUMN public.ncnd_signatures.expires_at IS 'Signature expires 6 months after signing';
COMMENT ON COLUMN public.ncnd_signatures.is_active IS 'Whether signature is still valid';

-- Add NCND tracking to deals table
ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS ncnd_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS ncnd_signatures_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS deals_ncnd_required_idx ON public.deals(ncnd_required) WHERE is_published = true;

COMMENT ON COLUMN public.deals.ncnd_required IS 'Whether NCND is required to view this deal';
COMMENT ON COLUMN public.deals.ncnd_signatures_count IS 'Count of active NCND signatures for this deal';
