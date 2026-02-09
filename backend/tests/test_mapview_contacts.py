"""
Tests for MapView Contact Management Feature
- Create contact from side panel (POST /api/contacts)
- Link contact to deal (POST /api/deals/{deal_id}/contacts/{contact_id})
- Unlink contact from deal (DELETE /api/deals/{deal_id}/contacts/{contact_id})
- List all contacts (GET /api/contacts)
- Get deal with linked contacts (GET /api/deals/{deal_id})
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestMapViewContacts:
    """Test suite for MapView side panel contact management"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testfix@example.com",
            "password": "TestPass123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]

    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers for requests"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

    @pytest.fixture(scope="class")
    def test_deal(self, headers):
        """Get existing test deal or create one with location for map view"""
        # First check if there's an existing deal with location
        response = requests.get(f"{BASE_URL}/api/deals?has_location=true", headers=headers)
        assert response.status_code == 200
        deals = response.json().get("deals", [])
        
        if deals:
            return deals[0]  # Use existing deal
        
        # Create a test deal with location
        deal_data = {
            "title": f"TEST_MapView_Deal_{uuid.uuid4().hex[:8]}",
            "address": "123 Test St",
            "city": "San Antonio",
            "state": "TX",
            "zip_code": "78201",
            "latitude": 29.4241,
            "longitude": -98.4936,
            "asset_type": "Office"
        }
        response = requests.post(f"{BASE_URL}/api/deals", json=deal_data, headers=headers)
        assert response.status_code == 200, f"Failed to create test deal: {response.text}"
        return response.json().get("deal")

    # =========================================================================
    # TEST: GET /api/contacts - List all contacts for user
    # =========================================================================
    def test_list_contacts(self, headers):
        """GET /api/contacts should return all user contacts"""
        response = requests.get(f"{BASE_URL}/api/contacts", headers=headers)
        
        assert response.status_code == 200, f"List contacts failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "success" in data
        assert data["success"] is True
        assert "contacts" in data
        assert "count" in data
        assert isinstance(data["contacts"], list)
        
        # If contacts exist, validate structure
        if data["contacts"]:
            contact = data["contacts"][0]
            assert "id" in contact
            assert "name" in contact
            assert "owner_id" in contact
        
        print(f"PASS: GET /api/contacts - Found {data['count']} contacts")

    # =========================================================================
    # TEST: POST /api/contacts - Create a new contact
    # =========================================================================
    def test_create_contact(self, headers):
        """POST /api/contacts should create a new contact"""
        unique_id = uuid.uuid4().hex[:8]
        contact_data = {
            "name": f"TEST_Contact_{unique_id}",
            "email": f"testcontact_{unique_id}@example.com",
            "phone": "555-123-4567",
            "contact_type": "Buyer"
        }
        
        response = requests.post(f"{BASE_URL}/api/contacts", json=contact_data, headers=headers)
        
        assert response.status_code == 200, f"Create contact failed: {response.text}"
        data = response.json()
        
        # Validate response
        assert "success" in data
        assert data["success"] is True
        assert "contact" in data
        
        created_contact = data["contact"]
        assert created_contact["name"] == contact_data["name"]
        assert created_contact["email"] == contact_data["email"]
        assert created_contact["phone"] == contact_data["phone"]
        assert created_contact["contact_type"] == contact_data["contact_type"]
        assert "id" in created_contact
        
        print(f"PASS: POST /api/contacts - Created contact {created_contact['id']}")
        return created_contact

    # =========================================================================
    # TEST: Create contact with all contact types
    # =========================================================================
    @pytest.mark.parametrize("contact_type", ["Buyer", "Seller", "Broker", "Landlord", "Tenant", "Other"])
    def test_create_contact_with_type(self, headers, contact_type):
        """POST /api/contacts should accept all contact types"""
        unique_id = uuid.uuid4().hex[:6]
        contact_data = {
            "name": f"TEST_{contact_type}_{unique_id}",
            "contact_type": contact_type
        }
        
        response = requests.post(f"{BASE_URL}/api/contacts", json=contact_data, headers=headers)
        
        assert response.status_code == 200, f"Create {contact_type} contact failed: {response.text}"
        data = response.json()
        
        assert data["success"] is True
        assert data["contact"]["contact_type"] == contact_type
        
        print(f"PASS: Created contact with type '{contact_type}'")

    # =========================================================================
    # TEST: POST /api/deals/{deal_id}/contacts/{contact_id} - Link contact
    # =========================================================================
    def test_link_contact_to_deal(self, headers, test_deal):
        """POST /api/deals/{deal_id}/contacts/{contact_id} should link contact to deal"""
        # First create a new contact
        unique_id = uuid.uuid4().hex[:8]
        contact_data = {
            "name": f"TEST_LinkContact_{unique_id}",
            "email": f"link_{unique_id}@example.com",
            "contact_type": "Buyer"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/contacts", json=contact_data, headers=headers)
        assert create_response.status_code == 200
        contact = create_response.json()["contact"]
        contact_id = contact["id"]
        deal_id = test_deal["id"]
        
        # Link contact to deal
        link_response = requests.post(
            f"{BASE_URL}/api/deals/{deal_id}/contacts/{contact_id}",
            headers=headers
        )
        
        assert link_response.status_code == 200, f"Link contact failed: {link_response.text}"
        data = link_response.json()
        
        assert "success" in data
        assert data["success"] is True
        
        print(f"PASS: Linked contact {contact_id} to deal {deal_id}")
        
        # Verify by getting deal details
        deal_response = requests.get(f"{BASE_URL}/api/deals/{deal_id}", headers=headers)
        assert deal_response.status_code == 200
        deal_data = deal_response.json()["deal"]
        
        # Check contact_deal_links exists and has the contact
        links = deal_data.get("contact_deal_links", [])
        linked_contact_ids = [link.get("contacts", {}).get("id") for link in links if link.get("contacts")]
        assert contact_id in linked_contact_ids, f"Contact not found in deal's linked contacts"
        
        print(f"PASS: Verified contact {contact_id} is in deal's contact_deal_links")
        return {"contact_id": contact_id, "deal_id": deal_id}

    # =========================================================================
    # TEST: DELETE /api/deals/{deal_id}/contacts/{contact_id} - Unlink contact
    # =========================================================================
    def test_unlink_contact_from_deal(self, headers, test_deal):
        """DELETE /api/deals/{deal_id}/contacts/{contact_id} should unlink contact (not delete it)"""
        # Create and link a contact first
        unique_id = uuid.uuid4().hex[:8]
        contact_data = {
            "name": f"TEST_UnlinkContact_{unique_id}",
            "contact_type": "Seller"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/contacts", json=contact_data, headers=headers)
        assert create_response.status_code == 200
        contact = create_response.json()["contact"]
        contact_id = contact["id"]
        deal_id = test_deal["id"]
        
        # Link it
        link_response = requests.post(
            f"{BASE_URL}/api/deals/{deal_id}/contacts/{contact_id}",
            headers=headers
        )
        assert link_response.status_code == 200
        
        # Now unlink it
        unlink_response = requests.delete(
            f"{BASE_URL}/api/deals/{deal_id}/contacts/{contact_id}",
            headers=headers
        )
        
        assert unlink_response.status_code == 200, f"Unlink contact failed: {unlink_response.text}"
        data = unlink_response.json()
        
        assert "success" in data
        assert data["success"] is True
        
        print(f"PASS: Unlinked contact {contact_id} from deal {deal_id}")
        
        # Verify contact still exists (unlink doesn't delete)
        contact_response = requests.get(f"{BASE_URL}/api/contacts/{contact_id}", headers=headers)
        assert contact_response.status_code == 200, "Contact was deleted instead of unlinked!"
        
        # Verify contact is no longer in deal's links
        deal_response = requests.get(f"{BASE_URL}/api/deals/{deal_id}", headers=headers)
        assert deal_response.status_code == 200
        deal_data = deal_response.json()["deal"]
        
        links = deal_data.get("contact_deal_links", [])
        linked_contact_ids = [link.get("contacts", {}).get("id") for link in links if link.get("contacts")]
        assert contact_id not in linked_contact_ids, "Contact still linked after unlink!"
        
        print(f"PASS: Contact {contact_id} exists but is no longer linked to deal")

    # =========================================================================
    # TEST: GET /api/deals/{deal_id} - Get deal with linked contacts
    # =========================================================================
    def test_get_deal_with_contacts(self, headers, test_deal):
        """GET /api/deals/{deal_id} should return deal with contact_deal_links"""
        deal_id = test_deal["id"]
        
        response = requests.get(f"{BASE_URL}/api/deals/{deal_id}", headers=headers)
        
        assert response.status_code == 200, f"Get deal failed: {response.text}"
        data = response.json()
        
        assert "success" in data
        assert data["success"] is True
        assert "deal" in data
        
        deal = data["deal"]
        assert "id" in deal
        assert deal["id"] == deal_id
        
        # contact_deal_links should be present (may be empty array)
        assert "contact_deal_links" in deal, "deal missing contact_deal_links field"
        assert isinstance(deal["contact_deal_links"], list)
        
        print(f"PASS: GET /api/deals/{deal_id} - Deal has contact_deal_links array")

    # =========================================================================
    # TEST: Create & Link flow (as used in UI)
    # =========================================================================
    def test_create_and_link_contact_flow(self, headers, test_deal):
        """Test the complete Create & Link flow used in MapView side panel"""
        deal_id = test_deal["id"]
        unique_id = uuid.uuid4().hex[:8]
        
        # Step 1: Create contact (as done by handleCreateAndLinkContact)
        contact_data = {
            "name": f"TEST_CreateLink_{unique_id}",
            "email": f"createlink_{unique_id}@test.com",
            "phone": "512-555-0001",
            "contact_type": "Broker"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/contacts", json=contact_data, headers=headers)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        
        contact_id = create_response.json()["contact"]["id"]
        assert contact_id, "No contact ID returned"
        
        # Step 2: Link contact to deal
        link_response = requests.post(
            f"{BASE_URL}/api/deals/{deal_id}/contacts/{contact_id}",
            headers=headers
        )
        assert link_response.status_code == 200, f"Link failed: {link_response.text}"
        
        # Step 3: Verify by fetching deal (as done by handleMarkerClick)
        deal_response = requests.get(f"{BASE_URL}/api/deals/{deal_id}", headers=headers)
        assert deal_response.status_code == 200
        
        deal = deal_response.json()["deal"]
        links = deal.get("contact_deal_links", [])
        
        # Extract contacts from links
        linked_contacts = [
            link.get("contacts") for link in links if link.get("contacts")
        ]
        
        # Find our contact
        our_contact = next((c for c in linked_contacts if c and c.get("id") == contact_id), None)
        assert our_contact, f"Contact {contact_id} not found in deal's linked contacts"
        
        # Verify contact data
        assert our_contact["name"] == contact_data["name"]
        assert our_contact["email"] == contact_data["email"]
        assert our_contact["contact_type"] == contact_data["contact_type"]
        
        print(f"PASS: Complete Create & Link flow - Contact {contact_id} linked to deal {deal_id}")

    # =========================================================================
    # TEST: Search contacts filter
    # =========================================================================
    def test_contacts_search(self, headers):
        """GET /api/contacts?search=xxx should filter contacts"""
        # Create contact with unique name
        unique_name = f"SearchTest_{uuid.uuid4().hex[:8]}"
        contact_data = {
            "name": unique_name,
            "email": f"{unique_name.lower()}@test.com"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/contacts", json=contact_data, headers=headers)
        assert create_response.status_code == 200
        
        # Search for it
        search_response = requests.get(
            f"{BASE_URL}/api/contacts?search={unique_name[:10]}",
            headers=headers
        )
        assert search_response.status_code == 200
        
        results = search_response.json().get("contacts", [])
        matching = [c for c in results if unique_name in c.get("name", "")]
        
        assert len(matching) > 0, "Search did not find the contact"
        print(f"PASS: Contact search found '{unique_name}'")


class TestMapViewContactsEdgeCases:
    """Edge case tests for contact management"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testfix@example.com",
            "password": "TestPass123!"
        })
        return response.json()["access_token"]

    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

    def test_create_contact_minimal_fields(self, headers):
        """Contact should be created with just name"""
        contact_data = {"name": f"MinimalContact_{uuid.uuid4().hex[:6]}"}
        
        response = requests.post(f"{BASE_URL}/api/contacts", json=contact_data, headers=headers)
        
        assert response.status_code == 200
        assert response.json()["success"] is True
        print("PASS: Contact created with minimal fields (name only)")

    def test_link_nonexistent_contact(self, headers):
        """Linking non-existent contact should return error"""
        fake_contact_id = str(uuid.uuid4())
        
        # Get a real deal
        deals_response = requests.get(f"{BASE_URL}/api/deals?has_location=true", headers=headers)
        deals = deals_response.json().get("deals", [])
        
        if not deals:
            pytest.skip("No deals available for test")
        
        deal_id = deals[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/deals/{deal_id}/contacts/{fake_contact_id}",
            headers=headers
        )
        
        # Should return 404 or error
        assert response.status_code in [404, 400, 500], f"Expected error but got {response.status_code}"
        print(f"PASS: Linking non-existent contact returns error ({response.status_code})")

    def test_link_same_contact_twice(self, headers):
        """Linking same contact twice should be idempotent"""
        # Create contact
        contact_data = {"name": f"DuplicateLink_{uuid.uuid4().hex[:6]}", "contact_type": "Buyer"}
        create_response = requests.post(f"{BASE_URL}/api/contacts", json=contact_data, headers=headers)
        contact_id = create_response.json()["contact"]["id"]
        
        # Get a deal
        deals_response = requests.get(f"{BASE_URL}/api/deals?has_location=true", headers=headers)
        deals = deals_response.json().get("deals", [])
        
        if not deals:
            pytest.skip("No deals available for test")
        
        deal_id = deals[0]["id"]
        
        # Link once
        response1 = requests.post(
            f"{BASE_URL}/api/deals/{deal_id}/contacts/{contact_id}",
            headers=headers
        )
        assert response1.status_code == 200
        
        # Link again (should not fail, uses upsert)
        response2 = requests.post(
            f"{BASE_URL}/api/deals/{deal_id}/contacts/{contact_id}",
            headers=headers
        )
        assert response2.status_code == 200
        
        print("PASS: Linking same contact twice is idempotent (uses upsert)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
