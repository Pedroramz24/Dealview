-- LLC Lookup Cache - Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/ygezobmpewthqvsfqrbk/sql

-- ============================================
-- LLC LOOKUP CACHE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS llc_lookup_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    llc_name TEXT NOT NULL,
    jurisdiction_code TEXT NOT NULL,
    
    -- OpenCorporates data
    company_number TEXT,
    opencorporates_url TEXT,
    registry_url TEXT,
    incorporation_date DATE,
    company_type TEXT,
    current_status TEXT,
    
    -- Registered agent info
    registered_agent_name TEXT,
    registered_agent_address TEXT,
    
    -- Officers/directors
    officers JSONB DEFAULT '[]'::jsonb,
    
    -- Full response from OpenCorporates
    raw_data JSONB,
    
    -- Phone numbers discovered
    phone_numbers JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    source TEXT NOT NULL CHECK (source IN ('opencorporates', 'texas_sos', 'manual')),
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    lookup_count INTEGER DEFAULT 1,
    last_lookup_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(llc_name, jurisdiction_code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_llc_lookup_cache_llc_name ON llc_lookup_cache(llc_name);
CREATE INDEX IF NOT EXISTS idx_llc_lookup_cache_jurisdiction ON llc_lookup_cache(jurisdiction_code);
CREATE INDEX IF NOT EXISTS idx_llc_lookup_cache_agent_name ON llc_lookup_cache(registered_agent_name);
CREATE INDEX IF NOT EXISTS idx_llc_lookup_cache_last_lookup ON llc_lookup_cache(last_lookup_at);

-- No RLS needed - this is internal cache data

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN 
    RAISE NOTICE '✅ LLC Lookup Cache table created successfully!';
END $$;
