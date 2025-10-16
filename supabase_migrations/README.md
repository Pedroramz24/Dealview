# 🚀 DealView CRM - Supabase Setup Guide

## ✅ Your Supabase Project Information

**Project URL:** https://ygezobmpewthqvsfqrbk.supabase.co
**Project Ref:** ygezobmpewthqvsfqrbk

**Keys Configured:**
- ✅ Anon Key (frontend)
- ✅ Service Role Key (backend)
- ✅ Access Token (management)

---

## 📋 Step-by-Step Setup (15 minutes total)

### Step 1: Create Database Schema (5 minutes)

1. Go to: https://supabase.com/dashboard/project/ygezobmpewthqvsfqrbk/sql/new

2. Copy the ENTIRE contents of `/app/supabase_migrations/001_create_schema.sql`

3. Paste into the SQL Editor

4. Click **RUN** button

5. Wait for "Success. No rows returned" message

**What This Does:**
- ✅ Creates all tables (deals, contacts, documents, etc.)
- ✅ Sets up Row Level Security (multi-tenant isolation)
- ✅ Creates auto-update triggers
- ✅ Configures permissions

---

### Step 2: Create Storage Buckets (3 minutes)

1. Go to: https://supabase.com/dashboard/project/ygezobmpewthqvsfqrbk/storage/buckets

2. Click **"New bucket"**

3. Create these 3 buckets:

**Bucket 1: deal-images**
- Name: `deal-images`
- Public: ❌ No (private)
- File size limit: 50MB
- Allowed MIME types: `image/*`
- Click **Create**

**Bucket 2: documents**
- Name: `documents`
- Public: ❌ No (private)
- File size limit: 100MB
- Allowed MIME types: `application/pdf, application/msword, application/vnd.openxmlformats-officedocument.*`
- Click **Create**

**Bucket 3: map-tiles**
- Name: `map-tiles`
- Public: ✅ Yes (public read)
- File size limit: 500MB
- Allowed MIME types: `application/*`
- Click **Create**

---

### Step 3: Apply Storage Policies (2 minutes)

1. Go back to: https://supabase.com/dashboard/project/ygezobmpewthqvsfqrbk/sql/new

2. Copy the contents of `/app/supabase_migrations/002_storage_policies.sql`

3. Paste and **RUN**

4. Wait for success message

**What This Does:**
- ✅ Users can only upload/view their own deal images
- ✅ Users can share documents with team members
- ✅ Map tiles are publicly accessible

---

### Step 4: Configure Authentication (3 minutes)

1. Go to: https://supabase.com/dashboard/project/ygezobmpewthqvsfqrbk/auth/users

2. Click **"Configuration"** tab

3. Enable these settings:

**Email Auth:**
- ✅ Enable Email provider
- ✅ Confirm email: OFF (for development)
- ❌ Secure email change: OFF (for development)

**JWT Settings:**
- JWT expiry: 3600 seconds (1 hour)

4. Click **Save**

---

### Step 5: Test Your Database (2 minutes)

1. Go to: https://supabase.com/dashboard/project/ygezobmpewthqvsfqrbk/editor

2. You should see these tables:
   - ✅ user_profiles
   - ✅ deals
   - ✅ contacts
   - ✅ deal_milestones
   - ✅ documents
   - ✅ team_members

3. Click on **deals** table

4. You should see columns: id, owner_id, title, address, price, etc.

5. Go to "Policies" tab - you should see RLS policies enabled

---

## ✅ Verification Checklist

After running all steps, verify:

- [ ] All 6 tables created in Database Editor
- [ ] Row Level Security enabled on all tables
- [ ] 3 storage buckets created (deal-images, documents, map-tiles)
- [ ] Storage policies applied
- [ ] Email authentication enabled

---

## 🎯 What's Next?

Once you confirm setup is complete, I will:

1. ✅ Install Supabase client in frontend
2. ✅ Update authentication to use Supabase Auth
3. ✅ Migrate existing MongoDB users (if any)
4. ✅ Update all API calls to use Supabase
5. ✅ Build vector tile system with Supabase Storage
6. ✅ Test with first 5 users

---

## 🆘 Troubleshooting

**"Syntax error near ..."**
- Make sure you copied the ENTIRE SQL file
- Check for missing quotes or commas

**"Relation already exists"**
- Tables already created - you're good!
- Skip to next step

**"Permission denied"**
- Make sure you're using the correct project
- Check your access token is valid

**"Storage bucket already exists"**
- Already created - you're good!
- Skip to policy setup

---

## 📊 What You're Building

**Database Structure:**
```
user_profiles (extends Supabase Auth)
    ↓ owner_id
deals (properties, transactions)
    ↓ deal_id
    ├── contacts (buyers, sellers, agents)
    ├── deal_milestones (transaction timeline)
    └── documents (contracts, PDFs)

team_members (collaboration)
```

**Security:**
- ✅ Row Level Security = Users can only see their own data
- ✅ Multi-tenant = Perfect for SaaS
- ✅ Team collaboration = Share deals with team members

**Scalability:**
- ✅ Built for 1000+ users
- ✅ PostgreSQL = handles millions of rows
- ✅ Automatic backups
- ✅ Connection pooling

---

## 🎉 Ready to Proceed?

Once you've completed all 5 steps, let me know and I'll:
- Migrate your authentication
- Update frontend code
- Build vector tile system
- Test everything
- Get ready for your first 5 users!

**Estimated time to complete:** 15 minutes
**Time to full migration:** 2-3 hours (mostly automated)
**Result:** Scalable CRM ready for 1000+ users!
