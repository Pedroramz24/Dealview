-- Migration: Apply Row Level Security (RLS) policies
-- Purpose: Restrict Map CRM access to authorized users only

-- Enable RLS on all Map CRM tables
ALTER TABLE map_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_property_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_csv_imports ENABLE ROW LEVEL SECURITY;

-- Map Properties: Only users with map_crm_access permission
CREATE POLICY map_crm_access_select 
ON map_properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND (permissions->>'map_crm_access')::boolean = true
  )
);

CREATE POLICY map_crm_access_insert 
ON map_properties FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND (permissions->>'map_crm_access')::boolean = true
  )
);

CREATE POLICY map_crm_access_update 
ON map_properties FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND (permissions->>'map_crm_access')::boolean = true
  )
);

CREATE POLICY map_crm_access_delete 
ON map_properties FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND (permissions->>'map_crm_access')::boolean = true
  )
);

-- Assignments: Same permission check
CREATE POLICY map_crm_assignments_all 
ON map_property_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND (permissions->>'map_crm_access')::boolean = true
  )
);

-- CSV Imports: Same permission check
CREATE POLICY map_crm_imports_all 
ON map_csv_imports FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND (permissions->>'map_crm_access')::boolean = true
  )
);
