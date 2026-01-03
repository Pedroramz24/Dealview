-- Migration: Create map_properties table
-- Purpose: Store 100k+ properties for internal Map CRM tool

CREATE TABLE map_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  
  -- Address & Location
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  
  -- Property Details
  title TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('Gas', 'Retail', 'Industrial', 'Office', 'Land', 'Multifamily')),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'converted', 'dead')),
  
  -- Financial Data
  asking_price NUMERIC,
  lot_size NUMERIC,
  building_size NUMERIC,
  assessed_value NUMERIC,
  cap_rate NUMERIC,
  noi NUMERIC,
  income NUMERIC,
  expenses NUMERIC,
  
  -- Additional Details
  year_built INTEGER,
  parking_spaces INTEGER,
  occupancy NUMERIC,
  zoning TEXT,
  lease_type TEXT,
  description TEXT,
  notes TEXT,
  
  -- Owner Information
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_edited_by UUID REFERENCES auth.users(id)
);

-- Performance indexes for 100k+ properties
CREATE INDEX idx_map_properties_owner ON map_properties(owner_id);
CREATE INDEX idx_map_properties_team ON map_properties(team_id);
CREATE INDEX idx_map_properties_asset_type ON map_properties(asset_type);
CREATE INDEX idx_map_properties_city ON map_properties(city);
CREATE INDEX idx_map_properties_status ON map_properties(status);
CREATE INDEX idx_map_properties_location ON map_properties USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));

-- Enable Realtime for real-time collaboration
ALTER TABLE map_properties REPLICA IDENTITY FULL;

COMMENT ON TABLE map_properties IS 'Internal Map CRM properties - access restricted by permissions';
