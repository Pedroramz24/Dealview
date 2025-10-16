-- =====================================================
-- Fix Infinite Recursion in RLS Policies
-- Drop and recreate simplified policies
-- =====================================================

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can insert own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can update own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can delete own deals" ON public.deals;

DROP POLICY IF EXISTS "Users can view own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contacts;

DROP POLICY IF EXISTS "Users can view milestones" ON public.deal_milestones;
DROP POLICY IF EXISTS "Users can manage milestones" ON public.deal_milestones;

DROP POLICY IF EXISTS "Users can view documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Deal owners can manage team" ON public.team_members;

-- =====================================================
-- Create SIMPLIFIED policies without circular dependencies
-- =====================================================

-- Deals: Users can only manage their own deals
CREATE POLICY "Users can view own deals" ON public.deals
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own deals" ON public.deals
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own deals" ON public.deals
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own deals" ON public.deals
  FOR DELETE USING (auth.uid() = owner_id);

-- Contacts: Users can only manage their own contacts
CREATE POLICY "Users can view own contacts" ON public.contacts
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert contacts" ON public.contacts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own contacts" ON public.contacts
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own contacts" ON public.contacts
  FOR DELETE USING (auth.uid() = owner_id);

-- Deal Milestones: Users can manage milestones for their own deals
CREATE POLICY "Users can view own milestones" ON public.deal_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deals 
      WHERE deals.id = deal_milestones.deal_id 
      AND deals.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own milestones" ON public.deal_milestones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals 
      WHERE deals.id = deal_milestones.deal_id 
      AND deals.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own milestones" ON public.deal_milestones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.deals 
      WHERE deals.id = deal_milestones.deal_id 
      AND deals.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own milestones" ON public.deal_milestones
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.deals 
      WHERE deals.id = deal_milestones.deal_id 
      AND deals.owner_id = auth.uid()
    )
  );

-- Documents: Users can manage documents for their own deals
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = owner_id);

-- Team Members: Simple policies for now (can add collaboration later)
CREATE POLICY "Users can view team members for own deals" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deals 
      WHERE deals.id = team_members.deal_id 
      AND deals.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage team for own deals" ON public.team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.deals 
      WHERE deals.id = team_members.deal_id 
      AND deals.owner_id = auth.uid()
    )
  );
