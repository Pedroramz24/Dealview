# DealVisor Smart Import System

## 🧠 Intelligent Features

### 1. Smart Asset Type Classification

**When CSV has `asset_type` column:**
- Uses the provided value directly

**When CSV is missing `asset_type` column:**
DealVisor automatically classifies properties using:

#### A. Keyword Analysis
Scans address, title, description, notes for:
- **Gas**: "gas", "fuel", "station", "convenience", "c-store", "petrol"
- **Retail**: "retail", "shopping", "store", "mall", "plaza", "center"
- **Industrial**: "warehouse", "distribution", "manufacturing", "industrial", "logistics", "flex"
- **Office**: "office", "corporate", "medical", "professional", "business", "tower"
- **Multifamily**: "apartment", "multifamily", "units", "complex", "residential"
- **Land**: Property with lot_size > 0 and building_size = 0

#### B. Size Heuristics
- **Gas**: < 5,000 sqft
- **Industrial**: > 20,000 sqft
- **Default**: Office (most common commercial type)

**Example Classifications:**
```
"456 Gas Station Rd" + 2,400 sqft → Gas
"Shopping Plaza" → Retail
"Warehouse Blvd" + 85,000 sqft → Industrial
"Apartment Complex" → Multifamily
0 sqft building, 3.7 acres lot → Land
"Medical Center Dr" → Office
```

---

### 2. Duplicate Detection & Update Logic

**Problem:** Re-importing the same CSV file or updated property lists creates duplicates.

**Solution:** Smart matching with automatic updates.

#### Matching Strategy

**Primary Match: Normalized Address**
```
"123 Main St, Austin, TX" = "123 main st austin tx"
```
- Case-insensitive
- Removes punctuation
- Trims whitespace
- Matches: address + city + state

**Secondary Match: Lat/Lng Proximity**
- If geocoded coordinates are within 50 meters (~0.0005 degrees)
- Catches address format variations

#### Update Behavior

**When duplicate is found:**
- ✅ **Preserves**: `id`, `owner_id`, `team_id`, `deal_id`, `created_at`, `status`
- ✅ **Updates**: All fields from CSV (address, price, size, owner info, etc.)
- ✅ **Tracks**: `updated_at`, `last_edited_by`

**When no match:**
- ✅ Creates new property

#### Import Summary

After import, you'll see:
```
Import Complete!
10 of 10 properties processed successfully.
• 7 new properties added
• 3 properties updated
```

---

## 📋 CSV Format Examples

### Minimal CSV (Required Columns Only)
```csv
address,city,state,zip_code
123 Main St,Austin,TX,78701
456 Oak Ave,Dallas,TX,75201
```
✅ Asset types will be auto-classified
✅ Works perfectly for basic imports

### Full CSV (All Optional Fields)
```csv
address,city,state,zip_code,asset_type,asking_price,building_size,lot_size,owner_name,owner_phone,owner_email,title,description
123 Main St,Austin,TX,78701,Office,2500000,15000,0.5,John Smith,512-555-0100,john@example.com,Downtown Office Tower,Class A office space
```
✅ Asset type explicitly set
✅ All metadata included

### Update CSV (Re-Import with Changes)
```csv
address,city,state,zip_code,asking_price,building_size,owner_name
123 Main St,Austin,TX,78701,2600000,15500,John Smith Updated
```
✅ Same address → Updates existing property
✅ New price and size
✅ Preserves original creation date and status

---

## 🔄 Re-Import Workflow

### Scenario: Weekly Property List Updates

**Week 1: Initial Import**
```csv
address,city,state,zip_code,asset_type,asking_price,owner_name
123 Main St,Austin,TX,78701,Office,2500000,ABC Corp
456 Oak Ave,Austin,TX,78702,Retail,1800000,XYZ LLC
```
**Result:** 2 new properties created

**Week 2: Price Updates**
```csv
address,city,state,zip_code,asset_type,asking_price,owner_name
123 Main St,Austin,TX,78701,Office,2600000,ABC Corp
456 Oak Ave,Austin,TX,78702,Retail,1750000,XYZ LLC
789 Pine Rd,San Antonio,TX,78201,Industrial,3200000,New Owner
```
**Result:**
- ✅ 123 Main St → Price updated to $2,600,000
- ✅ 456 Oak Ave → Price updated to $1,750,000
- ✅ 789 Pine Rd → New property created
- **Total: 0 duplicates, 2 updated, 1 new**

**Week 3: Address Format Variations**
```csv
address,city,state,zip_code,asking_price
123 Main Street,Austin,TX,78701,2700000
```
**Result:** ✅ Still matches "123 Main St" → Updates property

---

## 🎯 Benefits

### For Your Team
1. **No Manual Cleanup**: System prevents duplicates automatically
2. **Flexible Formats**: Works with any CSV structure (as long as address fields exist)
3. **Auto-Classification**: Don't need to manually tag 100k properties
4. **Easy Updates**: Just re-import to refresh data
5. **Audit Trail**: `updated_at` tracks when properties were last refreshed

### Technical
1. **Normalized Matching**: Handles address variations
2. **Geospatial Fallback**: Lat/lng proximity catches edge cases
3. **Preserves History**: Original creation date maintained
4. **No Data Loss**: Updates only change what's in CSV

---

## 🧪 Testing the Smart Import

### Test 1: Auto-Classification
Upload `/app/test_properties_no_type.csv`
- Gas station should be classified as "Gas"
- Shopping plaza → "Retail"
- Warehouse → "Industrial"
- Medical center → "Office"
- Vacant lot → "Land"
- Apartment complex → "Multifamily"

### Test 2: Duplicate Detection
1. Upload `/app/test_properties.csv` (initial import)
2. Upload `/app/test_properties_update.csv` (contains same addresses with updated prices)
3. Verify: Properties are updated, not duplicated
4. Check import summary shows "X updated"

---

## ⚙️ Advanced Configuration

If you want to customize classification rules, edit:
`/app/backend/routes/map_crm/property_routes.py` → `classify_asset_type()` function

If you want to adjust duplicate tolerance, edit:
`find_existing_property()` → Change `0.0005` to wider/narrower radius

---

**Ready for testing!** The smart import system is now live. Please try uploading the test files and verify the behavior matches your expectations.
