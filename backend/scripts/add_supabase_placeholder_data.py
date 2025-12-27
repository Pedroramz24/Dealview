#!/usr/bin/env python3
"""
⚠️ DEV/TESTING ONLY - DO NOT RUN IN PRODUCTION ⚠️

Script to add placeholder CRM data to Supabase for screenshot/testing purposes.
This will populate Pipeline, Contacts, Calendar with realistic test data.

Usage: python3 backend/scripts/add_supabase_placeholder_data.py
Cleanup: python3 backend/scripts/cleanup_supabase_placeholder_data.py
"""
import os
import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    sys.exit(1)

# Create Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

USER_EMAIL = "contact@pedroarmando.com"

def get_user_id():
    """Get user ID from email via Supabase Auth"""
    try:
        # Get auth users
        result = supabase.auth.admin.list_users()
        for user in result:
            if user.email == USER_EMAIL:
                return user.id
        print(f"❌ User {USER_EMAIL} not found in Supabase Auth")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error fetching user: {e}")
        sys.exit(1)

def get_or_create_pipeline():
    """Get first pipeline for user or create a default one"""
    user_id = get_user_id()
    try:
        result = supabase.table("pipelines").select("id").eq("owner_id", user_id).limit(1).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]["id"]
        
        # Create default pipeline
        pipeline_id = str(uuid4())
        pipeline = {
            "id": pipeline_id,
            "name": "Main Pipeline",
            "owner_id": user_id,
            "color": "#00b8d4",
            "is_default": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("pipelines").insert(pipeline).execute()
        
        # Create default stages
        stages = [
            {"id": str(uuid4()), "pipeline_id": pipeline_id, "name": "Lead", "color": "#94a3b8", "display_order": 0, "stage_weight": 0.1},
            {"id": str(uuid4()), "pipeline_id": pipeline_id, "name": "Qualified", "color": "#3b82f6", "display_order": 1, "stage_weight": 0.25},
            {"id": str(uuid4()), "pipeline_id": pipeline_id, "name": "Proposal", "color": "#f59e0b", "display_order": 2, "stage_weight": 0.5},
            {"id": str(uuid4()), "pipeline_id": pipeline_id, "name": "Negotiation", "color": "#8b5cf6", "display_order": 3, "stage_weight": 0.75},
            {"id": str(uuid4()), "pipeline_id": pipeline_id, "name": "Closed Won", "color": "#10b981", "display_order": 4, "stage_weight": 1.0}
        ]
        for stage in stages:
            supabase.table("pipeline_stages").insert(stage).execute()
        
        return pipeline_id
    except Exception as e:
        print(f"❌ Error creating pipeline: {e}")
        sys.exit(1)

def get_pipeline_stages(pipeline_id):
    """Get all stages for a pipeline"""
    result = supabase.table("pipeline_stages").select("id,name").eq("pipeline_id", pipeline_id).order("display_order").execute()
    return result.data

def add_deals():
    """Add placeholder deals to Supabase"""
    user_id = get_user_id()
    pipeline_id = get_or_create_pipeline()
    stages = get_pipeline_stages(pipeline_id)
    
    if len(stages) < 4:
        print("❌ Not enough pipeline stages")
        return
    
    deals = [
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "pipeline_id": pipeline_id,
            "pipeline_stage_id": stages[3]["id"],  # Negotiation
            "address": "1524 E Commerce St, San Antonio, TX 78205",
            "title": "Luxury Hotel Acquisition",
            "asset_type": "Hotels",
            "price": 1850000,
            "size": 12000,
            "last_contact_date": datetime.now(timezone.utc).isoformat().split('T')[0],
            "next_action": "follow_up",
            "next_action_date": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat().split('T')[0],
            "target_close_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat().split('T')[0],
            "is_published": False,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "pipeline_id": pipeline_id,
            "pipeline_stage_id": stages[1]["id"],  # Qualified
            "address": "625 Humble Ave, San Antonio, TX 78225",
            "title": "Industrial Warehouse Complex",
            "asset_type": "Industrial",
            "price": 8900000,
            "size": 85000,
            "last_contact_date": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat().split('T')[0],
            "next_action": "email",
            "next_action_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat().split('T')[0],
            "target_close_date": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat().split('T')[0],
            "is_published": False,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=25)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "pipeline_id": pipeline_id,
            "pipeline_stage_id": stages[2]["id"],  # Proposal
            "address": "Highway 281 N, San Antonio, TX",
            "title": "Retail Development Land",
            "asset_type": "Land",
            "price": 4100000,
            "size": 240000,
            "last_contact_date": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat().split('T')[0],
            "next_action": "tour",
            "next_action_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat().split('T')[0],
            "target_close_date": (datetime.now(timezone.utc) + timedelta(days=45)).isoformat().split('T')[0],
            "is_published": False,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "pipeline_id": pipeline_id,
            "pipeline_stage_id": stages[0]["id"],  # Lead
            "address": "Downtown Houston, TX",
            "title": "Mixed-Use Development",
            "asset_type": "Mixed Use",
            "price": 5400000,
            "size": 35000,
            "last_contact_date": datetime.now(timezone.utc).isoformat().split('T')[0],
            "next_action": "call",
            "next_action_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat().split('T')[0],
            "is_published": False,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "pipeline_id": pipeline_id,
            "pipeline_stage_id": stages[2]["id"],  # Proposal
            "address": "East Dallas, TX",
            "title": "Multi-Family Complex",
            "asset_type": "Multifamily",
            "price": 2700000,
            "size": 48000,
            "last_contact_date": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat().split('T')[0],
            "next_action": "send_om",
            "next_action_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat().split('T')[0],
            "target_close_date": (datetime.now(timezone.utc) + timedelta(days=40)).isoformat().split('T')[0],
            "is_published": False,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for deal in deals:
        try:
            supabase.table("deals").insert(deal).execute()
            print(f"✅ Added deal: {deal['title']}")
        except Exception as e:
            print(f"⚠️  Error adding deal {deal['title']}: {e}")

def add_contacts():
    """Add placeholder contacts to Supabase"""
    user_id = get_user_id()
    
    contacts = [
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "name": "Michael Rodriguez",
            "email": "m.rodriguez@capitalgroup.com",
            "phone": "+1 (210) 555-0123",
            "company": "Capital Growth Partners",
            "title": "Senior Investor",
            "contact_types": ["buyer"],
            "asset_type_focus": ["Hotels", "Multifamily"],
            "markets": ["San Antonio", "Austin"],
            "status": "active_contact",
            "tags": ["high-net-worth", "institutional"],
            "notes": "Looking for multifamily and hotel deals $2M-$10M in Texas markets. Very responsive.",
            "last_followup_date": datetime.now(timezone.utc).isoformat().split('T')[0],
            "next_action_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat().split('T')[0],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "name": "Sarah Chen",
            "email": "sarah.chen@lonestarinvest.com",
            "phone": "+1 (512) 555-0456",
            "company": "Lone Star Investments",
            "title": "Principal Broker",
            "contact_types": ["broker"],
            "asset_type_focus": ["Industrial", "Office"],
            "markets": ["Austin", "Houston"],
            "status": "active_contact",
            "tags": ["industrial-focus"],
            "notes": "Active broker with strong industrial portfolio. Excellent track record.",
            "last_followup_date": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat().split('T')[0],
            "next_action_date": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat().split('T')[0],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=45)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "name": "David Martinez",
            "email": "david@texasretail.com",
            "phone": "+1 (214) 555-0789",
            "company": "Texas Retail Group",
            "title": "Owner",
            "contact_types": ["seller", "owner"],
            "asset_type_focus": ["Retail Centers"],
            "markets": ["DFW"],
            "status": "need_to_call",
            "tags": ["seller", "retail"],
            "notes": "Looking to sell retail properties in DFW area. Need to schedule follow-up call.",
            "last_followup_date": (datetime.now(timezone.utc) - timedelta(days=8)).isoformat().split('T')[0],
            "next_action_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat().split('T')[0],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "name": "Jennifer Thompson",
            "email": "j.thompson@allianceequity.com",
            "phone": "+1 (713) 555-0234",
            "company": "Alliance Equity Fund",
            "title": "Investment Director",
            "contact_types": ["buyer"],
            "asset_type_focus": ["Hotels", "Mixed Use"],
            "markets": ["Houston", "San Antonio"],
            "status": "active_contact",
            "tags": ["institutional", "hotel-focus"],
            "notes": "Institutional investor seeking hotel and mixed-use acquisitions $1M+ in major Texas markets.",
            "last_followup_date": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat().split('T')[0],
            "next_action_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat().split('T')[0],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "name": "Robert Kim",
            "email": "rkim@summitcre.com",
            "phone": "+1 (210) 555-0567",
            "company": "Summit Commercial",
            "title": "Senior Broker",
            "contact_types": ["broker"],
            "asset_type_focus": ["Office", "Mixed Use"],
            "markets": ["San Antonio"],
            "status": "active_contact",
            "tags": ["office-specialist"],
            "notes": "Specializes in office buildings and mixed-use developments. Well-connected in SA market.",
            "last_followup_date": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat().split('T')[0],
            "next_action_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat().split('T')[0],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "name": "Amanda Williams",
            "email": "awilliams@texascapital.com",
            "phone": "+1 (210) 555-0890",
            "company": "Texas Capital Real Estate",
            "title": "Fund Manager",
            "contact_types": ["buyer"],
            "asset_type_focus": ["Land", "Industrial"],
            "markets": ["San Antonio", "Austin"],
            "status": "active_contact",
            "tags": ["private-equity", "land-development"],
            "notes": "Private equity fund focused on land development and industrial properties. Quick decision-maker.",
            "last_followup_date": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat().split('T')[0],
            "next_action_date": (datetime.now(timezone.utc) + timedelta(days=4)).isoformat().split('T')[0],
            "created_at": (datetime.now(timezone.utc) - timedelta(days=12)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for contact in contacts:
        try:
            supabase.table("contacts").insert(contact).execute()
            print(f"✅ Added contact: {contact['name']}")
        except Exception as e:
            print(f"⚠️  Error adding contact {contact['name']}: {e}")

def add_calendar_events():
    """Add placeholder calendar events to Supabase"""
    user_id = get_user_id()
    
    events = [
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "title": "Property Showing: Hotel Property",
            "description": "Tour of 1524 E Commerce St with Michael Rodriguez",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=3, hours=10)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=3, hours=11)).isoformat(),
            "all_day": False,
            "event_type": "meeting",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "title": "Due Diligence Deadline: Multi-Family",
            "description": "Inspection period ends for East Dallas property",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=7, hours=1)).isoformat(),
            "all_day": True,
            "event_type": "deadline",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "title": "Call: Sarah Chen - Warehouse Deal",
            "description": "Discuss industrial warehouse financing options",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=1, hours=14)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=1, hours=15)).isoformat(),
            "all_day": False,
            "event_type": "meeting",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "title": "Contract Review: Retail Land",
            "description": "Attorney review of purchase agreement for Highway 281 property",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=5, hours=9)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=5, hours=10)).isoformat(),
            "all_day": False,
            "event_type": "meeting",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "owner_id": user_id,
            "title": "Networking: SA CRE Mixer",
            "description": "Monthly commercial real estate networking event",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=10, hours=18)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=10, hours=20)).isoformat(),
            "all_day": False,
            "event_type": "meeting",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for event in events:
        try:
            supabase.table("calendar_events").insert(event).execute()
            print(f"✅ Added calendar event: {event['title']}")
        except Exception as e:
            print(f"⚠️  Error adding calendar event {event['title']}: {e}")

