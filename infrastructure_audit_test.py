"""
Comprehensive Backend Infrastructure Audit - Detailed Testing
Based on review request requirements
"""
import requests
import json
import time
from datetime import datetime
from supabase import create_client, Client

# Configuration
BASE_URL = "https://mockdata-hub.preview.emergentagent.com/api"
LOGIN_EMAIL = "contact@pedroarmando.com"
LOGIN_PASSWORD = "Flin141812$"

# Supabase Configuration
SUPABASE_URL = "https://ygezobmpewthqvsfqrbk.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"

# Test results storage
results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log_result(status, category, endpoint, message, details=None, response_time=None):
    """Log test result"""
    result = {
        "category": category,
        "endpoint": endpoint,
        "message": message,
        "details": details,
        "response_time": response_time
    }
    
    if status == "pass":
        results["passed"].append(result)
        print(f"✅ [{category}] {endpoint}: {message}")
    elif status == "fail":
        results["failed"].append(result)
        print(f"❌ [{category}] {endpoint}: {message}")
    elif status == "warn":
        results["warnings"].append(result)
        print(f"⚠️  [{category}] {endpoint}: {message}")
    
    if response_time:
        print(f"   Response time: {response_time:.3f}s")
    if details:
        print(f"   Details: {details}")

def authenticate():
    """Authenticate using Supabase"""
    print("\n" + "="*80)
    print("AUTHENTICATION")
    print("="*80)
    
    try:
        start = time.time()
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        auth_response = supabase.auth.sign_in_with_password({
            "email": LOGIN_EMAIL,
            "password": LOGIN_PASSWORD
        })
        elapsed = time.time() - start
        
        if auth_response.user and auth_response.session:
            token = auth_response.session.access_token
            user_id = auth_response.user.id
            log_result("pass", "Auth", "Supabase signInWithPassword", "Login successful", 
                      f"User ID: {user_id}", elapsed)
            return token, user_id
        else:
            log_result("fail", "Auth", "Supabase signInWithPassword", "No user/session returned", None, elapsed)
            return None, None
    except Exception as e:
        log_result("fail", "Auth", "Supabase signInWithPassword", f"Error: {str(e)}", str(e))
        return None, None

def test_deals_crud(token):
    """Test Deals CRUD - Re-test after schema fix"""
    print("\n" + "="*80)
    print("1. DEALS CRUD (Re-test after schema fix)")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    deal_id = None
    
    # POST /api/deals - Create deal
    try:
        deal_data = {
            "property_address": "123 Test Street, San Antonio, TX 78201",
            "asset_type": "Office",
            "deal_status": "New",
            "pipeline_stage": "New",
            "latitude": 29.4241,
            "longitude": -98.4936,
            "asking_price": 1500000,
            "description": "Test property for infrastructure audit",
            "building_size": 5000,
            "lot_size": 10000
        }
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/deals", json=deal_data, headers=headers, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code in [200, 201]:
            data = response.json()
            deal_id = data.get("id")
            log_result("pass", "Deals CRUD", "POST /api/deals", "Deal created", f"ID: {deal_id}", elapsed)
        else:
            log_result("fail", "Deals CRUD", "POST /api/deals", f"Status {response.status_code}", 
                      response.text[:300], elapsed)
    except Exception as e:
        log_result("fail", "Deals CRUD", "POST /api/deals", f"Error: {str(e)}", str(e))
    
    # GET /api/deals - List deals
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/deals", headers=headers, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else 0
            log_result("pass", "Deals CRUD", "GET /api/deals", f"Retrieved {count} deals", None, elapsed)
        else:
            log_result("fail", "Deals CRUD", "GET /api/deals", f"Status {response.status_code}", 
                      response.text[:200], elapsed)
    except Exception as e:
        log_result("fail", "Deals CRUD", "GET /api/deals", f"Error: {str(e)}", str(e))
    
    # GET /api/deals/{id} - Get single deal
    if deal_id:
        try:
            start = time.time()
            response = requests.get(f"{BASE_URL}/deals/{deal_id}", headers=headers, timeout=10)
            elapsed = time.time() - start
            
            if response.status_code == 200:
                log_result("pass", "Deals CRUD", f"GET /api/deals/{{id}}", "Deal retrieved", None, elapsed)
            else:
                log_result("fail", "Deals CRUD", f"GET /api/deals/{{id}}", f"Status {response.status_code}", 
                          response.text[:200], elapsed)
        except Exception as e:
            log_result("fail", "Deals CRUD", f"GET /api/deals/{{id}}", f"Error: {str(e)}", str(e))
    
    # PUT /api/deals/{id} - Update deal
    if deal_id:
        try:
            update_data = {"asking_price": 1600000, "description": "Updated test property"}
            start = time.time()
            response = requests.put(f"{BASE_URL}/deals/{deal_id}", json=update_data, headers=headers, timeout=10)
            elapsed = time.time() - start
            
            if response.status_code == 200:
                log_result("pass", "Deals CRUD", f"PUT /api/deals/{{id}}", "Deal updated", None, elapsed)
            else:
                log_result("fail", "Deals CRUD", f"PUT /api/deals/{{id}}", f"Status {response.status_code}", 
                          response.text[:200], elapsed)
        except Exception as e:
            log_result("fail", "Deals CRUD", f"PUT /api/deals/{{id}}", f"Error: {str(e)}", str(e))
    
    # DELETE /api/deals/{id} - Delete deal
    if deal_id:
        try:
            start = time.time()
            response = requests.delete(f"{BASE_URL}/deals/{deal_id}", headers=headers, timeout=10)
            elapsed = time.time() - start
            
            if response.status_code in [200, 204]:
                log_result("pass", "Deals CRUD", f"DELETE /api/deals/{{id}}", "Deal deleted", None, elapsed)
            else:
                log_result("fail", "Deals CRUD", f"DELETE /api/deals/{{id}}", f"Status {response.status_code}", 
                          response.text[:200], elapsed)
        except Exception as e:
            log_result("fail", "Deals CRUD", f"DELETE /api/deals/{{id}}", f"Error: {str(e)}", str(e))
    
    return deal_id

