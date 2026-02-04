# Supabase Migration Guide - Refactor V2

## ⚠️ CRITICAL: Selective Cleanup Approach

**DO NOT DELETE ALL TABLES!**

This refactor uses a **selective cleanup approach**:
- ✅ **KEEP** all core tables (user_profiles, deals, contacts, pipelines, calendar_events, map_properties)
- 🗑️ **DELETE ONLY** feature-specific tables (email campaigns, AI operations)
- 🔧 **REMOVE** problematic tables (map_property_activity_log)
- 📦 **90% code cleanup, 10% database cleanup**

---

## Current Supabase Project Info

**Project:** Existing (Pre-Refactor)
**Plan:** Pro (Branching Available)
**Strategy:** Use Supabase Branching Feature + Selective Table Deletion

---

## Migration Strategy: Supabase Branching

### Why Supabase Branching?
- ✅ Built-in versioning
- ✅ Isolated testing environment
- ✅ Easy rollback if needed
- ✅ Main production DB stays untouched
- ✅ Can preview changes before merging

---

## Step-by-Step Process

### Step 1: Create Branch in Supabase Dashboard

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Branches** (in sidebar)
4. Click **"Create Branch"**
5. Name it: `refactor-v2`
6. Wait for branch to be created (~2-3 minutes)

### Step 2: Get Branch Connection Details

1. Once branch is ready, click on it
2. Go to **Settings** → **Database**
3. Copy the new connection details:
   - Branch URL (different from main)
   - Anon key (different from main)
   - Service role key (different from main)

### Step 3: Update Backend .env (for branch)

```env
# Branch Database Connection
SUPABASE_URL=https://[branch-ref].supabase.co
SUPABASE_ANON_KEY=[branch-anon-key]
SUPABASE_SERVICE_KEY=[branch-service-key]
```

### Step 4: Update Frontend .env

```env
# No changes needed - frontend uses backend API
# OR if frontend connects directly:
REACT_APP_SUPABASE_URL=https://[branch-ref].supabase.co
REACT_APP_SUPABASE_ANON_KEY=[branch-anon-key]
```

---

## Database Schema - Selective Cleanup Approach

### Current Schema (Selective Deletion)

Tables in existing database:
- user_profiles ✅ KEEP
- deals ✅ KEEP
- contacts ✅ KEEP
- contact_deal_links ✅ KEEP
- pipelines ✅ KEEP
- pipeline_stages ✅ KEEP
- calendar_events ✅ KEEP
- email_campaigns ❌ REMOVE
- email_templates ❌ REMOVE
- email_schedules ❌ REMOVE
- ai_operations ❌ REMOVE
- map_properties ✅ KEEP
- map_property_assignments ✅ KEEP
- map_property_activity_log ⚠️ REMOVE (causes errors)
- (and others...)

### Migration Strategy

**90% Code Cleanup, 10% Database Cleanup**

Instead of rebuilding from scratch:
1. Keep all core tables (user_profiles, deals, contacts, pipelines, etc.)
2. Delete ONLY feature-specific tables (email, AI operations)
3. Delete problematic tables (map_property_activity_log)
4. Create new migrations ONLY if tables are missing
5. Verify existing RLS policies and indexes

---

## Tables to DELETE from Branch

Once branch is created, it will have a copy of main DB.
Delete these tables manually:

```sql
-- Email System (Complete Removal)
DROP TABLE IF EXISTS email_campaigns CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS email_schedules CASCADE;
DROP TABLE IF EXISTS email_tracking CASCADE;

-- AI Operations (Complete Removal)
DROP TABLE IF EXISTS ai_operations CASCADE;
DROP TABLE IF EXISTS ai_insights CASCADE;
DROP TABLE IF EXISTS ai_reports CASCADE;

-- Problematic Tables
DROP TABLE IF EXISTS map_property_activity_log CASCADE;

-- Any other feature-specific tables
```

**Note:** Core tables (user_profiles, deals, contacts, pipelines, calendar_events, map_properties) should be KEPT. Only delete feature-specific tables listed above.

---

## Core Tables Schema (Minimal)

### 1. User Profiles & Teams

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  permissions JSONB DEFAULT '{}',
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Deals

