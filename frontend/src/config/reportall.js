/**
 * ReportAll API Configuration
 * Parcel data provider for commercial real estate
 */

export const REPORTALL_CONFIG = {
  clientKey: 'xLEErUqdc7',
  
  // Vector Tiles endpoint (MapBox Vector Tiles format)
  // Supports zoom levels 14-17
  vectorTilesUrl: 'https://reportallusa.com/api/rest_services/client=xLEErUqdc7/outFields=parcel_id,owner,address,sale_price,mkt_val_tot,acreage_calc,land_use_class/ParcelsVectorTile/MapBoxVectorTileServer/tile/{z}/{x}/{y}.mvt',
  
  // API endpoints
  endpoints: {
    // Query parcels by point (for click identification)
    queryByPoint: 'https://reportallusa.com/api/parcels',
    
    // Query by address
    queryByAddress: 'https://reportallusa.com/api/parcels',
    
    // Query by owner
    queryByOwner: 'https://reportallusa.com/api/parcels',
    
    // Query by spatial intersection (polygon/bbox)
    queryBySpatial: 'https://reportallusa.com/api/parcels',
  },
  
  // Default query parameters
  defaultParams: {
    client: 'xLEErUqdc7',
    v: 9, // API version
    rpp: 10, // Results per page
  },
  
  // Zoom level constraints
  minZoom: 14,
  maxZoom: 17,
  
  // Layer styling
  style: {
    parcelLine: {
      color: '#00b8d4', // Cyan to match theme
      width: 1.5,
      opacity: 0.8,
    },
    parcelFill: {
      color: '#00b8d4',
      opacity: 0.1,
    },
    parcelHover: {
      color: '#00d4ff',
      opacity: 0.3,
    },
  },
};

export default REPORTALL_CONFIG;