def main():
    print("="*60)
    print("DEALLINKED - Adding Placeholder CRM Data to Supabase")
    print("="*60)
    print(f"User: {USER_EMAIL}")
    print()
    
    # Confirm with user
    print("⚠️  This will add placeholder data to your CRM for screenshots.")
    print("   You can remove it later using cleanup_supabase_placeholder_data.py")
    print()
    
    proceed = input("Proceed? (yes/no): ")
    if proceed.lower() != "yes":
        print("❌ Cancelled by user")
        return
    
    print()
    print("Adding placeholder data...")
    print()
    
    # Add data
    print("📝 Adding deals...")
    add_deals()
    print()
    
    print("👥 Adding contacts...")
    add_contacts()
    print()
    
    print("📅 Adding calendar events...")
    add_calendar_events()
    print()
    
    print("="*60)
    print("✅ PLACEHOLDER DATA ADDED SUCCESSFULLY!")
    print("="*60)
    print()
    print("📸 You can now take screenshots of:")
    print("   - Pipeline (5 deals across different stages)")
    print("   - Contacts (6 contacts with different types)")
    print("   - Calendar (5 events over next 10 days)")
    print("   - Messages (will need manual setup via UI)")
    print()
    print("🧹 To remove all placeholder data:")
    print("   python backend/scripts/cleanup_supabase_placeholder_data.py")
    print()

if __name__ == "__main__":
    main()
