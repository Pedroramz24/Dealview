# Features to Remove - Detailed Checklist

## 1. Email Campaign System

### Backend Files to Delete
- [ ] `/app/backend/routes/email_campaigns.py`
- [ ] `/app/backend/routes/email_templates.py`
- [ ] `/app/backend/services/email_service.py` (if dedicated)

### Frontend Files to Delete
- [ ] `/app/frontend/src/pages/EmailCampaigns/` (entire folder)
- [ ] `/app/frontend/src/components/EmailCampaignBuilder.js`
- [ ] `/app/frontend/src/components/EmailTemplateEditor.js`

### Code Search & Clean
- [ ] Search for: `email_campaign`, `EmailCampaign`, `/email-campaigns`
- [ ] Remove from App.js routes
- [ ] Remove from navigation/sidebar
- [ ] Remove from server.py router includes

### Database
- [ ] Drop table: `email_campaigns`
- [ ] Drop table: `email_templates`
- [ ] Drop table: `email_schedules`
- [ ] Drop table: `email_tracking`

---

## 2. Zoning Layers

### Files to Modify
- [ ] `/app/frontend/src/pages/MapView.js`
  - Remove: `austinZoningData` state
  - Remove: `showAustinZoning` state
  - Remove: `fetchAustinZoning` useEffect
  - Remove: Austin zoning Source/Layer components

- [ ] `/app/frontend/src/components/LayerManager.js`
  - Remove: Zoning layer toggle/controls

- [ ] `/app/backend/routes/intelligence.py`
  - Remove: `/intelligence/layer/austin-zoning` endpoint
  - Remove: `/intelligence/layer/sa-zoning` endpoint

### Code Search & Clean
- [ ] Search for: `zoning`, `Zoning`, `austin-zoning`, `sa-zoning`
- [ ] Remove all zoning-related state management
- [ ] Remove zoning API calls

### No Database Changes
(Zoning uses external API, no local tables)

---

## 3. Parcel Layers

### Files to Delete
- [ ] `/app/frontend/src/config/reportall.js`
- [ ] `/app/backend/services/reportall_service.py` (if exists)

### Files to Modify
- [ ] `/app/frontend/src/pages/MapView.js`
  - Remove: `selectedParcelIds` state
  - Remove: `selectedBexarParcelIds` state
  - Remove: `parcelData` state
  - Remove: `showReportAllParcels` state
  - Remove: `showBexarParcels` state
  - Remove: All parcel layer Source/Layer components
  - Remove: PMTiles protocol (if only used for parcels)
  - Remove: ParcelPopup component usage
  - Remove: Parcel click handlers

- [ ] `/app/frontend/src/components/LayerManager.js`
  - Remove: Parcel layer toggles

- [ ] `/app/frontend/src/components/ParcelPopup.js`
  - DELETE entire file

### Code Search & Clean
- [ ] Search for: `parcel`, `Parcel`, `reportall`, `ReportAll`, `bexar`, `Bexar`
- [ ] Search for: `robust_id`, `AcctNumb`
- [ ] Remove: `import { PMTiles, Protocol } from 'pmtiles'` (if not used elsewhere)
- [ ] Remove: `maplibregl.addProtocol('pmtiles', ...)` (if not used elsewhere)

### No Database Changes
(Parcels use external vector tiles, no local tables)

---

## 4. FEMA Flood Zones

### Files to Modify
- [ ] `/app/frontend/src/pages/MapView.js`
  - Remove: `floodZoneData` state
  - Remove: `showFloodZones` state
  - Remove: `fetchFloodZones` useEffect
  - Remove: Flood zone Source/Layer components

- [ ] `/app/frontend/src/components/LayerManager.js`
  - Remove: Flood zone toggle

- [ ] `/app/backend/routes/intelligence.py`
  - Remove: `/intelligence/layer/fema-flood` endpoint (if exists)

### Code Search & Clean
- [ ] Search for: `flood`, `Flood`, `fema`, `FEMA`, `floodplain`
- [ ] Remove flood zone API calls

### No Database Changes
(Flood zones use external API, no local tables)

---

## 5. Water & Sewer Layers

### Files to Modify
- [ ] `/app/frontend/src/pages/MapView.js`
  - Remove: `waterSewerData` state
  - Remove: `showWaterSewer` state
  - Remove: `fetchWaterSewer` useEffect
  - Remove: Water/sewer Source/Layer components

- [ ] `/app/frontend/src/components/LayerManager.js`
  - Remove: Water/sewer toggle

- [ ] `/app/backend/routes/intelligence.py`
  - Remove: `/intelligence/layer/sa-water-sewer` endpoint

