# DealLinked CRM + Map CRM Extension

**Commercial Real Estate CRM Platform with Property Visualization**

---

## 📚 IMPORTANT: READ THESE FILES FIRST

### If This Is A **NEW FORKED SESSION**:
👉 **START HERE:** `/app/FORKED_SESSION_START_HERE.md`

### If You're **Deploying**:
👉 **READ THIS:** `/app/DEPLOYMENT_PREPARATION.md`

### If You're **Building Map CRM**:
👉 **READ THIS:** `/app/MAP_CRM_PROJECT_REQUIREMENTS.md`

### If You're **Learning About DealLinked**:
👉 **READ THIS:** `/app/HANDOFF_TO_NEW_SESSION.md`

---

## 🎯 Quick Overview

### DealLinked CRM (✅ Production Ready)
- Full-featured commercial real estate CRM
- Workspace (private deal pipeline management)
- Marketplace (public property listings)
- Dashboard (analytics & insights)
- Messaging, teams, contacts, documents
- **Status:** 12/12 tests passing, ready to deploy

### Map CRM Extension (🚧 To Be Built)
- Lightweight property visualization tool
- CSV import → auto-geocode → map display
- Synchronized map + table views
- Team collaboration & property assignments
- One-click convert property → DealLinked deal
- **Status:** PRD complete, ready for development

---

## 🗂️ Project Structure

```
/app/
├── backend/              # FastAPI backend
│   ├── routes/
│   │   ├── deal_routes.py          ✅ DealLinked
│   │   ├── marketplace_routes.py   ✅ DealLinked
│   │   └── map_crm/                🚧 To be built
│   ├── models/
│   └── utils/
├── frontend/             # React frontend
│   └── src/
│       ├── pages/
│       │   ├── Workspace.js        ✅ DealLinked
│       │   ├── Marketplace.js      ✅ DealLinked
│       │   └── MapCRM/             🚧 To be built
│       └── components/
├── supabase_migrations/  # Database schema (001-030 applied)
│
├── FORKED_SESSION_START_HERE.md      ⭐ New session guide
├── MAP_CRM_PROJECT_REQUIREMENTS.md   📋 Map CRM PRD
├── DEPLOYMENT_PREPARATION.md         🚀 Deploy guide
├── HANDOFF_TO_NEW_SESSION.md         📖 DealLinked docs
└── test_result.md                    ✅ Test results
```

---

## 🔧 Tech Stack

**Frontend:** React 18, shadcn/ui, Tailwind CSS, Leaflet  
**Backend:** FastAPI, Python 3.11, Uvicorn  
**Database:** Supabase (PostgreSQL 15+)  
**Auth:** Supabase Auth (JWT)  
**Storage:** Supabase Storage  
**Geocoding:** Radar.io (100k free requests/month)  
**Deployment:** Emergent Platform  

---

## 🚀 Quick Start

### For Development:
```bash
# Check services
sudo supervisorctl status

# View logs
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/frontend.out.log

# Restart if needed
sudo supervisorctl restart all
```

### For Testing:
```bash
# Backend API health
curl http://localhost:8001/api/deals

# Frontend
curl http://localhost:3000
```

### For Deployment:
1. Read `/app/DEPLOYMENT_PREPARATION.md`
2. Fork session (if not already forked)
3. Deploy via Emergent UI → "Start Deployment"
4. Monitor logs for success

---

## 📊 Current Status

### DealLinked CRM:
- ✅ Fully functional (12/12 endpoints passing)
- ✅ Supabase connected and working
- ✅ MongoDB running with dummy data (deployment requirement)
- ✅ All services running
- ✅ Ready to deploy

### MongoDB Note:
- MongoDB runs during deployment (required by platform)
- Has dummy data (added by support team)
- Application uses Supabase exclusively
- MongoDB is deployed but never used

### Map CRM:
- 📋 PRD completed and documented
- 📋 Architecture designed (modular isolation)
- 📋 Database schema designed
- 🚧 Ready for development
- 🚧 Estimated 4-5 weeks to completion

---

## 🔑 Key Features

### DealLinked CRM:
- Deal pipeline management (customizable stages)
- Marketplace publishing (broker → buyer discovery)
- Team collaboration (assignments, shared notes)
- Document management (contracts, brochures)
- Contact management (buyers, sellers, attorneys)
- Messaging system (broker ↔ buyer conversations)
- Dashboard analytics (pipeline value, deal distribution)
- Admin moderation (listing approval)

### Map CRM (Planned):
- CSV import (100k+ properties)
- Auto-geocoding (Radar.io)
- Interactive map (clustered markers)
- Synchronized table view (sort/filter)
- Property details (inline editing)
- Team assignments (real-time collaboration)
- Property → Deal conversion (one-click)
- Document linking (reuse DealLinked storage)

---

## 🆘 Support

**Email:** support@emergent.sh  
**Discord:** https://discord.gg/emergent  
**Docs:** See `/app/*.md` files  

---

## 📝 License

Proprietary - DealLinked CRM  
Internal use only (5-person team)

---

**Last Updated:** January 2, 2025  
**Version:** DealLinked v1.0 (Production Ready) + Map CRM v0.1 (In Development)
