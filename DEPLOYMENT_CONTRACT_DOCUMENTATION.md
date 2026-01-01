# DEPLOYMENT CONTRACT DOCUMENTATION
# This file documents the MongoDB deployment contract and runtime architecture

## Deployment Contract vs Runtime Architecture

### AT DEPLOYMENT TIME
The Emergent platform was provisioned with a **MongoDB base image** and expects:
1. `MONGO_URL` variable to exist in `/app/backend/.env`
2. `DB_NAME` variable to exist in `/app/backend/.env`
3. MongoDB migration pipeline to complete successfully

**Deployment Process**:
1. Emergent reads `MONGO_URL` from .env (placeholder value)
2. Emergent **overwrites** it with Atlas MongoDB credentials
3. Migration pipeline connects to Atlas MongoDB
4. Migration completes (copying any local MongoDB data to Atlas)
5. Services start with injected MongoDB credentials available

### AT RUNTIME (Application Behavior)
The application **NEVER uses MongoDB**. All database operations use Supabase:

**Single Source of Truth**: Supabase (PostgreSQL)
- All reads: Supabase
- All writes: Supabase  
- All auth: Supabase
- Zero MongoDB operations

**Why MongoDB Variables Exist**:
- **Purpose**: Satisfy deployment pipeline contract ONLY
- **Usage**: Never read by application code
- **Injection**: Emergent overwrites with Atlas credentials during deployment
- **Runtime**: Variables exist but are completely unused

### Code Verification

**Backend Python Files Audited**:
```bash
# Search for ANY MongoDB usage
$ grep -rn "motor\|pymongo\|MongoClient\|MONGO_URL\|DB_NAME" /app/backend --include="*.py"
Result: ZERO matches ✅

# Verify only Supabase imports
$ grep -rn "from utils.db import get_supabase" /app/backend/routes/
Result: 8 route files confirmed ✅

# Verify database initialization
$ grep -n "supabase = get_supabase()" /app/backend/server.py
Line 60: supabase = get_supabase() ✅
```

**No MongoDB Code Paths**:
- ✅ No MongoDB imports
- ✅ No MongoDB client initialization
- ✅ No MongoDB operations (find, insert, update, delete)
- ✅ No MONGO_URL or DB_NAME environment variable reads
- ✅ No motor or pymongo dependencies in requirements.txt

**Only Supabase Operations**:
- ✅ All routes use `supabase = get_supabase()`
- ✅ All database operations: `supabase.table('...')...`
- ✅ Authentication via Supabase Auth
- ✅ File storage via Supabase Storage

---

## Environment Variable Contract

### MongoDB Variables (Deployment Contract Only)
```bash
MONGO_URL="mongodb://localhost:27017"  # Placeholder - Emergent overwrites with Atlas
DB_NAME="deallinked_placeholder"        # Placeholder - Emergent overwrites with Atlas
```

**Purpose**: Allow Emergent deployment pipeline to inject Atlas credentials  
**Usage**: NEVER read by application code  
**Security**: Safe - unused variables don't create security risk

### Supabase Variables (Actual Runtime Database)
```bash
SUPABASE_URL="https://ygezobmpewthqvsfqrbk.supabase.co"
SUPABASE_ANON_KEY="..."                 # Used by frontend
SUPABASE_SERVICE_KEY="..."              # Used by backend
```

**Purpose**: Application's actual database connection  
**Usage**: ALL database operations  
**Security**: Properly secured with RLS policies (Supabase-managed)

---

## Deployment Flow Diagram

```
┌─────────────────────────────────────────┐
│ 1. BUILD PHASE                          │
├─────────────────────────────────────────┤
│ • Frontend builds (React)               │
│ • Backend builds (FastAPI + deps)       │
│ • Reads .env files                      │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 2. MONGODB MIGRATION PHASE              │
├─────────────────────────────────────────┤
│ • Detects MONGO_URL in .env ✅          │
│ • Injects Atlas credentials             │
│ • Connects to Atlas MongoDB ✅          │
│ • Runs migration (empty → empty) ✅     │
│ • Completes successfully ✅             │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 3. SERVICE START PHASE                  │
├─────────────────────────────────────────┤
│ • Starts backend (FastAPI)              │
│ • Starts frontend (React)               │
│ • MONGO_URL exists but NEVER used       │
│ • App uses SUPABASE_URL for all DB ops  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│ 4. RUNTIME (Production)                 │
├─────────────────────────────────────────┤
│ • All reads → Supabase ✅               │
│ • All writes → Supabase ✅              │
│ • MongoDB credentials exist but unused  │
│ • Single source of truth: Supabase ✅   │
└─────────────────────────────────────────┘
```

---

## Why This Architecture is Safe

### Separation of Concerns
1. **Deployment Contract**: Satisfied by having MONGO_URL and DB_NAME in .env
2. **Runtime Behavior**: Controlled entirely by application code (uses Supabase only)

### No MongoDB Risk
- **Cannot connect accidentally**: No MongoDB client code exists
- **Cannot read wrong database**: No code path reads MONGO_URL
- **Cannot write to MongoDB**: No MongoDB operations in codebase
- **Zero dependencies**: No pymongo or motor installed

### Verification Methods
```python
# Application startup audit
# File: /app/backend/server.py

# ✅ ONLY Supabase import
from utils.db import get_supabase

# ✅ ONLY Supabase initialization
supabase = get_supabase()

# ❌ NO MongoDB imports (verified)
# ❌ NO MongoDB client initialization (verified)
# ❌ NO MongoDB operations (verified)
```

---

## Security Implications

### MongoDB Credentials in Environment
**Risk Level**: NONE

**Why Safe**:
1. Credentials are **unused** - no code reads them
2. **Empty in local dev** - only injected in production
3. **Managed by Emergent** - Atlas credentials auto-rotated
4. **Isolated** - Even if MongoDB exists, app can't access it without client code

### Supabase Security
**Risk Level**: Properly managed

**Security Measures**:
1. RLS (Row Level Security) policies enforced by Supabase
2. Service role key used only in backend (not exposed to client)
3. Anon key properly scoped for client operations
4. All queries authenticated and scoped to user_id

---

## Maintenance Notes

### If You Need to Update This App

**Adding Features**: Always use Supabase
```python
from utils.db import get_supabase
supabase = get_supabase()
result = supabase.table('your_table').select('*').execute()
```

**Never Add MongoDB**:
- ❌ Don't import pymongo or motor
- ❌ Don't read MONGO_URL or DB_NAME
- ❌ Don't add MongoDB operations
- ✅ Continue using Supabase for everything

### If Deployment Fails

**Check**:
1. Are MONGO_URL and DB_NAME in .env? (Required for deployment)
2. Are they non-empty strings? (Emergent needs something to overwrite)
3. Is .gitignore allowing .env files to be tracked?
4. Do .env files exist in git repository?

**Don't Remove**:
- Keep MONGO_URL and DB_NAME placeholders (deployment contract)
- Keep them as non-empty strings (allows injection)

---

## Summary

This application maintains a **clean separation** between:
- **Deployment contract** (requires MongoDB variables for platform compatibility)
- **Runtime behavior** (uses only Supabase for all database operations)

MongoDB variables exist solely to satisfy the Emergent deployment pipeline. The application code has been thoroughly audited and contains zero MongoDB usage, ensuring Supabase remains the single source of truth.

---

**Last Updated**: January 1, 2026  
**Verified**: Zero MongoDB runtime usage ✅  
**Database**: Supabase (PostgreSQL) only ✅
