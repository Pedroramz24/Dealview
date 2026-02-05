-- ============================================================================
-- FIX: Remove infinite recursion in user_profiles RLS policy
-- ============================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view team members profiles" ON user_profiles;

-- Create fixed version that doesn't cause recursion
CREATE POLICY "Users can view team members profiles" ON user_profiles 
FOR SELECT
USING (
    auth.uid() = id 
    OR 
    team_id IS NOT NULL AND team_id = (SELECT up.team_id FROM user_profiles up WHERE up.id = auth.uid() LIMIT 1)
);

-- Also need to fix deals policy that references user_profiles
DROP POLICY IF EXISTS "Users can view team deals" ON deals;

CREATE POLICY "Users can view team deals" ON deals 
FOR SELECT
USING (
    team_id IS NOT NULL AND team_id = (SELECT up.team_id FROM user_profiles up WHERE up.id = auth.uid() LIMIT 1)
);

-- Fix deal_documents policy
DROP POLICY IF EXISTS "Users can view team documents" ON deal_documents;

CREATE POLICY "Users can view team documents" ON deal_documents 
FOR SELECT
USING (
    deal_id IN (
        SELECT d.id FROM deals d WHERE d.team_id = (SELECT up.team_id FROM user_profiles up WHERE up.id = auth.uid() LIMIT 1)
    )
);

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
