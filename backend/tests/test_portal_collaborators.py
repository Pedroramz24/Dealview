"""
Test Portal Collaborators Feature
Tests for the new portal team collaboration feature:
- GET /api/portals/{portal_id}/collaborators — list collaborators
- POST /api/portals/{portal_id}/collaborators — add collaborator
- DELETE /api/portals/{portal_id}/collaborators/{user_id} — remove collaborator
- GET /api/portals — should return both owned and shared portals
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPortalCollaboratorsAPI:
    """Test portal collaborators endpoints"""
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"Health check: {response.status_code}")
        assert response.status_code == 200
    
    def test_list_collaborators_requires_auth(self):
        """GET /api/portals/{portal_id}/collaborators requires authentication"""
        # Use a fake portal ID
        portal_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(f"{BASE_URL}/api/portals/{portal_id}/collaborators")
        print(f"List collaborators without auth: {response.status_code}")
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403, 422]
    
    def test_add_collaborator_requires_auth(self):
        """POST /api/portals/{portal_id}/collaborators requires authentication"""
        portal_id = "00000000-0000-0000-0000-000000000000"
        response = requests.post(
            f"{BASE_URL}/api/portals/{portal_id}/collaborators",
            json={"user_id": "test-user-id", "role": "manager"}
        )
        print(f"Add collaborator without auth: {response.status_code}")
        assert response.status_code in [401, 403, 422]
    
    def test_remove_collaborator_requires_auth(self):
        """DELETE /api/portals/{portal_id}/collaborators/{user_id} requires authentication"""
        portal_id = "00000000-0000-0000-0000-000000000000"
        user_id = "test-user-id"
        response = requests.delete(f"{BASE_URL}/api/portals/{portal_id}/collaborators/{user_id}")
        print(f"Remove collaborator without auth: {response.status_code}")
        assert response.status_code in [401, 403, 422]
    
    def test_list_portals_requires_auth(self):
        """GET /api/portals requires authentication"""
        response = requests.get(f"{BASE_URL}/api/portals")
        print(f"List portals without auth: {response.status_code}")
        assert response.status_code in [401, 403, 422]
    
    def test_teams_members_requires_auth(self):
        """GET /api/teams/members requires authentication"""
        response = requests.get(f"{BASE_URL}/api/teams/members")
        print(f"List team members without auth: {response.status_code}")
        assert response.status_code in [401, 403, 422]


class TestDealsDeleteAPI:
    """Test deals delete endpoint (bug fix verification)"""
    
    def test_delete_deal_requires_auth(self):
        """DELETE /api/deals/{deal_id} requires authentication"""
        deal_id = "00000000-0000-0000-0000-000000000000"
        response = requests.delete(f"{BASE_URL}/api/deals/{deal_id}")
        print(f"Delete deal without auth: {response.status_code}")
        assert response.status_code in [401, 403, 422]
    
    def test_delete_deal_endpoint_exists(self):
        """Verify DELETE /api/deals/{deal_id} endpoint exists"""
        # This should return 401/403 (auth required) not 404 (endpoint not found)
        deal_id = "00000000-0000-0000-0000-000000000000"
        response = requests.delete(f"{BASE_URL}/api/deals/{deal_id}")
        print(f"Delete deal endpoint check: {response.status_code}")
        # 404 would mean endpoint doesn't exist, 401/403/422 means it exists but needs auth
        assert response.status_code != 404, "DELETE /api/deals/{deal_id} endpoint should exist"


class TestPortalEndpointsExist:
    """Verify all new portal collaborator endpoints exist"""
    
    def test_collaborators_list_endpoint_exists(self):
        """GET /api/portals/{portal_id}/collaborators endpoint exists"""
        portal_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(f"{BASE_URL}/api/portals/{portal_id}/collaborators")
        print(f"Collaborators list endpoint: {response.status_code}")
        # Should not be 404 (endpoint not found)
        assert response.status_code != 404, "GET /api/portals/{portal_id}/collaborators should exist"
    
    def test_collaborators_add_endpoint_exists(self):
        """POST /api/portals/{portal_id}/collaborators endpoint exists"""
        portal_id = "00000000-0000-0000-0000-000000000000"
        response = requests.post(
            f"{BASE_URL}/api/portals/{portal_id}/collaborators",
            json={"user_id": "test", "role": "manager"}
        )
        print(f"Collaborators add endpoint: {response.status_code}")
        assert response.status_code != 404, "POST /api/portals/{portal_id}/collaborators should exist"
    
    def test_collaborators_remove_endpoint_exists(self):
        """DELETE /api/portals/{portal_id}/collaborators/{user_id} endpoint exists"""
        portal_id = "00000000-0000-0000-0000-000000000000"
        user_id = "test-user"
        response = requests.delete(f"{BASE_URL}/api/portals/{portal_id}/collaborators/{user_id}")
        print(f"Collaborators remove endpoint: {response.status_code}")
        assert response.status_code != 404, "DELETE /api/portals/{portal_id}/collaborators/{user_id} should exist"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
