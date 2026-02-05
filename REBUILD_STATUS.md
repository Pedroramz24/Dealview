# 🚀 DealLinked CRM V2 - Complete Rebuild

## Current Status
- ✅ Backend API rebuilt and running (V2)
- ✅ Frontend core rebuilt (App.js, Login.js, Dashboard.js, MainLayout.js)
- ⏳ **DATABASE MIGRATION NEEDS TO BE RUN MANUALLY**
- ⏳ Additional frontend pages to simplify (MapView, Team, etc.)

## 🔴 CRITICAL NEXT STEP

**You need to run the database migration in Supabase before testing!**

---

## 🗄️ STEP 1: Run Database Migration

**You need to run this SQL in Supabase SQL Editor:**

1. Go to: https://supabase.com/dashboard → Your Project → SQL Editor
2. Copy the entire contents of: `/app/supabase_migrations_rebuild/001_nuclear_reset_and_fresh_schema.sql`
3. Run it (this will DROP ALL existing tables and create fresh schema)

**⚠️ WARNING: This deletes ALL existing data!**

---

## 📡 Backend API Endpoints (V2)

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/signup` - Create new account
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update profile

### Deals
- `GET /api/deals` - List user's deals
- `GET /api/deals/team` - List team members' deals
- `GET /api/deals/{id}` - Get deal details
- `POST /api/deals` - Create deal
- `PUT /api/deals/{id}` - Update deal
- `PATCH /api/deals/{id}/stage` - Update deal stage (drag-drop)
- `DELETE /api/deals/{id}` - Delete deal
- `POST /api/deals/{id}/contacts/{contact_id}` - Link contact to deal
- `DELETE /api/deals/{id}/contacts/{contact_id}` - Unlink contact

### Contacts
- `GET /api/contacts` - List contacts (with filters)
- `GET /api/contacts/{id}` - Get contact with linked deals
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/{id}` - Update contact
- `DELETE /api/contacts/{id}` - Delete contact

### Smart Tags
- `GET /api/contacts/tags` - List tags
- `POST /api/contacts/tags` - Create tag
- `PUT /api/contacts/tags/{id}` - Update tag
- `DELETE /api/contacts/tags/{id}` - Delete tag

### Pipelines
- `GET /api/pipelines` - List pipelines with stages
- `GET /api/pipelines/{id}` - Get pipeline
- `POST /api/pipelines` - Create pipeline
- `PUT /api/pipelines/{id}` - Update pipeline
- `DELETE /api/pipelines/{id}` - Delete pipeline
- `POST /api/pipelines/{id}/stages` - Add stage
- `PUT /api/pipelines/stages/{id}` - Update stage
- `DELETE /api/pipelines/stages/{id}` - Delete stage
- `POST /api/pipelines/{id}/stages/reorder` - Reorder stages

### Teams
- `GET /api/teams` - Get user's team
- `POST /api/teams` - Create team
- `PUT /api/teams` - Update team
- `GET /api/teams/members` - List team members with stats
- `GET /api/teams/members/{id}/deals` - Get member's deals
- `POST /api/teams/invite` - Invite member by email
- `PUT /api/teams/members/{id}/role` - Update member role
- `DELETE /api/teams/members/{id}` - Remove member
- `POST /api/teams/leave` - Leave team

### Calendar
- `GET /api/calendar/events` - List events
- `GET /api/calendar/events/upcoming` - Get upcoming events
- `GET /api/calendar/events/{id}` - Get event
- `POST /api/calendar/events` - Create event
- `PUT /api/calendar/events/{id}` - Update event
- `DELETE /api/calendar/events/{id}` - Delete event

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-activity` - Get recent activity

### Documents
- `POST /api/deals/{id}/documents` - Upload document
- `GET /api/deals/{id}/documents` - List documents
- `DELETE /api/documents/{id}` - Delete document

### Images
- `POST /api/deals/{id}/images` - Upload deal image

### Geocoding
- `GET /api/geocode?address=...` - Geocode address

---

## 🎨 Frontend Pages (To Be Built)

| Page | Status | Description |
|------|--------|-------------|
| LandingPage.js | ✅ Keep | Public landing page |
| Login.js | 🔄 Simplify | Login/signup form |
| Dashboard.js | 🔄 Rebuild | Stats cards |
| MapView.js | 🔄 Rebuild | Deal markers + team toggle |
| Pipeline.js | ✅ Keep | Kanban board |
| Contacts.js | 🔄 Simplify | Contact list with tags |
| DealDetails.js | 🔄 Rebuild | Full deal page |
| Team.js | 🔄 Rebuild | Team members + deals |
| Calendar.js | ✅ Keep | Event calendar |
| Settings.js | ✅ Keep | User settings |

---

## 🗑️ Features REMOVED

- ❌ Command Center
- ❌ DealVisor / MapCRM
- ❌ All map layers (zoning, parcels, flood, etc.)
- ❌ Email campaigns
- ❌ AI Operations
- ❌ Property intelligence
- ❌ Measurement tools
- ❌ Marketplace

---

## ✅ Next Steps

1. **You:** Run database migration SQL in Supabase
2. **You:** Create storage buckets in Supabase:
   - `deal-images` (public)
   - `deal-documents` (private)
   - `avatars` (public)
3. **Me:** Continue frontend rebuild once DB is ready
