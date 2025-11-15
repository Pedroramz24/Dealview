-- =====================================================
-- Add Foreign Key Constraint for Team Members Join
-- Enables PostgREST join syntax between team_members and user_profiles
-- =====================================================

-- Add foreign key constraint from team_members.user_id to user_profiles.id
-- This allows Supabase PostgREST to perform joins in the API
-- Both columns reference auth.users, so this creates a direct relationship

-- Note: We use ON DELETE CASCADE to maintain referential integrity
-- If a user profile is deleted, the team membership should also be removed

ALTER TABLE public.team_members
ADD CONSTRAINT team_members_user_id_fkey_profiles
FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS team_members_user_id_profiles_idx ON public.team_members(user_id);

-- Verify the constraint works by testing a simple join
-- This comment documents the expected API usage:
-- supabase.table('team_members').select('*, user_profiles(full_name, phone, avatar_url, company)')
