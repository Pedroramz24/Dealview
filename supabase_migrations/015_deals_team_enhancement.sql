-- =====================================================
-- Deals Enhancement for Team Collaboration
-- Add team sharing and assignment fields
-- =====================================================

-- Add team collaboration fields to deals
ALTER TABLE public.deals
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_shared_with_team BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS co_brokers JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS team_notes TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS deals_team_id_idx ON public.deals(team_id);
CREATE INDEX IF NOT EXISTS deals_assigned_to_idx ON public.deals(assigned_to);

-- Comments
COMMENT ON COLUMN public.deals.team_id IS 'Team this deal belongs to';
COMMENT ON COLUMN public.deals.assigned_to IS 'User assigned to this deal';
COMMENT ON COLUMN public.deals.is_shared_with_team IS 'Whether deal is visible to entire team';
COMMENT ON COLUMN public.deals.co_brokers IS 'Array of user IDs for co-brokered deals';
COMMENT ON COLUMN public.deals.team_notes IS 'Shared notes visible to all team members';

-- Update RLS policies for team-based access
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can insert deals" ON public.deals;
DROP POLICY IF EXISTS "Users can update own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can delete own deals" ON public.deals;

-- New team-aware RLS policies
CREATE POLICY "Users can view own and team deals" ON public.deals
  FOR SELECT USING (
    owner_id = auth.uid() 
    OR assigned_to = auth.uid()
    OR (
      is_shared_with_team = true 
      AND team_id IN (
        SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
      )
    )
    OR auth.uid() = ANY(
      SELECT jsonb_array_elements_text(co_brokers)::uuid
    )
  );

CREATE POLICY "Users can insert deals" ON public.deals
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own and assigned deals" ON public.deals
  FOR UPDATE USING (
    owner_id = auth.uid() 
    OR assigned_to = auth.uid()
    OR (
      team_id IN (
        SELECT team_id FROM public.team_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "Users can delete own deals" ON public.deals
  FOR DELETE USING (owner_id = auth.uid());

-- =====================================================
-- DONE!
-- Run this script in Supabase SQL Editor after 014
-- =====================================================
