-- ============================================================================
-- PHASE 1: CUSTOMIZABLE PIPELINES - DATABASE SCHEMA
-- ============================================================================
-- Run this in Supabase SQL Editor
-- This creates the foundation for multiple customizable pipelines

-- ============================================================================
-- 1. CREATE PIPELINES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#00b8d4',
  icon VARCHAR(50) DEFAULT 'briefcase',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_pipeline_name UNIQUE (owner_id, name)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_pipelines_owner_id ON pipelines(owner_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_is_active ON pipelines(is_active);

-- ============================================================================
-- 2. CREATE PIPELINE_STAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL,
  stage_weight DECIMAL(3,2) DEFAULT 0.5,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_pipeline_stage_name UNIQUE (pipeline_id, name),
  CONSTRAINT valid_stage_weight CHECK (stage_weight >= 0 AND stage_weight <= 1)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_id ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_display_order ON pipeline_stages(display_order);

-- ============================================================================
-- 3. MODIFY DEALS TABLE - ADD PIPELINE COLUMNS
-- ============================================================================
-- Add new columns to deals table
ALTER TABLE deals 
  ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pipeline_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_id ON deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_stage_id ON deals(pipeline_stage_id);

-- ============================================================================
-- 4. CREATE UPDATED_AT TRIGGER FUNCTIONS
-- ============================================================================
-- Trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for pipelines
DROP TRIGGER IF EXISTS update_pipelines_updated_at ON pipelines;
CREATE TRIGGER update_pipelines_updated_at
  BEFORE UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add triggers for pipeline_stages
DROP TRIGGER IF EXISTS update_pipeline_stages_updated_at ON pipeline_stages;
CREATE TRIGGER update_pipeline_stages_updated_at
  BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on pipelines table
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

-- Users can view their own pipelines
CREATE POLICY "Users can view own pipelines"
  ON pipelines
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Users can insert their own pipelines (max 5)
CREATE POLICY "Users can create own pipelines"
  ON pipelines
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id AND
    (SELECT COUNT(*) FROM pipelines WHERE owner_id = auth.uid()) < 5
  );

-- Users can update their own pipelines
CREATE POLICY "Users can update own pipelines"
  ON pipelines
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Users can delete their own pipelines (except default)
CREATE POLICY "Users can delete own pipelines"
  ON pipelines
  FOR DELETE
  USING (auth.uid() = owner_id AND is_default = false);

-- Enable RLS on pipeline_stages table
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Users can view stages for their pipelines
CREATE POLICY "Users can view stages for own pipelines"
  ON pipeline_stages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipelines 
      WHERE pipelines.id = pipeline_stages.pipeline_id 
      AND pipelines.owner_id = auth.uid()
    )
  );

-- Users can insert stages for their pipelines (max 10 per pipeline)
CREATE POLICY "Users can create stages for own pipelines"
  ON pipeline_stages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pipelines 
      WHERE pipelines.id = pipeline_stages.pipeline_id 
      AND pipelines.owner_id = auth.uid()
    ) AND
    (SELECT COUNT(*) FROM pipeline_stages WHERE pipeline_id = pipeline_stages.pipeline_id) < 10
  );

-- Users can update stages for their pipelines
CREATE POLICY "Users can update stages for own pipelines"
  ON pipeline_stages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pipelines 
      WHERE pipelines.id = pipeline_stages.pipeline_id 
      AND pipelines.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pipelines 
      WHERE pipelines.id = pipeline_stages.pipeline_id 
      AND pipelines.owner_id = auth.uid()
    )
  );

-- Users can delete stages for their pipelines
CREATE POLICY "Users can delete stages for own pipelines"
  ON pipeline_stages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pipelines 
      WHERE pipelines.id = pipeline_stages.pipeline_id 
      AND pipelines.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to get default pipeline for a user
CREATE OR REPLACE FUNCTION get_default_pipeline(user_id UUID)
RETURNS UUID AS $$
DECLARE
  default_pipeline_id UUID;
BEGIN
  SELECT id INTO default_pipeline_id
  FROM pipelines
  WHERE owner_id = user_id AND is_default = true
  LIMIT 1;
  
  RETURN default_pipeline_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get first stage of a pipeline
CREATE OR REPLACE FUNCTION get_first_stage(pipeline_uuid UUID)
RETURNS UUID AS $$
DECLARE
  first_stage_id UUID;
BEGIN
  SELECT id INTO first_stage_id
  FROM pipeline_stages
  WHERE pipeline_id = pipeline_uuid
  ORDER BY display_order ASC
  LIMIT 1;
  
  RETURN first_stage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================================
-- Next step: Run the migration script (006_migrate_existing_deals.sql)
-- to create default pipelines and migrate existing deals
