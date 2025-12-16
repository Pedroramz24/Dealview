-- Migration: Unified Roles System
-- Purpose: Implement hybrid roles architecture for Broker/Seller/Buyer system
-- Date: 2025-01-15

-- =====================================================
-- STEP 1: Add roles and verification columns to user_profiles
-- =====================================================

-- Add roles array (users can have multiple verified roles)
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['buyer'],
  ADD COLUMN IF NOT EXISTS primary_role TEXT DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS role_verifications JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Add broker-specific profile fields
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS broker_license TEXT,
  ADD COLUMN IF NOT EXISTS broker_firm TEXT,
  ADD COLUMN IF NOT EXISTS broker_phone TEXT,
  ADD COLUMN IF NOT EXISTS broker_markets TEXT[],
  ADD COLUMN IF NOT EXISTS broker_specialties TEXT[],
  ADD COLUMN IF NOT EXISTS broker_bio TEXT,
  ADD COLUMN IF NOT EXISTS broker_w9_url TEXT,
  ADD COLUMN IF NOT EXISTS broker_license_url TEXT;

-- Add seller-specific profile fields  
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS seller_entity_name TEXT,
  ADD COLUMN IF NOT EXISTS seller_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS seller_phone TEXT;

-- Add buyer-specific profile fields (most already exist in buy_box_preferences)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS buyer_company TEXT,
  ADD COLUMN IF NOT EXISTS buyer_investment_criteria JSONB DEFAULT '{}';

-- Add profile visibility settings
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'members_only'; -- 'public', 'members_only', 'private'

COMMENT ON COLUMN user_profiles.roles IS 'Array of verified roles: broker, seller, buyer';
COMMENT ON COLUMN user_profiles.primary_role IS 'Primary role displayed in UI: broker, seller, buyer';
COMMENT ON COLUMN user_profiles.role_verifications IS 'JSONB object tracking verification status per role: {"broker": {"status": "verified", "verified_at": "...", "verified_by": "..."}, ...}';
COMMENT ON COLUMN user_profiles.profile_visibility IS 'Profile visibility: public (anyone), members_only (logged in users), private (owner only)';


-- =====================================================
-- STEP 2: Create role verification requests table
-- =====================================================

CREATE TABLE IF NOT EXISTS role_verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('broker', 'seller')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Request details
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  admin_notes TEXT,
  
  -- Broker verification data
  broker_license TEXT,
  broker_firm TEXT,
  broker_phone TEXT,
  broker_markets TEXT[],
  broker_specialties TEXT[],
  broker_w9_url TEXT,
  broker_license_url TEXT,
  
  -- Seller verification data
  seller_entity_name TEXT,
  seller_entity_type TEXT,
  seller_phone TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_verification_requests_user_id ON role_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_verification_requests_status ON role_verification_requests(status);

COMMENT ON TABLE role_verification_requests IS 'User requests to become verified brokers or sellers';


-- =====================================================
-- STEP 3: Create ownership verification table (per-property)
-- =====================================================

CREATE TABLE IF NOT EXISTS ownership_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Verification proof
  proof_type TEXT, -- 'deed', 'tax_record', 'title_report', 'other'
  proof_document_url TEXT,
  
  -- Review
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  admin_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ownership_verifications_user_id ON ownership_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ownership_verifications_status ON ownership_verifications(status);
CREATE INDEX IF NOT EXISTS idx_ownership_verifications_address ON ownership_verifications(property_address);

COMMENT ON TABLE ownership_verifications IS 'Per-property ownership verification for sellers';


-- =====================================================
-- STEP 4: Create admin actions audit log
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL, -- 'approve_role', 'reject_role', 'approve_ownership', 'reject_ownership', 'approve_deal', 'reject_deal', etc.
  target_type TEXT NOT NULL, -- 'role_verification', 'ownership_verification', 'deal', 'user'
  target_id UUID NOT NULL,
  
  -- Action details
  action_details JSONB DEFAULT '{}',
  notes TEXT,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

COMMENT ON TABLE admin_actions IS 'Audit log of all admin actions for compliance and tracking';


-- =====================================================
-- STEP 5: Add RLS policies
-- =====================================================

-- Role verification requests policies
ALTER TABLE role_verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own role verification requests"
  ON role_verification_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create role verification requests"
  ON role_verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all role verification requests"
  ON role_verification_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update role verification requests"
  ON role_verification_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Ownership verification policies
ALTER TABLE ownership_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ownership verifications"
  ON ownership_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create ownership verifications"
  ON ownership_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all ownership verifications"
  ON ownership_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update ownership verifications"
  ON ownership_verifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Admin actions policies
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all admin actions"
  ON admin_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can create admin actions"
  ON admin_actions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    ) AND auth.uid() = admin_id
  );


-- =====================================================
-- STEP 6: Create helper functions
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id
    AND role_name = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has verified role
CREATE OR REPLACE FUNCTION has_verified_role(user_id UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  verification JSONB;
BEGIN
  SELECT role_verifications->role_name INTO verification
  FROM user_profiles
  WHERE id = user_id;
  
  IF verification IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN (verification->>'status' = 'verified');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can publish as owner for specific property
CREATE OR REPLACE FUNCTION can_publish_as_owner(user_id UUID, property_address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM ownership_verifications
    WHERE ownership_verifications.user_id = can_publish_as_owner.user_id
    AND ownership_verifications.property_address = can_publish_as_owner.property_address
    AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION has_role IS 'Check if user has a specific role (verified or not)';
COMMENT ON FUNCTION has_verified_role IS 'Check if user has a verified role';
COMMENT ON FUNCTION can_publish_as_owner IS 'Check if user can publish as property owner for specific address';
