"""
Test suite for Investor Portal API endpoints (Phase 4)
Tests authentication, deal browsing, saved deals, and logout functionality.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test portal and investor credentials
PORTAL_ID = "1d6a0baa-b7ad-4e52-9896-fe04c9341e45"
DEAL_ID = "7a7e4043-28c7-48e0-81d5-a54b63c5b49a"
INVESTOR_NAME = "UI Test Investor"
ACCESS_CODE = "E7XXUWCH"


class TestPortalAuthentication:
    """Portal investor authentication tests"""
    
    def test_auth_with_valid_credentials(self):
        """Test login with valid name and access code"""
        response = requests.post(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/auth",
            json={"name": INVESTOR_NAME, "access_code": ACCESS_CODE}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "session_token" in data
        assert data.get("member_name") == INVESTOR_NAME
        assert "portal_name" in data
        print(f"Auth success - portal: {data.get('portal_name')}, member: {data.get('member_name')}")
    
    def test_auth_with_invalid_code(self):
        """Test login with invalid access code returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/auth",
            json={"name": INVESTOR_NAME, "access_code": "WRONGCOD"}
        )
        assert response.status_code == 401
        data = response.json()
        assert "Invalid access code" in str(data.get("detail", ""))
    
    def test_auth_with_wrong_name(self):
        """Test login with wrong name returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/auth",
            json={"name": "Wrong Person", "access_code": ACCESS_CODE}
        )
        assert response.status_code == 401
        data = response.json()
        assert "Name does not match" in str(data.get("detail", ""))
    
    def test_auth_with_nonexistent_portal(self):
        """Test login with non-existent portal returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/portal/00000000-0000-0000-0000-000000000000/auth",
            json={"name": INVESTOR_NAME, "access_code": ACCESS_CODE}
        )
        assert response.status_code == 404


class TestPortalDeals:
    """Portal deal browsing tests"""
    
    @pytest.fixture
    def session_token(self):
        """Get valid session token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/auth",
            json={"name": INVESTOR_NAME, "access_code": ACCESS_CODE}
        )
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Could not authenticate")
    
    def test_list_deals(self, session_token):
        """Test listing deals in portal"""
        response = requests.get(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/deals",
            headers={"X-Portal-Session": session_token}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "deals" in data
        assert "asset_types" in data
        print(f"Found {len(data['deals'])} deals, asset_types: {data['asset_types']}")
    
    def test_list_deals_without_session(self):
        """Test listing deals without session returns 401 or 422 (missing header)"""
        response = requests.get(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/deals"
        )
        assert response.status_code in [401, 422]  # 422 if header validation fails
    
    def test_get_deal_detail(self, session_token):
        """Test getting single deal details"""
        response = requests.get(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/deals/{DEAL_ID}",
            headers={"X-Portal-Session": session_token}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "deal" in data
        deal = data["deal"]
        assert deal.get("id") == DEAL_ID
        assert "title" in deal
        assert "asset_type" in deal
        assert "is_saved" in deal
        print(f"Deal: {deal.get('title')}, Asset Type: {deal.get('asset_type')}, Saved: {deal.get('is_saved')}")
    
    def test_get_deal_detail_without_session(self):
        """Test getting deal detail without session returns 401 or 422 (missing header)"""
        response = requests.get(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/deals/{DEAL_ID}"
        )
        assert response.status_code in [401, 422]  # 422 if header validation fails


class TestPortalSavedDeals:
    """Portal saved deals (watchlist) tests"""
    
    @pytest.fixture
    def session_token(self):
        """Get valid session token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/auth",
            json={"name": INVESTOR_NAME, "access_code": ACCESS_CODE}
        )
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Could not authenticate")
    
    def test_save_deal(self, session_token):
        """Test saving a deal to watchlist"""
        response = requests.post(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/saved/{DEAL_ID}",
            headers={"X-Portal-Session": session_token}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("Deal saved successfully")
    
    def test_list_saved_deals(self, session_token):
        """Test listing saved deals"""
        response = requests.get(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/saved",
            headers={"X-Portal-Session": session_token}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "deals" in data
        print(f"Found {len(data['deals'])} saved deals")
    
    def test_unsave_deal(self, session_token):
        """Test removing a deal from watchlist"""
        # First save it (in case not saved)
        requests.post(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/saved/{DEAL_ID}",
            headers={"X-Portal-Session": session_token}
        )
        
        # Now unsave
        response = requests.delete(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/saved/{DEAL_ID}",
            headers={"X-Portal-Session": session_token}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print("Deal unsaved successfully")
    
    def test_save_deal_without_session(self):
        """Test saving deal without session returns 401 or 422 (missing header)"""
        response = requests.post(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/saved/{DEAL_ID}"
        )
        assert response.status_code in [401, 422]  # 422 if header validation fails


class TestPortalNoEditCapabilities:
    """Verify portal has NO editing capabilities - read-only"""
    
    @pytest.fixture
    def session_token(self):
        """Get valid session token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/auth",
            json={"name": INVESTOR_NAME, "access_code": ACCESS_CODE}
        )
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Could not authenticate")
    
    def test_no_deal_update_endpoint(self, session_token):
        """Verify PUT to update deal is not allowed"""
        response = requests.put(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/deals/{DEAL_ID}",
            headers={"X-Portal-Session": session_token},
            json={"title": "Hacked Title"}
        )
        # Should return 405 Method Not Allowed or 404 Not Found
        assert response.status_code in [404, 405, 422]
        print(f"PUT deal returned {response.status_code} - correctly blocked")
    
    def test_no_deal_delete_endpoint(self, session_token):
        """Verify DELETE deal is not allowed"""
        response = requests.delete(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/deals/{DEAL_ID}",
            headers={"X-Portal-Session": session_token}
        )
        # Should return 405 Method Not Allowed or 404 Not Found
        assert response.status_code in [404, 405]
        print(f"DELETE deal returned {response.status_code} - correctly blocked")
    
    def test_no_deal_create_endpoint(self, session_token):
        """Verify POST to create deal is not allowed"""
        response = requests.post(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/deals",
            headers={"X-Portal-Session": session_token},
            json={"title": "Malicious Deal"}
        )
        # Should return 405 Method Not Allowed or 404 Not Found
        assert response.status_code in [404, 405, 422]
        print(f"POST create deal returned {response.status_code} - correctly blocked")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
