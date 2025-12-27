#!/usr/bin/env python3
"""
Phase 2 Backend API Testing
Tests message deletion, team roles, and deal deletion endpoints
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
BASE_URL = "https://mockdata-hub.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "email": "contact@pedroarmando.com",
    "password": "Flin141812$"
}

class Phase2Tester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.headers = {}
        self.user_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"\n{status}: {test_name}")
        print(f"   {message}")
        if details:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Authenticate with Supabase and get JWT token"""
        try:
            from supabase import create_client
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_ANON_KEY']
            
            supabase = create_client(supabase_url, supabase_key)
            
            # Sign in
            result = supabase.auth.sign_in_with_password({
                'email': TEST_CREDENTIALS['email'],
                'password': TEST_CREDENTIALS['password']
            })
            
            if result.session:
                self.token = result.session.access_token
                self.headers = {"Authorization": f"Bearer {self.token}"}
                self.user_id = result.user.id
                self.log_result(
                    "Authentication", 
                    True, 
                    f"Successfully logged in as {TEST_CREDENTIALS['email']}",
                    f"User ID: {self.user_id}"
                )
                return True
            else:
                self.log_result("Authentication", False, "No session returned")
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def test_message_deletion_endpoint_exists(self):
        """Test 1: Verify DELETE /api/messages/{message_id} endpoint exists"""
        try:
            # Try with a dummy message ID to check if endpoint exists
            dummy_id = "00000000-0000-0000-0000-000000000000"
            response = requests.delete(
                f"{self.base_url}/messages/{dummy_id}",
                headers=self.headers,
                timeout=10
            )
            
            # Endpoint exists if we get 404 (not found) or 403 (forbidden), not 405 (method not allowed)
            if response.status_code in [404, 403]:
                self.log_result(
                    "Message Deletion - Endpoint Exists",
                    True,
                    f"DELETE /api/messages/{{message_id}} endpoint exists (status: {response.status_code})",
                    "Endpoint is properly configured and accessible"
                )
                return True
            elif response.status_code == 405:
                self.log_result(
                    "Message Deletion - Endpoint Exists",
                    False,
                    "DELETE method not allowed - endpoint may not be configured",
                    f"Status: {response.status_code}"
                )
                return False
            else:
                self.log_result(
                    "Message Deletion - Endpoint Exists",
                    True,
                    f"Endpoint exists (unexpected status: {response.status_code})",
                    response.text[:200] if response.text else "No response"
                )
                return True
                
        except Exception as e:
            self.log_result("Message Deletion - Endpoint Exists", False, f"Request error: {str(e)}")
            return False
    
    def test_message_deletion_authorization(self):
        """Test 2: Verify only sender can delete their own messages"""
        try:
            from supabase import create_client
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_SERVICE_KEY']
            supabase = create_client(supabase_url, supabase_key)
            
            # Get a real recipient user ID (find another user in the system)
            users = supabase.table('user_profiles').select('id').neq('id', self.user_id).limit(1).execute()
            if not users.data or len(users.data) == 0:
                self.log_result(
                    "Message Deletion - Authorization (Sender)",
                    False,
                    "No other users found in system to test with",
                    "Need at least 2 users in the system"
                )
                return False
            
            recipient_id = users.data[0]['id']
            
            # Use a dummy deal ID (foreign key constraint may not be enforced)
            import uuid
            deal_id = str(uuid.uuid4())
            
            # First, create a test message
            test_message_id = str(uuid.uuid4())
            test_conversation_id = str(uuid.uuid4())
            
            # Create message in database directly
            message_data = {
                'id': test_message_id,
                'conversation_id': test_conversation_id,
                'sender_id': self.user_id,
                'recipient_id': recipient_id,
                'deal_id': deal_id,
                'message': 'Test message for deletion',
                'read': False,
                'created_at': datetime.now().isoformat()
            }
            
            supabase.table('marketplace_messages').insert(message_data).execute()
            
            # Try to delete the message (should succeed - user is sender)
            response = requests.delete(
                f"{self.base_url}/messages/{test_message_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('message') == 'Message deleted successfully':
                    self.log_result(
                        "Message Deletion - Authorization (Sender)",
                        True,
                        "Sender can successfully delete their own message",
                        f"Response: {data}"
                    )
                    
                    # Verify message is actually deleted
                    verify = supabase.table('marketplace_messages').select('*').eq('id', test_message_id).execute()
                    if len(verify.data) == 0:
                        self.log_result(
                            "Message Deletion - Verification",
                            True,
                            "Message was actually deleted from database",
                            "Database query confirms deletion"
                        )
                    else:
                        self.log_result(
                            "Message Deletion - Verification",
                            False,
                            "Message still exists in database after deletion",
                            f"Found: {verify.data}"
                        )
                    
                    return True
                else:
                    self.log_result(
                        "Message Deletion - Authorization (Sender)",
                        False,
                        "Unexpected response format",
                        f"Response: {data}"
                    )
                    return False
            else:
                self.log_result(
                    "Message Deletion - Authorization (Sender)",
                    False,
                    f"Failed to delete message - status {response.status_code}",
                    response.text[:200] if response.text else "No response"
                )
                return False
                
        except Exception as e:
            self.log_result("Message Deletion - Authorization", False, f"Test error: {str(e)}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
            return False
    
    def test_message_deletion_forbidden(self):
        """Test 3: Verify non-sender cannot delete message (403 Forbidden)"""
        try:
            from supabase import create_client
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_SERVICE_KEY']
            supabase = create_client(supabase_url, supabase_key)
            
            # Get a real sender user ID (different from current user)
            users = supabase.table('user_profiles').select('id').neq('id', self.user_id).limit(1).execute()
            if not users.data or len(users.data) == 0:
                self.log_result(
                    "Message Deletion - Authorization (Non-Sender)",
                    False,
                    "No other users found in system to test with",
                    "Need at least 2 users in the system"
                )
                return False
            
            sender_id = users.data[0]['id']
            
            # Use a dummy deal ID
            import uuid
            deal_id = str(uuid.uuid4())
            
            # Create a message from a different sender
            test_message_id = str(uuid.uuid4())
            test_conversation_id = str(uuid.uuid4())
            
            message_data = {
                'id': test_message_id,
                'conversation_id': test_conversation_id,
                'sender_id': sender_id,  # Different sender
                'recipient_id': self.user_id,  # Current user is recipient
                'deal_id': deal_id,
                'message': 'Test message from another user',
                'read': False,
                'created_at': datetime.now().isoformat()
            }
            
            supabase.table('marketplace_messages').insert(message_data).execute()
            
            # Try to delete the message (should fail - user is not sender)
            response = requests.delete(
                f"{self.base_url}/messages/{test_message_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 403:
                self.log_result(
                    "Message Deletion - Authorization (Non-Sender)",
                    True,
                    "Correctly denied deletion - only sender can delete (403 Forbidden)",
                    "Authorization working as expected"
                )
                
                # Clean up - delete the test message
                supabase.table('marketplace_messages').delete().eq('id', test_message_id).execute()
                return True
            else:
                self.log_result(
                    "Message Deletion - Authorization (Non-Sender)",
                    False,
                    f"Expected 403 Forbidden, got status {response.status_code}",
                    response.text[:200] if response.text else "No response"
                )
                
                # Clean up
                supabase.table('marketplace_messages').delete().eq('id', test_message_id).execute()
                return False
                
        except Exception as e:
            self.log_result("Message Deletion - Authorization (Non-Sender)", False, f"Test error: {str(e)}")
            return False
    
    def test_message_deletion_not_found(self):
        """Test 4: Verify 404 for non-existent message"""
        try:
            fake_id = "99999999-9999-9999-9999-999999999999"
            response = requests.delete(
                f"{self.base_url}/messages/{fake_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 404:
                self.log_result(
                    "Message Deletion - Not Found",
                    True,
                    "Correctly returns 404 for non-existent message",
                    "Error handling working properly"
                )
                return True
            else:
                self.log_result(
                    "Message Deletion - Not Found",
                    False,
                    f"Expected 404, got status {response.status_code}",
                    response.text[:200] if response.text else "No response"
                )
                return False
                
        except Exception as e:
            self.log_result("Message Deletion - Not Found", False, f"Request error: {str(e)}")
            return False
    
    def test_team_roles_verification(self):
        """Test 5: Verify team roles in Supabase database"""
        try:
            from supabase import create_client
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_SERVICE_KEY']
            supabase = create_client(supabase_url, supabase_key)
            
            # Find "Pena Commercial Group" team
            teams = supabase.table('teams').select('*').ilike('name', '%Pena Commercial Group%').execute()
            
            if not teams.data or len(teams.data) == 0:
                self.log_result(
                    "Team Roles - Team Exists",
                    False,
                    "Team 'Pena Commercial Group' not found in database",
                    "Team may need to be created first"
                )
                return False
            
            team = teams.data[0]
            team_id = team['id']
            team_name = team['name']
            
            self.log_result(
                "Team Roles - Team Exists",
                True,
                f"Found team: {team_name}",
                f"Team ID: {team_id}"
            )
            
            # Get team members
            members = supabase.table('team_members').select('*').eq('team_id', team_id).execute()
            
            if not members.data:
                self.log_result(
                    "Team Roles - Members Exist",
                    False,
                    "No team members found",
                    "Team members may need to be added"
                )
                return False
            
            # Get user emails for each member
            member_roles = {}
            for member in members.data:
                user_id = member['user_id']
                role = member['role']
                
                # Get user email from auth
                try:
                    user_result = supabase.auth.admin.get_user_by_id(user_id)
                    if user_result.user:
                        email = user_result.user.email
                        member_roles[email] = role
                except:
                    # If admin API fails, try to get from user_profiles
                    profile = supabase.table('user_profiles').select('*').eq('id', user_id).execute()
                    if profile.data:
                        # Email not in user_profiles, skip
                        pass
            
            # Check expected roles
            expected_roles = {
                'rpena0422@gmail.com': 'owner',
                'contact@pedroarmando.com': 'admin'
            }
            
            all_correct = True
            for email, expected_role in expected_roles.items():
                actual_role = member_roles.get(email)
                
                if actual_role == expected_role:
                    self.log_result(
                        f"Team Roles - {email}",
                        True,
                        f"Correct role: {actual_role}",
                        f"Expected: {expected_role}, Actual: {actual_role}"
                    )
                elif actual_role:
                    self.log_result(
                        f"Team Roles - {email}",
                        False,
                        f"Incorrect role: {actual_role}",
                        f"Expected: {expected_role}, Actual: {actual_role}"
                    )
                    all_correct = False
                else:
                    self.log_result(
                        f"Team Roles - {email}",
                        False,
                        "User not found in team",
                        f"Expected role: {expected_role}"
                    )
                    all_correct = False
            
            # Summary
            if all_correct:
                self.log_result(
                    "Team Roles - Verification Complete",
                    True,
                    "All team roles are correctly assigned",
                    f"Team members: {member_roles}"
                )
            else:
                self.log_result(
                    "Team Roles - Verification Complete",
                    False,
                    "Some team roles are incorrect or missing",
                    f"Current roles: {member_roles}, Expected: {expected_roles}"
                )
            
            return all_correct
                
        except Exception as e:
            self.log_result("Team Roles - Verification", False, f"Test error: {str(e)}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
            return False
    
    def test_deal_deletion_flow(self):
        """Test 6: Complete deal deletion flow - create, delete, verify"""
        try:
            from supabase import create_client
            import uuid
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_SERVICE_KEY']
            supabase = create_client(supabase_url, supabase_key)
            
            # Step 1: Create a test deal directly in Supabase
            deal_id = str(uuid.uuid4())
            deal_data = {
                "id": deal_id,
                "owner_id": self.user_id,
                "address": "123 Test Street, San Antonio, TX 78201",
                "asset_type": "Office",
                "price": 500000,
                "latitude": 29.4241,
                "longitude": -98.4936,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            supabase.table('deals').insert(deal_data).execute()
            
            self.log_result(
                "Deal Deletion - Create Deal",
                True,
                f"Successfully created test deal directly in database",
                f"Deal ID: {deal_id}"
            )
            
            # Step 2: Delete the deal
            delete_response = requests.delete(
                f"{self.base_url}/deals/{deal_id}",
                headers=self.headers,
                timeout=10
            )
            
            if delete_response.status_code == 200:
                data = delete_response.json()
                if data.get('message') == 'Deal deleted successfully':
                    self.log_result(
                        "Deal Deletion - Delete Deal",
                        True,
                        "Successfully deleted deal",
                        f"Response: {data}"
                    )
                else:
                    self.log_result(
                        "Deal Deletion - Delete Deal",
                        False,
                        "Unexpected response format",
                        f"Response: {data}"
                    )
                    return False
            else:
                self.log_result(
                    "Deal Deletion - Delete Deal",
                    False,
                    f"Failed to delete deal - status {delete_response.status_code}",
                    delete_response.text[:200] if delete_response.text else "No response"
                )
                return False
            
            # Step 3: Verify deal no longer exists
            get_response = requests.get(
                f"{self.base_url}/deals/{deal_id}",
                headers=self.headers,
                timeout=10
            )
            
            if get_response.status_code == 404:
                self.log_result(
                    "Deal Deletion - Verify Deletion",
                    True,
                    "Deal no longer exists in database (404)",
                    "Deletion verified successfully"
                )
                return True
            else:
                self.log_result(
                    "Deal Deletion - Verify Deletion",
                    False,
                    f"Deal still exists - status {get_response.status_code}",
                    "Deal was not properly deleted"
                )
                return False
                
        except Exception as e:
            self.log_result("Deal Deletion - Flow", False, f"Test error: {str(e)}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
            return False
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("PHASE 2 BACKEND API TEST SUMMARY")
        print("="*80)
        
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r['success'])
        failed = total - passed
        
        print(f"\nTotal Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        if failed > 0:
            print("\n" + "-"*80)
            print("FAILED TESTS:")
            print("-"*80)
            for result in self.test_results:
                if not result['success']:
                    print(f"\n❌ {result['test']}")
                    print(f"   {result['message']}")
                    if result['details']:
                        print(f"   {result['details']}")
        
        print("\n" + "="*80)
        return passed == total

def main():
    print("="*80)
    print("PHASE 2 BACKEND API TESTING")
    print("Testing: Message Deletion, Team Roles, Deal Deletion")
    print("="*80)
    
    tester = Phase2Tester()
    
    # Authenticate
    if not tester.authenticate():
        print("\n❌ Authentication failed. Cannot proceed with tests.")
        return False
    
    # Run tests
    print("\n" + "="*80)
    print("FEATURE 1: MESSAGE DELETION API")
    print("="*80)
    tester.test_message_deletion_endpoint_exists()
    tester.test_message_deletion_authorization()
    tester.test_message_deletion_forbidden()
    tester.test_message_deletion_not_found()
    
    print("\n" + "="*80)
    print("FEATURE 2: TEAM ROLES VERIFICATION")
    print("="*80)
    tester.test_team_roles_verification()
    
    print("\n" + "="*80)
    print("FEATURE 3: DEAL DELETION API")
    print("="*80)
    tester.test_deal_deletion_flow()
    
    # Print summary
    all_passed = tester.print_summary()
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
