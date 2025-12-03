# 🚀 Complete Setup Guide: What You Need to Do

## ⚠️ CRITICAL: Supabase Migrations Required

Your backend code is ready, but **the database structure doesn't exist yet**. You must apply 3 SQL migrations in Supabase.

---

## 📋 Step-by-Step: Apply Migrations in Supabase

### Option 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase project dashboard**
   - URL: https://supabase.com/dashboard

2. **Navigate to SQL Editor**
   - Left sidebar → Click "SQL Editor"

3. **Apply Migration #1: Enhanced Publishing Fields**
   - Click "New Query"
   - Open file: `/app/supabase_migrations/025_enhanced_publishing_fields.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run" (bottom right)
   - ✅ Should see "Success. No rows returned"

4. **Apply Migration #2: NCND Signature System**
   - Click "New Query" again
   - Open file: `/app/supabase_migrations/026_ncnd_signature_system.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"
   - ✅ Should see "Success. No rows returned"

5. **Apply Migration #3: Broker Reputation System**
   - Click "New Query" again
   - Open file: `/app/supabase_migrations/027_broker_reputation_system.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"
   - ✅ Should see "Success. No rows returned"

### Option 2: Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
cd /app
supabase db push
```

---

## 🔍 How to Verify Migrations Were Applied

### Check via Supabase Dashboard:

1. **Go to Table Editor** (left sidebar)
2. **Look for these new tables:**
   - `ncnd_signatures` ✓
   - `deal_lifecycle_events` ✓
   - `broker_reputation` ✓
   - `deal_feedback` ✓
   - `broker_response_times` ✓

3. **Check `deals` table has new columns:**
   - Click on `deals` table
   - Look for columns like:
     - `cap_rate`
     - `noi`
     - `sale_conditions`
     - `image_urls`
     - `building_status`
     - `is_land_listing`
     - `completeness_score`
     - `ncnd_required`
     - `seller_commitment_level`

If you see these tables and columns, migrations were successful! ✅

---

## 🧪 Testing Checklist After Migrations

### Test 1: Enhanced Publishing Wizard

1. **Go to Workspace → Any Deal**
2. Click "Publish to Marketplace" button
3. **You should see:**
   - ✅ 6-step wizard (not old simple modal)
   - ✅ Step 1: Property type selection (Property vs Land)
   - ✅ Completeness progress bar at top
   - ✅ Color changes based on score

4. **Fill out the wizard:**
   - Choose "Property" type
   - Fill basic info (Step 2)
   - **Notice:** CAP Rate and NOI appear (only for Property, not Land)
   - Add some sale conditions (Step 3)
   - Add building details (Step 4)
   - Add highlights (Step 5)
   - Review (Step 6) - see completeness score

5. **Try publishing at <80%:**
   - Submit button should be DISABLED
   - Should show "Need 80% to publish"

6. **Fill more fields to reach 80%:**
   - Submit button becomes ENABLED
   - Click "Submit for Approval"
   - Should see success toast

### Test 2: Land Listing (No CAP/NOI)

1. **Create or use another deal**
2. Click "Publish to Marketplace"
3. **Choose "Land" in Step 1**
4. Go to Step 3
5. **Verify:** CAP Rate and NOI fields are HIDDEN ✓
6. Complete wizard and publish

### Test 3: NCND Signature System

1. **Go to Marketplace**
2. Click on any published deal
3. **You should see:**
   - ✅ NCND signature modal appears (blocks access)
   - ✅ Full legal agreement text displayed
   - ✅ Canvas for drawing signature
   - ✅ "I Agree" checkbox

4. **Sign the NCND:**
   - Draw signature with mouse
   - Check "I Agree"
   - Click "Sign & Continue"
   - Should see success toast
   - Modal closes
   - Deal details appear

5. **Test expiration:**
   - Leave and come back to same deal
   - Should NOT see modal again (signed within 6 months)

### Test 4: Broker Reputation Display

1. **View any published deal in Marketplace**
2. After signing NCND (if required)
3. **Scroll down below the map**
4. **You should see:**
   - ✅ "Broker Reputation" section
   - ✅ Quality tier badge (Premium/Standard/New)
   - ✅ For new brokers: Shows "New Broker" (no stats yet)
   - ✅ Future: Will show badges and stats as broker builds reputation

### Test 5: Deal Lifecycle Events

1. **Use API to create lifecycle event:**

```bash
curl -X POST "YOUR_BACKEND_URL/api/reputation/lifecycle-event" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deal_id": "YOUR_DEAL_ID",
    "event_type": "loi_submitted"
  }'
```

2. **Check broker reputation recalculates**

### Test 6: Deal Feedback System

1. **As a buyer, view a deal you interacted with**
2. **Use API or future UI to submit feedback**
3. Verify feedback is private (not shown publicly)
4. Verify broker reputation updates

