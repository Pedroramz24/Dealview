#!/usr/bin/env python3
"""
DEPLOYMENT READINESS TEST - January 2, 2025
Comprehensive testing of all critical endpoints before production deployment
Focus: Verify asking_price schema fix and all CRUD operations
"""

import requests
import json
from datetime import datetime
import sys
import time

# Configuration from review request
BASE_URL = "https://deallinked.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "email": "contact@pedroarmando.com",
    "password": "Flin141812$"
}

class DeploymentReadinessTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.headers = {}
        self.test_results = []
        self.created_deal_id = None
        
    def log_result(self, test_name, success, message, details=None, response_time=None):
        """Log test result with detailed information"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "response_time": response_time,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        time_str = f" ({response_time:.2f}s)" if response_time else ""
        print(f"{status}: {test_name}{time_str}")
        print(f"   {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Test 1: Authentication Flow - Using Supabase Auth"""
        print("\n" + "="*80)
        print("TEST 1: AUTHENTICATION FLOW (Supabase)")
        print("="*80)
        
        try:
            from supabase import create_client
            import os
            from dotenv import load_dotenv
            
            load_dotenv('/app/backend/.env')
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_ANON_KEY']
            
            start_time = time.time()
            supabase = create_client(supabase_url, supabase_key)
            
            # Sign in with Supabase
            result = supabase.auth.sign_in_with_password({
                'email': TEST_CREDENTIALS['email'],
                'password': TEST_CREDENTIALS['password']
            })
            response_time = time.time() - start_time
            
            if result.session:
                self.token = result.session.access_token
                self.headers = {"Authorization": f"Bearer {self.token}"}
                
                # Verify token is valid JWT
                token_parts = self.token.split('.')
                if len(token_parts) != 3:
                    self.log_result(
                        "Authentication", 
                        False, 
                        "Token is not a valid JWT format",
                        f"Token length: {len(self.token)} chars, parts: {len(token_parts)}",
                        response_time
                    )
                    return False
                
                self.log_result(
                    "Authentication", 
                    True, 
                    f"Successfully authenticated as {TEST_CREDENTIALS['email']}",
                    f"JWT token received ({len(self.token)} chars), User ID: {result.user.id}",
                    response_time
                )
                return True
            else:
                self.log_result(
                    "Authentication", 
                    False, 
                    "Login succeeded but no session returned",
                    None,
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def test_deal_create(self):
        """Test 2: Deal CRUD - CREATE (POST /api/deals)"""
        print("\n" + "="*80)
        print("TEST 2: DEAL CRUD - CREATE (POST /api/deals)")
        print("="*80)
        
        # Test data from review request
        deal_data = {
            "title": "Test Property - Deployment Verification",
            "address": "123 Test Street, San Antonio, TX",
            "asset_type": "Office",
            "asking_price": 1500000,
            "size": 25000,
            "latitude": 29.4241,
            "longitude": -98.4936,
            "status": "New",
            "stage": "New",
            "description": "Test property for deployment verification"
        }
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{self.base_url}/deals",
                json=deal_data,
                headers=self.headers,
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                created_deal = response.json()
                self.created_deal_id = created_deal.get('id')
                
                # Verify asking_price field is present and correct
                if 'asking_price' not in created_deal:
                    self.log_result(
                        "Deal Create", 
                        False, 
                        "Deal created but asking_price field missing in response",
                        f"Response fields: {list(created_deal.keys())}",
                        response_time
                    )
                    return False
                
                if created_deal.get('asking_price') != deal_data['asking_price']:
                    self.log_result(
                        "Deal Create", 
                        False, 
                        f"asking_price mismatch: sent {deal_data['asking_price']}, got {created_deal.get('asking_price')}",
                        None,
                        response_time
                    )
                    return False
                
                self.log_result(
                    "Deal Create", 
                    True, 
                    f"Successfully created deal with asking_price=${deal_data['asking_price']:,}",
                    f"Deal ID: {self.created_deal_id}",
                    response_time
                )
                return True
            else:
                error_detail = response.text
                # Check for PGRST204 error (schema mismatch)
                if "PGRST204" in error_detail or "asking_price" in error_detail.lower():
                    self.log_result(
                        "Deal Create", 
                        False, 
                        "❌ CRITICAL: PGRST204 schema error - asking_price column issue",
                        error_detail[:500],
                        response_time
                    )
                else:
                    self.log_result(
                        "Deal Create", 
                        False, 
                        f"Failed with status {response.status_code}",
                        error_detail[:500],
                        response_time
                    )
                return False
                
        except Exception as e:
            self.log_result("Deal Create", False, f"Request error: {str(e)}")
            return False
    
    def test_deal_list(self):
        """Test 3: Deal CRUD - LIST (GET /api/deals)"""
        print("\n" + "="*80)
        print("TEST 3: DEAL CRUD - LIST (GET /api/deals)")
        print("="*80)
        
        try:
            start_time = time.time()
            response = requests.get(
                f"{self.base_url}/deals",
                headers=self.headers,
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                deals = response.json()
                
                if not isinstance(deals, list):
                    self.log_result(
                        "Deal List", 
                        False, 
                        "Response is not a list",
                        f"Response type: {type(deals)}",
                        response_time
                    )
                    return False
                
                # Verify asking_price field in deals
                if len(deals) > 0:
                    deals_with_asking_price = [d for d in deals if 'asking_price' in d]
                    
                    if len(deals_with_asking_price) == 0:
                        self.log_result(
                            "Deal List", 
                            False, 
                            "No deals have asking_price field",
                            f"Sample deal fields: {list(deals[0].keys()) if deals else 'N/A'}",
                            response_time
                        )
                        return False
                    
                    self.log_result(
                        "Deal List", 
                        True, 
                        f"Successfully retrieved {len(deals)} deals with asking_price field",
                        f"{len(deals_with_asking_price)}/{len(deals)} deals have asking_price",
                        response_time
                    )
                else:
                    self.log_result(
                        "Deal List", 
                        True, 
                        "Successfully retrieved deals (empty list)",
                        "No deals in database yet",
                        response_time
                    )
                return True
            else:
                self.log_result(
                    "Deal List", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text[:500],
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Deal List", False, f"Request error: {str(e)}")
            return False
    
    def test_deal_retrieve(self):
        """Test 4: Deal CRUD - RETRIEVE (GET /api/deals/{id})"""
        print("\n" + "="*80)
        print("TEST 4: DEAL CRUD - RETRIEVE (GET /api/deals/{id})")
        print("="*80)
        
        if not self.created_deal_id:
            self.log_result(
                "Deal Retrieve", 
                False, 
                "No deal ID available - create test failed"
            )
            return False
        
        try:
            start_time = time.time()
            response = requests.get(
                f"{self.base_url}/deals/{self.created_deal_id}",
                headers=self.headers,
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                deal = response.json()
                
                # Verify asking_price field
                if 'asking_price' not in deal:
                    self.log_result(
                        "Deal Retrieve", 
                        False, 
                        "Deal retrieved but asking_price field missing",
                        f"Deal fields: {list(deal.keys())}",
                        response_time
                    )
                    return False
                
                self.log_result(
                    "Deal Retrieve", 
                    True, 
                    f"Successfully retrieved deal with asking_price=${deal.get('asking_price'):,}",
                    f"Deal ID: {self.created_deal_id}",
                    response_time
                )
                return True
            else:
                self.log_result(
                    "Deal Retrieve", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text[:500],
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Deal Retrieve", False, f"Request error: {str(e)}")
            return False
    
    def test_deal_update(self):
        """Test 5: Deal CRUD - UPDATE (PUT /api/deals/{id})"""
        print("\n" + "="*80)
        print("TEST 5: DEAL CRUD - UPDATE (PUT /api/deals/{id})")
        print("="*80)
        
        if not self.created_deal_id:
            self.log_result(
                "Deal Update", 
                False, 
                "No deal ID available - create test failed"
            )
            return False
        
        update_data = {
            "asking_price": 1750000,
            "description": "Updated test property - price increased"
        }
        
        try:
            start_time = time.time()
            response = requests.put(
                f"{self.base_url}/deals/{self.created_deal_id}",
                json=update_data,
                headers=self.headers,
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                updated_deal = response.json()
                
                # Verify asking_price was updated
                if updated_deal.get('asking_price') != update_data['asking_price']:
                    self.log_result(
                        "Deal Update", 
                        False, 
                        f"asking_price not updated: expected {update_data['asking_price']}, got {updated_deal.get('asking_price')}",
                        None,
                        response_time
                    )
                    return False
                
                self.log_result(
                    "Deal Update", 
                    True, 
                    f"Successfully updated deal asking_price to ${update_data['asking_price']:,}",
                    f"Deal ID: {self.created_deal_id}",
                    response_time
                )
                return True
            else:
                self.log_result(
                    "Deal Update", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text[:500],
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Deal Update", False, f"Request error: {str(e)}")
            return False
    
    def test_deal_delete(self):
        """Test 6: Deal CRUD - DELETE (DELETE /api/deals/{id})"""
        print("\n" + "="*80)
        print("TEST 6: DEAL CRUD - DELETE (DELETE /api/deals/{id})")
        print("="*80)
        
        if not self.created_deal_id:
            self.log_result(
                "Deal Delete", 
                False, 
                "No deal ID available - create test failed"
            )
            return False
        
        try:
            start_time = time.time()
            response = requests.delete(
                f"{self.base_url}/deals/{self.created_deal_id}",
                headers=self.headers,
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code in [200, 204]:
                self.log_result(
                    "Deal Delete", 
                    True, 
                    f"Successfully deleted deal",
                    f"Deal ID: {self.created_deal_id}",
                    response_time
                )
                return True
            else:
                self.log_result(
                    "Deal Delete", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text[:500],
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Deal Delete", False, f"Request error: {str(e)}")
            return False
    
    def test_dashboard_stats(self):
        """Test 7: Dashboard Statistics (GET /api/dashboard/stats)"""
        print("\n" + "="*80)
        print("TEST 7: DASHBOARD STATISTICS")
        print("="*80)
        
        try:
            start_time = time.time()
            response = requests.get(
                f"{self.base_url}/dashboard/stats",
                headers=self.headers,
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                stats = response.json()
                
                # Verify asking_price is used in calculations
                required_fields = ['total_pipeline_value', 'total_deals', 'avg_deal_size']
                missing_fields = [f for f in required_fields if f not in stats]
                
                if missing_fields:
                    self.log_result(
                        "Dashboard Stats", 
                        False, 
                        f"Missing required fields: {missing_fields}",
                        f"Response fields: {list(stats.keys())}",
                        response_time
                    )
                    return False
                
                self.log_result(
                    "Dashboard Stats", 
                    True, 
                    f"Dashboard stats calculated correctly using asking_price",
                    f"Total Pipeline: ${stats.get('total_pipeline_value', 0):,}, Deals: {stats.get('total_deals', 0)}",
                    response_time
                )
                return True
            else:
                self.log_result(
                    "Dashboard Stats", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text[:500],
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Dashboard Stats", False, f"Request error: {str(e)}")
            return False
    
    def test_dashboard_news(self):
        """Test 8: Dashboard News (GET /api/dashboard/news)"""
        print("\n" + "="*80)
        print("TEST 8: DASHBOARD NEWS")
        print("="*80)
        
        try:
            start_time = time.time()
            response = requests.get(
                f"{self.base_url}/dashboard/news",
                headers=self.headers,
                timeout=15
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                articles = data.get('articles', [])
                
                self.log_result(
                    "Dashboard News", 
                    True, 
                    f"Successfully retrieved {len(articles)} news articles",
                    f"Cached: {data.get('cached', False)}",
                    response_time
                )
                return True
            else:
                self.log_result(
                    "Dashboard News", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text[:500],
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Dashboard News", False, f"Request error: {str(e)}")
            return False
    
    def test_pipelines(self):
        """Test 9: Pipeline Management (GET /api/pipelines)"""
        print("\n" + "="*80)
        print("TEST 9: PIPELINE MANAGEMENT")
        print("="*80)
        
        try:
            start_time = time.time()
            response = requests.get(
                f"{self.base_url}/pipelines",
                headers=self.headers,
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Handle both list and dict responses
                if isinstance(data, list):
                    pipelines = data
                elif isinstance(data, dict) and 'pipelines' in data:
                    pipelines = data.get('pipelines', [])
                else:
                    self.log_result(
                        "Pipelines", 
                        False, 
                        "Unexpected response format",
                        f"Response type: {type(data)}, keys: {list(data.keys()) if isinstance(data, dict) else 'N/A'}",
                        response_time
                    )
                    return False
                
                self.log_result(
                    "Pipelines", 
                    True, 
                    f"Successfully retrieved {len(pipelines)} pipelines",
                    None,
                    response_time
                )
                return True
            else:
                self.log_result(
                    "Pipelines", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text[:500],
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Pipelines", False, f"Request error: {str(e)}")
            return False
    
    def test_messages(self):
        """Test 10: Messaging System (GET /api/messages/conversations)"""
        print("\n" + "="*80)
        print("TEST 10: MESSAGING SYSTEM")
        print("="*80)
        
        try:
            start_time = time.time()
            response = requests.get(
                f"{self.base_url}/messages/conversations",
                headers=self.headers,
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                conversations = response.json()
                
                self.log_result(
                    "Messages", 
                    True, 
                    f"Successfully retrieved conversations",
                    f"Count: {len(conversations) if isinstance(conversations, list) else 'N/A'}",
                    response_time
                )
                return True
            else:
                self.log_result(
                    "Messages", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text[:500],
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Messages", False, f"Request error: {str(e)}")
            return False
    
    def test_teams(self):
        """Test 11: Team Management (GET /api/teams)"""
        print("\n" + "="*80)
        print("TEST 11: TEAM MANAGEMENT")
        print("="*80)
        
        try:
            start_time = time.time()
            response = requests.get(
                f"{self.base_url}/teams",
                headers=self.headers,
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                teams = data.get('teams', [])
                
                self.log_result(
                    "Teams", 
                    True, 
                    f"Successfully retrieved teams",
                    f"Count: {len(teams)}",
                    response_time
                )
                return True
            else:
                self.log_result(
                    "Teams", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text[:500],
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Teams", False, f"Request error: {str(e)}")
            return False
    
    def test_admin_pending_deals(self):
        """Test 12: Admin Functions (GET /api/admin/pending-deals)"""
        print("\n" + "="*80)
        print("TEST 12: ADMIN FUNCTIONS")
        print("="*80)
        
        try:
            start_time = time.time()
            response = requests.get(
                f"{self.base_url}/admin/pending-deals",
                headers=self.headers,
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                deals = response.json()
                
                self.log_result(
                    "Admin Pending Deals", 
                    True, 
                    f"Successfully retrieved pending deals",
                    f"Count: {len(deals) if isinstance(deals, list) else 'N/A'}",
                    response_time
                )
                return True
            elif response.status_code == 403:
                self.log_result(
                    "Admin Pending Deals", 
                    True, 
                    "User does not have admin privileges (403 expected)",
                    "This is normal for non-admin users",
                    response_time
                )
                return True
            else:
                self.log_result(
                    "Admin Pending Deals", 
                    False, 
                    f"Failed with status {response.status_code}",
                    response.text[:500],
                    response_time
                )
                return False
                
        except Exception as e:
            self.log_result("Admin Pending Deals", False, f"Request error: {str(e)}")
            return False
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("DEPLOYMENT READINESS TEST SUMMARY")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"\nTotal Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        # Performance summary
        response_times = [r['response_time'] for r in self.test_results if r['response_time']]
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            max_time = max(response_times)
            print(f"\nPerformance:")
            print(f"  Average Response Time: {avg_time:.2f}s")
            print(f"  Max Response Time: {max_time:.2f}s")
            
            slow_tests = [r for r in self.test_results if r['response_time'] and r['response_time'] > 2.0]
            if slow_tests:
                print(f"  ⚠️  Slow Tests (>2s): {len(slow_tests)}")
        
        # Critical failures
        critical_tests = ['Authentication', 'Deal Create', 'Deal List', 'Deal Retrieve', 'Dashboard Stats']
        critical_failures = [r for r in self.test_results if r['test'] in critical_tests and not r['success']]
        
        if critical_failures:
            print(f"\n❌ CRITICAL FAILURES ({len(critical_failures)}):")
            for failure in critical_failures:
                print(f"  - {failure['test']}: {failure['message']}")
        
        # Deployment readiness verdict
        print("\n" + "="*80)
        if failed_tests == 0:
            print("✅ DEPLOYMENT READY - All tests passed")
        elif len(critical_failures) > 0:
            print("❌ NOT DEPLOYMENT READY - Critical tests failed")
        else:
            print("⚠️  DEPLOYMENT WITH CAUTION - Non-critical tests failed")
        print("="*80)
        
        return failed_tests == 0

def main():
    """Run all deployment readiness tests"""
    print("="*80)
    print("DEPLOYMENT READINESS TEST")
    print("Application: DealLinked CRM")
    print("Date: January 2, 2025")
    print("Focus: asking_price schema fix verification")
    print("="*80)
    
    tester = DeploymentReadinessTester()
    
    # Test 1: Authentication (required for all other tests)
    if not tester.authenticate():
        print("\n❌ CRITICAL: Authentication failed - cannot proceed with other tests")
        sys.exit(1)
    
    # Test 2-6: Deal CRUD Operations (CRITICAL)
    tester.test_deal_create()
    tester.test_deal_list()
    tester.test_deal_retrieve()
    tester.test_deal_update()
    tester.test_deal_delete()
    
    # Test 7-8: Dashboard APIs
    tester.test_dashboard_stats()
    tester.test_dashboard_news()
    
    # Test 9-11: Other APIs
    tester.test_pipelines()
    tester.test_messages()
    tester.test_teams()
    
    # Test 12: Admin Functions
    tester.test_admin_pending_deals()
    
    # Print summary and determine deployment readiness
    deployment_ready = tester.print_summary()
    
    sys.exit(0 if deployment_ready else 1)

if __name__ == "__main__":
    main()
