-- =====================================================
-- User Profiles Enhancement
-- Add fields for Settings page functionality
-- =====================================================

-- Add new fields to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Chicago',
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Add comments
COMMENT ON COLUMN public.user_profiles.full_name IS 'User full name for display';
COMMENT ON COLUMN public.user_profiles.title IS 'Job title or role';
COMMENT ON COLUMN public.user_profiles.timezone IS 'User preferred timezone';
COMMENT ON COLUMN public.user_profiles.avatar_url IS 'Profile picture URL';
COMMENT ON COLUMN public.user_profiles.company_logo_url IS 'Company logo URL';

-- =====================================================
-- DONE!
-- Run this script in Supabase SQL Editor
-- =====================================================
