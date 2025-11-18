#!/usr/bin/env python3
"""
Check if pipeline tables exist in Supabase
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('/app/backend/.env')

supabase_url = os.environ['SUPABASE_URL']
supabase_service_key = os.environ['SUPABASE_SERVICE_KEY']

supabase = create_client(supabase_url, supabase_service_key)

print("Checking Supabase schema...")

# Try to query pipelines table
try:
    result = supabase.table('pipelines').select('*').limit(1).execute()
    print(f"✅ pipelines table exists - found {len(result.data)} rows")
except Exception as e:
    print(f"❌ pipelines table error: {str(e)}")

# Try to query pipeline_stages table
try:
    result = supabase.table('pipeline_stages').select('*').limit(1).execute()
    print(f"✅ pipeline_stages table exists - found {len(result.data)} rows")
except Exception as e:
    print(f"❌ pipeline_stages table error: {str(e)}")

# Check if any users have default pipelines
try:
    result = supabase.table('pipelines').select('*').eq('is_default', True).execute()
    print(f"✅ Found {len(result.data)} default pipelines")
    for p in result.data:
        print(f"   - {p.get('name')} (owner: {p.get('owner_id')})")
except Exception as e:
    print(f"❌ Error checking default pipelines: {str(e)}")
