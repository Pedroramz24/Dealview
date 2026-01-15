# Emergent Support Ticket - MongoDB Base Image Blocking Supabase-Only Application Deployment

**Date:** January 2, 2025  
**Priority:** High - Blocking Production Deployment  
**Job ID:** `37553466-4e66-4b2b-8654-ab9f6c301151`  
**Environment URL:** https://mapwise-crm.preview.emergentagent.com

---

## Issue Summary

Our production-ready FastAPI + React + Supabase application cannot deploy because the base image (`fastapi_react_mongo_shadcn_base_image_cloud_arm:release-09102025-1`) triggers mandatory MongoDB migration steps. The application uses **Supabase (PostgreSQL) exclusively** and has no MongoDB dependencies, causing the deployment to fail at the MONGODB_MIGRATE step.

---

## Technical Details

### Current Configuration
- **Base Image:** `fastapi_react_mongo_shadcn_base_image_cloud_arm:release-09102025-1`
- **Actual Tech Stack:** FastAPI (Python 3.11) + React 18 + Supabase (PostgreSQL)
- **Database:** 100% Supabase - No MongoDB usage
- **Environment File:** `/app/.emergent/emergent.yml`

```json
{
  "env_image_name": "fastapi_react_mongo_shadcn_base_image_cloud_arm:release-09102025-1",
  "skip_mongodb_migration": true,
  "use_supabase": true,
  "job_id": "37553466-4e66-4b2b-8654-ab9f6c301151",
  "created_at": "2026-01-02T17:48:42.786972+00:00Z"
}
```

### Application Status
✅ **Feature-complete and fully tested:**
- All 12 critical API endpoints tested and passing (100% success rate)
- Supabase authentication working (JWT tokens)
- All CRUD operations functional
- Dashboard, pipelines, messaging, teams - all working
- Frontend compiled successfully
- Backend running without errors

### Database Configuration
- **Database Type:** Supabase (PostgreSQL)
- **Connection:** Verified and working
- **Tables:** 10+ tables with RLS policies
- **Auth:** Supabase Auth (no custom auth)
- **Storage:** Supabase Storage for files

---

## What We've Tried

### 1. Skip MongoDB Migration Flag ❌
**Attempted:** Set `skip_mongodb_migration: true` in `emergent.yml`  
**Result:** Flag does NOT prevent MongoDB migration step from running  
**Error:** Deployment still fails at MONGODB_MIGRATE with authentication errors

### 2. MongoDB Placeholder Variables ❌
**Attempted:** Added placeholder MongoDB env vars:
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="deallinked_placeholder"
```
**Result:** Migration step still enforced and fails (no valid MongoDB credentials)

### 3. Created Flag File ❌
**Attempted:** Created `/app/.emergen_no_mongodb` file indicating Supabase-only usage  
**Result:** File ignored by deployment pipeline

### 4. Removed All MongoDB Code ✅
**Attempted:** Removed all MongoDB imports, utilities, and runtime code  
**Result:** Application runs perfectly with Supabase, but deployment still blocked

---

## Deployment Error Log

```
[MONGODB_MIGRATE] Attempting MongoDB connection...
[MONGODB_MIGRATE] MongoDB connection failed: Authentication failed
[MONGODB_MIGRATE] failed to execute command: exit code 1
[DEPLOYMENT] Build failed at MONGODB_MIGRATE step
```

**Root Cause:** Base image name contains "mongo" → deployment pipeline enforces MongoDB migration as mandatory step → migration fails because we're using Supabase

---

## What We Need

### Option 1: Base Image Without MongoDB (Preferred)
**Request:** Access to a FastAPI + React + Supabase base image without MongoDB

**Expected Image Names:**
- `fastapi_react_supabase_base_image_cloud_arm`
- `fastapi_react_shadcn_base_image_cloud_arm` (no mongo reference)
- Or any suitable alternative for Supabase-only applications

**Question:** What base images are available for Supabase-only full-stack apps?

### Option 2: Fix skip_mongodb_migration Flag
**Request:** Make the `skip_mongodb_migration: true` flag actually bypass MongoDB migration

**Expected Behavior:** When flag is set to `true`, deployment should skip MONGODB_MIGRATE step entirely

### Option 3: Fresh Environment Template
**Issue:** When trying to start a fresh environment, there is no template option for:
- "Full Stack with Supabase" (only see MongoDB options)
- "FastAPI + React + Supabase"

**Request:** Either:
- Add Supabase template option to environment creation
- Provide instructions on which existing template to use for Supabase apps
- Clarify how to properly configure Supabase-only deployments

---

## Additional Context

### Why This Matters
- Application is production-ready (9,000+ credits invested in development)
- All features working and tested
- Blocked purely by deployment configuration mismatch
- No actual MongoDB usage - deployment step is unnecessary

### Investment & Urgency
- **Development Credits Used:** ~9,000 credits
- **Testing Status:** Complete (12/12 endpoints passing)
- **Deployment Readiness:** 100% code-ready
- **Blocker:** Base image configuration only

### Code Quality
- No hardcoded URLs (all use environment variables)
- Proper .env files committed and tracked
- All dependencies installed and tested
- Supabase connection verified
- Security audit completed

---

## Questions for Support Team

1. **What base images are available for FastAPI + React + Supabase applications?**
2. **Can the base image be changed in existing environment, or do we need new environment?**
3. **Why doesn't `skip_mongodb_migration: true` flag work?**
4. **Is there a Supabase-only template when creating new environments?**
5. **What's the recommended deployment path for Supabase-exclusive full-stack apps?**
6. **Can you provide the correct `env_image_name` for Supabase-only deployments?**

---

## Repository Information

**GitHub URL:** [To be provided after saving to GitHub]  
**Application Type:** Commercial Real Estate CRM (DealLinked)  
**Technology Stack:**
- Backend: FastAPI 0.110.1, Python 3.11
- Frontend: React 18, shadcn/ui, Tailwind CSS
- Database: Supabase (PostgreSQL 15+)
- Auth: Supabase Auth (JWT)
- Storage: Supabase Storage
- Deployment: Emergent platform

---

## Contact Information

**Environment ID:** 87e0115f-263a-48ee-9a5b-64497923b3dd  
**Job ID:** 37553466-4e66-4b2b-8654-ab9f6c301151  
**Project Name:** DealLinked CRM  
**Urgency:** High - Ready for production deployment

---

## Expected Resolution

**Ideal Outcome:**
1. Access to correct base image for Supabase-only apps
2. Successful deployment without MongoDB migration step
3. Clear documentation on Supabase deployment configuration for future projects

**Timeline:** As soon as possible - application is blocking production launch

---

## Attachments (if needed)

- Screenshot of deployment error (can provide)
- Full deployment logs (can provide)
- `emergent.yml` configuration file (included above)
- `.env` files (sanitized versions available)

---

**Thank you for your assistance!**

This issue is blocking our production deployment despite having a fully functional, tested application. Any guidance on the correct base image or configuration for Supabase-only applications would be greatly appreciated.
