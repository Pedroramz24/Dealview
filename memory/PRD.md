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

## What's Been Implemented (All Complete)

### Database (COMPLETE)
- Fresh Supabase schema with 11 tables
- Row Level Security (RLS) policies - ALL FIXED with `TO authenticated` clause
- User creation triggers
- Default pipeline creation trigger (with backend fallback)

### Backend API V2 (COMPLETE)
- Authentication routes (login, signup, profile)
- Deals CRUD with document upload
- Contacts CRUD with smart tags
- Pipelines and stages management
- Teams and members (fixed embedding issue)
- Calendar events (GET, POST, PUT, DELETE)
- Dashboard statistics
- Geocoding endpoints

### Frontend V2 (ALL VERIFIED - 2024-02-05)
- ✅ Login/Signup with Supabase Auth (WORKING)
- ✅ Dashboard with statistics
- ✅ MapView with Esri tiles, address autocomplete, click-to-add
- ✅ **Pipeline Page** - Stage management, color picker, deal stats
- ✅ **Contacts Page** - Smart Tags Manager, CRUD for tags
- ✅ **Calendar Page** - V2 API, event CRUD, view modes (VERIFIED)
- ✅ **Team Page** - Team creation, member management, stats (VERIFIED)
- ⏳ DealDetails page (needs verification)
- ⏳ Settings page (needs update for profile management)

## Recent Changes (2024-02-05)

### Calendar Page (VERIFIED WORKING)
- Rebuilt to use V2 API
- Fixed session retrieval using `supabase.auth.getSession()`
- Event create/edit/delete all working
- Multiple view modes: Month, Week, Day, List

### Team Page (VERIFIED WORKING)
- Fixed frontend API response handling (was expecting array, API returns single object)
- Fixed backend embedding issue in `get_user_with_team`
- Team creation, member list, stats all working

### RLS Policies Fixed
All tables now have proper RLS with `TO authenticated`:
- calendar_events
- contacts, contact_tags
- pipelines, pipeline_stages
- teams, team_members
- user_profiles (UPDATE policy added)

## Key Files
- `/app/backend/server.py` - Main API server
- `/app/backend/routes_v2/teams.py` - Fixed embedding issue
- `/app/frontend/src/pages/Calendar.js` - V2 calendar
- `/app/frontend/src/pages/Team.js` - Fixed API response handling
- `/app/frontend/src/pages/MapView.js` - Map with all features
- `/app/frontend/src/pages/Pipeline.js` - Kanban with stage management
- `/app/frontend/src/pages/Contacts.js` - Smart Tags Manager

## Prioritized Backlog

### P1 (Next)
- Verify DealDetails.js displays all deal fields correctly
- Update Settings.js for profile management

### P2 (Medium Priority)
- Team deal performance metrics
- Advanced contact filtering options

### P3 (Low Priority)
- CSV contact import
- Recurring calendar events

## Test Credentials
- Create new user via signup (any email@testmail.com, TestPassword123!)
- Users automatically get default pipeline with 8 stages

## Test Reports
- `/app/test_reports/iteration_1.json` - Initial pipeline tests
- `/app/test_reports/iteration_2.json` - Contacts page tests
- `/app/test_reports/iteration_3.json` - Calendar page tests

## API Endpoints Summary

### Teams API (Fixed)
- `GET /api/teams` - Get user's team with members
- `POST /api/teams` - Create new team
- `POST /api/teams/invite` - Invite member by email
- `GET /api/teams/members` - List team members with stats

### Calendar API
- `GET /api/calendar/events` - List all events
- `POST /api/calendar/events` - Create event
- `PUT /api/calendar/events/{id}` - Update event
- `DELETE /api/calendar/events/{id}` - Delete event
