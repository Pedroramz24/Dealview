-- =====================================================
-- DealLinked Marketplace: User Extensions
-- Phase 2: Add membership, roles, and buy box preferences
-- =====================================================

-- Add membership and role fields to user_profiles
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS membership_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS membership_tier TEXT DEFAULT 'base', -- 'base', 'pro'
  ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'investor', -- 'broker', 'investor', 'admin'
  ADD COLUMN IF NOT EXISTS buy_box_preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add indexes for membership queries
CREATE INDEX IF NOT EXISTS user_profiles_membership_active_idx ON public.user_profiles(membership_active);
CREATE INDEX IF NOT EXISTS user_profiles_user_role_idx ON public.user_profiles(user_role);

-- Update RLS policies for membership-based access
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create new policies
CREATE POLICY "Users can view own profile" 
  ON public.user_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.user_profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Comment documentation
COMMENT ON COLUMN public.user_profiles.membership_active IS 'Whether user has active paid membership';
COMMENT ON COLUMN public.user_profiles.membership_tier IS 'Membership tier: base or pro';
COMMENT ON COLUMN public.user_profiles.user_role IS 'User role: broker (can publish), investor (can browse), admin';
COMMENT ON COLUMN public.user_profiles.buy_box_preferences IS 'JSON object with preferred markets, asset types, price ranges, etc.';
COMMENT ON COLUMN public.user_profiles.onboarding_completed IS 'Whether user has completed onboarding wizard';
