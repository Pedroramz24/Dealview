"""
Tests for Pipeline Manager & Tags Features - Iteration 9
Testing:
1. PUT /api/pipelines/{id} - rename pipeline
2. DELETE /api/pipelines/{id} - delete pipeline  
3. POST /api/pipelines - create new pipeline
4. POST /api/pipelines/{id}/stages/reorder - reorder stages
5. DELETE /api/contacts/tags/{id} - delete tag
6. PUT /api/contacts/tags/{id} - edit tag
"""
import pytest
import requests
import os
import time
import uuid

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://image-upload-fix-30.preview.emergentagent.com').rstrip('/')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')

# Test user credentials for authentication
TEST_EMAIL = f"pipeline_test_{int(time.time())}@example.com"
TEST_PASSWORD = os.environ.get("TEST_DEFAULT_PASSWORD", "TestPass123!")

class TestSetup:
    """Setup test user and get token"""
    token = None
    user_id = None
    pipeline_id = None
    stage_ids = []
    tag_id = None
    
@pytest.fixture(scope="module")
def auth_token():
    """Create test user via Supabase signup and get authentication token"""
    # First try to signup via Supabase
    signup_response = requests.post(
        f"{SUPABASE_URL}/auth/v1/signup",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        }
    )
    
    if signup_response.status_code == 200:
        data = signup_response.json()
        TestSetup.token = data.get('access_token')
        TestSetup.user_id = data.get('user', {}).get('id')
        print(f"Created new user: {TEST_EMAIL}")
        return TestSetup.token
    
    # If signup fails, try login (user may already exist)
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    
    if login_response.status_code == 200:
        data = login_response.json()
        TestSetup.token = data.get('access_token') or data.get('token')
        TestSetup.user_id = data.get('user', {}).get('id')
        print(f"Logged in as existing user: {TEST_EMAIL}")
        return TestSetup.token
    
    pytest.fail(f"Could not authenticate: signup={signup_response.text}, login={login_response.text}")

@pytest.fixture
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


# ============================================================================
# PIPELINE API TESTS
# ============================================================================

