"""
Backend API Tests for CRE CRM Backlog Features
Tests: Deal Activity, Asset Types, Admin Approval Signup, Calendar Recurrence
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test IDs
TEST_USER_ID = "8fba389e-9353-4592-bce9-92a6ca59337c"
TEST_EMAIL = f"test_backlog_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint working")


class TestDealActivityAPI:
    """Tests for Deal Activity endpoints (without auth - expect 403)"""
    
    def test_get_activity_requires_auth(self):
        """GET /api/deals/{deal_id}/activity should return 403 without auth"""
        response = requests.get(f"{BASE_URL}/api/deals/test-deal-id/activity")
        assert response.status_code == 403
        print("✓ GET /api/deals/{deal_id}/activity returns 403 without auth")
    
    def test_create_activity_requires_auth(self):
        """POST /api/deals/{deal_id}/activity should return 403 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/deals/test-deal-id/activity",
            json={"action": "comment", "description": "Test comment"}
        )
        assert response.status_code == 403
        print("✓ POST /api/deals/{deal_id}/activity returns 403 without auth")


class TestAssetTypesAPI:
    """Tests for Asset Types CRUD endpoints (without auth - expect 403)"""
    
    def test_get_asset_types_requires_auth(self):
        """GET /api/asset-types should return 403 without auth"""
        response = requests.get(f"{BASE_URL}/api/asset-types")
        assert response.status_code == 403
        print("✓ GET /api/asset-types returns 403 without auth")
    
    def test_create_asset_type_requires_auth(self):
        """POST /api/asset-types should return 403 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/asset-types",
            json={"name": "TEST_Asset_Type", "color": "#ff0000"}
        )
        assert response.status_code == 403
        print("✓ POST /api/asset-types returns 403 without auth")
    
    def test_update_asset_type_requires_auth(self):
        """PUT /api/asset-types/{id} should return 403 without auth"""
        response = requests.put(
            f"{BASE_URL}/api/asset-types/test-id",
            json={"name": "Updated Type"}
        )
        assert response.status_code == 403
        print("✓ PUT /api/asset-types/{id} returns 403 without auth")
    
    def test_delete_asset_type_requires_auth(self):
        """DELETE /api/asset-types/{id} should return 403 without auth"""
        response = requests.delete(f"{BASE_URL}/api/asset-types/test-id")
        assert response.status_code == 403
        print("✓ DELETE /api/asset-types/{id} returns 403 without auth")


class TestSignupRequestAPI:
    """Tests for Admin Approval Signup system"""
    
    def test_signup_creates_request_not_user(self):
        """POST /api/auth/signup should create a signup request (not direct user)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={
                "email": TEST_EMAIL,
                "password": "TestPass123!",
                "full_name": "Test User Backlog"
            }
        )
        # Should return success with message about pending review
        # OR 400 if email already exists
        assert response.status_code in [200, 400]
        data = response.json()
        
        if response.status_code == 200:
            assert data.get("success") == True
            assert "request" in data.get("message", "").lower() or "submitted" in data.get("message", "").lower()
            print(f"✓ POST /api/auth/signup creates signup request, message: {data.get('message')}")
        else:
            # Email already registered or request already pending
            print(f"✓ POST /api/auth/signup properly handles duplicate: {data.get('detail')}")
    
    def test_get_signup_requests_requires_auth(self):
        """GET /api/auth/signup-requests should return 403 without auth"""
        response = requests.get(f"{BASE_URL}/api/auth/signup-requests")
        assert response.status_code == 403
        print("✓ GET /api/auth/signup-requests returns 403 without auth")
    
    def test_review_signup_request_requires_auth(self):
        """POST /api/auth/signup-requests/review should return 403 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/auth/signup-requests/review",
            json={"request_id": "test-id", "action": "approve"}
        )
        assert response.status_code == 403
        print("✓ POST /api/auth/signup-requests/review returns 403 without auth")


class TestCalendarRecurrenceAPI:
    """Tests for Calendar event recurrence fields"""
    
    def test_create_event_requires_auth(self):
        """POST /api/calendar/events should return 403 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/calendar/events",
            json={
                "title": "TEST_Recurring Event",
                "start_time": datetime.now().isoformat(),
                "recurrence_rule": "weekly",
                "recurrence_end": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            }
        )
        assert response.status_code == 403
        print("✓ POST /api/calendar/events returns 403 without auth")
    
    def test_get_events_requires_auth(self):
        """GET /api/calendar/events should return 403 without auth"""
        response = requests.get(f"{BASE_URL}/api/calendar/events")
        assert response.status_code == 403
        print("✓ GET /api/calendar/events returns 403 without auth")


class TestPipelineAPI:
    """Tests for Pipeline endpoints (color options verification)"""
    
    def test_pipelines_endpoint_requires_auth(self):
        """GET /api/pipelines should return 403 without auth"""
        response = requests.get(f"{BASE_URL}/api/pipelines")
        assert response.status_code == 403
        print("✓ GET /api/pipelines returns 403 without auth")


class TestLoginEndpoint:
    """Tests for login endpoint"""
    
    def test_login_with_invalid_credentials(self):
        """POST /api/auth/login should return 401 for invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✓ POST /api/auth/login returns 401 for invalid credentials")


# ============================================================================
# Tests requiring authentication - using service key for direct DB access
# ============================================================================

class TestDirectDBAccess:
    """Tests using direct Supabase access via service key"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup Supabase client with service key"""
        import httpx
        self.supabase_url = os.environ.get('SUPABASE_URL', '')
        self.service_key = os.environ.get('SUPABASE_SERVICE_KEY', '')
        self.headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json"
        }
    
    def test_deal_activity_table_exists(self):
        """Verify deal_activity table exists in Supabase"""
        import httpx
        
        # Query the deal_activity table
        response = httpx.get(
            f"{self.supabase_url}/rest/v1/deal_activity?limit=1",
            headers=self.headers,
            timeout=10
        )
        
        # Table exists if we get 200 (even empty)
        assert response.status_code == 200, f"deal_activity table not found: {response.text}"
        print("✓ deal_activity table exists in Supabase")
    
    def test_asset_types_table_exists(self):
        """Verify asset_types table exists in Supabase"""
        import httpx
        
        response = httpx.get(
            f"{self.supabase_url}/rest/v1/asset_types?limit=1",
            headers=self.headers,
            timeout=10
        )
        
        assert response.status_code == 200, f"asset_types table not found: {response.text}"
        print("✓ asset_types table exists in Supabase")
    
    def test_signup_requests_table_exists(self):
        """Verify signup_requests table exists in Supabase"""
        import httpx
        
        response = httpx.get(
            f"{self.supabase_url}/rest/v1/signup_requests?limit=1",
            headers=self.headers,
            timeout=10
        )
        
        assert response.status_code == 200, f"signup_requests table not found: {response.text}"
        print("✓ signup_requests table exists in Supabase")
    
    def test_calendar_events_has_recurrence_columns(self):
        """Verify calendar_events table has recurrence columns"""
        import httpx
        
        # Query with recurrence fields
        response = httpx.get(
            f"{self.supabase_url}/rest/v1/calendar_events?select=id,recurrence_rule,recurrence_end&limit=1",
            headers=self.headers,
            timeout=10
        )
        
        # If columns don't exist, we'd get 400 with column error
        assert response.status_code == 200, f"calendar_events missing recurrence columns: {response.text}"
        print("✓ calendar_events table has recurrence_rule and recurrence_end columns")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
