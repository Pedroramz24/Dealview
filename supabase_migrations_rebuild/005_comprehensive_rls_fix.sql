-- ============================================================================
-- COMPREHENSIVE FIX: Remove ALL recursive RLS policies
-- ============================================================================

-- First, drop ALL policies on user_profiles to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view team members profiles" ON user_profiles;

-- Create simple, non-recursive policies for user_profiles
CREATE POLICY "user_profiles_select_own" ON user_profiles 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "user_profiles_insert_own" ON user_profiles 
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_update_own" ON user_profiles 
FOR UPDATE USING (auth.uid() = id);

-- For team member viewing, use a function to avoid recursion
CREATE OR REPLACE FUNCTION get_my_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Now create team-based policy using the function
CREATE POLICY "user_profiles_select_team" ON user_profiles 
FOR SELECT USING (team_id IS NOT NULL AND team_id = get_my_team_id());

-- Fix deals policies
DROP POLICY IF EXISTS "Users can manage own deals" ON deals;
DROP POLICY IF EXISTS "Users can view team deals" ON deals;

CREATE POLICY "deals_all_own" ON deals 
FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "deals_select_team" ON deals 
FOR SELECT USING (team_id IS NOT NULL AND team_id = get_my_team_id());

-- Fix team_members policies
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Team owners can manage members" ON team_members;

CREATE POLICY "team_members_select" ON team_members 
FOR SELECT USING (team_id = get_my_team_id());

CREATE POLICY "team_members_manage" ON team_members 
FOR ALL USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
);

-- Fix teams policies
DROP POLICY IF EXISTS "Users can view their team" ON teams;
DROP POLICY IF EXISTS "Team owners can update team" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;

CREATE POLICY "teams_select" ON teams 
FOR SELECT USING (id = get_my_team_id() OR owner_id = auth.uid());

CREATE POLICY "teams_update" ON teams 
FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "teams_insert" ON teams 
FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Fix deal_documents policies
DROP POLICY IF EXISTS "Users can manage own documents" ON deal_documents;
DROP POLICY IF EXISTS "Users can view team documents" ON deal_documents;

CREATE POLICY "deal_documents_all_own" ON deal_documents 
FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "deal_documents_select_team" ON deal_documents 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_id AND deals.team_id = get_my_team_id())
);

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
