"""
DealLinked CRM V2 - Calendar API Tests
Tests for calendar event CRUD operations via V2 API
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials - will be created during test
TEST_EMAIL = f"calendar_test_{uuid.uuid4().hex[:8]}@testdeallinked.com"
TEST_PASSWORD = os.environ.get("TEST_DEFAULT_PASSWORD", "TestPassword123!")


class TestCalendarAPI:
    """Calendar API endpoint tests"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        """Shared requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def auth_token(self, api_client):
        """Create test user and get authentication token"""
        # First try to signup
        signup_response = api_client.post(f"{BASE_URL}/api/auth/signup", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": "Calendar Test User"
        })
        
        if signup_response.status_code in [200, 201]:
            data = signup_response.json()
            # Token is at root level, not in session object
            if data.get("success") and data.get("access_token"):
                print(f"Created test user: {TEST_EMAIL}")
                return data["access_token"]
        
        # If signup fails, try login
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            # Token is at root level, not in session object
            if data.get("success") and data.get("access_token"):
                return data["access_token"]
        
        pytest.skip(f"Authentication failed - signup: {signup_response.status_code}, login: {login_response.status_code if 'login_response' in dir() else 'N/A'}")
    
    @pytest.fixture(scope="class")
    def authenticated_client(self, api_client, auth_token):
        """Session with auth header"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        return api_client
    
    # ============================================================================
    # GET /api/calendar/events - List Events
    # ============================================================================
    
    def test_list_events_without_auth(self, api_client):
        """Test that listing events requires authentication"""
        # Remove auth header if present
        headers = {"Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/calendar/events", headers=headers)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: List events requires authentication")
    
    def test_list_events_with_auth(self, authenticated_client):
        """Test listing events with valid authentication"""
        response = authenticated_client.get(f"{BASE_URL}/api/calendar/events")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        assert "events" in data, "Response should contain events array"
        assert isinstance(data["events"], list), "Events should be a list"
        print(f"PASS: List events returned {len(data['events'])} events")
    
    def test_list_events_with_date_filter(self, authenticated_client):
        """Test listing events with date filters"""
        start_date = datetime.utcnow().isoformat()
        end_date = (datetime.utcnow() + timedelta(days=30)).isoformat()
        
        response = authenticated_client.get(
            f"{BASE_URL}/api/calendar/events",
            params={"start_date": start_date, "end_date": end_date}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        print("PASS: List events with date filter works")
    
    # ============================================================================
    # POST /api/calendar/events - Create Event
    # ============================================================================
    
    def test_create_event_success(self, authenticated_client):
        """Test creating a new calendar event"""
        event_data = {
            "title": "TEST_Calendar Meeting",
            "description": "Test event created by pytest",
            "start_time": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
            "end_time": (datetime.utcnow() + timedelta(hours=2)).isoformat(),
            "all_day": False,
            "event_type": "meeting",
            "color": "#f97316"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/calendar/events",
            json=event_data
        )
        
        # Check status code
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got: {data}"
        assert "event" in data, "Response should contain event object"
        
        # Verify event data
        event = data["event"]
        assert event["title"] == event_data["title"], "Title should match"
        assert event["event_type"] == event_data["event_type"], "Event type should match"
        assert "id" in event, "Event should have an ID"
        
        # Store event ID for later tests
        TestCalendarAPI.created_event_id = event["id"]
        print(f"PASS: Created event with ID: {event['id']}")
    
    def test_create_event_without_title(self, authenticated_client):
        """Test that creating event without title fails"""
        event_data = {
            "description": "Event without title",
            "start_time": datetime.utcnow().isoformat()
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/calendar/events",
            json=event_data
        )
        
        # Should fail validation
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("PASS: Create event without title fails validation")
    
    def test_create_event_all_day(self, authenticated_client):
        """Test creating an all-day event"""
        event_data = {
            "title": "TEST_All Day Event",
            "start_time": datetime.utcnow().isoformat(),
            "all_day": True,
            "event_type": "deadline"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/calendar/events",
            json=event_data
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data["event"]["all_day"] == True, "Event should be marked as all-day"
        
        # Store for cleanup
        TestCalendarAPI.all_day_event_id = data["event"]["id"]
        print(f"PASS: Created all-day event with ID: {data['event']['id']}")
    
    # ============================================================================
    # GET /api/calendar/events/{id} - Get Single Event
    # ============================================================================
    
    def test_get_event_by_id(self, authenticated_client):
        """Test getting a specific event by ID"""
        event_id = getattr(TestCalendarAPI, 'created_event_id', None)
        if not event_id:
            pytest.skip("No event ID available from previous test")
        
        response = authenticated_client.get(f"{BASE_URL}/api/calendar/events/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data["event"]["id"] == event_id
        print(f"PASS: Retrieved event by ID: {event_id}")
    
    def test_get_nonexistent_event(self, authenticated_client):
        """Test getting a non-existent event returns 404"""
        fake_id = str(uuid.uuid4())
        response = authenticated_client.get(f"{BASE_URL}/api/calendar/events/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Non-existent event returns 404")
    
    # ============================================================================
    # PUT /api/calendar/events/{id} - Update Event
    # ============================================================================
    
    def test_update_event_title(self, authenticated_client):
        """Test updating an event's title"""
        event_id = getattr(TestCalendarAPI, 'created_event_id', None)
        if not event_id:
            pytest.skip("No event ID available from previous test")
        
        update_data = {
            "title": "TEST_Updated Meeting Title"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/calendar/events/{event_id}",
            json=update_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Verify update persisted
        get_response = authenticated_client.get(f"{BASE_URL}/api/calendar/events/{event_id}")
        assert get_response.status_code == 200
        assert get_response.json()["event"]["title"] == update_data["title"]
        print("PASS: Event title updated successfully")
    
    def test_update_event_type(self, authenticated_client):
        """Test updating an event's type"""
        event_id = getattr(TestCalendarAPI, 'created_event_id', None)
        if not event_id:
            pytest.skip("No event ID available from previous test")
        
        update_data = {
            "event_type": "call"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/calendar/events/{event_id}",
            json=update_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify update persisted
        get_response = authenticated_client.get(f"{BASE_URL}/api/calendar/events/{event_id}")
        assert get_response.json()["event"]["event_type"] == "call"
        print("PASS: Event type updated successfully")
    
    def test_update_event_times(self, authenticated_client):
        """Test updating event start and end times"""
        event_id = getattr(TestCalendarAPI, 'created_event_id', None)
        if not event_id:
            pytest.skip("No event ID available from previous test")
        
        new_start = (datetime.utcnow() + timedelta(days=1)).isoformat()
        new_end = (datetime.utcnow() + timedelta(days=1, hours=2)).isoformat()
        
        update_data = {
            "start_time": new_start,
            "end_time": new_end
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/calendar/events/{event_id}",
            json=update_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Event times updated successfully")
    
    def test_update_nonexistent_event(self, authenticated_client):
        """Test updating a non-existent event returns 404"""
        fake_id = str(uuid.uuid4())
        response = authenticated_client.put(
            f"{BASE_URL}/api/calendar/events/{fake_id}",
            json={"title": "Should fail"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Update non-existent event returns 404")
    
    # ============================================================================
    # DELETE /api/calendar/events/{id} - Delete Event
    # ============================================================================
    
    def test_delete_event(self, authenticated_client):
        """Test deleting an event"""
        event_id = getattr(TestCalendarAPI, 'all_day_event_id', None)
        if not event_id:
            pytest.skip("No all-day event ID available from previous test")
        
        response = authenticated_client.delete(f"{BASE_URL}/api/calendar/events/{event_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Verify deletion - should return 404
        get_response = authenticated_client.get(f"{BASE_URL}/api/calendar/events/{event_id}")
        assert get_response.status_code == 404, "Deleted event should return 404"
        print(f"PASS: Event {event_id} deleted successfully")
    
    def test_delete_nonexistent_event(self, authenticated_client):
        """Test deleting a non-existent event returns 404"""
        fake_id = str(uuid.uuid4())
        response = authenticated_client.delete(f"{BASE_URL}/api/calendar/events/{fake_id}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Delete non-existent event returns 404")
    
    # ============================================================================
    # GET /api/calendar/events/upcoming - Upcoming Events
    # ============================================================================
    
    def test_get_upcoming_events(self, authenticated_client):
        """Test getting upcoming events"""
        response = authenticated_client.get(f"{BASE_URL}/api/calendar/events/upcoming")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "events" in data
        print(f"PASS: Retrieved {len(data['events'])} upcoming events")
    
    def test_get_upcoming_events_with_params(self, authenticated_client):
        """Test getting upcoming events with custom parameters"""
        response = authenticated_client.get(
            f"{BASE_URL}/api/calendar/events/upcoming",
            params={"days": 14, "limit": 5}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True
        assert len(data["events"]) <= 5, "Should respect limit parameter"
        print("PASS: Upcoming events with custom params works")
    
    # ============================================================================
    # Cleanup - Delete remaining test events
    # ============================================================================
    
    def test_cleanup_test_events(self, authenticated_client):
        """Cleanup: Delete remaining test events"""
        event_id = getattr(TestCalendarAPI, 'created_event_id', None)
        if event_id:
            response = authenticated_client.delete(f"{BASE_URL}/api/calendar/events/{event_id}")
            if response.status_code == 200:
                print(f"Cleaned up event: {event_id}")
        print("PASS: Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
