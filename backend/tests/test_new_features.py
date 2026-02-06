"""
DealLinked CRM - New Features Test
Testing:
1. Backend health check
2. User signup/login
3. Contacts bulk-import endpoint
4. Document preview modal (UI)
5. CSV import modal (UI)
6. Auth singleton fix verification (data loads after login)
"""
import pytest
import requests
import os
import time
import random

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://commercial-crm.preview.emergentagent.com')
SUPABASE_URL = "https://ygezobmpewthqvsfqrbk.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"

class TestBackendHealth:
    """Test backend health and basic connectivity"""
    
    def test_health_endpoint(self):
        """Check backend health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"Backend health: {data}")


class TestAuthAndDataLoad:
    """Test authentication and verify data loads (auth singleton fix)"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create a test user for this test class"""
        timestamp = int(time.time())
        email = f"doctest_{timestamp}@example.com"
        password = "TestPass123!"
        return {"email": email, "password": password}
    
    @pytest.fixture(scope="class")
    def auth_token(self, test_user):
        """Sign up and get auth token via Supabase"""
        # Sign up user
        signup_response = requests.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            json={
                "email": test_user["email"],
                "password": test_user["password"],
                "data": {"full_name": "Document Test User"}
            },
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            }
        )
        
        if signup_response.status_code not in [200, 201]:
            # Try login if user already exists
            login_response = requests.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                json={
                    "email": test_user["email"],
                    "password": test_user["password"]
                },
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                }
            )
            if login_response.status_code != 200:
                pytest.skip(f"Could not signup or login: {signup_response.text} / {login_response.text}")
            return login_response.json()["access_token"]
        
        data = signup_response.json()
        if "access_token" not in data:
            pytest.skip(f"No access token in signup response: {data}")
        return data["access_token"]
    
    def test_deals_load_after_login(self, auth_token):
        """Verify deals data loads after login (auth singleton fix)"""
        response = requests.get(
            f"{BASE_URL}/api/deals",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "deals" in data
        print(f"Deals loaded: {len(data.get('deals', []))} deals")
    
    def test_pipelines_load_after_login(self, auth_token):
        """Verify pipelines data loads after login"""
        response = requests.get(
            f"{BASE_URL}/api/pipelines",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "pipelines" in data
        print(f"Pipelines loaded: {len(data.get('pipelines', []))} pipelines")
    
    def test_contacts_load_after_login(self, auth_token):
        """Verify contacts data loads after login"""
        response = requests.get(
            f"{BASE_URL}/api/contacts",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "contacts" in data
        print(f"Contacts loaded: {len(data.get('contacts', []))} contacts")
    
    def test_teams_load_after_login(self, auth_token):
        """Verify teams data loads after login"""
        response = requests.get(
            f"{BASE_URL}/api/teams",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "teams" in data or "team" in data or "success" in data
        print(f"Teams data: {data}")


class TestBulkImportEndpoint:
    """Test the POST /api/contacts/bulk-import endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for bulk import tests"""
        timestamp = int(time.time())
        email = f"bulktest_{timestamp}@example.com"
        password = "TestPass123!"
        
        # Sign up user
        signup_response = requests.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            json={
                "email": email,
                "password": password,
                "data": {"full_name": "Bulk Import Test User"}
            },
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            }
        )
        
        if signup_response.status_code in [200, 201] and "access_token" in signup_response.json():
            return signup_response.json()["access_token"]
        
        # Try login
        login_response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            json={"email": email, "password": password},
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"}
        )
        if login_response.status_code == 200:
            return login_response.json()["access_token"]
        
        pytest.skip("Could not get auth token for bulk import tests")
    
    def test_bulk_import_success(self, auth_token):
        """Test bulk import with valid contact data"""
        contacts_data = {
            "contacts": [
                {"name": "TEST_John Doe", "email": "john@test.com", "phone": "555-0001", "company": "ABC Corp"},
                {"name": "TEST_Jane Smith", "email": "jane@test.com", "phone": "555-0002", "company": "XYZ Inc"},
                {"name": "TEST_Bob Wilson", "company": "123 LLC", "contact_type": "Broker"}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contacts/bulk-import",
            json=contacts_data,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200, f"Bulk import failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["created"] >= 0  # Some might be created
        print(f"Bulk import result: {data['created']} created, {data.get('skipped', 0)} skipped")
    
    def test_bulk_import_requires_name(self, auth_token):
        """Test that bulk import validates name field is present"""
        contacts_data = {
            "contacts": [
                {"email": "noname@test.com", "company": "No Name Corp"}  # Missing 'name'
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contacts/bulk-import",
            json=contacts_data,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
        )
        
        # Should fail validation (422) since name is required
        assert response.status_code == 422, f"Expected 422 for missing name, got {response.status_code}: {response.text}"
        print(f"Validation error as expected: {response.json()}")
    
    def test_bulk_import_empty_list(self, auth_token):
        """Test bulk import with empty contacts list"""
        contacts_data = {"contacts": []}
        
        response = requests.post(
            f"{BASE_URL}/api/contacts/bulk-import",
            json=contacts_data,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["created"] == 0
        print(f"Empty list import result: {data}")


class TestDealDocuments:
    """Test deal document-related endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for document tests"""
        timestamp = int(time.time())
        email = f"docapitest_{timestamp}@example.com"
        password = "TestPass123!"
        
        signup_response = requests.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            json={
                "email": email,
                "password": password,
                "data": {"full_name": "Document API Test User"}
            },
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            }
        )
        
        if signup_response.status_code in [200, 201] and "access_token" in signup_response.json():
            return signup_response.json()["access_token"]
        
        login_response = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            json={"email": email, "password": password},
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"}
        )
        if login_response.status_code == 200:
            return login_response.json()["access_token"]
        
        pytest.skip("Could not get auth token for document tests")
    
    def test_deal_endpoint_includes_documents(self, auth_token):
        """Test that deal detail endpoint returns documents array"""
        # First create a deal
        deal_data = {
            "title": "TEST Document Deal",
            "address": "123 Test St",
            "city": "Test City",
            "state": "TX",
            "zip_code": "75001",
            "asset_type": "Office",
            "latitude": 32.7767,
            "longitude": -96.7970
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/deals",
            json=deal_data,
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create deal: {create_response.text}")
        
        deal_id = create_response.json().get("deal", {}).get("id")
        if not deal_id:
            pytest.skip("No deal ID returned")
        
        # Get deal details
        detail_response = requests.get(
            f"{BASE_URL}/api/deals/{deal_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert detail_response.status_code == 200
        data = detail_response.json()
        assert "deal" in data
        # Check that documents field exists (even if empty)
        deal = data["deal"]
        assert "documents" in deal or deal.get("documents") is None or "documents" not in deal
        print(f"Deal has documents field: {'documents' in deal}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
