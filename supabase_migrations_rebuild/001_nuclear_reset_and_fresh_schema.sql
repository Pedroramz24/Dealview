-- ============================================================================
-- DEALLINKED CRM - COMPLETE DATABASE REBUILD
-- ============================================================================
-- WARNING: This script DROPS ALL EXISTING DATA and creates a fresh schema
-- Run this in Supabase SQL Editor
-- ============================================================================

-- STEP 1: NUCLEAR RESET - Drop everything
-- ============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 2: CREATE FRESH TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USER PROFILES (linked to auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    company TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'broker',
    is_admin BOOLEAN DEFAULT FALSE,
    team_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. TEAMS
-- ----------------------------------------------------------------------------
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key for user_profiles.team_id after teams table exists
ALTER TABLE user_profiles ADD CONSTRAINT fk_user_team 
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 3. TEAM MEMBERS
-- ----------------------------------------------------------------------------
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 4. PIPELINES
-- ----------------------------------------------------------------------------
CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. PIPELINE STAGES
-- ----------------------------------------------------------------------------
CREATE TABLE pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#94a3b8',
    display_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pipeline_stages_order ON pipeline_stages(pipeline_id, display_order);

-- ----------------------------------------------------------------------------
-- 6. DEALS (Core CRM with all financial fields)
-- ----------------------------------------------------------------------------
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    
    -- Basic Info
    title TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    
    -- Location (for map)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Property Details
    asset_type TEXT, -- Office, Retail, Industrial, Multifamily, Land, Mixed Use, Other
    asking_price DECIMAL(15, 2),
    size_sqft DECIMAL(12, 2),
    lot_size DECIMAL(12, 2),
    year_built INTEGER,
    occupancy DECIMAL(5, 2), -- Percentage 0-100
    zoning TEXT,
    
    -- Financial Metrics
    noi DECIMAL(15, 2), -- Net Operating Income
    cap_rate DECIMAL(5, 2), -- Percentage
    annual_income DECIMAL(15, 2),
    annual_expenses DECIMAL(15, 2),
    
    -- Pipeline
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
    pipeline_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
    
    -- Status & Notes
    status TEXT DEFAULT 'active', -- active, pending, closed, archived
    notes TEXT,
    
    -- Images
    image_url TEXT,
    image_urls TEXT[], -- Array of image URLs
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deals_owner ON deals(owner_id);
CREATE INDEX idx_deals_team ON deals(team_id);
CREATE INDEX idx_deals_location ON deals(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_deals_pipeline ON deals(pipeline_id);
CREATE INDEX idx_deals_stage ON deals(pipeline_stage_id);
CREATE INDEX idx_deals_asset_type ON deals(asset_type);

-- ----------------------------------------------------------------------------
-- 7. CONTACT TAGS (Smart Tags System)
-- ----------------------------------------------------------------------------
CREATE TABLE contact_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#00b8d4',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(owner_id, name)
);

CREATE INDEX idx_contact_tags_owner ON contact_tags(owner_id);

-- ----------------------------------------------------------------------------
-- 8. CONTACTS
-- ----------------------------------------------------------------------------
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Basic Info
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    
    -- Classification
    contact_type TEXT DEFAULT 'Buyer', -- Broker, Buyer, Seller
    status TEXT DEFAULT 'Active', -- Active, Inactive, Lead
    
    -- Tags (array of tag IDs for smart tags)
    tag_ids UUID[] DEFAULT '{}',
    
    -- Follow-up
    last_follow_up TIMESTAMP WITH TIME ZONE,
    next_follow_up TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contacts_owner ON contacts(owner_id);
CREATE INDEX idx_contacts_type ON contacts(contact_type);
CREATE INDEX idx_contacts_status ON contacts(status);

-- ----------------------------------------------------------------------------
-- 9. CONTACT-DEAL LINKS (Many-to-Many)
-- ----------------------------------------------------------------------------
CREATE TABLE contact_deal_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    role TEXT, -- e.g., 'Buyer', 'Seller', 'Attorney', 'Lender'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contact_id, deal_id)
);

CREATE INDEX idx_contact_deal_links_contact ON contact_deal_links(contact_id);
CREATE INDEX idx_contact_deal_links_deal ON contact_deal_links(deal_id);

-- ----------------------------------------------------------------------------
-- 10. CALENDAR EVENTS
-- ----------------------------------------------------------------------------
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN DEFAULT FALSE,
    
    -- Link to deals/contacts
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    
    -- Event type
    event_type TEXT DEFAULT 'meeting', -- meeting, call, tour, deadline, other
    color TEXT DEFAULT '#00b8d4',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_owner ON calendar_events(owner_id);
CREATE INDEX idx_calendar_date ON calendar_events(start_time);
CREATE INDEX idx_calendar_deal ON calendar_events(deal_id);

-- ----------------------------------------------------------------------------
-- 11. DEAL DOCUMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE deal_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT, -- pdf, doc, xls, img, etc.
    file_size INTEGER, -- bytes
    
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_documents_deal ON deal_documents(deal_id);

