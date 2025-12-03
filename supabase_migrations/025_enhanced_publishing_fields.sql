-- =====================================================
-- Enhanced Publishing Wizard Fields
-- Phase 1: Add comprehensive property and land listing fields
-- =====================================================

-- Add Property Listing Fields to deals table
ALTER TABLE public.deals 
  -- Financial Details
  ADD COLUMN IF NOT EXISTS cap_rate DECIMAL,
  ADD COLUMN IF NOT EXISTS noi DECIMAL,
  
  -- Sale Conditions & Notes
  ADD COLUMN IF NOT EXISTS sale_conditions TEXT[], -- Array for multiple selections
  ADD COLUMN IF NOT EXISTS sale_notes TEXT,
  
  -- Media References
  ADD COLUMN IF NOT EXISTS image_urls TEXT[], -- Array of image URLs
  ADD COLUMN IF NOT EXISTS brochure_document_ids TEXT[], -- References to uploaded documents
  
  -- Building Details
  ADD COLUMN IF NOT EXISTS building_status TEXT, -- 'Under Construction', 'Under Renovation', 'Existing'
  ADD COLUMN IF NOT EXISTS buildings INTEGER,
  ADD COLUMN IF NOT EXISTS units INTEGER,
  ADD COLUMN IF NOT EXISTS gba DECIMAL, -- Gross Building Area
  ADD COLUMN IF NOT EXISTS floors INTEGER,
  ADD COLUMN IF NOT EXISTS year_built INTEGER,
  ADD COLUMN IF NOT EXISTS year_renovated INTEGER,
  ADD COLUMN IF NOT EXISTS metering TEXT,
  ADD COLUMN IF NOT EXISTS construction TEXT,
  ADD COLUMN IF NOT EXISTS parking TEXT,
  ADD COLUMN IF NOT EXISTS land_area DECIMAL,
  ADD COLUMN IF NOT EXISTS zoning TEXT,
  ADD COLUMN IF NOT EXISTS zoning_description TEXT,
  ADD COLUMN IF NOT EXISTS unit_mix JSONB, -- For multi-family and retail
  
  -- Highlights
  ADD COLUMN IF NOT EXISTS highlights TEXT[],
  
  -- Land Listing Specific Fields
  ADD COLUMN IF NOT EXISTS is_land_listing BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS lot_size DECIMAL,
  ADD COLUMN IF NOT EXISTS lot_description TEXT,
  ADD COLUMN IF NOT EXISTS secondary_type TEXT, -- 'Commercial', 'Industrial', 'Residential', 'Agricultural'
  ADD COLUMN IF NOT EXISTS topography TEXT, -- 'Level', 'Rolling', 'Sloping', 'Steep'
  ADD COLUMN IF NOT EXISTS grading TEXT, -- 'Asphalt Paved', 'Finish Grade', etc.
  
  -- Completeness Tracking
  ADD COLUMN IF NOT EXISTS completeness_score INTEGER DEFAULT 0; -- 0-100

-- Add indexes for new searchable fields
CREATE INDEX IF NOT EXISTS deals_building_status_idx ON public.deals(building_status) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS deals_is_land_listing_idx ON public.deals(is_land_listing) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS deals_secondary_type_idx ON public.deals(secondary_type) WHERE is_land_listing = true;
CREATE INDEX IF NOT EXISTS deals_completeness_score_idx ON public.deals(completeness_score) WHERE is_published = true;

-- Add comments for documentation
COMMENT ON COLUMN public.deals.cap_rate IS 'Capitalization rate for the property';
COMMENT ON COLUMN public.deals.noi IS 'Net Operating Income';
COMMENT ON COLUMN public.deals.sale_conditions IS 'Array of sale conditions like 1031 Exchange, Build to Suit, etc.';
COMMENT ON COLUMN public.deals.sale_notes IS 'Additional notes about the sale';
COMMENT ON COLUMN public.deals.image_urls IS 'Array of property image URLs';
COMMENT ON COLUMN public.deals.brochure_document_ids IS 'References to uploaded documents in workspace';
COMMENT ON COLUMN public.deals.building_status IS 'Current status: Under Construction, Under Renovation, Existing';
COMMENT ON COLUMN public.deals.gba IS 'Gross Building Area in square feet';
COMMENT ON COLUMN public.deals.unit_mix IS 'JSON object containing unit mix details for multi-family/retail';
COMMENT ON COLUMN public.deals.highlights IS 'Array of key highlights for the property';
COMMENT ON COLUMN public.deals.is_land_listing IS 'Whether this is a land listing vs property listing';
COMMENT ON COLUMN public.deals.lot_number IS 'Lot number for land listings';
COMMENT ON COLUMN public.deals.secondary_type IS 'Land type: Commercial, Industrial, Residential, Agricultural';
COMMENT ON COLUMN public.deals.topography IS 'Land topography: Level, Rolling, Sloping, Steep';
COMMENT ON COLUMN public.deals.grading IS 'Land grading status';
COMMENT ON COLUMN public.deals.completeness_score IS 'Listing completeness percentage (0-100). Must be 80+ to publish';
