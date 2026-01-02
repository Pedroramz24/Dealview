# 🚀 Deployment Readiness Checklist

## Current Status: ⚠️ PRE-DEPLOYMENT FIXES REQUIRED

---

## Critical Issue Identified

### 🔴 Schema Mismatch: `price` vs `asking_price`

**Problem:**
The Supabase database schema uses the column name `price`, but the backend code expects `asking_price`. This causes `PGRST204` errors when creating or retrieving deals.

**Impact:**
- ❌ Cannot create deals (POST /api/deals)
- ❌ Cannot retrieve deals (GET /api/deals)
- ❌ Dashboard stats fail to calculate
- ❌ All deal CRUD operations broken

**Root Cause:**
The original schema (`001_create_schema.sql`) defined the column as `price`, but the backend models and routes were updated to use `asking_price` for better clarity.

---

## ✅ Fixes Applied (In Code)

### 1. Code Updates
- ✅ Updated `/app/backend/routes/deal_routes.py` to insert `asking_price` field
- ✅ Updated `/app/backend/routes/dashboard_routes.py` to query `asking_price` instead of `price`
- ✅ Backend models (`deal_simplified.py`) already use `asking_price`

### 2. Migration Created
- ✅ Created migration file: `/app/supabase_migrations/029_rename_price_to_asking_price.sql`

---

## 🔧 Required Action: Apply Database Migration

### **CRITICAL:** You must run this migration in Supabase before deploying!

#### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard/project/ygezobmpewthqvsfqrbk/sql/new

#### Step 2: Run the Migration
1. Copy the content from `/app/supabase_migrations/029_rename_price_to_asking_price.sql`:

```sql
-- =====================================================
-- DealView CRM - Schema Alignment Fix
-- Rename 'price' column to 'asking_price' to match backend models
-- =====================================================

-- Rename the price column to asking_price
ALTER TABLE public.deals 
RENAME COLUMN price TO asking_price;

-- Add comment for clarity
COMMENT ON COLUMN public.deals.asking_price IS 'The listing or asking price for the property/deal';
```

2. Paste into the SQL Editor
3. Click **RUN**
4. Wait for "Success" message

#### Step 3: Verify Migration
After running the migration, verify it worked by running:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deals' AND column_name = 'asking_price';
```

You should see one row returned with `asking_price` column.

---

## 🎯 Deployment Steps (After Migration)

### 1. Clean Environment Variables
The placeholder MongoDB variables can be removed from `/app/backend/.env`:

```bash
# These lines can be deleted:
MONGO_URL="mongodb://localhost:27017"
DB_NAME="deallinked_placeholder"
```

**Note:** The `emergent.yml` file has `"skip_mongodb_migration": true`, so these placeholders are no longer needed.

### 2. Deploy via Emergent Platform
1. Click the **Deploy** button in the Emergent platform
2. Monitor the build logs
3. The deployment should succeed without MongoDB migration errors

### 3. Post-Deployment Verification
After deployment, test these critical endpoints:

```bash
# 1. Authentication
curl -X POST https://YOUR_DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contact@pedroarmando.com","password":"Flin141812$"}'

# Save the token from response, then:

# 2. Create a deal
curl -X POST https://YOUR_DOMAIN/api/deals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "address": "123 Test St",
    "asset_type": "Office",
    "asking_price": 500000,
    "latitude": 29.4241,
    "longitude": -98.4936
  }'

# 3. Get deals
curl -X GET https://YOUR_DOMAIN/api/deals \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Dashboard stats
curl -X GET https://YOUR_DOMAIN/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Expected Test Results

### All Endpoints Should:
- ✅ Return 200 OK status
- ✅ No `PGRST204` errors
- ✅ No schema mismatch errors
- ✅ Proper JSON responses

### Deal Creation Should:
- ✅ Return deal object with `id`
- ✅ Store `asking_price` correctly
- ✅ Be retrievable via GET /api/deals

### Dashboard Stats Should:
- ✅ Calculate `total_pipeline_value` from `asking_price` column
- ✅ Return valid statistics

---

## 🔍 Troubleshooting

### If deployment still fails with MongoDB error:

1. **Check `emergent.yml` flags:**
   ```json
   {
     "skip_mongodb_migration": true,
     "use_supabase": true
   }
   ```
   These should be present.

2. **Verify no MongoDB runtime code:**
   ```bash
   grep -r "MongoClient\|AsyncIOMotorClient\|mongodb://" backend/
   ```
   Should return no results in actual runtime code.

3. **Check supervisor status:**
   ```bash
   sudo supervisorctl status
   ```
   MongoDB service should be stopped or not present.

### If deal creation still fails:

1. **Verify migration was applied:**
   Check Supabase dashboard → Database → Tables → deals → Columns
   Should show `asking_price` column, not `price`.

2. **Check backend logs:**
   ```bash
   tail -f /var/log/supervisor/backend*.log
   ```

3. **Test database connection:**
   ```bash
   python3 -c "from utils.db import get_supabase; s = get_supabase(); print(s.table('deals').select('asking_price').limit(1).execute())"
   ```

---

## ✅ Deployment Ready Checklist

Before clicking "Deploy", confirm:

- [ ] Database migration 029 has been run in Supabase
- [ ] `asking_price` column exists in deals table
- [ ] No `price` column references in code
- [ ] `emergent.yml` has `skip_mongodb_migration: true`
- [ ] Backend .env has valid Supabase credentials
- [ ] Frontend .env has valid `REACT_APP_BACKEND_URL`

Once all items are checked, **you are ready to deploy! 🚀**

---

## 📝 Notes

- The fork from the previous environment included the correct flags in `emergent.yml` to skip MongoDB migration
- All application code is 100% Supabase-native
- The only remaining task is the database schema alignment (renaming `price` to `asking_price`)
- After this migration, the application will be production-ready

---

**Last Updated:** January 2, 2025
**Status:** Waiting for database migration to be applied
