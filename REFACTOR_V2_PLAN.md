# DealLinked CRM - Refactor V2 Plan

## Overview
Complete application rebuild to strip bloat, remove unused features, and start with clean database.

**Status:** Planning Phase
**Start Date:** 2025-01-16
**Approach:** New Emergent Session + Supabase Branch + GitHub Branch

---

## Features to COMPLETELY REMOVE

### 1. Email Campaign System ❌
**Files/Folders to Delete:**
- `/app/backend/routes/email_campaigns.py` (if exists)
- `/app/frontend/src/pages/EmailCampaigns/` (entire folder)
- `/app/frontend/src/components/EmailCampaign*.js` (all email campaign components)
- Any email template files
- Scheduled email system references

**Database Tables to Drop:**
- `email_campaigns`
- `email_templates`
- `email_schedules`
- `email_tracking`
- Any related tables

**Code Cleanup:**
- Remove from navigation/sidebar
- Remove API endpoints
- Remove background jobs/cron

---

### 2. Zoning Layers ❌
**Files to Clean:**
- `/app/frontend/src/pages/MapView.js` - Remove zoning layer logic
- `/app/backend/routes/intelligence.py` - Remove zoning endpoints

**Database:**
- No specific tables (likely external API)

**Code References:**
- Search for: `zoning`, `austin-zoning`, `sa-zoning`
- Remove state management for zoning layers
- Remove from LayerManager component

---

### 3. Parcel Layers ❌
**Files to Clean:**
- `/app/frontend/src/pages/MapView.js` - Remove parcel layer logic
- Remove ReportAll API integration
- Remove Bexar CAD parcel integration

**Config Files:**
- `/app/frontend/src/config/reportall.js` - DELETE

**Code References:**
- Search for: `parcel`, `reportall`, `bexar`, `robust_id`
- Remove PMTiles protocol if only used for parcels
- Clean up parcel selection state

---

### 4. FEMA Flood Zones ❌
**Files to Clean:**
- `/app/frontend/src/pages/MapView.js` - Remove flood zone layer
- `/app/backend/routes/intelligence.py` - Remove flood zone endpoints

**Code References:**
- Search for: `flood`, `fema`, `floodplain`
- Remove from LayerManager

---

### 5. Water & Sewer Layers ❌
**Files to Clean:**
- `/app/frontend/src/pages/MapView.js` - Remove water/sewer layer
- `/app/backend/routes/intelligence.py` - Remove water/sewer endpoints

**Code References:**
- Search for: `water`, `sewer`, `sa-water-sewer`
- Remove from LayerManager

---

### 6. AI Operations Dashboard ❌ COMPLETE REMOVAL
**Files/Folders to DELETE:**
- `/app/frontend/src/pages/AIOperations/` (entire folder if exists)
- `/app/frontend/src/components/AI*Dashboard*.js`
- Any AI operations specific components

**Database Tables to Drop:**
- `ai_operations`
- `ai_insights`
- `ai_reports`
- Any related tables

**Backend Routes:**
- Remove AI operations endpoints
- Clean up AI service files if dedicated to operations dashboard

**Navigation:**
- Remove from sidebar/menu
- Remove route definitions

---

## Features to KEEP ✅

### Core CRM
- Deals management
- Contacts management
- Pipelines (with stages)
- Calendar events
- User profiles and authentication

### Map Features (Essential Only)
- **Map View:** Core map rendering
- **Map Style Controls:** Satellite/street view toggle
- **Team Deals:** Display other team members' deals on map
- **Measurement Tools:** Distance and area measurement
- **Deal Markers:** Basic deal pins on map

### DealVisor (Map CRM)
- Property import from CSV
- Property management
- Convert to deal functionality
- Table and map views
- Basic filtering

### UI Framework
- Design system (colors, shadows, spacing)
- Base components (buttons, inputs, etc.)
- Layout components
- Navigation structure

---

## Database Schema - MINIMAL VERSION