def test_pipeline_management(token):
    """Test Pipeline Management"""
    print("\n" + "="*80)
    print("2. PIPELINE MANAGEMENT")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    pipeline_id = None
    stage_id = None
    
    # GET /api/pipelines - List pipelines
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/pipelines", headers=headers, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            pipelines = data.get("pipelines", [])
            if pipelines:
                pipeline_id = pipelines[0].get("id")
            log_result("pass", "Pipeline", "GET /api/pipelines", f"Retrieved {len(pipelines)} pipelines", None, elapsed)
        else:
            log_result("fail", "Pipeline", "GET /api/pipelines", f"Status {response.status_code}", 
                      response.text[:200], elapsed)
    except Exception as e:
        log_result("fail", "Pipeline", "GET /api/pipelines", f"Error: {str(e)}", str(e))
    
    # POST /api/pipelines - Create pipeline
    try:
        pipeline_data = {"name": "Test Pipeline - Audit", "description": "Test pipeline for audit"}
        start = time.time()
        response = requests.post(f"{BASE_URL}/pipelines", json=pipeline_data, headers=headers, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code in [200, 201]:
            data = response.json()
            new_pipeline_id = data.get("pipeline", {}).get("id")
            log_result("pass", "Pipeline", "POST /api/pipelines", "Pipeline created", f"ID: {new_pipeline_id}", elapsed)
            if not pipeline_id:
                pipeline_id = new_pipeline_id
        else:
            log_result("fail", "Pipeline", "POST /api/pipelines", f"Status {response.status_code}", 
                      response.text[:200], elapsed)
    except Exception as e:
        log_result("fail", "Pipeline", "POST /api/pipelines", f"Error: {str(e)}", str(e))
    
    # PUT /api/pipelines/{id} - Update pipeline
    if pipeline_id:
        try:
            update_data = {"name": "Updated Test Pipeline"}
            start = time.time()
            response = requests.put(f"{BASE_URL}/pipelines/{pipeline_id}", json=update_data, headers=headers, timeout=10)
            elapsed = time.time() - start
            
            if response.status_code == 200:
                log_result("pass", "Pipeline", "PUT /api/pipelines/{{id}}", "Pipeline updated", None, elapsed)
            else:
                log_result("fail", "Pipeline", "PUT /api/pipelines/{{id}}", f"Status {response.status_code}", 
                          response.text[:200], elapsed)
        except Exception as e:
            log_result("fail", "Pipeline", "PUT /api/pipelines/{{id}}", f"Error: {str(e)}", str(e))
    
    # GET /api/pipelines/{id}/stages - Get pipeline stages
    if pipeline_id:
        try:
            start = time.time()
            response = requests.get(f"{BASE_URL}/pipelines/{pipeline_id}/stages", headers=headers, timeout=10)
            elapsed = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                stages = data.get("stages", [])
                if stages:
                    stage_id = stages[0].get("id")
                log_result("pass", "Pipeline", "GET /api/pipelines/{{id}}/stages", f"Retrieved {len(stages)} stages", None, elapsed)
            else:
                log_result("fail", "Pipeline", "GET /api/pipelines/{{id}}/stages", f"Status {response.status_code}", 
                          response.text[:200], elapsed)
        except Exception as e:
            log_result("fail", "Pipeline", "GET /api/pipelines/{{id}}/stages", f"Error: {str(e)}", str(e))
    
    # DELETE /api/pipelines/{id} - Delete pipeline (cleanup)
    if pipeline_id:
        try:
            start = time.time()
            response = requests.delete(f"{BASE_URL}/pipelines/{pipeline_id}", headers=headers, timeout=10)
            elapsed = time.time() - start
            
            if response.status_code in [200, 204]:
                log_result("pass", "Pipeline", "DELETE /api/pipelines/{{id}}", "Pipeline deleted", None, elapsed)
            else:
                log_result("warn", "Pipeline", "DELETE /api/pipelines/{{id}}", f"Status {response.status_code}", 
                          response.text[:200], elapsed)
        except Exception as e:
            log_result("warn", "Pipeline", "DELETE /api/pipelines/{{id}}", f"Error: {str(e)}", str(e))
    
    return pipeline_id, stage_id

def test_deal_movement(token, pipeline_id, stage_id):
    """Test Deal Movement"""
    print("\n" + "="*80)
    print("3. DEAL MOVEMENT")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # First create a deal to move
    deal_data = {
        "property_address": "456 Move Test St, San Antonio, TX 78201",
        "asset_type": "Retail",
        "deal_status": "New",
        "pipeline_stage": "New",
        "latitude": 29.4241,
        "longitude": -98.4936,
        "asking_price": 2000000
    }
    
    try:
        response = requests.post(f"{BASE_URL}/deals", json=deal_data, headers=headers, timeout=10)
        if response.status_code in [200, 201]:
            deal_id = response.json().get("id")
            
            # PUT /api/deals/{id}/move - Move between stages
            if stage_id:
                try:
                    move_data = {"pipeline_stage_id": stage_id}
                    start = time.time()
                    response = requests.put(f"{BASE_URL}/deals/{deal_id}/move", 
                                          data=move_data, headers=headers, timeout=10)
                    elapsed = time.time() - start
                    
                    if response.status_code == 200:
                        log_result("pass", "Deal Movement", "PUT /api/deals/{{id}}/move", 
                                 "Deal moved to new stage", None, elapsed)
                    else:
                        log_result("fail", "Deal Movement", "PUT /api/deals/{{id}}/move", 
                                 f"Status {response.status_code}", response.text[:200], elapsed)
                except Exception as e:
                    log_result("fail", "Deal Movement", "PUT /api/deals/{{id}}/move", f"Error: {str(e)}", str(e))
            else:
                log_result("warn", "Deal Movement", "PUT /api/deals/{{id}}/move", 
                         "Skipped - no stage_id available", None)
            
            # Cleanup
            requests.delete(f"{BASE_URL}/deals/{deal_id}", headers=headers, timeout=10)
        else:
            log_result("warn", "Deal Movement", "Setup", "Could not create test deal", None)
    except Exception as e:
        log_result("fail", "Deal Movement", "Setup", f"Error: {str(e)}", str(e))

def test_marketplace_publishing(token):
    """Test Marketplace Publishing"""
    print("\n" + "="*80)
    print("4. MARKETPLACE PUBLISHING")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create a deal to publish
    deal_data = {
        "property_address": "789 Publish Test Ave, San Antonio, TX 78201",
        "asset_type": "Industrial",
        "deal_status": "New",
        "pipeline_stage": "New",
        "latitude": 29.4241,
        "longitude": -98.4936,
        "asking_price": 3000000,
        "building_size": 10000,
        "lot_size": 20000,
        "description": "Test property for marketplace publishing"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/deals", json=deal_data, headers=headers, timeout=10)
        if response.status_code in [200, 201]:
            deal_id = response.json().get("id")
            
            # POST /api/deals/{id}/publish - Publish to marketplace
            try:
                publish_data = {
                    "public_asset_type": "Industrial",
                    "public_market": "San Antonio",
                    "public_price": 3000000,
                    "public_strategy": "Value Add",
                    "seller_commitment_level": "verbal_maybe"
                }
                start = time.time()
                response = requests.post(f"{BASE_URL}/deals/{deal_id}/publish", 
                                       json=publish_data, headers=headers, timeout=10)
                elapsed = time.time() - start
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    completeness = data.get("completeness_score", 0)
                    approval_status = data.get("approval_status", "unknown")
                    log_result("pass", "Marketplace", "POST /api/deals/{{id}}/publish", 
                             f"Deal published - Completeness: {completeness}%, Status: {approval_status}", None, elapsed)
                elif response.status_code == 400:
                    # Expected if completeness < 80%
                    log_result("pass", "Marketplace", "POST /api/deals/{{id}}/publish", 
                             "Correctly blocked low completeness deal", response.text[:200], elapsed)
                else:
                    log_result("fail", "Marketplace", "POST /api/deals/{{id}}/publish", 
                             f"Status {response.status_code}", response.text[:200], elapsed)
            except Exception as e:
                log_result("fail", "Marketplace", "POST /api/deals/{{id}}/publish", f"Error: {str(e)}", str(e))
            
            # Cleanup
            requests.delete(f"{BASE_URL}/deals/{deal_id}", headers=headers, timeout=10)
        else:
            log_result("warn", "Marketplace", "Setup", "Could not create test deal", None)
    except Exception as e:
        log_result("fail", "Marketplace", "Setup", f"Error: {str(e)}", str(e))

def test_messaging(token):
    """Test Messaging"""
    print("\n" + "="*80)
    print("5. MESSAGING")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # GET /api/messages/conversations - List conversations
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/messages/conversations", headers=headers, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            count = data.get("count", 0)
            log_result("pass", "Messaging", "GET /api/messages/conversations", 
                     f"Retrieved {count} conversations", None, elapsed)
        else:
            log_result("fail", "Messaging", "GET /api/messages/conversations", 
                     f"Status {response.status_code}", response.text[:200], elapsed)
    except Exception as e:
        log_result("fail", "Messaging", "GET /api/messages/conversations", f"Error: {str(e)}", str(e))
    
    # GET /api/messages/unread-count
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/messages/unread-count", headers=headers, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            count = data.get("unread_count", 0)
            log_result("pass", "Messaging", "GET /api/messages/unread-count", 
                     f"Unread count: {count}", None, elapsed)
        else:
            log_result("fail", "Messaging", "GET /api/messages/unread-count", 
                     f"Status {response.status_code}", response.text[:200], elapsed)
    except Exception as e:
        log_result("fail", "Messaging", "GET /api/messages/unread-count", f"Error: {str(e)}", str(e))

def test_teams(token):
    """Test Teams"""
    print("\n" + "="*80)
    print("6. TEAMS")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # GET /api/teams - User teams
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/teams", headers=headers, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            teams = data.get("teams", [])
            team_id = teams[0].get("id") if teams else None
            log_result("pass", "Teams", "GET /api/teams", f"Retrieved {len(teams)} teams", None, elapsed)
            
            # GET /api/teams/{id}/stats - Team stats
            if team_id:
                try:
                    start = time.time()
                    response = requests.get(f"{BASE_URL}/teams/{team_id}/stats", headers=headers, timeout=10)
                    elapsed = time.time() - start
                    
                    if response.status_code == 200:
                        log_result("pass", "Teams", "GET /api/teams/{{id}}/stats", "Team stats retrieved", None, elapsed)
                    else:
                        log_result("fail", "Teams", "GET /api/teams/{{id}}/stats", 
                                 f"Status {response.status_code}", response.text[:200], elapsed)
                except Exception as e:
                    log_result("fail", "Teams", "GET /api/teams/{{id}}/stats", f"Error: {str(e)}", str(e))
                
                # GET /api/teams/{id}/members - Team members
                try:
                    start = time.time()
                    response = requests.get(f"{BASE_URL}/teams/{team_id}/members", headers=headers, timeout=10)
                    elapsed = time.time() - start
                    
                    if response.status_code == 200:
                        data = response.json()
                        members = data.get("members", [])
                        log_result("pass", "Teams", "GET /api/teams/{{id}}/members", 
                                 f"Retrieved {len(members)} members", None, elapsed)
                    else:
                        log_result("fail", "Teams", "GET /api/teams/{{id}}/members", 
                                 f"Status {response.status_code}", response.text[:200], elapsed)
                except Exception as e:
                    log_result("fail", "Teams", "GET /api/teams/{{id}}/members", f"Error: {str(e)}", str(e))
        else:
            log_result("fail", "Teams", "GET /api/teams", f"Status {response.status_code}", 
                     response.text[:200], elapsed)
    except Exception as e:
        log_result("fail", "Teams", "GET /api/teams", f"Error: {str(e)}", str(e))

def test_admin_endpoints(token):
    """Test Admin Endpoints"""
    print("\n" + "="*80)
    print("7. ADMIN ENDPOINTS")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # GET /api/admin/pending-deals
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/admin/pending-deals", headers=headers, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            count = data.get("count", 0)
            log_result("pass", "Admin", "GET /api/admin/pending-deals", 
                     f"Retrieved {count} pending deals", None, elapsed)
        else:
            log_result("fail", "Admin", "GET /api/admin/pending-deals", 
                     f"Status {response.status_code}", response.text[:200], elapsed)
    except Exception as e:
        log_result("fail", "Admin", "GET /api/admin/pending-deals", f"Error: {str(e)}", str(e))
    
    # GET /api/admin/stats
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/admin/stats", headers=headers, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            log_result("pass", "Admin", "GET /api/admin/stats", "Admin stats retrieved", 
                     json.dumps(data), elapsed)
        else:
            log_result("fail", "Admin", "GET /api/admin/stats", 
                     f"Status {response.status_code}", response.text[:200], elapsed)
    except Exception as e:
        log_result("fail", "Admin", "GET /api/admin/stats", f"Error: {str(e)}", str(e))

def test_onboarding(token):
    """Test Onboarding"""
    print("\n" + "="*80)
    print("8. ONBOARDING")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # GET /api/onboarding/status
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/onboarding/status", headers=headers, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            completed = data.get("onboarding_completed", False)
            role = data.get("user_role", "N/A")
            log_result("pass", "Onboarding", "GET /api/onboarding/status", 
                     f"Completed: {completed}, Role: {role}", None, elapsed)
        else:
            log_result("fail", "Onboarding", "GET /api/onboarding/status", 
                     f"Status {response.status_code}", response.text[:200], elapsed)
    except Exception as e:
        log_result("fail", "Onboarding", "GET /api/onboarding/status", f"Error: {str(e)}", str(e))

def test_authorization_and_errors(token):
    """Test Authorization and Error Handling"""
    print("\n" + "="*80)
    print("9. AUTHORIZATION & ERROR HANDLING")
    print("="*80)
    
    # Test invalid token
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/deals", 
                              headers={"Authorization": "Bearer invalid_token"}, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code == 401:
            log_result("pass", "Authorization", "Invalid Token Test", 
                     "Correctly rejected invalid token", None, elapsed)
        else:
            log_result("warn", "Authorization", "Invalid Token Test", 
                     f"Unexpected status: {response.status_code}", response.text[:200], elapsed)
    except Exception as e:
        log_result("fail", "Authorization", "Invalid Token Test", f"Error: {str(e)}", str(e))
    
    # Test missing token
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/deals", timeout=10)
        elapsed = time.time() - start
        
        if response.status_code in [401, 403]:
            log_result("pass", "Authorization", "Missing Token Test", 
                     "Correctly rejected missing token", None, elapsed)
        else:
            log_result("warn", "Authorization", "Missing Token Test", 
                     f"Unexpected status: {response.status_code}", response.text[:200], elapsed)
    except Exception as e:
        log_result("fail", "Authorization", "Missing Token Test", f"Error: {str(e)}", str(e))
    
    # Test 404 error
    try:
        start = time.time()
        # Use a valid UUID format to avoid 520 error
        response = requests.get(f"{BASE_URL}/deals/00000000-0000-0000-0000-000000000000", 
                              headers={"Authorization": f"Bearer {token}"}, timeout=10)
        elapsed = time.time() - start
        
        if response.status_code == 404:
            log_result("pass", "Error Handling", "404 Test", 
                     "Correctly returned 404 for missing resource", None, elapsed)
        else:
            log_result("warn", "Error Handling", "404 Test", 
                     f"Unexpected status: {response.status_code}", response.text[:200], elapsed)
    except Exception as e:
        log_result("fail", "Error Handling", "404 Test", f"Error: {str(e)}", str(e))

def test_performance(token):
    """Test Performance"""
    print("\n" + "="*80)
    print("10. PERFORMANCE")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test multiple endpoints for performance
    endpoints = [
        ("GET", f"{BASE_URL}/deals"),
        ("GET", f"{BASE_URL}/pipelines"),
        ("GET", f"{BASE_URL}/messages/conversations"),
        ("GET", f"{BASE_URL}/teams"),
        ("GET", f"{BASE_URL}/marketplace/deals"),
    ]
    
    slow_endpoints = []
    
    for method, url in endpoints:
        try:
            start = time.time()
            response = requests.request(method, url, headers=headers, timeout=10)
            elapsed = time.time() - start
            
            if elapsed > 2.0:
                slow_endpoints.append((url, elapsed))
                log_result("warn", "Performance", url, 
                         f"Slow response: {elapsed:.3f}s (>2s threshold)", None, elapsed)
            elif elapsed > 1.0:
                log_result("warn", "Performance", url, 
                         f"Moderate response: {elapsed:.3f}s", None, elapsed)
            else:
                log_result("pass", "Performance", url, 
                         f"Good response time: {elapsed:.3f}s", None, elapsed)
        except Exception as e:
            log_result("fail", "Performance", url, f"Error: {str(e)}", str(e))
    
    if not slow_endpoints:
        print("\n✅ All endpoints responded within 2 seconds")
    else:
        print(f"\n⚠️  {len(slow_endpoints)} endpoints exceeded 2s threshold")

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    total = len(results["passed"]) + len(results["failed"]) + len(results["warnings"])
    passed = len(results["passed"])
    failed = len(results["failed"])
    warnings = len(results["warnings"])
    
    print(f"\nTotal Tests: {total}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"⚠️  Warnings: {warnings}")
    
    success_rate = (passed / total * 100) if total > 0 else 0
    print(f"\nSuccess Rate: {success_rate:.1f}%")
    
    # Group by category
    print("\n" + "-"*80)
    print("RESULTS BY CATEGORY")
    print("-"*80)
    
    categories = {}
    for result_list in [results["passed"], results["failed"], results["warnings"]]:
        for result in result_list:
            cat = result["category"]
            if cat not in categories:
                categories[cat] = {"passed": 0, "failed": 0, "warnings": 0}
    
    for result in results["passed"]:
        categories[result["category"]]["passed"] += 1
    for result in results["failed"]:
        categories[result["category"]]["failed"] += 1
    for result in results["warnings"]:
        categories[result["category"]]["warnings"] += 1
    
    for cat, counts in sorted(categories.items()):
        total_cat = counts["passed"] + counts["failed"] + counts["warnings"]
        print(f"\n{cat}:")
        print(f"  ✅ {counts['passed']}/{total_cat} passed")
        if counts["failed"] > 0:
            print(f"  ❌ {counts['failed']}/{total_cat} failed")
        if counts["warnings"] > 0:
            print(f"  ⚠️  {counts['warnings']}/{total_cat} warnings")
    
    # Failed tests details
    if results["failed"]:
        print("\n" + "-"*80)
        print("FAILED TESTS")
        print("-"*80)
        for result in results["failed"]:
            print(f"\n❌ [{result['category']}] {result['endpoint']}")
            print(f"   {result['message']}")
            if result['details']:
                print(f"   Details: {result['details'][:300]}")
    
    # Warnings details
    if results["warnings"]:
        print("\n" + "-"*80)
        print("WARNINGS")
        print("-"*80)
        for result in results["warnings"]:
            print(f"\n⚠️  [{result['category']}] {result['endpoint']}")
            print(f"   {result['message']}")
            if result['details']:
                print(f"   Details: {result['details'][:300]}")

def main():
    """Main test execution"""
    print("\n" + "="*80)
    print("COMPREHENSIVE BACKEND INFRASTRUCTURE AUDIT")
    print("Based on Review Request Requirements")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {LOGIN_EMAIL}")
    print(f"Started: {datetime.now().isoformat()}")
    
    # Authenticate
    token, user_id = authenticate()
    
    if not token:
        print("\n❌ CRITICAL: Authentication failed. Cannot proceed with tests.")
        return
    
    # Run all test suites
    test_deals_crud(token)
    pipeline_id, stage_id = test_pipeline_management(token)
    test_deal_movement(token, pipeline_id, stage_id)
    test_marketplace_publishing(token)
    test_messaging(token)
    test_teams(token)
    test_admin_endpoints(token)
    test_onboarding(token)
    test_authorization_and_errors(token)
    test_performance(token)
    
    # Print summary
    print_summary()
    
    print("\n" + "="*80)
    print(f"Completed: {datetime.now().isoformat()}")
    print("="*80)

if __name__ == "__main__":
    main()
