# Map CRM Database Migrations

These migrations set up the database schema for the internal Map CRM tool.

## Running Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://ygezobmpewthqvsfqrbk.supabase.co
2. Navigate to **SQL Editor**
3. Run each migration file in order:
   - `001_add_permissions_column.sql`
   - `002_enable_postgis.sql`
   - `003_create_map_properties.sql`
   - `004_create_assignments_imports.sql`
   - `005_apply_rls_policies.sql`

### Option 2: Supabase CLI

```bash
supabase db push
```

## Granting Access to Users

After running migrations, grant Map CRM access to specific users:

```sql
-- Grant access to 3 team members
UPDATE user_profiles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'), 
  '{map_crm_access}', 
  'true'
)
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email IN (
    'user1@domain.com',
    'user2@domain.com',
    'user3@domain.com'
  )
);
```

## Verifying Installation

```sql
-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'map_%';

-- Check PostGIS
SELECT PostGIS_version();

-- Check user permissions
SELECT id, full_name, permissions 
FROM user_profiles 
WHERE (permissions->>'map_crm_access')::boolean = true;
```

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Only users with `permissions.map_crm_access = true` can access Map CRM data
- Database-level protection prevents unauthorized access even if backend is compromised
