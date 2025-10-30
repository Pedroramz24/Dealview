-- =====================================================
-- Add design column to email_templates for Unlayer JSON storage
-- This allows templates to be re-edited in the Unlayer editor
-- =====================================================

-- Add design column to email_templates
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS design JSONB;

-- Add comment
COMMENT ON COLUMN public.email_templates.design IS 'Unlayer design JSON for re-editing templates in the email editor';

-- =====================================================
-- DONE!
-- Run this script in Supabase SQL Editor
-- =====================================================
