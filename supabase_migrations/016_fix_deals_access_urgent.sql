-- =====================================================
-- URGENT FIX: Restore Deals Access
-- Fix RLS policies to work with or without teams
-- =====================================================

-- Drop the broken team-based policies
DROP POLICY IF EXISTS "Users can view own and team deals" ON public.deals;
DROP POLICY IF EXISTS "Users can insert deals" ON public.deals;
DROP POLICY IF EXISTS "Users can update own and assigned deals" ON public.deals;
DROP POLICY IF EXISTS "Users can delete own deals" ON public.deals;

-- Recreate WORKING policies that support both team and non-team scenarios
CREATE POLICY "deals_select_policy" ON public.deals
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid() 
    OR assigned_to = auth.uid()
    OR (
      is_shared_with_team = true 
      AND team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_members.team_id = deals.team_id 
        AND team_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "deals_insert_policy" ON public.deals
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "deals_update_policy" ON public.deals
  FOR UPDATE TO authenticated
  USING (
    owner_id = auth.uid() 
    OR assigned_to = auth.uid()
    OR (
      team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.team_members 
        WHERE team_members.team_id = deals.team_id 
        AND team_members.user_id = auth.uid() 
        AND team_members.role IN ('owner', 'admin')
      )
    )
  );

CREATE POLICY "deals_delete_policy" ON public.deals
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- =====================================================
-- DONE!
-- Run this IMMEDIATELY in Supabase SQL Editor
-- This will restore access to your deals
-- =====================================================
