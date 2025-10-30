# Template Design Column Fix

## Issue
The `email_templates` table was missing the `design` column needed to store Unlayer JSON design data for re-editing templates.

## Error Message
```
Failed to save template: Could not find the 'design' column of 'email_templates' in the schema cache
```

## Solution

### Migration File Created
`/app/supabase_migrations/012_add_design_to_templates.sql`

### How to Apply

1. **Open Supabase Dashboard**
   - Go to your project at https://supabase.com/dashboard

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run the Migration**
   - Copy the contents of `/app/supabase_migrations/012_add_design_to_templates.sql`
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify**
   - Go to "Table Editor" → `email_templates`
   - Confirm the `design` column (JSONB type) is now present

### What This Does
- Adds a `design` column (JSONB type) to the `email_templates` table
- This column stores the Unlayer editor JSON design
- Allows templates to be loaded back into the editor for modifications

### After Running Migration
- Template saving should work correctly
- Templates can be re-edited in the Unlayer editor
- Design state is preserved between sessions

## Related Files
- Original campaigns design column: `010_add_design_column.sql` (added to `email_campaigns`)
- New templates design column: `012_add_design_to_templates.sql` (adds to `email_templates`)