```sql
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES user_profiles(id),
  title TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  asset_type TEXT,
  asking_price DECIMAL(12, 2),
  size DECIMAL(10, 2),
  lot_size DECIMAL(10, 2),
  year_built INTEGER,
  status TEXT DEFAULT 'active',
  stage TEXT, -- legacy field
  pipeline_id UUID REFERENCES pipelines(id),
  pipeline_stage_id UUID REFERENCES pipeline_stages(id),
  priority TEXT DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deals_owner ON deals(owner_id);
CREATE INDEX idx_deals_pipeline ON deals(pipeline_id);
CREATE INDEX idx_deals_stage ON deals(pipeline_stage_id);
CREATE INDEX idx_deals_location ON deals(latitude, longitude);
```

### 3. Contacts

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES user_profiles(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE contact_deal_links (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  relationship_type TEXT,
  PRIMARY KEY (contact_id, deal_id)
);

CREATE INDEX idx_contacts_owner ON contacts(owner_id);
```

### 4. Pipelines

```sql
CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES user_profiles(id),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#94a3b8',
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);
```

### 5. Calendar

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES user_profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  related_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  related_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_calendar_owner ON calendar_events(owner_id);
CREATE INDEX idx_calendar_dates ON calendar_events(start_date, end_date);
```

### 6. DealVisor (Map CRM)

```sql
CREATE TABLE map_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  asset_type TEXT,
  asking_price DECIMAL(12, 2),
  est_value DECIMAL(12, 2),
  building_size DECIMAL(10, 2),
  lot_size DECIMAL(10, 2),
  year_built INTEGER,
  status TEXT DEFAULT 'available',
  deal_id UUID REFERENCES deals(id),
  custom_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE map_property_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES map_properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_map_properties_location ON map_properties(latitude, longitude);
CREATE INDEX idx_map_properties_status ON map_properties(status);
```

---

## Row Level Security (RLS)

Enable RLS on all tables and create basic policies:

```sql
-- Example for deals table
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deals"
  ON deals FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own deals"
  ON deals FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own deals"
  ON deals FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own deals"
  ON deals FOR DELETE
  USING (auth.uid() = owner_id);

-- Repeat for other tables...
```

---

## Testing the Branch

### 1. Connect to Branch
Update backend .env with branch credentials.

### 2. Test Database Connection
```python
from supabase import create_client

supabase = create_client(BRANCH_URL, BRANCH_ANON_KEY)
response = supabase.table('user_profiles').select('*').execute()
print("Connection successful:", len(response.data))
```

### 3. Run Migrations
Execute all new migration files in order.

### 4. Verify Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 5. Test Basic Operations
- Create a user profile
- Create a deal
- Create a contact
- Link contact to deal
- Create a pipeline with stages

---

## Merging Branch to Production

### When Ready (After Full Testing)

1. **In Supabase Dashboard:**
   - Go to Branches
   - Select `refactor-v2` branch
   - Click **"Merge to Production"**
   - Confirm merge

2. **Update Application .env:**
   - Switch back to main Supabase credentials
   - OR keep using branch if you want

3. **Deploy Application:**
   - Merge GitHub `refactor-v2` branch to `main`
   - Deploy to production

---

## Rollback Plan

### If Something Goes Wrong:

**Option 1: Delete Branch and Recreate**
- Delete `refactor-v2` branch in Supabase
- Start over

**Option 2: Don't Merge**
- Keep branch separate
- Don't merge to production
- Main DB remains untouched

**Option 3: Revert Git Branch**
- `git checkout main`
- Use main Supabase credentials
- Old app still works

---

## Checklist for New Session Agent

- [ ] Create Supabase branch `refactor-v2`
- [ ] Get branch credentials
- [ ] Update backend/.env with branch credentials
- [ ] Create `/app/supabase_migrations/` folder
- [ ] Write migration files (001-007)
- [ ] Execute migrations in branch
- [ ] Verify tables created correctly
- [ ] Enable RLS on all tables
- [ ] Create RLS policies
- [ ] Test database connection from app
- [ ] Test CRUD operations
- [ ] Verify no errors in logs

---

**Last Updated:** 2025-01-16
**Status:** Ready for execution
