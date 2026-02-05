# DealLinked CRM V2 - Product Requirements Document

## Original Problem Statement
Complete ground-up rebuild of DealLinked CRM application for Commercial Real Estate. Built a simpler, more focused CRM with essential features.

## All Features Verified Working ✅

### ✅ Authentication
- Supabase Auth with email signup
- JWT-based authentication
- User profile creation trigger (FIXED)

### ✅ Map View
- Satellite map with Esri tiles
- Smoother zoom (fadeDuration: 300, scrollZoom smooth)
- Address autocomplete via Radar.io
- Click-to-add deal functionality
- Deal markers with asset type colors
- Team Deals toggle
- Create New Deal panel with all fields

### ✅ Deal Creation (FIXED)
- Deal creation with location selection
- All financial fields: price, NOI, cap rate, etc.
- Deals persist after creation
- RLS policies properly configured

### ✅ Pipeline/Kanban Board  
- Default 8 stages for new users
- Stage management (create, edit, delete)
- Deal cards with drag-and-drop

### ✅ Contacts Page
- Contact CRUD operations
- **NEW: Side Panel Tag Manager** - Clean slide-in panel
- Tag creation with color picker and preview
- Tag editing and deletion
- Quick filter by tags

### ✅ Team Collaboration
- Team creation
- Team member management
- Member stats display

### ✅ Calendar
- Monthly/Weekly/Daily/List views
- Event CRUD operations
- Event types with color coding

### ✅ Settings
- Profile management (name, company, phone)
- Profile picture upload
- Password change

### ✅ Document Upload (NEW)
- Drag and drop document upload zone
- Click to browse functionality
- File type and size validation (max 10MB)
- Supported formats: PDF, DOC, XLS, PPT, Images

## Technical Stack
- **Frontend**: React, React Router, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Mapping**: MapLibre GL JS + Esri satellite tiles
- **Geocoding**: Radar.io
- **Calendar**: FullCalendar library

## Recent Fixes (2024-02-05)

### Tag Manager Side Panel
- Converted from modal to slide-in side panel
- Shows list of all existing tags
- Click on tag to edit/delete
- Live preview of tag appearance
- Clean design with dark theme

### Document Upload
- Added drag and drop functionality
- Added visual drop zone with instructions
- Upload button and file browser
- Progress indicators

### Deal Creation
- Fixed RLS INSERT policy for deals table
- Deals now persist correctly
- All fields save properly

### RLS Policies
Fixed all tables with proper `TO authenticated`:
- deals, deal_documents
- calendar_events
- contacts, contact_tags
- pipelines, pipeline_stages
- teams, team_members
- user_profiles

## Key API Endpoints

### Documents
- `POST /api/deals/{deal_id}/documents` - Upload document (multipart/form-data)
- `DELETE /api/deals/{deal_id}/documents/{document_id}` - Delete document

### Tags
- `GET /api/contacts/tags` - List all tags
- `POST /api/contacts/tags` - Create tag
- `PUT /api/contacts/tags/{tag_id}` - Update tag
- `DELETE /api/contacts/tags/{tag_id}` - Delete tag

## Key Files
- `/app/frontend/src/pages/Contacts.js` - New side panel tag manager
- `/app/frontend/src/pages/DealDetails.js` - Drag & drop document upload
- `/app/frontend/src/pages/MapView.js` - Smoother zoom
- `/app/backend/routes_v2/deals.py` - Document upload endpoints

## Remaining Backlog

### P2 (Medium)
- DealDetails full page verification
- Team performance metrics

### P3 (Low)
- CSV contact import
- Recurring calendar events
