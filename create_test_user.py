#!/usr/bin/env python3
"""
Create a test user for pipeline testing using Supabase Admin API
"""

import os
from dotenv import load_dotenv
from supabase import create_client
import time

load_dotenv('/app/backend/.env')

supabase_url = os.environ['SUPABASE_URL']
supabase_service_key = os.environ['SUPABASE_SERVICE_KEY']

supabase = create_client(supabase_url, supabase_service_key)

# Create test user
timestamp = int(time.time())
test_email = f"pipeline_api_test_{timestamp}@test.com"
test_password = "TestPassword123!"

print(f"Creating test user: {test_email}")

try:
    # Use admin API to create user without email confirmation
    user_result = supabase.auth.admin.create_user({
        "email": test_email,
        "password": test_password,
        "email_confirm": True  # Auto-confirm email
    })
    
    if user_result.user:
        print(f"✅ User created successfully!")
        print(f"   User ID: {user_result.user.id}")
        print(f"   Email: {test_email}")
        print(f"   Password: {test_password}")
        
        # Check if default pipeline was created
        time.sleep(2)  # Wait for trigger to execute
        pipeline_result = supabase.table('pipelines').select('*').eq('owner_id', user_result.user.id).eq('is_default', True).execute()
        
        if pipeline_result.data:
            print(f"✅ Default pipeline created: {pipeline_result.data[0].get('name')}")
        else:
            print(f"⚠️  No default pipeline found (may need to wait or check trigger)")
        
        # Save credentials to file for test script
        with open('/tmp/pipeline_test_creds.txt', 'w') as f:
            f.write(f"{test_email}\n{test_password}")
        print(f"\n✅ Credentials saved to /tmp/pipeline_test_creds.txt")
        
    else:
        print(f"❌ Failed to create user")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")
    import traceback
    traceback.print_exc()
