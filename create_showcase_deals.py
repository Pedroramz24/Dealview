#!/usr/bin/env python3
"""Create placeholder deals for San Antonio and Austin showcase."""
import os
import sys
sys.path.append('/app/backend')

from supabase import create_client, Client
from datetime import datetime, timezone
import uuid

# Supabase credentials
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Get a user to be the owner (use first user in system)
users = supabase.table('user_profiles').select('id').limit(1).execute()
if not users.data or len(users.data) == 0:
    print("No users found. Please create a user first.")
    sys.exit(1)

owner_id = users.data[0]['id']
print(f"Using owner ID: {owner_id}")

# Placeholder deals
deals = [
    # San Antonio - Retail
    {
        "title": "Prime Retail Center - Northwest San Antonio",
        "address": "10515 Culebra Rd, San Antonio, TX 78251",
        "city": "San Antonio",
        "state": "TX",
        "latitude": 29.5188,
        "longitude": -98.6708,
        "description": "Fully occupied retail center in high-traffic corridor. Strong tenant mix including national brands. Excellent visibility and access from Culebra Road.",
        "public_asset_type": "Retail",
        "public_market": "San Antonio",
        "public_price": 3250000,
        "public_strategy": "Core+",
        "is_published": True,
        "public_status": "published",
        "approval_status": "approved",
        "size": 18500,
        "units": 6,
        "gba": 18500,
        "year_built": 2008,
        "cap_rate": 6.8,
        "noi": 221000,
        "building_status": "Existing",
        "zoning": "C-2",
        "seller_commitment_level": "signed_listing",
        "completeness_score": 95,
        "highlights": ["High traffic location", "National tenants", "Strong NOI", "Long-term leases"],
        "ncnd_required": True,
        "published_at": datetime.now(timezone.utc).isoformat()
    },
    # San Antonio - Industrial
    {
        "title": "Class A Industrial Warehouse - East San Antonio",
        "address": "5050 Dietrich Rd, San Antonio, TX 78219",
        "city": "San Antonio",
        "state": "TX",
        "latitude": 29.4512,
        "longitude": -98.3856,
        "description": "Modern distribution facility with high ceilings and multiple dock doors. Recently renovated with updated HVAC and LED lighting throughout.",
        "public_asset_type": "Industrial",
        "public_market": "San Antonio",
        "public_price": 5800000,
        "public_strategy": "Core",
        "is_published": True,
        "public_status": "published",
        "approval_status": "approved",
        "size": 45000,
        "gba": 45000,
        "year_built": 2015,
        "year_renovated": 2023,
        "cap_rate": 7.2,
        "noi": 417600,
        "building_status": "Existing",
        "zoning": "I-1",
        "seller_commitment_level": "written_auth",
        "completeness_score": 92,
        "highlights": ["32' clear height", "10 dock doors", "Recent renovation", "I-35 access"],
        "ncnd_required": True,
        "published_at": datetime.now(timezone.utc).isoformat()
    },
    # San Antonio - Land
    {
        "title": "Development Land - South San Antonio",
        "address": "Somerset Rd & Loop 1604, San Antonio, TX 78221",
        "city": "San Antonio",
        "state": "TX",
        "latitude": 29.3025,
        "longitude": -98.5389,
        "description": "Prime development opportunity at major intersection. Utilities available. Zoned for mixed-use development.",
        "public_asset_type": "Land",
        "public_market": "San Antonio",
        "public_price": 2600000,
        "public_strategy": "Development",
        "is_published": True,
        "public_status": "published",
        "approval_status": "approved",
        "is_land_listing": True,
        "lot_size": 12.5,
        "land_area": 12.5,
        "secondary_type": "Commercial",
        "topography": "Level",
        "grading": "Finish Grade",
        "zoning": "MXD",
        "zoning_description": "Mixed-use development district allowing retail, office, and residential",
        "seller_commitment_level": "verbal_maybe",
        "completeness_score": 85,
        "highlights": ["Major intersection", "Utilities available", "High growth area", "Mixed-use zoning"],
        "ncnd_required": True,
        "published_at": datetime.now(timezone.utc).isoformat()
    },
    # Austin - Retail
    {
        "title": "Luxury Retail Plaza - Downtown Austin",
        "address": "2901 S Capital of Texas Hwy, Austin, TX 78746",
        "city": "Austin",
        "state": "TX",
        "latitude": 30.2672,
        "longitude": -97.7982,
        "description": "Upscale retail center in affluent neighborhood. Premium tenant mix with strong demographics. Excellent visibility from 360 Loop.",
        "public_asset_type": "Retail",
        "public_market": "Austin",
        "public_price": 8900000,
        "public_strategy": "Core",
        "is_published": True,
        "public_status": "published",
        "approval_status": "approved",
        "size": 24000,
        "units": 8,
        "gba": 24000,
        "year_built": 2018,
        "cap_rate": 5.9,
        "noi": 525100,
        "building_status": "Existing",
        "zoning": "CS",
        "seller_commitment_level": "signed_listing",
        "completeness_score": 98,
        "highlights": ["Premium location", "Affluent demographics", "Low vacancy", "Strong credit tenants"],
        "ncnd_required": True,
        "published_at": datetime.now(timezone.utc).isoformat()
    },
    # Austin - Industrial
    {
        "title": "Flex Industrial Park - North Austin",
        "address": "12101 Tech Ridge Blvd, Austin, TX 78753",
        "city": "Austin",
        "state": "TX",
        "latitude": 30.3877,
        "longitude": -97.6897,
        "description": "Multi-tenant flex space in tech corridor. Mix of office and warehouse units. Strong tech tenant base with room for expansion.",
        "public_asset_type": "Industrial",
        "public_market": "Austin",
        "public_price": 7200000,
        "public_strategy": "Value-Add",
        "is_published": True,
        "public_status": "published",
        "approval_status": "approved",
        "size": 52000,
        "units": 12,
        "gba": 52000,
        "year_built": 2012,
        "cap_rate": 6.5,
        "noi": 468000,
        "building_status": "Existing",
        "zoning": "LI",
        "seller_commitment_level": "written_auth",
        "completeness_score": 90,
        "highlights": ["Tech corridor", "Flex space", "Expansion potential", "Strong demand"],
        "ncnd_required": True,
        "published_at": datetime.now(timezone.utc).isoformat()
    },
    # Austin - Land
    {
        "title": "Commercial Land - East Austin",
        "address": "12200 E Hwy 71, Austin, TX 78617",
        "city": "Austin",
        "state": "TX",
        "latitude": 30.2116,
        "longitude": -97.6289,
        "description": "High-visibility commercial land on major highway. Perfect for retail, restaurant, or mixed-use development. Growing area with strong demographics.",
        "public_asset_type": "Land",
        "public_market": "Austin",
        "public_price": 1850000,
        "public_strategy": "Development",
        "is_published": True,
        "public_status": "published",
        "approval_status": "approved",
        "is_land_listing": True,
        "lot_size": 8.2,
        "land_area": 8.2,
        "secondary_type": "Commercial",
        "topography": "Level",
        "grading": "Raw Land",
        "zoning": "GR-CO",
        "zoning_description": "General retail-commercial office district",
        "seller_commitment_level": "signed_listing",
        "completeness_score": 88,
        "highlights": ["Highway frontage", "High traffic", "Growing market", "Utilities nearby"],
        "ncnd_required": True,
        "published_at": datetime.now(timezone.utc).isoformat()
    }
]

