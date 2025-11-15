-- =====================================================
-- Fix Team Members Visibility
-- Allow team members to see each other
-- =====================================================

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "team_members_select_simple" ON public.team_members;

-- Create new policy that allows team members to see each other
-- Uses a LATERAL join to avoid recursion
CREATE POLICY "team_members_can_view_teammates" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    -- User can see themselves
    user_id = auth.uid()
    OR
    -- User can see other members of teams they belong to
    team_id IN (
      SELECT tm.team_id 
      FROM public.team_members tm 
      WHERE tm.user_id = auth.uid()
    )
  );

-- =====================================================
-- DONE!
-- Run this in Supabase SQL Editor
-- Team members will now be able to see each other
-- =====================================================
