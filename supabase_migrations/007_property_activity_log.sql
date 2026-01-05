-- Migration: Create property activity log table
-- Purpose: Track all property interactions for team collaboration

CREATE TABLE IF NOT EXISTS map_property_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES map_properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('viewed', 'edited', 'note_added', 'claimed', 'unclaimed', 'converted', 'status_changed')),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_map_activity_property ON map_property_activity(property_id);
CREATE INDEX idx_map_activity_user ON map_property_activity(user_id);
CREATE INDEX idx_map_activity_type ON map_property_activity(activity_type);
CREATE INDEX idx_map_activity_created ON map_property_activity(created_at DESC);

-- Enable RLS
ALTER TABLE map_property_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users with map_crm_access can view activity
CREATE POLICY map_crm_activity_view 
ON map_property_activity FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND (permissions->>'map_crm_access')::boolean = true
  )
);

-- RLS Policy: Users with map_crm_access can insert activity
CREATE POLICY map_crm_activity_insert 
ON map_property_activity FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND (permissions->>'map_crm_access')::boolean = true
  )
);

COMMENT ON TABLE map_property_activity IS 'Activity log for DealVisor property interactions';
