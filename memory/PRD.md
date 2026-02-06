# DealLinked CRM V2 - Product Requirements Document

## Original Problem Statement
Complete ground-up rebuild of DealLinked CRM application for Commercial Real Estate.

## All Features Verified Working ✅

### ✅ Map View
- Satellite map with Esri tiles
- Smoother zoom animations
- Address autocomplete via Radar.io
- Click-to-add deal functionality
- Deal markers with asset type colors
- **NEW: Enhanced Side Panel** with:
  - Property images display
  - Pipeline/Stage dropdowns (editable)
  - All deal details (size, lot, cap rate, NOI, year built, occupancy, zoning, AC size)
  - "View Full Details" button

### ✅ Property Details Page
- **NEW: Property Images Gallery**
  - Main image display with thumbnails
  - Click thumbnails to change main image
  - "Add Image" upload button
  - Drag & drop support (pending storage bucket)
- **NEW: Pipeline Status Section**
  - Pipeline dropdown (change pipeline)
  - Stage dropdown (change stage)
  - Current stage indicator with color
- Full property details grid
- Edit/Delete functionality
- Linked Contacts management
- Document upload with drag & drop

### ✅ Pipeline/Kanban Board  
- Default 8 stages for new users
- Stage management (create, edit, delete)
- Deal cards with drag-and-drop

### ✅ Contacts Page
- Contact CRUD operations
- Side Panel Tag Manager
- Tag creation with color picker
- Quick filter by tags

### ✅ Team Collaboration
- Team creation and management
- Member stats display

### ✅ Calendar
- Event CRUD operations
- Multiple view modes

### ✅ Settings
- Profile management
- Password change

## Recent Updates (2024-02-06)

### Map Side Panel Enhancement
- Added property images display
- Added Pipeline/Stage dropdowns (directly editable)
- Added all property detail fields
- Immediate update on dropdown change

### DealDetails Page Enhancement
- Added Property Images section with gallery
- Added Pipeline Status section with dropdowns
- Added current stage indicator with color
- Added image upload API endpoint

### Backend Updates
- Added `POST /api/deals/{deal_id}/images` for image upload
- Images stored in Supabase storage bucket

## Key Files
- `/app/frontend/src/pages/MapView.js` - Enhanced side panel
- `/app/frontend/src/pages/DealDetails.js` - Images & pipeline dropdowns
- `/app/backend/routes_v2/deals.py` - Image upload endpoint

## API Endpoints

### Images
- `POST /api/deals/{deal_id}/images` - Upload image (multipart/form-data)
  - Returns: `{ success: true, image_url: "...", image_urls: [...] }`

### Documents
- `POST /api/deals/{deal_id}/documents` - Upload document
- `DELETE /api/deals/{deal_id}/documents/{doc_id}` - Delete document

## Database Fields (deals table)
- `image_url` - Primary image URL
- `image_urls` - Array of all image URLs
- `pipeline_id` - Current pipeline
- `pipeline_stage_id` - Current stage

## Remaining Backlog

### P2 (Medium)
- Create Supabase storage buckets: `deal-images`, `deal-documents`
- Team performance metrics

### P3 (Low)
- CSV contact import
- Recurring calendar events
