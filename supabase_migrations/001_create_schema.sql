-- =====================================================
-- DealView CRM - Complete Database Schema
-- Built for 1000+ users with Row Level Security
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: user_profiles
-- Extends Supabase Auth with CRM-specific data
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  company TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Trigger to create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, created_at)
  VALUES (NEW.id, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- TABLE: deals
-- Core property/deal management
-- =====================================================
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Basic Information
  title TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Property Details
  asset_type TEXT,
  size DECIMAL,
  price DECIMAL,
  description TEXT,
  
  -- Location
  latitude DECIMAL,
  longitude DECIMAL,
  
  -- Financial Metrics
  cap_rate DECIMAL,
  noi DECIMAL,
  annual_income DECIMAL,
  annual_expenses DECIMAL,
  
  -- Status
  status TEXT DEFAULT 'active',
  stage TEXT DEFAULT 'prospecting',
  
  -- Images
  image_url TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for performance
CREATE INDEX IF NOT EXISTS deals_owner_id_idx ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS deals_status_idx ON public.deals(status);
CREATE INDEX IF NOT EXISTS deals_created_at_idx ON public.deals(created_at DESC);

-- =====================================================
-- TABLE: contacts
-- Client/contact management
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  deal_id UUID REFERENCES public.deals ON DELETE SET NULL,
  
  -- Contact Information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS contacts_owner_id_idx ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS contacts_deal_id_idx ON public.contacts(deal_id);

-- =====================================================
-- TABLE: deal_milestones
-- Transaction timeline tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.deal_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES public.deals ON DELETE CASCADE NOT NULL,
  
  -- Milestone Information
  milestone_type TEXT NOT NULL,
  milestone_date DATE,
  responsible TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS deal_milestones_deal_id_idx ON public.deal_milestones(deal_id);

-- =====================================================
-- TABLE: documents
-- File/document management
-- =====================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  deal_id UUID REFERENCES public.deals ON DELETE CASCADE,
  
  -- Document Information
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  
  -- Metadata
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS documents_owner_id_idx ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS documents_deal_id_idx ON public.documents(deal_id);

-- =====================================================
-- TABLE: team_members
-- Team collaboration
-- =====================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES public.deals ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'viewer',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  UNIQUE(deal_id, user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS team_members_deal_id_idx ON public.team_members(deal_id);
CREATE INDEX IF NOT EXISTS team_members_user_id_idx ON public.team_members(user_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- Multi-tenant data isolation
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Deals: Users can manage their own deals OR deals they're team members of
CREATE POLICY "Users can view own deals" ON public.deals
  FOR SELECT USING (
    auth.uid() = owner_id 
    OR 
    id IN (
      SELECT deal_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own deals" ON public.deals
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own deals" ON public.deals
  FOR UPDATE USING (
    auth.uid() = owner_id 
    OR 
    id IN (
      SELECT deal_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
    )
  );

CREATE POLICY "Users can delete own deals" ON public.deals
  FOR DELETE USING (auth.uid() = owner_id);

-- Contacts: Users can manage contacts for deals they own or are team members of
CREATE POLICY "Users can view own contacts" ON public.contacts
  FOR SELECT USING (
    auth.uid() = owner_id
    OR
    deal_id IN (
      SELECT id FROM public.deals WHERE owner_id = auth.uid()
      UNION
      SELECT deal_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert contacts" ON public.contacts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own contacts" ON public.contacts
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own contacts" ON public.contacts
  FOR DELETE USING (auth.uid() = owner_id);

-- Deal Milestones: Follow deal permissions
CREATE POLICY "Users can view milestones" ON public.deal_milestones
  FOR SELECT USING (
    deal_id IN (
      SELECT id FROM public.deals WHERE owner_id = auth.uid()
      UNION
      SELECT deal_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage milestones" ON public.deal_milestones
  FOR ALL USING (
    deal_id IN (
      SELECT id FROM public.deals WHERE owner_id = auth.uid()
      UNION
      SELECT deal_id FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('editor', 'admin')
    )
  );

-- Documents: Follow deal permissions
CREATE POLICY "Users can view documents" ON public.documents
  FOR SELECT USING (
    auth.uid() = owner_id
    OR
    deal_id IN (
      SELECT id FROM public.deals WHERE owner_id = auth.uid()
      UNION
      SELECT deal_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = owner_id);

-- Team Members: Deal owners can manage team
CREATE POLICY "Users can view team members" ON public.team_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    deal_id IN (SELECT id FROM public.deals WHERE owner_id = auth.uid())
  );

CREATE POLICY "Deal owners can manage team" ON public.team_members
  FOR ALL USING (
    deal_id IN (SELECT id FROM public.deals WHERE owner_id = auth.uid())
  );

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_deal_milestones_updated_at
  BEFORE UPDATE ON public.deal_milestones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- DONE!
-- Run this script in Supabase SQL Editor
-- All tables, RLS policies, and triggers are now set up
-- =====================================================
