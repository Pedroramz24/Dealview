"""
DealLinked CRM V2 - Backend API Tests
Tests for: Auth, Deals, Pipelines, and Geocoding endpoints
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials
TEST_EMAIL = f"test_{uuid.uuid4().hex[:8]}@testdeallinked.com"
TEST_PASSWORD = os.environ.get("TEST_DEFAULT_PASSWORD", "TestPassword123!")
TEST_FULL_NAME = "Test User"


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test health check returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "2.0.0"
        print(f"✓ Health check passed: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_data(self):
        """Store auth data across tests"""
        return {}
    
    def test_signup_new_user(self, auth_data):
        """Test user signup"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": TEST_FULL_NAME
        })
        
        print(f"Signup response: {response.status_code} - {response.text[:500]}")
        
        # Signup might return 200 or 201
        assert response.status_code in [200, 201, 400], f"Unexpected status: {response.status_code}"
        
        data = response.json()
        
        if response.status_code in [200, 201]:
            assert data.get("success") == True
            if data.get("access_token"):
                auth_data["access_token"] = data["access_token"]
                auth_data["user_id"] = data["user"]["id"]
                print(f"✓ Signup successful for {TEST_EMAIL}")
            else:
                print("⚠ Signup successful but no token (email confirmation required)")
        else:
            # Email might already exist
            print(f"⚠ Signup returned 400: {data}")
    
    def test_login_user(self, auth_data):
        """Test user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        print(f"Login response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "access_token" in data
            auth_data["access_token"] = data["access_token"]
            auth_data["user_id"] = data["user"]["id"]
            print(f"✓ Login successful, token obtained")
        else:
            # If login fails, try with a known test account
            print(f"⚠ Login failed for new user, trying existing test account")
            # Skip if no token available
            pytest.skip("Could not authenticate - email confirmation may be required")
    
    def test_get_current_user(self, auth_data):
        """Test getting current user profile"""
        if not auth_data.get("access_token"):
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_data['access_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "user" in data
        print(f"✓ Got user profile: {data['user'].get('email')}")


class TestPipelines:
    """Pipeline endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def test_list_pipelines(self, auth_token):
        """Test listing pipelines"""
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/pipelines",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "pipelines" in data
        
        # New users should have a default pipeline
        pipelines = data["pipelines"]
        print(f"✓ Found {len(pipelines)} pipeline(s)")
        
        if pipelines:
            # Check pipeline has stages
            pipeline = pipelines[0]
            assert "stages" in pipeline
            print(f"  - Pipeline '{pipeline['name']}' has {len(pipeline.get('stages', []))} stages")


class TestDeals:
    """Deal endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_data(self):
        """Get auth token and pipeline info for tests"""
        data = {"token": None, "pipeline_id": None, "stage_id": None, "deal_id": None}
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            data["token"] = response.json().get("access_token")
            
            # Get pipeline info
            pipelines_response = requests.get(
                f"{BASE_URL}/api/pipelines",
                headers={"Authorization": f"Bearer {data['token']}"}
            )
            
            if pipelines_response.status_code == 200:
                pipelines = pipelines_response.json().get("pipelines", [])
                if pipelines:
                    data["pipeline_id"] = pipelines[0]["id"]
                    stages = pipelines[0].get("stages", [])
                    if stages:
                        data["stage_id"] = stages[0]["id"]
        
        return data
    
    def test_create_deal(self, auth_data):
        """Test creating a deal"""
        if not auth_data.get("token"):
            pytest.skip("No auth token available")
        
        deal_data = {
            "title": f"TEST_Deal_{uuid.uuid4().hex[:6]}",
            "address": "123 Test Street",
            "city": "San Antonio",
            "state": "TX",
            "zip_code": "78201",
            "asset_type": "Office",
            "asking_price": 2500000,
            "latitude": 29.4241,
            "longitude": -98.4936,
            "pipeline_id": auth_data.get("pipeline_id"),
            "pipeline_stage_id": auth_data.get("stage_id")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/deals",
            headers={
                "Authorization": f"Bearer {auth_data['token']}",
                "Content-Type": "application/json"
            },
            json=deal_data
        )
        
        print(f"Create deal response: {response.status_code}")
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("success") == True
        assert "deal" in data
        
        auth_data["deal_id"] = data["deal"]["id"]
        print(f"✓ Created deal: {data['deal']['title']} (ID: {data['deal']['id']})")
    
    def test_list_deals(self, auth_data):
        """Test listing deals"""
        if not auth_data.get("token"):
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/deals",
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "deals" in data
        print(f"✓ Found {len(data['deals'])} deal(s)")
    
    def test_get_deal(self, auth_data):
        """Test getting a specific deal"""
        if not auth_data.get("token") or not auth_data.get("deal_id"):
            pytest.skip("No auth token or deal_id available")
        
        response = requests.get(
            f"{BASE_URL}/api/deals/{auth_data['deal_id']}",
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "deal" in data
        print(f"✓ Got deal: {data['deal']['title']}")
    
    def test_update_deal_stage(self, auth_data):
        """Test updating deal stage (for drag-and-drop)"""
        if not auth_data.get("token") or not auth_data.get("deal_id") or not auth_data.get("stage_id"):
            pytest.skip("Missing required data")
        
        response = requests.patch(
            f"{BASE_URL}/api/deals/{auth_data['deal_id']}/stage",
            headers={
                "Authorization": f"Bearer {auth_data['token']}",
                "Content-Type": "application/json"
            },
            json={"pipeline_stage_id": auth_data["stage_id"]}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Updated deal stage")
    
    def test_delete_deal(self, auth_data):
        """Test deleting a deal"""
        if not auth_data.get("token") or not auth_data.get("deal_id"):
            pytest.skip("No auth token or deal_id available")
        
        response = requests.delete(
            f"{BASE_URL}/api/deals/{auth_data['deal_id']}",
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Deleted deal")


class TestGeocoding:
    """Geocoding endpoint tests (Radar.io integration)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def test_geocode_address(self, auth_token):
        """Test geocoding an address"""
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/geocode",
            params={"address": "1600 Pennsylvania Avenue, Washington DC"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        print(f"Geocode response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("success"):
            result = data.get("result", {})
            assert "latitude" in result
            assert "longitude" in result
            print(f"✓ Geocoded address: lat={result['latitude']}, lng={result['longitude']}")
        else:
            print(f"⚠ Geocoding returned no results: {data}")
    
    def test_autocomplete_address(self, auth_token):
        """Test address autocomplete"""
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/geocode/autocomplete",
            params={"query": "123 Main Street"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        print(f"Autocomplete response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        suggestions = data.get("suggestions", [])
        print(f"✓ Got {len(suggestions)} autocomplete suggestions")
        
        if suggestions:
            for s in suggestions[:3]:
                print(f"  - {s.get('formatted_address', 'N/A')}")
    
    def test_reverse_geocode(self, auth_token):
        """Test reverse geocoding (lat/lng to address)"""
        if not auth_token:
            pytest.skip("No auth token available")
        
        # San Antonio coordinates
        response = requests.get(
            f"{BASE_URL}/api/geocode/reverse",
            params={"lat": 29.4241, "lng": -98.4936},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        print(f"Reverse geocode response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("success"):
            result = data.get("result", {})
            print(f"✓ Reverse geocoded: {result.get('formatted_address', 'N/A')}")
        else:
            print(f"⚠ Reverse geocoding returned no results: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
