# 🔒 Final Pre-Deployment Hardening Plan

**Status:** IN PROGRESS  
**Objective:** Performance + Security + Backend Verification  
**Target:** Zero warnings, fast load times, verified stability

---

## 📋 HARDENING CHECKLIST

### 1️⃣ PERFORMANCE OPTIMIZATION ⏱️

**Goal:** Workspace loads in <1 second, progressive loading for heavy components

- [ ] **Audit Initial Data Fetches**
  - Identify all useEffect() calls that fire on workspace mount
  - Defer non-critical queries (analytics, news feed, etc.)
  - Implement lazy loading for role-specific data

- [ ] **Optimize Map Loading**
  - Defer map tile loading until user switches to Map tab
  - Load parcels/layers only when enabled
  - Implement viewport-based data loading

- [ ] **Dashboard Performance**
  - Cache dashboard stats (avoid re-fetch on every render)
  - Lazy load charts/visualizations
  - Defer news RSS feed (not critical)

- [ ] **React Performance**
  - Add React.memo() to heavy components
  - Optimize re-render triggers
  - Remove unnecessary dependencies in useEffect

**Success Criteria:**
- Workspace initial load < 1s
- No blocking API calls on mount
- Map/analytics load progressively

---

### 2️⃣ SECURITY HARDENING 🔐

**Goal:** Zero Supabase warnings, proper RLS policies, no exposed credentials

#### A. Function Security (18 functions flagged)

**Issue:** Function search_path mutable - security vulnerability  
**Severity:** WARN  
**Fix:** Add `SET search_path TO 'public';` to each function

**Affected Functions:**
1. has_role
2. has_verified_role
3. can_publish_as_owner
4. update_calendar_events_updated_at
5. get_ready_scheduled_emails
6. update_campaign_stats
7. get_default_pipeline
8. get_first_stage
9. set_ncnd_expiration
10. update_updated_at_column
11. handle_new_user
12. handle_updated_at
13. create_default_pipeline_for_new_user
14. increment_deal_view_count
15. update_deal_inquiry_count
16. handle_new_team
17. update_deal_saved_count
18. calculate_response_time
19. calculate_broker_reputation

**Action:** Run SQL to update all function definitions

- [ ] Fix all 18 functions with search_path

#### B. Authentication Security

**Issue:** Leaked Password Protection Disabled  
**Severity:** WARN  
**Fix:** Enable in Supabase Dashboard → Authentication → Settings

- [ ] Enable Leaked Password Protection

#### C. Row Level Security Audit

- [ ] Review all RLS policies on tables:
  - deals
  - contacts
  - calendar_events
  - marketplace_messages
  - team_members
  - pipelines
  - pipeline_stages
- [ ] Ensure policies enforce owner_id = auth.uid()
- [ ] Test unauthorized access attempts
- [ ] Document any public access (if intentional)

#### D. API Key & Credential Security

- [ ] Verify no hardcoded API keys in frontend code
- [ ] Check SUPABASE_ANON_KEY is public-safe (read-only operations only)
- [ ] Verify SUPABASE_SERVICE_KEY only used in backend
- [ ] Ensure no sensitive data in .env committed to git

**Success Criteria:**
- Zero security warnings in Supabase dashboard
- All RLS policies enforced
- No exposed credentials

---

### 3️⃣ BACKEND VERIFICATION 🔍

**Goal:** All APIs functional, no silent failures, clean codebase

#### A. API Routes - Full Test Coverage

- [x] ✅ Deals CRUD (CREATE, READ, UPDATE, DELETE) - VERIFIED
- [x] ✅ Dashboard Stats - VERIFIED
- [x] ✅ Pipelines API - VERIFIED
- [ ] Pipeline CRUD (create, update, delete)
- [x] ✅ Messaging (send, list, delete) - VERIFIED
- [x] ✅ Teams API - VERIFIED
- [ ] Admin endpoints (approve deals, verify roles)
- [ ] Onboarding endpoints
- [ ] Marketplace publishing flow

#### B. Database Write Operations

- [x] ✅ Deal creation persists correctly
- [x] ✅ Deal updates persist correctly
- [x] ✅ Deal deletion removes data
- [ ] Contact CRUD operations
- [ ] Calendar event CRUD operations
- [ ] Message CRUD operations
- [ ] Team member management

#### C. Role-Based Access Control

- [ ] Broker-only endpoints reject buyers/sellers
- [ ] Admin endpoints reject non-admin users
- [ ] User can only modify their own data
- [ ] Team members can access shared deals

#### D. Error Handling & Logging

- [ ] All endpoints return proper error codes
- [ ] Error messages don't expose stack traces
- [ ] Backend logs show proper request/response info
- [ ] No uncaught exceptions

#### E. Code Cleanup

- [ ] Remove unused imports
- [ ] Delete commented-out code
- [ ] Remove MongoDB references (if any remain)
- [ ] Clean up placeholder scripts
- [ ] Remove unused files (UnicornAnimation.js, LandingPage.backup.js, etc.)

**Success Criteria:**
- All API routes functional
- Proper error handling
- Clean codebase
- No dead code

---

### 4️⃣ FINAL VERIFICATION ✅

**Pre-Deployment Smoke Tests:**

- [ ] User can sign up
- [ ] User can log in
- [ ] User can create a deal
- [ ] User can move deal through pipeline
- [ ] User can delete a deal
- [ ] User can send a message
- [ ] User can navigate all pages without errors
- [ ] User can log out

**Performance Targets:**
- [ ] Initial page load < 2s
- [ ] Workspace load < 1s
- [ ] API responses < 500ms average
- [ ] No memory leaks (check after 10 min usage)

**Security Verification:**
- [ ] Cannot access other user's data
- [ ] Protected routes require authentication
- [ ] Admin routes require admin role
- [ ] No console warnings about security

---

## 📝 EXECUTION PLAN

### Step 1: Security Fixes (30 min)
1. Fix function search_path warnings
2. Enable leaked password protection
3. Audit RLS policies

### Step 2: Performance Optimization (60 min)
1. Audit and defer data fetches
2. Implement lazy loading
3. Optimize re-renders
4. Cache strategies

### Step 3: Backend Verification (30 min)
1. Test all remaining endpoints
2. Verify data operations
3. Clean up code

### Step 4: Final Smoke Test (15 min)
1. End-to-end user flows
2. Performance measurement
3. Security verification

**Total Time:** ~2.5 hours

---

## 🎯 SUCCESS CRITERIA

**Application is deployment-ready when:**
- ✅ Zero Supabase security warnings
- ✅ Workspace loads in <1 second
- ✅ All critical user flows work end-to-end
- ✅ No console errors during normal usage
- ✅ Backend passes 100% on critical path tests
- ✅ Clean codebase (no dead code)

---

**Status:** Ready to execute hardening plan
