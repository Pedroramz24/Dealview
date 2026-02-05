# DealLinked CRM V2 - Product Requirements Document

## Original Problem Statement
Complete ground-up rebuild of DealLinked CRM application for Commercial Real Estate. Built a simpler, more focused CRM with essential features.

## All Features Verified Working ✅

### ✅ Authentication
- Supabase Auth with email signup
- JWT-based authentication
- User profile creation trigger (FIXED 2024-02-05)

### ✅ Map View
- Satellite map with Esri tiles
- Address autocomplete via Radar.io
- Click map to set deal location
- Deal markers with asset type colors
- Team Deals toggle
- Smoother zoom animations (fadeDuration: 300, scrollZoom smooth)
- Create New Deal panel with all fields

### ✅ Pipeline/Kanban Board  
- Default 8 stages for new users
- Stage management (create, edit, delete, reorder) ✅ WORKING
- Deal cards with drag-and-drop
- Stage value totals

### ✅ Contacts Page
- Contact CRUD operations
- Smart Tags Manager ✅ WORKING
- Tag creation/rename/delete ✅ WORKING
- Quick filter by tags

### ✅ Team Collaboration
- Team creation ✅ WORKING
- Team member management
- Member stats display
- Pending invites

### ✅ Calendar
- Monthly/Weekly/Daily/List views
- Event CRUD operations ✅ WORKING
- Event types with color coding
- Link events to deals/contacts

### ✅ Settings
- Profile management (name, company, phone)
- Profile picture upload
- Password change
- Security settings

## Technical Stack
- **Frontend**: React, React Router, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Mapping**: MapLibre GL JS + Esri satellite tiles
- **Geocoding**: Radar.io
- **Calendar**: FullCalendar library

## Critical Fix Applied (2024-02-05)
**User profile creation trigger** was recreated to ensure `user_profiles` records are created when users sign up. This was the root cause of all "Failed to create" errors.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## RLS Policies (All Fixed)
All tables have proper `TO authenticated` policies for:
- calendar_events
- contacts, contact_tags
- pipelines, pipeline_stages
- teams, team_members
- user_profiles
- deals

## Map Performance Improvements
- `fadeDuration: 300` - Smooth tile transitions
- `scrollZoom: { speed: 1.5, smooth: true }` - Smoother wheel zoom
- `touchZoomRotate: { around: 'center' }` - Better touch zoom
- `dragRotate: false` - Disabled rotation for simpler UX

## Test Credentials
- Create new user via signup (any email@testmail.com, TestPassword123!)
- Users automatically get default pipeline with 8 stages

## Key Files
- `/app/frontend/src/pages/MapView.js` - Map with improved zoom
- `/app/frontend/src/pages/Calendar.js` - V2 calendar
- `/app/frontend/src/pages/Team.js` - Team management
- `/app/frontend/src/pages/Contacts.js` - Smart Tags
- `/app/frontend/src/pages/Pipeline.js` - Kanban board
- `/app/frontend/src/pages/Settings.js` - User settings

## Remaining Backlog

### P2 (Medium)
- DealDetails full page verification with actual deals
- Team performance metrics
- Advanced contact filtering

### P3 (Low)
- CSV contact import
- Recurring calendar events
- Team email invitations
