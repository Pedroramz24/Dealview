-- =====================================================
-- URGENT: Revert Recursive Policy from Migration 018
-- Restore simple non-recursive policy
-- =====================================================

-- Drop the recursive policy that's causing infinite loop
DROP POLICY IF EXISTS "team_members_can_view_teammates" ON public.team_members;

-- Restore the simple, working policy from migration 017
CREATE POLICY "team_members_select_simple" ON public.team_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- DONE!
-- This restores functionality by removing infinite recursion
-- Note: Team members will only see themselves in queries,
-- but backend will use service role key to fetch all members
-- =====================================================