### Tables to KEEP (Rebuild from scratch)

```sql
-- Core Auth & Users
user_profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT,
  permissions JSONB,
  team_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Teams (for team deals feature)
teams (
  id UUID PRIMARY KEY,
  name TEXT,
  owner_id UUID,
  created_at TIMESTAMP
)

-- Deals (Core CRM)
deals (
  id UUID PRIMARY KEY,
  owner_id UUID,
  title TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  asset_type TEXT,
  asking_price DECIMAL,
  size DECIMAL,
  lot_size DECIMAL,
  year_built INTEGER,
  status TEXT,
  stage TEXT, -- legacy
  pipeline_id UUID,
  pipeline_stage_id UUID,
  priority TEXT,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Contacts
contacts (
  id UUID PRIMARY KEY,
  owner_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  title TEXT,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Contact-Deal Links
contact_deal_links (
  contact_id UUID,
  deal_id UUID,
  relationship_type TEXT,
  PRIMARY KEY (contact_id, deal_id)
)

-- Pipelines (Customizable)
pipelines (
  id UUID PRIMARY KEY,
  owner_id UUID,
  name TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Pipeline Stages
pipeline_stages (
  id UUID PRIMARY KEY,
  pipeline_id UUID,
  name TEXT,
  color TEXT,
  display_order INTEGER,
  created_at TIMESTAMP
)

-- Calendar Events (Basic)
calendar_events (
  id UUID PRIMARY KEY,
  owner_id UUID,
  title TEXT,
  description TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  related_deal_id UUID,
  related_contact_id UUID,
  created_at TIMESTAMP
)

-- DealVisor: Map Properties
map_properties (
  id UUID PRIMARY KEY,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  asset_type TEXT,
  asking_price DECIMAL,
  est_value DECIMAL,
  building_size DECIMAL,
  lot_size DECIMAL,
  year_built INTEGER,
  status TEXT,
  deal_id UUID, -- if converted
  custom_data JSONB, -- PropertyRadar fields
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- DealVisor: Property Assignments
map_property_assignments (
  id UUID PRIMARY KEY,
  property_id UUID,
  user_id UUID,
  assigned_at TIMESTAMP
)
```

### Tables to DELETE (from current database)
- `email_campaigns`
- `email_templates`
- `email_schedules`
- `email_tracking`
- `ai_operations`
- `ai_insights`
- `ai_reports`
- `map_property_activity_log` (if causing errors)
- Any other feature-specific tables not listed above

---

## File Structure - What to Keep

```
/app/
├── backend/
│   ├── routes/
│   │   ├── auth.py ✅
│   │   ├── deals.py ✅
│   │   ├── contacts.py ✅
│   │   ├── pipelines.py ✅
│   │   ├── calendar.py ✅
│   │   ├── map_crm/ ✅
│   │   │   └── property_routes.py
│   │   └── intelligence.py ⚠️ (CLEAN - remove layers)
│   ├── models/ ✅ (clean up unused)
│   ├── services/ ✅ (keep essential only)
│   ├── middleware/ ✅
│   └── server.py ✅ (clean up routes)
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.js ✅
│   │   │   ├── MapView.js ✅ (CLEAN - remove layers)
│   │   │   ├── Pipeline.js ✅
│   │   │   ├── Contacts.js ✅
│   │   │   ├── Deals.js ✅
│   │   │   ├── MapCRM/ ✅
│   │   │   └── Calendar.js ✅
│   │   ├── components/
│   │   │   ├── PropertyIntelligencePanel.js ✅
│   │   │   ├── CreateDealPanel.js ✅
│   │   │   ├── LayerManager.js ⚠️ (SIMPLIFY)
│   │   │   ├── DealDetails.js ✅
│   │   │   └── ui/ ✅ (design system components)
│   │   ├── styles/
│   │   │   └── designSystem.js ✅
│   │   ├── contexts/ ✅
│   │   └── utils/ ✅
│   └── public/ ✅
│
└── supabase_migrations/ ⚠️ (RECREATE from scratch)
```

