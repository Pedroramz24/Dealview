-- Migration: Extend map_properties with PropertyRadar fields
-- Architecture: Hybrid approach with indexed columns + JSONB for flexibility

-- Core PropertyRadar fields (indexed for performance)
ALTER TABLE map_properties
ADD COLUMN IF NOT EXISTS beds INTEGER,
ADD COLUMN IF NOT EXISTS baths NUMERIC,
ADD COLUMN IF NOT EXISTS est_value NUMERIC,
ADD COLUMN IF NOT EXISTS land_value NUMERIC,
ADD COLUMN IF NOT EXISTS improvements_value NUMERIC,
ADD COLUMN IF NOT EXISTS est_equity_dollars NUMERIC,
ADD COLUMN IF NOT EXISTS est_equity_percent NUMERIC,
ADD COLUMN IF NOT EXISTS tax_delinquent_dollars NUMERIC,
ADD COLUMN IF NOT EXISTS purchase_date DATE,
ADD COLUMN IF NOT EXISTS purchase_amount NUMERIC,
ADD COLUMN IF NOT EXISTS county TEXT,
ADD COLUMN IF NOT EXISTS apn TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS listing_status TEXT,
ADD COLUMN IF NOT EXISTS owner_type TEXT;

-- Boolean flags for targeting (indexed for fast filtering)
ALTER TABLE map_properties
ADD COLUMN IF NOT EXISTS high_equity BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS underwater BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bankruptcy BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS foreclosure BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS owner_occupied BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cash_buyer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS listed_for_sale BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tax_delinquent BOOLEAN DEFAULT FALSE;

-- JSONB column for flexible/rarely-queried fields
ALTER TABLE map_properties
ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}';

-- Performance indexes for PropertyRadar targeting
CREATE INDEX IF NOT EXISTS idx_map_properties_est_equity_percent ON map_properties(est_equity_percent) WHERE est_equity_percent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_map_properties_high_equity ON map_properties(high_equity) WHERE high_equity = true;
CREATE INDEX IF NOT EXISTS idx_map_properties_tax_delinquent ON map_properties(tax_delinquent) WHERE tax_delinquent = true;
CREATE INDEX IF NOT EXISTS idx_map_properties_foreclosure ON map_properties(foreclosure) WHERE foreclosure = true;
CREATE INDEX IF NOT EXISTS idx_map_properties_owner_occupied ON map_properties(owner_occupied);
CREATE INDEX IF NOT EXISTS idx_map_properties_underwater ON map_properties(underwater) WHERE underwater = true;
CREATE INDEX IF NOT EXISTS idx_map_properties_county ON map_properties(county);
CREATE INDEX IF NOT EXISTS idx_map_properties_beds ON map_properties(beds);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_map_properties_custom_data ON map_properties USING GIN(custom_data);

COMMENT ON COLUMN map_properties.custom_data IS 'Flexible storage for PropertyRadar fields: mail address, lien details, etc.';
COMMENT ON COLUMN map_properties.est_equity_percent IS 'PropertyRadar estimated equity percentage - indexed for targeting';
COMMENT ON COLUMN map_properties.high_equity IS 'PropertyRadar high equity flag - indexed for lead filtering';
