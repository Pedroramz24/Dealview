# 🚀 Quick Start Guide for Forked Session

**You are in a FORKED session ready to:**
1. Deploy DealLinked CRM (working baseline)
2. Build Map CRM extension (lightweight property visualization tool)

---

## ⚡ IMMEDIATE ACTIONS

### 1. Verify Environment (30 seconds)
```bash
# Check all services running
sudo supervisorctl status
# Expected: backend, frontend, mongodb all RUNNING

# Test DealLinked API
curl http://localhost:8001/api/auth/me
# Expected: {"detail":"Not authenticated"} = API responding ✅
```

### 2. Read Documentation (5 minutes)
```bash
# Start here - Full PRD for Map CRM
cat /app/MAP_CRM_PROJECT_REQUIREMENTS.md

# Deployment instructions
cat /app/DEPLOYMENT_PREPARATION.md

# DealLinked context
cat /app/HANDOFF_TO_NEW_SESSION.md
```

### 3. Deploy DealLinked First (15 minutes)
**Why:** Establish working baseline before adding Map CRM

1. Click **"Deploy"** in Emergent UI
2. Click **"Start Deployment"**
3. Wait for deployment to complete
4. Test at production URL:
   - Login: contact@pedroarmando.com / Flin141812$
   - Verify workspace, marketplace, dashboard work

---

## 📋 MAP CRM PROJECT SUMMARY

### What You're Building:
Lightweight map-based CRM for **5-person internal team** to:
- Import CSV (100k properties) → Auto-geocode → Display on map
- View properties in synchronized table (click marker ↔ highlight row)
- Assign properties to team members (real-time collaboration)
- Edit property details inline
- **One-click convert property → DealLinked deal** (effortless integration)

