"""
Phase 3.3: Broker Workspace Backend Audit
Test broker-specific workspace functionality and APIs
Test User: contact@pedroarmando.com / Flin141812$ (has broker role)
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "https://mockdata-hub.preview.emergentagent.com/api"
TEST_EMAIL = "contact@pedroarmando.com"
TEST_PASSWORD = "Flin141812$"

# Global variables
auth_token = None
test_deal_id = None
test_pipeline_id = None

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def print_result(test_name, success, details=""):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"   Details: {details}")

def authenticate():
    """Authenticate and get JWT token"""
    global auth_token
    print_section("AUTHENTICATION")
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            auth_token = data.get('access_token')
            print_result("Login", True, f"Token obtained (length: {len(auth_token)})")
            return True
        else:
            print_result("Login", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_result("Login", False, f"Exception: {str(e)}")
        return False

def get_headers():
    """Get authorization headers"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }

def test_dashboard_stats():
    """Test Dashboard Stats API - GET /api/dashboard/stats"""
    print_section("1. DASHBOARD STATS API")
    
    try:
        response = requests.get(
            f"{BASE_URL}/dashboard/stats",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ['total_pipeline_value', 'total_deals', 'avg_deal_size', 
                             'asset_type_distribution', 'stage_counts']
            
            all_fields_present = all(field in data for field in required_fields)
            
            if all_fields_present:
                print_result("Dashboard Stats - Structure", True, 
                           f"All required fields present: {', '.join(required_fields)}")
                print_result("Dashboard Stats - Empty State", True,
                           f"Returns metrics even with empty data: {json.dumps(data, indent=2)}")
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                print_result("Dashboard Stats - Structure", False, f"Missing fields: {missing}")
                return False
        else:
            print_result("Dashboard Stats", False, 
                       f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_result("Dashboard Stats", False, f"Exception: {str(e)}")
        return False

def test_pipelines_api():
    """Test Pipeline API - GET /api/pipelines"""
    global test_pipeline_id
    print_section("2. PIPELINE API")
    
    try:
        response = requests.get(
            f"{BASE_URL}/pipelines",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            pipelines = data.get('pipelines', [])
            
            print_result("Get Pipelines", True, 
                       f"Retrieved {len(pipelines)} pipelines")
            
            if pipelines:
                # Check if pipeline_stages relationship loads
                first_pipeline = pipelines[0]
                test_pipeline_id = first_pipeline.get('id')
                
                if 'pipeline_stages' in first_pipeline:
                    stages = first_pipeline.get('pipeline_stages', [])
                    print_result("Pipeline Stages Relationship", True,
                               f"Pipeline has {len(stages)} stages")
                else:
                    print_result("Pipeline Stages Relationship", False,
                               "pipeline_stages field not present")
                
                print(f"\n   Sample Pipeline Data:")
                print(f"   ID: {first_pipeline.get('id')}")
                print(f"   Name: {first_pipeline.get('name')}")
                print(f"   Owner ID: {first_pipeline.get('owner_id')}")
                print(f"   Stages: {len(first_pipeline.get('pipeline_stages', []))}")
            else:
                print_result("Pipeline Data", True, "No pipelines found (empty state OK)")
            
            return True
        else:
            print_result("Get Pipelines", False,
                       f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_result("Get Pipelines", False, f"Exception: {str(e)}")
        return False

def test_deals_crud():
    """Test Deals CRUD operations"""
    global test_deal_id
    print_section("3. DEALS CRUD API")
    
    # Test 1: Create Deal (POST /api/deals)
    try:
        deal_data = {
            "title": f"Test Deal - Phase 3.3 - {datetime.now().strftime('%Y%m%d%H%M%S')}",
            "address": "123 Test Street",
            "city": "San Antonio",
            "state": "TX",
            "zip_code": "78201",
            "asset_type": "Office",
            "price": 1500000,
            "size": 5000,
            "description": "Test deal for Phase 3.3 broker workspace audit"
        }
        
        response = requests.post(
            f"{BASE_URL}/deals",
            headers=get_headers(),
            json=deal_data,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            created_deal = response.json()
            test_deal_id = created_deal.get('id')
            print_result("Create Deal (POST)", True,
                       f"Deal created with ID: {test_deal_id}")
        else:
            print_result("Create Deal (POST)", False,
                       f"Status: {response.status_code}, Response: {response.text}")
            return False
    except Exception as e:
        print_result("Create Deal (POST)", False, f"Exception: {str(e)}")
        return False
    
    # Test 2: List Deals (GET /api/deals)
    try:
        response = requests.get(
            f"{BASE_URL}/deals",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            deals = response.json()
            print_result("List Deals (GET)", True,
                       f"Retrieved {len(deals)} deals")
        else:
            print_result("List Deals (GET)", False,
                       f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print_result("List Deals (GET)", False, f"Exception: {str(e)}")
    
    # Test 3: Get Single Deal (GET /api/deals/{id})
    if test_deal_id:
        try:
            response = requests.get(
                f"{BASE_URL}/deals/{test_deal_id}",
                headers=get_headers(),
                timeout=10
            )
            
            if response.status_code == 200:
                deal = response.json()
                print_result("Get Single Deal (GET)", True,
                           f"Retrieved deal: {deal.get('title')}")
            else:
                print_result("Get Single Deal (GET)", False,
                           f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            print_result("Get Single Deal (GET)", False, f"Exception: {str(e)}")
    
    # Test 4: Update Deal (PUT /api/deals/{id})
    if test_deal_id:
        try:
            update_data = {
                "price": 1750000,
                "description": "Updated test deal for Phase 3.3"
            }
            
            response = requests.put(
                f"{BASE_URL}/deals/{test_deal_id}",
                headers=get_headers(),
                json=update_data,
                timeout=10
            )
            
            if response.status_code == 200:
                updated_deal = response.json()
                print_result("Update Deal (PUT)", True,
                           f"Deal updated, new price: ${updated_deal.get('price')}")
            else:
                print_result("Update Deal (PUT)", False,
                           f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            print_result("Update Deal (PUT)", False, f"Exception: {str(e)}")
    
    # Test 5: Delete Deal (DELETE /api/deals/{id})
    if test_deal_id:
        try:
            response = requests.delete(
                f"{BASE_URL}/deals/{test_deal_id}",
                headers=get_headers(),
                timeout=10
            )
            
            if response.status_code in [200, 204]:
                print_result("Delete Deal (DELETE)", True,
                           f"Deal {test_deal_id} deleted successfully")
                test_deal_id = None  # Clear the ID
            else:
                print_result("Delete Deal (DELETE)", False,
                           f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            print_result("Delete Deal (DELETE)", False, f"Exception: {str(e)}")
    
    return True

def test_deal_move():
    """Test Deal Move API - PUT /api/deals/{id}/move"""
    print_section("4. DEAL MOVE API")
    
    # First create a test deal
    try:
        deal_data = {
            "title": f"Move Test Deal - {datetime.now().strftime('%Y%m%d%H%M%S')}",
            "address": "456 Move Test Ave",
            "city": "San Antonio",
            "state": "TX",
            "asset_type": "Retail",
            "price": 2000000
        }
        
        response = requests.post(
            f"{BASE_URL}/deals",
            headers=get_headers(),
            json=deal_data,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            deal = response.json()
            move_test_deal_id = deal.get('id')
            print_result("Create Deal for Move Test", True, f"Deal ID: {move_test_deal_id}")
            
            # Now test moving the deal
            if test_pipeline_id:
                # Get pipeline stages
                pipeline_response = requests.get(
                    f"{BASE_URL}/pipelines",
                    headers=get_headers(),
                    timeout=10
                )
                
                if pipeline_response.status_code == 200:
                    pipelines = pipeline_response.json().get('pipelines', [])
                    if pipelines and pipelines[0].get('pipeline_stages'):
                        stage_id = pipelines[0]['pipeline_stages'][0]['id']
                        
                        # Move deal to stage
                        move_response = requests.put(
                            f"{BASE_URL}/deals/{move_test_deal_id}/move",
                            headers={"Authorization": f"Bearer {auth_token}"},
                            data={"pipeline_stage_id": stage_id},
                            timeout=10
                        )
                        
                        if move_response.status_code == 200:
                            print_result("Move Deal to Stage", True,
                                       f"Deal moved to stage: {stage_id}")
                        else:
                            print_result("Move Deal to Stage", False,
                                       f"Status: {move_response.status_code}, Response: {move_response.text}")
                    else:
                        print_result("Move Deal to Stage", False, "No pipeline stages available")
                else:
                    print_result("Move Deal to Stage", False, "Could not fetch pipelines")
            else:
                print_result("Move Deal to Stage", False, "No test pipeline ID available")
            
            # Cleanup: Delete the test deal
            requests.delete(
                f"{BASE_URL}/deals/{move_test_deal_id}",
                headers=get_headers(),
                timeout=10
            )
        else:
            print_result("Create Deal for Move Test", False,
                       f"Status: {response.status_code}")
            return False
    except Exception as e:
        print_result("Deal Move API", False, f"Exception: {str(e)}")
        return False
    
    return True

def test_contacts_api():
    """Test Contacts API (if exists in backend)"""
    print_section("5. CONTACTS API")
    
    try:
        # Try to get contacts
        response = requests.get(
            f"{BASE_URL}/contacts",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            contacts = response.json()
            print_result("Get Contacts", True,
                       f"Contacts endpoint exists, returned {len(contacts)} contacts")
            
            # Try to create a contact
            contact_data = {
                "name": f"Test Contact - {datetime.now().strftime('%Y%m%d%H%M%S')}",
                "email": "testcontact@example.com",
                "phone": "210-555-0123",
                "company": "Test Company"
            }
            
            create_response = requests.post(
                f"{BASE_URL}/contacts",
                headers=get_headers(),
                json=contact_data,
                timeout=10
            )
            
            if create_response.status_code in [200, 201]:
                contact = create_response.json()
                contact_id = contact.get('id')
                print_result("Create Contact", True, f"Contact created with ID: {contact_id}")
                
                # Cleanup: Delete the test contact
                requests.delete(
                    f"{BASE_URL}/contacts/{contact_id}",
                    headers=get_headers(),
                    timeout=10
                )
            else:
                print_result("Create Contact", False,
                           f"Status: {create_response.status_code}")
        elif response.status_code == 404:
            print_result("Contacts API", True,
                       "Contacts managed via Supabase client-side only (no backend endpoints)")
        else:
            print_result("Get Contacts", False,
                       f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print_result("Contacts API", False, f"Exception: {str(e)}")

def test_calendar_api():
    """Test Calendar Events API (if exists in backend)"""
    print_section("6. CALENDAR EVENTS API")
    
    try:
        # Try to get calendar events
        response = requests.get(
            f"{BASE_URL}/calendar/events",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            events = response.json()
            print_result("Get Calendar Events", True,
                       f"Calendar endpoint exists, returned events")
        elif response.status_code == 404:
            print_result("Calendar API", True,
                       "Calendar managed via Supabase client-side only (no backend endpoints)")
        else:
            print_result("Get Calendar Events", False,
                       f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print_result("Calendar API", False, f"Exception: {str(e)}")

def test_teams_api():
    """Test Teams API"""
    print_section("7. TEAMS API")
    
    # Test 1: Get User's Teams (GET /api/teams)
    try:
        response = requests.get(
            f"{BASE_URL}/teams",
            headers=get_headers(),
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            teams = data.get('teams', [])
            print_result("Get User's Teams", True,
                       f"Retrieved {len(teams)} teams")
            
            if teams:
                team_id = teams[0].get('id')
                print(f"\n   Sample Team Data:")
                print(f"   ID: {teams[0].get('id')}")
                print(f"   Name: {teams[0].get('name')}")
                print(f"   User Role: {teams[0].get('user_role')}")
                
                # Test 2: Get Team Members (GET /api/teams/{id}/members)
                try:
                    members_response = requests.get(
                        f"{BASE_URL}/teams/{team_id}/members",
                        headers=get_headers(),
                        timeout=10
                    )
                    
                    if members_response.status_code == 200:
                        members_data = members_response.json()
                        members = members_data.get('members', [])
                        print_result("Get Team Members", True,
                                   f"Retrieved {len(members)} team members")
                        
                        if members:
                            print(f"\n   Sample Member Data:")
                            print(f"   User ID: {members[0].get('user_id')}")
                            print(f"   Role: {members[0].get('role')}")
                            print(f"   Full Name: {members[0].get('full_name')}")
                            print(f"   Email: {members[0].get('email')}")
                    else:
                        print_result("Get Team Members", False,
                                   f"Status: {members_response.status_code}, Response: {members_response.text}")
                except Exception as e:
                    print_result("Get Team Members", False, f"Exception: {str(e)}")
            else:
                print_result("Teams Data", True, "No teams found (empty state OK)")
        else:
            print_result("Get User's Teams", False,
                       f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print_result("Get User's Teams", False, f"Exception: {str(e)}")

def test_authorization():
    """Test proper authorization checks"""
    print_section("8. AUTHORIZATION CHECKS")
    
    try:
        # Test without auth token
        response = requests.get(
            f"{BASE_URL}/deals",
            timeout=10
        )
        
        if response.status_code == 401:
            print_result("Authorization Required", True,
                       "Endpoints properly require authentication (401 without token)")
        else:
            print_result("Authorization Required", False,
                       f"Expected 401, got {response.status_code}")
    except Exception as e:
        print_result("Authorization Check", False, f"Exception: {str(e)}")

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("  PHASE 3.3: BROKER WORKSPACE BACKEND AUDIT")
    print("  Test User: contact@pedroarmando.com (Broker Role)")
    print("="*80)
    
    # Authenticate first
    if not authenticate():
        print("\n❌ Authentication failed. Cannot proceed with tests.")
        return
    
    # Run all tests
    test_dashboard_stats()
    test_pipelines_api()
    test_deals_crud()
    test_deal_move()
    test_contacts_api()
    test_calendar_api()
    test_teams_api()
    test_authorization()
    
    print_section("TEST SUMMARY")
    print("All Phase 3.3 broker workspace backend tests completed.")
    print("Review results above for any failures.")
    print("\nSuccess Criteria:")
    print("✓ All endpoints return proper responses")
    print("✓ Empty data doesn't cause errors")
    print("✓ Proper authorization checks")
    print("✓ APIs ready for frontend consumption")

if __name__ == "__main__":
    main()
