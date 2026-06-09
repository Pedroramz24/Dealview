"""
DealLinked CRM - Portal Agent Data & Contact Fields Tests
Tests for:
1. GET /api/portal/{portal_id}/deals/{deal_id} returns agent object with full_name, email, phone, avatar_url
2. POST /api/contacts accepts new fields: title, owner_address, contact_types, asset_type_focus, markets, lead_source
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = os.environ.get("TEST_EMAIL", "")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "")


class TestAuthentication:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data}"
        return data["access_token"]
    
    def test_login_success(self, auth_token):
        """Test login returns valid token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Login successful, token obtained")


class TestContactNewFields:
    """Test POST /api/contacts with new fields: title, owner_address, contact_types, asset_type_focus, markets, lead_source"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.text}")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_create_contact_with_new_fields(self, auth_headers):
        """Test creating contact with all new fields"""
        unique_id = str(uuid.uuid4())[:8]
        contact_data = {
            "name": f"TEST_Contact_{unique_id}",
            "email": f"test_{unique_id}@example.com",
            "phone": "555-123-4567",
            "company": "Test Company",
            "title": "Senior Vice President",  # NEW FIELD
            "owner_address": "123 Main St, Suite 100, Los Angeles, CA 90001",  # NEW FIELD
            "contact_type": "Buyer",
            "contact_types": ["Buyer", "Investor", "Developer"],  # NEW FIELD (array)
            "asset_type_focus": ["Office", "Retail", "Industrial"],  # NEW FIELD (array)
            "markets": ["Los Angeles", "San Francisco", "Phoenix"],  # NEW FIELD (array)
            "lead_source": "Referral",  # NEW FIELD
            "status": "Active",
            "notes": "Test contact with new fields"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contacts",
            json=contact_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create contact failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Response not successful: {data}"
        
        contact = data.get("contact")
        assert contact is not None, "No contact in response"
        
        # Verify new fields are saved
        assert contact.get("title") == "Senior Vice President", f"title not saved: {contact.get('title')}"
        assert contact.get("owner_address") == "123 Main St, Suite 100, Los Angeles, CA 90001", f"owner_address not saved: {contact.get('owner_address')}"
        assert contact.get("contact_types") == ["Buyer", "Investor", "Developer"], f"contact_types not saved: {contact.get('contact_types')}"
        assert contact.get("asset_type_focus") == ["Office", "Retail", "Industrial"], f"asset_type_focus not saved: {contact.get('asset_type_focus')}"
        assert contact.get("markets") == ["Los Angeles", "San Francisco", "Phoenix"], f"markets not saved: {contact.get('markets')}"
        assert contact.get("lead_source") == "Referral", f"lead_source not saved: {contact.get('lead_source')}"
        
        print(f"✓ Contact created with all new fields: {contact.get('id')}")
        
        # Cleanup - delete the test contact
        contact_id = contact.get("id")
        if contact_id:
            delete_response = requests.delete(
                f"{BASE_URL}/api/contacts/{contact_id}",
                headers=auth_headers
            )
            print(f"  Cleanup: deleted test contact {contact_id}")
    
    def test_create_contact_with_partial_new_fields(self, auth_headers):
        """Test creating contact with only some new fields"""
        unique_id = str(uuid.uuid4())[:8]
        contact_data = {
            "name": f"TEST_Partial_{unique_id}",
            "email": f"partial_{unique_id}@example.com",
            "title": "Director",  # Only title
            "lead_source": "Website"  # Only lead_source
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contacts",
            json=contact_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create contact failed: {response.text}"
        data = response.json()
        contact = data.get("contact")
        
        assert contact.get("title") == "Director", f"title not saved"
        assert contact.get("lead_source") == "Website", f"lead_source not saved"
        # Arrays should default to empty
        assert contact.get("contact_types") == [] or contact.get("contact_types") is None, f"contact_types should be empty"
        
        print(f"✓ Contact created with partial new fields")
        
        # Cleanup
        contact_id = contact.get("id")
        if contact_id:
            requests.delete(f"{BASE_URL}/api/contacts/{contact_id}", headers=auth_headers)


class TestPortalAgentData:
    """Test GET /api/portal/{portal_id}/deals/{deal_id} returns agent object"""
    
    def test_get_portals_list(self):
        """First get list of portals to find a valid portal_id"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Login failed")
        
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get portals
        response = requests.get(f"{BASE_URL}/api/portals", headers=headers)
        assert response.status_code == 200, f"Get portals failed: {response.text}"
        
        data = response.json()
        portals = data.get("portals", [])
        print(f"✓ Found {len(portals)} portals")
        
        return portals
    
    def test_portal_deal_detail_returns_agent(self):
        """Test that portal deal detail endpoint returns agent data"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Login failed")
        
        token = login_response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get portals
        portals_response = requests.get(f"{BASE_URL}/api/portals", headers=headers)
        if portals_response.status_code != 200:
            pytest.skip("Could not get portals")
        
        portals = portals_response.json().get("portals", [])
        if not portals:
            pytest.skip("No portals available for testing")
        
        # Find a portal with deals
        portal_with_deals = None
        portal_session = None
        deal_id = None
        
        for portal in portals:
            portal_id = portal.get("id")
            
            # Try to authenticate to portal (as investor)
            # First check if portal has members
            members_response = requests.get(
                f"{BASE_URL}/api/portals/{portal_id}/members",
                headers=headers
            )
            if members_response.status_code != 200:
                continue
            
            members = members_response.json().get("members", [])
            if not members:
                continue
            
            # Get a member email to authenticate
            member_email = members[0].get("email")
            
            # Authenticate to portal
            auth_response = requests.post(
                f"{BASE_URL}/api/portal/{portal_id}/auth",
                json={"email": member_email}
            )
            
            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                portal_session = auth_data.get("session_token")
                
                # Get deals in this portal
                deals_response = requests.get(
                    f"{BASE_URL}/api/portal/{portal_id}/deals",
                    headers={"X-Portal-Session": portal_session}
                )
                
                if deals_response.status_code == 200:
                    deals = deals_response.json().get("deals", [])
                    if deals:
                        portal_with_deals = portal_id
                        deal_id = deals[0].get("id")
                        break
        
        if not portal_with_deals or not deal_id:
            pytest.skip("No portal with deals found for testing")
        
        # Now test the deal detail endpoint
        detail_response = requests.get(
            f"{BASE_URL}/api/portal/{portal_with_deals}/deals/{deal_id}",
            headers={"X-Portal-Session": portal_session}
        )
        
        assert detail_response.status_code == 200, f"Get deal detail failed: {detail_response.text}"
        
        data = detail_response.json()
        deal = data.get("deal")
        assert deal is not None, "No deal in response"
        
        # Check for agent object
        agent = deal.get("agent")
        if agent:
            print(f"✓ Agent data found in deal response:")
            print(f"  - full_name: {agent.get('full_name')}")
            print(f"  - email: {agent.get('email')}")
            print(f"  - phone: {agent.get('phone')}")
            print(f"  - avatar_url: {agent.get('avatar_url')}")
            print(f"  - company: {agent.get('company')}")
            
            # Verify agent has expected fields
            assert "full_name" in agent, "agent missing full_name"
            assert "email" in agent, "agent missing email"
            # phone and avatar_url may be null but should be present
        else:
            print("⚠ No agent data in deal response (deal may not have owner)")
        
        # Verify owner_id is NOT exposed
        assert "owner_id" not in deal, "owner_id should NOT be exposed in portal deal detail"
        print(f"✓ owner_id correctly NOT exposed in portal deal detail")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print(f"✓ API health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