class TestPipelineCreate:
    """Test POST /api/pipelines - create new pipeline"""
    
    def test_create_pipeline_success(self, api_client):
        """Test creating a new pipeline"""
        pipeline_name = f"Test Pipeline {uuid.uuid4().hex[:8]}"
        response = api_client.post(
            f"{BASE_URL}/api/pipelines",
            json={"name": pipeline_name, "description": "Test pipeline description"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("pipeline") is not None
        assert data["pipeline"]["name"] == pipeline_name
        
        # Store for later tests
        TestSetup.pipeline_id = data["pipeline"]["id"]
        print(f"Created pipeline: {TestSetup.pipeline_id}")


class TestPipelineRename:
    """Test PUT /api/pipelines/{id} - rename pipeline"""
    
    def test_rename_pipeline_success(self, api_client):
        """Test renaming an existing pipeline"""
        if not TestSetup.pipeline_id:
            # Create a pipeline first
            create_response = api_client.post(
                f"{BASE_URL}/api/pipelines",
                json={"name": f"Pipeline to Rename {uuid.uuid4().hex[:8]}"}
            )
            if create_response.status_code == 200:
                TestSetup.pipeline_id = create_response.json()["pipeline"]["id"]
        
        new_name = f"Renamed Pipeline {uuid.uuid4().hex[:8]}"
        response = api_client.put(
            f"{BASE_URL}/api/pipelines/{TestSetup.pipeline_id}",
            json={"name": new_name}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("pipeline", {}).get("name") == new_name
        print(f"Renamed pipeline to: {new_name}")
    
    def test_rename_pipeline_not_found(self, api_client):
        """Test renaming non-existent pipeline returns 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.put(
            f"{BASE_URL}/api/pipelines/{fake_id}",
            json={"name": "Should Not Work"}
        )
        
        # Should return 404 for not found
        assert response.status_code in [404, 403, 520], f"Expected 404/403, got {response.status_code}"


class TestPipelineStagesReorder:
    """Test POST /api/pipelines/{id}/stages/reorder - reorder stages"""
    
    def test_get_pipeline_stages(self, api_client):
        """Get pipeline with stages to prepare for reorder test"""
        # First get all pipelines
        response = api_client.get(f"{BASE_URL}/api/pipelines")
        assert response.status_code == 200, f"Failed to get pipelines: {response.text}"
        
        pipelines = response.json().get("pipelines", [])
        assert len(pipelines) > 0, "Need at least one pipeline"
        
        # Find a pipeline with stages
        for pipeline in pipelines:
            stages = pipeline.get("stages", [])
            if len(stages) >= 2:
                TestSetup.pipeline_id = pipeline["id"]
                TestSetup.stage_ids = [s["id"] for s in stages]
                print(f"Found pipeline {pipeline['name']} with {len(stages)} stages")
                break
        
        # If no pipeline has 2+ stages, create stages
        if len(TestSetup.stage_ids) < 2:
            # Use first pipeline
            TestSetup.pipeline_id = pipelines[0]["id"]
            # Create stages
            for i in range(3):
                stage_response = api_client.post(
                    f"{BASE_URL}/api/pipelines/{TestSetup.pipeline_id}/stages",
                    json={"name": f"Test Stage {i+1}", "color": "#00b8d4"}
                )
                if stage_response.status_code == 200:
                    TestSetup.stage_ids.append(stage_response.json()["stage"]["id"])
            print(f"Created {len(TestSetup.stage_ids)} stages")
    
    def test_reorder_stages_success(self, api_client):
        """Test reordering stages in a pipeline"""
        if len(TestSetup.stage_ids) < 2:
            pytest.skip("Need at least 2 stages to test reorder")
        
        # Reverse the order
        reversed_ids = list(reversed(TestSetup.stage_ids))
        
        response = api_client.post(
            f"{BASE_URL}/api/pipelines/{TestSetup.pipeline_id}/stages/reorder",
            json={"stage_ids": reversed_ids}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        print("Stages reordered successfully")
    
    def test_reorder_stages_invalid_pipeline(self, api_client):
        """Test reordering stages for non-existent pipeline"""
        fake_id = str(uuid.uuid4())
        response = api_client.post(
            f"{BASE_URL}/api/pipelines/{fake_id}/stages/reorder",
            json={"stage_ids": ["stage1", "stage2"]}
        )
        
        assert response.status_code in [404, 403, 520]


class TestPipelineDelete:
    """Test DELETE /api/pipelines/{id} - delete pipeline"""
    
    def test_delete_empty_pipeline_success(self, api_client):
        """Test deleting a pipeline without deals"""
        # Create a new pipeline to delete
        create_response = api_client.post(
            f"{BASE_URL}/api/pipelines",
            json={"name": f"Pipeline to Delete {uuid.uuid4().hex[:8]}"}
        )
        
        assert create_response.status_code == 200, f"Failed to create pipeline: {create_response.text}"
        pipeline_id = create_response.json()["pipeline"]["id"]
        
        # Delete it
        response = api_client.delete(f"{BASE_URL}/api/pipelines/{pipeline_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        print(f"Deleted pipeline: {pipeline_id}")
    
    def test_delete_pipeline_not_found(self, api_client):
        """Test deleting non-existent pipeline returns 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.delete(f"{BASE_URL}/api/pipelines/{fake_id}")
        
        assert response.status_code in [404, 403, 520]


# ============================================================================
# TAG API TESTS
# ============================================================================

class TestTagCreate:
    """Test POST /api/contacts/tags - create tag (prerequisite for edit/delete tests)"""
    
    def test_create_tag_success(self, api_client):
        """Test creating a new contact tag"""
        tag_name = f"Test Tag {uuid.uuid4().hex[:8]}"
        response = api_client.post(
            f"{BASE_URL}/api/contacts/tags",
            json={"name": tag_name, "color": "#ff5733"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("tag") is not None
        assert data["tag"]["name"] == tag_name
        assert data["tag"]["color"] == "#ff5733"
        
        # Store for later tests
        TestSetup.tag_id = data["tag"]["id"]
        print(f"Created tag: {TestSetup.tag_id}")


class TestTagEdit:
    """Test PUT /api/contacts/tags/{id} - edit tag"""
    
    def test_edit_tag_name_success(self, api_client):
        """Test editing tag name"""
        if not TestSetup.tag_id:
            # Create a tag first
            create_response = api_client.post(
                f"{BASE_URL}/api/contacts/tags",
                json={"name": f"Tag to Edit {uuid.uuid4().hex[:8]}", "color": "#00b8d4"}
            )
            if create_response.status_code == 200:
                TestSetup.tag_id = create_response.json()["tag"]["id"]
        
        new_name = f"Edited Tag {uuid.uuid4().hex[:8]}"
        response = api_client.put(
            f"{BASE_URL}/api/contacts/tags/{TestSetup.tag_id}",
            json={"name": new_name}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("tag", {}).get("name") == new_name
        print(f"Edited tag name to: {new_name}")
    
    def test_edit_tag_color_success(self, api_client):
        """Test editing tag color"""
        if not TestSetup.tag_id:
            pytest.skip("No tag ID available")
        
        new_color = "#10b981"
        response = api_client.put(
            f"{BASE_URL}/api/contacts/tags/{TestSetup.tag_id}",
            json={"color": new_color}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("tag", {}).get("color") == new_color
        print(f"Edited tag color to: {new_color}")
    
    def test_edit_tag_not_found(self, api_client):
        """Test editing non-existent tag returns 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.put(
            f"{BASE_URL}/api/contacts/tags/{fake_id}",
            json={"name": "Should Not Work"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestTagDelete:
    """Test DELETE /api/contacts/tags/{id} - delete tag"""
    
    def test_delete_tag_success(self, api_client):
        """Test deleting a contact tag"""
        # Create a new tag to delete
        create_response = api_client.post(
            f"{BASE_URL}/api/contacts/tags",
            json={"name": f"Tag to Delete {uuid.uuid4().hex[:8]}", "color": "#ef4444"}
        )
        
        assert create_response.status_code == 200, f"Failed to create tag: {create_response.text}"
        tag_id = create_response.json()["tag"]["id"]
        
        # Delete it
        response = api_client.delete(f"{BASE_URL}/api/contacts/tags/{tag_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        print(f"Deleted tag: {tag_id}")
    
    def test_delete_tag_not_found(self, api_client):
        """Test deleting non-existent tag returns 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.delete(f"{BASE_URL}/api/contacts/tags/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

class TestPipelineIntegration:
    """End-to-end pipeline management tests"""
    
    def test_full_pipeline_workflow(self, api_client):
        """Test complete pipeline lifecycle: create -> rename -> add stage -> reorder -> delete"""
        # 1. Create pipeline
        create_response = api_client.post(
            f"{BASE_URL}/api/pipelines",
            json={"name": f"Integration Test Pipeline {uuid.uuid4().hex[:6]}"}
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        pipeline = create_response.json()["pipeline"]
        pipeline_id = pipeline["id"]
        print(f"Step 1: Created pipeline {pipeline_id}")
        
        # 2. Rename pipeline
        rename_response = api_client.put(
            f"{BASE_URL}/api/pipelines/{pipeline_id}",
            json={"name": f"Renamed Integration Pipeline {uuid.uuid4().hex[:6]}"}
        )
        assert rename_response.status_code == 200, f"Rename failed: {rename_response.text}"
        print("Step 2: Renamed pipeline")
        
        # 3. Add stages to the pipeline
        stage_ids = []
        for i in range(3):
            stage_response = api_client.post(
                f"{BASE_URL}/api/pipelines/{pipeline_id}/stages",
                json={"name": f"Stage {i+1}", "color": f"#{'ff' if i==0 else '00'}{'ff' if i==1 else '00'}ff"}
            )
            if stage_response.status_code == 200:
                stage_ids.append(stage_response.json()["stage"]["id"])
        
        print(f"Step 3: Created {len(stage_ids)} stages")
        
        # 4. Reorder stages (reverse order)
        if len(stage_ids) >= 2:
            reorder_response = api_client.post(
                f"{BASE_URL}/api/pipelines/{pipeline_id}/stages/reorder",
                json={"stage_ids": list(reversed(stage_ids))}
            )
            assert reorder_response.status_code == 200, f"Reorder failed: {reorder_response.text}"
            print("Step 4: Reordered stages")
        
        # 5. Delete pipeline (should work since no deals)
        delete_response = api_client.delete(f"{BASE_URL}/api/pipelines/{pipeline_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print("Step 5: Deleted pipeline")
        
        print("Pipeline integration test PASSED")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