-- ============================================================================
-- STEP 3: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_deal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- USER PROFILES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow viewing team members' profiles
CREATE POLICY "Users can view team members profiles"
    ON user_profiles FOR SELECT
    USING (
        team_id IN (
            SELECT team_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- ----------------------------------------------------------------------------
-- TEAMS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view their team"
    ON teams FOR SELECT
    USING (
        id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
        OR owner_id = auth.uid()
    );

CREATE POLICY "Team owners can update team"
    ON teams FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Users can create teams"
    ON teams FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- TEAM MEMBERS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view team members"
    ON team_members FOR SELECT
    USING (
        team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
    );

CREATE POLICY "Team owners can manage members"
    ON team_members FOR ALL
    USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = auth.uid()
        )
    );

-- ----------------------------------------------------------------------------
-- PIPELINES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can manage own pipelines"
    ON pipelines FOR ALL
    USING (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- PIPELINE STAGES POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own pipeline stages"
    ON pipeline_stages FOR SELECT
    USING (
        pipeline_id IN (SELECT id FROM pipelines WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can manage own pipeline stages"
    ON pipeline_stages FOR ALL
    USING (
        pipeline_id IN (SELECT id FROM pipelines WHERE owner_id = auth.uid())
    );

-- ----------------------------------------------------------------------------
-- DEALS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can manage own deals"
    ON deals FOR ALL
    USING (owner_id = auth.uid());

-- Users can view team members' deals
CREATE POLICY "Users can view team deals"
    ON deals FOR SELECT
    USING (
        team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid())
    );

-- ----------------------------------------------------------------------------
-- CONTACT TAGS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can manage own tags"
    ON contact_tags FOR ALL
    USING (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- CONTACTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can manage own contacts"
    ON contacts FOR ALL
    USING (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- CONTACT-DEAL LINKS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can manage own contact-deal links"
    ON contact_deal_links FOR ALL
    USING (
        contact_id IN (SELECT id FROM contacts WHERE owner_id = auth.uid())
        OR deal_id IN (SELECT id FROM deals WHERE owner_id = auth.uid())
    );

-- ----------------------------------------------------------------------------
-- CALENDAR EVENTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can manage own events"
    ON calendar_events FOR ALL
    USING (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- DEAL DOCUMENTS POLICIES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can manage own documents"
    ON deal_documents FOR ALL
    USING (owner_id = auth.uid());

-- Users can view team members' documents
CREATE POLICY "Users can view team documents"
    ON deal_documents FOR SELECT
    USING (
        deal_id IN (
            SELECT id FROM deals WHERE team_id IN (
                SELECT team_id FROM user_profiles WHERE id = auth.uid()
            )
        )
    );

-- ============================================================================
-- STEP 4: TRIGGERS & FUNCTIONS
-- ============================================================================

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create default pipeline for new users
CREATE OR REPLACE FUNCTION public.create_default_pipeline()
RETURNS TRIGGER AS $$
DECLARE
    new_pipeline_id UUID;
BEGIN
    -- Create default pipeline
    INSERT INTO public.pipelines (owner_id, name, description, is_default)
    VALUES (NEW.id, 'My Pipeline', 'Default deal pipeline', TRUE)
    RETURNING id INTO new_pipeline_id;
    
    -- Create default stages
    INSERT INTO public.pipeline_stages (pipeline_id, name, color, display_order) VALUES
        (new_pipeline_id, 'Need to Contact', '#94a3b8', 1),
        (new_pipeline_id, 'Contacted', '#60a5fa', 2),
        (new_pipeline_id, 'Prospect', '#a78bfa', 3),
        (new_pipeline_id, 'Negotiations', '#ec4899', 4),
        (new_pipeline_id, 'Offer Sent', '#f59e0b', 5),
        (new_pipeline_id, 'Under Contract', '#10b981', 6),
        (new_pipeline_id, 'Closed Won', '#00d4aa', 7),
        (new_pipeline_id, 'Closed Lost', '#ef4444', 8);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default pipeline after user profile is created
DROP TRIGGER IF EXISTS on_user_profile_created ON public.user_profiles;
CREATE TRIGGER on_user_profile_created
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.create_default_pipeline();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_pipelines_updated_at
    BEFORE UPDATE ON pipelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_deals_updated_at
    BEFORE UPDATE ON deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_calendar_events_updated_at
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- STEP 5: STORAGE BUCKETS (Run separately if needed)
-- ============================================================================
-- Note: Storage buckets need to be created via Supabase Dashboard or API
-- Required buckets:
-- 1. deal-images (public) - For property images
-- 2. deal-documents (private) - For contracts, brochures, etc.
-- 3. avatars (public) - For user profile pictures

-- ============================================================================
-- SCHEMA COMPLETE!
-- ============================================================================
-- Tables created: 11
-- RLS enabled on all tables
-- Triggers for:
--   - Auto-create user profile on signup
--   - Auto-create default pipeline for new users
--   - Auto-update updated_at timestamps
-- ============================================================================
