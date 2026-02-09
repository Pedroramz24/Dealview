"""
Test suite for Commercial CRM new features:
1. PUT /api/deals/{deal_id}/visibility - Toggle team sharing on/off
2. POST /api/contacts/tags - Create a new tag inline

Requires Supabase auth. Uses existing test user credentials.
"""

import pytest
import requests
import os
import time
import uuid

# Get backend URL from environment variable
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://contact-mgmt-v1.preview.emergentagent.com')

# Supabase credentials from environment
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://ygezobmpewthqvsfqrbk.supabase.co')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0')


class TestConfig:
    """Configuration for tests"""
    test_email = f"visibility_test_{int(time.time())}@example.com"
    test_password = "TestPass123!"
    auth_token = None
    created_deal_id = None
    created_tag_ids = []


def get_supabase_token(email: str, password: str, signup: bool = False) -> str:
    """Get Supabase JWT token via signup or signin"""
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
    }
    
    if signup:
        # Sign up
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers=headers,
            json={'email': email, 'password': password}
        )
    else:
        # Sign in
        response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers=headers,
            json={'email': email, 'password': password}
        )
    
    if response.status_code in [200, 201]:
        data = response.json()
        return data.get('access_token')
    return None


@pytest.fixture(scope="module")
def auth_token():
    """Get authenticated token for testing"""
    # Try to sign up first
    token = get_supabase_token(TestConfig.test_email, TestConfig.test_password, signup=True)
    if not token:
        # If signup fails (user exists), try signin
        token = get_supabase_token(TestConfig.test_email, TestConfig.test_password, signup=False)
    
    if not token:
        pytest.skip("Could not authenticate with Supabase")
    
    TestConfig.auth_token = token
    return token


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    })
    return session


@pytest.fixture(scope="module")
def test_deal(api_client):
    """Create a test deal with location for testing"""
    deal_payload = {
        "title": f"Visibility Test Deal {int(time.time())}",
        "address": "123 Test St",
        "city": "San Antonio",
        "state": "TX",
        "zip_code": "78205",
        "latitude": 29.4241,
        "longitude": -98.4936,
        "asset_type": "Office",
        "asking_price": 1500000
    }
    
    response = api_client.post(f"{BASE_URL}/api/deals", json=deal_payload)
    
    if response.status_code in [200, 201]:
        data = response.json()
        deal = data.get('deal')
        if deal:
            TestConfig.created_deal_id = deal.get('id')
            return deal
    
    pytest.skip("Could not create test deal")


