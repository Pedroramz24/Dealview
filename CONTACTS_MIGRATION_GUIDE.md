# Contacts Enhancement - Database Setup

## Step 1: Apply Migration Script

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `/app/supabase_migrations/005_contacts_enhancement.sql`
5. Click **Run** or press `Ctrl+Enter`
6. Verify success message appears

## What This Migration Does

### Adds New Fields to Contacts Table:
- `contact_types` - Array of types (buyer, seller, broker, lender, tenant, owner)
- `asset_type_focus` - Array of asset preferences (Retail Centers, Land, Industrial, etc.)
- `markets` - Array of markets (San Antonio, Austin, Houston, DFW, RGV)
- `status` - Contact status (active_contact, no_active_contact, need_to_call, etc.)
- `last_followup_date` - Date of last follow-up
- `next_action_date` - Date for next scheduled action
- `lead_source` - Where the contact came from
- `owner_address` - For principals/property owners
- `tags` - Flexible tagging system

### Creates Contact-Deal Linking System:
- New table: `contact_deal_links` for many-to-many relationships
- Contacts can be linked to multiple deals
- Deals can have multiple contacts
- Relationship types: buyer, seller, broker, etc.
- Bidirectional linking with RLS policies

### RLS Policies Applied:
- Users can only view links for their own contacts/deals
- Users can only create links between their own contacts/deals
- Users can delete their own links

## Step 2: Verify Migration

After running the script, verify it worked:

1. In SQL Editor, run:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
ORDER BY ordinal_position;
```

2. You should see all the new columns (contact_types, asset_type_focus, markets, status, etc.)

3. Verify the junction table exists:
```sql
SELECT * FROM contact_deal_links LIMIT 1;
```

4. Should return no error (table exists, might be empty)

## Next Steps

Once the migration is applied successfully:
1. The frontend will be updated to use these new fields
2. Add/Edit Contact modal will include all new fields
3. Contact-Deal linking will be implemented
4. Enhanced search and filters will work

**Please run the migration and let me know when it's complete!**
