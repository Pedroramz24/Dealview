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
- ✅ Simple calendar with V2 API

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
- **Calendar**: FullCalendar library

## What's Been Implemented

### Database (COMPLETE)
- Fresh Supabase schema with 11 tables
- Row Level Security (RLS) policies - NEED TO APPLY FIX (migration 006)
- User creation triggers
- Default pipeline creation trigger (with backend fallback)

### Backend API V2 (COMPLETE)
- Authentication routes (login, signup, profile)
- Deals CRUD with document upload
- Contacts CRUD with smart tags (including tag update/delete)
- Pipelines and stages management (create, update, delete stages)
- Teams and members
- Calendar events (GET, POST, PUT, DELETE)
- Dashboard statistics
- Geocoding endpoints (autocomplete, reverse)

### Frontend V2 (COMPLETE - 2024-02-05)
- ✅ Login/Signup with Supabase Auth (WORKING)
- ✅ Dashboard with statistics
- ✅ MapView with optimized Esri tiles
- ✅ Address autocomplete (Radar.io)
- ✅ Click-to-add deal on map
- ✅ Deal side panel on marker click
- ✅ **Pipeline Page ENHANCED** - Stage management (create/edit/delete), color picker, deal stats
- ✅ **Contacts Page ENHANCED** - Smart Tags Manager modal, quick filter bar, CRUD for tags
- ✅ **Calendar Page REBUILT** - Uses V2 API, event CRUD, view modes
- ✅ Create Deal form with all fields (AC size, pipeline/stage selection, auto-comma formatting)
- ⏳ Team page (needs verification)
- ⏳ DealDetails full page (needs verification)
- ⏳ Settings page (needs update)

## Recent Changes (2024-02-05)

### Calendar Page Rebuild (DONE)
- Completely rebuilt Calendar.js to use V2 API instead of direct Supabase queries
- Fixed session retrieval to use `supabase.auth.getSession()` properly
- Event create/edit/delete modals with proper form handling
- Month/Week/Day/List view toggles
- Event type selection with color coding (Meeting, Call, Task, Deadline, Deal, Other)
- CreateEventPanel.js also updated to use V2 API

### Auth Session Fix (DONE)
- Fixed both Calendar.js and CreateEventPanel.js to properly retrieve auth session
- Changed from `session` context (which was undefined) to `supabase.auth.getSession()`

### Known Issue - RLS Policy
- **BLOCKER**: New users cannot create calendar events due to Supabase RLS INSERT policy
- **FIX**: User needs to run migration `/app/supabase_migrations_rebuild/006_fix_rls_insert_policies.sql` in Supabase SQL Editor
- This same fix applies to: contacts, contact_tags, pipelines, pipeline_stages, calendar_events

## Key Files
- `/app/backend/server.py` - Main API server
- `/app/backend/routes_v2/calendar.py` - Calendar API endpoints
- `/app/frontend/src/App.js` - Main router
- `/app/frontend/src/pages/Calendar.js` - **REBUILT** - V2 calendar with event management
- `/app/frontend/src/components/CreateEventPanel.js` - **UPDATED** - V2 event creation panel
- `/app/frontend/src/pages/MapView.js` - Map with all features
- `/app/frontend/src/pages/Pipeline.js` - Kanban board with stage management
- `/app/frontend/src/pages/Contacts.js` - Smart Tags Manager
- `/app/supabase_migrations_rebuild/006_fix_rls_insert_policies.sql` - **RUN THIS** to fix RLS

## Prioritized Backlog

### P0 (Critical - Action Required)
- **RUN MIGRATION**: Apply `/app/supabase_migrations_rebuild/006_fix_rls_insert_policies.sql` to enable INSERT operations

### P1 (High Priority - Next)
- Verify Team.js works with V2 API
- Verify DealDetails.js displays all fields correctly

### P2 (Medium Priority)
- Update Settings.js for profile updates

### P3 (Low Priority)
- Team deal performance metrics
- Advanced filtering options
- Import contacts from CSV

## Test Credentials
- Create new user via signup (any email@testmail.com, TestPassword123!)
- Users automatically get default pipeline with 8 stages

## Test Reports
- `/app/test_reports/iteration_1.json` - Initial pipeline tests
- `/app/test_reports/iteration_2.json` - Contacts page tests
- `/app/test_reports/iteration_3.json` - Calendar page tests (includes RLS issue finding)

## API Endpoints

### Calendar API
- `GET /api/calendar/events` - List all events for user
- `GET /api/calendar/events/upcoming` - Get upcoming events
- `GET /api/calendar/events/{id}` - Get single event
- `POST /api/calendar/events` - Create new event
- `PUT /api/calendar/events/{id}` - Update event
- `DELETE /api/calendar/events/{id}` - Delete event

### Event Schema
```json
{
  "title": "string",
  "description": "string (optional)",
  "start_time": "datetime ISO",
  "end_time": "datetime ISO (optional)",
  "all_day": "boolean",
  "deal_id": "uuid (optional)",
  "contact_id": "uuid (optional)",
  "event_type": "meeting|call|task|deadline|deal|other",
  "color": "#hex"
}
```
