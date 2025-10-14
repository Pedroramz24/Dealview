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
                "fill-color": "rgba(0, 184, 212, 0.25)",
                "fill-outline-color": "#00b8d4"
            }
        },
        "clickFields": ["CNTY_NM", "FIPS_ST_CNTY_CD"],
        "defaultVisible": false
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
                "line-width": 3,
                "line-opacity": 0.9
            }
        },
        "clickFields": ["CITY_NM", "CITY_CODE"],
        "defaultVisible": false
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
                "fill-color": [
                    "case",
                    # Use Zoning field if Base is null
                    ["==", ["get", "Base"], None],
                    [
                        "match",
                        ["get", "Zoning"],
                        # Drainage/Streets - White
                        "DR", "#FFFFFF",
                        "UZROW", "#FFFFFF",
                        # Parks/Open Space
                        "NP-8", "#A8D5BA",
                        # Mobile Home
                        "MH", "#FFD54F",
                        # Default
                        "#E0E0E0"
                    ],
                    # Otherwise use Base field
                    [
                        "match",
                        ["get", "Base"],
                        # Low Density Residential - Light Green/Yellow shades
                        "R-1", "#C8E6C9",
                        "R-2", "#A5D6A7", 
                        "R-3", "#81C784",
                        "RE", "#DCEDC8",
                        "R-20", "#F0F4C3",
                        # Medium Density Residential - Green shades  
                        "R-4", "#66BB6A",
                        "R-5", "#4CAF50",
                        "R-6", "#388E3C",
                        # High Density Residential/Multi-Family - Darker Green
                        "RM-4", "#2E7D32",
                        "RM-5", "#1B5E20",
                        "RM-6", "#33691E",
                        # Multi-Family - Orange shades
                        "MF-18", "#FFB74D",
                        "MF-33", "#FF9800",
                        # Commercial - Red/Coral shades
                        "C-1", "#FF7043",
                        "C-2", "#F4511E",
                        "C-2NA", "#E64A19",
                        "C-3", "#D84315",
                        "C-3R", "#BF360C",
                        "C-3NA", "#DD2C00",
                        "NC", "#FF6F00",
                        # Office/Commercial Light - Teal shades
                        "OCL", "#4DB6AC",
                        "O-1", "#26A69A",
                        "O-2", "#00897B",
                        # Industrial - Purple shades
                        "I-1", "#AB47BC",
                        "I-2", "#8E24AA",
                        "MI-1", "#7B1FA2",
                        # Downtown - Blue
                        "D", "#1E88E5",
                        # Land/Special
                        "L", "#FFEB3B",
                        # Streets/ROW - White
                        "UZROW", "#FFFFFF",
                        "FR", "#9E9E9E",
                        # Default
                        "#E0E0E0"
                    ]
                ],
                "fill-opacity": 0.5,
                "fill-outline-color": "#FFFFFF"
            }
        },
        "labelConfig": {
            "textField": ["coalesce", ["get", "Base"], ["get", "Zoning"]],
            "textSize": 10,
            "textColor": "#FFFFFF",
            "textHaloColor": "#000000",
            "textHaloWidth": 1.5,
            "minzoom": 15,
            "minArea": 5000
        },
        "clickFields": ["Base", "BaseDescription", "Zoning", "ZoningDetail"],
        "defaultVisible": false
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
