"""Comprehensive asset type definitions for CRE marketplace."""

COMPREHENSIVE_ASSET_TYPES = [
    # Office
    "Office - Class A",
    "Office - Class B",
    "Office - Class C",
    "Office - Medical",
    "Office - Creative",
    "Office - Flex",
    
    # Retail
    "Retail - Shopping Center",
    "Retail - Strip Center",
    "Retail - Power Center",
    "Retail - Neighborhood Center",
    "Retail - Single Tenant",
    "Retail - Restaurant",
    "Retail - Convenience Store",
    "Retail - Gas Station",
    
    # Industrial
    "Industrial - Warehouse",
    "Industrial - Distribution",
    "Industrial - Manufacturing",
    "Industrial - Flex Space",
    "Industrial - Cold Storage",
    "Industrial - Last Mile",
    "Industrial - Yard",
    
    # Multifamily
    "Multifamily - Garden Style",
    "Multifamily - Mid-Rise",
    "Multifamily - High-Rise",
    "Multifamily - Student Housing",
    "Multifamily - Senior Housing",
    "Multifamily - Affordable Housing",
    
    # Hospitality
    "Hotel - Full Service",
    "Hotel - Select Service",
    "Hotel - Extended Stay",
    "Hotel - Limited Service",
    "Hotel - Resort",
    "Motel",
    
    # Specialty
    "Self Storage",
    "Mobile Home Park",
    "RV Park",
    "Car Wash",
    "Data Center",
    "Life Science",
    "Mixed Use",
    
    # Land
    "Land - Residential",
    "Land - Commercial",
    "Land - Industrial",
    "Land - Mixed Use",
    "Land - Agricultural",
    "Land - Recreational",
    
    # Other
    "Healthcare Facility",
    "Daycare Center",
    "Sports & Recreation",
    "Parking Facility",
    "Religious Facility",
    "Special Purpose"
]

# Legacy asset types for backward compatibility
LEGACY_ASSET_TYPES = [
    "Office",
    "Retail",
    "Industrial",
    "Land",
    "Multifamily",
    "Hotel",
    "Restaurant",
    "Medical",
    "Mixed Use",
    "Special Purpose"
]

# All supported asset types (comprehensive + legacy)
ALL_ASSET_TYPES = list(set(COMPREHENSIVE_ASSET_TYPES + LEGACY_ASSET_TYPES))