---

## Implementation Steps

### Step 1: Supabase Branch Setup
1. Go to Supabase Dashboard
2. Create new branch: `refactor-v2`
3. This gives you isolated database to work with
4. Get new connection string for branch

### Step 2: GitHub Branch Setup
```bash
cd /app
git checkout -b refactor-v2
git push origin refactor-v2
```

### Step 3: Code Cleanup (Systematic)
1. **Delete Email Campaign Code**
   - Remove folders
   - Remove routes
   - Remove from navigation

2. **Clean MapView.js**
   - Remove zoning layer state & logic
   - Remove parcel layer state & logic
   - Remove flood zone state & logic
   - Remove water/sewer state & logic
   - Keep: map style, team deals, measurement tools

3. **Clean LayerManager.js**
   - Keep only: map style toggle, team deals toggle
   - Remove all other layer controls

4. **Remove AI Operations**
   - Delete entire dashboard
   - Remove routes
   - Remove from navigation

5. **Clean Backend**
   - Remove unused routes from server.py
   - Delete removed feature route files
   - Clean up intelligence.py (remove layer endpoints)

### Step 4: Database Cleanup (Selective Approach)
1. In Supabase branch, delete ONLY feature-specific tables:
   - Email campaign tables (email_campaigns, email_templates, etc.)
   - AI operations tables (ai_operations, ai_insights, etc.)
   - Problematic tables (map_property_activity_log)
2. Keep core tables (user_profiles, deals, contacts, pipelines, etc.)
3. Run migrations only for missing/new tables if needed
4. Verify RLS policies are in place
5. Check indexes exist

### Step 5: Testing Checklist
- [ ] Login/Authentication works
- [ ] Dashboard loads (without errors)
- [ ] Map view loads with style controls
- [ ] Team deals display on map
- [ ] Measurement tools work
- [ ] Can create/edit deals
- [ ] Can create/edit contacts
- [ ] Pipeline management works
- [ ] DealVisor loads
- [ ] Can import CSV to DealVisor
- [ ] Can convert property to deal
- [ ] Calendar events work
- [ ] No console errors
- [ ] No missing layer errors

### Step 6: Deployment
1. Test thoroughly in branch
2. Update production .env with branch credentials (if deploying branch)
3. OR merge to main after verification

---

## Risk Mitigation

### Backup Strategy
1. **Current Code:** Tagged as `v1.0-pre-refactor` in git
2. **Current Database:** Preserved in main Supabase project
3. **Rollback Plan:** Can revert git branch and reconnect to main DB

### Testing Strategy
1. Test each feature removal incrementally
2. Verify no broken imports/references
3. Check browser console for errors
4. Test all kept features after cleanup

---

## Success Criteria

✅ **Application loads without errors**
✅ **All removed features are completely gone (no dead code)**
✅ **All kept features work correctly**
✅ **Database is clean and minimal**
✅ **No console errors**
✅ **Navigation is clean (no broken links)**
✅ **Performance is improved (less bloat)**
✅ **Codebase is maintainable**

---

## New Session Handoff Instructions

### For the AI Agent in New Session:

1. **Read this document completely**
2. **Review `/app/SUPABASE_MIGRATION.md`**
3. **Check out the `refactor-v2` branch**
4. **Follow Step 3 (Code Cleanup) systematically**
5. **Execute Step 4 (Database Rebuild)**
6. **Run Step 5 (Testing) thoroughly**
7. **Document any issues found**

### Key Files to Reference:
- `/app/REFACTOR_V2_PLAN.md` (this file)
- `/app/SUPABASE_MIGRATION.md` (database details)
- `/app/FEATURES_TO_REMOVE.md` (detailed removal checklist)

---

**Last Updated:** 2025-01-16
**Status:** Ready for execution in new session
