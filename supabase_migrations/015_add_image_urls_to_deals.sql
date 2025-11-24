-- Add image_urls column to deals table for multiple images support
-- This allows storing an array of image URLs instead of just a single image_url

ALTER TABLE deals ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Add comment to explain the column
COMMENT ON COLUMN deals.image_urls IS 'Array of image URLs for property photos. First image in array is considered the primary image.';

-- Migrate existing image_url data to image_urls array
UPDATE deals 
SET image_urls = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);
