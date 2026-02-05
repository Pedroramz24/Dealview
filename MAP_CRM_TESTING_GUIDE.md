# Map CRM Testing Guide

## ✅ What's Been Implemented

### Backend
- ✅ Database schema (3 tables: map_properties, map_property_assignments, map_csv_imports)
- ✅ Row Level Security (RLS) policies
- ✅ Permission middleware (only authorized users can access)
- ✅ API endpoints:
  - `POST /api/map-crm/properties/import` - CSV import with geocoding
  - `GET /api/map-crm/properties` - List properties
  - `GET /api/map-crm/properties/{id}` - Get single property
  - `PUT /api/map-crm/properties/{id}` - Update property
  - `DELETE /api/map-crm/properties/{id}` - Delete property
  - `POST /api/map-crm/properties/{id}/claim` - Claim property
  - `GET /api/map-crm/properties/map-data` - Map viewport data
  - `GET /api/map-crm/imports` - Import history

### Frontend
- ✅ MapCRM page with Leaflet map
- ✅ CSV import modal
- ✅ Property markers colored by asset type
- ✅ Marker clustering for performance
- ✅ Permission guard (redirects unauthorized users)
- ✅ Conditional navigation (only visible to authorized users)

## 🧪 Testing Steps

### 1. Login
- Go to: https://deallinked-rebuild.preview.emergentagent.com
- Login with: `contact@pedroarmando.com` / `Flin141812$`

### 2. Check Navigation
- You should see a 🔒 Map Tool icon in the sidebar
- Users without permission will NOT see this icon

### 3. Access Map CRM
- Click the 🔒 Map Tool icon
- You should be redirected to `/internal/map-crm`
- You should see: "Map CRM" header with "0 properties loaded"

### 4. Import CSV
- Click "Import CSV" button
- Upload the test file: `/app/test_properties.csv`
- Watch the import progress
- After completion, properties should appear on the map

### 5. Verify Map Features
- ✅ Markers appear on map (clustered if zoomed out)
- ✅ Different colors per asset type:
  - Gas: Red
  - Retail: Blue
  - Industrial: Orange
  - Office: Green
  - Land: Brown
  - Multifamily: Purple
- ✅ Click marker to see property popup
- ✅ Popup shows: address, city, type, price, status

### 6. Test Backend API (Optional)
```bash
# Get token from browser DevTools > Application > Local Storage > supabase.auth.token

# List properties
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://deallinked-rebuild.preview.emergentagent.com/api/map-crm/properties

# Get map data
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://deallinked-rebuild.preview.emergentagent.com/api/map-crm/properties/map-data?north=31&south=29&east=-97&west=-99"
```

## 🔒 Security Testing

### Test 1: Unauthorized Access
1. Logout
2. Login as a different user (without map_crm_access permission)
3. Try to access `/internal/map-crm` directly
4. Expected: You should be redirected to /workspace
5. Expected: No Map Tool icon in sidebar

### Test 2: Direct API Access
```bash
# Try without token (should fail with 401)
curl https://deallinked-rebuild.preview.emergentagent.com/api/map-crm/properties

# Try with unauthorized user token (should fail with 403)
curl -H "Authorization: Bearer UNAUTHORIZED_USER_TOKEN" \
  https://deallinked-rebuild.preview.emergentagent.com/api/map-crm/properties
```

## 📊 Expected Results

| Test | Expected Result |
|------|----------------|
| Authorized user sees Map Tool in nav | ✅ Pass |
| Unauthorized user does NOT see Map Tool | ✅ Pass |
| CSV import geocodes addresses | ✅ Pass |
| Properties render on map | ✅ Pass |
| Markers colored by asset type | ✅ Pass |
| Marker clustering works | ✅ Pass |
| Direct URL access blocked for unauthorized | ✅ Pass |
| API returns 403 for unauthorized users | ✅ Pass |

## 🐛 Troubleshooting

### Issue: "Access denied" message
- Solution: Check user has `map_crm_access = true` in Supabase user_profiles

### Issue: CSV import fails
- Check Radar.io API key is valid in backend/.env
- Check CSV has required columns: address, city, state, zip_code, asset_type
- Check asset_type values are: Gas, Retail, Industrial, Office, Land, or Multifamily

### Issue: Map doesn't load
- Check browser console for errors
- Verify Leaflet CSS is loading
- Check properties array has latitude/longitude

### Issue: Backend 500 error
- Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
- Verify database migrations were applied successfully

## ✅ Adding More Users

To grant access to additional users:

```sql
-- Run in Supabase SQL Editor
UPDATE user_profiles 
SET permissions = jsonb_set(COALESCE(permissions, '{}'), '{map_crm_access}', 'true')
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email = 'newuser@domain.com'
);
```

## 📋 Next Phase Features (Not Yet Built)

Phase 2:
- [ ] Table view with sorting/filtering
- [ ] Two-way map ↔ table sync

Phase 3:
- [ ] Property details slide-out panel
- [ ] Inline editing
- [ ] Link to contacts and documents

Phase 4:
- [ ] Team member assignments
- [ ] Property claiming UI
- [ ] Real-time collaboration

Phase 5:
- [ ] Convert property to DealLinked deal
- [ ] Document transfer
- [ ] Contact linking

## 📞 Support

If you encounter issues during testing:
1. Check browser console for frontend errors
2. Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
3. Verify database migrations were applied
4. Confirm Radar.io API key is valid
