"""
Script to add placeholder data for screenshots using Supabase
Run: python add_supabase_placeholder_data.py
"""
import os
import sys
from datetime import datetime, timedelta
from uuid import uuid4
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

from supabase import create_client, Client

async def add_placeholder_data():
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
        return
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    user_email = 'contact@pedroarmando.com'
    
    # Get user
    result = supabase.table('user_profiles').select('*').eq('email', user_email).execute()
    if not result.data:
        print(f"❌ User {user_email} not found")
        return
    
    user = result.data[0]
    user_id = user['id']
    print(f"✅ Found user: {user_id}")
    
    # Mark data as placeholder for easy cleanup
    placeholder_tag = f"PLACEHOLDER_DATA_{datetime.now().strftime('%Y%m%d')}"
    
    # 1. ADD CONTACTS
    contacts = [
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": "Michael Rodriguez",
            "email": "m.rodriguez@capitalgroup.com",
            "phone": "+1 (210) 555-0123",
            "company": "Capital Growth Partners",
            "role": "Investor",
            "notes": "Looking for multifamily deals $2M-$10M in Texas markets",
            "tags": placeholder_tag,
            "created_at": (datetime.now() - timedelta(days=30)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": "Sarah Chen",
            "email": "sarah.chen@lonestarinvest.com",
            "phone": "+1 (512) 555-0456",
            "company": "Lone Star Investments",
            "role": "Broker",
            "notes": "Active broker with strong industrial portfolio",
            "tags": placeholder_tag,
            "created_at": (datetime.now() - timedelta(days=25)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": "David Martinez",
            "email": "david@texasretail.com",
            "phone": "+1 (214) 555-0789",
            "company": "Texas Retail Group",
            "role": "Owner",
            "notes": "Looking to sell retail properties in DFW area",
            "tags": placeholder_tag,
            "created_at": (datetime.now() - timedelta(days=20)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": "Jennifer Thompson",
            "email": "j.thompson@allianceequity.com",
            "phone": "+1 (713) 555-0234",
            "company": "Alliance Equity Fund",
            "role": "Investor",
            "notes": "Institutional investor seeking hotel acquisitions $1M+",
            "tags": placeholder_tag,
            "created_at": (datetime.now() - timedelta(days=15)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": "Robert Kim",
            "email": "rkim@summitcre.com",
            "phone": "+1 (210) 555-0567",
            "company": "Summit Commercial",
            "role": "Broker",
            "notes": "Specializes in office buildings and mixed-use developments",
            "tags": placeholder_tag,
            "created_at": (datetime.now() - timedelta(days=10)).isoformat()
        },
        {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": "Amanda Williams",
            "email": "awilliams@texascapital.com",
            "phone": "+1 (210) 555-0890",
            "company": "Texas Capital Real Estate",
            "role": "Investor",
            "notes": "Private equity fund focused on commercial properties",
            "tags": placeholder_tag,
            "created_at": (datetime.now() - timedelta(days=12)).isoformat()
        }
    ]
    
    result = supabase.table('contacts').insert(contacts).execute()
    print(f"✅ Added {len(contacts)} contacts")
    
    print(f"\n✅ PLACEHOLDER DATA ADDED!")
    print(f"\n📝 To remove this data before launch:")
    print(f"   python cleanup_supabase_placeholder_data.py")
    print(f"\n🏷️  All placeholder data is tagged with: {placeholder_tag}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(add_placeholder_data())
