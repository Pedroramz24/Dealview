-- ============================================================================
-- PHASE 1: MIGRATE EXISTING DEALS TO DEFAULT PIPELINE
-- ============================================================================
-- Run this AFTER running 005_customizable_pipelines.sql
-- This creates a default "Off-Market" pipeline for all existing users
-- and migrates their existing deals to this pipeline

-- ============================================================================
-- IMPORTANT: This is a DATA MIGRATION script
-- Run this in Supabase SQL Editor AFTER the schema creation
-- ============================================================================

-- ============================================================================
-- 1. CREATE DEFAULT PIPELINE FOR ALL EXISTING USERS
-- ============================================================================
DO $$
DECLARE
  user_record RECORD;
  new_pipeline_id UUID;
BEGIN
  -- Loop through all users who have deals
  FOR user_record IN 
    SELECT DISTINCT owner_id 
    FROM deals 
    WHERE owner_id IS NOT NULL
  LOOP
    -- Create default "Off-Market" pipeline for each user
    INSERT INTO pipelines (
      owner_id,
      name,
      description,
      color,
      icon,
      display_order,
      is_active,
      is_default
    ) VALUES (
      user_record.owner_id,
      'Off-Market',
      'Default pipeline for off-market deals and opportunities',
      '#00b8d4',
      'briefcase',
      0,
      true,
      true
    )
    RETURNING id INTO new_pipeline_id;
    
    -- Create default stages for this pipeline
    -- Stage 1: Need to Contact
    INSERT INTO pipeline_stages (pipeline_id, name, color, stage_weight, display_order)
    VALUES (new_pipeline_id, 'Need to Contact', '#94a3b8', 0.1, 0);
    
    -- Stage 2: Contacted
    INSERT INTO pipeline_stages (pipeline_id, name, color, stage_weight, display_order)
    VALUES (new_pipeline_id, 'Contacted', '#60a5fa', 0.2, 1);
    
    -- Stage 3: Prospect
    INSERT INTO pipeline_stages (pipeline_id, name, color, stage_weight, display_order)
    VALUES (new_pipeline_id, 'Prospect', '#a78bfa', 0.3, 2);
    
    -- Stage 4: Negotiations
    INSERT INTO pipeline_stages (pipeline_id, name, color, stage_weight, display_order)
    VALUES (new_pipeline_id, 'Negotiations', '#ec4899', 0.4, 3);
    
    -- Stage 5: Offer Sent
    INSERT INTO pipeline_stages (pipeline_id, name, color, stage_weight, display_order)
    VALUES (new_pipeline_id, 'Offer Sent', '#f59e0b', 0.5, 4);
    
    -- Stage 6: Under Contract
    INSERT INTO pipeline_stages (pipeline_id, name, color, stage_weight, display_order)
    VALUES (new_pipeline_id, 'Under Contract', '#10b981', 0.8, 5);
    
    -- Stage 7: Closed Won
    INSERT INTO pipeline_stages (pipeline_id, name, color, stage_weight, display_order)
    VALUES (new_pipeline_id, 'Closed Won', '#00d4aa', 1.0, 6);
    
    -- Stage 8: Overpriced
    INSERT INTO pipeline_stages (pipeline_id, name, color, stage_weight, display_order)
    VALUES (new_pipeline_id, 'Overpriced', '#ef4444', 0.05, 7);
    
    RAISE NOTICE 'Created default pipeline for user: %', user_record.owner_id;
  END LOOP;
END $$;

-- ============================================================================
-- 2. MAP OLD STAGE VALUES TO NEW PIPELINE_STAGE_IDs
-- ============================================================================
DO $$
DECLARE
  deal_record RECORD;
  user_pipeline_id UUID;
  target_stage_id UUID;
  stage_name_mapping TEXT;
