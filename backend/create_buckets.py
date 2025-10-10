from supabase import create_client
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

supabase_url = os.environ['SUPABASE_URL']
supabase_key = os.environ['SUPABASE_SERVICE_KEY']

supabase = create_client(supabase_url, supabase_key)

try:
    # Create public bucket for property images
    print("Creating 'property-images' bucket...")
    supabase.storage.create_bucket(id="property-images", options={"public": True})
    print("✓ Created 'property-images' bucket (public)")
except Exception as e:
    print(f"Property images bucket: {e}")

try:
    # Create private bucket for deal documents
    print("Creating 'deal-documents' bucket...")
    supabase.storage.create_bucket(id="deal-documents", options={"public": False})
    print("✓ Created 'deal-documents' bucket (private)")
except Exception as e:
    print(f"Deal documents bucket: {e}")

print("\nBuckets setup complete!")
print("You can view them at: https://supabase.com/dashboard/project/ygezobmpewthqvsfqrbk/storage/buckets")
