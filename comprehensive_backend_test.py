"""
Comprehensive Backend Infrastructure Audit
Testing all critical API endpoints before deployment
"""
import requests
import json
import time
from datetime import datetime
from supabase import create_client, Client

# Configuration
BASE_URL = "https://property-pipeline-8.preview.emergentagent.com/api"
LOGIN_EMAIL = "contact@pedroarmando.com"
LOGIN_PASSWORD = "Flin141812$"

# Supabase Configuration
SUPABASE_URL = "https://ygezobmpewthqvsfqrbk.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"

# Test results storage
test_results = {
    "total_tests": 0,
    "passed": 0,
    "failed": 0,
    "warnings": 0,
    "tests": []
}

def log_test(category, endpoint, status, message, response_time=None, details=None):
    """Log test result"""
    test_results["total_tests"] += 1
    
    result = {
        "category": category,
        "endpoint": endpoint,
        "status": status,
        "message": message,
        "response_time": response_time,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    
    if status == "✅":
        test_results["passed"] += 1
    elif status == "❌":
        test_results["failed"] += 1
    elif status == "⚠️":
        test_results["warnings"] += 1
    
    test_results["tests"].append(result)
    
    # Print immediately
    print(f"{status} [{category}] {endpoint}: {message}")
    if response_time:
        print(f"   Response time: {response_time:.3f}s")
    if details:
        print(f"   Details: {details}")

def authenticate():
    """Authenticate using Supabase and get JWT token"""
    print("\n" + "="*80)
    print("AUTHENTICATION")
    print("="*80)
    
    try:
        start = time.time()
        
        # Create Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        # Sign in with email and password
        auth_response = supabase.auth.sign_in_with_password({
            "email": LOGIN_EMAIL,
            "password": LOGIN_PASSWORD
        })
        
        elapsed = time.time() - start
        
        if auth_response.user and auth_response.session:
            token = auth_response.session.access_token
            user_id = auth_response.user.id
            
            log_test(
                "Authentication",
                "Supabase Auth (signInWithPassword)",
                "✅",
                "Login successful",
                elapsed,
                f"User ID: {user_id}, Token length: {len(token) if token else 0}"
            )
            return token, user_id
        else:
            log_test(
                "Authentication",
                "Supabase Auth (signInWithPassword)",
                "❌",
                "Login failed: No user or session returned",
                elapsed,
                None
            )
            return None, None
    except Exception as e:
        log_test(
            "Authentication",
            "Supabase Auth (signInWithPassword)",
            "❌",
            f"Login error: {str(e)}",
            None,
            str(e)
        )
        return None, None

def test_deals_crud(token):
    """Test Deals CRUD operations"""
    print("\n" + "="*80)
    print("DEALS CRUD OPERATIONS")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    deal_id = None
    
    # 1. Create Deal
    try:
        deal_data = {
            "title": "Test Property - Audit",
            "address": "123 Test St",
            "city": "San Antonio",
            "state": "TX",
            "zip_code": "78201",
            "asset_type": "Office",
            "price": 1500000,
            "size": 5000,
            "description": "Test deal for infrastructure audit"
        }
        
        start = time.time()
        response = requests.post(
            f"{BASE_URL}/deals",
            json=deal_data,
            headers=headers,
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code in [200, 201]:
            data = response.json()
            deal_id = data.get("id")
            log_test(
                "Deals CRUD",
                "POST /api/deals",
                "✅",
                "Deal created successfully",
                elapsed,
                f"Deal ID: {deal_id}"
            )
        else:
            log_test(
                "Deals CRUD",
                "POST /api/deals",
                "❌",
                f"Create failed: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Deals CRUD", "POST /api/deals", "❌", f"Error: {str(e)}", None, str(e))
    
    # 2. List Deals
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/deals",
            headers=headers,
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else 0
            log_test(
                "Deals CRUD",
                "GET /api/deals",
                "✅",
                f"Retrieved {count} deals",
                elapsed,
                None
            )
        else:
            log_test(
                "Deals CRUD",
                "GET /api/deals",
                "❌",
                f"List failed: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Deals CRUD", "GET /api/deals", "❌", f"Error: {str(e)}", None, str(e))
    
    # 3. Get Single Deal
    if deal_id:
        try:
            start = time.time()
            response = requests.get(
                f"{BASE_URL}/deals/{deal_id}",
                headers=headers,
                timeout=10
            )
            elapsed = time.time() - start
            
            if response.status_code == 200:
                log_test(
                    "Deals CRUD",
                    f"GET /api/deals/{deal_id}",
                    "✅",
                    "Deal retrieved successfully",
                    elapsed,
                    None
                )
            else:
                log_test(
                    "Deals CRUD",
                    f"GET /api/deals/{deal_id}",
                    "❌",
                    f"Get failed: {response.status_code}",
                    elapsed,
                    response.text[:200]
                )
        except Exception as e:
            log_test("Deals CRUD", f"GET /api/deals/{deal_id}", "❌", f"Error: {str(e)}", None, str(e))
    
    # 4. Update Deal
    if deal_id:
        try:
            update_data = {
                "title": "Updated Test Property",
                "price": 1600000
            }
            
            start = time.time()
            response = requests.put(
                f"{BASE_URL}/deals/{deal_id}",
                json=update_data,
                headers=headers,
                timeout=10
            )
            elapsed = time.time() - start
            
            if response.status_code == 200:
                log_test(
                    "Deals CRUD",
                    f"PUT /api/deals/{deal_id}",
                    "✅",
                    "Deal updated successfully",
                    elapsed,
                    None
                )
            else:
                log_test(
                    "Deals CRUD",
                    f"PUT /api/deals/{deal_id}",
                    "❌",
                    f"Update failed: {response.status_code}",
                    elapsed,
                    response.text[:200]
                )
        except Exception as e:
            log_test("Deals CRUD", f"PUT /api/deals/{deal_id}", "❌", f"Error: {str(e)}", None, str(e))
    
    # 5. Delete Deal
    if deal_id:
        try:
            start = time.time()
            response = requests.delete(
                f"{BASE_URL}/deals/{deal_id}",
                headers=headers,
                timeout=10
            )
            elapsed = time.time() - start
            
            if response.status_code in [200, 204]:
                log_test(
                    "Deals CRUD",
                    f"DELETE /api/deals/{deal_id}",
                    "✅",
                    "Deal deleted successfully",
                    elapsed,
                    None
                )
            else:
                log_test(
                    "Deals CRUD",
                    f"DELETE /api/deals/{deal_id}",
                    "❌",
                    f"Delete failed: {response.status_code}",
                    elapsed,
                    response.text[:200]
                )
        except Exception as e:
            log_test("Deals CRUD", f"DELETE /api/deals/{deal_id}", "❌", f"Error: {str(e)}", None, str(e))

def test_pipeline_management(token):
    """Test Pipeline Management endpoints"""
    print("\n" + "="*80)
    print("PIPELINE MANAGEMENT")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. List Pipelines
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/pipelines",
            headers=headers,
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            pipelines = data.get("pipelines", [])
            log_test(
                "Pipeline Management",
                "GET /api/pipelines",
                "✅",
                f"Retrieved {len(pipelines)} pipelines",
                elapsed,
                None
            )
        else:
            log_test(
                "Pipeline Management",
                "GET /api/pipelines",
                "❌",
                f"List failed: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Pipeline Management", "GET /api/pipelines", "❌", f"Error: {str(e)}", None, str(e))

def test_messaging(token):
    """Test Messaging endpoints"""
    print("\n" + "="*80)
    print("MESSAGING SYSTEM")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Get Conversations
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/messages/conversations",
            headers=headers,
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            count = data.get("count", 0)
            log_test(
                "Messaging",
                "GET /api/messages/conversations",
                "✅",
                f"Retrieved {count} conversations",
                elapsed,
                None
            )
        else:
            log_test(
                "Messaging",
                "GET /api/messages/conversations",
                "❌",
                f"List failed: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Messaging", "GET /api/messages/conversations", "❌", f"Error: {str(e)}", None, str(e))
    
    # 2. Get Unread Count
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/messages/unread-count",
            headers=headers,
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            count = data.get("unread_count", 0)
            log_test(
                "Messaging",
                "GET /api/messages/unread-count",
                "✅",
                f"Unread count: {count}",
                elapsed,
                None
            )
        else:
            log_test(
                "Messaging",
                "GET /api/messages/unread-count",
                "❌",
                f"Failed: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Messaging", "GET /api/messages/unread-count", "❌", f"Error: {str(e)}", None, str(e))

def test_teams(token):
    """Test Teams endpoints"""
    print("\n" + "="*80)
    print("TEAMS")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Get User Teams
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/teams",
            headers=headers,
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            teams = data.get("teams", [])
            log_test(
                "Teams",
                "GET /api/teams",
                "✅",
                f"Retrieved {len(teams)} teams",
                elapsed,
                None
            )
        else:
            log_test(
                "Teams",
                "GET /api/teams",
                "❌",
                f"List failed: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Teams", "GET /api/teams", "❌", f"Error: {str(e)}", None, str(e))

def test_admin_endpoints(token):
    """Test Admin endpoints"""
    print("\n" + "="*80)
    print("ADMIN ENDPOINTS")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Get Pending Deals
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/admin/pending-deals",
            headers=headers,
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            count = data.get("count", 0)
            log_test(
                "Admin",
                "GET /api/admin/pending-deals",
                "✅",
                f"Retrieved {count} pending deals",
                elapsed,
                None
            )
        else:
            log_test(
                "Admin",
                "GET /api/admin/pending-deals",
                "❌",
                f"Failed: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Admin", "GET /api/admin/pending-deals", "❌", f"Error: {str(e)}", None, str(e))
    
    # 2. Get Admin Stats
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/admin/stats",
            headers=headers,
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            log_test(
                "Admin",
                "GET /api/admin/stats",
                "✅",
                "Admin stats retrieved",
                elapsed,
                json.dumps(data)
            )
        else:
            log_test(
                "Admin",
                "GET /api/admin/stats",
                "❌",
                f"Failed: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Admin", "GET /api/admin/stats", "❌", f"Error: {str(e)}", None, str(e))

def test_onboarding(token):
    """Test Onboarding endpoints"""
    print("\n" + "="*80)
    print("ONBOARDING")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Check Onboarding Status
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/onboarding/status",
            headers=headers,
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            completed = data.get("onboarding_completed", False)
            role = data.get("user_role", "N/A")
            log_test(
                "Onboarding",
                "GET /api/onboarding/status",
                "✅",
                f"Status retrieved - Completed: {completed}, Role: {role}",
                elapsed,
                None
            )
        else:
            log_test(
                "Onboarding",
                "GET /api/onboarding/status",
                "❌",
                f"Failed: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Onboarding", "GET /api/onboarding/status", "❌", f"Error: {str(e)}", None, str(e))

def test_marketplace(token):
    """Test Marketplace endpoints"""
    print("\n" + "="*80)
    print("MARKETPLACE")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Browse Marketplace Deals
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/marketplace/deals",
            headers=headers,
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            count = data.get("count", 0)
            log_test(
                "Marketplace",
                "GET /api/marketplace/deals",
                "✅",
                f"Retrieved {count} marketplace deals",
                elapsed,
                None
            )
        else:
            log_test(
                "Marketplace",
                "GET /api/marketplace/deals",
                "❌",
                f"Failed: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Marketplace", "GET /api/marketplace/deals", "❌", f"Error: {str(e)}", None, str(e))
    
    # 2. Get Marketplace Filters
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/marketplace/filters",
            headers=headers,
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            log_test(
                "Marketplace",
                "GET /api/marketplace/filters",
                "✅",
                "Filters retrieved successfully",
                elapsed,
                None
            )
        else:
            log_test(
                "Marketplace",
                "GET /api/marketplace/filters",
                "❌",
                f"Failed: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Marketplace", "GET /api/marketplace/filters", "❌", f"Error: {str(e)}", None, str(e))
    
    # 3. Get Saved Deals
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/marketplace/saved-deals",
            headers=headers,
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            count = data.get("count", 0)
            log_test(
                "Marketplace",
                "GET /api/marketplace/saved-deals",
                "✅",
                f"Retrieved {count} saved deals",
                elapsed,
                None
            )
        else:
            log_test(
                "Marketplace",
                "GET /api/marketplace/saved-deals",
                "❌",
                f"Failed: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Marketplace", "GET /api/marketplace/saved-deals", "❌", f"Error: {str(e)}", None, str(e))

def test_authorization(token):
    """Test Authorization and Error Handling"""
    print("\n" + "="*80)
    print("AUTHORIZATION & ERROR HANDLING")
    print("="*80)
    
    # 1. Test Invalid Token
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/deals",
            headers={"Authorization": "Bearer invalid_token_12345"},
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 401:
            log_test(
                "Authorization",
                "GET /api/deals (invalid token)",
                "✅",
                "Correctly rejected invalid token",
                elapsed,
                None
            )
        else:
            log_test(
                "Authorization",
                "GET /api/deals (invalid token)",
                "⚠️",
                f"Unexpected status: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Authorization", "GET /api/deals (invalid token)", "❌", f"Error: {str(e)}", None, str(e))
    
    # 2. Test No Token
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/deals",
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 401:
            log_test(
                "Authorization",
                "GET /api/deals (no token)",
                "✅",
                "Correctly rejected missing token",
                elapsed,
                None
            )
        else:
            log_test(
                "Authorization",
                "GET /api/deals (no token)",
                "⚠️",
                f"Unexpected status: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Authorization", "GET /api/deals (no token)", "❌", f"Error: {str(e)}", None, str(e))
    
    # 3. Test 404 Error
    try:
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/deals/nonexistent-deal-id-12345",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        elapsed = time.time() - start
        
        if response.status_code == 404:
            log_test(
                "Error Handling",
                "GET /api/deals/nonexistent-id",
                "✅",
                "Correctly returned 404 for missing resource",
                elapsed,
                None
            )
        else:
            log_test(
                "Error Handling",
                "GET /api/deals/nonexistent-id",
                "⚠️",
                f"Unexpected status: {response.status_code}",
                elapsed,
                response.text[:200]
            )
    except Exception as e:
        log_test("Error Handling", "GET /api/deals/nonexistent-id", "❌", f"Error: {str(e)}", None, str(e))

def test_environment_variables():
    """Test Environment Variables"""
    print("\n" + "="*80)
    print("ENVIRONMENT VARIABLES")
    print("="*80)
    
    # Check if backend is accessible
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL.replace('/api', '')}/docs", timeout=10)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            log_test(
                "Environment",
                "Backend URL",
                "✅",
                "Backend is accessible",
                elapsed,
                BASE_URL
            )
        else:
            log_test(
                "Environment",
                "Backend URL",
                "⚠️",
                f"Backend returned {response.status_code}",
                elapsed,
                BASE_URL
            )
    except Exception as e:
        log_test("Environment", "Backend URL", "❌", f"Error: {str(e)}", None, str(e))

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    print(f"\nTotal Tests: {test_results['total_tests']}")
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    print(f"⚠️  Warnings: {test_results['warnings']}")
    
    success_rate = (test_results['passed'] / test_results['total_tests'] * 100) if test_results['total_tests'] > 0 else 0
    print(f"\nSuccess Rate: {success_rate:.1f}%")
    
    # Group by category
    print("\n" + "-"*80)
    print("RESULTS BY CATEGORY")
    print("-"*80)
    
    categories = {}
    for test in test_results['tests']:
        cat = test['category']
        if cat not in categories:
            categories[cat] = {"passed": 0, "failed": 0, "warnings": 0}
        
        if test['status'] == "✅":
            categories[cat]['passed'] += 1
        elif test['status'] == "❌":
            categories[cat]['failed'] += 1
        elif test['status'] == "⚠️":
            categories[cat]['warnings'] += 1
    
    for cat, results in categories.items():
        total = results['passed'] + results['failed'] + results['warnings']
        print(f"\n{cat}:")
        print(f"  ✅ {results['passed']}/{total} passed")
        if results['failed'] > 0:
            print(f"  ❌ {results['failed']}/{total} failed")
        if results['warnings'] > 0:
            print(f"  ⚠️  {results['warnings']}/{total} warnings")
    
    # Failed tests details
    if test_results['failed'] > 0:
        print("\n" + "-"*80)
        print("FAILED TESTS DETAILS")
        print("-"*80)
        
        for test in test_results['tests']:
            if test['status'] == "❌":
                print(f"\n❌ [{test['category']}] {test['endpoint']}")
                print(f"   {test['message']}")
                if test['details']:
                    print(f"   Details: {test['details']}")
    
    # Performance summary
    print("\n" + "-"*80)
    print("PERFORMANCE SUMMARY")
    print("-"*80)
    
    response_times = [t['response_time'] for t in test_results['tests'] if t['response_time'] is not None]
    if response_times:
        avg_time = sum(response_times) / len(response_times)
        max_time = max(response_times)
        min_time = min(response_times)
        
        print(f"\nAverage Response Time: {avg_time:.3f}s")
        print(f"Min Response Time: {min_time:.3f}s")
        print(f"Max Response Time: {max_time:.3f}s")
        
        slow_tests = [t for t in test_results['tests'] if t['response_time'] and t['response_time'] > 2.0]
        if slow_tests:
            print(f"\n⚠️  {len(slow_tests)} endpoints exceeded 2s response time:")
            for test in slow_tests:
                print(f"   {test['endpoint']}: {test['response_time']:.3f}s")

def main():
    """Main test execution"""
    print("\n" + "="*80)
    print("COMPREHENSIVE BACKEND INFRASTRUCTURE AUDIT")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {LOGIN_EMAIL}")
    print(f"Started: {datetime.now().isoformat()}")
    
    # Test environment
    test_environment_variables()
    
    # Authenticate
    token, user_id = authenticate()
    
    if not token:
        print("\n❌ CRITICAL: Authentication failed. Cannot proceed with tests.")
        print_summary()
        return
    
    # Run all test suites
    test_deals_crud(token)
    test_pipeline_management(token)
    test_messaging(token)
    test_teams(token)
    test_admin_endpoints(token)
    test_onboarding(token)
    test_marketplace(token)
    test_authorization(token)
    
    # Print summary
    print_summary()
    
    print("\n" + "="*80)
    print(f"Completed: {datetime.now().isoformat()}")
    print("="*80)

if __name__ == "__main__":
    main()
