#!/usr/bin/env python3
"""
Final Backend Deployment Verification Test
Tests all critical paths for deployment readiness
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Tuple

# Configuration
BASE_URL = "https://realty-crm-dev.preview.emergentagent.com/api"
SUPABASE_URL = "https://ygezobmpewthqvsfqrbk.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"
EMAIL = "contact@pedroarmando.com"
PASSWORD = "Flin141812$"

# Test Results Storage
test_results = []
performance_metrics = []

def log_test(name: str, passed: bool, message: str, duration: float = 0):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append({
        "name": name,
        "passed": passed,
        "message": message,
        "duration": duration
    })
    print(f"{status} | {name} | {message} | {duration:.2f}s")

def measure_time(func):
    """Decorator to measure function execution time"""
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        duration = time.time() - start
        performance_metrics.append(duration)
        return result, duration
    return wrapper

class DeploymentTester:
    def __init__(self):
        self.token = None
        self.headers = {}
        self.created_deal_id = None
        
    def authenticate(self) -> Tuple[bool, str]:
        """Test authentication and get token via Supabase"""
        try:
            start = time.time()
            # Authenticate with Supabase
            response = requests.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                json={"email": EMAIL, "password": PASSWORD},
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                },
                timeout=10
            )
            duration = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
                log_test("Authentication", True, f"Login successful, token received ({len(self.token)} chars)", duration)
                return True, "Success"
            else:
                log_test("Authentication", False, f"Login failed: {response.status_code} - {response.text[:200]}", duration)
                return False, f"Status {response.status_code}"
        except Exception as e:
            log_test("Authentication", False, f"Exception: {str(e)}", 0)
            return False, str(e)
    
    @measure_time
    def test_create_deal(self):
        """Test 1: Create deal with required fields"""
        try:
            deal_data = {
                "title": "Test Property - Final Verification",
                "address": "123 Main St, San Antonio, TX 78205",
                "asset_type": "Office",
                "asking_price": 2500000,  # Use asking_price as per schema
                "size": 15000,
                "latitude": 29.4241,
                "longitude": -98.4936
            }
            
            response = requests.post(
                f"{BASE_URL}/deals",
                json=deal_data,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.created_deal_id = data.get("id")
                return True, f"Deal created: {self.created_deal_id}"
            else:
                return False, f"Status {response.status_code}: {response.text[:200]}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    @measure_time
    def test_get_deals(self):
        """Test 2: Verify deal appears in GET /api/deals"""
        try:
            response = requests.get(
                f"{BASE_URL}/deals",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                deals = response.json()
                if isinstance(deals, list):
                    # Check if our created deal is in the list
                    found = any(d.get("id") == self.created_deal_id for d in deals)
                    if found:
                        return True, f"Deal found in list ({len(deals)} total deals)"
                    else:
                        return False, f"Created deal not found in list"
                else:
                    return False, f"Unexpected response format"
            else:
                return False, f"Status {response.status_code}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    @measure_time
    def test_update_deal(self):
        """Test 3: Update deal asking_price"""
        try:
            if not self.created_deal_id:
                return False, "No deal ID available"
            
            update_data = {
                "asking_price": 2750000  # Updated price
            }
            
            response = requests.put(
                f"{BASE_URL}/deals/{self.created_deal_id}",
                json=update_data,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                updated_price = data.get("asking_price")
                if updated_price == 2750000:
                    return True, f"Price updated successfully to ${updated_price:,}"
                else:
                    return False, f"Price not updated correctly: {updated_price}"
            else:
                return False, f"Status {response.status_code}: {response.text[:200]}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    @measure_time
    def test_move_pipeline_stage(self):
        """Test 4: Move deal to different pipeline stage"""
        try:
            if not self.created_deal_id:
                return False, "No deal ID available"
            
            # First, get pipelines to find a valid stage
            pipelines_response = requests.get(
                f"{BASE_URL}/pipelines",
                headers=self.headers,
                timeout=10
            )
            
            if pipelines_response.status_code != 200:
                return False, f"Could not fetch pipelines: {pipelines_response.status_code}"
            
            pipelines = pipelines_response.json()
            if not pipelines or len(pipelines) == 0:
                return False, "No pipelines available"
            
            # Get first pipeline's first stage
            first_pipeline = pipelines[0]
            stages = first_pipeline.get("pipeline_stages", [])
            if not stages or len(stages) == 0:
                return False, "No stages available in pipeline"
            
            target_stage_id = stages[0].get("id")
            
            # Update deal stage
            update_data = {
                "stage_id": target_stage_id
            }
            
            response = requests.put(
                f"{BASE_URL}/deals/{self.created_deal_id}",
                json=update_data,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return True, f"Deal moved to stage {target_stage_id}"
            else:
                return False, f"Status {response.status_code}: {response.text[:200]}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    @measure_time
    def test_delete_deal(self):
        """Test 5: Delete deal"""
        try:
            if not self.created_deal_id:
                return False, "No deal ID available"
            
            response = requests.delete(
                f"{BASE_URL}/deals/{self.created_deal_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code in [200, 204]:
                # Verify deletion
                verify_response = requests.get(
                    f"{BASE_URL}/deals/{self.created_deal_id}",
                    headers=self.headers,
                    timeout=10
                )
                if verify_response.status_code == 404:
                    return True, "Deal deleted and verified"
                else:
                    return False, "Deal still exists after deletion"
            else:
                return False, f"Status {response.status_code}: {response.text[:200]}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    @measure_time
    def test_get_pipelines(self):
        """Test 6: GET /api/pipelines with pipeline_stages relationship"""
        try:
            response = requests.get(
                f"{BASE_URL}/pipelines",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                pipelines = response.json()
                if isinstance(pipelines, list) and len(pipelines) > 0:
                    # Check if pipeline_stages relationship is loaded
                    first_pipeline = pipelines[0]
                    if "pipeline_stages" in first_pipeline:
                        stages = first_pipeline.get("pipeline_stages", [])
                        return True, f"Pipelines loaded with stages ({len(pipelines)} pipelines, {len(stages)} stages in first)"
                    else:
                        return False, "pipeline_stages relationship not loaded"
                else:
                    return False, "No pipelines returned"
            else:
                return False, f"Status {response.status_code}: {response.text[:200]}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    @measure_time
    def test_dashboard_stats(self):
        """Test 7: GET /api/dashboard/stats"""
        try:
            response = requests.get(
                f"{BASE_URL}/dashboard/stats",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                # Check for expected fields
                expected_fields = ["total_pipeline_value", "total_deals", "avg_deal_size"]
                has_fields = all(field in data for field in expected_fields)
                if has_fields:
                    return True, f"Dashboard stats returned: {data.get('total_deals')} deals, ${data.get('total_pipeline_value', 0):,} value"
                else:
                    return False, f"Missing expected fields in response"
            else:
                return False, f"Status {response.status_code}: {response.text[:200]}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    @measure_time
    def test_messages_conversations(self):
        """Test 8: GET /api/messages/conversations"""
        try:
            response = requests.get(
                f"{BASE_URL}/messages/conversations",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                # Should return array or object with conversations
                return True, f"Conversations endpoint working"
            else:
                return False, f"Status {response.status_code}: {response.text[:200]}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    @measure_time
    def test_teams(self):
        """Test 9: GET /api/teams"""
        try:
            response = requests.get(
                f"{BASE_URL}/teams",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                # Should return teams object
                teams = data.get("teams", []) if isinstance(data, dict) else data
                return True, f"Teams endpoint working ({len(teams) if isinstance(teams, list) else 0} teams)"
            else:
                return False, f"Status {response.status_code}: {response.text[:200]}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    @measure_time
    def test_invalid_token(self):
        """Test 10: Invalid token returns 401"""
        try:
            invalid_headers = {"Authorization": "Bearer invalid_token_12345"}
            response = requests.get(
                f"{BASE_URL}/deals",
                headers=invalid_headers,
                timeout=10
            )
            
            if response.status_code == 401:
                return True, "Invalid token correctly rejected with 401"
            else:
                return False, f"Expected 401, got {response.status_code}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    @measure_time
    def test_missing_token(self):
        """Test 11: Missing token returns 403"""
        try:
            response = requests.get(
                f"{BASE_URL}/deals",
                timeout=10
            )
            
            if response.status_code in [401, 403]:
                return True, f"Missing token correctly rejected with {response.status_code}"
            else:
                return False, f"Expected 401/403, got {response.status_code}"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    def run_all_tests(self):
        """Run all deployment verification tests"""
        print("\n" + "="*80)
        print("FINAL BACKEND DEPLOYMENT VERIFICATION")
        print("="*80 + "\n")
        
        # Authenticate first
        auth_success, auth_msg = self.authenticate()
        if not auth_success:
            print(f"\n❌ CRITICAL: Authentication failed - {auth_msg}")
            print("Cannot proceed with tests without authentication")
            return
        
        print("\n--- CRITICAL PATH: End-to-End Deal Flow ---")
        result, duration = self.test_create_deal()
        passed = result[0] if isinstance(result, tuple) else result
        message = result[1] if isinstance(result, tuple) else str(result)
        log_test("1. Create Deal", passed, message, duration)
        
        result, duration = self.test_get_deals()
        passed = result[0] if isinstance(result, tuple) else result
        message = result[1] if isinstance(result, tuple) else str(result)
        log_test("2. Get Deals", passed, message, duration)
        
        result, duration = self.test_update_deal()
        passed = result[0] if isinstance(result, tuple) else result
        message = result[1] if isinstance(result, tuple) else str(result)
        log_test("3. Update Deal Price", passed, message, duration)
        
        result, duration = self.test_move_pipeline_stage()
        passed = result[0] if isinstance(result, tuple) else result
        message = result[1] if isinstance(result, tuple) else str(result)
        log_test("4. Move Pipeline Stage", passed, message, duration)
        
        result, duration = self.test_delete_deal()
        passed = result[0] if isinstance(result, tuple) else result
        message = result[1] if isinstance(result, tuple) else str(result)
        log_test("5. Delete Deal", passed, message, duration)
        
        print("\n--- CRITICAL PATH: Pipeline & Stage Management ---")
        result, duration = self.test_get_pipelines()
        passed = result[0] if isinstance(result, tuple) else result
        message = result[1] if isinstance(result, tuple) else str(result)
        log_test("6. Get Pipelines with Stages", passed, message, duration)
        
        print("\n--- CRITICAL PATH: Core APIs ---")
        result, duration = self.test_dashboard_stats()
        passed = result[0] if isinstance(result, tuple) else result
        message = result[1] if isinstance(result, tuple) else str(result)
        log_test("7. Dashboard Stats", passed, message, duration)
        
        result, duration = self.test_messages_conversations()
        passed = result[0] if isinstance(result, tuple) else result
        message = result[1] if isinstance(result, tuple) else str(result)
        log_test("8. Messages Conversations", passed, message, duration)
        
        result, duration = self.test_teams()
        passed = result[0] if isinstance(result, tuple) else result
        message = result[1] if isinstance(result, tuple) else str(result)
        log_test("9. Teams", passed, message, duration)
        
        print("\n--- SECURITY: Authorization ---")
        result, duration = self.test_invalid_token()
        passed = result[0] if isinstance(result, tuple) else result
        message = result[1] if isinstance(result, tuple) else str(result)
        log_test("10. Invalid Token (401)", passed, message, duration)
        
        result, duration = self.test_missing_token()
        passed = result[0] if isinstance(result, tuple) else result
        message = result[1] if isinstance(result, tuple) else str(result)
        log_test("11. Missing Token (403)", passed, message, duration)
        
        # Generate final report
        self.generate_report()
    
    def generate_report(self):
        """Generate final deployment verdict"""
        print("\n" + "="*80)
        print("FINAL DEPLOYMENT VERDICT")
        print("="*80 + "\n")
        
        total_tests = len(test_results)
        passed_tests = sum(1 for t in test_results if t["passed"])
        failed_tests = total_tests - passed_tests
        pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📊 TOTAL TESTS: {total_tests}")
        print(f"✅ PASSED: {passed_tests}")
        print(f"❌ FAILED: {failed_tests}")
        print(f"📈 PASS RATE: {pass_rate:.1f}%")
        
        # Performance metrics
        if performance_metrics:
            avg_response_time = sum(performance_metrics) / len(performance_metrics)
            max_response_time = max(performance_metrics)
            print(f"\n⚡ PERFORMANCE:")
            print(f"   Average Response Time: {avg_response_time:.2f}s")
            print(f"   Max Response Time: {max_response_time:.2f}s")
            
            if max_response_time > 2.0:
                print(f"   ⚠️  WARNING: Some endpoints exceed 2s threshold")
            else:
                print(f"   ✅ All endpoints under 2s threshold")
        
        # Check for schema errors
        schema_errors = [t for t in test_results if "schema" in t["message"].lower() or "mismatch" in t["message"].lower()]
        if schema_errors:
            print(f"\n⚠️  SCHEMA ERRORS DETECTED: {len(schema_errors)}")
            for error in schema_errors:
                print(f"   - {error['name']}: {error['message']}")
        else:
            print(f"\n✅ NO SCHEMA ERRORS")
        
        # List failed tests
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for test in test_results:
                if not test["passed"]:
                    print(f"   - {test['name']}: {test['message']}")
        
        # Final verdict
        print("\n" + "="*80)
        if pass_rate >= 90 and max_response_time <= 2.0 and len(schema_errors) == 0:
            print("✅ DEPLOYMENT READY")
            print("   All critical paths working, performance acceptable, no schema errors")
        else:
            print("❌ FIXES NEEDED")
            reasons = []
            if pass_rate < 90:
                reasons.append(f"Pass rate {pass_rate:.1f}% < 90%")
            if max_response_time > 2.0:
                reasons.append(f"Performance issues (max {max_response_time:.2f}s > 2s)")
            if len(schema_errors) > 0:
                reasons.append(f"Schema errors detected ({len(schema_errors)})")
            print("   Reasons: " + ", ".join(reasons))
        print("="*80 + "\n")

if __name__ == "__main__":
    tester = DeploymentTester()
    tester.run_all_tests()
