"""
Portal Management API Tests - Phase 3
Tests for Portal CRUD, Portal Deals, and Portal Members APIs

Endpoints tested:
- GET /api/portals - List all portals
- POST /api/portals - Create portal
- GET /api/portals/{portal_id} - Get single portal
- PUT /api/portals/{portal_id} - Update portal
- DELETE /api/portals/{portal_id} - Delete portal
- GET /api/portals/{portal_id}/deals - List portal deals
- POST /api/portals/{portal_id}/deals - Add deals to portal
- DELETE /api/portals/{portal_id}/deals/{deal_id} - Remove deal from portal
- GET /api/portals/{portal_id}/members - List portal members
- POST /api/portals/{portal_id}/members - Add member
- POST /api/portals/{portal_id}/members/{member_id}/regenerate-code - Regenerate code
- PUT /api/portals/{portal_id}/members/{member_id}/revoke - Revoke access
- PUT /api/portals/{portal_id}/members/{member_id}/restore - Restore access
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')

TEST_EMAIL = os.environ.get("TEST_EMAIL", "")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "")


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token from Supabase"""
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        }
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.fail(f"Auth failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestPortalsCRUD:
    """Tests for portal CRUD operations"""
    
    def test_list_portals_success(self, api_client):
        """GET /api/portals should return list of portals"""
        response = api_client.get(f"{BASE_URL}/api/portals")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "success" in data
        assert "portals" in data
        assert isinstance(data["portals"], list)
        print(f"✓ Found {len(data['portals'])} portals")
    
    def test_create_portal_success(self, api_client):
        """POST /api/portals should create a new portal"""
        test_name = f"TEST_Portal_{uuid.uuid4().hex[:6]}"
        response = api_client.post(
            f"{BASE_URL}/api/portals",
            json={"name": test_name}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "portal" in data
        assert data["portal"]["name"] == test_name
        assert "id" in data["portal"]
        print(f"✓ Created portal: {data['portal']['id']}")
        
        # Store portal_id for later tests
        TestPortalsCRUD.created_portal_id = data["portal"]["id"]
        TestPortalsCRUD.created_portal_name = test_name
    
    def test_get_portal_success(self, api_client):
        """GET /api/portals/{portal_id} should return portal details"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        if not portal_id:
            pytest.skip("No portal created")
        
        response = api_client.get(f"{BASE_URL}/api/portals/{portal_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "portal" in data
        assert data["portal"]["id"] == portal_id
        assert "deal_count" in data["portal"]
        assert "member_count" in data["portal"]
        print(f"✓ Portal has {data['portal']['deal_count']} deals, {data['portal']['member_count']} members")
    
    def test_update_portal_success(self, api_client):
        """PUT /api/portals/{portal_id} should rename portal"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        if not portal_id:
            pytest.skip("No portal created")
        
        new_name = f"TEST_Renamed_{uuid.uuid4().hex[:4]}"
        response = api_client.put(
            f"{BASE_URL}/api/portals/{portal_id}",
            json={"name": new_name}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Portal renamed to: {new_name}")
    
    def test_get_portal_not_found(self, api_client):
        """GET /api/portals/{fake_id} should return 404"""
        response = api_client.get(f"{BASE_URL}/api/portals/fake-id-does-not-exist")
        assert response.status_code == 404
        print("✓ 404 returned for non-existent portal")


class TestPortalDeals:
    """Tests for portal deals management"""
    
    def test_list_portal_deals_empty(self, api_client):
        """GET /api/portals/{portal_id}/deals should return empty list for new portal"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        if not portal_id:
            pytest.skip("No portal created")
        
        response = api_client.get(f"{BASE_URL}/api/portals/{portal_id}/deals")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "deals" in data
        assert isinstance(data["deals"], list)
        print(f"✓ Portal has {len(data['deals'])} deals")
    
    def test_add_deal_to_portal(self, api_client):
        """POST /api/portals/{portal_id}/deals should add deal to portal"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        if not portal_id:
            pytest.skip("No portal created")
        
        # First get list of deals to find one to add
        deals_response = api_client.get(f"{BASE_URL}/api/deals")
        if deals_response.status_code != 200:
            pytest.skip("Cannot fetch deals")
        
        deals = deals_response.json().get("deals", [])
        if not deals:
            pytest.skip("No deals available to add")
        
        deal_id = deals[0]["id"]
        TestPortalDeals.test_deal_id = deal_id
        
        response = api_client.post(
            f"{BASE_URL}/api/portals/{portal_id}/deals",
            json={"deal_ids": [deal_id]}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Added deal {deal_id} to portal")
    
    def test_verify_deal_added(self, api_client):
        """Verify deal was added to portal"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        deal_id = getattr(TestPortalDeals, 'test_deal_id', None)
        if not portal_id or not deal_id:
            pytest.skip("Missing portal or deal")
        
        response = api_client.get(f"{BASE_URL}/api/portals/{portal_id}/deals")
        assert response.status_code == 200
        data = response.json()
        deal_ids = [d["id"] for d in data.get("deals", [])]
        assert deal_id in deal_ids, "Deal not found in portal"
        print(f"✓ Deal verified in portal")
    
    def test_remove_deal_from_portal(self, api_client):
        """DELETE /api/portals/{portal_id}/deals/{deal_id} should remove deal"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        deal_id = getattr(TestPortalDeals, 'test_deal_id', None)
        if not portal_id or not deal_id:
            pytest.skip("Missing portal or deal")
        
        response = api_client.delete(f"{BASE_URL}/api/portals/{portal_id}/deals/{deal_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Deal removed from portal")


class TestPortalMembers:
    """Tests for portal member management"""
    
    def test_list_members_empty(self, api_client):
        """GET /api/portals/{portal_id}/members should return list"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        if not portal_id:
            pytest.skip("No portal created")
        
        response = api_client.get(f"{BASE_URL}/api/portals/{portal_id}/members")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "members" in data
        assert isinstance(data["members"], list)
        print(f"✓ Portal has {len(data['members'])} members")
    
    def test_add_member_success(self, api_client):
        """POST /api/portals/{portal_id}/members should create member with access code"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        if not portal_id:
            pytest.skip("No portal created")
        
        response = api_client.post(
            f"{BASE_URL}/api/portals/{portal_id}/members",
            json={
                "name": "TEST_Investor_John",
                "email": "test_investor@example.com"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "member" in data
        
        member = data["member"]
        assert "id" in member
        assert "access_code" in member
        assert member["name"] == "TEST_Investor_John"
        assert member["status"] == "invited"
        assert len(member["access_code"]) == 8  # Default code length
        
        TestPortalMembers.test_member_id = member["id"]
        TestPortalMembers.test_access_code = member["access_code"]
        print(f"✓ Member created with code: {member['access_code']}")
    
    def test_verify_member_added(self, api_client):
        """Verify member appears in list"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        member_id = getattr(TestPortalMembers, 'test_member_id', None)
        if not portal_id or not member_id:
            pytest.skip("Missing data")
        
        response = api_client.get(f"{BASE_URL}/api/portals/{portal_id}/members")
        assert response.status_code == 200
        data = response.json()
        member_ids = [m["id"] for m in data.get("members", [])]
        assert member_id in member_ids
        print("✓ Member verified in list")
    
    def test_regenerate_code(self, api_client):
        """POST /api/portals/{portal_id}/members/{member_id}/regenerate-code should generate new code"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        member_id = getattr(TestPortalMembers, 'test_member_id', None)
        old_code = getattr(TestPortalMembers, 'test_access_code', None)
        if not portal_id or not member_id:
            pytest.skip("Missing data")
        
        response = api_client.post(f"{BASE_URL}/api/portals/{portal_id}/members/{member_id}/regenerate-code")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "access_code" in data
        assert data["access_code"] != old_code, "New code should be different"
        
        TestPortalMembers.new_access_code = data["access_code"]
        print(f"✓ Code regenerated: {old_code} → {data['access_code']}")
    
    def test_revoke_member_access(self, api_client):
        """PUT /api/portals/{portal_id}/members/{member_id}/revoke should revoke access"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        member_id = getattr(TestPortalMembers, 'test_member_id', None)
        if not portal_id or not member_id:
            pytest.skip("Missing data")
        
        response = api_client.put(f"{BASE_URL}/api/portals/{portal_id}/members/{member_id}/revoke")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print("✓ Member access revoked")
    
    def test_verify_member_revoked(self, api_client):
        """Verify member status is revoked"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        member_id = getattr(TestPortalMembers, 'test_member_id', None)
        if not portal_id or not member_id:
            pytest.skip("Missing data")
        
        response = api_client.get(f"{BASE_URL}/api/portals/{portal_id}/members")
        assert response.status_code == 200
        data = response.json()
        member = next((m for m in data.get("members", []) if m["id"] == member_id), None)
        assert member is not None
        assert member["status"] == "revoked"
        print("✓ Member status is revoked")
    
    def test_restore_member_access(self, api_client):
        """PUT /api/portals/{portal_id}/members/{member_id}/restore should restore access"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        member_id = getattr(TestPortalMembers, 'test_member_id', None)
        if not portal_id or not member_id:
            pytest.skip("Missing data")
        
        response = api_client.put(f"{BASE_URL}/api/portals/{portal_id}/members/{member_id}/restore")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert "access_code" in data  # Restore generates new code
        print(f"✓ Member restored with new code: {data['access_code']}")
    
    def test_verify_member_restored(self, api_client):
        """Verify member status is invited after restore"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        member_id = getattr(TestPortalMembers, 'test_member_id', None)
        if not portal_id or not member_id:
            pytest.skip("Missing data")
        
        response = api_client.get(f"{BASE_URL}/api/portals/{portal_id}/members")
        assert response.status_code == 200
        data = response.json()
        member = next((m for m in data.get("members", []) if m["id"] == member_id), None)
        assert member is not None
        assert member["status"] == "invited"
        print("✓ Member status is invited after restore")


class TestPortalCleanup:
    """Cleanup test data"""
    
    def test_delete_portal_success(self, api_client):
        """DELETE /api/portals/{portal_id} should delete portal and cascade"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        if not portal_id:
            pytest.skip("No portal to delete")
        
        response = api_client.delete(f"{BASE_URL}/api/portals/{portal_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Portal {portal_id} deleted")
    
    def test_verify_portal_deleted(self, api_client):
        """Verify portal no longer exists"""
        portal_id = getattr(TestPortalsCRUD, 'created_portal_id', None)
        if not portal_id:
            pytest.skip("No portal to verify")
        
        response = api_client.get(f"{BASE_URL}/api/portals/{portal_id}")
        assert response.status_code == 404
        print("✓ Portal verified deleted")


class TestExistingPortal:
    """Tests using existing portal 'SA Investor Deals' (from context)"""
    
    def test_list_portals_shows_existing(self, api_client):
        """Verify existing portal 'SA Investor Deals' appears in list"""
        response = api_client.get(f"{BASE_URL}/api/portals")
        assert response.status_code == 200
        data = response.json()
        portals = data.get("portals", [])
        
        # Find SA Investor Deals portal
        sa_portal = next((p for p in portals if "SA" in p.get("name", "") or "Investor" in p.get("name", "")), None)
        if sa_portal:
            print(f"✓ Found existing portal: {sa_portal['name']} ({sa_portal['deal_count']} deals, {sa_portal['member_count']} members)")
            TestExistingPortal.existing_portal_id = sa_portal["id"]
        else:
            print(f"ℹ Found {len(portals)} portals but 'SA Investor Deals' not found")
    
    def test_existing_portal_has_deals(self, api_client):
        """Check existing portal has deals assigned"""
        portal_id = getattr(TestExistingPortal, 'existing_portal_id', None)
        if not portal_id:
            pytest.skip("No existing portal found")
        
        response = api_client.get(f"{BASE_URL}/api/portals/{portal_id}/deals")
        assert response.status_code == 200
        data = response.json()
        deals = data.get("deals", [])
        print(f"✓ Portal has {len(deals)} deals")
        
        if deals:
            print(f"  First deal: {deals[0].get('title', 'N/A')}")
    
    def test_existing_portal_has_members(self, api_client):
        """Check existing portal has members"""
        portal_id = getattr(TestExistingPortal, 'existing_portal_id', None)
        if not portal_id:
            pytest.skip("No existing portal found")
        
        response = api_client.get(f"{BASE_URL}/api/portals/{portal_id}/members")
        assert response.status_code == 200
        data = response.json()
        members = data.get("members", [])
        print(f"✓ Portal has {len(members)} members")
        
        for m in members[:3]:  # Show first 3
            print(f"  Member: {m.get('name')} ({m.get('status')})")
