# Supabase Branch Setup Guide - For User

## Quick Start: Creating Your Supabase Branch

Since you have Supabase Pro, you can create an isolated database branch for this refactor.

---

## 🔷 **Step-by-Step Instructions**

### 1. Access Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Log in to your account
- Select your DealLinked project

### 2. Navigate to Branches
- In the left sidebar, click **"Branches"**
- You should see your main/production branch

### 3. Create New Branch
- Click **"Create Branch"** button
- **Branch name:** `refactor-v2`
- Click **"Create"**
- Wait 2-3 minutes for branch to be created

### 4. Access Branch Database
- Once ready, click on the `refactor-v2` branch
- You'll see it has a copy of your production database
- This is your isolated environment for the refactor

### 5. Get Branch Credentials
- Click on the `refactor-v2` branch
- Go to **Settings** → **Database** → **Connection String**
- Copy these values:

```
URL: https://[unique-ref].supabase.co
Anon Key: eyJhbGc...
Service Role Key: eyJhbGc...
```

### 6. Provide to New Agent
When you start the new Emergent session, tell the agent:

```
I've created the Supabase branch 'refactor-v2'. Here are the credentials:

SUPABASE_URL=https://[your-branch-ref].supabase.co
SUPABASE_ANON_KEY=[your-branch-anon-key]
SUPABASE_SERVICE_KEY=[your-branch-service-role-key]

Please update the backend/.env file with these credentials.
```

---

## 🔍 **What the Branch Gives You**

### Safety
- ✅ Main production database stays untouched
- ✅ Can experiment freely in branch
- ✅ Easy to delete and recreate if needed

### Workflow
1. **Test refactor** in branch database
2. **Verify everything works**
3. **Merge to production** when ready (one-click in Supabase)

### Isolation
- Changes in branch don't affect production
- Can compare schemas between branch and main
- Can run parallel testing

---

## 📝 **Quick Reference Commands**

### In Supabase Branch SQL Editor

**List all tables:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Drop a table:**
```sql
DROP TABLE IF EXISTS email_campaigns CASCADE;
```

**Check table structure:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deals'
ORDER BY ordinal_position;
```

---

## ⚠️ **Important Notes**

### Branching Limits (Pro Plan)
- You can have multiple branches
- Each branch is a full copy of production
- Branches use compute resources (count toward quota)

### Merging to Production
- **ONLY merge when refactor is complete and tested**
- Merging is one-way (can't undo easily)
- Always test thoroughly in branch first

### Branch Lifecycle
1. Create branch (`refactor-v2`)
2. Develop and test in branch
3. Verify everything works
4. Merge to production (when ready)
5. Delete branch (optional, saves resources)

---

## 🎯 **What to Tell the New Agent**

When you start your new Emergent session, share this message:

```
I want to refactor my DealLinked CRM application by removing bloated features and rebuilding the database from scratch.

SETUP:
- GitHub branch 'refactor-v2' is ready
- Supabase branch 'refactor-v2' is created
- Branch credentials: [paste credentials here]

INSTRUCTIONS:
- Read /app/NEW_SESSION_START_HERE.md
- Follow the refactor plan in /app/REFACTOR_V2_PLAN.md
- Work systematically through /app/FEATURES_TO_REMOVE.md
- Test thoroughly after each major change

APPROACH:
- Update backend/.env with Supabase branch credentials
- Remove features one by one
- Rebuild database with minimal schema
- Test all kept features work correctly

START WITH:
1. Update Supabase credentials in backend/.env
2. Test database connection
3. Begin systematic feature removal (email campaigns first)
```

---

## 📞 **Need Help?**

If you encounter issues with Supabase branching:
- Check Supabase documentation: https://supabase.com/docs/guides/platform/branching
- Verify you're on Pro plan
- Ensure branch is fully created before using

---

**Last Updated:** 2025-01-16  
**Your Next Step:** Create the Supabase branch, then start new Emergent session with the message above.
