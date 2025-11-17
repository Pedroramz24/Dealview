/**
 * Property Intelligence Service
 * Fetches zoning, utilities, and flood data from public APIs
 */

// San Antonio Open Data Portal
const SANANTONIO_BASE = 'https://opendata-cosagis.opendata.arcgis.com/datasets';
const SANANTONIO_GIS_BASE = 'https://services.arcgis.com/g1fRTDLeMgspWrYp/arcgis/rest/services';

// Austin Open Data Portal
const AUSTIN_BASE = 'https://services.austintexas.gov/arcgis/rest/services';

// FEMA Flood Map Service
const FEMA_BASE = 'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer';

/**
 * Get San Antonio Zoning Vector Tiles
 * Source: COSA Zoning layer from San Antonio GIS
 */
export const getSanAntonioZoningTiles = () => {
  // Using San Antonio's ArcGIS Feature Service
  // This returns vector tiles for zoning boundaries
  return 'https://services.arcgis.com/g1fRTDLeMgspWrYp/arcgis/rest/services/COSA_Zoning/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson';
};

/**
 * Get Austin Zoning Vector Tiles
 * Source: Austin Zoning from Austin GIS
 */
export const getAustinZoningTiles = () => {
  // Austin zoning data from their open data portal
  return 'https://services.austintexas.gov/arcgis/rest/services/Planning/Zoning/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson';
};

/**
 * Get FEMA Flood Zones (WMS)
 * Source: FEMA National Flood Hazard Layer
 * Coverage: Nationwide
 */
export const getFEMAFloodTiles = () => {
  // FEMA provides WMS service for flood zones
  // This is a raster tile service
  return {
    type: 'raster',
    tiles: [
      `${FEMA_BASE}/export?bbox={bbox-epsg-3857}&size=256,256&format=png&transparent=true&f=image&layers=show:28`
    ],
    tileSize: 256
  };
};

/**
 * Get San Antonio Water/Sewer Infrastructure
 * Source: San Antonio Stormwater data
 */
export const getSanAntonioWaterSewerTiles = () => {
  // Stormwater infrastructure from SA Open Data
  return 'https://services.arcgis.com/g1fRTDLeMgspWrYp/arcgis/rest/services/Stormwater_Infrastructure/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson';
};

/**
 * Query zoning info for a specific point
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} city - 'sanantonio' or 'austin'
 */
export const queryZoningAtPoint = async (lat, lng, city) => {
  try {
    let url;
    if (city === 'sanantonio') {
      url = `https://services.arcgis.com/g1fRTDLeMgspWrYp/arcgis/rest/services/COSA_Zoning/FeatureServer/0/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;
    } else if (city === 'austin') {
      url = `https://services.austintexas.gov/arcgis/rest/services/Planning/Zoning/MapServer/0/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=false&f=json`;
    } else {
      return null;
    }

    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return data.features[0].attributes;
    }
    return null;
  } catch (error) {
    console.error('Error querying zoning:', error);
    return null;
  }
};

/**
 * Query FEMA flood zone for a specific point
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
export const queryFloodZoneAtPoint = async (lat, lng) => {
  try {
    const url = `${FEMA_BASE}/identify?geometry=${lng},${lat}&geometryType=esriGeometryPoint&sr=4326&layers=all:28&tolerance=1&mapExtent=-180,-90,180,90&imageDisplay=400,400,96&returnGeometry=false&f=json`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results[0].attributes;
    }
    return null;
  } catch (error) {
    console.error('Error querying flood zone:', error);
    return null;
  }
};

/**
 * Determine which city API to use based on coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
export const getCityFromCoordinates = (lat, lng) => {
  // San Antonio roughly: 29.4241° N, 98.4936° W
  // Austin roughly: 30.2672° N, 97.7431° W
  
  // Simple bounding box detection
  if (lat >= 29.2 && lat <= 29.7 && lng >= -98.8 && lng <= -98.2) {
    return 'sanantonio';
  } else if (lat >= 30.0 && lat <= 30.6 && lng >= -98.0 && lng <= -97.4) {
    return 'austin';
  }
  
  return null; // Outside supported areas
};

export default {
  getSanAntonioZoningTiles,
  getAustinZoningTiles,
  getFEMAFloodTiles,
  getSanAntonioWaterSewerTiles,
  queryZoningAtPoint,
  queryFloodZoneAtPoint,
  getCityFromCoordinates
};
