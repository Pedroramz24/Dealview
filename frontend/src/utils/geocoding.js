// Geocoding utility using OpenStreetMap Nominatim (free, no API key)

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Geocode an address to lat/long coordinates
 * @param {string} address - Full address string
 * @returns {Promise<{lat: number, lon: number} | null>}
 */
export const geocodeAddress = async (address) => {
  if (!address || address.trim().length < 5) {
    return null;
  }

  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/search?` + new URLSearchParams({
        q: address,
        format: 'json',
        limit: '1',
        addressdetails: '1'
      }), 
      {
        headers: {
          'User-Agent': 'DealViewCRM/1.0' // Required by Nominatim
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

/**
 * Debounced geocoding for better UX
 * Returns a promise that resolves after delay
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
