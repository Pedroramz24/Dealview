-- =====================================================
-- URGENT FIX: Remove Circular RLS Policy on team_members
-- =====================================================

-- Drop ALL existing policies on team_members
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
DROP POLICY IF EXISTS "Users can view members of their teams" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON public.team_members;
DROP POLICY IF EXISTS "Owners and admins can update member roles" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON public.team_members;
DROP POLICY IF EXISTS "Owners and admins can remove members" ON public.team_members;

-- Create SIMPLE, NON-RECURSIVE policies
CREATE POLICY "team_members_select_simple" ON public.team_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "team_members_insert_simple" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "team_members_update_simple" ON public.team_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "team_members_delete_simple" ON public.team_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- DONE!
-- Run this IMMEDIATELY to fix infinite recursion
-- =====================================================
