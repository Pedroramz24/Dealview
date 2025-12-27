#!/usr/bin/env python3
"""
⚠️ DEV/TESTING ONLY - DO NOT RUN IN PRODUCTION ⚠️

Script to remove placeholder CRM data from Supabase.
This will delete ALL deals, contacts, and calendar events for the specified user.

Usage: python3 backend/scripts/cleanup_supabase_placeholder_data.py
"""
import os
import sys
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

def cleanup_data():
    """Remove all CRM data for the user"""
    user_id = get_user_id()
    
    print(f"User ID: {user_id}")
    print()
    
    # Delete deals
    try:
        result = supabase.table("deals").delete().eq("owner_id", user_id).execute()
        print(f"✅ Deleted {len(result.data) if result.data else 0} deals")
    except Exception as e:
        print(f"⚠️  Error deleting deals: {e}")
    
    # Delete contacts
    try:
        result = supabase.table("contacts").delete().eq("owner_id", user_id).execute()
        print(f"✅ Deleted {len(result.data) if result.data else 0} contacts")
    except Exception as e:
        print(f"⚠️  Error deleting contacts: {e}")
    
    # Delete calendar events
    try:
        result = supabase.table("calendar_events").delete().eq("owner_id", user_id).execute()
        print(f"✅ Deleted {len(result.data) if result.data else 0} calendar events")
    except Exception as e:
        print(f"⚠️  Error deleting calendar events: {e}")
    
    # Note: Messages/conversations are in marketplace_messages table and managed differently
    # They will be cleaned up automatically when deals are deleted due to foreign key constraints

def main():
    print("="*60)
    print("DEALLINKED - Removing Placeholder CRM Data from Supabase")
    print("="*60)
    print(f"User: {USER_EMAIL}")
    print()
    
    # Confirm with user
    print("⚠️  WARNING: This will DELETE ALL CRM data for this user!")
    print("   This includes deals, contacts, and calendar events.")
    print()
    
    proceed = input("Are you sure you want to proceed? (yes/no): ")
    if proceed.lower() != "yes":
        print("❌ Cancelled by user")
        return
    
    print()
    print("Removing data...")
    print()
    
    cleanup_data()
    
    print()
    print("="*60)
    print("✅ CLEANUP COMPLETE!")
    print("="*60)
    print()
    print("Your CRM is now clean and ready for production.")
    print()

if __name__ == "__main__":
    main()
