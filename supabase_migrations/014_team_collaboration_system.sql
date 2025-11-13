-- =====================================================
-- Team Collaboration System - Phase 1
-- Teams, Members, and Invite Links
-- =====================================================

-- TABLE: teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Settings
  default_deal_sharing TEXT DEFAULT 'private', -- 'private' or 'team'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- TABLE: team_members
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Role: 'owner', 'admin', 'agent', 'viewer'
  role TEXT NOT NULL DEFAULT 'agent',
  
  -- Timestamps
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Prevent duplicate memberships
  UNIQUE(team_id, user_id)
);

-- TABLE: team_invites
CREATE TABLE IF NOT EXISTS public.team_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Invite details
  email TEXT, -- Optional: if inviting specific email
  token TEXT UNIQUE NOT NULL, -- Unique shareable token
  role TEXT NOT NULL DEFAULT 'agent',
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'revoked'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_by UUID REFERENCES auth.users ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes (create after tables)
CREATE INDEX IF NOT EXISTS teams_created_by_idx ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS team_members_team_id_idx ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS team_invites_team_id_idx ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS team_invites_token_idx ON public.team_invites(token);

-- Enable RLS (after tables created)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Grant permissions BEFORE creating policies
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;

-- RLS Policies for teams (create AFTER tables and permissions)
CREATE POLICY "Users can view teams they are members of" ON public.teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners and admins can update teams" ON public.teams
  FOR UPDATE USING (
    id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete teams" ON public.teams
  FOR DELETE USING (
    id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- RLS Policies for team_members
CREATE POLICY "Users can view members of their teams" ON public.team_members
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can add members" ON public.team_members
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update member roles" ON public.team_members
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can remove members" ON public.team_members
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for team_invites
CREATE POLICY "Users can view invites for their teams" ON public.team_invites
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can create invites" ON public.team_invites
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update invites" ON public.team_invites
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Triggers (create LAST, after all tables and policies)
-- Trigger to auto-create team membership when team is created
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Add creator as owner
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_team();

-- Update timestamp trigger for teams
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- DONE!
-- Run this script in Supabase SQL Editor
-- Team collaboration foundation ready
-- =====================================================