### Code Search & Clean
- [ ] Search for: `water`, `Water`, `sewer`, `Sewer`, `waterSewer`
- [ ] Remove water/sewer API calls

### No Database Changes
(Water/sewer uses external API, no local tables)

---

## 6. AI Operations Dashboard

### Backend Files to Delete
- [ ] `/app/backend/routes/ai_operations.py`
- [ ] `/app/backend/services/ai_operations_service.py`

### Frontend Files to Delete
- [ ] `/app/frontend/src/pages/AIOperations/` (entire folder)
- [ ] `/app/frontend/src/pages/AIOperationsDashboard.js`
- [ ] `/app/frontend/src/components/AIInsightsWidget.js`
- [ ] `/app/frontend/src/components/AIReportsPanel.js`

### Code Search & Clean
- [ ] Search for: `ai_operation`, `AIOperation`, `/ai-operations`
- [ ] Remove from App.js routes
- [ ] Remove from navigation/sidebar
- [ ] Remove from server.py router includes

### Database
- [ ] Drop table: `ai_operations`
- [ ] Drop table: `ai_insights`
- [ ] Drop table: `ai_reports`

---

## LayerManager.js - Final State

### What to KEEP in LayerManager
```javascript
// KEEP THESE ONLY:
- Map Style Toggle (satellite vs street)
- Team Deals Toggle (show/hide team member deals)
```

### What to REMOVE from LayerManager
```javascript
// REMOVE ALL OF THESE:
- Zoning layer toggle
- Parcel layer toggle (ReportAll)
- Parcel layer toggle (Bexar CAD)
- Flood zone toggle
- Water/Sewer toggle
- Any other layer toggles
```

---

## MapView.js - Simplified State

### States to KEEP
```javascript
const [deals, setDeals] = useState([]);
const [teamDeals, setTeamDeals] = useState([]);
const [showTeamDeals, setShowTeamDeals] = useState(false);
const [mapStyle, setMapStyle] = useState('satellite'); // or similar
const [measurementMode, setMeasurementMode] = useState(null);
const [measurementPoints, setMeasurementPoints] = useState([]);
// ... other essential states
```

### States to REMOVE
```javascript
// DELETE ALL OF THESE:
const [austinZoningData, setAustinZoningData] = useState(...);
const [showAustinZoning, setShowAustinZoning] = useState(false);
const [parcelData, setParcelData] = useState(...);
const [showReportAllParcels, setShowReportAllParcels] = useState(false);
const [selectedParcelIds, setSelectedParcelIds] = useState([]);
const [selectedBexarParcelIds, setSelectedBexarParcelIds] = useState([]);
const [floodZoneData, setFloodZoneData] = useState(...);
const [showFloodZones, setShowFloodZones] = useState(false);
const [waterSewerData, setWaterSewerData] = useState(...);
const [showWaterSewer, setShowWaterSewer] = useState(false);
```

---

## Navigation Cleanup

### App.js Routes to REMOVE
```javascript
<Route path="/email-campaigns" ... /> ❌
<Route path="/ai-operations" ... /> ❌
<Route path="/ai-dashboard" ... /> ❌
```

### Sidebar/Menu Items to REMOVE
- Email Campaigns menu item ❌
- AI Operations menu item ❌
- AI Dashboard menu item ❌

---

## Testing Checklist After Removal

### Functionality Tests
- [ ] App loads without console errors
- [ ] Login works
- [ ] Dashboard loads
- [ ] Map view loads
- [ ] Map style toggle works
- [ ] Team deals toggle works
- [ ] Measurement tools work
- [ ] Can create deals
- [ ] Can view contacts
- [ ] Pipeline management works
- [ ] DealVisor loads
- [ ] Can import CSV

### Code Quality Tests
- [ ] No unused imports
- [ ] No broken import paths
- [ ] No undefined variables/functions
- [ ] No 404 errors for removed routes
- [ ] No database query errors
- [ ] Linting passes (frontend)
- [ ] Linting passes (backend)

### Console Checks
- [ ] No "Cannot find module" errors
- [ ] No "undefined is not a function" errors
- [ ] No "Failed to fetch" errors for removed endpoints
- [ ] No layer-related errors

---

## Estimated Time per Section

1. Email Campaigns: ~45 minutes
2. Zoning Layers: ~30 minutes
3. Parcel Layers: ~60 minutes (complex)
4. Flood Zones: ~20 minutes
5. Water/Sewer: ~20 minutes
6. AI Operations: ~45 minutes
7. Testing: ~60 minutes

**Total: ~4-5 hours**

---

**Last Updated:** 2025-01-16
**Status:** Ready for execution
