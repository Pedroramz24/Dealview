import axios from 'axios';
import REPORTALL_CONFIG from '../config/reportall';

/**
 * ReportAll API Service
 * Handles all interactions with ReportAll parcel data API
 */

class ReportAllService {
  constructor() {
    this.config = REPORTALL_CONFIG;
  }

  /**
   * Query parcel by point (lat/lon) - used for map clicks
   * @param {number} lon - Longitude
   * @param {number} lat - Latitude
   * @returns {Promise<Object>} - Parcel data
   */
  async queryByPoint(lon, lat) {
    try {
      const params = {
        ...this.config.defaultParams,
        spatial_intersect: `POINT(${lon} ${lat})`,
        si_srid: 4326, // WGS84 coordinate system
        return_buildings: true,
      };

      const response = await axios.get(this.config.endpoints.queryByPoint, { params });
      
      if (response.data.status === 'OK' && response.data.results?.length > 0) {
        return {
          success: true,
          parcel: response.data.results[0],
          count: response.data.count,
        };
      }

      return {
        success: false,
        message: 'No parcel found at this location',
      };
    } catch (error) {
      console.error('ReportAll queryByPoint error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Query parcels by address
   * @param {string} address - Street address
   * @param {string} region - City, County, State, or Zip
   * @returns {Promise<Object>} - Parcel data
   */
  async queryByAddress(address, region) {
    try {
      const params = {
        ...this.config.defaultParams,
        address,
        region,
        return_buildings: true,
      };

      const response = await axios.get(this.config.endpoints.queryByAddress, { params });
      
      if (response.data.status === 'OK') {
        return {
          success: true,
          parcels: response.data.results,
          count: response.data.count,
        };
      }

      return {
        success: false,
        message: 'No parcels found',
      };
    } catch (error) {
      console.error('ReportAll queryByAddress error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Query parcels by owner name
   * @param {string} ownerName - Owner name (Lastname Firstname)
   * @param {string} region - City, County, State, or Zip
   * @returns {Promise<Object>} - Parcel data
   */
  async queryByOwner(ownerName, region) {
    try {
      const params = {
        ...this.config.defaultParams,
        owner: ownerName,
        region,
        rpp: 50, // More results for owner search
        return_buildings: true,
      };

      const response = await axios.get(this.config.endpoints.queryByOwner, { params });
      
      if (response.data.status === 'OK') {
        return {
          success: true,
          parcels: response.data.results,
          count: response.data.count,
        };
      }

      return {
        success: false,
        message: 'No parcels found for this owner',
      };
    } catch (error) {
      console.error('ReportAll queryByOwner error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Query parcels by bounding box (viewport)
   * @param {Object} bounds - Map bounds {west, south, east, north}
   * @returns {Promise<Object>} - Parcel data
   */
  async queryByBbox(bounds) {
    try {
      const polygon = `POLYGON((${bounds.west} ${bounds.south},${bounds.east} ${bounds.south},${bounds.east} ${bounds.north},${bounds.west} ${bounds.north},${bounds.west} ${bounds.south}))`;
      
      const params = {
        ...this.config.defaultParams,
        spatial_intersect: polygon,
        si_srid: 4326,
        rpp: 100, // Limit results for viewport queries
        return_buildings: true,
      };

      const response = await axios.get(this.config.endpoints.queryBySpatial, { params });
      
      if (response.data.status === 'OK') {
        return {
          success: true,
          parcels: response.data.results,
          count: response.data.count,
        };
      }

      return {
        success: false,
        message: 'No parcels found in this area',
      };
    } catch (error) {
      console.error('ReportAll queryByBbox error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Format currency value
   * @param {string|number} value - Dollar amount
   * @returns {string} - Formatted currency
   */
  formatCurrency(value) {
    if (!value || value === '0.00') return 'N/A';
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(num);
  }

  /**
   * Format acreage value
   * @param {string|number} value - Acreage
   * @returns {string} - Formatted acreage
   */
  formatAcreage(value) {
    if (!value) return 'N/A';
    const num = parseFloat(value);
    return `${num.toFixed(2)} acres`;
  }

  /**
   * Format date value
   * @param {number} timestamp - Unix timestamp (milliseconds)
   * @returns {string} - Formatted date
   */
  formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

// Export singleton instance
export default new ReportAllService();
