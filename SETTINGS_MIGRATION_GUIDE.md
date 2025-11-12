# Settings Page - Database Migration Required

## Issue
The Settings page needs additional fields in the `user_profiles` table to save user information.

## Current Schema
The `user_profiles` table currently has:
- `id` (UUID, references auth.users)
- `company` (TEXT)
- `phone` (TEXT)
- `role` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Required Fields
To support the Settings page functionality, we need:
- `full_name` (TEXT) - User's display name
- `title` (TEXT) - Job title/position
- `timezone` (TEXT) - Preferred timezone
- `avatar_url` (TEXT) - Profile picture URL
- `company_logo_url` (TEXT) - Company logo URL

## Migration File
**Location:** `/app/supabase_migrations/013_user_profiles_enhancement.sql`

## How to Apply

### Step 1: Open Supabase Dashboard
- Go to https://supabase.com/dashboard
- Select your project

### Step 2: Navigate to SQL Editor
- Click "SQL Editor" in the left sidebar

### Step 3: Run the Migration
Copy and paste this SQL:

```sql
-- Add new fields to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Chicago',
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Add comments
COMMENT ON COLUMN public.user_profiles.full_name IS 'User full name for display';
COMMENT ON COLUMN public.user_profiles.title IS 'Job title or role';
COMMENT ON COLUMN public.user_profiles.timezone IS 'User preferred timezone';
COMMENT ON COLUMN public.user_profiles.avatar_url IS 'Profile picture URL';
COMMENT ON COLUMN public.user_profiles.company_logo_url IS 'Company logo URL';
```

### Step 4: Click "Run" or press Cmd/Ctrl + Enter

### Step 5: Verify
- Go to "Table Editor" → `user_profiles`
- Confirm the new columns are present

## After Migration
Once the migration is applied:
- Settings page will save user data correctly
- Profile information will persist
- Avatar and company logo URLs can be stored
- Timezone preferences will be saved

## Features Enabled
- ✅ Save full name, title, phone, timezone
- ✅ Profile picture upload (URL storage ready)
- ✅ Company logo upload (URL storage ready)
- ✅ Change password functionality
- ✅ Notification preferences
- ✅ Security settings
