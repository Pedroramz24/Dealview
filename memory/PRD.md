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

### Database (COMPLETE)
- Fresh Supabase schema with 11 tables
- Row Level Security (RLS) policies - FIXED with INSERT WITH CHECK clauses
- User creation triggers
- Default pipeline creation trigger (with backend fallback)

### Backend API V2 (COMPLETE)
- Authentication routes (login, signup, profile)
- Deals CRUD with document upload
- Contacts CRUD with smart tags (including tag update/delete)
- Pipelines and stages management (create, update, delete stages)
- Teams and members
- Calendar events
- Dashboard statistics
- Geocoding endpoints (autocomplete, reverse)

### Frontend V2 (COMPLETE - 2024-02-05)
- ✅ Login/Signup with Supabase Auth
- ✅ Dashboard with statistics
- ✅ MapView with optimized Esri tiles
- ✅ Address autocomplete (Radar.io)
- ✅ Click-to-add deal on map
- ✅ Deal side panel on marker click
- ✅ **Pipeline Page ENHANCED** - Stage management (create/edit/delete), color picker, deal stats
- ✅ **Contacts Page ENHANCED** - Smart Tags Manager modal, quick filter bar, CRUD for tags
- ✅ Create Deal form with all fields (AC size, pipeline/stage selection, auto-comma formatting)
- ⏳ Team page (needs verification)
- ⏳ DealDetails full page (needs verification)
- ⏳ Calendar page (needs V2 API connection)
- ⏳ Settings page (needs update)

## Recent Changes (2024-02-05)

### Pipeline Page Enhancements (DONE)
- Added "Add Stage" button and empty column placeholder
- Stage edit/delete functionality via modal
- Color picker with 12 preset colors
- Pipeline stats (total deals, total value) in header
- Delete stage protection (can't delete if deals exist)

### Contacts Page Enhancements (DONE)
- **Smart Tags Manager Modal** - View all tags, edit name/color, delete tags
- **Quick Filter Bar** - Filter contacts by clicking tag badges
- Tags displayed with color indicators
- Create new tags directly from filter bar
- Removed old inline tag manager toggle

### Create Deal Panel Enhancements (DONE)
- Added AC Size field
- Pipeline and Stage dropdown selectors
- Auto-comma formatting for number fields (price, size, NOI)
- Fixed backend deal creation error (get_user_team_id fix)

## Key Files
- `/app/backend/server.py` - Main API server
- `/app/backend/routes_v2/` - V2 route modules
- `/app/frontend/src/App.js` - Main router
- `/app/frontend/src/pages/MapView.js` - Map with all features
- `/app/frontend/src/pages/Pipeline.js` - **ENHANCED** - Kanban board with stage management
- `/app/frontend/src/pages/Contacts.js` - **ENHANCED** - Smart Tags Manager
- `/app/supabase_migrations_rebuild/` - DB migration scripts

## Prioritized Backlog

### P0 (Critical - Done)
- ✅ RLS fix migration applied
- ✅ Pipeline stage management
- ✅ Smart Tags management interface

### P1 (High Priority - Next)
- Verify Team.js works with V2 API
- Verify DealDetails.js displays all fields correctly

### P2 (Medium Priority)
- Connect Calendar.js to V2 API
- Update Settings.js for profile updates

### P3 (Low Priority)
- Team deal performance metrics
- Advanced filtering options
- Import contacts from CSV

## Test Credentials
- Create new user via signup
- Users automatically get default pipeline with 8 stages

## Test Reports
- `/app/test_reports/iteration_1.json` - Initial pipeline tests
- `/app/test_reports/iteration_2.json` - Contacts page tests
