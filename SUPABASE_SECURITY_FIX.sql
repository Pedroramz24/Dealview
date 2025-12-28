-- ==========================================================================
-- SUPABASE SECURITY HARDENING - Function Search Path Fix
-- ==========================================================================
-- Issue: 19 functions have mutable search_path (security vulnerability)
-- Fix: Add SET search_path TO 'public'; to each function definition
-- Run this in Supabase SQL Editor
-- ==========================================================================

-- Note: This script shows the pattern for fixing the search_path issue
-- You'll need to recreate each function with the search_path set explicitly

-- Example pattern for fixing functions:
-- 1. Drop and recreate each function with SET search_path
-- 2. Preserve original function logic
-- 3. Add security definer if needed

-- ==========================================================================
-- Function 1: has_role
-- ==========================================================================
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

-- ==========================================================================
-- Function 2: has_verified_role
-- ==========================================================================
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

-- ==========================================================================
-- Function 3: can_publish_as_owner
-- ==========================================================================
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

-- ==========================================================================
-- Trigger Functions - Add search_path
-- ==========================================================================

-- update_calendar_events_updated_at
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

-- update_updated_at_column
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

-- handle_new_user
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

-- handle_updated_at
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

-- create_default_pipeline_for_new_user
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

-- increment_deal_view_count
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

-- update_deal_inquiry_count
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

-- handle_new_team
CREATE OR REPLACE FUNCTION handle_new_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Add creator as owner
  INSERT INTO team_members (team_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.created_by, 'owner', NOW());
  RETURN NEW;
END;
$$;

-- update_deal_saved_count
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

-- calculate_response_time
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

-- calculate_broker_reputation
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
  
  -- Calculate reputation (simple formula - can be enhanced)
  reputation_score := (
    COALESCE(100 - (avg_response_time * 2), 100) * 0.3 +  -- Response time weight
    LEAST(total_inquiries * 2, 100) * 0.3 +               -- Inquiry volume weight
    LEAST(total_deals * 5, 100) * 0.4                      -- Deal volume weight
  );
  
  RETURN GREATEST(0, LEAST(100, reputation_score));
END;
$$;

-- ==========================================================================
-- Remaining Functions (Pattern to follow)
-- ==========================================================================

-- For the remaining functions (get_ready_scheduled_emails, update_campaign_stats, 
-- get_default_pipeline, get_first_stage, set_ncnd_expiration), follow this pattern:

-- 1. Get the original function definition from Supabase
-- 2. Add "SET search_path TO 'public'" before AS $$
-- 3. Recreate the function

-- Example:
-- CREATE OR REPLACE FUNCTION function_name(...)
-- RETURNS return_type
-- LANGUAGE plpgsql
-- SECURITY DEFINER  -- if applicable
-- SET search_path TO 'public'  -- ADD THIS LINE
-- AS $$
-- BEGIN
--   -- original function body
-- END;
-- $$;

-- ==========================================================================
-- Verification Query
-- ==========================================================================

-- Run this after applying fixes to verify all functions have search_path set:
SELECT 
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS return_type,
  prosecdef AS is_security_definer,
  proconfig AS config_settings
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
ORDER BY p.proname;

-- Look for proconfig column - should contain {search_path=public} for each function
