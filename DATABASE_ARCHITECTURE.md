# DealLinked Database Architecture - CONSOLIDATED

**Last Updated:** 2025-12-27  
**Status:** 🚨 MIGRATION IN PROGRESS - MongoDB being removed

---

## Current Architecture Problem

### ❌ BROKEN: Dual Database System
The application previously used **TWO** databases:
1. **MongoDB** - Backend API writes here
2. **Supabase (PostgreSQL)** - Frontend reads here

**Result:** Complete data disconnect. Deals created via API were invisible in the UI.

---

## ✅ TARGET Architecture: Supabase Only

**Single Source of Truth:** All data stored in Supabase PostgreSQL

### Domain Object Ownership

| Domain | Owner | Tables | Access Pattern |
|--------|-------|--------|----------------|
| **Authentication** | Supabase Auth | `auth.users` | Managed by Supabase |
| **User Profiles** | Supabase | `public.user_profiles` | RLS enabled |
| **CRM - Deals** | Supabase | `public.deals`, `public.pipelines`, `public.pipeline_stages` | RLS enabled |
| **CRM - Contacts** | Supabase | `public.contacts`, `public.contact_deal_links` | RLS enabled |
| **CRM - Calendar** | Supabase | `public.calendar_events` | RLS enabled |
| **Marketplace** | Supabase | `public.deals` (is_published=true), `public.marketplace_messages` | RLS enabled |
| **Teams** | Supabase | `public.teams`, `public.team_members` | RLS enabled |
| **Roles** | Supabase | `public.role_verification_requests` | RLS enabled |

### MongoDB Status
**🗑️ TO BE REMOVED** - MongoDB is NOT used by the production application.
- All MongoDB imports will be removed from backend
- `get_db()` utility will be removed  
- MongoDB seed scripts will be deleted
- `MONGO_URL` environment variable will be removed

---

## Migration Plan

### Phase 1: Backend API Migration (IN PROGRESS)
**Affected Files:**
- ❌ `backend/routes/deal_routes.py` - Currently writes to MongoDB
- ❌ `backend/routes/dashboard_routes.py` - Currently reads from MongoDB
- ❌ `backend/utils/db.py` - Contains MongoDB client
- ❌ `backend/server.py` - Initializes MongoDB connection

**Action Required:**
1. Refactor all API routes to use Supabase client
2. Replace `get_db()` calls with Supabase queries
3. Remove MongoDB imports and connection logic
4. Update all CRUD operations to use Supabase SDK

### Phase 2: Cleanup & Verification
**Files to Delete:**
- `backend/seed_data.py`
- `backend/seed_san_antonio.py`
- `backend/scripts/add_placeholder_data.py` (old MongoDB version)
- `backend/scripts/cleanup_placeholder_data.py` (old MongoDB version)

**Files to Keep:**
- ✅ `backend/scripts/add_supabase_placeholder_data.py` (for dev testing only)
- ✅ `backend/scripts/cleanup_supabase_placeholder_data.py` (for dev testing only)

### Phase 3: Environment Cleanup
Remove from `.env`:
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="pedro_crm"
```

---

## Empty State Strategy

**Production Requirement:** Application MUST work correctly with zero data.

### Empty State UI Components Needed

1. **Pipeline Page**
   - Show: "No deals yet. Create your first deal or browse the marketplace."
   - CTA: "Add Deal" + "Browse Marketplace" buttons

2. **Contacts Page**
   - Show: "No contacts yet. Start building your network."
   - CTA: "Add Contact" button

3. **Calendar Page**
   - Show: "No events scheduled. Add your first event."
   - CTA: "Create Event" button

4. **Dashboard**
   - Show: Zero metrics gracefully (e.g., "0 deals", "$0 pipeline")
   - No errors or broken charts

5. **Marketplace**
   - Show: "No listings available yet" or "Be the first to publish"
   - No broken map or filters

---

## Testing Verification

### Acceptance Criteria
✅ New user logs in → sees clean empty states (no placeholder data)  
✅ All pages load without errors when data is empty  
✅ Dashboard shows "$0" metrics, not loading spinners  
✅ Pipeline shows intentional empty state with CTA  
✅ Contacts shows intentional empty state with CTA  
✅ Calendar shows intentional empty state with CTA  
✅ Marketplace shows "no listings" state  
✅ Creating a deal via UI → appears immediately in Pipeline  
✅ Creating a contact via UI → appears immediately in Contacts  
✅ No backend errors in logs related to MongoDB  

### Test User
**Email:** contact@pedroarmando.com  
**Expected State:** All CRM sections empty after migration

---

## Database Connection Code

### ❌ OLD (MongoDB - DO NOT USE)
```python
from motor.motor_asyncio import AsyncIOMotorClient
from utils.db import get_db

db = get_db()
await db.deals.find({})
```

### ✅ NEW (Supabase)
```python
from supabase import create_client
import os

supabase = create_client(
    os.environ['SUPABASE_URL'],
    os.environ['SUPABASE_SERVICE_KEY']
)

result = supabase.table("deals").select("*").execute()
```

---

## Notes for Future Developers

1. **DO NOT** add MongoDB back without architectural review
2. **DO NOT** create placeholder/seed data scripts for production
3. **DO** ensure all empty states are tested and intentional
4. **DO** use Supabase Row Level Security (RLS) for all tables
5. **DO** verify all API endpoints return consistent data with frontend expectations

---

## Current Status

- ✅ All placeholder data cleaned from both databases
- ✅ MongoDB collections emptied  
- ✅ Supabase tables emptied
- ⏳ Backend API routes still use MongoDB (needs migration)
- ⏳ Empty state UI components need verification
- ⏳ MongoDB removal from codebase pending
