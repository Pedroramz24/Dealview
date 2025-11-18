#!/usr/bin/env python3
"""
List all Supabase users to find one we can test with
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('/app/backend/.env')

supabase_url = os.environ['SUPABASE_URL']
supabase_service_key = os.environ['SUPABASE_SERVICE_KEY']

supabase = create_client(supabase_url, supabase_service_key)

print("Listing Supabase users...")

try:
    # List users using admin API
    users_result = supabase.auth.admin.list_users()
    
    print(f"\nFound {len(users_result)} users:")
    for i, user in enumerate(users_result, 1):
        print(f"\n{i}. Email: {user.email}")
        print(f"   ID: {user.id}")
        print(f"   Created: {user.created_at}")
        
        # Check if user has pipelines
        pipeline_result = supabase.table('pipelines').select('name, is_default').eq('owner_id', user.id).execute()
        if pipeline_result.data:
            print(f"   Pipelines: {len(pipeline_result.data)}")
            for p in pipeline_result.data:
                print(f"      - {p['name']} (default: {p['is_default']})")
        else:
            print(f"   Pipelines: 0")
            
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()
