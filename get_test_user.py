#!/usr/bin/env python3
"""
Get existing Supabase user credentials for testing
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('/app/backend/.env')

supabase_url = os.environ['SUPABASE_URL']
supabase_service_key = os.environ['SUPABASE_SERVICE_KEY']

supabase = create_client(supabase_url, supabase_service_key)

print("Finding existing users...")

# Get a user with a default pipeline
try:
    result = supabase.table('pipelines').select('owner_id').eq('is_default', True).limit(1).execute()
    if result.data:
        user_id = result.data[0]['owner_id']
        print(f"Found user with pipeline: {user_id}")
        
        # Get user email from auth
        user_result = supabase.auth.admin.get_user_by_id(user_id)
        if user_result.user:
            print(f"Email: {user_result.user.email}")
            print(f"\nYou can use this user for testing (if you know the password)")
            print(f"Or create a new user with email confirmation disabled in Supabase settings")
except Exception as e:
    print(f"Error: {str(e)}")
