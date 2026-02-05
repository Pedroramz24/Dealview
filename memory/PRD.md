# DealLinked CRM V2 - Product Requirements Document

## Original Problem Statement
Complete ground-up rebuild of DealLinked CRM application for Commercial Real Estate. Built a simpler, more focused CRM with essential features.

## Core Features (ALL VERIFIED ✅)

### ✅ Map View
- Satellite map with Esri tiles
- Address autocomplete via Radar.io
- Click map to set deal location
- Deal markers with asset type colors
- Team Deals toggle
- Create New Deal side panel with all fields:
  - Title, Asset Type, Pipeline/Stage selection
  - Price, Size, Lot Size, AC Size
  - Year Built, Zoning, NOI, Cap Rate, Occupancy

### ✅ Pipeline/Kanban Board
- Default 8 stages for new users
- Stage management (add, edit, delete, reorder)
- Deal cards with drag-and-drop
- Stage value totals
- Search deals

### ✅ Contacts Page
- Contact CRUD operations
- Smart Tags Manager (create, rename, delete)
- Quick filter bar by tags
- Contact details: name, email, phone, company, notes

### ✅ Team Collaboration
- Create team with custom name
- View team members with roles
- Member stats (deals, pipeline value)
- Pending invites display

### ✅ Calendar
- Monthly/Weekly/Daily/List views
- Event CRUD operations
- Event types: Meeting, Call, Task, Deadline, Deal
- Color-coded events
- Link events to deals/contacts

### ✅ Settings
- Profile management (name, company, phone)
- Profile picture upload
- Password change
- Security settings
- Notifications preferences
- Data export options

### ✅ Authentication
- Supabase Auth integration
- Signup with email verification
- Login with JWT
- Protected routes

## Technical Stack
- **Frontend**: React, React Router, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Mapping**: MapLibre GL JS + Esri satellite tiles
- **Geocoding**: Radar.io
- **Calendar**: FullCalendar library

## Database Schema (user_profiles)
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    company TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'broker',
    is_admin BOOLEAN DEFAULT FALSE,
    team_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

## RLS Policies Applied
All tables have proper `TO authenticated` policies:
- calendar_events (SELECT, INSERT, UPDATE, DELETE)
- contacts, contact_tags
- pipelines, pipeline_stages  
- teams, team_members
- user_profiles (including UPDATE)
- deals

## API Endpoints

### Calendar
- `GET/POST /api/calendar/events`
- `PUT/DELETE /api/calendar/events/{id}`

### Teams
- `GET/POST /api/teams`
- `POST /api/teams/invite`
- `GET /api/teams/members`

### Contacts
- `GET/POST /api/contacts`
- `PUT/DELETE /api/contacts/{id}`
- `GET/POST/PUT/DELETE /api/contacts/tags`

### Deals
- `GET/POST /api/deals`
- `GET/PUT/DELETE /api/deals/{id}`

### Pipelines
- `GET/POST /api/pipelines`
- `GET/PUT/DELETE /api/pipelines/stages/{id}`

## Test Credentials
- Create new user via signup (any email@testmail.com, TestPassword123!)
- Users automatically get default pipeline with 8 stages

## Completed Items (2024-02-05)
1. ✅ Calendar page rebuilt with V2 API
2. ✅ Team page fixed - API response handling corrected
3. ✅ Settings page fixed - aligned with actual DB schema
4. ✅ All RLS policies updated with `TO authenticated`
5. ✅ Backend embedding issue fixed in teams.py

## Remaining Backlog

### P2 (Medium)
- DealDetails full page verification (code is V2-compliant, needs testing with actual deals)
- Team deal performance metrics
- Advanced contact filtering

### P3 (Low)
- CSV contact import
- Recurring calendar events
- Team invitations via email link

## Key Files
- `/app/frontend/src/pages/Calendar.js` - V2 calendar
- `/app/frontend/src/pages/Team.js` - Fixed API handling
- `/app/frontend/src/pages/Settings.js` - Fixed schema alignment
- `/app/frontend/src/pages/Pipeline.js` - Kanban with stage management
- `/app/frontend/src/pages/MapView.js` - Map with deal creation
- `/app/backend/routes_v2/teams.py` - Fixed embedding issue
