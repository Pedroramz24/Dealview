# Debug Checklist for Parcel Toggle & Street Labels

## Issue 1: Parcel Toggle Not Visible

### What Should Happen:
In the Layer Manager panel, under the "BASE MAP" section, you should see:
1. Street Labels toggle
2. Property Parcels toggle

### Debug Steps:

1. **Open Layer Manager**
   - Click the "Layers & Intelligence" button (left side of map, with layered icon)
   - Panel should slide in from the left

2. **Check Base Map Section**
   - Look for a section with "BASE MAP" header (in uppercase)
   - Should have a light blue background
   - Should be located ABOVE the layer categories (Administrative, Environmental, etc.)

3. **Check Browser Console**
   ```javascript
   // Open browser DevTools (F12)
   // Check for any React errors related to LayerManager
   // Look for prop errors or undefined callback errors
   ```

4. **Verify Props Are Being Passed**
   ```javascript
   // In browser console, check if MapView state exists:
   // React DevTools -> MapView component -> State
   // Should see:
   // - showReportAllParcels: false
   // - showStreetLabels: false
   // - viewState.zoom: (current zoom level)
   ```

### Possible Causes:
- [ ] LayerManager not receiving `showParcels` or `onToggleParcels` props
- [ ] React component not re-rendering after prop changes
- [ ] CSS issue hiding the toggle
- [ ] JavaScript error preventing render

---

## Issue 2: Street Labels Not Showing

### What Should Happen:
When you:
1. Switch to Satellite view
2. Zoom to level 13 or higher
3. Toggle "Street Labels" ON
→ Street/road names should appear as labels overlaid on the satellite imagery

### Debug Steps:

1. **Check Prerequisites**
   - [ ] Map style is set to "Satellite" (not "Street")
   - [ ] Zoom level is 13 or higher (check bottom right of map)
   - [ ] Street Labels toggle in Layer Manager shows "ON"

2. **Check Browser Network Tab**
   ```
   Open DevTools → Network tab
   Filter: "stamen" or "terrain_labels"
   Should see tile requests like:
   https://tiles.stadiamaps.com/tiles/stamen_terrain_labels/13/2048/3072.png
   ```
   - If requests are failing (404, 403): Tile service issue
   - If no requests at all: Source not being added to map

3. **Check MapLibre Layers**
   ```javascript
   // In browser console:
   const map = document.querySelector('[data-testid="map-container"]');
   if (map) {
     const style = map.getMap().getStyle();
     console.log('Sources:', style.sources);
     console.log('Layers:', style.layers.map(l => l.id));
   }
   // Should see 'stamen-labels' in sources
   // Should see 'street-labels-layer' in layers
   ```

4. **Check React State**
   ```javascript
   // React DevTools → MapView component
   // Check state: showStreetLabels should be true when toggle is ON
   ```

5. **Alternative Test: Try Different Tile Source**
   If Stamen tiles aren't loading, we can try OSM tiles:
   ```javascript
   // Temporary test in browser console:
   https://tile.openstreetmap.org/13/2048/3072.png
   // If this loads, it's a Stamen-specific issue
   ```

### Possible Causes:
- [ ] `showStreetLabels` state not updating when toggle is clicked
- [ ] Conditional not evaluating correctly (mapStyle !== 'satellite' or zoom < 13)
- [ ] Tile source URL blocked or rate-limited
- [ ] Z-index issue (labels rendering behind satellite layer)
- [ ] MapLibre Source/Layer not being added correctly

---

## Quick Test Commands

### Check if Changes Compiled:
```bash
tail -f /var/log/supervisor/frontend.out.log
# Should see "Compiled successfully!"
```

### Check for JavaScript Errors:
```bash
tail -f /var/log/supervisor/frontend.err.log
```

### Restart Frontend (if needed):
```bash
sudo supervisorctl restart frontend
```

---

## Expected File Contents

### MapView.js (Line ~388-397):
```javascript
<LayerManager
  isOpen={layersPanelOpen}
  onClose={() => setLayersPanelOpen(false)}
  showStreetLabels={showStreetLabels}
  onToggleStreetLabels={() => setShowStreetLabels(!showStreetLabels)}
  showParcels={showReportAllParcels}
  onToggleParcels={() => setShowReportAllParcels(!showReportAllParcels)}
  mapStyle={mapStyle}
  currentZoom={viewState.zoom}
  propertyPanelOpen={propertyPanelOpen || createDealPanelOpen}
/>
```

### LayerManager.js Base Map Section (should exist):
```javascript
{/* Base Map Controls Section */}
<div style={{ padding: '12px 24px 16px', ... }}>
  <div style={{ marginBottom: '8px' }}>
    <span>BASE MAP</span>
  </div>
  
  {/* Street Labels Toggle */}
  <div>...</div>
  
  {/* Parcel Layer Toggle */}
  <div>
    <div>Property Parcels</div>
    <button onClick={props.onToggleParcels}>
      {props.showParcels ? 'ON' : 'OFF'}
    </button>
  </div>
</div>
```

---

## Alternative: Manual Verification

If debugging is too complex, please share:
1. Screenshot of Layer Manager panel when open
2. Browser console output (any errors)
3. Network tab filtered by "stamen" or "label"
4. React DevTools screenshot showing MapView state

This will help me identify the exact issue!
