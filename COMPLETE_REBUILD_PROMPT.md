# PASTE THIS INTO YOUR NEW EMERGENT SESSION

---

I need you to rebuild my Commercial Real Estate CRM from the ground up. This is NOT a refactor - this is a COMPLETE REBUILD using only the UI design patterns and core concept from the existing codebase as a reference.

## 🎯 MISSION: Build a Clean, Minimal CRM

**Current Situation:**
- I have an existing bloated CRM with tons of features and bugs
- The codebase is messy and has accumulated technical debt
- I want to start completely fresh with a clean slate

**Goal:**
- Build a NEW, minimal CRM application
- Keep ONLY core CRM functionality
- Use the existing UI design system as a template
- Nuke everything else

---

## 📦 WHAT TO KEEP (ONLY THESE FEATURES)

### Core CRM Features (Build Fresh)
1. **User Authentication**
   - Login/Signup
   - User profiles
   - Basic permissions

2. **Deals Management**
   - Create, read, update, delete deals
   - Deal properties: title, address, city, state, zip, asset type, price, size
   - Deal status tracking
   - Location data (lat/lng for map display)

3. **Contacts Management**
   - Create, read, update, delete contacts
   - Contact properties: name, email, phone, company
   - Link contacts to deals

4. **Pipeline Management**
   - Custom pipelines per user
   - Custom stages within pipelines
   - Drag-and-drop deals between stages
   - Color-coded stages
   - Pipeline view (kanban board)

5. **Map View (ESSENTIAL - Keep Simple)**
   - Display deals on a map (satellite view preferred)
   - Click deal markers to view/edit deal details
   - Map style toggle (satellite vs street view)
   - Basic navigation controls (zoom, pan)
   - Deal markers colored by pipeline stage
   - **That's it for map - NO other layers**

6. **Team Features (Basic)**
   - Users belong to teams
   - Can view other team members' deals on map (toggle on/off)

7. **Calendar (Basic)**
   - View upcoming events/tasks
   - Link events to deals/contacts
   - Simple event creation

---

## 🗑️ WHAT TO COMPLETELY REMOVE (NUKE ALL OF THESE)

### DELETE Entirely - Don't Even Reference:
- ❌ **DealVisor** (entire map CRM module with property import)
- ❌ **All map layers** (zoning, parcels, flood zones, water/sewer)
- ❌ **Email campaigns** (entire system)
- ❌ **AI Operations Dashboard**
- ❌ **Market research features**
- ❌ **Property intelligence lookups** (ReportAll, OpenCorporates, etc.)
- ❌ **Perplexity AI integration**
- ❌ **Measurement tools** (distance/area)
- ❌ **Parcel selection/highlighting**
- ❌ **CSV import system** (DealVisor related)
- ❌ **Marketplace features** (if they exist)
- ❌ **Advanced filtering** (keep basic only)
- ❌ **Document management** (if complex)
- ❌ **SMS/calling features** (if they exist)

---

## 🏗️ BUILD APPROACH

### Step 1: Understand Existing UI/Design (Reference Only)
- Review `/app/frontend/src/styles/designSystem.js` - This is your design system
- Review existing component styling patterns
- Note the color scheme, spacing, shadows, borders
- **Don't copy bugs or bloat - just observe the visual patterns**

### Step 2: Nuclear Database Cleanup
**In Supabase (connected via MCP):**