### Key Architecture Decisions:
✅ **Same Supabase project** (not separate - enables effortless conversion)  
✅ **Modular isolation** (Map CRM can be removed without affecting DealLinked)  
✅ **Lazy loaded** (doesn't bloat DealLinked bundle size)  
✅ **Reuse components** (auth, teams, contacts, documents, UI library)  

### Expected Timeline:
- **Phase 1 (Week 1):** Database + CSV import + geocoding
- **Phase 2 (Week 2):** Map view + table view + two-way sync
- **Phase 3 (Week 3):** Property details + inline editing
- **Phase 4 (Week 4):** Team assignments + conversion flow
- **Phase 5 (Week 5):** Testing + deployment

---

## 🗂️ FILE STRUCTURE

### New Files Created (Read These):
```
/app/
├── MAP_CRM_PROJECT_REQUIREMENTS.md     ⭐ START HERE
├── DEPLOYMENT_PREPARATION.md           📋 Deploy instructions
├── HANDOFF_TO_NEW_SESSION.md           📖 DealLinked context
├── SUPPORT_TICKET_DRAFT.md             📧 Support resolution
└── test_result.md                      ✅ Test results
```

### Where You'll Build:
```
/app/backend/routes/map_crm/            🆕 Backend routes
/app/backend/models/map_crm_models.py   🆕 Pydantic models
/app/frontend/src/pages/MapCRM/         🆕 React components
/app/supabase_migrations/031-034_*.sql  🆕 Database schema
```

### What NOT to Touch:
```
/app/backend/routes/deal_routes.py      ❌ DealLinked - leave alone
/app/backend/routes/marketplace_routes.py ❌ DealLinked - leave alone
/app/frontend/src/pages/Workspace.js    ❌ DealLinked - leave alone
/app/frontend/src/pages/Marketplace.js  ❌ DealLinked - leave alone
```

---

## 🎯 DEVELOPMENT WORKFLOW

### Step 1: Create Feature Branch
```bash
git checkout -b feature/map-crm
```

### Step 2: Database First
```bash
# Create migration files
touch /app/supabase_migrations/031_create_map_properties.sql
touch /app/supabase_migrations/032_create_map_assignments.sql
touch /app/supabase_migrations/033_create_map_imports.sql
touch /app/supabase_migrations/034_map_rls_policies.sql

# Apply migrations (use Supabase MCP tools or SQL editor)
```

### Step 3: Backend API
```bash
mkdir -p /app/backend/routes/map_crm
touch /app/backend/routes/map_crm/__init__.py
touch /app/backend/routes/map_crm/property_routes.py
touch /app/backend/routes/map_crm/geocoding_service.py

# Create Pydantic models
touch /app/backend/models/map_crm_models.py
```

### Step 4: Frontend UI
```bash
mkdir -p /app/frontend/src/pages/MapCRM
touch /app/frontend/src/pages/MapCRM/index.js
touch /app/frontend/src/pages/MapCRM/MapView.js
touch /app/frontend/src/pages/MapCRM/TableView.js
touch /app/frontend/src/pages/MapCRM/PropertyDetails.js
```

### Step 5: Test & Deploy
```bash
# Backend tests
python /app/comprehensive_backend_test.py

# Frontend tests (use testing agent)
# Deploy when ready
```

---

## 🔑 KEY INTEGRATION POINTS

### Shared Resources (Reuse):
```python
# Backend
from utils.db import get_supabase          # ✅ Reuse
from utils.auth_helpers import get_current_user  # ✅ Reuse
from radar_service import radar_service    # ✅ Reuse (geocoding)

# Frontend
import { Button } from '@/components/ui/button'  # ✅ Reuse
import { useAuth } from '@/contexts/AuthContext'  # ✅ Reuse
```

### New Tables (Map CRM Only):
```sql
map_properties          -- Core property data
map_property_assignments  -- Who's working on what
map_csv_imports         -- Import history
```

### Conversion Flow (Critical):
```javascript
// One-click property → deal
POST /api/map-crm/properties/{id}/convert-to-deal

// Creates deal in DealLinked with all data
// Links property.deal_id → deal.id
// Transfers contacts and documents
// Marks property as "converted"
```

---

## 📊 PERFORMANCE TARGETS

### Map View:
- ✅ Load < 2 seconds (100k properties)
- ✅ Use server-side clustering (PostGIS)
- ✅ Max 1000 markers per viewport

### Table View:
- ✅ Filter response < 500ms
- ✅ Pagination (50 rows at a time)
- ✅ Infinite scroll or page controls

### Real-Time:
- ✅ Update latency < 100ms
- ✅ Supabase Realtime subscriptions
- ✅ Copy pattern from DealLinked messaging

---

## 🆘 QUICK TROUBLESHOOTING

### Services not running?
```bash
sudo supervisorctl restart all
```

### MongoDB not working?
```bash
sudo supervisorctl status mongodb
mongosh --eval "db.adminCommand('ping')"
# Should return: { ok: 1 }
```

### Supabase connection error?
```bash
cd /app/backend
python3 << 'EOF'
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path('.env'))
from utils.db import get_supabase
print(get_supabase().table('user_profiles').select('id').limit(1).execute())
EOF
```

### Frontend not compiling?
```bash
cd /app/frontend
yarn install
sudo supervisorctl restart frontend
```

---

## 📞 NEED HELP?

### Documentation:
- **Map CRM PRD:** `/app/MAP_CRM_PROJECT_REQUIREMENTS.md`
- **Deployment Guide:** `/app/DEPLOYMENT_PREPARATION.md`
- **DealLinked Overview:** `/app/HANDOFF_TO_NEW_SESSION.md`
- **Test Results:** `/app/test_result.md`

### Support:
- Email: support@emergent.sh
- Discord: https://discord.gg/emergent
- Job ID: (check `.emergent/emergent.yml`)

---

## ✅ SUCCESS CHECKLIST

### Before You Start:
- [ ] Read `MAP_CRM_PROJECT_REQUIREMENTS.md` (15 min)
- [ ] Verify services running (`sudo supervisorctl status`)
- [ ] Deploy DealLinked baseline (test production)
- [ ] Create feature branch (`git checkout -b feature/map-crm`)

### Development Milestones:
- [ ] Database migrations applied
- [ ] CSV import working (test with 100 rows)
- [ ] Geocoding working (Radar.io)
- [ ] Map renders properties
- [ ] Table displays properties
- [ ] Map ↔ table sync working
- [ ] Property details editable
- [ ] Team claiming works
- [ ] Property → deal conversion works
- [ ] Real-time updates work

### Deployment Ready:
- [ ] All tests passing (backend + frontend)
- [ ] Performance tested (100k properties)
- [ ] Team acceptance testing complete
- [ ] No DealLinked regressions
- [ ] Deploy to production

---

**🎯 Your First Command:**

```bash
cat /app/MAP_CRM_PROJECT_REQUIREMENTS.md | less
```

**Then:** Deploy DealLinked → Start building Map CRM Phase 1

**Good luck!** 🚀
