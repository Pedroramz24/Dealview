# MapLibre Layer Implementation Guide

## Problem Analysis

**Working:** Parcel layer (ReportAll vector tiles)  
**Not Working:** Street labels, FEMA floodplain, Zoning layers

## Root Cause: Missing Critical Properties

### Successful Parcel Layer Configuration

```javascript
<Source
  id="reportall-parcels"
  type="vector"
  tiles={[URL]}              // ✅ Array format
  minzoom={14}
  maxzoom={17}
  promoteId={{ parcels: 'robust_id' }}
  scheme="xyz"               // ✅ CRITICAL
  tileSize={512}             // ✅ CRITICAL
>
  <Layer
    id="reportall-parcels-fill"
    type="fill"
    source-layer="parcels"   // ✅ Exact layer name
    paint={{...}}
  />
</Source>
```

### What Was Missing in Failed Implementations

1. **`scheme="xyz"`** - Tile coordinate scheme
2. **`tileSize={512}`** - Explicit tile size
3. **Proper source-layer names** - Must match tile schema

---

## Solution Template for All Vector Tile Layers

### Pattern to Follow (Copy Parcel Implementation)

```javascript
<Source
  id="[unique-id]"
  type="vector"
  tiles={['https://[tile-server]/{z}/{x}/{y}.mvt']}
  minzoom={[min]}
  maxzoom={[max]}
  scheme="xyz"           // MUST HAVE
  tileSize={512}         // MUST HAVE - or 256 depending on tile server
>
  <Layer
    id="[layer-id]"
    type="[fill|line|symbol]"
    source-layer="[exact-layer-name-from-tiles]"
    paint={{...}}
  />
</Source>
```

---

## Implementing FEMA Floodplain Layer

### Option 1: FEMA Vector Tiles (If Available)

```javascript
<Source
  id="fema-floodplain"
  type="vector"
  tiles={['https://hazards.fema.gov/gis/nfhl/services/public/NFHL/MapServer/VectorTileServer/tile/{z}/{x}/{y}.pbf']}
  minzoom={8}
  maxzoom={16}
  scheme="xyz"
  tileSize={512}
>
  <Layer
    id="fema-flood-zones"
    type="fill"
    source-layer="FLD_HAZ_AR"  // FEMA flood hazard areas layer
    filter={['in', 'FLD_ZONE', 'A', 'AE', 'AO', 'AH', 'V', 'VE']}
    paint={{
      'fill-color': [
        'match',
        ['get', 'FLD_ZONE'],
        'V', '#FF0000',      // High risk
        'VE', '#FF0000',
        'A', '#FF6B6B',      // Medium-high risk
        'AE', '#FF6B6B',
        'AO', '#FFA500',     // Medium risk
        'AH', '#FFA500',
        '#FFEB3B'            // Default
      ],
      'fill-opacity': 0.3
    }}
  />
  <Layer
    id="fema-flood-zones-outline"
    type="line"
    source-layer="FLD_HAZ_AR"
    paint={{
      'line-color': '#FF0000',
      'line-width': 1,
      'line-opacity': 0.6
    }}
  />
</Source>
```

### Option 2: Convert FEMA Raster to Vector

If FEMA only provides WMS/raster, you'll need to:
1. Download FEMA shapefiles
2. Convert to vector tiles (`.mvt`)
3. Host tiles yourself or use a tile server

---

## Implementing Zoning Layer

### San Antonio Zoning Example

```javascript
<Source
  id="sa-zoning"
  type="vector"
  tiles={['https://[your-tile-server]/zoning/{z}/{x}/{y}.mvt']}
  minzoom={12}
  maxzoom={18}
  scheme="xyz"
  tileSize={512}
>
  <Layer
    id="zoning-fill"
    type="fill"
    source-layer="zoning"  // Must match your tile layer name
    paint={{
      'fill-color': [
        'match',
        ['get', 'zone_type'],
        'R-1', '#FFEB3B',      // Residential - Yellow
        'R-2', '#FDD835',
        'C-1', '#FF6B6B',      // Commercial - Red
        'C-2', '#F44336',
        'I-1', '#9C27B0',      // Industrial - Purple
        'I-2', '#7B1FA2',
        '#CCCCCC'              // Default
      ],
      'fill-opacity': 0.4
    }}
  />
  <Layer
    id="zoning-outline"
    type="line"
    source-layer="zoning"
    paint={{
      'line-color': '#000000',
      'line-width': 1,
      'line-opacity': 0.5
    }}
  />
  <Layer
    id="zoning-labels"
    type="symbol"
    source-layer="zoning"
    minzoom={15}
    layout={{
      'text-field': ['get', 'zone_type'],
      'text-size': 11,
      'text-anchor': 'center'
    }}
    paint={{
      'text-color': '#000000',
      'text-halo-color': '#FFFFFF',
      'text-halo-width': 1
    }}
  />
</Source>
```

---

## Key Differences: MapLibre vs Leaflet

### MapLibre GL (Current)
- ✅ Excellent for vector tiles
- ✅ High performance
- ✅ Modern rendering
- ❌ Difficult with raster overlays
- ❌ Complex layer configuration

### Leaflet
- ✅ Easy raster overlay support
- ✅ Simple API
- ✅ Many plugins available
- ❌ Less performant with large datasets
- ❌ Requires plugin for vector tiles

---

## Why Parcels Work But Others Don't

1. **ReportAll provides proper MVT tiles** with correct schema
2. **Well-documented source-layer names**
3. **Proper tile server configuration** (xyz scheme, 512 tile size)
4. **Consistent tile format** across zoom levels

For other layers to work, they MUST:
- Be true vector tiles (`.mvt` or `.pbf`)
- Have documented source-layer names
- Support xyz tile scheme
- Provide tiles at appropriate zoom levels

---

## Debugging Checklist

When a layer doesn't appear:

1. **Check browser console for tile requests**
   - Look for `.mvt` or `.pbf` requests
   - Check for 404 or CORS errors

2. **Verify source exists**
   ```javascript
   const map = mapRef.current.getMap();
   const style = map.getStyle();
   console.log('Sources:', Object.keys(style.sources));
   ```

3. **Verify layers exist**
   ```javascript
   console.log('Layers:', style.layers.map(l => l.id));
   ```

4. **Inspect tile content** (use browser dev tools)
   - Check Network tab for tile requests
   - Verify tiles return data (not empty)

5. **Verify source-layer name matches tile schema**
   - Download a sample tile
   - Inspect with `vt2geojson` or similar tool

---

## Recommended Approach for FEMA & Zoning

### Short-term (Quick Win)
Use existing public vector tile services if available:
- FEMA National Flood Hazard Layer (if vector tiles exist)
- City GIS portal vector tiles (San Antonio open data)

### Long-term (Full Control)
1. Obtain authoritative data (shapefiles)
2. Convert to vector tiles using `tippecanoe`
3. Host on your own tile server (or use Mapbox/Maptiler)
4. Use exact same pattern as parcel layer

---

## Next Steps

1. **Verify street labels work** with new configuration
2. **Find FEMA vector tile source** (check FEMA API docs)
3. **Find SA zoning vector tiles** (check city open data portal)
4. **If no vector tiles available**: Consider tile conversion pipeline
5. **Alternative**: Request user to provide tile URLs for their area
