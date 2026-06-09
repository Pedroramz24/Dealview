"""
DealLinked CRM V2 - Contacts API Tests
Tests for: Contacts CRUD and Smart Tags endpoints
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials - use existing test account pattern
TEST_EMAIL = f"contacts_test_{uuid.uuid4().hex[:6]}@testdeallinked.com"
TEST_PASSWORD = os.environ.get("TEST_DEFAULT_PASSWORD", "TestPassword123!")
TEST_FULL_NAME = "Contacts Test User"


class TestContactsAPI:
    """Contacts endpoint tests"""
    
    @pytest.fixture(scope="class")
    def auth_data(self):
        """Get auth token for tests"""
        data = {"token": None, "user_id": None, "tag_id": None, "contact_id": None}
        
        # First try to signup
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": TEST_FULL_NAME
        })
        
        print(f"Signup response: {signup_response.status_code}")
        
        if signup_response.status_code in [200, 201]:
            signup_data = signup_response.json()
            if signup_data.get("access_token"):
                data["token"] = signup_data["access_token"]
                data["user_id"] = signup_data.get("user", {}).get("id")
                print(f"✓ Signup successful, got token")
                return data
        
        # If signup fails, try login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            data["token"] = login_data.get("access_token")
            data["user_id"] = login_data.get("user", {}).get("id")
            print(f"✓ Login successful, got token")
        else:
            print(f"⚠ Could not authenticate: {login_response.status_code}")
        
        return data
    
    # ============================================================================
    # TAG TESTS
    # ============================================================================
    
    def test_list_tags_empty(self, auth_data):
        """Test listing tags when none exist"""
        if not auth_data.get("token"):
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/tags",
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        print(f"List tags response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "tags" in data
        assert "count" in data
        print(f"✓ List tags successful: {data['count']} tags found")
    
    def test_create_tag(self, auth_data):
        """Test creating a new tag"""
        if not auth_data.get("token"):
            pytest.skip("No auth token available")
        
        tag_data = {
            "name": f"TEST_Tag_{uuid.uuid4().hex[:6]}",
            "color": "#ff5733"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contacts/tags",
            headers={
                "Authorization": f"Bearer {auth_data['token']}",
                "Content-Type": "application/json"
            },
            json=tag_data
        )
        
        print(f"Create tag response: {response.status_code}")
        
        if response.status_code == 500:
            print(f"⚠ Server error: {response.text}")
            pytest.fail(f"Server error creating tag: {response.text}")
        
        assert response.status_code in [200, 201]
        
        data = response.json()
        assert data.get("success") == True
        assert "tag" in data
        assert data["tag"]["name"] == tag_data["name"]
        assert data["tag"]["color"] == tag_data["color"]
        
        auth_data["tag_id"] = data["tag"]["id"]
        print(f"✓ Created tag: {data['tag']['name']} (ID: {data['tag']['id']})")
    
    def test_list_tags_after_create(self, auth_data):
        """Test listing tags after creating one"""
        if not auth_data.get("token"):
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/tags",
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data["count"] >= 1
        print(f"✓ Tags list now has {data['count']} tag(s)")
    
    def test_update_tag(self, auth_data):
        """Test updating a tag"""
        if not auth_data.get("token") or not auth_data.get("tag_id"):
            pytest.skip("No auth token or tag_id available")
        
        update_data = {
            "name": f"TEST_Updated_Tag_{uuid.uuid4().hex[:4]}",
            "color": "#00ff00"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/contacts/tags/{auth_data['tag_id']}",
            headers={
                "Authorization": f"Bearer {auth_data['token']}",
                "Content-Type": "application/json"
            },
            json=update_data
        )
        
        print(f"Update tag response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data["tag"]["name"] == update_data["name"]
        print(f"✓ Updated tag to: {data['tag']['name']}")
    
    # ============================================================================
    # CONTACT TESTS
    # ============================================================================
    
    def test_list_contacts_empty(self, auth_data):
        """Test listing contacts when none exist"""
        if not auth_data.get("token"):
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/contacts",
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        print(f"List contacts response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "contacts" in data
        assert "count" in data
        print(f"✓ List contacts successful: {data['count']} contacts found")
    
    def test_create_contact(self, auth_data):
        """Test creating a new contact"""
        if not auth_data.get("token"):
            pytest.skip("No auth token available")
        
        contact_data = {
            "name": f"TEST_Contact_{uuid.uuid4().hex[:6]}",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "phone": "(555) 123-4567",
            "company": "Test Company Inc",
            "contact_type": "Buyer",
            "status": "Active",
            "tag_ids": [auth_data.get("tag_id")] if auth_data.get("tag_id") else [],
            "notes": "Test contact created by automated tests"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contacts",
            headers={
                "Authorization": f"Bearer {auth_data['token']}",
                "Content-Type": "application/json"
            },
            json=contact_data
        )
        
        print(f"Create contact response: {response.status_code}")
        
        if response.status_code == 500:
            print(f"⚠ Server error: {response.text}")
            pytest.fail(f"Server error creating contact: {response.text}")
        
        assert response.status_code in [200, 201]
        
        data = response.json()
        assert data.get("success") == True
        assert "contact" in data
        assert data["contact"]["name"] == contact_data["name"]
        assert data["contact"]["email"] == contact_data["email"]
        assert data["contact"]["contact_type"] == contact_data["contact_type"]
        assert data["contact"]["status"] == contact_data["status"]
        
        auth_data["contact_id"] = data["contact"]["id"]
        print(f"✓ Created contact: {data['contact']['name']} (ID: {data['contact']['id']})")
    
    def test_create_contact_minimal(self, auth_data):
        """Test creating a contact with minimal data (only name)"""
        if not auth_data.get("token"):
            pytest.skip("No auth token available")
        
        contact_data = {
            "name": f"TEST_MinimalContact_{uuid.uuid4().hex[:6]}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contacts",
            headers={
                "Authorization": f"Bearer {auth_data['token']}",
                "Content-Type": "application/json"
            },
            json=contact_data
        )
        
        print(f"Create minimal contact response: {response.status_code}")
        assert response.status_code in [200, 201]
        
        data = response.json()
        assert data.get("success") == True
        assert data["contact"]["name"] == contact_data["name"]
        assert data["contact"]["contact_type"] == "Buyer"  # Default value
        assert data["contact"]["status"] == "Active"  # Default value
        print(f"✓ Created minimal contact with defaults applied")
    
    def test_list_contacts_after_create(self, auth_data):
        """Test listing contacts after creating some"""
        if not auth_data.get("token"):
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/contacts",
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data["count"] >= 2  # We created 2 contacts
        
        # Verify contacts have linked_deals_count field
        for contact in data["contacts"]:
            assert "linked_deals_count" in contact
        
        print(f"✓ Contacts list now has {data['count']} contact(s)")
    
    def test_get_contact_details(self, auth_data):
        """Test getting a specific contact with details"""
        if not auth_data.get("token") or not auth_data.get("contact_id"):
            pytest.skip("No auth token or contact_id available")
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/{auth_data['contact_id']}",
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        print(f"Get contact response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert "contact" in data
        
        contact = data["contact"]
        assert contact["id"] == auth_data["contact_id"]
        assert "linked_deals" in contact  # Should have linked_deals array
        assert "tags" in contact  # Should have tags array
        
        print(f"✓ Got contact details: {contact['name']}")
        print(f"  - Linked deals: {len(contact.get('linked_deals', []))}")
        print(f"  - Tags: {len(contact.get('tags', []))}")
    
    def test_update_contact(self, auth_data):
        """Test updating a contact"""
        if not auth_data.get("token") or not auth_data.get("contact_id"):
            pytest.skip("No auth token or contact_id available")
        
        update_data = {
            "name": f"TEST_Updated_Contact_{uuid.uuid4().hex[:4]}",
            "company": "Updated Company LLC",
            "contact_type": "Seller",
            "status": "Lead"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/contacts/{auth_data['contact_id']}",
            headers={
                "Authorization": f"Bearer {auth_data['token']}",
                "Content-Type": "application/json"
            },
            json=update_data
        )
        
        print(f"Update contact response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data["contact"]["name"] == update_data["name"]
        assert data["contact"]["company"] == update_data["company"]
        assert data["contact"]["contact_type"] == update_data["contact_type"]
        assert data["contact"]["status"] == update_data["status"]
        
        print(f"✓ Updated contact: {data['contact']['name']}")
    
    def test_filter_contacts_by_type(self, auth_data):
        """Test filtering contacts by contact_type"""
        if not auth_data.get("token"):
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/contacts",
            params={"contact_type": "Seller"},
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        print(f"Filter by type response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        # All returned contacts should be Sellers
        for contact in data["contacts"]:
            assert contact["contact_type"] == "Seller"
        
        print(f"✓ Filtered contacts by type: {data['count']} Seller(s) found")
    
    def test_filter_contacts_by_status(self, auth_data):
        """Test filtering contacts by status"""
        if not auth_data.get("token"):
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/contacts",
            params={"status": "Lead"},
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        print(f"Filter by status response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        # All returned contacts should have Lead status
        for contact in data["contacts"]:
            assert contact["status"] == "Lead"
        
        print(f"✓ Filtered contacts by status: {data['count']} Lead(s) found")
    
    def test_filter_contacts_by_tag(self, auth_data):
        """Test filtering contacts by tag_id"""
        if not auth_data.get("token") or not auth_data.get("tag_id"):
            pytest.skip("No auth token or tag_id available")
        
        response = requests.get(
            f"{BASE_URL}/api/contacts",
            params={"tag_id": auth_data["tag_id"]},
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        print(f"Filter by tag response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        # All returned contacts should have the tag
        for contact in data["contacts"]:
            assert auth_data["tag_id"] in contact.get("tag_ids", [])
        
        print(f"✓ Filtered contacts by tag: {data['count']} contact(s) found")
    
    def test_search_contacts(self, auth_data):
        """Test searching contacts by name/email/company"""
        if not auth_data.get("token"):
            pytest.skip("No auth token available")
        
        response = requests.get(
            f"{BASE_URL}/api/contacts",
            params={"search": "TEST_"},
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        print(f"Search contacts response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        
        # Should find our test contacts
        assert data["count"] >= 1
        print(f"✓ Search found {data['count']} contact(s) matching 'TEST_'")
    
    # ============================================================================
    # CLEANUP TESTS (run last)
    # ============================================================================
    
    def test_delete_contact(self, auth_data):
        """Test deleting a contact"""
        if not auth_data.get("token") or not auth_data.get("contact_id"):
            pytest.skip("No auth token or contact_id available")
        
        response = requests.delete(
            f"{BASE_URL}/api/contacts/{auth_data['contact_id']}",
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        print(f"Delete contact response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Deleted contact")
        
        # Verify contact is gone
        verify_response = requests.get(
            f"{BASE_URL}/api/contacts/{auth_data['contact_id']}",
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        assert verify_response.status_code == 404
        print(f"✓ Verified contact no longer exists")
    
    def test_delete_tag(self, auth_data):
        """Test deleting a tag"""
        if not auth_data.get("token") or not auth_data.get("tag_id"):
            pytest.skip("No auth token or tag_id available")
        
        response = requests.delete(
            f"{BASE_URL}/api/contacts/tags/{auth_data['tag_id']}",
            headers={"Authorization": f"Bearer {auth_data['token']}"}
        )
        
        print(f"Delete tag response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Deleted tag")


class TestContactsEdgeCases:
    """Edge case tests for Contacts API"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        # Try to login with existing test user
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def test_create_contact_without_name(self, auth_token):
        """Test creating a contact without required name field"""
        if not auth_token:
            pytest.skip("No auth token available")
        
        response = requests.post(
            f"{BASE_URL}/api/contacts",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"email": "test@example.com"}  # Missing name
        )
        
        print(f"Create contact without name response: {response.status_code}")
        # Should fail validation
        assert response.status_code == 422  # Validation error
        print(f"✓ Correctly rejected contact without name")
    
    def test_get_nonexistent_contact(self, auth_token):
        """Test getting a contact that doesn't exist"""
        if not auth_token:
            pytest.skip("No auth token available")
        
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/contacts/{fake_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        print(f"Get nonexistent contact response: {response.status_code}")
        assert response.status_code == 404
        print(f"✓ Correctly returned 404 for nonexistent contact")
    
    def test_update_nonexistent_contact(self, auth_token):
        """Test updating a contact that doesn't exist"""
        if not auth_token:
            pytest.skip("No auth token available")
        
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{BASE_URL}/api/contacts/{fake_id}",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json={"name": "Updated Name"}
        )
        
        print(f"Update nonexistent contact response: {response.status_code}")
        assert response.status_code == 404
        print(f"✓ Correctly returned 404 for nonexistent contact")
    
    def test_delete_nonexistent_contact(self, auth_token):
        """Test deleting a contact that doesn't exist"""
        if not auth_token:
            pytest.skip("No auth token available")
        
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/contacts/{fake_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        print(f"Delete nonexistent contact response: {response.status_code}")
        assert response.status_code == 404
        print(f"✓ Correctly returned 404 for nonexistent contact")
    
    def test_unauthorized_access(self):
        """Test accessing contacts without auth token"""
        response = requests.get(f"{BASE_URL}/api/contacts")
        
        print(f"Unauthorized access response: {response.status_code}")
        assert response.status_code in [401, 403]
        print(f"✓ Correctly rejected unauthorized access")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
