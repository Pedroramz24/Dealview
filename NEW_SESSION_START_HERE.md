# 🚀 START HERE - New Emergent Session Instructions

## Welcome, New Agent!

This document will guide you through the **DealLinked CRM Refactor V2** project.

---

## 📚 **STEP 1: Read These Documents (In Order)**

1. **`/app/REFACTOR_V2_PLAN.md`** ← Main strategy document (READ FIRST)
2. **`/app/SUPABASE_MIGRATION.md`** ← Database migration guide
3. **`/app/FEATURES_TO_REMOVE.md`** ← Detailed removal checklist

**Estimated Reading Time:** 20 minutes

---

## 🎯 **STEP 2: Understand the Mission**

**Goal:** Strip the bloated CRM down to essentials, rebuild database from scratch.

**What to REMOVE:**
- ✂️ All email campaign functionality
- ✂️ Zoning layers from map
- ✂️ Parcel layers from map
- ✂️ FEMA flood zones
- ✂️ Water & sewer layers
- ✂️ AI operations dashboard (complete removal)

**What to KEEP:**
- ✅ Core CRM (deals, contacts, pipelines)
- ✅ Basic map with style controls
- ✅ Team deals feature
- ✅ Measurement tools
- ✅ DealVisor (property management)
- ✅ UI framework and design system

---

## 🔧 **STEP 3: Environment Setup**

### GitHub
You should already be on the `refactor-v2` branch.

```bash
# Verify branch
git branch

# Should show: * refactor-v2
```

### Supabase Branch Setup

**IMPORTANT:** User has Supabase Pro plan - USE BRANCHING!

1. User needs to create Supabase branch named `refactor-v2`
2. Get new branch credentials
3. Update `/app/backend/.env`:

```env
SUPABASE_URL=https://[branch-ref].supabase.co
SUPABASE_ANON_KEY=[branch-anon-key]
SUPABASE_SERVICE_KEY=[branch-service-key]
```

**Ask user:** "Have you created the Supabase branch `refactor-v2` and can you provide the new credentials?"

---

## 📋 **STEP 4: Execution Plan**

### Phase 1: Code Cleanup (3-4 hours)

**DO THIS SYSTEMATICALLY - ONE FEATURE AT A TIME!**

1. **Email Campaigns** (~45 min)
   - Delete backend routes
   - Delete frontend pages/components
   - Remove from navigation
   - Test: App still loads

2. **Parcel Layers** (~60 min)
   - Clean MapView.js
   - Clean LayerManager.js
   - Delete ParcelPopup.js
   - Delete reportall config
   - Test: Map still works

3. **Zoning Layers** (~30 min)
   - Clean MapView.js
   - Clean LayerManager.js
   - Clean intelligence.py backend
   - Test: Map still works

4. **Flood Zones** (~20 min)
   - Clean MapView.js
   - Clean LayerManager.js
   - Test: Map still works

5. **Water/Sewer** (~20 min)
   - Clean MapView.js
   - Clean LayerManager.js
   - Clean intelligence.py backend
   - Test: Map still works

6. **AI Operations** (~45 min)
   - Delete backend routes
   - Delete frontend pages
   - Remove from navigation
   - Test: Dashboard loads

### Phase 2: Database Cleanup - Selective Approach (30 min - 1 hour)

**IMPORTANT:** Keep core tables! Only delete feature-specific tables.

1. **Delete Feature-Specific Tables** (in Supabase branch)
   ```sql
   -- Email System
   DROP TABLE IF EXISTS email_campaigns CASCADE;
   DROP TABLE IF EXISTS email_templates CASCADE;
   DROP TABLE IF EXISTS email_schedules CASCADE;
   DROP TABLE IF EXISTS email_tracking CASCADE;
   
   -- AI Operations
   DROP TABLE IF EXISTS ai_operations CASCADE;
   DROP TABLE IF EXISTS ai_insights CASCADE;
   DROP TABLE IF EXISTS ai_reports CASCADE;
   
   -- Problematic Tables
   DROP TABLE IF EXISTS map_property_activity_log CASCADE;
   ```

2. **Verify Core Tables Still Exist**
   - user_profiles ✅
   - deals ✅
   - contacts ✅
   - pipelines ✅
   - calendar_events ✅
   - map_properties ✅

3. **Create Migrations ONLY if Needed**
   - Check if core tables exist first
   - Only create migrations for missing tables
   - Don't recreate existing tables

