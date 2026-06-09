"""
Test Portal Deal Detail and Public Share - Notes field and Layout changes
Tests:
1. Portal deal endpoint returns notes field
2. Share endpoint returns notes field
3. SAFE_DEAL_FIELDS includes notes
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = os.environ.get("TEST_EMAIL", "")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "")
PORTAL_ID = "6f7293a2-154f-40f4-ac39-95feb97c14b8"
DEAL_ID_WITH_NOTES = "311c9958-64fd-4eae-a3f1-543b43c9c0af"
PORTAL_DEAL_ID = "786febb3-0978-47f2-b69d-c49d92cde5c9"
INVESTOR_NAME = "Test Investor"
ACCESS_CODE = "CT4MQ4DT"


class TestShareEndpoint:
    """Test public share endpoint returns notes"""
    
    def test_share_endpoint_returns_notes(self):
        """GET /api/share/{deal_id} should return notes field"""
        response = requests.get(f"{BASE_URL}/api/share/{DEAL_ID_WITH_NOTES}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "deal" in data
        
        deal = data["deal"]
        # Verify notes field is present in response
        assert "notes" in deal, "notes field should be in share response"
        # This deal has notes
        assert deal["notes"] == "Great downtown location"
        print(f"PASS: Share endpoint returns notes: {deal['notes']}")


class TestPortalEndpoints:
    """Test portal endpoints return notes field"""
    
    @pytest.fixture
    def portal_session(self):
        """Authenticate to portal and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/auth",
            json={"name": INVESTOR_NAME, "access_code": ACCESS_CODE}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        return data["session_token"]
    
    def test_portal_deals_list_returns_notes(self, portal_session):
        """GET /api/portal/{portal_id}/deals should return notes field"""
        response = requests.get(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/deals",
            headers={"X-Portal-Session": portal_session}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "deals" in data
        
        # Check that deals have notes field
        for deal in data["deals"]:
            assert "notes" in deal, f"notes field should be in deal {deal.get('id')}"
        
        print(f"PASS: Portal deals list returns notes field for {len(data['deals'])} deals")
    
    def test_portal_deal_detail_returns_notes(self, portal_session):
        """GET /api/portal/{portal_id}/deals/{deal_id} should return notes field"""
        response = requests.get(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/deals/{PORTAL_DEAL_ID}",
            headers={"X-Portal-Session": portal_session}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "deal" in data
        
        deal = data["deal"]
        # Verify notes field is present
        assert "notes" in deal, "notes field should be in portal deal detail response"
        
        # Verify other expected fields are present
        assert "agent" in deal, "agent field should be in portal deal detail"
        assert "documents" in deal, "documents field should be in portal deal detail"
        assert "is_saved" in deal, "is_saved field should be in portal deal detail"
        
        print(f"PASS: Portal deal detail returns notes: {deal.get('notes')}")
    
    def test_portal_deal_detail_has_agent_info(self, portal_session):
        """Portal deal detail should include agent information"""
        response = requests.get(
            f"{BASE_URL}/api/portal/{PORTAL_ID}/deals/{PORTAL_DEAL_ID}",
            headers={"X-Portal-Session": portal_session}
        )
        assert response.status_code == 200
        
        data = response.json()
        deal = data["deal"]
        
        # Verify agent info
        assert "agent" in deal
        agent = deal["agent"]
        assert "full_name" in agent
        assert "email" in agent
        
        print(f"PASS: Portal deal has agent: {agent.get('full_name')} ({agent.get('email')})")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Health endpoint should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
