"""
Quick script to update SendGrid API key with new encryption
Run this to fix the email campaign sending issue
"""

import os
from dotenv import load_dotenv
from supabase import create_client
from cryptography.fernet import Fernet

# Load environment
load_dotenv('.env')

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')

# Initialize Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Initialize cipher
cipher = Fernet(ENCRYPTION_KEY.encode())

# New SendGrid API key
new_api_key = "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"

# Encrypt the new key
encrypted_key = cipher.encrypt(new_api_key.encode()).decode()

print(f"Encrypted key: {encrypted_key}")

# Get all users who have email settings
result = supabase.table('email_settings').select('*').execute()

if result.data and len(result.data) > 0:
    for setting in result.data:
        user_id = setting['user_id']
        print(f"\nUpdating SendGrid key for user: {user_id}")
        
        # Update the encrypted API key
        update_result = supabase.table('email_settings').update({
            'sendgrid_api_key': encrypted_key,
            'is_verified': True
        }).eq('user_id', user_id).execute()
        
        if update_result.data:
            print(f"✅ Successfully updated API key for user {user_id}")
        else:
            print(f"❌ Failed to update for user {user_id}")
else:
    print("No email settings found. Please configure SendGrid in the Campaigns page first.")
    print("\nNote: If you see the setup wizard, fill in:")
    print("  - Sender Email: your-verified-email@domain.com")
    print("  - Sender Name: Your Name")
    print("  - API Key: (the key you provided)")

print("\n✅ Done! Try sending a campaign now.")