print(f"\n📊 Creating {len(deals)} placeholder deals...\n")

# Insert deals
for idx, deal in enumerate(deals, 1):
    try:
        # Add common fields
        deal['id'] = str(uuid.uuid4())
        deal['owner_id'] = owner_id
        deal['created_at'] = datetime.now(timezone.utc).isoformat()
        deal['updated_at'] = datetime.now(timezone.utc).isoformat()
        deal['published_by'] = owner_id
        deal['sale_conditions'] = []
        deal['image_urls'] = []
        deal['brochure_document_ids'] = []
        
        result = supabase.table('deals').insert(deal).execute()
        print(f"✅ {idx}. {deal['title']}")
        print(f"   📍 {deal['city']} | {deal['public_asset_type']} | ${deal['public_price']:,}")
        
    except Exception as e:
        print(f"❌ Error creating {deal['title']}: {str(e)}")

print(f"\n✅ Successfully created {len(deals)} showcase deals!")
print("\n📍 Locations:")
print("   • San Antonio: 3 deals (Retail, Industrial, Land)")
print("   • Austin: 3 deals (Retail, Industrial, Land)")
print("\n💼 Asset Types:")
print("   • Retail: 2 deals")
print("   • Industrial: 2 deals")
print("   • Land: 2 deals")
print("\n🎯 All deals published and approved for marketplace!")