1. **List all existing tables:**
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```

2. **DROP EVERYTHING (yes, everything):**
   ```sql
   -- Drop all tables in public schema
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```

3. **Start Fresh - Create Only These Tables:**

   **Users & Auth:**
   ```sql
   CREATE TABLE user_profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     email TEXT UNIQUE NOT NULL,
     full_name TEXT,
     role TEXT DEFAULT 'user',
     team_id UUID,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE teams (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     owner_id UUID REFERENCES user_profiles(id),
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

   **Deals (Core CRM):**
   ```sql
   CREATE TABLE deals (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     address TEXT,
     city TEXT,
     state TEXT,
     zip_code TEXT,
     latitude DECIMAL(10, 8),
     longitude DECIMAL(11, 8),
     asset_type TEXT,
     price DECIMAL(15, 2),
     size_sqft DECIMAL(10, 2),
     status TEXT DEFAULT 'active',
     pipeline_id UUID,
     pipeline_stage_id UUID,
     priority TEXT DEFAULT 'medium',
     notes TEXT,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_deals_owner ON deals(owner_id);
   CREATE INDEX idx_deals_location ON deals(latitude, longitude) WHERE latitude IS NOT NULL;
   CREATE INDEX idx_deals_pipeline ON deals(pipeline_id);
   ```

   **Contacts:**
   ```sql
   CREATE TABLE contacts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     email TEXT,
     phone TEXT,
     company TEXT,
     notes TEXT,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE contact_deal_links (
     contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
     deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
     role TEXT,
     PRIMARY KEY (contact_id, deal_id)
   );

   CREATE INDEX idx_contacts_owner ON contacts(owner_id);
   ```

   **Pipelines:**
   ```sql
   CREATE TABLE pipelines (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     is_default BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE pipeline_stages (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     color TEXT DEFAULT '#94a3b8',
     position INTEGER NOT NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);
   ```

   **Calendar:**
   ```sql
   CREATE TABLE calendar_events (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     owner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     description TEXT,
     start_date TIMESTAMP NOT NULL,
     end_date TIMESTAMP,
     related_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
     related_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
     created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_calendar_owner_date ON calendar_events(owner_id, start_date);
   ```

4. **Enable RLS on ALL tables:**
   ```sql
   ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
   ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
   ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
   ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
   ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

   -- Basic RLS policies (users can only access their own data)
   CREATE POLICY "Users manage own deals" ON deals
     FOR ALL USING (auth.uid() = owner_id);

   CREATE POLICY "Users manage own contacts" ON contacts
     FOR ALL USING (auth.uid() = owner_id);

   CREATE POLICY "Users manage own pipelines" ON pipelines
     FOR ALL USING (auth.uid() = owner_id);

   CREATE POLICY "Users view pipeline stages" ON pipeline_stages
     FOR SELECT USING (
       EXISTS (
         SELECT 1 FROM pipelines 
         WHERE pipelines.id = pipeline_stages.pipeline_id 
         AND pipelines.owner_id = auth.uid()
       )
     );

   CREATE POLICY "Users manage own calendar" ON calendar_events
     FOR ALL USING (auth.uid() = owner_id);

   CREATE POLICY "Users view own profile" ON user_profiles
     FOR ALL USING (auth.uid() = id);
   ```

### Step 3: Rebuild Backend (Clean, Minimal)

**Backend Structure:**
```
/app/backend/
├── server.py (main FastAPI app)
├── routes/
│   ├── auth.py (login, signup, profile)
│   ├── deals.py (CRUD for deals)
│   ├── contacts.py (CRUD for contacts)
│   ├── pipelines.py (pipeline management)
│   └── calendar.py (calendar events)
├── models/
│   ├── user.py
│   ├── deal.py
│   ├── contact.py
│   └── pipeline.py
└── middleware/
    └── auth.py (JWT verification)
```

**Key Backend Endpoints to Build:**

**Auth:**
- POST `/api/auth/login`
- POST `/api/auth/signup`
- GET `/api/auth/me`

**Deals:**
- GET `/api/deals` - List user's deals
- POST `/api/deals` - Create deal
- GET `/api/deals/{id}` - Get deal details
- PUT `/api/deals/{id}` - Update deal
- DELETE `/api/deals/{id}` - Delete deal
- PATCH `/api/deals/{id}/stage` - Update stage (drag-drop)

**Contacts:**
- GET `/api/contacts` - List user's contacts
- POST `/api/contacts` - Create contact
- PUT `/api/contacts/{id}` - Update contact
- DELETE `/api/contacts/{id}` - Delete contact

**Pipelines:**
- GET `/api/pipelines` - Get user's pipelines with stages
- POST `/api/pipelines` - Create pipeline
- PUT `/api/pipelines/{id}` - Update pipeline
- POST `/api/pipelines/{id}/stages` - Add stage
- PUT `/api/stages/{id}` - Update stage
- DELETE `/api/stages/{id}` - Delete stage

**Calendar:**
- GET `/api/calendar/events` - List upcoming events
- POST `/api/calendar/events` - Create event

**Dashboard:**
- GET `/api/dashboard/stats` - Get dashboard statistics

**Team:**
- GET `/api/team/deals` - Get team members' deals (for map)

### Step 4: Rebuild Frontend (Clean, Minimal)

**Frontend Structure:**
```
/app/frontend/src/
├── App.js (routing)
├── pages/
│   ├── Login.js
│   ├── Dashboard.js (stats widgets)
│   ├── Pipeline.js (kanban view)
│   ├── Deals.js (list/table view)
│   ├── DealDetails.js (single deal view)
│   ├── Contacts.js (list view)
│   ├── ContactDetails.js (single contact)
│   ├── MapView.js (SIMPLE map with deal markers)
│   └── Calendar.js (basic calendar)
├── components/
│   ├── Sidebar.js (navigation)
│   ├── CreateDealModal.js
│   ├── CreateContactModal.js
│   ├── DealCard.js (for pipeline view)
│   └── ui/ (design system components - keep from old code)
├── contexts/
│   └── AuthContext.js
├── styles/
│   └── designSystem.js (COPY from old code - keep as-is)
└── utils/
    └── api.js (API helper functions)
```

**MapView.js - MINIMAL VERSION:**
```javascript
// ONLY include:
- Map rendering (MapLibre GL)
- Satellite/street style toggle
- Deal markers (colored by pipeline stage)
- Click marker to open deal details panel
- Team deals toggle (show/hide team deals)
- Basic navigation controls

// DO NOT include:
- Parcel layers
- Zoning layers
- Flood zones
- Water/sewer
- Measurement tools
- Property intelligence lookups
- CSV import
- Advanced filtering
```

**Routes (App.js):**
```javascript
// ONLY these routes:
/login
/dashboard
/deals
/deals/:id
/contacts
/contacts/:id
/pipeline
/map
/calendar
/settings (basic user settings)
```

### Step 5: UI Design System (Copy from Old Code)

**COPY THESE FILES AS-IS (Don't rebuild):**
- `/app/frontend/src/styles/designSystem.js` - Colors, spacing, shadows
- `/app/frontend/src/components/ui/` - All shadcn components (button, input, etc.)

**USE the same:**
- Color scheme (cyan primary, dark theme)
- Spacing system
- Border radius patterns
- Shadow effects
- Typography
- Button styles

**This gives you the professional look without rebuilding design from scratch.**

---

## 🔥 COMPLETE FILE DELETION LIST

### Backend - DELETE These Entire Files/Folders:
```
/app/backend/routes/email_campaigns.py
/app/backend/routes/map_crm/ (ENTIRE FOLDER - DealVisor)
/app/backend/routes/intelligence.py (all layer endpoints)
/app/backend/routes/marketplace.py (if exists)
/app/backend/routes/ai_operations.py
/app/backend/models/map_crm_models.py
/app/backend/services/reportall_service.py
/app/backend/services/radar_service.py (keep only if used for geocoding deals)
/app/backend/services/ai_operations_service.py
/app/backend/middleware/map_crm_gate.py
```

### Frontend - DELETE These Entire Files/Folders:
```
/app/frontend/src/pages/MapCRM/ (ENTIRE FOLDER - DealVisor)
/app/frontend/src/pages/EmailCampaigns/
/app/frontend/src/pages/AIOperations/
/app/frontend/src/pages/Marketplace.js
/app/frontend/src/pages/PropertyDetails.js (DealVisor related)
/app/frontend/src/components/PropertyIntelligencePanel.js (too complex - rebuild simpler)
/app/frontend/src/components/ParcelPopup.js
/app/frontend/src/components/AIResearchPanel.js
/app/frontend/src/components/LayerManager.js (rebuild minimal version)
/app/frontend/src/contexts/MapCRMContext.js
/app/frontend/src/contexts/MapLayerContext.js
/app/frontend/src/config/reportall.js
/app/frontend/src/services/reportallService.js
/app/frontend/src/services/propertyIntelligenceService.js
```

### Database - DELETE ALL TABLES (Yes, Nuclear Option):
```sql
-- Nuke everything in public schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### Delete Old Migrations:
```
DELETE /app/supabase_migrations/ (entire folder)
CREATE /app/supabase_migrations/ (fresh start)
```

---

## 🏗️ BUILD FROM SCRATCH APPROACH

### Phase 1: Database (30 minutes)
1. Nuke all existing tables (DROP SCHEMA CASCADE)
2. Create fresh schema with ONLY the tables listed above
3. Enable RLS on all tables
4. Create indexes
5. Test connection from backend

### Phase 2: Backend API (2 hours)
1. Clean server.py - remove all old route imports
2. Build minimal routes:
   - auth.py (login, signup)
   - deals.py (CRUD)
   - contacts.py (CRUD)
   - pipelines.py (CRUD + stage management)
   - calendar.py (basic events)
   - dashboard.py (stats)
   - team.py (get team deals)

3. Create simple Pydantic models (no bloat)
4. Test each endpoint with curl

### Phase 3: Frontend Core (2 hours)
1. Clean App.js - remove all old routes
2. Build minimal pages:
   - Login.js (simple auth form)
   - Dashboard.js (4-5 stat cards, recent deals)
   - Deals.js (table view of deals)
   - Contacts.js (table view of contacts)
   - Calendar.js (simple event list)

3. Build essential components:
   - Sidebar.js (navigation only to pages above)
   - CreateDealModal.js (simple form)
   - CreateContactModal.js (simple form)

4. Set up routing (only to pages above)

### Phase 4: Pipeline View (1 hour)
1. Build Pipeline.js with kanban layout
2. Use @dnd-kit for drag-and-drop
3. Display deals in pipeline stages
4. Color-code by stage
5. Click deal to edit

### Phase 5: Map View - SIMPLE (1.5 hours)
1. **NEW MapView.js** (build from scratch - don't copy old bloated version)

   **Include ONLY:**
   ```javascript
   - MapLibre GL map component
   - Satellite imagery (Esri)
   - Street labels overlay (optional)
   - Map style toggle button (satellite/street)
   - Fetch deals from /api/deals (filter by lat/lng exists)
   - Render deal markers (colored by pipeline stage)
   - Click marker → open deal details sidebar
   - Team deals toggle (fetch from /api/team/deals)
   - Basic zoom/pan controls
   ```

   **DO NOT include:**
   - No parcel layers
   - No zoning
   - No flood zones
   - No measurement tools
   - No property intelligence
   - No CSV import
   - No advanced filters (just show all deals)

2. Create simple DealDetailsSidebar component:
   - Display deal info
   - Edit deal fields inline
   - Update pipeline/stage dropdowns
   - Save button

3. Map pin colors from pipeline_stages.color

### Phase 6: Testing (1 hour)
- Test auth flow
- Test CRUD for deals
- Test CRUD for contacts
- Test pipeline drag-drop
- Test map view
- Test team deals toggle
- Check console for errors
- Verify no broken links

---

## 🎨 DESIGN REFERENCE (Copy These Patterns)

### Colors (from designSystem.js):
- Primary: Cyan (#00b8d4)
- Background: Dark theme
- Cards: Dark gray with subtle borders
- Text: White/light gray

### Components to Reuse (Copy As-Is):
- `/app/frontend/src/components/ui/button.jsx`
- `/app/frontend/src/components/ui/input.jsx`
- `/app/frontend/src/components/ui/dialog.jsx`
- `/app/frontend/src/components/ui/checkbox.jsx`
- `/app/frontend/src/styles/designSystem.js`

These are clean shadcn components - copy them directly.

---

## ⚠️ CRITICAL RULES FOR NEW BUILD

### DO:
✅ Start with backend database and APIs first
✅ Test each endpoint before building frontend
✅ Build one feature at a time
✅ Keep it SIMPLE (no over-engineering)
✅ Copy design system components (don't rebuild)
✅ Use existing UI patterns (colors, spacing, etc.)
✅ Test thoroughly after each feature

### DON'T:
❌ Copy old buggy code (use as reference only)
❌ Try to "fix" or "refactor" old code (build NEW)
❌ Add features not in the "Keep" list above
❌ Overcomplicate the map view
❌ Include any layer systems
❌ Copy-paste large components without understanding them
❌ Skip testing

---

## 📊 EXPECTED DELIVERABLES

### 1. Clean Database Schema
- Only 7-8 tables total
- All with RLS enabled
- Proper indexes
- No orphaned tables

### 2. Minimal Backend
- 6-7 route files
- Simple Pydantic models
- Clean server.py
- No unused imports

### 3. Focused Frontend
- 8-10 page components
- 5-6 reusable components
- Simple routing
- No dead code

### 4. Working Features
- ✅ Login/signup
- ✅ Dashboard with stats
- ✅ Create/edit/delete deals
- ✅ Create/edit/delete contacts
- ✅ Pipeline view with drag-drop
- ✅ Map view with deal markers
- ✅ Team deals on map
- ✅ Basic calendar

---

## 🧪 TESTING REQUIREMENTS

Before declaring success, verify:

**Functionality:**
- [ ] User can sign up and log in
- [ ] User can create a deal with address
- [ ] Deal appears on dashboard
- [ ] Deal appears on map with correct color
- [ ] User can drag deal to different pipeline stage
- [ ] User can create contact and link to deal
- [ ] Team members' deals show on map (when toggled)
- [ ] Map style toggle works (satellite/street)
- [ ] Calendar shows upcoming events
- [ ] No console errors
- [ ] No broken links
- [ ] No 404s

**Performance:**
- [ ] Dashboard loads in < 2 seconds
- [ ] Map loads in < 3 seconds
- [ ] No lag when dragging deals in pipeline
- [ ] Page navigation is instant

**Code Quality:**
- [ ] No unused imports
- [ ] No commented-out code
- [ ] Linting passes (frontend)
- [ ] Linting passes (backend)
- [ ] All environment variables in .env (no hardcoding)

---

## 🎯 SUCCESS CRITERIA

You'll know you're done when:

1. **Database has exactly 7-8 tables** (no more)
2. **Backend has ~6 route files** (no bloat)
3. **Frontend has ~8-10 pages** (focused)
4. **App loads fast** (< 2s dashboard, < 3s map)
5. **All core CRM features work** (create deal, view on map, manage pipeline)
6. **NO console errors**
7. **NO features from the "DELETE" list remain**
8. **Code is clean and readable**

---

## 📞 COMMUNICATION GUIDELINES

### Ask User For:
- Clarification on any ambiguous requirements
- Confirmation before major deletions
- Feedback on UI as you build
- Testing and verification

### Update User On:
- Progress after each major phase
- Any blockers or issues
- Completion of features
- Testing results

---

## 🚀 FINAL INSTRUCTIONS

**Your Mission:**
Build a clean, minimal Commercial Real Estate CRM with:
- Core CRM (deals, contacts, pipelines)
- Simple map view (deals on map, colored by stage)
- Team collaboration (see team deals)
- Basic calendar

**Your Constraints:**
- Use existing design system (colors, components)
- Don't copy old buggy code (reference only)
- Keep it simple (no over-engineering)
- Test everything thoroughly

**Your Timeline:**
- Take 4-6 hours to do this RIGHT
- No rush - quality over speed
- Test after each feature

**Your Success:**
- Clean codebase
- Fast performance
- Zero bugs
- Happy user

---

## 📦 WHAT'S IN THE REPO (Branch: refactor-v2)

The existing code is a REFERENCE for:
- UI design patterns
- Component styling
- Color schemes
- Design system

**Don't copy the bloat. Build fresh. Use the design.**

---

**START BY:**
1. Reading this prompt completely
2. Connecting to Supabase via MCP (access token needed from user)
3. Nuking the database (DROP SCHEMA public CASCADE)
4. Creating fresh minimal schema
5. Building backend APIs
6. Building frontend pages
7. Testing everything

**Good luck! Build something clean and maintainable!** 🎯

---

## 🔑 SUPABASE MCP CONNECTION

Ask the user: "Please provide your Supabase Service Role Key for MCP connection so I can manage the database."

They should provide the service key from their Supabase dashboard.
