-- Migration: Create map_property_assignments and map_csv_imports tables
-- Purpose: Track team assignments and CSV import history

-- Team assignments (who's working on what)
CREATE TABLE map_property_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES map_properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'claimed' CHECK (status IN ('claimed', 'working', 'contacted')),
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(property_id, user_id)
);

CREATE INDEX idx_map_assignments_property ON map_property_assignments(property_id);
CREATE INDEX idx_map_assignments_user ON map_property_assignments(user_id);

ALTER TABLE map_property_assignments REPLICA IDENTITY FULL;

-- CSV import history
CREATE TABLE map_csv_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  total_rows INTEGER,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_log JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_map_imports_user ON map_csv_imports(user_id);
CREATE INDEX idx_map_imports_status ON map_csv_imports(status);
