/**
 * ReportAll API Configuration
 * Parcel data provider for commercial real estate
 */

export const REPORTALL_CONFIG = {
  clientKey: process.env.REACT_APP_REPORTALL_CLIENT_KEY || 'xLEErUqdc7',
  
  // Vector Tiles endpoint (MapBox Vector Tiles format)
  // Supports zoom levels 14-17
  vectorTilesUrl: `${process.env.REACT_APP_REPORTALL_BASE_URL || 'https://reportallusa.com'}/api/rest_services/client=${process.env.REACT_APP_REPORTALL_CLIENT_KEY || 'xLEErUqdc7'}/outFields=parcel_id,owner,address,sale_price,mkt_val_tot,acreage_calc,land_use_class/ParcelsVectorTile/MapBoxVectorTileServer/tile/{z}/{x}/{y}.mvt`,
  
  // API endpoints
  endpoints: {
    // Query parcels by point (for click identification)
    queryByPoint: `${process.env.REACT_APP_REPORTALL_BASE_URL || 'https://reportallusa.com'}/api/parcels`,
    
    // Query by address
    queryByAddress: `${process.env.REACT_APP_REPORTALL_BASE_URL || 'https://reportallusa.com'}/api/parcels`,
    
    // Query by owner
    queryByOwner: `${process.env.REACT_APP_REPORTALL_BASE_URL || 'https://reportallusa.com'}/api/parcels`,
    
    // Query by spatial intersection (polygon/bbox)
    queryBySpatial: `${process.env.REACT_APP_REPORTALL_BASE_URL || 'https://reportallusa.com'}/api/parcels`,
  },
  
  // Default query parameters
  defaultParams: {
    client: process.env.REACT_APP_REPORTALL_CLIENT_KEY || 'xLEErUqdc7',
    v: 9, // API version
    rpp: 10, // Results per page
  },
  
  // Zoom level constraints
  minZoom: 14,
  maxZoom: 17,
  
  // Layer styling
  style: {
    parcelLine: {
      color: '#ff0000', // Cyan to match theme
      width: 1.5,
      opacity: 0.8,
    },
    parcelFill: {
      color: '#ff0000',
      opacity: 0.1,
    },
    parcelHover: {
      color: '#ff0000',
      opacity: 0.3,
    },
  },
};

export default REPORTALL_CONFIG;
