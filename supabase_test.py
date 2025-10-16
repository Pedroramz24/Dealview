#!/usr/bin/env python3
"""
Supabase Backend Integration Testing
Tests Supabase Auth, RLS Policies, and Data Operations
"""

import sys
import os
import json
from datetime import datetime
import uuid

# Install supabase if not available
try:
    from supabase import create_client, Client
except ImportError:
    print("Installing supabase-py...")
    os.system("pip install supabase -q")
    from supabase import create_client, Client

# Supabase Configuration
SUPABASE_URL = "https://ygezobmpewthqvsfqrbk.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"

class SupabaseTester:
    def __init__(self):
        self.test_results = []
        self.user1_client = None
        self.user2_client = None
        self.user1_id = None
        self.user2_id = None
        self.user1_email = None
        self.user2_email = None
        
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
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_supabase_connection(self):
        """Test 1: Verify Supabase connection is working"""
        try:
            client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            
            # Try to query a table (should work even if empty)
            response = client.table('user_profiles').select('*').limit(1).execute()
            
            self.log_result(
                "Supabase Connection",
                True,
                "Successfully connected to Supabase",
                f"URL: {SUPABASE_URL}"
            )
            return True
        except Exception as e:
            self.log_result(
                "Supabase Connection",
                False,
                f"Failed to connect to Supabase: {str(e)}"
            )
            return False
    
    def test_auth_signup_user1(self):
        """Test 2a: Create first test user account"""
        try:
            # Generate unique email for testing
            unique_id = str(uuid.uuid4())[:8]
            self.user1_email = f"testuser1_{unique_id}@dealview.test"
            password = "TestPassword123!"
            
            # Create client and sign up
            self.user1_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            response = self.user1_client.auth.sign_up({
                "email": self.user1_email,
                "password": password
            })
            
            if response.user:
                self.user1_id = response.user.id
                self.log_result(
                    "Auth Signup User 1",
                    True,
                    f"Successfully created user account: {self.user1_email}",
                    f"User ID: {self.user1_id}"
                )
                return True
            else:
                self.log_result(
                    "Auth Signup User 1",
                    False,
                    "Signup returned no user object",
                    str(response)
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Auth Signup User 1",
                False,
                f"Signup failed: {str(e)}"
            )
            return False
    
    def test_auth_signup_user2(self):
        """Test 2b: Create second test user account"""
        try:
            # Generate unique email for testing
            unique_id = str(uuid.uuid4())[:8]
            self.user2_email = f"testuser2_{unique_id}@dealview.test"
            password = "TestPassword123!"
            
            # Create client and sign up
            self.user2_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            response = self.user2_client.auth.sign_up({
                "email": self.user2_email,
                "password": password
            })
            
            if response.user:
                self.user2_id = response.user.id
                self.log_result(
                    "Auth Signup User 2",
                    True,
                    f"Successfully created user account: {self.user2_email}",
                    f"User ID: {self.user2_id}"
                )
                return True
            else:
                self.log_result(
                    "Auth Signup User 2",
                    False,
                    "Signup returned no user object",
                    str(response)
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Auth Signup User 2",
                False,
                f"Signup failed: {str(e)}"
            )
            return False
    
    def test_auth_session(self):
        """Test 3: Verify session is created after signup"""
        try:
            session = self.user1_client.auth.get_session()
            
            if session and session.access_token:
                self.log_result(
                    "Auth Session",
                    True,
                    "Session created successfully with access token",
                    f"Token length: {len(session.access_token)}"
                )
                return True
            else:
                self.log_result(
                    "Auth Session",
                    False,
                    "No session or access token found"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Auth Session",
                False,
                f"Session check failed: {str(e)}"
            )
            return False
    
    def test_user_profile_auto_created(self):
        """Test 4: Verify user profile is auto-created by trigger"""
        try:
            # Query user_profiles table for user1
            response = self.user1_client.table('user_profiles').select('*').eq('id', self.user1_id).execute()
            
            if response.data and len(response.data) > 0:
                profile = response.data[0]
                self.log_result(
                    "User Profile Auto-Created",
                    True,
                    f"Profile auto-created for user {self.user1_email}",
                    f"Profile data: {profile}"
                )
                return True
            else:
                self.log_result(
                    "User Profile Auto-Created",
                    False,
                    "No profile found - trigger may not be working",
                    f"Response: {response.data}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "User Profile Auto-Created",
                False,
                f"Profile query failed: {str(e)}"
            )
            return False
    
    def test_rls_user_profile_isolation(self):
        """Test 5: Verify user CANNOT read other users' profiles (RLS)"""
        try:
            # User 1 tries to read User 2's profile
            response = self.user1_client.table('user_profiles').select('*').eq('id', self.user2_id).execute()
            
            # Should return empty array due to RLS (user can't see other profiles)
            # Empty array means RLS IS working correctly
            if len(response.data) == 0:
                self.log_result(
                    "RLS User Profile Isolation",
                    True,
                    "User 1 CANNOT see User 2's profile (RLS working)",
                    "RLS policy correctly enforcing data isolation"
                )
                return True
            else:
                self.log_result(
                    "RLS User Profile Isolation",
                    False,
                    "User 1 CAN see User 2's profile - RLS NOT working!",
                    f"Response: {response.data}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "RLS User Profile Isolation",
                False,
                f"RLS test failed: {str(e)}"
            )
            return False
    
    def test_create_deal_user1(self):
        """Test 6a: Create a deal for User 1"""
        try:
            deal_data = {
                "owner_id": self.user1_id,
                "title": "User 1 Test Property",
                "address": "123 Main St",
                "city": "Austin",
                "state": "TX",
                "zip_code": "78701",
                "asset_type": "Office",
                "size": 5000,
                "price": 1500000,
                "description": "Test property for User 1",
                "latitude": 30.2672,
                "longitude": -97.7431,
                "status": "active",
                "stage": "prospecting"
            }
            
            response = self.user1_client.table('deals').insert(deal_data).execute()
            
            if response.data and len(response.data) > 0:
                self.user1_deal_id = response.data[0]['id']
                self.log_result(
                    "Create Deal User 1",
                    True,
                    f"Successfully created deal for User 1",
                    f"Deal ID: {self.user1_deal_id}"
                )
                return True
            else:
                self.log_result(
                    "Create Deal User 1",
                    False,
                    "Failed to create deal",
                    f"Response: {response.data}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Create Deal User 1",
                False,
                f"Deal creation failed: {str(e)}"
            )
            return False
    
    def test_create_deal_user2(self):
        """Test 6b: Create a deal for User 2"""
        try:
            deal_data = {
                "owner_id": self.user2_id,
                "title": "User 2 Test Property",
                "address": "456 Oak Ave",
                "city": "San Antonio",
                "state": "TX",
                "zip_code": "78201",
                "asset_type": "Retail",
                "size": 8000,
                "price": 2500000,
                "description": "Test property for User 2",
                "latitude": 29.4241,
                "longitude": -98.4936,
                "status": "active",
                "stage": "prospecting"
            }
            
            response = self.user2_client.table('deals').insert(deal_data).execute()
            
            if response.data and len(response.data) > 0:
                self.user2_deal_id = response.data[0]['id']
                self.log_result(
                    "Create Deal User 2",
                    True,
                    f"Successfully created deal for User 2",
                    f"Deal ID: {self.user2_deal_id}"
                )
                return True
            else:
                self.log_result(
                    "Create Deal User 2",
                    False,
                    "Failed to create deal",
                    f"Response: {response.data}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Create Deal User 2",
                False,
                f"Deal creation failed: {str(e)}"
            )
            return False
    
    def test_read_own_deals(self):
        """Test 7: Verify user can read their own deals"""
        try:
            response = self.user1_client.table('deals').select('*').eq('owner_id', self.user1_id).execute()
            
            if response.data and len(response.data) > 0:
                self.log_result(
                    "Read Own Deals",
                    True,
                    f"User 1 can read their own deals ({len(response.data)} found)",
                    f"Deal titles: {[d['title'] for d in response.data]}"
                )
                return True
            else:
                self.log_result(
                    "Read Own Deals",
                    False,
                    "User 1 cannot read their own deals",
                    f"Response: {response.data}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Read Own Deals",
                False,
                f"Read deals failed: {str(e)}"
            )
            return False
    
    def test_rls_deal_isolation(self):
        """Test 8: Verify User 1 CANNOT see User 2's deals (RLS)"""
        try:
            # User 1 tries to query all deals (should only see their own)
            response = self.user1_client.table('deals').select('*').execute()
            
            # Check if any deals belong to User 2
            user2_deals = [d for d in response.data if d['owner_id'] == self.user2_id]
            
            if len(user2_deals) == 0:
                self.log_result(
                    "RLS Deal Isolation",
                    True,
                    "User 1 CANNOT see User 2's deals (RLS working)",
                    f"User 1 sees {len(response.data)} deals (all their own)"
                )
                return True
            else:
                self.log_result(
                    "RLS Deal Isolation",
                    False,
                    "User 1 CAN see User 2's deals - RLS NOT working!",
                    f"Found {len(user2_deals)} deals belonging to User 2"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "RLS Deal Isolation",
                False,
                f"RLS test failed: {str(e)}"
            )
            return False
    
    def test_create_contact_user1(self):
        """Test 9: Create contact for User 1"""
        try:
            contact_data = {
                "owner_id": self.user1_id,
                "name": "John Smith",
                "email": "john.smith@example.com",
                "phone": "512-555-0100",
                "company": "Smith Properties",
                "title": "Broker",
                "notes": "Test contact for User 1"
            }
            
            response = self.user1_client.table('contacts').insert(contact_data).execute()
            
            if response.data and len(response.data) > 0:
                self.user1_contact_id = response.data[0]['id']
                self.log_result(
                    "Create Contact User 1",
                    True,
                    f"Successfully created contact for User 1",
                    f"Contact ID: {self.user1_contact_id}"
                )
                return True
            else:
                self.log_result(
                    "Create Contact User 1",
                    False,
                    "Failed to create contact",
                    f"Response: {response.data}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Create Contact User 1",
                False,
                f"Contact creation failed: {str(e)}"
            )
            return False
    
    def test_rls_contact_isolation(self):
        """Test 10: Verify User 1 CANNOT see User 2's contacts (RLS)"""
        try:
            # First, create a contact for User 2
            contact_data = {
                "owner_id": self.user2_id,
                "name": "Jane Doe",
                "email": "jane.doe@example.com",
                "phone": "210-555-0200",
                "company": "Doe Realty",
                "title": "Agent"
            }
            self.user2_client.table('contacts').insert(contact_data).execute()
            
            # Now User 1 tries to query all contacts
            response = self.user1_client.table('contacts').select('*').execute()
            
            # Check if any contacts belong to User 2
            user2_contacts = [c for c in response.data if c['owner_id'] == self.user2_id]
            
            if len(user2_contacts) == 0:
                self.log_result(
                    "RLS Contact Isolation",
                    True,
                    "User 1 CANNOT see User 2's contacts (RLS working)",
                    f"User 1 sees {len(response.data)} contacts (all their own)"
                )
                return True
            else:
                self.log_result(
                    "RLS Contact Isolation",
                    False,
                    "User 1 CAN see User 2's contacts - RLS NOT working!",
                    f"Found {len(user2_contacts)} contacts belonging to User 2"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "RLS Contact Isolation",
                False,
                f"RLS test failed: {str(e)}"
            )
            return False
    
    def test_storage_buckets_exist(self):
        """Test 11: Verify storage buckets exist"""
        try:
            # List all buckets
            buckets = self.user1_client.storage.list_buckets()
            
            bucket_names = [b.name for b in buckets]
            
            expected_buckets = ['property-images', 'deal-documents']
            missing_buckets = [b for b in expected_buckets if b not in bucket_names]
            
            if len(missing_buckets) == 0:
                self.log_result(
                    "Storage Buckets Exist",
                    True,
                    "All required storage buckets exist",
                    f"Buckets: {bucket_names}"
                )
                return True
            else:
                self.log_result(
                    "Storage Buckets Exist",
                    False,
                    f"Missing storage buckets: {missing_buckets}",
                    f"Found buckets: {bucket_names}"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Storage Buckets Exist",
                False,
                f"Bucket check failed: {str(e)}"
            )
            return False
    
    def test_storage_upload_property_image(self):
        """Test 12: Test file upload to property-images bucket"""
        try:
            # Create a small test file
            test_content = b"Test image content for property"
            file_path = f"{self.user1_id}/test-property.jpg"
            
            # Upload file
            response = self.user1_client.storage.from_('property-images').upload(
                file_path,
                test_content,
                {"content-type": "image/jpeg"}
            )
            
            if response:
                # Get public URL
                public_url = self.user1_client.storage.from_('property-images').get_public_url(file_path)
                
                self.log_result(
                    "Storage Upload Property Image",
                    True,
                    "Successfully uploaded image to property-images bucket",
                    f"File path: {file_path}, URL: {public_url}"
                )
                return True
            else:
                self.log_result(
                    "Storage Upload Property Image",
                    False,
                    "Upload returned no response"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Storage Upload Property Image",
                False,
                f"Upload failed: {str(e)}"
            )
            return False
    
    def test_storage_upload_deal_document(self):
        """Test 13: Test file upload to deal-documents bucket"""
        try:
            # Create a small test file
            test_content = b"Test document content for deal"
            file_path = f"{self.user1_id}/test-document.pdf"
            
            # Upload file
            response = self.user1_client.storage.from_('deal-documents').upload(
                file_path,
                test_content,
                {"content-type": "application/pdf"}
            )
            
            if response:
                self.log_result(
                    "Storage Upload Deal Document",
                    True,
                    "Successfully uploaded document to deal-documents bucket",
                    f"File path: {file_path}"
                )
                return True
            else:
                self.log_result(
                    "Storage Upload Deal Document",
                    False,
                    "Upload returned no response"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Storage Upload Deal Document",
                False,
                f"Upload failed: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all Supabase integration tests"""
        print("=" * 70)
        print("SUPABASE BACKEND INTEGRATION TESTING")
        print("=" * 70)
        print(f"Supabase URL: {SUPABASE_URL}")
        print()
        
        # Test 1: Connection
        print("TEST 1: SUPABASE CONNECTION")
        print("-" * 50)
        if not self.test_supabase_connection():
            print("\n❌ Cannot proceed - Supabase connection failed")
            return False
        print()
        
        # Test 2: Authentication
        print("TEST 2-3: AUTHENTICATION")
        print("-" * 50)
        if not self.test_auth_signup_user1():
            print("\n❌ Cannot proceed - User 1 signup failed")
            return False
        if not self.test_auth_signup_user2():
            print("\n❌ Cannot proceed - User 2 signup failed")
            return False
        self.test_auth_session()
        print()
        
        # Test 4-5: User Profiles & RLS
        print("TEST 4-5: USER PROFILES & RLS")
        print("-" * 50)
        self.test_user_profile_auto_created()
        self.test_rls_user_profile_isolation()
        print()
        
        # Test 6-8: Deals & RLS
        print("TEST 6-8: DEALS & RLS ISOLATION")
        print("-" * 50)
        self.test_create_deal_user1()
        self.test_create_deal_user2()
        self.test_read_own_deals()
        self.test_rls_deal_isolation()
        print()
        
        # Test 9-10: Contacts & RLS
        print("TEST 9-10: CONTACTS & RLS ISOLATION")
        print("-" * 50)
        self.test_create_contact_user1()
        self.test_rls_contact_isolation()
        print()
        
        # Test 11-13: Storage
        print("TEST 11-13: STORAGE BUCKETS & UPLOADS")
        print("-" * 50)
        self.test_storage_buckets_exist()
        self.test_storage_upload_property_image()
        self.test_storage_upload_deal_document()
        print()
        
        # Summary
        print("=" * 70)
        print("TEST SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print()
        
        if failed_tests > 0:
            print("FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  ❌ {result['test']}: {result['message']}")
                    if result['details']:
                        print(f"     {result['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = SupabaseTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