BEGIN
  -- Loop through all deals
  FOR deal_record IN 
    SELECT id, owner_id, stage 
    FROM deals 
    WHERE owner_id IS NOT NULL
  LOOP
    -- Get the user's default pipeline
    SELECT id INTO user_pipeline_id
    FROM pipelines
    WHERE owner_id = deal_record.owner_id AND is_default = true
    LIMIT 1;
    
    IF user_pipeline_id IS NULL THEN
      RAISE NOTICE 'No default pipeline found for user: %, skipping deal: %', deal_record.owner_id, deal_record.id;
      CONTINUE;
    END IF;
    
    -- Map old stage value to new stage name
    stage_name_mapping := CASE deal_record.stage
      WHEN 'need_to_contact' THEN 'Need to Contact'
      WHEN 'contacted' THEN 'Contacted'
      WHEN 'prospect' THEN 'Prospect'
      WHEN 'negotiations' THEN 'Negotiations'
      WHEN 'offer_sent' THEN 'Offer Sent'
      WHEN 'under_contract' THEN 'Under Contract'
      WHEN 'closed_won' THEN 'Closed Won'
      WHEN 'overpriced' THEN 'Overpriced'
      ELSE 'Need to Contact' -- Default fallback
    END;
    
    -- Get the corresponding pipeline_stage_id
    SELECT id INTO target_stage_id
    FROM pipeline_stages
    WHERE pipeline_id = user_pipeline_id
      AND name = stage_name_mapping
    LIMIT 1;
    
    -- Update the deal with pipeline_id and pipeline_stage_id
    IF target_stage_id IS NOT NULL THEN
      UPDATE deals
      SET 
        pipeline_id = user_pipeline_id,
        pipeline_stage_id = target_stage_id
      WHERE id = deal_record.id;
      
      RAISE NOTICE 'Migrated deal: % to pipeline: % stage: %', deal_record.id, user_pipeline_id, stage_name_mapping;
    ELSE
      RAISE WARNING 'Could not find stage for deal: %, user: %, stage: %', deal_record.id, deal_record.owner_id, deal_record.stage;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 3. CREATE DEFAULT PIPELINE FOR NEW USERS (TRIGGER)
-- ============================================================================
-- This trigger automatically creates a default pipeline when a new user 
-- profile is created

CREATE OR REPLACE FUNCTION create_default_pipeline_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_pipeline_id UUID;
BEGIN
  -- Create default "Off-Market" pipeline
  INSERT INTO pipelines (
    owner_id,
    name,
    description,
    color,
    icon,
    display_order,
    is_active,
    is_default
  ) VALUES (
    NEW.id,
    'Off-Market',
    'Default pipeline for off-market deals and opportunities',
    '#00b8d4',
    'briefcase',
    0,
    true,
    true
  )
  RETURNING id INTO new_pipeline_id;
  
  -- Create default stages for this pipeline
  INSERT INTO pipeline_stages (pipeline_id, name, color, stage_weight, display_order)
  VALUES 
    (new_pipeline_id, 'Need to Contact', '#94a3b8', 0.1, 0),
    (new_pipeline_id, 'Contacted', '#60a5fa', 0.2, 1),
    (new_pipeline_id, 'Prospect', '#a78bfa', 0.3, 2),
    (new_pipeline_id, 'Negotiations', '#ec4899', 0.4, 3),
    (new_pipeline_id, 'Offer Sent', '#f59e0b', 0.5, 4),
    (new_pipeline_id, 'Under Contract', '#10b981', 0.8, 5),
    (new_pipeline_id, 'Closed Won', '#00d4aa', 1.0, 6),
    (new_pipeline_id, 'Overpriced', '#ef4444', 0.05, 7);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on user_profiles table
DROP TRIGGER IF EXISTS create_default_pipeline_on_user_create ON user_profiles;
CREATE TRIGGER create_default_pipeline_on_user_create
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_pipeline_for_new_user();

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration was successful

-- Check how many pipelines were created
SELECT 
  COUNT(*) as total_pipelines,
  COUNT(CASE WHEN is_default = true THEN 1 END) as default_pipelines
FROM pipelines;

-- Check how many stages were created
SELECT 
  p.name as pipeline_name,
  COUNT(ps.id) as stage_count
FROM pipelines p
LEFT JOIN pipeline_stages ps ON ps.pipeline_id = p.id
GROUP BY p.id, p.name;

-- Check how many deals were migrated
SELECT 
  COUNT(*) as total_deals,
  COUNT(CASE WHEN pipeline_id IS NOT NULL THEN 1 END) as migrated_deals,
  COUNT(CASE WHEN pipeline_stage_id IS NOT NULL THEN 1 END) as deals_with_stages
FROM deals;

-- View sample migrated deals
SELECT 
  d.id,
  d.address,
  d.stage as old_stage,
  p.name as pipeline_name,
  ps.name as new_stage_name
FROM deals d
LEFT JOIN pipelines p ON p.id = d.pipeline_id
LEFT JOIN pipeline_stages ps ON ps.id = d.pipeline_stage_id
LIMIT 10;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All existing users now have a default "Off-Market" pipeline
-- All existing deals have been migrated to the new pipeline system
-- New users will automatically get a default pipeline when they sign up
