# DealLinked Marketplace Database Migrations

## Phase 2: Data Model Extensions

This directory contains SQL migrations for transforming the CRM into DealLinked - a unified Marketplace + Workspace platform.

---

## 🗄️ **New Migrations (Phase 2)**

### **Migration 022: User Extensions**
**File:** `022_deallinked_marketplace_users.sql`

**What it does:**
- Adds membership fields to `user_profiles`:
  - `membership_active` (BOOLEAN) - Whether user has active paid membership
  - `membership_tier` (TEXT) - 'base' or 'pro'
  - `user_role` (TEXT) - 'broker', 'investor', or 'admin'
  - `buy_box_preferences` (JSONB) - User's preferred markets, asset types, price ranges
  - `onboarding_completed` (BOOLEAN) - Whether user completed onboarding wizard
  - `avatar_url` (TEXT) - User profile picture
- Creates indexes for efficient membership queries
- Updates RLS policies for profile access

**Run this first** - Other migrations depend on these fields.

---

### **Migration 023: Deal Publishing Extensions**
**File:** `023_deallinked_marketplace_deals.sql`

**What it does:**
- Adds Marketplace publishing fields to `deals`:
  - `is_published` (BOOLEAN) - Whether deal is published to Marketplace
  - `public_status` (TEXT) - 'draft', 'pending_approval', 'published', 'archived'
  - `public_asset_type` (TEXT) - Asset type shown in Marketplace
  - `public_market` (TEXT) - Market/city shown in Marketplace  
  - `public_price` (DECIMAL) - Price shown in Marketplace
  - `public_strategy` (TEXT) - 'Core', 'Value-Add', 'Development', etc.
  - `published_at`, `published_by` - Publishing metadata
  - `approval_status`, `approved_by`, `approved_at` - Admin approval workflow
  - `marketplace_views_count`, `marketplace_inquiries_count`, `marketplace_saves_count` - Analytics counters
- Creates indexes for Marketplace browsing (filtering by market, asset type, price, etc.)
- Creates composite index for efficient Marketplace feed queries
- Updates RLS policies:
  - **Workspace:** Users see their own deals
  - **Marketplace:** Members see published deals with `approval_status='approved'`

**Run this second** - After user extensions.

---

### **Migration 024: Marketplace Interactions**
**File:** `024_deallinked_marketplace_interactions.sql`

**What it does:**
Creates 5 new tables for Marketplace interactions:

#### **1. `marketplace_saved_deals`**
- Users can save/bookmark deals for later
- Fields: user_id, deal_id, saved_at, notes
- RLS: Users can only see/manage their own saved deals
- Unique constraint: One save per user per deal

#### **2. `marketplace_deal_views`**
- Analytics tracking: when users view deals
- Fields: deal_id, user_id, viewed_at
- RLS: Brokers can view stats for their own deals
- Auto-increments `marketplace_views_count` on deals table

#### **3. `marketplace_inquiries`**
- Initial inquiries from buyers to brokers
- Fields: deal_id, inquirer_id, broker_id, message, status, created_at, responded_at
- Status: 'new', 'responded', 'closed'
- RLS: Users see inquiries they sent or received
- Auto-increments `marketplace_inquiries_count` on deals table

#### **4. `marketplace_messages`**
- Real-time chat between users
- Fields: conversation_id, sender_id, recipient_id, deal_id, message, read, created_at
- Grouped by conversation_id (user pair + deal)
- RLS: Users see messages they sent or received
- Enables Supabase Realtime for instant messaging

#### **5. `marketplace_offers`**
- Formal offers from buyers to brokers
- Fields: deal_id, buyer_id, broker_id, offer_amount, terms, status, counter_amount, created_at, expires_at
- Status: 'pending', 'accepted', 'rejected', 'countered', 'withdrawn'
- RLS: Users see offers they made or received
- Supports counter-offers workflow

**Triggers:**
- Auto-increment view counter when deal is viewed
- Auto-increment inquiry counter when inquiry is created
- Auto-increment/decrement save counter when deal is saved/unsaved

**Run this third** - After deal extensions.

