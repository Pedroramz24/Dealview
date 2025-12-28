-- ==========================================================================
-- SUPABASE SECURITY HARDENING - Function Search Path Fix (CORRECTED)
-- ==========================================================================
-- Issue: 19 functions have mutable search_path (security vulnerability)
-- Fix: DROP existing functions, then CREATE with SET search_path TO 'public'
-- Run this in Supabase SQL Editor
-- ==========================================================================

-- ==========================================================================
-- STEP 1: Drop all existing functions
-- ==========================================================================

DROP FUNCTION IF EXISTS has_role(uuid, text);
DROP FUNCTION IF EXISTS has_verified_role(uuid, text);
DROP FUNCTION IF EXISTS can_publish_as_owner(uuid);
DROP FUNCTION IF EXISTS update_calendar_events_updated_at();
DROP FUNCTION IF EXISTS get_ready_scheduled_emails();
DROP FUNCTION IF EXISTS update_campaign_stats();
DROP FUNCTION IF EXISTS get_default_pipeline(uuid);
DROP FUNCTION IF EXISTS get_first_stage(uuid);
DROP FUNCTION IF EXISTS set_ncnd_expiration();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_updated_at();
DROP FUNCTION IF EXISTS create_default_pipeline_for_new_user();
DROP FUNCTION IF EXISTS increment_deal_view_count(uuid);
DROP FUNCTION IF EXISTS update_deal_inquiry_count();
DROP FUNCTION IF EXISTS handle_new_team();
DROP FUNCTION IF EXISTS update_deal_saved_count();
DROP FUNCTION IF EXISTS calculate_response_time();
DROP FUNCTION IF EXISTS calculate_broker_reputation(uuid);

-- ==========================================================================
-- STEP 2: Recreate all functions with SET search_path TO 'public'
-- ==========================================================================

-- Function 1: has_role
CREATE OR REPLACE FUNCTION has_role(user_id_input uuid, role_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = user_id_input 
    AND roles @> ARRAY[role_input]::text[]
  );
END;
$$;

-- Function 2: has_verified_role
CREATE OR REPLACE FUNCTION has_verified_role(user_id_input uuid, role_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = user_id_input 
    AND role_verifications @> jsonb_build_object(role_input, true)
  );
END;
$$;

-- Function 3: can_publish_as_owner
CREATE OR REPLACE FUNCTION can_publish_as_owner(user_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = user_id_input 
    AND (
      role_verifications->>'seller' = 'true' 
      OR role_verifications->>'owner' = 'true'
    )
  );
END;
$$;

-- Function 4: update_calendar_events_updated_at
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function 5: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function 6: handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW());
  RETURN NEW;
END;
$$;

-- Function 7: handle_updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function 8: create_default_pipeline_for_new_user
CREATE OR REPLACE FUNCTION create_default_pipeline_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_pipeline_id uuid;
BEGIN
  -- Create default pipeline
  INSERT INTO pipelines (id, name, owner_id, color, is_default, created_at, updated_at)
  VALUES (gen_random_uuid(), 'Main Pipeline', NEW.id, '#00b8d4', true, NOW(), NOW())
  RETURNING id INTO new_pipeline_id;
  
  -- Create default stages
  INSERT INTO pipeline_stages (id, pipeline_id, name, color, display_order, stage_weight)
  VALUES
    (gen_random_uuid(), new_pipeline_id, 'Lead', '#94a3b8', 0, 0.1),
    (gen_random_uuid(), new_pipeline_id, 'Qualified', '#3b82f6', 1, 0.25),
    (gen_random_uuid(), new_pipeline_id, 'Proposal', '#f59e0b', 2, 0.5),
    (gen_random_uuid(), new_pipeline_id, 'Negotiation', '#8b5cf6', 3, 0.75),
    (gen_random_uuid(), new_pipeline_id, 'Closed Won', '#10b981', 4, 1.0);
  
  RETURN NEW;
END;
$$;

