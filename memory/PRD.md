# DealLinked CRM V2 - Product Requirements Document

## Original Problem Statement
Complete ground-up rebuild of DealLinked CRM application. Core instruction was to "nuke" most of the existing application and database, and rebuild a simpler, more focused CRM for Commercial Real Estate.

## Core Requirements

### Keep (Implemented)
- ✅ Map View with deal markers (pings) and deal details side panel
- ✅ Full Property Details pages
- ✅ Pipeline/Kanban board with drag-and-drop
- ✅ Contacts page with V2 API integration
- ✅ Team tab for collaboration
- ✅ Landing page, Login/Signup screens
- ✅ "DealLinked" branding
- ✅ Simple calendar (structure ready)

### Removed (Nuked)
- ❌ Marketplace functionality
- ❌ Command Center
- ❌ DealVisor, AI operations
- ❌ Complex property intelligence features
- ❌ Complex map layers (zoning, parcels)

## Technical Stack
- **Frontend**: React, React Router, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Mapping**: MapLibre GL JS with Esri satellite tiles
- **Geocoding**: Radar.io (test keys configured)
- **Authentication**: Supabase Auth

## What's Been Implemented

### Database (COMPLETE - 2024-02-05)
- Fresh Supabase schema with 11 tables
- Row Level Security (RLS) policies
- User creation triggers
- Default pipeline creation trigger (with backend fallback)

### Backend API V2 (COMPLETE - 2024-02-05)
- Authentication routes (login, signup, profile)
- Deals CRUD with document upload
- Contacts CRUD with smart tags
- Pipelines and stages management
- Teams and members
- Calendar events
- Dashboard statistics
- Geocoding endpoints (autocomplete, reverse)

### Frontend V2 (IN PROGRESS - 2024-02-05)
- ✅ Login/Signup with Supabase Auth
- ✅ Dashboard with statistics
- ✅ MapView with optimized Esri tiles
- ✅ Address autocomplete (Radar.io)
- ✅ Click-to-add deal on map
- ✅ Deal side panel on marker click
- ✅ Pipeline/Kanban board with 8 default stages
- ✅ Drag-and-drop deal management
- ✅ **Contacts.js REBUILT** - Now uses V2 API with smart tags filtering
- ⏳ Team page (needs verification)
- ⏳ DealDetails full page (needs verification)
- ⏳ Calendar page (needs V2 API connection)
- ⏳ Settings page (needs update)

## Key Files
- `/app/backend/server.py` - Main API server
- `/app/backend/routes_v2/` - V2 route modules
- `/app/frontend/src/App.js` - Main router
- `/app/frontend/src/pages/MapView.js` - Map with all features
- `/app/frontend/src/pages/Pipeline.js` - Kanban board
- `/app/frontend/src/pages/Contacts.js` - **REBUILT** - V2 Contacts page
- `/app/supabase_migrations_rebuild/` - DB migration scripts

## Recent Changes (2024-02-05)

### Contacts Page Rebuild (DONE)
- Completely rewrote `/app/frontend/src/pages/Contacts.js`
- Old file: 1500+ lines using direct Supabase queries (V1 pattern)
- New file: ~800 lines using V2 API endpoints
- Features:
  - Smart tags with create/delete functionality
  - Filter by contact type, status, and tags
  - Search by name, email, company
  - Table and Card view modes
  - Contact details panel with linked deals
  - CRUD operations via `/api/contacts` endpoints

### Critical Bug Found: RLS INSERT Policy Issue
- **Issue**: Supabase RLS policies block INSERT operations for new users
- **Affected tables**: contacts, contact_tags, pipelines, pipeline_stages, calendar_events
- **Root cause**: Using `FOR ALL USING (...)` instead of explicit INSERT policies with `WITH CHECK`
- **Fix**: Created `/app/supabase_migrations_rebuild/006_fix_rls_insert_policies.sql`
- **Status**: ⚠️ REQUIRES MANUAL ACTION - Run migration in Supabase SQL Editor

## Prioritized Backlog

### P0 (Critical - Blocking)
- ⚠️ **Run RLS fix migration** - `/app/supabase_migrations_rebuild/006_fix_rls_insert_policies.sql`
  - Without this, new users cannot create contacts, tags, or any data

### P1 (High Priority)
- Verify Team.js works with V2 API
- Verify DealDetails.js displays all fields correctly

### P2 (Medium Priority)
- Connect Calendar.js to V2 API
- Update Settings.js for profile updates

### P3 (Low Priority)
- Add more pipeline customization
- Team deal performance metrics
- Advanced filtering options

## Test Credentials
- Create new user via signup
- Users automatically get default pipeline with 8 stages
- Test user: `contactstest_9ee073@testdeallinked.com` / `TestPassword123!`

## Known Limitations
1. **RLS INSERT policies need fixing** - Run migration `006_fix_rls_insert_policies.sql`
2. Supabase database trigger for default pipeline may not work (backend fallback handles this)
3. No marketplace functionality (intentionally removed)
4. No AI features (intentionally removed)

## Test Reports
- `/app/test_reports/iteration_1.json` - Initial pipeline tests
- `/app/test_reports/iteration_2.json` - Contacts page tests (found RLS issue)
