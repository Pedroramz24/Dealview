#!/usr/bin/env python3
"""Apply enhanced publishing fields migration to Supabase."""
import os
from supabase import create_client, Client

# Get Supabase credentials
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing Supabase credentials")

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Migration SQL
migration_sql = """
ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS cap_rate DECIMAL,
  ADD COLUMN IF NOT EXISTS noi DECIMAL,
  ADD COLUMN IF NOT EXISTS sale_conditions TEXT[],
  ADD COLUMN IF NOT EXISTS sale_notes TEXT,
  ADD COLUMN IF NOT EXISTS image_urls TEXT[],
  ADD COLUMN IF NOT EXISTS brochure_document_ids TEXT[],
  ADD COLUMN IF NOT EXISTS building_status TEXT,
  ADD COLUMN IF NOT EXISTS buildings INTEGER,
  ADD COLUMN IF NOT EXISTS units INTEGER,
  ADD COLUMN IF NOT EXISTS gba DECIMAL,
  ADD COLUMN IF NOT EXISTS floors INTEGER,
  ADD COLUMN IF NOT EXISTS year_built INTEGER,
  ADD COLUMN IF NOT EXISTS year_renovated INTEGER,
  ADD COLUMN IF NOT EXISTS metering TEXT,
  ADD COLUMN IF NOT EXISTS construction TEXT,
  ADD COLUMN IF NOT EXISTS parking TEXT,
  ADD COLUMN IF NOT EXISTS land_area DECIMAL,
  ADD COLUMN IF NOT EXISTS zoning TEXT,
  ADD COLUMN IF NOT EXISTS zoning_description TEXT,
  ADD COLUMN IF NOT EXISTS unit_mix JSONB,
  ADD COLUMN IF NOT EXISTS highlights TEXT[],
  ADD COLUMN IF NOT EXISTS is_land_listing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS lot_size DECIMAL,
  ADD COLUMN IF NOT EXISTS lot_description TEXT,
  ADD COLUMN IF NOT EXISTS secondary_type TEXT,
  ADD COLUMN IF NOT EXISTS topography TEXT,
  ADD COLUMN IF NOT EXISTS grading TEXT,
  ADD COLUMN IF NOT EXISTS completeness_score INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS deals_building_status_idx ON public.deals(building_status) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS deals_is_land_listing_idx ON public.deals(is_land_listing) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS deals_secondary_type_idx ON public.deals(secondary_type) WHERE is_land_listing = true;
CREATE INDEX IF NOT EXISTS deals_completeness_score_idx ON public.deals(completeness_score) WHERE is_published = true;
"""

try:
    # Execute migration
    result = supabase.rpc('exec_sql', {'sql': migration_sql}).execute()
    print("✅ Migration applied successfully!")
    print(f"Result: {result}")
except Exception as e:
    print(f"❌ Error applying migration: {str(e)}")
    print("\nTrying alternative method with psycopg2...")
    
    # Try with psycopg2 if RPC doesn't work
    try:
        import psycopg2
        from urllib.parse import urlparse
        
        # Parse Supabase URL to get database connection
        # This will fail but let's log what we get
        print(f"Supabase URL: {SUPABASE_URL}")
        print("\nNote: Direct SQL execution requires database URL, not API URL.")
        print("Migration file created at: /app/supabase_migrations/025_enhanced_publishing_fields.sql")
        print("\nPlease apply migration via Supabase Dashboard or use the Supabase CLI.")
    except Exception as e2:
        print(f"Alternative method also failed: {str(e2)}")
