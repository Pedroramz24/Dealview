-- =====================================================
-- DealLinked Marketplace: Deal Publishing Extensions
-- Phase 2: Add publishing and marketplace fields to deals
-- =====================================================

-- Add marketplace/publishing fields to deals table
ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_status TEXT DEFAULT 'draft', -- 'draft', 'pending_approval', 'published', 'archived'
  ADD COLUMN IF NOT EXISTS public_asset_type TEXT,
  ADD COLUMN IF NOT EXISTS public_market TEXT,
  ADD COLUMN IF NOT EXISTS public_price DECIMAL,
  ADD COLUMN IF NOT EXISTS public_strategy TEXT, -- 'Core', 'Core+', 'Value-Add', 'Development', 'Reposition'
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS marketplace_views_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketplace_inquiries_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketplace_saves_count INTEGER DEFAULT 0;

-- Add indexes for marketplace queries
CREATE INDEX IF NOT EXISTS deals_is_published_idx ON public.deals(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS deals_public_status_idx ON public.deals(public_status);
CREATE INDEX IF NOT EXISTS deals_public_market_idx ON public.deals(public_market) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS deals_public_asset_type_idx ON public.deals(public_asset_type) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS deals_public_price_idx ON public.deals(public_price) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS deals_published_at_idx ON public.deals(published_at DESC) WHERE is_published = true;

-- Create composite index for marketplace browsing
CREATE INDEX IF NOT EXISTS deals_marketplace_browse_idx 
  ON public.deals(is_published, public_status, published_at DESC) 
  WHERE is_published = true AND public_status = 'published';

-- Update RLS policies to allow published deals to be viewed by members
-- Drop existing deal policies
DROP POLICY IF EXISTS "Users can view own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can view published marketplace deals" ON public.deals;

-- Recreate policies
-- Workspace: Users can view their own deals
CREATE POLICY "Users can view own deals" 
  ON public.deals FOR SELECT 
  USING (auth.uid() = owner_id);

-- Marketplace: Members can view published deals
CREATE POLICY "Members can view published marketplace deals" 
  ON public.deals FOR SELECT 
  USING (
    is_published = true 
    AND public_status = 'published'
    AND approval_status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() 
      AND membership_active = true
    )
  );

-- Allow users to update their own deals
CREATE POLICY "Users can update own deals" 
  ON public.deals FOR UPDATE 
  USING (auth.uid() = owner_id);

-- Allow users to insert deals
CREATE POLICY "Users can insert deals" 
  ON public.deals FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

-- Allow users to delete own deals
CREATE POLICY "Users can delete own deals" 
  ON public.deals FOR DELETE 
  USING (auth.uid() = owner_id);

-- Comment documentation
COMMENT ON COLUMN public.deals.is_published IS 'Whether deal is published to Marketplace';
COMMENT ON COLUMN public.deals.public_status IS 'Publication status: draft, pending_approval, published, archived';
COMMENT ON COLUMN public.deals.public_asset_type IS 'Asset type shown in Marketplace (may differ from internal)';
COMMENT ON COLUMN public.deals.public_market IS 'Market/city shown in Marketplace';
COMMENT ON COLUMN public.deals.public_price IS 'Price shown in Marketplace';
COMMENT ON COLUMN public.deals.public_strategy IS 'Investment strategy: Core, Value-Add, Development, etc.';
COMMENT ON COLUMN public.deals.published_at IS 'When deal was published to Marketplace';
COMMENT ON COLUMN public.deals.published_by IS 'User who published the deal';
COMMENT ON COLUMN public.deals.approval_status IS 'Admin approval status';
COMMENT ON COLUMN public.deals.approved_by IS 'Admin who approved the deal';
COMMENT ON COLUMN public.deals.approved_at IS 'When deal was approved';
