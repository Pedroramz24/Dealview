-- =====================================================
-- Team Collaboration System - SAFE Migration
-- Renames conflicting table and creates team system
-- =====================================================

-- Step 1: Rename existing team_members to deal_collaborators (it's for deal-contact linking)
ALTER TABLE IF EXISTS public.team_members RENAME TO deal_collaborators;

-- Step 2: Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  default_deal_sharing TEXT DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 3: Create team_members table (NEW - for actual team membership)
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Step 4: Create team_invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  email TEXT,
  token TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_by UUID REFERENCES auth.users ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS teams_created_by_idx ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS team_invites_team_id_idx ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS team_invites_token_idx ON public.team_invites(token);

-- Step 6: Grant permissions
GRANT ALL ON public.teams TO authenticated;
GRANT ALL ON public.team_members TO authenticated;
GRANT ALL ON public.team_invites TO authenticated;

-- Step 7: Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies (simple, non-circular)
-- Teams policies
CREATE POLICY "teams_select" ON public.teams
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id 
      AND tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "teams_delete" ON public.teams
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id 
      AND tm.user_id = auth.uid() 
      AND tm.role = 'owner'
    )
  );

-- Team members policies  
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "team_members_update" ON public.team_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Team invites policies
CREATE POLICY "team_invites_select" ON public.team_invites
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invites.team_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "team_invites_insert" ON public.team_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invites.team_id 
      AND tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "team_invites_update" ON public.team_invites
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invites.team_id 
      AND tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Step 9: Create trigger function
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Attach trigger
DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_team();

DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- DONE!
-- This migration safely renames the old table and creates new team system
-- =====================================================
