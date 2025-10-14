# Layer Registry - Defines all available GIS layers and their sources
# This configuration maps to public ArcGIS REST endpoints

LAYER_REGISTRY = {
    # Administrative Boundaries
    "counties": {
        "id": "counties",
        "name": "Counties",
        "description": "Texas county boundaries",
        "category": "administrative",
        "source": {
            "type": "arcgis",
            "url": "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/Texas_County_Boundaries/FeatureServer/0",
            "method": "query"
        },
        "style": {
            "type": "fill",
            "paint": {
                "fill-color": "rgba(0, 184, 212, 0.1)",
                "fill-outline-color": "rgba(0, 184, 212, 0.5)"
            }
        },
        "clickFields": ["CNTY_NM", "FIPS_ST_CNTY_CD"]
    },
    "city_limits": {
        "id": "city_limits",
        "name": "City Limits",
        "description": "San Antonio city limits",
        "category": "administrative",
        "source": {
            "type": "arcgis",
            "url": "https://services.arcgis.com/g1fRTDLeMgspWrYp/arcgis/rest/services/City_Limits/FeatureServer/0",
            "method": "query"
        },
        "style": {
            "type": "line",
            "paint": {
                "line-color": "#00b8d4",
                "line-width": 2
            }
        },
        "clickFields": ["CITY_NM", "CITY_CODE"]
    },
    
    # Environmental
    "fema_floodplain": {
        "id": "fema_floodplain",
        "name": "FEMA Floodplain",
        "description": "100-year and 500-year flood zones",
        "category": "environmental",
        "source": {
            "type": "arcgis",
            "url": "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28",
            "method": "query"
        },
        "style": {
            "type": "fill",
            "paint": {
                "fill-color": "rgba(64, 158, 255, 0.3)",
                "fill-outline-color": "rgba(64, 158, 255, 0.7)"
            }
        },
        "clickFields": ["FLD_ZONE", "ZONE_SUBTY", "STATIC_BFE"]
    },
    
    # Planning & Zoning
    "sa_zoning": {
        "id": "sa_zoning",
        "name": "San Antonio Zoning",
        "description": "Current zoning designations",
        "category": "planning",
        "source": {
            "type": "arcgis",
            "url": "https://services.arcgis.com/g1fRTDLeMgspWrYp/arcgis/rest/services/COSA_Zoning/FeatureServer/12",
            "method": "query"
        },
        "style": {
            "type": "fill",
            "paint": {
                "fill-color": "rgba(255, 193, 7, 0.2)",
                "fill-outline-color": "rgba(255, 193, 7, 0.6)"
            }
        },
        "clickFields": ["ZONING_CODE", "ZONING_NAME", "DESCRIPTION"]
    },
    
    # Infrastructure
    "saws_water": {
        "id": "saws_water",
        "name": "SAWS Water/Sewer",
        "description": "Water and sewer service areas",
        "category": "infrastructure",
        "source": {
            "type": "arcgis",
            "url": "https://services.arcgis.com/g1fRTDLeMgspWrYp/arcgis/rest/services/SAWS_Service_Area/FeatureServer/0",
            "method": "query"
        },
        "style": {
            "type": "fill",
            "paint": {
                "fill-color": "rgba(33, 150, 243, 0.2)",
                "fill-outline-color": "rgba(33, 150, 243, 0.6)"
            }
        },
        "clickFields": ["SERVICE_TYPE", "PROVIDER"]
    },
    
    # Transportation
    "txdot_projects": {
        "id": "txdot_projects",
        "name": "TxDOT Projects",
        "description": "Planned highway improvements",
        "category": "transportation",
        "source": {
            "type": "arcgis",
            "url": "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_Projects/FeatureServer/0",
            "method": "query"
        },
        "style": {
            "type": "line",
            "paint": {
                "line-color": "#ff9800",
                "line-width": 3
            }
        },
        "clickFields": ["PROJECT_NAME", "STATUS", "EST_COST"]
    }
}

# Cache configuration
CACHE_TTL = 3600  # 1 hour in seconds
MAX_CACHE_SIZE = 100  # Maximum number of cached queries

# Rate limiting configuration
RATE_LIMIT_REQUESTS = 60  # requests per window
RATE_LIMIT_WINDOW = 60  # seconds
