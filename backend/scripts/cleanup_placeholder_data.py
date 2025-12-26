"""
Script to remove all placeholder data before launch
This will delete all demo data and give you a fresh account
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def cleanup_placeholder_data():
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
    
    # Delete placeholder data
    pipeline_result = await db.pipeline_deals.delete_many({"user_id": user_id})
    print(f"✅ Deleted {pipeline_result.deleted_count} pipeline deals")
    
    contacts_result = await db.contacts.delete_many({"user_id": user_id})
    print(f"✅ Deleted {contacts_result.deleted_count} contacts")
    
    calendar_result = await db.calendar_events.delete_many({"user_id": user_id})
    print(f"✅ Deleted {calendar_result.deleted_count} calendar events")
    
    conversations_result = await db.conversations.delete_many({"participants": user_id})
    print(f"✅ Deleted {conversations_result.deleted_count} conversations")
    
    # Reset team name
    team = await db.teams.find_one({"owner_id": user_id}, {"_id": 0})
    if team:
        await db.teams.update_one(
            {"id": team['id']},
            {"$set": {"name": "My Team"}}
        )
        print(f"✅ Reset team name")
        
        # Remove showcase team members
        members_result = await db.team_members.delete_many({
            "team_id": team['id'],
            "email": {"$regex": "deallinked-demo.com"}
        })
        print(f"✅ Deleted {members_result.deleted_count} team members")
    
    print("\n✅ ALL PLACEHOLDER DATA REMOVED!")
    print("Your account is now fresh and ready for production launch.")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_placeholder_data())