---

## 🚀 **How to Apply Migrations**

### **Option 1: Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of each migration file
4. Run them in order:
   1. `022_deallinked_marketplace_users.sql`
   2. `023_deallinked_marketplace_deals.sql`
   3. `024_deallinked_marketplace_interactions.sql`
5. Verify success (check Tables tab to see new columns/tables)

### **Option 2: Supabase CLI**
```bash
# If you have Supabase CLI installed
supabase db push --file supabase_migrations/022_deallinked_marketplace_users.sql
supabase db push --file supabase_migrations/023_deallinked_marketplace_deals.sql
supabase db push --file supabase_migrations/024_deallinked_marketplace_interactions.sql
```

### **Option 3: MCP Supabase Tools**
```python
# The MCP tools can apply migrations programmatically
# See server.py for usage examples
```

---

## ✅ **Verification Checklist**

After running migrations, verify:

### **user_profiles table:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('membership_active', 'membership_tier', 'user_role', 'buy_box_preferences', 'onboarding_completed');
```
Expected: 5 rows returned

### **deals table:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deals' 
AND column_name LIKE '%public%' OR column_name LIKE '%marketplace%' OR column_name LIKE '%published%';
```
Expected: 13+ rows returned

### **New tables:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'marketplace_%';
```
Expected: 5 tables (saved_deals, deal_views, inquiries, messages, offers)

---

## 🔒 **Row Level Security (RLS)**

All new tables have RLS enabled with policies:

**Workspace (Private):**
- Users can only see/edit their own deals, contacts, etc.
- No change from existing behavior

**Marketplace (Public to Members):**
- **Published deals:** Visible to all members with active membership
- **Saved deals:** Private to each user
- **Messages:** Private to sender and recipient
- **Inquiries/Offers:** Private to buyer and broker involved
- **Views:** Tracked for all users, visible to deal owner (broker)

---

## 📊 **Data Model Diagram**

```
┌─────────────────┐
│  user_profiles  │
│  + membership   │  ← Phase 2 additions
│  + role         │
│  + buy_box      │
└────────┬────────┘
         │
         │ owner_id
         ▼
┌─────────────────┐
│     deals       │
│  + is_published │  ← Phase 2 additions
│  + public_*     │
│  + approval     │
└────────┬────────┘
         │
         │ deal_id (FK)
         ▼
┌────────────────────────────────────────────┐
│  Marketplace Interactions (Phase 2)        │
├────────────────────────────────────────────┤
│  • marketplace_saved_deals                 │
│  • marketplace_deal_views                  │
│  • marketplace_inquiries                   │
│  • marketplace_messages                    │
│  • marketplace_offers                      │
└────────────────────────────────────────────┘
```

---

## ⚠️ **Important Notes**

1. **Run migrations in order** - Dependencies exist between them
2. **Backup first** - Always backup production data before migrations
3. **Test in staging** - Apply to staging environment first
4. **RLS policies** - All tables have proper RLS for multi-tenant security
5. **Indexes** - Optimized for Marketplace browsing performance
6. **Triggers** - Auto-update counters for analytics

---

## 🐛 **Troubleshooting**

**If migration fails:**
1. Check Supabase dashboard for error message
2. Verify previous migrations ran successfully
3. Check for naming conflicts with existing columns/tables
4. Review RLS policies if access is denied

**Common issues:**
- `column already exists` - Migration was partially applied, check table schema
- `relation does not exist` - Dependencies not met, run previous migrations first
- `permission denied` - RLS policy issue, check policy definitions

---

## 📝 **Next Steps (Phase 3)**

After migrations are applied:
1. ✅ Test backend models import successfully
2. ✅ Create Marketplace API routes (`/routes/marketplace_routes.py`)
3. ✅ Implement publishing workflow in Workspace
4. ✅ Build Marketplace frontend components
5. ✅ Implement real-time messaging
6. ✅ Add admin approval queue

---

**Status:** ✅ Migrations ready to apply  
**Last Updated:** Phase 2 Complete  
**Contact:** Review `/app/PHASE_2_COMPLETE.md` for full documentation
