# Phase 1: Customizable Pipelines - Setup Guide

## 📋 Overview
This guide will walk you through setting up the customizable pipelines system in your Supabase database.

## 🗂️ Database Structure

### New Tables Created:
1. **pipelines** - Stores user's custom pipelines (max 5 per user)
2. **pipeline_stages** - Stores custom stages for each pipeline (max 10 per pipeline)

### Modified Tables:
- **deals** - Added `pipeline_id` and `pipeline_stage_id` columns

## 🚀 Installation Steps

### Step 1: Run Schema Creation Script
```
1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste contents of: 005_customizable_pipelines.sql
5. Click "Run"
```

**What this does:**
- ✅ Creates `pipelines` table
- ✅ Creates `pipeline_stages` table
- ✅ Adds new columns to `deals` table
- ✅ Sets up Row Level Security (RLS) policies
- ✅ Creates helper functions and triggers

### Step 2: Run Migration Script
```
1. In Supabase SQL Editor, create another new query
2. Copy and paste contents of: 006_migrate_existing_deals.sql
3. Click "Run"
```

**What this does:**
- ✅ Creates default "Off-Market" pipeline for all existing users
- ✅ Creates 8 default stages per pipeline (matching current stages)
- ✅ Migrates all existing deals to the default pipeline
- ✅ Sets up auto-creation trigger for new users

### Step 3: Verify Migration
Run these verification queries in SQL Editor:

```sql
-- Check pipelines created
SELECT COUNT(*) FROM pipelines;

-- Check stages created
SELECT p.name, COUNT(ps.id) as stage_count
FROM pipelines p
LEFT JOIN pipeline_stages ps ON ps.pipeline_id = p.id
GROUP BY p.name;

-- Check deals migrated
SELECT 
  COUNT(*) as total_deals,
  COUNT(pipeline_id) as migrated_deals
FROM deals;
```

## 📊 Default Pipeline Structure

Each user gets this default "Off-Market" pipeline:

| Stage Name        | Color     | Weight | Order |
|-------------------|-----------|--------|-------|
| Need to Contact   | #94a3b8   | 0.1    | 0     |
| Contacted         | #60a5fa   | 0.2    | 1     |
| Prospect          | #a78bfa   | 0.3    | 2     |
| Negotiations      | #ec4899   | 0.4    | 3     |
| Offer Sent        | #f59e0b   | 0.5    | 4     |
| Under Contract    | #10b981   | 0.8    | 5     |
| Closed Won        | #00d4aa   | 1.0    | 6     |
| Overpriced        | #ef4444   | 0.05   | 7     |

## 🔒 Security Features

**Row Level Security (RLS) Policies:**
- ✅ Users can only see their own pipelines
- ✅ Max 5 pipelines per user
- ✅ Max 10 stages per pipeline
- ✅ Cannot delete default pipeline
- ✅ Users can only manage their own stages

## 🔄 Backward Compatibility

The old `stage` column in the `deals` table is **preserved** for backward compatibility. Both systems work simultaneously:
- Old code can still read/write to `stage` column
- New code uses `pipeline_id` and `pipeline_stage_id`
- Migration ensures both are in sync

## 🎯 Next Steps (Phase 2)

After confirming the database setup works:
1. Create backend API endpoints for pipeline management
2. Update frontend to use new pipeline system
3. Add pipeline selector UI
4. Add pipeline management settings page

## 🐛 Troubleshooting

**Issue: Migration script fails**
- Check if you ran the schema creation script first
- Verify all users have entries in `user_profiles` table

**Issue: No pipelines created**
- Check if there are any deals in the database
- Run the verification queries to see current state

**Issue: RLS errors**
- Verify RLS is enabled on both tables
- Check that policies were created correctly:
  ```sql
  SELECT * FROM pg_policies WHERE tablename IN ('pipelines', 'pipeline_stages');
  ```

## 📞 Support

If you encounter any issues:
1. Run the verification queries
2. Check Supabase logs for errors
3. Verify user authentication is working

---

**Status: Ready for Phase 2 Implementation** ✅
