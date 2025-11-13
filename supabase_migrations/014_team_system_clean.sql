-- =====================================================
-- Team Collaboration System - Clean Migration
-- Uses team_memberships to avoid conflict with existing team_members table
-- =====================================================

-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  default_deal_sharing TEXT DEFAULT 'private',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create team_memberships table (different name to avoid conflict)
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(team_id, user_id)
);

-- Create team_invites table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS teams_created_by_idx ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS team_memberships_team_id_idx ON public.team_memberships(team_id);
CREATE INDEX IF NOT EXISTS team_memberships_user_id_idx ON public.team_memberships(user_id);
CREATE INDEX IF NOT EXISTS team_invites_team_id_idx ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS team_invites_token_idx ON public.team_invites(token);

-- Grant permissions
GRANT ALL ON public.teams TO authenticated;
GRANT ALL ON public.team_memberships TO authenticated;
GRANT ALL ON public.team_invites TO authenticated;

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "teams_select" ON public.teams
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() 
    OR id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE TO authenticated
  USING (
    id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "teams_delete" ON public.teams
  FOR DELETE TO authenticated
  USING (
    id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid() AND role = 'owner')
  );

-- Team memberships policies
CREATE POLICY "team_memberships_select" ON public.team_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR team_id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "team_memberships_insert" ON public.team_memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "team_memberships_update" ON public.team_memberships
  FOR UPDATE TO authenticated
  USING (
    team_id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "team_memberships_delete" ON public.team_memberships
  FOR DELETE TO authenticated
  USING (
    team_id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Team invites policies
CREATE POLICY "team_invites_select" ON public.team_invites
  FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "team_invites_insert" ON public.team_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "team_invites_update" ON public.team_invites
  FOR UPDATE TO authenticated
  USING (
    team_id IN (SELECT team_id FROM public.team_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Trigger to auto-add creator as owner
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_memberships (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_team();

-- Update timestamp trigger
DROP TRIGGER IF EXISTS update_teams_updated_at ON public.teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- DONE!
-- Run this in Supabase SQL Editor
-- =====================================================
