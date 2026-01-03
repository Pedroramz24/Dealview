# Map CRM - Project Requirements Document (PRD)

**Project Name:** Map CRM (Property Visualization & Deal Organization Tool)  
**Integration Type:** Extension Module for DealLinked CRM  
**Target Users:** Internal team (5 people)  
**Dataset Size:** ~100,000 properties  
**Database:** Same Supabase project as DealLinked  
**Development Approach:** Modular isolation to avoid bloating DealLinked codebase

---

## 1. PROJECT OVERVIEW

### Purpose
Build a lightweight map-based CRM for property visualization and deal organization that integrates seamlessly with DealLinked CRM. The system enables the team to import large CSV files of property data, visualize properties on an interactive map, manage them through a synchronized table view, and effortlessly convert verified properties into DealLinked deals.

### Key Design Principles
1. **Modular Isolation** - Zero cross-contamination with DealLinked code
2. **Performance First** - Handle 100k properties efficiently
3. **Real-Time Collaboration** - Team members see updates instantly
4. **Effortless Integration** - One-click property → deal conversion
5. **Minimal Complexity** - Focused on property-centric workflows only

---

## 2. USER ROLES & WORKFLOWS

### Team Member (Primary Role)
**Capabilities:**
- Import CSV files with property data
- View all properties on interactive map
- Browse properties in sortable/filterable table
- Claim/assign properties to themselves
- Edit property details inline
- Convert verified properties to DealLinked deals
- View team member activity

**Primary Workflow:**
1. Import CSV → System geocodes addresses → Properties appear on map
2. Filter/search properties by criteria (asset type, city, price, etc.)
3. Click property on map or table to view details
4. Claim property to indicate working on it
5. Call property owner, verify information
6. Click "Convert to Deal" → Property becomes deal in DealLinked Workspace
7. Continue working on deal in DealLinked CRM

---

## 3. CORE FEATURES

### 3.1 CSV Import & Geocoding

**Requirements:**
- Upload CSV file with property addresses and metadata
- Automatically geocode addresses to lat/lng coordinates using Radar.io API
- Validate data before import (required fields, format checks)
- Show import progress (processing X of Y properties)
- Handle partial failures (log properties that failed geocoding)
- Support incremental imports (add to existing dataset)

**CSV Expected Fields:**
```
Required:
- address, city, state, zip_code
- asset_type (Gas, Retail, Industrial, Office, Land, Multifamily)

Optional:
- owner_name, owner_phone, owner_email
- asking_price, lot_size, building_size
- assessed_value, year_built, zoning
- parking_spaces, occupancy, lease_type
- cap_rate, noi, income, expenses
- price_per_sqft, price_per_acre
- description, notes
```

**Technical Approach:**
- Backend: FastAPI endpoint `/api/map-crm/properties/import`
- Geocoding: Use existing Radar.io integration (100k free requests/month)
- Batch processing: Process 100 properties at a time
- Store import history: `map_csv_imports` table

---

### 3.2 Interactive Map View

**Requirements:**
- Display all properties as markers on map
- Different icon colors/shapes per asset type:
  - ⛽ Gas - Red marker
  - 🏬 Retail - Blue marker
  - 🏭 Industrial - Orange marker
  - 🏢 Office - Green marker
  - 🌳 Land - Brown marker
  - 🏘️ Multifamily - Purple marker
- Cluster markers when zoomed out (avoid performance issues)
- Show property summary on marker hover
- Click marker to highlight in table and open details panel
- Support panning, zooming, satellite/street view toggle
- Filter markers by asset type, city, price range
- Sync with table view (map and table always show same filtered set)

**Technical Approach:**
- Map Library: Leaflet (already in DealLinked) with clustering plugin
- Clustering: Server-side clustering for 100k+ properties
  - Use PostGIS `ST_SnapToGrid` for viewport-based clustering
  - Return max 1000 clustered points per viewport
- Tiles: CARTO or Esri (free, already configured in DealLinked)
- Component: `/frontend/src/pages/MapCRM/MapView.js`

---

### 3.3 Synchronized Table View

**Requirements:**
- Display all properties in paginated table (50 rows per page)
- Columns: Address, City, Asset Type, Owner, Asking Price, Size, Status, Assigned To
- Sortable by any column (click header to sort)
- Filterable by:
  - Asset type (multi-select dropdown)
  - City (searchable dropdown)
  - Price range (min/max inputs)
  - Square footage range
  - Owner name (text search)
  - Status (Available, Claimed, Converted)
  - Assigned team member
- Real-time updates when teammate claims/updates property
- Click row to highlight on map and open details panel
- Bulk actions: Assign multiple properties to team member

