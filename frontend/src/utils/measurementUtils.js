/**
 * Utility functions for map measurements
 */

/**
 * Calculate area of a polygon in square feet and acres
 * @param {Array} coordinates - Array of [lng, lat] coordinates
 * @returns {Object} - {sqft, acres}
 */
export const calculateArea = (coordinates) => {
  if (!coordinates || coordinates.length < 3) {
    return { sqft: 0, acres: 0 };
  }

  // Use the Shoelace formula for polygon area
  let area = 0;
  const coords = [...coordinates];
  
  // Close the polygon if not already closed
  if (coords[0][0] !== coords[coords.length - 1][0] || 
      coords[0][1] !== coords[coords.length - 1][1]) {
    coords.push(coords[0]);
  }

  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    area += x1 * y2 - x2 * y1;
  }

  area = Math.abs(area) / 2;

  // Convert from degrees squared to square meters (approximate)
  // At equator: 1 degree = ~111km
  const lat = coordinates[0][1];
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(lat * Math.PI / 180);
  
  const areaInSqMeters = area * metersPerDegreeLat * metersPerDegreeLng;
  
  // Convert to square feet (1 sq meter = 10.764 sq ft)
  const sqft = areaInSqMeters * 10.764;
  
  // Convert to acres (1 acre = 43,560 sq ft)
  const acres = sqft / 43560;

  return {
    sqft: Math.round(sqft),
    acres: parseFloat(acres.toFixed(2))
  };
};

/**
 * Calculate distance between points in feet and miles
 * @param {Array} coordinates - Array of [lng, lat] coordinates
 * @returns {Object} - {feet, miles}
 */
export const calculateDistance = (coordinates) => {
  if (!coordinates || coordinates.length < 2) {
    return { feet: 0, miles: 0 };
  }

  let totalDistance = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lng1, lat1] = coordinates[i];
    const [lng2, lat2] = coordinates[i + 1];
    
    // Haversine formula for distance between two points
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    totalDistance += R * c; // Distance in meters
  }

  // Convert meters to feet (1 meter = 3.28084 feet)
  const feet = totalDistance * 3.28084;
  
  // Convert feet to miles (1 mile = 5280 feet)
  const miles = feet / 5280;

  return {
    feet: Math.round(feet),
    miles: parseFloat(miles.toFixed(2))
  };
};

/**
 * Format measurement for display
 */
export const formatMeasurement = (measurement, type) => {
  if (type === 'area') {
    return {
      primary: `${measurement.sqft.toLocaleString()} SF`,
      secondary: `${measurement.acres.toLocaleString()} AC`
    };
  } else if (type === 'distance') {
    return {
      primary: `${measurement.feet.toLocaleString()} FT`,
      secondary: `${measurement.miles.toLocaleString()} MI`
    };
  }
  return { primary: 'N/A', secondary: 'N/A' };
};