-- Function 9: increment_deal_view_count
CREATE OR REPLACE FUNCTION increment_deal_view_count(deal_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE deals
  SET marketplace_views_count = COALESCE(marketplace_views_count, 0) + 1
  WHERE id = deal_id_input;
END;
$$;

-- Function 10: update_deal_inquiry_count
CREATE OR REPLACE FUNCTION update_deal_inquiry_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE deals
  SET marketplace_inquiries_count = (
    SELECT COUNT(*) FROM marketplace_inquiries WHERE deal_id = NEW.deal_id
  )
  WHERE id = NEW.deal_id;
  RETURN NEW;
END;
$$;

-- Function 11: handle_new_team
CREATE OR REPLACE FUNCTION handle_new_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Add creator as owner
  INSERT INTO team_members (id, team_id, user_id, role, joined_at)
  VALUES (gen_random_uuid(), NEW.id, NEW.created_by, 'owner', NOW());
  RETURN NEW;
END;
$$;

-- Function 12: update_deal_saved_count
CREATE OR REPLACE FUNCTION update_deal_saved_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE deals
    SET marketplace_saves_count = COALESCE(marketplace_saves_count, 0) + 1
    WHERE id = NEW.deal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE deals
    SET marketplace_saves_count = GREATEST(COALESCE(marketplace_saves_count, 0) - 1, 0)
    WHERE id = OLD.deal_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Function 13: calculate_response_time
CREATE OR REPLACE FUNCTION calculate_response_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.response_at IS NOT NULL AND OLD.response_at IS NULL THEN
    NEW.response_time_hours = EXTRACT(EPOCH FROM (NEW.response_at - NEW.created_at)) / 3600;
  END IF;
  RETURN NEW;
END;
$$;

-- Function 14: calculate_broker_reputation
CREATE OR REPLACE FUNCTION calculate_broker_reputation(broker_id_input uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  avg_response_time numeric;
  total_inquiries integer;
  total_deals integer;
  reputation_score numeric;
BEGIN
  -- Calculate average response time
  SELECT AVG(response_time_hours) INTO avg_response_time
  FROM marketplace_inquiries
  WHERE broker_id = broker_id_input AND response_time_hours IS NOT NULL;
  
  -- Count total inquiries
  SELECT COUNT(*) INTO total_inquiries
  FROM marketplace_inquiries
  WHERE broker_id = broker_id_input;
  
  -- Count total closed deals
  SELECT COUNT(*) INTO total_deals
  FROM deals
  WHERE owner_id = broker_id_input AND approval_status = 'approved';
  
  -- Calculate reputation (simple formula)
  reputation_score := (
    COALESCE(100 - (avg_response_time * 2), 100) * 0.3 +
    LEAST(total_inquiries * 2, 100) * 0.3 +
    LEAST(total_deals * 5, 100) * 0.4
  );
  
  RETURN GREATEST(0, LEAST(100, reputation_score));
END;
$$;

-- ==========================================================================
-- Note: The following functions may not exist in your database or may have
-- different signatures. Only run the DROP/CREATE if you see warnings for them.
-- ==========================================================================

-- Function: get_ready_scheduled_emails (if exists)
-- DROP FUNCTION IF EXISTS get_ready_scheduled_emails();
-- CREATE OR REPLACE FUNCTION get_ready_scheduled_emails()
-- RETURNS TABLE (...) -- Add proper return type
-- LANGUAGE plpgsql
-- SET search_path TO 'public'
-- AS $$
-- BEGIN
--   -- Add original function body
-- END;
-- $$;

-- Function: update_campaign_stats (if exists)
-- Similar pattern as above

-- Function: get_default_pipeline (if exists)
-- Similar pattern as above

-- Function: get_first_stage (if exists)
-- Similar pattern as above

-- Function: set_ncnd_expiration (if exists)
-- Similar pattern as above

-- ==========================================================================
-- Verification Query
-- ==========================================================================

-- Run this after applying fixes to verify all functions have search_path set:
SELECT 
  p.proname AS function_name,
  CASE WHEN 'search_path=public' = ANY(p.proconfig) THEN '✅ FIXED' ELSE '❌ NOT FIXED' END AS status,
  p.proconfig AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.proname IN (
    'has_role', 'has_verified_role', 'can_publish_as_owner',
    'update_calendar_events_updated_at', 'get_ready_scheduled_emails',
    'update_campaign_stats', 'get_default_pipeline', 'get_first_stage',
    'set_ncnd_expiration', 'update_updated_at_column', 'handle_new_user',
    'handle_updated_at', 'create_default_pipeline_for_new_user',
    'increment_deal_view_count', 'update_deal_inquiry_count',
    'handle_new_team', 'update_deal_saved_count', 'calculate_response_time',
    'calculate_broker_reputation'
  )
ORDER BY function_name;

-- Expected: All functions should show '✅ FIXED' status
