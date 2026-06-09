"""
Test file for DealLinked CRM - Deals and Contacts Fixes
Tests:
1. POST /api/deals - deals should default to private (team_id = null)
2. POST /api/contacts - contacts should save with correct field names
3. PUT /api/deals/{deal_id}/visibility - toggle deal visibility
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

# Get API URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')

# Test credentials from previous iteration
TEST_EMAIL = os.environ.get("TEST_EMAIL", "")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "")


class TestAuthHelper:
    """Helper class to get authentication token"""
    
    @staticmethod
    def get_auth_token():
        """Get auth token using Supabase auth"""
        auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        response = requests.post(
            auth_url,
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        print(f"Auth failed: {response.status_code} - {response.text}")
        return None


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    token = TestAuthHelper.get_auth_token()
    if not token:
        pytest.skip("Authentication failed - skipping tests")
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestDealsPrivateByDefault:
    """Test that deals are created as private (team_id = null) by default"""
    
    def test_create_deal_defaults_to_private(self, auth_headers):
        """POST /api/deals should create a deal with team_id = null"""
        # Create a test deal
        deal_data = {
            "title": f"TEST_Private_Deal_{uuid.uuid4().hex[:8]}",
            "address": "123 Test Street",
            "city": "Austin",
            "state": "TX",
            "asset_type": "Office",
            "asking_price": 1500000,
            "status": "active"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/deals",
            headers=auth_headers,
            json=deal_data
        )
        
        print(f"Create deal response: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        # Assert deal was created successfully
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("success") == True, "Expected success=True"
        assert "deal" in result, "Expected 'deal' in response"
        
        deal = result["deal"]
        deal_id = deal.get("id")
        
        # CRITICAL: Verify team_id is null (private by default)
        assert deal.get("team_id") is None, f"Expected team_id to be null (private), got: {deal.get('team_id')}"
        
        print(f"✓ Deal created with team_id = {deal.get('team_id')} (private by default)")
        
        # Cleanup: Delete the test deal
        if deal_id:
            delete_response = requests.delete(
                f"{BASE_URL}/api/deals/{deal_id}",
                headers=auth_headers
            )
            print(f"Cleanup: Deleted test deal, status: {delete_response.status_code}")
    
    def test_create_deal_without_pipeline_defaults_to_private(self, auth_headers):
        """Deal without explicit pipeline should still be private"""
        deal_data = {
            "title": f"TEST_NoPipeline_Deal_{uuid.uuid4().hex[:8]}",
            "address": "456 No Pipeline Ave",
            "city": "Houston",
            "state": "TX"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/deals",
            headers=auth_headers,
            json=deal_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        deal = result.get("deal", {})
        deal_id = deal.get("id")
        
        # Verify team_id is null
        assert deal.get("team_id") is None, f"Expected team_id to be null, got: {deal.get('team_id')}"
        
        print(f"✓ Deal without pipeline also has team_id = null")
        
        # Cleanup
        if deal_id:
            requests.delete(f"{BASE_URL}/api/deals/{deal_id}", headers=auth_headers)


class TestDealVisibilityToggle:
    """Test the deal visibility toggle endpoint"""
    
    def test_toggle_deal_visibility_to_team(self, auth_headers):
        """PUT /api/deals/{deal_id}/visibility should toggle visibility"""
        # First create a private deal
        deal_data = {
            "title": f"TEST_Visibility_Deal_{uuid.uuid4().hex[:8]}",
            "address": "789 Visibility Test Blvd",
            "city": "Dallas",
            "state": "TX"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/deals",
            headers=auth_headers,
            json=deal_data
        )
        
        assert create_response.status_code == 200
        deal = create_response.json().get("deal", {})
        deal_id = deal.get("id")
        
        # Verify it starts as private
        assert deal.get("team_id") is None, "Deal should start as private"
        
        # Toggle to shared with team
        visibility_response = requests.put(
            f"{BASE_URL}/api/deals/{deal_id}/visibility",
            headers=auth_headers,
            json={"shared_with_team": True}
        )
        
        print(f"Visibility toggle response: {visibility_response.status_code}")
        print(f"Response body: {visibility_response.text[:500]}")
        
        assert visibility_response.status_code == 200, f"Expected 200, got {visibility_response.status_code}"
        
        visibility_result = visibility_response.json()
        assert visibility_result.get("success") == True
        assert visibility_result.get("shared_with_team") == True
        
        # Note: team_id may be null if user is not part of a team
        # The important thing is the endpoint works
        print(f"✓ Visibility toggle to team works")
        
        # Toggle back to private
        private_response = requests.put(
            f"{BASE_URL}/api/deals/{deal_id}/visibility",
            headers=auth_headers,
            json={"shared_with_team": False}
        )
        
        assert private_response.status_code == 200
        private_result = private_response.json()
        assert private_result.get("shared_with_team") == False
        
        # Verify deal is now private again
        updated_deal = private_result.get("deal", {})
        assert updated_deal.get("team_id") is None, "Deal should be private after toggle"
        
        print(f"✓ Visibility toggle back to private works")
        
        # Cleanup
        if deal_id:
            requests.delete(f"{BASE_URL}/api/deals/{deal_id}", headers=auth_headers)


class TestContactsCreation:
    """Test that contacts are created with correct field names"""
    
    def test_create_contact_with_correct_fields(self, auth_headers):
        """POST /api/contacts should create contact with name, email, phone, company, contact_type, status, tag_ids, notes"""
        contact_data = {
            "name": f"TEST_Contact_{uuid.uuid4().hex[:8]}",
            "email": "testcontact@example.com",
            "phone": "(512) 555-1234",
            "company": "Test Company LLC",
            "contact_type": "Buyer",
            "status": "Active",
            "tag_ids": [],
            "notes": "Test contact created for API testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contacts",
            headers=auth_headers,
            json=contact_data
        )
        
        print(f"Create contact response: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("success") == True, "Expected success=True"
        assert "contact" in result, "Expected 'contact' in response"
        
        contact = result["contact"]
        contact_id = contact.get("id")
        
        # Verify all fields were saved correctly
        assert contact.get("name") == contact_data["name"], f"Name mismatch: {contact.get('name')}"
        assert contact.get("email") == contact_data["email"], f"Email mismatch: {contact.get('email')}"
        assert contact.get("phone") == contact_data["phone"], f"Phone mismatch: {contact.get('phone')}"
        assert contact.get("company") == contact_data["company"], f"Company mismatch: {contact.get('company')}"
        assert contact.get("contact_type") == contact_data["contact_type"], f"Contact type mismatch: {contact.get('contact_type')}"
        assert contact.get("status") == contact_data["status"], f"Status mismatch: {contact.get('status')}"
        assert contact.get("notes") == contact_data["notes"], f"Notes mismatch: {contact.get('notes')}"
        
        print(f"✓ Contact created successfully with all correct fields")
        
        # Cleanup
        if contact_id:
            delete_response = requests.delete(
                f"{BASE_URL}/api/contacts/{contact_id}",
                headers=auth_headers
            )
            print(f"Cleanup: Deleted test contact, status: {delete_response.status_code}")
    
    def test_create_contact_with_minimal_fields(self, auth_headers):
        """Contact should be created with just name (required field)"""
        contact_data = {
            "name": f"TEST_MinimalContact_{uuid.uuid4().hex[:8]}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contacts",
            headers=auth_headers,
            json=contact_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        contact = result.get("contact", {})
        contact_id = contact.get("id")
        
        # Verify defaults are applied
        assert contact.get("name") == contact_data["name"]
        assert contact.get("contact_type") == "Buyer", "Default contact_type should be Buyer"
        assert contact.get("status") == "Active", "Default status should be Active"
        
        print(f"✓ Contact created with minimal fields and correct defaults")
        
        # Cleanup
        if contact_id:
            requests.delete(f"{BASE_URL}/api/contacts/{contact_id}", headers=auth_headers)
    
    def test_create_contact_with_follow_up_dates(self, auth_headers):
        """Contact should accept last_follow_up and next_follow_up dates"""
        contact_data = {
            "name": f"TEST_DatesContact_{uuid.uuid4().hex[:8]}",
            "email": "dates@example.com",
            "last_follow_up": "2025-01-10T10:00:00Z",
            "next_follow_up": "2025-01-20T14:00:00Z"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contacts",
            headers=auth_headers,
            json=contact_data
        )
        
        print(f"Create contact with dates response: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        contact = result.get("contact", {})
        contact_id = contact.get("id")
        
        # Verify dates were saved
        assert contact.get("last_follow_up") is not None, "last_follow_up should be saved"
        assert contact.get("next_follow_up") is not None, "next_follow_up should be saved"
        
        print(f"✓ Contact created with follow-up dates")
        
        # Cleanup
        if contact_id:
            requests.delete(f"{BASE_URL}/api/contacts/{contact_id}", headers=auth_headers)


class TestContactsUpdate:
    """Test that contacts can be updated correctly"""
    
    def test_update_contact(self, auth_headers):
        """PUT /api/contacts/{contact_id} should update contact"""
        # First create a contact
        contact_data = {
            "name": f"TEST_UpdateContact_{uuid.uuid4().hex[:8]}",
            "email": "original@example.com",
            "company": "Original Company"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/contacts",
            headers=auth_headers,
            json=contact_data
        )
        
        assert create_response.status_code == 200
        contact = create_response.json().get("contact", {})
        contact_id = contact.get("id")
        
        # Update the contact
        update_data = {
            "name": "Updated Name",
            "email": "updated@example.com",
            "company": "Updated Company",
            "contact_type": "Seller",
            "status": "Lead"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/contacts/{contact_id}",
            headers=auth_headers,
            json=update_data
        )
        
        print(f"Update contact response: {update_response.status_code}")
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        result = update_response.json()
        updated_contact = result.get("contact", {})
        
        # Verify updates
        assert updated_contact.get("name") == update_data["name"]
        assert updated_contact.get("email") == update_data["email"]
        assert updated_contact.get("company") == update_data["company"]
        assert updated_contact.get("contact_type") == update_data["contact_type"]
        assert updated_contact.get("status") == update_data["status"]
        
        print(f"✓ Contact updated successfully")
        
        # Cleanup
        if contact_id:
            requests.delete(f"{BASE_URL}/api/contacts/{contact_id}", headers=auth_headers)


class TestContactsGet:
    """Test fetching contacts"""
    
    def test_list_contacts(self, auth_headers):
        """GET /api/contacts should return list of contacts"""
        response = requests.get(
            f"{BASE_URL}/api/contacts",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        result = response.json()
        assert result.get("success") == True
        assert "contacts" in result
        assert "count" in result
        
        print(f"✓ List contacts works, found {result.get('count')} contacts")
    
    def test_get_single_contact(self, auth_headers):
        """GET /api/contacts/{contact_id} should return contact details"""
        # First create a contact
        contact_data = {
            "name": f"TEST_GetContact_{uuid.uuid4().hex[:8]}",
            "email": "gettest@example.com"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/contacts",
            headers=auth_headers,
            json=contact_data
        )
        
        assert create_response.status_code == 200
        contact = create_response.json().get("contact", {})
        contact_id = contact.get("id")
        
        # Get the contact
        get_response = requests.get(
            f"{BASE_URL}/api/contacts/{contact_id}",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        
        result = get_response.json()
        fetched_contact = result.get("contact", {})
        
        assert fetched_contact.get("id") == contact_id
        assert fetched_contact.get("name") == contact_data["name"]
        
        print(f"✓ Get single contact works")
        
        # Cleanup
        if contact_id:
            requests.delete(f"{BASE_URL}/api/contacts/{contact_id}", headers=auth_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
