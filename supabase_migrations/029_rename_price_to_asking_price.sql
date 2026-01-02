-- =====================================================
-- DealView CRM - Schema Alignment Fix
-- Rename 'price' column to 'asking_price' to match backend models
-- =====================================================

-- Rename the price column to asking_price
ALTER TABLE public.deals 
RENAME COLUMN price TO asking_price;

-- Add comment for clarity
COMMENT ON COLUMN public.deals.asking_price IS 'The listing or asking price for the property/deal';
