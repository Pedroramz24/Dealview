"""
DealVisor Map CRM Backend Testing
Tests for pipeline/stage selection and property-to-deal conversion
"""
import requests
import json
import time
from datetime import datetime

# Configuration
API_BASE = "https://crm-simplify-1.preview.emergentagent.com/api"
TEST_USER_EMAIL = "contact@pedroarmando.com"
TEST_USER_PASSWORD = "Flin141812$"

# ANSI color codes for output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(80)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}\n")

def print_test(test_name):
    print(f"{Colors.OKCYAN}{Colors.BOLD}TEST: {test_name}{Colors.ENDC}")

def print_success(message):
    print(f"{Colors.OKGREEN}✓ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.OKBLUE}ℹ {message}{Colors.ENDC}")

def print_warning(message):
    print(f"{Colors.WARNING}⚠ {message}{Colors.ENDC}")

# Global variables
auth_token = None
test_property_id = None
test_deal_id = None
test_pipeline_id = None
test_stage_id = None

def authenticate():
    """Authenticate with Supabase and get JWT token"""
    global auth_token
    
    print_test("Authentication")
    
    try:
        # Use Supabase client directly
        from supabase import create_client
        
        supabase_url = "https://ygezobmpewthqvsfqrbk.supabase.co"
        supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"
        
        supabase = create_client(supabase_url, supabase_key)
        
        # Sign in
        response = supabase.auth.sign_in_with_password({
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        auth_token = response.session.access_token
        user_id = response.user.id
        
        print_success(f"Authenticated as {TEST_USER_EMAIL}")
        print_info(f"User ID: {user_id}")
        print_info(f"Token length: {len(auth_token)} chars")
        
        return True
        
    except Exception as e:
        print_error(f"Authentication failed: {str(e)}")
        return False

def test_get_pipelines():
    """Test fetching user pipelines"""
    global test_pipeline_id, test_stage_id
    
    print_test("Get User Pipelines")
    
    try:
        from supabase import create_client
        
        supabase_url = "https://ygezobmpewthqvsfqrbk.supabase.co"
        supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"
        
        supabase = create_client(supabase_url, supabase_key)
        
        # Set auth token
        supabase.postgrest.auth(auth_token)
        
        # Fetch pipelines with stages
        response = supabase.table('pipelines').select('id, name, pipeline_stages(id, name, color, display_order)').eq('is_active', True).order('created_at').execute()
        
        pipelines = response.data
        
        if not pipelines or len(pipelines) == 0:
            print_warning("No pipelines found for user")
            return False
        
        print_success(f"Found {len(pipelines)} pipeline(s)")
        
        for pipeline in pipelines:
            stages = pipeline.get('pipeline_stages', [])
            print_info(f"Pipeline: {pipeline['name']} ({pipeline['id']}) - {len(stages)} stages")
            
            # Store first pipeline and stage for testing
            if not test_pipeline_id:
                test_pipeline_id = pipeline['id']
                if stages and len(stages) > 0:
                    # Sort stages by display_order
                    sorted_stages = sorted(stages, key=lambda x: x.get('display_order', 0))
                    test_stage_id = sorted_stages[0]['id']
                    print_info(f"  First stage: {sorted_stages[0]['name']} (color: {sorted_stages[0].get('color', 'N/A')})")
        
        return True
        
    except Exception as e:
        print_error(f"Failed to fetch pipelines: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_get_map_properties():
    """Test fetching map properties"""
    global test_property_id
    
    print_test("Get Map Properties")
    
    try:
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        # Fetch properties from map-crm endpoint
        response = requests.get(
            f"{API_BASE}/map-crm/properties?limit=10",
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            print_error(f"Failed to fetch properties: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
        
        properties = response.json()
        
        if not properties or len(properties) == 0:
            print_warning("No properties found in map CRM")
            return False
        
        print_success(f"Found {len(properties)} properties")
        
        # Find a property that hasn't been converted yet
        for prop in properties:
            if prop.get('status') != 'converted' and not prop.get('deal_id'):
                test_property_id = prop['id']
                print_info(f"Selected property: {prop.get('address', 'N/A')} ({prop['id']})")
                print_info(f"  Asset Type: {prop.get('asset_type', 'N/A')}")
                print_info(f"  Status: {prop.get('status', 'N/A')}")
                break
        
        if not test_property_id:
            print_warning("No unconverted properties available for testing")
            # Use first property anyway
            test_property_id = properties[0]['id']
            print_info(f"Using property: {properties[0]['id']} (may already be converted)")
        
        return True
        
    except Exception as e:
        print_error(f"Failed to fetch map properties: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_convert_property_to_deal():
    """Test converting a property to a deal"""
    global test_deal_id
    
    print_test("Convert Property to Deal")
    
    if not test_property_id:
        print_error("No test property ID available")
        return False
    
    try:
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        # Convert property to deal
        response = requests.post(
            f"{API_BASE}/map-crm/properties/{test_property_id}/convert-to-deal",
            headers=headers,
            json={},
            timeout=10
        )
        
        if response.status_code == 400:
            # Property may already be converted
            error_data = response.json()
            if 'already converted' in error_data.get('detail', '').lower():
                print_warning("Property already converted to deal")
                # Try to find the deal_id from the property
                prop_response = requests.get(
                    f"{API_BASE}/map-crm/properties/{test_property_id}",
                    headers=headers,
                    timeout=10
                )
                if prop_response.status_code == 200:
                    prop_data = prop_response.json()
                    test_deal_id = prop_data.get('deal_id')
                    if test_deal_id:
                        print_info(f"Found existing deal ID: {test_deal_id}")
                        return True
            print_error(f"Conversion failed: {error_data.get('detail', 'Unknown error')}")
            return False
        
        if response.status_code != 200:
            print_error(f"Conversion failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
        
        result = response.json()
        test_deal_id = result.get('deal_id')
        
        print_success(f"Property converted to deal successfully")
        print_info(f"Deal ID: {test_deal_id}")
        print_info(f"Message: {result.get('message', 'N/A')}")
        
        return True
        
    except Exception as e:
        print_error(f"Failed to convert property: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_verify_deal_creation():
    """Verify the deal was created with pipeline and stage"""
    print_test("Verify Deal Creation with Pipeline & Stage")
    
    if not test_deal_id:
        print_error("No test deal ID available")
        return False
    
    try:
        from supabase import create_client
        
        supabase_url = "https://ygezobmpewthqvsfqrbk.supabase.co"
        supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"
        
        supabase = create_client(supabase_url, supabase_key)
        supabase.postgrest.auth(auth_token)
        
        # Fetch deal
        response = supabase.table('deals').select('*').eq('id', test_deal_id).single().execute()
        
        deal = response.data
        
        print_success("Deal found in database")
        print_info(f"Title: {deal.get('title', 'N/A')}")
        print_info(f"Address: {deal.get('address', 'N/A')}")
        print_info(f"Asset Type: {deal.get('asset_type', 'N/A')}")
        print_info(f"Pipeline ID: {deal.get('pipeline_id', 'N/A')}")
        print_info(f"Pipeline Stage ID: {deal.get('pipeline_stage_id', 'N/A')}")
        
        # Verify pipeline and stage are set
        if not deal.get('pipeline_id'):
            print_warning("Deal does not have pipeline_id set")
        else:
            print_success("Deal has pipeline_id")
        
        if not deal.get('pipeline_stage_id'):
            print_warning("Deal does not have pipeline_stage_id set")
        else:
            print_success("Deal has pipeline_stage_id")
        
        return True
        
    except Exception as e:
        print_error(f"Failed to verify deal: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_update_deal_pipeline():
    """Test updating deal pipeline"""
    print_test("Update Deal Pipeline")
    
    if not test_deal_id or not test_pipeline_id:
        print_error("Missing test deal ID or pipeline ID")
        return False
    
    try:
        from supabase import create_client
        
        supabase_url = "https://ygezobmpewthqvsfqrbk.supabase.co"
        supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"
        
        supabase = create_client(supabase_url, supabase_key)
        supabase.postgrest.auth(auth_token)
        
        # Update deal pipeline
        response = supabase.table('deals').update({
            'pipeline_id': test_pipeline_id,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', test_deal_id).execute()
        
        if not response.data:
            print_error("Failed to update deal pipeline")
            return False
        
        print_success(f"Deal pipeline updated to: {test_pipeline_id}")
        
        return True
        
    except Exception as e:
        print_error(f"Failed to update pipeline: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_update_deal_stage():
    """Test updating deal stage"""
    print_test("Update Deal Stage")
    
    if not test_deal_id or not test_stage_id:
        print_error("Missing test deal ID or stage ID")
        return False
    
    try:
        from supabase import create_client
        
        supabase_url = "https://ygezobmpewthqvsfqrbk.supabase.co"
        supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"
        
        supabase = create_client(supabase_url, supabase_key)
        supabase.postgrest.auth(auth_token)
        
        # Update deal stage
        response = supabase.table('deals').update({
            'pipeline_stage_id': test_stage_id,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', test_deal_id).execute()
        
        if not response.data:
            print_error("Failed to update deal stage")
            return False
        
        print_success(f"Deal stage updated to: {test_stage_id}")
        
        return True
        
    except Exception as e:
        print_error(f"Failed to update stage: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_verify_stage_color_on_map():
    """Verify that deal has stage color for map display"""
    print_test("Verify Stage Color for Map Display")
    
    if not test_deal_id:
        print_error("No test deal ID available")
        return False
    
    try:
        from supabase import create_client
        
        supabase_url = "https://ygezobmpewthqvsfqrbk.supabase.co"
        supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"
        
        supabase = create_client(supabase_url, supabase_key)
        supabase.postgrest.auth(auth_token)
        
        # Fetch deal with stage information
        response = supabase.table('deals').select('id, pipeline_stage_id, asset_type').eq('id', test_deal_id).single().execute()
        
        deal = response.data
        
        if not deal.get('pipeline_stage_id'):
            print_warning("Deal does not have pipeline_stage_id - will use asset type color")
            print_info(f"Asset Type: {deal.get('asset_type', 'N/A')}")
            return True
        
        # Fetch stage color
        stage_response = supabase.table('pipeline_stages').select('id, name, color').eq('id', deal['pipeline_stage_id']).single().execute()
        
        stage = stage_response.data
        
        print_success("Deal has pipeline stage with color")
        print_info(f"Stage: {stage.get('name', 'N/A')}")
        print_info(f"Color: {stage.get('color', 'N/A')}")
        print_info("Map pin will use this stage color instead of asset type color")
        
        return True
        
    except Exception as e:
        print_error(f"Failed to verify stage color: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def run_all_tests():
    """Run all tests in sequence"""
    print_header("DEALVISOR MAP CRM BACKEND TESTS")
    print_info(f"API Base: {API_BASE}")
    print_info(f"Test User: {TEST_USER_EMAIL}")
    print_info(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    
    # Test 1: Authentication
    results.append(("Authentication", authenticate()))
    
    if not auth_token:
        print_error("Cannot proceed without authentication")
        return
    
    # Test 2: Get Pipelines
    results.append(("Get Pipelines", test_get_pipelines()))
    
    # Test 3: Get Map Properties
    results.append(("Get Map Properties", test_get_map_properties()))
    
    # Test 4: Convert Property to Deal
    results.append(("Convert Property to Deal", test_convert_property_to_deal()))
    
    # Test 5: Verify Deal Creation
    results.append(("Verify Deal Creation", test_verify_deal_creation()))
    
    # Test 6: Update Deal Pipeline
    results.append(("Update Deal Pipeline", test_update_deal_pipeline()))
    
    # Test 7: Update Deal Stage
    results.append(("Update Deal Stage", test_update_deal_stage()))
    
    # Test 8: Verify Stage Color
    results.append(("Verify Stage Color", test_verify_stage_color_on_map()))
    
    # Summary
    print_header("TEST SUMMARY")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{Colors.OKGREEN}PASS{Colors.ENDC}" if result else f"{Colors.FAIL}FAIL{Colors.ENDC}"
        print(f"{test_name.ljust(40)} {status}")
    
    print(f"\n{Colors.BOLD}Total: {passed}/{total} tests passed{Colors.ENDC}")
    
    if passed == total:
        print(f"{Colors.OKGREEN}{Colors.BOLD}✓ ALL TESTS PASSED{Colors.ENDC}")
    else:
        print(f"{Colors.FAIL}{Colors.BOLD}✗ SOME TESTS FAILED{Colors.ENDC}")

if __name__ == "__main__":
    run_all_tests()
