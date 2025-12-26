"""
Script to add placeholder data for screenshots
Run this to populate the account with demo data
Run cleanup script before launch to remove all placeholder data
"""
import asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# MongoDB connection
mongo_url = "mongodb://localhost:27017"
db_name = "pedro_crm"

async def add_placeholder_data():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Use the actual user email
    user_email = 'contact@pedroarmando.com'
    user_id = "placeholder_user_id"  # We'll use a consistent ID for placeholder data
    
    print(f"✅ Adding placeholder data for screenshots")
    
    # Tag for easy cleanup
    placeholder_tag = f"PLACEHOLDER_{datetime.now().strftime('%Y%m%d')}"
    
    # 1. ADD PIPELINE DEALS
    pipeline_deals = [
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "title": "Luxury Hotel Acquisition",
            "property_address": "1524 E Commerce St, San Antonio, 78205",
            "stage": "negotiation",
            "deal_value": 1850000,
            "probability": 75,
            "expected_close_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "notes": "Strong interest from buyer. Moving to due diligence next week.",
            "contact_name": "Michael Rodriguez",
            "contact_company": "Capital Growth Partners",
            "placeholder_tag": placeholder_tag,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "title": "Industrial Warehouse Complex",
            "property_address": "625 Humble Ave, San Antonio, TX, 78225",
            "stage": "qualified",
            "deal_value": 8900000,
            "probability": 50,
            "expected_close_date": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
            "notes": "Buyer requested additional financial documents.",
            "contact_name": "Sarah Chen",
            "contact_company": "Lone Star Investments",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "title": "Retail Development Land",
            "property_address": "Highway 281 N, San Antonio, TX",
            "stage": "contract",
            "deal_value": 4100000,
            "probability": 90,
            "expected_close_date": (datetime.now(timezone.utc) + timedelta(days=15)).isoformat(),
            "notes": "Contract signed. Due diligence in progress.",
            "contact_name": "David Martinez",
            "contact_company": "Texas Retail Group",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "title": "Mixed-Use Development",
            "property_address": "Downtown Houston, TX",
            "stage": "lead",
            "deal_value": 5400000,
            "probability": 25,
            "expected_close_date": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
            "notes": "Initial inquiry received. Scheduling showing.",
            "contact_name": "Jennifer Thompson",
            "contact_company": "Alliance Equity Fund",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "title": "Multi-Family Complex",
            "property_address": "East Dallas, TX",
            "stage": "due_diligence",
            "deal_value": 2700000,
            "probability": 85,
            "expected_close_date": (datetime.now(timezone.utc) + timedelta(days=20)).isoformat(),
            "notes": "Inspection scheduled for next week. Buyer very interested.",
            "contact_name": "Robert Kim",
            "contact_company": "Summit Commercial",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    result = await db.deals.insert_many(pipeline_deals)
    print(f"✅ Added {len(result.inserted_ids)} pipeline deals")
    
    # 2. ADD CONTACTS
    contacts = [
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "name": "Michael Rodriguez",
            "email": "m.rodriguez@capitalgroup.com",
            "phone": "+1 (210) 555-0123",
            "company": "Capital Growth Partners",
            "role": "Investor",
            "tags": ["high-net-worth", "multifamily-focus"],
            "notes": "Looking for multifamily deals $2M-$10M in Texas markets",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(),
            "last_contact": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "name": "Sarah Chen",
            "email": "sarah.chen@lonestarinvest.com",
            "phone": "+1 (512) 555-0456",
            "company": "Lone Star Investments",
            "role": "Broker",
            "tags": ["industrial", "austin-market"],
            "notes": "Active broker with strong industrial portfolio",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=25)).isoformat(),
            "last_contact": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "name": "David Martinez",
            "email": "david@texasretail.com",
            "phone": "+1 (214) 555-0789",
            "company": "Texas Retail Group",
            "role": "Owner",
            "tags": ["retail", "seller"],
            "notes": "Looking to sell retail properties in DFW area",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(),
            "last_contact": (datetime.now(timezone.utc) - timedelta(days=8)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "name": "Jennifer Thompson",
            "email": "j.thompson@allianceequity.com",
            "phone": "+1 (713) 555-0234",
            "company": "Alliance Equity Fund",
            "role": "Investor",
            "tags": ["institutional", "hotel-focus"],
            "notes": "Institutional investor seeking hotel acquisitions $1M+",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat(),
            "last_contact": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "name": "Robert Kim",
            "email": "rkim@summitcre.com",
            "phone": "+1 (210) 555-0567",
            "company": "Summit Commercial",
            "role": "Broker",
            "tags": ["office", "san-antonio"],
            "notes": "Specializes in office buildings and mixed-use developments",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
            "last_contact": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "name": "Amanda Williams",
            "email": "awilliams@texascapital.com",
            "phone": "+1 (210) 555-0890",
            "company": "Texas Capital Real Estate",
            "role": "Investor",
            "tags": ["private-equity"],
            "notes": "Private equity fund focused on commercial properties",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=12)).isoformat(),
            "last_contact": (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        }
    ]
    
    result = await db.contacts.insert_many(contacts)
    print(f"✅ Added {len(result.inserted_ids)} contacts")
    
    # 3. ADD CALENDAR EVENTS
    calendar_events = [
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "title": "Property Showing: Hotel Property",
            "description": "Tour of 1524 E Commerce St with potential buyer",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=3, hours=10)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=3, hours=11)).isoformat(),
            "event_type": "showing",
            "location": "1524 E Commerce St, San Antonio, 78205",
            "attendees": "Michael Rodriguez",
            "placeholder_tag": placeholder_tag,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "title": "Due Diligence Deadline: Multi-Family",
            "description": "Inspection period ends",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=7, hours=1)).isoformat(),
            "event_type": "deadline",
            "location": "East Dallas, TX",
            "placeholder_tag": placeholder_tag,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "title": "Call: Sarah Chen - Industrial Deal",
            "description": "Discuss warehouse financing options",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=1, hours=14)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=1, hours=15)).isoformat(),
            "event_type": "call",
            "attendees": "Sarah Chen",
            "placeholder_tag": placeholder_tag,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "title": "Contract Review: Retail Land",
            "description": "Attorney review of purchase agreement",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=5, hours=9)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=5, hours=10)).isoformat(),
            "event_type": "meeting",
            "location": "Virtual",
            "placeholder_tag": placeholder_tag,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "title": "Networking: San Antonio CRE Mixer",
            "description": "Monthly commercial real estate networking event",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=10, hours=18)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=10, hours=20)).isoformat(),
            "event_type": "event",
            "location": "Hotel Valencia, San Antonio",
            "placeholder_tag": placeholder_tag,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    result = await db.calendar_events.insert_many(calendar_events)
    print(f"✅ Added {len(result.inserted_ids)} calendar events")
    
    # 4. ADD MESSAGE CONVERSATIONS
    conversations = [
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "other_user_name": "Michael Rodriguez",
            "other_user_company": "Capital Growth Partners",
            "last_message": "Great! Let's schedule that property tour for Thursday at 10 AM.",
            "last_message_time": datetime.now(timezone.utc).isoformat(),
            "unread_count": 0,
            "deal_title": "Luxury Hotel Acquisition",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "other_user_name": "Sarah Chen",
            "other_user_company": "Lone Star Investments",
            "last_message": "I have a client who might be interested in this warehouse. Can we set up a call?",
            "last_message_time": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(),
            "unread_count": 1,
            "deal_title": "Industrial Warehouse Complex",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "other_user_name": "Jennifer Thompson",
            "other_user_company": "Alliance Equity Fund",
            "last_message": "The financing is approved. Ready to move forward with the offer.",
            "last_message_time": (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat(),
            "unread_count": 0,
            "deal_title": "Multi-Family Complex",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "other_user_name": "David Martinez",
            "other_user_company": "Texas Retail Group",
            "last_message": "Thanks for the information. We'll review and get back to you by Friday.",
            "last_message_time": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "unread_count": 0,
            "deal_title": "Retail Development Land",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=8)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "other_user_name": "Robert Kim",
            "other_user_company": "Summit Commercial",
            "last_message": "I'd like to discuss potential partnership opportunities on future deals.",
            "last_message_time": (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat(),
            "unread_count": 2,
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=4)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_email,
            "other_user_name": "Amanda Williams",
            "other_user_company": "Texas Capital Real Estate",
            "last_message": "Very interested in the hotel property. Can you send over the financials?",
            "last_message_time": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(),
            "unread_count": 1,
            "deal_title": "Luxury Hotel Acquisition",
            "placeholder_tag": placeholder_tag,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        }
    ]
    
    result = await db.conversations.insert_many(conversations)
    print(f"✅ Added {len(result.inserted_ids)} conversations")
    
    # 5. UPDATE TEAM NAME
    team_result = await db.teams.update_one(
        {"owner_email": user_email},
        {"$set": {"name": "DealLinked Showcase Team", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if team_result.modified_count > 0:
        print(f"✅ Updated team name to 'DealLinked Showcase Team'")
    else:
        print(f"⚠️ No team found to update (might not exist yet)")
    
    print(f"\n✅ ALL PLACEHOLDER DATA ADDED!")
    print(f"\n📸 You can now take screenshots of:")
    print(f"   - Pipeline (5 deals)")
    print(f"   - Contacts (6 contacts)")
    print(f"   - Calendar (5 events)")
    print(f"   - Messages (6 conversations)")
    print(f"   - Team (renamed to 'DealLinked Showcase Team')")
    print(f"\n🧹 To remove all placeholder data before launch:")
    print(f"   python scripts/cleanup_placeholder_data.py")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_placeholder_data())

