#!/usr/bin/env python3
"""
Test Email Campaign Sending - Field Name Fix Verification
Tests the fix for changing 'full_name' to 'name' in contacts table query
"""

import requests
import json
from datetime import datetime
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

# Configuration
BASE_URL = "https://sleek-dashboard-36.preview.emergentagent.com/api"

class EmailCampaignTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.supabase_token = None
        self.supabase_headers = {}
        self.user_id = None
        
    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {status}: {message}")
    
    def authenticate_supabase(self):
        """Authenticate with Supabase"""
        try:
            from supabase import create_client
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_ANON_KEY']
            
            supabase = create_client(supabase_url, supabase_key)
            
            # Try to sign in with test user
            test_email = "emailtest@test.com"
            test_password = "TestPassword123!"
            
            try:
                result = supabase.auth.sign_in_with_password({
                    'email': test_email,
                    'password': test_password
                })
            except Exception as e:
                # User doesn't exist, create it
                self.log(f"User doesn't exist, creating: {test_email}", "INFO")
                result = supabase.auth.sign_up({
                    'email': test_email,
                    'password': test_password
                })
            
            if result.session:
                self.supabase_token = result.session.access_token
                self.supabase_headers = {"Authorization": f"Bearer {self.supabase_token}"}
                self.user_id = result.user.id
                self.log(f"✅ Authenticated as {test_email} (user_id: {self.user_id})", "PASS")
                return True
            else:
                self.log("❌ No session returned from Supabase", "FAIL")
                return False
                
        except Exception as e:
            self.log(f"❌ Supabase auth error: {str(e)}", "FAIL")
            return False
    
    def setup_email_settings(self):
        """Setup SendGrid email settings"""
        try:
            # Check if settings already exist
            response = requests.get(
                f"{self.base_url}/email/settings",
                headers=self.supabase_headers,
                timeout=10
            )
            
            if response.status_code == 200:
                self.log("✅ Email settings already configured", "PASS")
                return True
            
            # Create settings
            settings_data = {
                "sendgrid_api_key": "SG.test_key_for_testing",
                "sender_email": "test@example.com",
                "sender_name": "Test Sender"
            }
            
            response = requests.post(
                f"{self.base_url}/email/settings",
                json=settings_data,
                headers=self.supabase_headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                self.log("✅ Email settings created successfully", "PASS")
                return True
            else:
                self.log(f"❌ Failed to create email settings: {response.status_code}", "FAIL")
                return False
                
        except Exception as e:
            self.log(f"❌ Error setting up email settings: {str(e)}", "FAIL")
            return False
    
    def create_test_campaign(self):
        """Create a test email campaign"""
        try:
            campaign_data = {
                "name": "Test Campaign - Field Name Fix",
                "subject": "Test Email Campaign",
                "html_content": "<h1>Test Campaign</h1><p>This is a test email campaign to verify the field name fix.</p>",
                "plain_text_content": "Test Campaign - This is a test email campaign to verify the field name fix."
            }
            
            response = requests.post(
                f"{self.base_url}/email/campaigns",
                json=campaign_data,
                headers=self.supabase_headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                campaign = response.json()
                self.log(f"Campaign response: {json.dumps(campaign, indent=2)}", "INFO")
                # Handle both direct object and wrapped response
                if isinstance(campaign, dict):
                    campaign_id = campaign.get('id') or campaign.get('campaign', {}).get('id')
                else:
                    campaign_id = None
                self.log(f"✅ Campaign created successfully (ID: {campaign_id})", "PASS")
                return campaign_id
            else:
                self.log(f"❌ Failed to create campaign: {response.status_code} - {response.text[:200]}", "FAIL")
                return None
                
        except Exception as e:
            self.log(f"❌ Error creating campaign: {str(e)}", "FAIL")
            return None
    
    def create_test_contacts(self):
        """Create test contacts in Supabase"""
        try:
            from supabase import create_client
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_SERVICE_KEY']
            supabase = create_client(supabase_url, supabase_key)
            
            # Create 2 test contacts
            contacts = [
                {
                    "name": "John Test Contact",
                    "email": "john.test@example.com",
                    "phone": "555-0101",
                    "company": "Test Company 1",
                    "owner_id": self.user_id
                },
                {
                    "name": "Jane Test Contact",
                    "email": "jane.test@example.com",
                    "phone": "555-0102",
                    "company": "Test Company 2",
                    "owner_id": self.user_id
                }
            ]
            
            contact_ids = []
            for contact in contacts:
                result = supabase.table('contacts').insert(contact).execute()
                if result.data and len(result.data) > 0:
                    contact_id = result.data[0]['id']
                    contact_ids.append(contact_id)
                    self.log(f"✅ Created contact: {contact['name']} (ID: {contact_id})", "PASS")
                else:
                    self.log(f"❌ Failed to create contact: {contact['name']}", "FAIL")
            
            return contact_ids if len(contact_ids) > 0 else None
                
        except Exception as e:
            self.log(f"❌ Error creating test contacts: {str(e)}", "FAIL")
            return None
    
    def test_send_campaign(self, campaign_id, contact_ids):
        """Test sending campaign - THIS IS THE MAIN TEST FOR THE FIX"""
        if not campaign_id:
            self.log("❌ Cannot test - no campaign ID", "FAIL")
            return False
        
        if not contact_ids or len(contact_ids) == 0:
            self.log("❌ Cannot test - no contact IDs", "FAIL")
            return False
        
        try:
            self.log(f"Testing campaign send with {len(contact_ids)} contacts...", "INFO")
            
            send_data = {
                "campaign_id": campaign_id,
                "contact_ids": contact_ids
            }
            
            response = requests.post(
                f"{self.base_url}/email/campaigns/send",
                json=send_data,
                headers=self.supabase_headers,
                timeout=30
            )
            
            self.log(f"Response status: {response.status_code}", "INFO")
            
            if response.status_code == 200:
                data = response.json()
                success = data.get('success', False)
                message = data.get('message', '')
                results = data.get('results', {})
                total_sent = results.get('total_sent', 0)
                total_failed = results.get('total_failed', 0)
                
                self.log(f"Response: {json.dumps(data, indent=2)}", "INFO")
                
                if success:
                    self.log(f"✅ CAMPAIGN SENT SUCCESSFULLY: {message}", "PASS")
                    self.log(f"   Total sent: {total_sent}, Total failed: {total_failed}", "INFO")
                    self.log("✅ FIX VERIFIED: Field name change from 'full_name' to 'name' is working!", "PASS")
                    return True
                else:
                    self.log(f"❌ Campaign sending failed: {message}", "FAIL")
                    self.log(f"   Total sent: {total_sent}, Total failed: {total_failed}", "INFO")
                    return False
            
            elif response.status_code == 500:
                error_text = response.text
                self.log(f"❌ CRITICAL: 500 Error - {error_text[:500]}", "FAIL")
                
                # Check if it's the old error
                if "full_name does not exist" in error_text:
                    self.log("❌ OLD ERROR DETECTED: Still using 'full_name' field!", "FAIL")
                    self.log("   The fix was NOT applied or backend needs restart", "FAIL")
                else:
                    self.log(f"   Different error: {error_text[:200]}", "INFO")
                
                return False
            
            else:
                error_text = response.text[:500] if response.text else "No response"
                self.log(f"❌ Failed with status {response.status_code}", "FAIL")
                self.log(f"   Error: {error_text}", "INFO")
                return False
                
        except Exception as e:
            self.log(f"❌ Request error: {str(e)}", "FAIL")
            import traceback
            self.log(f"   Traceback: {traceback.format_exc()}", "INFO")
            return False
    
    def run_test(self):
        """Run the complete test"""
        print("=" * 70)
        print("EMAIL CAMPAIGN FIELD NAME FIX TEST")
        print("Testing: Changed 'full_name' to 'name' in contacts table query")
        print("=" * 70)
        print()
        
        # Step 1: Authenticate
        self.log("Step 1: Authenticating with Supabase...", "INFO")
        if not self.authenticate_supabase():
            self.log("❌ TEST FAILED: Could not authenticate", "FAIL")
            return False
        print()
        
        # Step 2: Setup email settings
        self.log("Step 2: Setting up email settings...", "INFO")
        if not self.setup_email_settings():
            self.log("❌ TEST FAILED: Could not setup email settings", "FAIL")
            return False
        print()
        
        # Step 3: Create test campaign
        self.log("Step 3: Creating test campaign...", "INFO")
        campaign_id = self.create_test_campaign()
        if not campaign_id:
            self.log("❌ TEST FAILED: Could not create campaign", "FAIL")
            return False
        print()
        
        # Step 4: Create test contacts
        self.log("Step 4: Creating test contacts...", "INFO")
        contact_ids = self.create_test_contacts()
        if not contact_ids:
            self.log("❌ TEST FAILED: Could not create contacts", "FAIL")
            return False
        print()
        
        # Step 5: Send campaign (THE MAIN TEST)
        self.log("Step 5: Sending campaign (MAIN TEST)...", "INFO")
        success = self.test_send_campaign(campaign_id, contact_ids)
        print()
        
        # Summary
        print("=" * 70)
        if success:
            print("✅ TEST PASSED: Email campaign field name fix is working!")
            print("   - Changed from 'full_name' to 'name' in line 2331")
            print("   - Changed from contact['full_name'] to contact['name'] in line 2340")
            print("   - Campaign sent successfully without database field errors")
        else:
            print("❌ TEST FAILED: Email campaign sending failed")
            print("   Check the logs above for details")
        print("=" * 70)
        
        return success

if __name__ == "__main__":
    tester = EmailCampaignTester()
    success = tester.run_test()
    sys.exit(0 if success else 1)
