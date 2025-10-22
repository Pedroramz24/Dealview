# Parcel Information Display

## PropertyIntelligencePanel - Parcel View

When a user clicks on a parcel (with parcels enabled), the PropertyIntelligencePanel now displays comprehensive parcel information from ReportAll API in an organized, clean format matching the existing UI styling.

---

## Display Sections

### 1. **Header Section**
- **Parcel Address** - Full property address
- **Parcel ID Badge** - Monospace badge showing unique parcel identifier
- **Land Use Class Badge** - Green badge showing property classification (e.g., "Commercial", "Residential")
- **Create Deal Button** - Prominent gradient button to convert parcel to deal

---

### 2. **Owner Information** (Green accent section)
Displays owner details in a dedicated card:
- **Owner Name** - Property owner's full name
- **Mailing Address** - Owner's mailing address (if available)

**Styling:**
- Light green background (`rgba(0, 212, 170, 0.05)`)
- Green border and icon (`#00d4aa`)
- Users icon header

---

### 3. **Valuation & Sales** (Cyan accent section)
Financial information specific to parcels:

**Grid Layout (2 columns):**
- **Market Value** - Total market valuation (large, green emphasized)
- **Last Sale Price** - Most recent sale price
- **Land Value** - Assessed land value
- **Improvement Value** - Value of structures/improvements
- **Last Sale Date** - Date of most recent sale (full width, formatted)

**Styling:**
- Light cyan background (`rgba(0, 184, 212, 0.05)`)
- Cyan border and icon (`#00b8d4`)
- Dollar sign icon header
- Market value highlighted in bright green (`#00d4aa`)

---

### 4. **Property Details**
Organized list of property characteristics:

Each item in a card format with:
- **Lot Size** - Acreage with 2 decimal precision (e.g., "1.25 AC")
- **Building Size** - Square footage with comma formatting
- **Year Built** - Construction year
- **Zoning** - Zoning classification
- **County** - County name

**Styling:**
- Semi-transparent dark cards (`rgba(255, 255, 255, 0.03)`)
- Subtle borders (`rgba(255, 255, 255, 0.05)`)
- Label on left, value on right (justified)
- Consistent padding and spacing

---

## Data Field Mapping

### ReportAll API → Display

| ReportAll Field | Display Label | Format |
|----------------|---------------|--------|
| `parcel_id` | Parcel ID | Badge (monospace) |
| `land_use_class` | Badge | Green pill badge |
| `owner` / `owner_name` | Owner Name | Plain text |
| `owner_addr` | Mailing Address | Multiline text |
| `mkt_val_tot` / `market_value` | Market Value | Currency (USD, emphasized) |
| `sale_price` / `last_sale_price` | Last Sale Price | Currency (USD) |
| `land_val` / `land_value` | Land Value | Currency (USD) |
| `impr_val` / `improvement_value` | Improvement Value | Currency (USD) |
| `sale_date` / `last_sale_date` | Last Sale Date | Long date format |
| `acreage_calc` / `acreage` / `acres` | Lot Size | Number with 2 decimals + " AC" |
| `sqft` | Building Size | Comma-separated + " SF" |
| `year_built` | Year Built | Plain number |
| `zoning` | Zoning | Plain text |
| `county` | County | Plain text |
| `address` / `addr` | Parcel Address | Title (large, white) |

---

## Conditional Display

Fields only display if data is available (not null/undefined):
- Owner information section only shows if `owner` exists
- Mailing address only shows if `owner_addr` exists
- Last Sale Date only shows if `sale_date` or `last_sale_date` exists
- Each property detail row only renders if the field has a value

**Fallback:** "N/A" displayed for critical fields that are missing

---

## Visual Hierarchy

1. **Address** - Largest (20px, bold)
2. **Market Value** - Second largest (18px, bold, green glow)
3. **Section Headers** - Uppercase, 13px, accent colored
4. **Property Values** - 14-16px, white/colored
5. **Field Labels** - 11-13px, semi-transparent white

---

## Comparison: Deal vs Parcel View

| Feature | Deal View | Parcel View |
|---------|-----------|-------------|
| **Title Section** | Address + Asset Type + Stage | Address + Parcel ID + Land Use |
| **Primary Section** | Financial Overview (Asking Price, Lot Size, Cap Rate) | Owner Information (Owner Name, Mailing Address) |
| **Secondary Section** | Same | Valuation & Sales (Market Value, Sale Price, Land/Improvement Values) |
| **Details Section** | Full deal details (with inline editing) | Property Details (read-only) |
| **Actions** | Edit, Save, Share buttons | Create Deal button |
| **Contacts** | Linked contacts list | Not shown |
| **Documents** | Document upload/list | Not shown |

---

## Color Coding

- **Deal sections:** Cyan accents (`#00b8d4`)
- **Parcel Owner section:** Green accents (`#00d4aa`)
- **Parcel Valuation section:** Cyan accents (`#00b8d4`)
- **Market Value:** Bright green emphasis (`#00d4aa`)
- **Badges:**
  - Parcel ID: Cyan border (`#00b8d4`)
  - Land Use: Green border (`#00d4aa`)

---

## User Flow

1. User enables "Property Parcels" in Layer Manager
2. User zooms to level 12+
3. Parcel boundaries appear on map
4. User clicks on a parcel
5. PropertyIntelligencePanel slides in from left
6. Shows "Property Intelligence" header
7. Displays organized parcel information
8. User can review details
9. User clicks "Create Deal" to convert to deal
10. CreateDealPanel opens with parcel data pre-filled

---

## Technical Notes

- All currency values formatted with `Intl.NumberFormat` (USD, no decimals)
- Dates formatted with `toLocaleDateString` (long format)
- Numbers use `.toLocaleString()` for comma separators
- Acreage uses `.toFixed(2)` for consistent precision
- Conditional rendering prevents empty sections
- Matches dark theme with glass-morphism styling
- Responsive grid layouts (2 columns for financial data)
- Smooth transitions and hover effects maintained