**Two-Way Sync:**
- Click property on map → Highlight row in table, scroll into view
- Click row in table → Highlight marker on map, pan to location
- Filter in table → Update map markers
- Filter on map (viewport) → Update table to show only visible properties

**Technical Approach:**
- Component: `/frontend/src/pages/MapCRM/TableView.js`
- Pagination: Cursor-based (efficient for 100k rows)
- Filtering: Backend SQL queries with indexes
- Real-time: Supabase Realtime subscriptions to `map_properties` table
- State Management: React Context for shared map/table state

---

### 3.4 Property Details Page

**Requirements:**
- Accessible from map marker click or table row click
- Display in slide-out panel (doesn't leave map/table view)
- Structured sections with inline editing:

**Property Details Section:**
- Title (editable text)
- Full address (editable)
- City, State, Zip (editable dropdowns)
- Asset Type (dropdown: Gas, Retail, Industrial, Office, Land, Multifamily)
- Status (dropdown: Available, Claimed, Converted, Dead)

**Financial Overview Section:**
- Asking Price (currency input)
- Lot Size (acres)
- Building Size (sqft)
- Price per Sqft (calculated)
- Price per Acre (calculated)
- Cap Rate (percentage)
- NOI (currency)
- Income (currency)
- Expenses (currency)
- Year Built (year picker)
- Parking Spaces (number)
- Occupancy (percentage)
- Zoning (text)
- Lease Type (dropdown: NNN, Gross, Modified Gross)

**Additional Details Section:**
- Description (rich text editor)
- Key Features (bullet list)
- Notes (private team notes, markdown supported)

**Linked Contacts Section:**
- Link to existing DealLinked contacts (searchable dropdown)
- Display: Name, Email, Phone, Company
- Click to view contact details
- Add new contact inline (creates in shared contacts table)

**Documents Section:**
- Reuse DealLinked document upload component
- Documents stored in shared Supabase Storage
- Link documents to `map_property_id`
- When property converts to deal, documents transfer automatically

**Actions:**
- "Claim Property" button (assigns to current user)
- "Convert to Deal" button (creates deal in DealLinked)
- "Mark as Dead" button (removes from active view)

**Technical Approach:**
- Component: `/frontend/src/pages/MapCRM/PropertyDetails.js`
- Inline editing: Click field to edit, auto-save on blur
- Reuse DealLinked components: DocumentUpload, ContactPicker
- Real-time: Other team members see edits instantly

---

### 3.5 Team Assignments & Claiming

**Requirements:**
- Team member can "claim" a property to indicate they're working on it
- Claimed properties show team member avatar/name in table
- Team member profile page shows all properties they're working on
- Properties displayed as cards (address, asset type, asking price)
- Click card to open property details
- Real-time updates when teammate claims/unclaims property
- Visual indicator in table (colored border around row)

**Technical Approach:**
- Table: `map_property_assignments`
  - Columns: `property_id`, `user_id`, `status`, `claimed_at`
- Real-time: Supabase subscription to assignment changes
- Component: `/frontend/src/pages/MapCRM/TeamAssignments.js`
- Reuse existing `team_members` table from DealLinked

---

### 3.6 Effortless Property → Deal Conversion

**Requirements:**
- One-click "Convert to Deal" button on property details page
- Confirmation dialog: "Create deal in DealLinked Workspace?"
- On confirm:
  1. Create deal in `deals` table with property data pre-filled
  2. Link property to deal (`map_properties.deal_id = new_deal_id`)
  3. Transfer all linked contacts to deal
  4. Transfer all documents to deal (update `deal_id` in documents table)
  5. Mark property as "Converted" in Map CRM
  6. Show success message with "Open Deal" link
- After conversion:
  - Property remains visible in Map CRM (grayed out)
  - Clicking property shows "Converted to Deal" with link to workspace
  - No duplicate data - single source of truth

**Technical Approach:**
- Backend: `/api/map-crm/properties/{id}/convert-to-deal`
- Single database transaction (all-or-nothing)
- SQL pseudocode:
```sql
BEGIN;
  -- Create deal
  INSERT INTO deals (...) SELECT ... FROM map_properties WHERE id = $1 RETURNING id;
  
  -- Link property to deal
  UPDATE map_properties SET deal_id = $new_id, status = 'converted' WHERE id = $1;
  
  -- Transfer contacts
  UPDATE contacts SET deal_id = $new_id WHERE map_property_id = $1;
  
  -- Transfer documents
  UPDATE documents SET deal_id = $new_id WHERE map_property_id = $1;
COMMIT;
```

---

### 3.7 Real-Time Collaboration

**Requirements:**
- When team member claims property, all others see update instantly
- When team member edits property, all others see changes in real-time
- When property is converted to deal, all others see status change
- Visual indicators: "(Username) is editing this property"
- Conflict resolution: Last write wins (simple for 5-person team)

**Technical Approach:**
- Supabase Realtime: Subscribe to `map_properties` and `map_property_assignments` tables
- WebSocket connection per user
- Debounce updates (max 1 update per second to avoid UI thrashing)
- Copy pattern from DealLinked messaging (already working)

---

## 4. DATABASE SCHEMA

### New Tables (Isolated from DealLinked)

```sql
-- Properties table (core data)
CREATE TABLE map_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),
  deal_id UUID REFERENCES deals(id), -- Link when converted
  
  -- Address & Location
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  
  -- Property Details
  title TEXT,
  asset_type TEXT NOT NULL, -- Gas, Retail, Industrial, Office, Land, Multifamily
  status TEXT DEFAULT 'available', -- available, claimed, converted, dead
  
  -- Financial Data
  asking_price NUMERIC,
  lot_size NUMERIC, -- acres
  building_size NUMERIC, -- sqft
  assessed_value NUMERIC,
  cap_rate NUMERIC,
  noi NUMERIC,
  income NUMERIC,
  expenses NUMERIC,
  
  -- Additional Details
  year_built INTEGER,
  parking_spaces INTEGER,
  occupancy NUMERIC,
  zoning TEXT,
  lease_type TEXT,
  description TEXT,
  notes TEXT, -- Private team notes
  
  -- Owner Information
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_edited_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance (100k properties)
CREATE INDEX idx_map_properties_owner ON map_properties(owner_id);
CREATE INDEX idx_map_properties_team ON map_properties(team_id);
CREATE INDEX idx_map_properties_asset_type ON map_properties(asset_type);
CREATE INDEX idx_map_properties_city ON map_properties(city);
CREATE INDEX idx_map_properties_status ON map_properties(status);
CREATE INDEX idx_map_properties_location ON map_properties USING GIST (ST_Point(longitude, latitude));

-- Team assignments (who's working on what)
CREATE TABLE map_property_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES map_properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'claimed', -- claimed, working, contacted
  claimed_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  UNIQUE(property_id, user_id)
);

CREATE INDEX idx_map_assignments_property ON map_property_assignments(property_id);
CREATE INDEX idx_map_assignments_user ON map_property_assignments(user_id);

-- CSV import history
CREATE TABLE map_csv_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  filename TEXT NOT NULL,
  total_rows INTEGER,
  successful_rows INTEGER,
  failed_rows INTEGER,
  status TEXT DEFAULT 'processing', -- processing, completed, failed
  error_log JSONB, -- Array of errors for failed rows
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_map_imports_user ON map_csv_imports(user_id);
CREATE INDEX idx_map_imports_status ON map_csv_imports(status);
```

### Shared Tables (Reuse from DealLinked)

```sql
-- Already exist, no changes needed
user_profiles -- Authentication, team membership
teams -- Team collaboration
team_members -- Team roster
contacts -- Link to properties via property_id
documents -- Add map_property_id column
```

### RLS Policies

```sql
-- Properties: Team members can view team properties
CREATE POLICY "Team members can view team properties"
ON map_properties FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Properties: Team members can update team properties
CREATE POLICY "Team members can update team properties"
ON map_properties FOR UPDATE
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- Assignments: Users can claim properties
CREATE POLICY "Users can claim properties"
ON map_property_assignments FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Assignments: Users can view all team assignments
CREATE POLICY "Users can view team assignments"
ON map_property_assignments FOR SELECT
USING (
  property_id IN (
    SELECT id FROM map_properties WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  )
);
```

---

## 5. TECHNICAL ARCHITECTURE

### Backend Structure

```
/app/backend/
├── routes/
│   ├── deal_routes.py              [DON'T TOUCH - DealLinked]
│   ├── marketplace_routes.py       [DON'T TOUCH - DealLinked]
│   ├── dashboard_routes.py         [DON'T TOUCH - DealLinked]
│   ├── messaging_routes.py         [DON'T TOUCH - DealLinked]
│   └── map_crm/                    [NEW - Isolated Module]
│       ├── __init__.py
│       ├── property_routes.py      (CRUD, import, convert)
│       ├── geocoding_service.py    (Radar.io integration)
│       └── clustering_service.py   (PostGIS clustering)
├── models/
│   ├── deal_models.py              [DON'T TOUCH]
│   └── map_crm_models.py           [NEW]
└── server.py                       [MODIFY - Add router]
```

### Frontend Structure

```
/app/frontend/src/
├── pages/
│   ├── Workspace.js                [DON'T TOUCH - DealLinked]
│   ├── Marketplace.js              [DON'T TOUCH - DealLinked]
│   ├── Dashboard.js                [DON'T TOUCH - DealLinked]
│   └── MapCRM/                     [NEW - Lazy Loaded]
│       ├── index.js                (Route entry point)
│       ├── MapView.js              (Leaflet map with clustering)
│       ├── TableView.js            (Sortable/filterable table)
│       ├── PropertyDetails.js      (Detail panel)
│       ├── CSVImport.js            (Upload modal)
│       └── TeamAssignments.js      (Member profiles)
├── components/
│   ├── ui/                         [SHARED - Reuse shadcn]
│   └── map-crm/                    [NEW - Map-specific]
│       ├── PropertyMarker.js
│       ├── PropertyCard.js
│       └── ClaimButton.js
└── App.js                          [MODIFY - Add route]
```

### API Endpoints

```
POST   /api/map-crm/properties/import          (CSV upload & geocode)
GET    /api/map-crm/properties                 (List with filters, pagination)
GET    /api/map-crm/properties/map-data        (Clustered for map view)
GET    /api/map-crm/properties/{id}            (Single property)
PUT    /api/map-crm/properties/{id}            (Update property)
DELETE /api/map-crm/properties/{id}            (Delete property)
POST   /api/map-crm/properties/{id}/claim      (Assign to user)
POST   /api/map-crm/properties/{id}/convert    (Convert to DealLinked deal)
GET    /api/map-crm/assignments/me             (My claimed properties)
GET    /api/map-crm/imports                    (Import history)
GET    /api/map-crm/imports/{id}/status        (Import progress)
```

---

## 6. PERFORMANCE OPTIMIZATION

### Challenge: 100k Properties on Map

**Solution: Server-Side Clustering**
- Use PostGIS `ST_SnapToGrid` to cluster properties by viewport
- Client sends map bounds (north, south, east, west, zoom level)
- Server returns max 1000 clustered points
- Zoom in = more detail, zoom out = fewer clusters

```sql
-- Example clustering query
SELECT 
  ST_X(cluster_point) as lng,
  ST_Y(cluster_point) as lat,
  COUNT(*) as property_count,
  ARRAY_AGG(id) as property_ids,
  ARRAY_AGG(asset_type) as asset_types
FROM (
  SELECT 
    id, asset_type,
    ST_SnapToGrid(ST_Point(longitude, latitude), :grid_size) as cluster_point
  FROM map_properties
  WHERE 
    latitude BETWEEN :south AND :north
    AND longitude BETWEEN :west AND :east
    AND status != 'converted'
) clustered
GROUP BY cluster_point
LIMIT 1000;
```

### Challenge: Table Performance with 100k Rows

**Solution: Cursor-Based Pagination + Indexes**
- Load 50 rows at a time
- Use cursor (last seen ID) instead of offset
- Create indexes on filtered columns
- Frontend: Infinite scroll or pagination controls

---

## 7. DEPLOYMENT CONFIGURATION

### Supabase Setup (Already Configured)
- ✅ Project: https://ygezobmpewthqvsfqrbk.supabase.co
- ✅ Auth: Working
- ✅ Storage: Configured
- ✅ Realtime: Enabled

### New Migrations to Apply
```
/app/supabase_migrations/
├── 031_create_map_properties.sql
├── 032_create_map_assignments.sql
├── 033_create_map_imports.sql
└── 034_map_rls_policies.sql
```

### Environment Variables (Already Set)
- ✅ `RADAR_SECRET_KEY` - Geocoding (100k free requests/month)
- ✅ `SUPABASE_URL` - Database
- ✅ `SUPABASE_SERVICE_KEY` - Admin access

### MongoDB (Dummy Data - Required for Deployment)
- ✅ Fixed by support team
- ✅ Running with dummy data
- ✅ Not used by application

---

## 8. DEVELOPMENT PHASES

### Phase 1: Foundation (Week 1)
- [ ] Create database migrations (`map_properties`, `map_assignments`, `map_imports`)
- [ ] Apply RLS policies
- [ ] Build CSV import backend with Radar.io geocoding
- [ ] Create basic property CRUD endpoints
- [ ] Setup Map CRM frontend route structure

### Phase 2: Map & Table (Week 2)
- [ ] Build map view with Leaflet + clustering
- [ ] Implement server-side clustering query
- [ ] Build table view with sorting/filtering
- [ ] Implement two-way sync (map ↔ table)
- [ ] Real-time updates via Supabase subscriptions

### Phase 3: Property Details (Week 3)
- [ ] Build property details slide-out panel
- [ ] Implement inline editing
- [ ] Link to existing DealLinked contacts
- [ ] Reuse document upload component
- [ ] Add claim/unclaim functionality

### Phase 4: Team & Conversion (Week 4)
- [ ] Team member profile pages
- [ ] Property assignment UI
- [ ] Implement property → deal conversion
- [ ] Test conversion workflow end-to-end
- [ ] Polish real-time collaboration

### Phase 5: Testing & Deployment (Week 5)
- [ ] Backend API testing
- [ ] Frontend UI testing
- [ ] Performance testing with 100k properties
- [ ] Team acceptance testing
- [ ] Deploy to production

---

## 9. SUCCESS METRICS

### Performance
- ✅ Map loads < 2 seconds with 100k properties
- ✅ Table filtering responds < 500ms
- ✅ Real-time updates < 100ms latency
- ✅ CSV import: 1000 properties/minute

### User Experience
- ✅ One-click property → deal conversion
- ✅ Zero duplicate data entry
- ✅ Seamless navigation between Map CRM and DealLinked
- ✅ Team members see updates instantly

### Integration Quality
- ✅ Zero impact on DealLinked performance
- ✅ Can disable Map CRM without affecting DealLinked
- ✅ Shared authentication/teams work perfectly
- ✅ Documents/contacts transfer automatically

---

## 10. RISK MITIGATION

### Risk: Bloating DealLinked Codebase
**Mitigation:**
- Modular code structure with clear separation
- Lazy loading (Map CRM loads only when visited)
- Feature flag to disable if needed
- Git branch workflow (merge only after testing)

### Risk: Performance Issues with 100k Properties
**Mitigation:**
- Server-side clustering (proven technique)
- Database indexes on all filtered columns
- Pagination for table view
- Load testing before deployment

### Risk: Real-Time Sync Complexity
**Mitigation:**
- Copy existing Supabase Realtime pattern from DealLinked messaging
- Simple conflict resolution (last write wins for 5 users)
- Fallback to polling if WebSocket fails

### Risk: Deployment Issues
**Mitigation:**
- MongoDB dummy data in place (support team fixed)
- Same deployment pipeline as DealLinked
- Test in preview before deploying
- Can rollback if issues occur

---

## 11. OUT OF SCOPE (Not Building)

### Explicitly NOT Included:
- ❌ Property listing website (marketplace for properties)
- ❌ Public property search (internal team tool only)
- ❌ Advanced analytics/reporting (basic stats only)
- ❌ Mobile app (responsive web only)
- ❌ Email campaigns from Map CRM (use DealLinked)
- ❌ Calendar integration (use DealLinked)
- ❌ Automated workflows/triggers
- ❌ Third-party integrations beyond geocoding

### Can Be Added Later:
- Property history/timeline
- Advanced search (radius, polygon draw)
- Export filtered properties to CSV
- Bulk property updates
- Property tags/categories
- Custom fields per team

---

## 12. HANDOFF NOTES FOR FORKED SESSION

### What's Ready:
- ✅ DealLinked CRM fully functional (12/12 tests passing)
- ✅ Supabase connection working
- ✅ MongoDB running with dummy data (deployment blocker fixed)
- ✅ All dependencies installed
- ✅ Frontend/backend services running

### What Needs to Be Built:
- Map CRM module (following this PRD)
- Database migrations for `map_*` tables
- API routes in `/api/map-crm/*` namespace
- Frontend components in `/pages/MapCRM/`

### Integration Points:
- Reuse: `user_profiles`, `teams`, `team_members`, `contacts`, `documents`
- New: `map_properties`, `map_property_assignments`, `map_csv_imports`
- Link: `map_properties.deal_id` → `deals.id` when converted

### Testing Approach:
- Backend: Test CSV import with sample 100-row file first
- Backend: Test geocoding with Radar.io (verify 100k free tier)
- Frontend: Test map rendering with 1k properties first, then 10k, then 100k
- Integration: Test property → deal conversion end-to-end
- Performance: Load test with 100k properties

### Deployment Checklist:
- [ ] Run backend tests (use `deep_testing_backend_v2`)
- [ ] Run frontend tests (use `auto_frontend_testing_agent`)
- [ ] Verify MongoDB still running
- [ ] Check all migrations applied
- [ ] Test in preview environment
- [ ] Fork session → Start deployment
- [ ] Monitor deployment logs
- [ ] Test deployed app

---

**END OF PRD**

This document should be referenced throughout development to ensure all requirements are met and the modular architecture is maintained.
