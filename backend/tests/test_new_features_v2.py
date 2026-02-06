"""
Backend API Tests for New Features:
1. GET /api/deals - verify deals endpoint returns deals
2. GET /api/deals/{deal_id} - verify single deal endpoint returns contact_deal_links
3. GET /api/contacts - verify contacts endpoint returns contacts with tag support
4. GET /api/contacts/tags - verify tags endpoint works
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
SUPABASE_URL = "https://ygezobmpewthqvsfqrbk.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"


class TestBackendFeatures:
    """Test suite for backend API features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user and get auth token"""
        # Generate unique test email
        self.test_email = f"api_test_{int(time.time())}_{uuid.uuid4().hex[:6]}@example.com"
        self.test_password = "TestPass123!"
        self.test_name = "API Test User"
        
        # Create user via Supabase Auth
        signup_response = requests.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": self.test_email,
                "password": self.test_password,
                "data": {"full_name": self.test_name}
            }
        )
        
        if signup_response.status_code == 200:
            signup_data = signup_response.json()
            self.token = signup_data.get("access_token")
            self.user_id = signup_data.get("user", {}).get("id")
            print(f"Created test user: {self.test_email}")
        else:
            # Try login if signup fails (user might already exist)
            login_response = requests.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "email": self.test_email,
                    "password": self.test_password
                }
            )
            if login_response.status_code == 200:
                login_data = login_response.json()
                self.token = login_data.get("access_token")
                self.user_id = login_data.get("user", {}).get("id")
            else:
                pytest.skip(f"Could not authenticate: {signup_response.status_code} / {login_response.status_code}")
        
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        yield
        
        # Cleanup - no need to delete user, Supabase handles it

    def test_health_endpoint(self):
        """Test backend health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") in ["ok", "healthy"], f"Unexpected status: {data.get('status')}"
        print("Health check passed")

    def test_deals_list_endpoint(self):
        """Test GET /api/deals - verify deals endpoint returns deals structure"""
        response = requests.get(f"{BASE_URL}/api/deals", headers=self.headers)
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data structure assertions
        data = response.json()
        assert "success" in data, "Response missing 'success' field"
        assert "deals" in data, "Response missing 'deals' field"
        assert "count" in data, "Response missing 'count' field"
        assert isinstance(data["deals"], list), "deals should be a list"
        print(f"Deals list endpoint works: {data['count']} deals found")

    def test_deals_list_with_location_filter(self):
        """Test GET /api/deals?has_location=true filter"""
        response = requests.get(f"{BASE_URL}/api/deals?has_location=true", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"Deals with location filter: {data['count']} deals")

    def test_deals_list_with_asset_type_filter(self):
        """Test GET /api/deals?asset_type=Office filter for map view"""
        response = requests.get(f"{BASE_URL}/api/deals?asset_type=Office", headers=self.headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        # All returned deals should be Office type (if any)
        for deal in data.get("deals", []):
            if deal.get("asset_type"):
                assert deal["asset_type"] == "Office"
        print(f"Asset type filter works: {data['count']} Office deals")

    def test_create_deal_and_get_with_contacts(self):
        """Test creating a deal and GET /api/deals/{deal_id} returns contact_deal_links"""
        # Create a deal
        deal_data = {
            "title": f"Test Deal {uuid.uuid4().hex[:6]}",
            "address": "123 Test St",
            "city": "San Antonio",
            "state": "TX",
            "zip_code": "78201",
            "latitude": 29.4241,
            "longitude": -98.4936,
            "asset_type": "Office",
            "asking_price": 1250000,
            "size_sqft": 5000
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/deals",
            headers=self.headers,
            json=deal_data
        )
        
        assert create_response.status_code == 200, f"Failed to create deal: {create_response.text}"
        created_deal = create_response.json().get("deal")
        assert created_deal is not None, "Created deal should be returned"
        deal_id = created_deal.get("id")
        assert deal_id is not None, "Deal should have an id"
        
        # Get single deal - should return contact_deal_links
        get_response = requests.get(
            f"{BASE_URL}/api/deals/{deal_id}",
            headers=self.headers
        )
        
        assert get_response.status_code == 200, f"Failed to get deal: {get_response.text}"
        get_data = get_response.json()
        assert get_data.get("success") == True
        
        deal = get_data.get("deal")
        assert deal is not None, "Deal should be returned"
        
        # Verify contact_deal_links field exists (Feature: show contact info in side panel)
        assert "contact_deal_links" in deal, "Deal should have contact_deal_links field for side panel contact info"
        assert isinstance(deal["contact_deal_links"], list), "contact_deal_links should be a list"
        
        print(f"Deal {deal_id} returned with contact_deal_links field")
        
        # Verify asking price is stored correctly (for comma formatting display)
        assert deal.get("asking_price") == 1250000, f"Expected asking_price 1250000, got {deal.get('asking_price')}"
        print(f"Asking price stored correctly: {deal.get('asking_price')}")
        
        # Cleanup - delete deal
        delete_response = requests.delete(
            f"{BASE_URL}/api/deals/{deal_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200, f"Failed to delete deal: {delete_response.text}"

    def test_contacts_list_endpoint(self):
        """Test GET /api/contacts - verify contacts endpoint works"""
        response = requests.get(f"{BASE_URL}/api/contacts", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "success" in data, "Response missing 'success' field"
        assert "contacts" in data, "Response missing 'contacts' field"
        assert "count" in data, "Response missing 'count' field"
        assert isinstance(data["contacts"], list), "contacts should be a list"
        print(f"Contacts list endpoint works: {data['count']} contacts found")

    def test_contacts_tag_filter(self):
        """Test GET /api/contacts?tag_id=xxx - verify tag filter support"""
        # First create a tag
        tag_data = {"name": f"TestTag_{uuid.uuid4().hex[:6]}", "color": "#00b8d4"}
        tag_response = requests.post(
            f"{BASE_URL}/api/contacts/tags",
            headers=self.headers,
            json=tag_data
        )
        
        assert tag_response.status_code == 200, f"Failed to create tag: {tag_response.text}"
        tag = tag_response.json().get("tag")
        assert tag is not None
        tag_id = tag.get("id")
        
        # Create a contact with this tag
        contact_data = {
            "name": f"Test Contact {uuid.uuid4().hex[:6]}",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "contact_type": "Buyer",
            "status": "Active",
            "tag_ids": [tag_id]
        }
        
        contact_response = requests.post(
            f"{BASE_URL}/api/contacts",
            headers=self.headers,
            json=contact_data
        )
        
        assert contact_response.status_code == 200, f"Failed to create contact: {contact_response.text}"
        contact = contact_response.json().get("contact")
        contact_id = contact.get("id")
        
        # Test tag filter
        filter_response = requests.get(
            f"{BASE_URL}/api/contacts?tag_id={tag_id}",
            headers=self.headers
        )
        
        assert filter_response.status_code == 200, f"Tag filter failed: {filter_response.text}"
        filter_data = filter_response.json()
        assert filter_data.get("success") == True
        
        # Should return at least the contact we created
        contacts = filter_data.get("contacts", [])
        contact_ids = [c["id"] for c in contacts]
        assert contact_id in contact_ids, "Created contact should be in filtered results"
        
        print(f"Tag filter works: found {len(contacts)} contacts with tag")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/contacts/{contact_id}", headers=self.headers)
        requests.delete(f"{BASE_URL}/api/contacts/tags/{tag_id}", headers=self.headers)

    def test_contacts_tags_endpoint(self):
        """Test GET /api/contacts/tags - verify tags endpoint works"""
        response = requests.get(f"{BASE_URL}/api/contacts/tags", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "success" in data, "Response missing 'success' field"
        assert "tags" in data, "Response missing 'tags' field"
        assert isinstance(data["tags"], list), "tags should be a list"
        print(f"Tags endpoint works: {data.get('count', len(data['tags']))} tags found")

    def test_create_and_list_tags(self):
        """Test POST /api/contacts/tags - create tag and list"""
        # Create a tag
        tag_data = {
            "name": f"TestTag_{uuid.uuid4().hex[:6]}",
            "color": "#f59e0b"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/contacts/tags",
            headers=self.headers,
            json=tag_data
        )
        
        assert create_response.status_code == 200, f"Failed to create tag: {create_response.text}"
        
        created_tag = create_response.json().get("tag")
        assert created_tag is not None, "Created tag should be returned"
        assert created_tag.get("name") == tag_data["name"], "Tag name should match"
        assert created_tag.get("color") == tag_data["color"], "Tag color should match"
        
        tag_id = created_tag.get("id")
        
        # Verify tag is in list
        list_response = requests.get(f"{BASE_URL}/api/contacts/tags", headers=self.headers)
        tags = list_response.json().get("tags", [])
        tag_ids = [t["id"] for t in tags]
        assert tag_id in tag_ids, "Created tag should be in list"
        
        print(f"Tag created and listed successfully: {created_tag['name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/contacts/tags/{tag_id}", headers=self.headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