class TestDealVisibilityAPI:
    """Test PUT /api/deals/{deal_id}/visibility endpoint"""
    
    def test_deal_visibility_shared_with_team(self, api_client, test_deal):
        """Test setting deal to shared with team"""
        deal_id = test_deal['id']
        
        # Set shared_with_team to true
        response = api_client.put(
            f"{BASE_URL}/api/deals/{deal_id}/visibility",
            json={"shared_with_team": True}
        )
        
        # Status code check
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data validation
        data = response.json()
        assert data.get('success') == True, "Response should indicate success"
        assert data.get('shared_with_team') == True, "Deal should be marked as shared with team"
        assert 'deal' in data, "Response should contain deal object"
        
        # Verify the deal object has team_id set (or returned)
        deal = data.get('deal')
        if deal:
            # team_id should be set when shared
            print(f"Deal team_id after sharing: {deal.get('team_id')}")
    
    def test_deal_visibility_set_private(self, api_client, test_deal):
        """Test setting deal to private"""
        deal_id = test_deal['id']
        
        # Set shared_with_team to false
        response = api_client.put(
            f"{BASE_URL}/api/deals/{deal_id}/visibility",
            json={"shared_with_team": False}
        )
        
        # Status code check
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data validation
        data = response.json()
        assert data.get('success') == True, "Response should indicate success"
        assert data.get('shared_with_team') == False, "Deal should be marked as private"
        
        # Verify team_id is null when private
        deal = data.get('deal')
        if deal:
            assert deal.get('team_id') is None, "team_id should be null when set to private"
    
    def test_deal_visibility_toggle_back_to_shared(self, api_client, test_deal):
        """Test toggling visibility back to shared"""
        deal_id = test_deal['id']
        
        # Toggle back to shared
        response = api_client.put(
            f"{BASE_URL}/api/deals/{deal_id}/visibility",
            json={"shared_with_team": True}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        assert data.get('shared_with_team') == True
    
    def test_deal_visibility_invalid_deal_id(self, api_client):
        """Test visibility update with invalid deal ID returns 404"""
        fake_deal_id = str(uuid.uuid4())
        
        response = api_client.put(
            f"{BASE_URL}/api/deals/{fake_deal_id}/visibility",
            json={"shared_with_team": True}
        )
        
        # Should return 404 for non-existent deal
        assert response.status_code == 404, f"Expected 404 for invalid deal, got {response.status_code}"
    
    def test_verify_deal_state_after_visibility_change(self, api_client, test_deal):
        """GET the deal after visibility change to verify persistence"""
        deal_id = test_deal['id']
        
        # First set to private
        api_client.put(
            f"{BASE_URL}/api/deals/{deal_id}/visibility",
            json={"shared_with_team": False}
        )
        
        # GET the deal to verify team_id is null
        response = api_client.get(f"{BASE_URL}/api/deals/{deal_id}")
        assert response.status_code == 200
        data = response.json()
        deal = data.get('deal')
        assert deal.get('team_id') is None, "team_id should be null after setting to private"


class TestContactsTagsAPI:
    """Test POST /api/contacts/tags endpoint"""
    
    def test_create_tag_success(self, api_client):
        """Test creating a new tag"""
        tag_payload = {
            "name": f"Test Tag {int(time.time())}",
            "color": "#10b981"
        }
        
        response = api_client.post(f"{BASE_URL}/api/contacts/tags", json=tag_payload)
        
        # Status code check
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data validation
        data = response.json()
        assert data.get('success') == True, "Response should indicate success"
        assert 'tag' in data, "Response should contain tag object"
        
        tag = data.get('tag')
        assert tag is not None, "Tag object should not be null"
        assert 'id' in tag, "Tag should have an id"
        assert tag.get('name') == tag_payload['name'], f"Tag name should match: expected {tag_payload['name']}, got {tag.get('name')}"
        assert tag.get('color') == tag_payload['color'], f"Tag color should match: expected {tag_payload['color']}, got {tag.get('color')}"
        
        # Save for cleanup
        if tag and tag.get('id'):
            TestConfig.created_tag_ids.append(tag.get('id'))
    
    def test_create_tag_default_color(self, api_client):
        """Test creating a tag without specifying color (should use default)"""
        tag_payload = {
            "name": f"Tag No Color {int(time.time())}"
        }
        
        response = api_client.post(f"{BASE_URL}/api/contacts/tags", json=tag_payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get('success') == True
        
        tag = data.get('tag')
        assert tag is not None
        # Default color should be applied
        assert tag.get('color') is not None, "Default color should be applied"
        print(f"Default color applied: {tag.get('color')}")
        
        if tag and tag.get('id'):
            TestConfig.created_tag_ids.append(tag.get('id'))
    
    def test_create_tag_with_different_color(self, api_client):
        """Test creating tag with custom color"""
        tag_payload = {
            "name": f"Orange Tag {int(time.time())}",
            "color": "#f59e0b"
        }
        
        response = api_client.post(f"{BASE_URL}/api/contacts/tags", json=tag_payload)
        
        assert response.status_code == 200
        data = response.json()
        tag = data.get('tag')
        assert tag.get('color') == "#f59e0b"
        
        if tag and tag.get('id'):
            TestConfig.created_tag_ids.append(tag.get('id'))
    
    def test_list_tags_includes_created_tag(self, api_client):
        """Test that created tags appear in the tags list"""
        # Create a unique tag
        unique_name = f"Unique Tag {int(time.time())}"
        create_response = api_client.post(
            f"{BASE_URL}/api/contacts/tags",
            json={"name": unique_name, "color": "#8b5cf6"}
        )
        assert create_response.status_code == 200
        created_tag = create_response.json().get('tag')
        if created_tag:
            TestConfig.created_tag_ids.append(created_tag.get('id'))
        
        # GET all tags
        list_response = api_client.get(f"{BASE_URL}/api/contacts/tags")
        assert list_response.status_code == 200
        
        data = list_response.json()
        assert 'tags' in data
        tags = data.get('tags', [])
        
        # Verify our created tag is in the list
        tag_names = [t.get('name') for t in tags]
        assert unique_name in tag_names, f"Created tag '{unique_name}' should appear in tags list"
    
    def test_create_tag_missing_name(self, api_client):
        """Test creating tag without name fails with validation error"""
        tag_payload = {
            "color": "#10b981"
        }
        
        response = api_client.post(f"{BASE_URL}/api/contacts/tags", json=tag_payload)
        
        # Should fail validation - expect 422 (Pydantic validation error)
        assert response.status_code == 422, f"Expected 422 validation error, got {response.status_code}"


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_deal(self, api_client):
        """Delete test deal if created"""
        if TestConfig.created_deal_id:
            response = api_client.delete(f"{BASE_URL}/api/deals/{TestConfig.created_deal_id}")
            print(f"Cleanup deal response: {response.status_code}")
    
    def test_cleanup_tags(self, api_client):
        """Delete test tags if created"""
        for tag_id in TestConfig.created_tag_ids:
            response = api_client.delete(f"{BASE_URL}/api/contacts/tags/{tag_id}")
            print(f"Cleanup tag {tag_id} response: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
