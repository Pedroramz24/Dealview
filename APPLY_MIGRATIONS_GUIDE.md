# 🚀 Apply DealLinked Marketplace Migrations

## Quick Instructions

Your Supabase project is accessible and ready. Follow these steps to apply the 3 migration files:

---

## 📍 Your Supabase Project

**Project URL:** https://supabase.com/dashboard/project/ygezobmpewthqvsfqrbk/sql

**Login with:**
- Email: contact@pedroarmando.com
- Password: (you know it)

---

## 🔧 Step-by-Step Guide

### **1. Open Supabase SQL Editor**
- Go to: https://supabase.com/dashboard/project/ygezobmpewthqvsfqrbk/sql
- Click **"New Query"** button

### **2. Apply Migration 022 (User Extensions)**
- Copy the contents of: `/app/supabase_migrations/022_deallinked_marketplace_users.sql`
- Paste into SQL Editor
- Click **"Run"** (or press Ctrl/Cmd + Enter)
- ✅ You should see: "Success. No rows returned"

**What this does:**
- Adds `membership_active`, `membership_tier`, `user_role` to user_profiles
- Adds `buy_box_preferences`, `onboarding_completed`, `avatar_url`
- Creates indexes for membership queries

### **3. Apply Migration 023 (Deal Publishing)**
- Click **"New Query"** again
- Copy the contents of: `/app/supabase_migrations/023_deallinked_marketplace_deals.sql`
- Paste into SQL Editor
- Click **"Run"**
- ✅ You should see: "Success. No rows returned"

**What this does:**
- Adds `is_published`, `public_status`, `public_asset_type` to deals table
- Adds `public_market`, `public_price`, `public_strategy`
- Adds approval workflow fields
- Adds marketplace analytics counters
- Updates RLS policies

### **4. Apply Migration 024 (Marketplace Interactions)**
- Click **"New Query"** again
- Copy the contents of: `/app/supabase_migrations/024_deallinked_marketplace_interactions.sql`
- Paste into SQL Editor
- Click **"Run"**
- ✅ You should see: "Success. No rows returned"

**What this does:**
- Creates 5 new tables:
  - marketplace_saved_deals
  - marketplace_deal_views
  - marketplace_inquiries
  - marketplace_messages
  - marketplace_offers
- Sets up RLS policies
- Creates auto-increment triggers

---

## ✅ Verification

After running all migrations, verify they worked:

### **Check user_profiles columns:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('membership_active', 'membership_tier', 'user_role');
```
**Expected:** 3 rows returned

### **Check deals columns:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'deals' 
AND column_name LIKE '%public%' OR column_name LIKE '%marketplace%';
```
**Expected:** 10+ rows returned

### **Check new tables:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'marketplace_%';
```
**Expected:** 5 tables listed

---

## 🐛 Troubleshooting

**If you get an error:**

1. **"column already exists"**
   - Migration was partially applied
   - Safe to continue with next migration

2. **"relation already exists"**
   - Table already created
   - Safe to continue with next migration

3. **"permission denied"**
   - Make sure you're using the service role key
   - Check that you're logged in as project owner

4. **Syntax error**
   - Make sure you copied the ENTIRE file
   - Check for any missing characters at start/end

---

## 📞 Alternative: I Can Help

If you encounter any issues:
1. Copy the error message
2. Let me know which migration failed
3. I'll create a fix

---

## ⏭️ After Migrations Are Applied

Once you've successfully run all 3 migrations:

1. **Verify** using the SQL queries above
2. **Confirm** by telling me: "Migrations applied successfully"
3. **I'll proceed** with Phase 3: Building the Marketplace API routes

---

## 📁 Migration File Locations

All migration files are in: `/app/supabase_migrations/`

- `022_deallinked_marketplace_users.sql` (38 lines, 2.0 KB)
- `023_deallinked_marketplace_deals.sql` (87 lines, 4.4 KB)
- `024_deallinked_marketplace_interactions.sql` (250 lines, 10.0 KB)

You can view them with:
```bash
cat /app/supabase_migrations/022_deallinked_marketplace_users.sql
```

---

**Ready? Go to your Supabase SQL Editor and apply the migrations! 🚀**
