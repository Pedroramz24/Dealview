/**
 * Professional-grade measurement utilities using Turf.js
 * Provides geodesic calculations with high accuracy for legal/commercial use
 */

import * as turf from '@turf/turf';

/**
 * Calculate area of a polygon in square feet and acres
 * Uses Turf.js for geodesic area calculation (accounts for Earth's curvature)
 * 
 * @param {Array} coordinates - Array of [lng, lat] coordinates
 * @returns {Object} - {sqft, acres, sqmeters}
 */
export const calculateArea = (coordinates) => {
  if (!coordinates || coordinates.length < 3) {
    return { sqft: 0, acres: 0, sqmeters: 0 };
  }

  try {
    // Create a polygon from coordinates
    // Turf expects coordinates in [lng, lat] format
    const polygon = turf.polygon([coordinates]);
    
    // Calculate geodesic area in square meters
    // This accounts for Earth's curvature and projection distortions
    const areaInSqMeters = turf.area(polygon);
    
    // Convert to square feet (1 sq meter = 10.7639104 sq ft)
    const sqft = areaInSqMeters * 10.7639104;
    
    // Convert to acres (1 acre = 43,560 sq ft)
    const acres = sqft / 43560;

    return {
      sqft: Math.round(sqft),
      acres: parseFloat(acres.toFixed(4)), // 4 decimal places for precision
      sqmeters: Math.round(areaInSqMeters)
    };
  } catch (error) {
    console.error('Error calculating area:', error);
    return { sqft: 0, acres: 0, sqmeters: 0 };
  }
};

/**
 * Calculate distance between points in feet and miles
 * Uses Turf.js geodesic distance calculation (great circle distance)
 * 
 * @param {Array} coordinates - Array of [lng, lat] coordinates
 * @returns {Object} - {feet, miles, meters, kilometers}
 */
export const calculateDistance = (coordinates) => {
  if (!coordinates || coordinates.length < 2) {
    return { feet: 0, miles: 0, meters: 0, kilometers: 0 };
  }

  try {
    // Create a LineString from coordinates
    const line = turf.lineString(coordinates);
    
    // Calculate total geodesic length in kilometers
    // Uses great circle distance for maximum accuracy
    const lengthInKm = turf.length(line, { units: 'kilometers' });
    
    // Convert to various units
    const meters = lengthInKm * 1000;
    const feet = meters * 3.28084;
    const miles = feet / 5280;

    return {
      feet: Math.round(feet),
      miles: parseFloat(miles.toFixed(3)), // 3 decimal places
      meters: Math.round(meters),
      kilometers: parseFloat(lengthInKm.toFixed(3))
    };
  } catch (error) {
    console.error('Error calculating distance:', error);
    return { feet: 0, miles: 0, meters: 0, kilometers: 0 };
  }
};

/**
 * Format measurement for display
 */
export const formatMeasurement = (measurement, type) => {
  if (type === 'area') {
    return {
      primary: `${measurement.sqft.toLocaleString()} SF`,
      secondary: `${measurement.acres.toLocaleString()} AC`,
      tertiary: `${measurement.sqmeters.toLocaleString()} m²`
    };
  } else if (type === 'distance') {
    return {
      primary: `${measurement.feet.toLocaleString()} FT`,
      secondary: `${measurement.miles.toLocaleString()} MI`,
      tertiary: `${measurement.meters.toLocaleString()} m`
    };
  }
  return { primary: 'N/A', secondary: 'N/A', tertiary: 'N/A' };
};

/**
 * Validate if coordinates form a valid polygon
 * Checks for self-intersections and minimum points
 */
export const validatePolygon = (coordinates) => {
  if (!coordinates || coordinates.length < 3) {
    return { valid: false, error: 'Minimum 3 points required' };
  }

  try {
    const polygon = turf.polygon([coordinates]);
    
    // Check if polygon is valid (no self-intersections)
    const kinks = turf.kinks(polygon);
    
    if (kinks.features.length > 0) {
      return { valid: false, error: 'Polygon has self-intersections' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

/**
 * Get accuracy information for display
 */
export const getAccuracyInfo = () => {
  return {
    method: 'Geodesic calculation using Turf.js',
    distanceAccuracy: '±0.1% to ±1%',
    areaAccuracy: '±0.5% to ±2%',
    projection: 'WGS84 Geographic (accounts for Earth curvature)',
    note: 'Professional GIS-grade accuracy. For legal purposes, verify with licensed surveyor.'
  };
};
