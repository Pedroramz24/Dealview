-- Migration: Add permissions column for internal tool access control
-- Purpose: Enable role-based access to Map CRM internal tool

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_user_profiles_permissions 
ON user_profiles USING GIN(permissions);

COMMENT ON COLUMN user_profiles.permissions IS 'Internal tool access permissions (e.g., map_crm_access: true)';