4. **Test Database**
   - Connect from backend
   - Test basic CRUD
   - Verify core tables have data
   - Check RLS works

### Phase 3: Testing (1 hour)

Use the checklist in `/app/FEATURES_TO_REMOVE.md`:
- [ ] App loads without errors
- [ ] Login works
- [ ] Dashboard loads
- [ ] Map loads
- [ ] Team deals work
- [ ] Measurement tools work
- [ ] DealVisor works
- [ ] No console errors

### Phase 4: Documentation

Document any:
- Issues encountered
- Decisions made
- Changes from plan
- Remaining work

---

## ⚠️ **CRITICAL REMINDERS**

### DO:
- ✅ Work systematically (one feature at a time)
- ✅ Test after each major deletion
- ✅ Check browser console for errors
- ✅ Read error messages carefully
- ✅ Use parallel tool calls where appropriate
- ✅ Ask user for clarification if needed

### DON'T:
- ❌ Delete everything at once
- ❌ Skip testing between changes
- ❌ Ignore console errors
- ❌ Assume imports are fine without checking
- ❌ Rush through it

---

## 🆘 **If You Get Stuck**

### Common Issues & Solutions

**Issue:** "Cannot find module" errors
- **Solution:** Check for broken imports, remove unused imports

**Issue:** Map not loading
- **Solution:** Check MapView.js for undefined state/functions

**Issue:** Database connection errors
- **Solution:** Verify Supabase branch credentials are correct

**Issue:** Navigation broken
- **Solution:** Check App.js routes, remove deleted route references

### When to Ask User

- If Supabase credentials are missing
- If you find unexpected code structure
- If major architectural decision needed
- If you're unsure about keeping/removing something

---

## 📊 **Progress Tracking**

Update this checklist as you go:

### Code Cleanup
- [ ] Email campaigns removed
- [ ] Parcel layers removed
- [ ] Zoning layers removed
- [ ] Flood zones removed
- [ ] Water/sewer removed
- [ ] AI operations removed

### Database
- [ ] Supabase branch created
- [ ] Old tables dropped
- [ ] New migrations written
- [ ] New tables created
- [ ] RLS enabled
- [ ] Indexes created

### Testing
- [ ] Frontend loads
- [ ] Backend loads
- [ ] Authentication works
- [ ] Map works
- [ ] Team deals work
- [ ] Measurement tools work
- [ ] DealVisor works
- [ ] No console errors

### Finalization
- [ ] Documentation updated
- [ ] All tests passing
- [ ] Ready for user review

---

## 🎓 **Key Technical Context**

### Stack
- **Frontend:** React, MapLibre GL, React Router
- **Backend:** FastAPI, Python
- **Database:** Supabase (PostgreSQL)
- **Map:** MapLibre GL JS

### Important Files
- `/app/frontend/src/pages/MapView.js` - Main map component (WILL NEED HEAVY CLEANUP)
- `/app/frontend/src/components/LayerManager.js` - Map layer controls (SIMPLIFY)
- `/app/backend/server.py` - Main backend router
- `/app/backend/routes/intelligence.py` - Map layer endpoints (CLEAN)

### Design System
Located in `/app/frontend/src/styles/designSystem.js` - DO NOT MODIFY

---

## 📝 **Final Checklist Before Finishing**

- [ ] All removed features are completely gone (no dead code)
- [ ] All kept features work correctly
- [ ] Database is clean and minimal
- [ ] No console errors
- [ ] Navigation is clean (no broken links)
- [ ] Linting passes (frontend & backend)
- [ ] User can log in and use the app
- [ ] Documentation is updated

---

## 🎉 **Success Criteria**

You'll know you're done when:
1. App loads in < 2 seconds
2. No console errors
3. All essential features work
4. Database has only needed tables
5. Codebase is clean and maintainable
6. User can log in and use core CRM features

---

## 📞 **Communication with User**

**Be proactive:**
- Update user on progress every hour
- Ask for clarification early
- Share any blockers immediately
- Celebrate wins (each feature removed successfully)

**At the end:**
- Provide summary of work done
- List any remaining items
- Ask user to test critical flows
- Get feedback before marking complete

---

**Good luck! You've got comprehensive documentation to guide you. Take your time, work systematically, and test frequently.**

**Last Updated:** 2025-01-16  
**Project:** DealLinked CRM Refactor V2  
**Approach:** Supabase Branching + Systematic Feature Removal
