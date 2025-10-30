-- Add design column to email_campaigns for Unlayer JSON storage
ALTER TABLE public.email_campaigns 
ADD COLUMN IF NOT EXISTS design JSONB;

-- Add comment
COMMENT ON COLUMN public.email_campaigns.design IS 'Unlayer design JSON for re-editing campaigns';
