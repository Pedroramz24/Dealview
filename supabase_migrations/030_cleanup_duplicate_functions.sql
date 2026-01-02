-- ====================================================================================
-- CLEANUP: Remove Duplicate Functions
-- Issue: DROP FUNCTION didn't work because there are function overloads
-- Fix: Explicitly drop ALL versions of these functions
-- ====================================================================================

-- Drop all versions of can_publish_as_owner
DROP FUNCTION IF EXISTS public.can_publish_as_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_publish_as_owner CASCADE;

-- Drop all versions of get_ready_scheduled_emails  
DROP FUNCTION IF EXISTS public.get_ready_scheduled_emails() CASCADE;
DROP FUNCTION IF EXISTS public.get_ready_scheduled_emails CASCADE;

-- Drop all versions of increment_deal_view_count
DROP FUNCTION IF EXISTS public.increment_deal_view_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.increment_deal_view_count CASCADE;

-- Now recreate the CORRECT versions (without SECURITY DEFINER)

-- FUNCTION 1: can_publish_as_owner (Safe version)
CREATE OR REPLACE FUNCTION public.can_publish_as_owner(user_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER  -- Explicitly set to INVOKER (not DEFINER)
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

REVOKE EXECUTE ON FUNCTION public.can_publish_as_owner(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_publish_as_owner(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_publish_as_owner(uuid) TO authenticated;

-- FUNCTION 2: increment_deal_view_count (Safe version)
CREATE OR REPLACE FUNCTION public.increment_deal_view_count(deal_id_input uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE  -- Changed from STABLE to VOLATILE since it modifies data
SECURITY INVOKER  -- Explicitly set to INVOKER (not DEFINER)
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE deals
  SET marketplace_views_count = COALESCE(marketplace_views_count, 0) + 1
  WHERE id = deal_id_input;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_deal_view_count(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_deal_view_count(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_deal_view_count(uuid) TO authenticated;

-- NOTE: get_ready_scheduled_emails is intentionally NOT recreated
-- This function should be handled by backend Edge Functions, not exposed as SQL

-- Verification Query
SELECT 
  p.proname AS function_name,
  p.prosecdef AS has_security_definer,
  p.provolatile AS volatility,
  p.proconfig AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('can_publish_as_owner', 'increment_deal_view_count')
ORDER BY p.proname;

-- Expected: Each function appears ONCE with has_security_definer = false
