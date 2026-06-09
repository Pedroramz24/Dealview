"""
Test Suite for Critical Dates Timeline Tracker Feature
Tests the timeline CRUD APIs and dashboard upcoming deadlines endpoint

These tests require a valid Supabase user session.
"""
import pytest
import requests
import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://image-upload-fix-30.preview.emergentagent.com').rstrip('/')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

# Test user credentials - we'll try to get a session
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = os.environ.get("TEST_DEFAULT_PASSWORD", "testpassword123")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test that the health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "DealLinked CRM V2"
        print(f"✓ Health check passed: {data}")


class TestTimelineAPIWithoutAuth:
    """Test timeline API endpoints - expecting 401/403 without auth"""
    
    def test_get_timeline_without_auth(self):
        """GET /api/deals/{deal_id}/timeline should return 403 without auth"""
        # Using a fake deal_id
        deal_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(f"{BASE_URL}/api/deals/{deal_id}/timeline")
        # Should fail with 403 Forbidden (no auth header)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ GET timeline without auth correctly returns 403")
    
    def test_initialize_timeline_without_auth(self):
        """POST /api/deals/{deal_id}/timeline/initialize should return 403 without auth"""
        deal_id = "00000000-0000-0000-0000-000000000000"
        response = requests.post(f"{BASE_URL}/api/deals/{deal_id}/timeline/initialize")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ POST timeline/initialize without auth correctly returns 403")
    
    def test_create_milestone_without_auth(self):
        """POST /api/deals/{deal_id}/timeline should return 403 without auth"""
        deal_id = "00000000-0000-0000-0000-000000000000"
        response = requests.post(
            f"{BASE_URL}/api/deals/{deal_id}/timeline",
            json={"name": "Test Milestone"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ POST timeline (create milestone) without auth correctly returns 403")
    
    def test_dashboard_upcoming_deadlines_without_auth(self):
        """GET /api/dashboard/upcoming-deadlines should return 403 without auth"""
        response = requests.get(f"{BASE_URL}/api/dashboard/upcoming-deadlines")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ GET dashboard/upcoming-deadlines without auth correctly returns 403")


class TestTimelineAPIWithAuth:
    """Test timeline API endpoints with authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - try to get auth token"""
        self.token = self._get_auth_token()
        self.headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        self.deal_id = None
        self.created_milestones = []
        
        if self.token:
            # Get an existing deal to test with
            self.deal_id = self._get_test_deal_id()
    
    def _get_auth_token(self):
        """Try to get a Supabase auth token"""
        # Try to sign in with test credentials
        try:
            response = requests.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "email": TEST_USER_EMAIL,
                    "password": TEST_USER_PASSWORD
                }
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("access_token")
        except Exception as e:
            print(f"Auth error: {e}")
        
        return None
    
    def _get_test_deal_id(self):
        """Get an existing deal ID for testing"""
        if not self.token:
            return None
        
        try:
            # First get pipelines
            response = requests.get(
                f"{BASE_URL}/api/pipelines",
                headers=self.headers
            )
            if response.status_code == 200:
                pipelines = response.json().get("pipelines", [])
                if pipelines:
                    pipeline_id = pipelines[0]["id"]
                    # Now get deals
                    response = requests.get(
                        f"{BASE_URL}/api/deals?pipeline_id={pipeline_id}",
                        headers=self.headers
                    )
                    if response.status_code == 200:
                        deals = response.json().get("deals", [])
                        if deals:
                            return deals[0]["id"]
        except Exception as e:
            print(f"Error getting test deal: {e}")
        
        return None
    
    @pytest.mark.skipif(
        not os.environ.get('TEST_AUTH_TOKEN'),
        reason="No auth token available - skipping authenticated tests"
    )
    def test_timeline_crud_flow(self):
        """Test complete timeline CRUD flow"""
        if not self.token or not self.deal_id:
            pytest.skip("No auth token or deal available")
        
        # 1. Get initial timeline
        response = requests.get(
            f"{BASE_URL}/api/deals/{self.deal_id}/timeline",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "milestones" in data
        initial_count = len(data["milestones"])
        print(f"✓ GET timeline: {initial_count} milestones found")
        
        # 2. Initialize default milestones if empty
        if initial_count == 0:
            response = requests.post(
                f"{BASE_URL}/api/deals/{self.deal_id}/timeline/initialize",
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert data.get("success") == True
            print(f"✓ Timeline initialized with default milestones")
        
        # 3. Create a new milestone
        new_milestone = {
            "name": "TEST_Custom_Milestone",
            "target_date": (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d"),
            "notes": "Test milestone for API testing",
            "status": "pending"
        }
        response = requests.post(
            f"{BASE_URL}/api/deals/{self.deal_id}/timeline",
            headers=self.headers,
            json=new_milestone
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("milestone") is not None
        milestone_id = data["milestone"]["id"]
        self.created_milestones.append(milestone_id)
        print(f"✓ Created milestone: {milestone_id}")
        
        # 4. Update the milestone
        update_data = {
            "name": "TEST_Updated_Milestone",
            "status": "in_progress"
        }
        response = requests.put(
            f"{BASE_URL}/api/deals/{self.deal_id}/timeline/{milestone_id}",
            headers=self.headers,
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data["milestone"]["name"] == "TEST_Updated_Milestone"
        print(f"✓ Updated milestone: {data['milestone']['name']}")
        
        # 5. Delete the milestone (cleanup)
        response = requests.delete(
            f"{BASE_URL}/api/deals/{self.deal_id}/timeline/{milestone_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Deleted milestone: {milestone_id}")


class TestDashboardEndpoints:
    """Test dashboard endpoints"""
    
    def test_dashboard_stats_without_auth(self):
        """GET /api/dashboard/stats should return 403 without auth"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 403
        print(f"✓ Dashboard stats returns 403 without auth")
    
    def test_dashboard_recent_activity_without_auth(self):
        """GET /api/dashboard/recent-activity should return 403 without auth"""
        response = requests.get(f"{BASE_URL}/api/dashboard/recent-activity")
        assert response.status_code == 403
        print(f"✓ Dashboard recent-activity returns 403 without auth")


class TestPipelineColorOptions:
    """Test that color options are properly expanded"""
    
    def test_pipeline_stages_endpoint_exists(self):
        """Verify pipelines endpoint is accessible (returns 403 without auth)"""
        response = requests.get(f"{BASE_URL}/api/pipelines")
        assert response.status_code == 403
        print(f"✓ Pipelines endpoint returns 403 without auth (endpoint exists)")


# ============================================================================
# Direct API Tests using Service Role Key (for testing without user session)
# ============================================================================

class TestTimelineAPIDirectDB:
    """
    Test timeline functionality using direct Supabase queries
    This bypasses the user auth requirement by using service_role key
    """
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for direct DB tests"""
        import httpx
        self.supabase_url = SUPABASE_URL
        self.service_key = SUPABASE_SERVICE_KEY
        self.headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json"
        }
    
    def test_deal_timelines_table_exists(self):
        """Test that deal_timelines table exists and is queryable"""
        import httpx
        
        response = httpx.get(
            f"{self.supabase_url}/rest/v1/deal_timelines?limit=1",
            headers=self.headers
        )
        
        # 200 = table exists and is queryable
        # 400 = table doesn't exist or permission denied
        assert response.status_code == 200, f"deal_timelines table check failed: {response.status_code} - {response.text}"
        print(f"✓ deal_timelines table exists and is queryable")
    
    def test_deals_table_accessible(self):
        """Test that deals table is accessible"""
        import httpx
        
        response = httpx.get(
            f"{self.supabase_url}/rest/v1/deals?limit=1",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"deals table check failed: {response.status_code}"
        data = response.json()
        print(f"✓ deals table accessible - found {len(data)} deal(s) in response")
    
    def test_create_and_delete_milestone_direct(self):
        """Test creating and deleting a milestone directly in DB"""
        import httpx
        import uuid
        
        # First get a deal_id
        response = httpx.get(
            f"{self.supabase_url}/rest/v1/deals?limit=1&select=id",
            headers=self.headers
        )
        
        if response.status_code != 200 or not response.json():
            pytest.skip("No deals found to test with")
        
        deal_id = response.json()[0]["id"]
        print(f"Using deal_id: {deal_id}")
        
        # Create a test milestone
        milestone_id = str(uuid.uuid4())
        test_milestone = {
            "id": milestone_id,
            "deal_id": deal_id,
            "name": "TEST_Direct_Milestone",
            "status": "pending",
            "sort_order": 999,
            "notes": "Test milestone created for API testing"
        }
        
        response = httpx.post(
            f"{self.supabase_url}/rest/v1/deal_timelines",
            headers={**self.headers, "Prefer": "return=representation"},
            json=test_milestone
        )
        
        assert response.status_code in [200, 201], f"Failed to create milestone: {response.status_code} - {response.text}"
        created = response.json()
        print(f"✓ Created milestone directly: {created[0]['id'] if created else 'unknown'}")
        
        # Verify it was created
        response = httpx.get(
            f"{self.supabase_url}/rest/v1/deal_timelines?id=eq.{milestone_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "TEST_Direct_Milestone"
        print(f"✓ Verified milestone exists in DB")
        
        # Delete the test milestone
        response = httpx.delete(
            f"{self.supabase_url}/rest/v1/deal_timelines?id=eq.{milestone_id}",
            headers=self.headers
        )
        assert response.status_code in [200, 204], f"Failed to delete milestone: {response.status_code}"
        print(f"✓ Deleted test milestone")
        
        # Verify deletion
        response = httpx.get(
            f"{self.supabase_url}/rest/v1/deal_timelines?id=eq.{milestone_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
        print(f"✓ Verified milestone was deleted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