---

## 🎨 Design Updates Applied

**✅ Glassmorphism Applied to Wizard:**
- Ultra-light transparent background (`rgba(255, 255, 255, 0.03)`)
- Backdrop blur (`blur(16px)`)
- Subtle borders
- Matches AI Dashboard aesthetic

**✅ CAP Rate/NOI Conditional Display:**
- Only shows for Property listings
- Hidden for Land listings

---

## 📊 What Each Migration Does

### Migration #1: Enhanced Publishing Fields
**Adds to `deals` table:**
- Financial fields (CAP rate, NOI)
- Sale conditions array
- Building details (units, GBA, floors, year built, etc.)
- Land-specific fields (lot size, topography, grading, etc.)
- Media arrays (image_urls, brochure_document_ids)
- Completeness score (0-100)

**Impact:** Publishing wizard can collect and store all detailed property/land data.

### Migration #2: NCND Signature System
**Creates new table:** `ncnd_signatures`
- Stores digital signatures with full audit trail
- IP address, user agent, timestamp capture
- 6-month expiration (auto-calculated via trigger)

**Updates `deals` table:**
- `ncnd_required` boolean
- `ncnd_signatures_count`

**Impact:** Legal protection for brokers, gates deal access until NCND signed.

### Migration #3: Broker Reputation System
**Creates 5 new tables:**
1. `deal_lifecycle_events` - Track deal progression
2. `broker_reputation` - Quality scores and metrics
3. `deal_feedback` - Structured buyer feedback
4. `broker_response_times` - Response tracking
5. Extended `deals` with seller commitment fields

**Creates PostgreSQL function:**
- `calculate_broker_reputation()` - Calculates 0-100 score
- Auto-determines badges
- Auto-throttles low-quality brokers

**Impact:** Data-driven reputation, anti-gaming system, quality control.

---

## ❌ Common Issues & Solutions

### Issue: "relation 'ncnd_signatures' does not exist"
**Solution:** Migrations not applied. Apply Migration #2.

### Issue: "column 'cap_rate' does not exist"
**Solution:** Migrations not applied. Apply Migration #1.

### Issue: "function calculate_broker_reputation does not exist"
**Solution:** Migrations not applied. Apply Migration #3.

### Issue: Publishing wizard shows but submit fails
**Solution:** Backend is trying to save to columns that don't exist. Apply migrations.

### Issue: NCND modal doesn't appear
**Solution:** 
1. Check migrations applied
2. Check deal has `ncnd_required = true`
3. Check backend logs for errors

### Issue: Broker badges don't show
**Solution:**
1. Migrations applied?
2. Is broker reputation data seeded? (New brokers won't have data yet)
3. Check browser console for API errors

---

## 🔄 After Migrations: Optional Data Seeding

To see broker reputation in action, you can manually insert test data:

```sql
-- Seed a broker reputation record
INSERT INTO broker_reputation (
  broker_id,
  quality_score,
  total_deals_published,
  closed_deals_count,
  avg_response_time_hours,
  is_trusted_broker,
  is_fast_responder
) VALUES (
  'YOUR_USER_ID',
  85,
  15,
  8,
  6.5,
  true,
  true
);
```

---

## ✅ Final Checklist

Before saying "everything works":

- [ ] All 3 migrations applied successfully
- [ ] New tables visible in Supabase Table Editor
- [ ] New columns added to `deals` table
- [ ] Publishing wizard opens with 6 steps
- [ ] CAP/NOI hidden for Land listings
- [ ] Completeness bar shows percentage
- [ ] Can't publish below 80% completeness
- [ ] NCND modal appears on marketplace deal view
- [ ] Signature canvas works (can draw)
- [ ] After signing, deal details appear
- [ ] Broker Reputation section visible on deal detail
- [ ] Glassmorphism design matches rest of CRM

---

## 🚀 What Happens After Testing

Once everything works:

1. **Create real deals and publish them**
2. **Watch completeness scores**
3. **Sign NCNDs as buyers**
4. **Submit feedback after interactions**
5. **Watch broker reputations build over time**

The system is now fully functional for:
- Quality-controlled marketplace listings
- Legal protection via NCND
- Merit-based broker reputation
- Automated throttling of low-quality brokers

---

## 🆘 Need Help?

If you encounter issues:
1. Check Supabase logs (Dashboard → Logs)
2. Check browser console (F12 → Console tab)
3. Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
4. Verify migrations were applied correctly
5. Try testing agent for automated E2E testing

---

## 📝 Summary

**You need to do:** Apply 3 SQL migrations in Supabase Dashboard
**Expected time:** 5-10 minutes
**Result:** All advanced publishing features work
**Next step:** Test each feature using checklist above
