# DealLinked CRM V2 - Product Requirements Document

## Original Problem Statement
Complete ground-up rebuild of DealLinked CRM application. Core instruction was to "nuke" most of the existing application and database, and rebuild a simpler, more focused CRM for Commercial Real Estate.

## Core Requirements

### Keep (Implemented)
- ✅ Map View with deal markers (pings) and deal details side panel
- ✅ Full Property Details pages
- ✅ Pipeline/Kanban board with drag-and-drop
- ✅ Contacts page (in progress)
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
- Contacts CRUD
- Pipelines and stages management
- Teams and members
- Calendar events
- Dashboard statistics
- Geocoding endpoints (autocomplete, reverse)

### Frontend (MOSTLY COMPLETE - 2024-02-05)
- ✅ Login/Signup with Supabase Auth
- ✅ Dashboard with statistics
- ✅ MapView with optimized Esri tiles
- ✅ Address autocomplete (Radar.io)
- ✅ Click-to-add deal on map
- ✅ Deal side panel on marker click
- ✅ Pipeline/Kanban board with 8 default stages
- ✅ Drag-and-drop deal management
- ⏳ Contacts page (needs rebuild)
- ⏳ Team page (needs rebuild)
- ⏳ DealDetails full page (needs verification)
- ⏳ Calendar page (needs connection to API)
- ⏳ Settings page (needs update)

## Key Files
- `/app/backend/server.py` - Main API server
- `/app/backend/routes_v2/` - V2 route modules
- `/app/frontend/src/App.js` - Main router
- `/app/frontend/src/pages/MapView.js` - Map with all features
- `/app/frontend/src/pages/Pipeline.js` - Kanban board
- `/app/supabase_migrations_rebuild/` - DB migration scripts

## Recent Fixes (2024-02-05)
1. **Pipeline Page Fix**: Added backend fallback to create default pipeline if database trigger fails
2. **Address Autocomplete**: Radar.io integration working
3. **Click-to-Add Deal**: Map click -> reverse geocode -> deal creation panel

## Prioritized Backlog

### P0 (Critical)
- None currently - core features working

### P1 (High Priority)
- Rebuild Contacts.js with smart tag filtering
- Rebuild Team.js with member views and performance

### P2 (Medium Priority)
- Verify DealDetails.js full page
- Connect Calendar.js to V2 API
- Update Settings.js for profile updates

### P3 (Low Priority)
- Add more pipeline customization
- Team deal performance metrics
- Advanced filtering options

## Test Credentials
- Create new user via signup
- Users automatically get default pipeline with 8 stages
- Example: `testuser@example.com` / `TestPassword123!`

## Known Limitations
- Supabase database trigger for default pipeline may not work (backend fallback handles this)
- No marketplace functionality (intentionally removed)
- No AI features (intentionally removed)
