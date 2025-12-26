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
from dotenv import load_dotenv

load_dotenv()

async def add_placeholder_data():
    # Connect to MongoDB
    mongo_url = os.getenv('MONGO_URL')
    db_name = os.getenv('DB_NAME', 'deallinked')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    user_email = 'contact@pedroarmando.com'
    
    # Get user ID
    user = await db.user_profiles.find_one({"email": user_email}, {"_id": 0})
    if not user:
        print(f"❌ User {user_email} not found")
        return
    
    user_id = user['id']
    print(f"✅ Found user: {user_id}")
    
    # 1. ADD PIPELINE DEALS
    pipeline_deals = [
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "title": "Luxury Hotel Acquisition",
            "address": "1524 E Commerce St, San Antonio, 78205",
            "stage": "negotiation",
            "value": 1850000,
            "probability": 75,
            "expected_close_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
            "notes": "Strong interest from buyer. Moving to due diligence next week.",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "title": "Industrial Warehouse Complex",
            "address": "625 Humble Ave, San Antonio, TX, 78225",
            "stage": "qualified",
            "value": 8900000,
            "probability": 50,
            "expected_close_date": (datetime.now(timezone.utc) + timedelta(days=60)).isoformat(),
            "notes": "Buyer requested additional financial documents.",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "title": "Retail Development Land",
            "address": "Highway 281 N, San Antonio, TX",
            "stage": "contract",
            "value": 4100000,
            "probability": 90,
            "expected_close_date": (datetime.now(timezone.utc) + timedelta(days=15)).isoformat(),
            "notes": "Contract signed. Due diligence in progress.",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "title": "Mixed-Use Development",
            "address": "Downtown Houston, TX",
            "stage": "lead",
            "value": 5400000,
            "probability": 25,
            "expected_close_date": (datetime.now(timezone.utc) + timedelta(days=90)).isoformat(),
            "notes": "Initial inquiry received. Scheduling showing.",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "title": "Multi-Family Complex",
            "address": "East Dallas, TX",
            "stage": "due_diligence",
            "value": 2700000,
            "probability": 85,
            "expected_close_date": (datetime.now(timezone.utc) + timedelta(days=20)).isoformat(),
            "notes": "Inspection scheduled for next week. Buyer very interested.",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    result = await db.pipeline_deals.insert_many(pipeline_deals)
    print(f"✅ Added {len(result.inserted_ids)} pipeline deals")
    
    # 2. ADD CONTACTS
    contacts = [
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": "Michael Rodriguez",
            "email": "m.rodriguez@capitalgroup.com",
            "phone": "+1 (210) 555-0123",
            "role": "Investor",
            "company": "Capital Growth Partners",
            "tags": ["high-net-worth", "multifamily-focus"],
            "notes": "Looking for multifamily deals $2M-$10M in Texas markets",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": "Sarah Chen",
            "email": "sarah.chen@lonestarinvest.com",
            "phone": "+1 (512) 555-0456",
            "role": "Broker",
            "company": "Lone Star Investments",
            "tags": ["industrial", "austin-market"],
            "notes": "Active broker with strong industrial portfolio",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=25)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": "David Martinez",
            "email": "david@texasretail.com",
            "phone": "+1 (214) 555-0789",
            "role": "Owner",
            "company": "Texas Retail Group",
            "tags": ["retail", "seller"],
            "notes": "Looking to sell retail properties in DFW area",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": "Jennifer Thompson",
            "email": "j.thompson@allianceequity.com",
            "phone": "+1 (713) 555-0234",
            "role": "Investor",
            "company": "Alliance Equity Fund",
            "tags": ["institutional", "hotel-focus"],
            "notes": "Institutional investor seeking hotel acquisitions $1M+",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": "Robert Kim",
            "email": "rkim@summitcre.com",
            "phone": "+1 (210) 555-0567",
            "role": "Broker",
            "company": "Summit Commercial",
            "tags": ["office", "san-antonio"],
            "notes": "Specializes in office buildings and mixed-use developments",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    result = await db.contacts.insert_many(contacts)
    print(f"✅ Added {len(result.inserted_ids)} contacts")
    
    # 3. ADD CALENDAR EVENTS
    calendar_events = [
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "title": "Property Showing - Hotel Property",
            "description": "Tour of 1524 E Commerce St with potential buyer",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=3, hours=10)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=3, hours=11)).isoformat(),
            "event_type": "showing",
            "location": "1524 E Commerce St, San Antonio, 78205",
            "attendees": ["Michael Rodriguez"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "title": "Due Diligence Deadline - Multi-Family Complex",
            "description": "Inspection period ends",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=7, hours=1)).isoformat(),
            "event_type": "deadline",
            "location": "East Dallas, TX",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "title": "Call with Sarah Chen - Industrial Deal",
            "description": "Discuss warehouse financing options",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=1, hours=14)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=1, hours=15)).isoformat(),
            "event_type": "call",
            "attendees": ["Sarah Chen"],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "title": "Contract Review - Retail Land",
            "description": "Attorney review of purchase agreement",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=5, hours=9)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=5, hours=10)).isoformat(),
            "event_type": "meeting",
            "location": "Virtual",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "title": "Networking Event - San Antonio CRE Mixer",
            "description": "Monthly commercial real estate networking",
            "start_time": (datetime.now(timezone.utc) + timedelta(days=10, hours=18)).isoformat(),
            "end_time": (datetime.now(timezone.utc) + timedelta(days=10, hours=20)).isoformat(),
            "event_type": "event",
            "location": "Hotel Valencia, San Antonio",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    result = await db.calendar_events.insert_many(calendar_events)
    print(f"✅ Added {len(result.inserted_ids)} calendar events")
    
    # 4. ADD MESSAGE CONVERSATIONS
    conversations = [
        {
            "id": str(uuid4()),
            "participants": [user_id, "michael_rodriguez_id"],
            "participant_names": ["You", "Michael Rodriguez"],
            "last_message": "Great! Let's schedule that property tour for Thursday at 10 AM.",
            "last_message_time": datetime.now(timezone.utc).isoformat(),
            "unread_count": 0,
            "deal_id": pipeline_deals[0]['id'],
            "deal_title": "Luxury Hotel Acquisition",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
        },
        {
            "id": str(uuid4()),
            "participants": [user_id, "sarah_chen_id"],
            "participant_names": ["You", "Sarah Chen"],
            "last_message": "I have a client who might be interested in this warehouse. Can we set up a call?",
            "last_message_time": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(),
            "unread_count": 1,
            "deal_id": pipeline_deals[1]['id'],
            "deal_title": "Industrial Warehouse Complex",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
        },
        {
            "id": str(uuid4()),
            "participants": [user_id, "jennifer_thompson_id"],
            "participant_names": ["You", "Jennifer Thompson"],
            "last_message": "The financing is approved. Ready to move forward with the offer.",
            "last_message_time": (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat(),
            "unread_count": 0,
            "deal_id": pipeline_deals[4]['id'],
            "deal_title": "Multi-Family Complex",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat()
        },
        {
            "id": str(uuid4()),
            "participants": [user_id, "david_martinez_id"],
            "participant_names": ["You", "David Martinez"],
            "last_message": "Thanks for the information. We'll review and get back to you by Friday.",
            "last_message_time": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "unread_count": 0,
            "deal_id": pipeline_deals[2]['id'],
            "deal_title": "Retail Development Land",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=8)).isoformat()
        },
        {
            "id": str(uuid4()),
            "participants": [user_id, "robert_kim_id"],
            "participant_names": ["You", "Robert Kim"],
            "last_message": "I'd like to discuss potential partnership opportunities on future deals.",
            "last_message_time": (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat(),
            "unread_count": 2,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=4)).isoformat()
        }
    ]
    
    result = await db.conversations.insert_many(conversations)
    print(f"✅ Added {len(result.inserted_ids)} conversations")
    
    # 5. UPDATE TEAM NAME (if exists)
    team = await db.teams.find_one({"owner_id": user_id}, {"_id": 0})
    if team:
        await db.teams.update_one(
            {"id": team['id']},
            {"$set": {"name": "DealLinked Showcase Team"}}
        )
        print(f"✅ Updated team name to 'DealLinked Showcase Team'")
        
        # Add team members
        team_members = [
            {
                "id": str(uuid4()),
                "team_id": team['id'],
                "user_id": "showcase_member_1",
                "name": "Alex Thompson",
                "email": "alex@deallinked-demo.com",
                "role": "Senior Broker",
                "joined_at": (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
            },
            {
                "id": str(uuid4()),
                "team_id": team['id'],
                "user_id": "showcase_member_2",
                "name": "Emily Martinez",
                "email": "emily@deallinked-demo.com",
                "role": "Associate",
                "joined_at": (datetime.now(timezone.utc) - timedelta(days=45)).isoformat()
            }
        ]
        result = await db.team_members.insert_many(team_members)
        print(f"✅ Added {len(result.inserted_ids)} team members")
    else:
        print("⚠️ No team found for user")
    
    print("\n✅ ALL PLACEHOLDER DATA ADDED!")
    print("\n📝 To remove this data later, run: python cleanup_placeholder_data.py")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_placeholder_data())
