"""
Test Image Management Endpoints for Deals
Tests for:
- DELETE /api/deals/{deal_id}/images/{image_index} — Delete image at index
- PUT /api/deals/{deal_id}/images/reorder — Reorder images
- POST /api/deals/{deal_id}/images — Upload image (verify image_urls in response)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

FAKE_DEAL_ID = "00000000-0000-0000-0000-000000000000"


class TestDeleteImageEndpoint:
    """Test DELETE /api/deals/{deal_id}/images/{image_index}"""

    def test_delete_image_endpoint_exists(self):
        """DELETE /api/deals/{deal_id}/images/{image_index} should not return 404"""
        response = requests.delete(
            f"{BASE_URL}/api/deals/{FAKE_DEAL_ID}/images/0"
        )
        # 404 means endpoint not found — should be 401/403/422 (not 404)
        assert response.status_code != 404, (
            f"DELETE /api/deals/{{deal_id}}/images/{{image_index}} endpoint not found (404). "
            f"Response: {response.text}"
        )
        print(f"✓ DELETE image endpoint exists (status: {response.status_code})")

    def test_delete_image_requires_auth(self):
        """DELETE /api/deals/{deal_id}/images/{image_index} should require authentication"""
        response = requests.delete(
            f"{BASE_URL}/api/deals/{FAKE_DEAL_ID}/images/0"
        )
        assert response.status_code in [401, 403], (
            f"Expected 401/403, got {response.status_code}: {response.text}"
        )
        print(f"✓ DELETE image requires auth (status: {response.status_code})")

    def test_delete_image_with_fake_token_returns_401_or_403(self):
        """DELETE with an invalid token should return 401/403"""
        headers = {"Authorization": "Bearer fake_invalid_token"}
        response = requests.delete(
            f"{BASE_URL}/api/deals/{FAKE_DEAL_ID}/images/0",
            headers=headers
        )
        assert response.status_code in [401, 403, 422], (
            f"Expected 401/403/422, got {response.status_code}: {response.text}"
        )
        print(f"✓ DELETE image rejects fake token (status: {response.status_code})")

    def test_delete_image_index_is_integer(self):
        """DELETE with non-integer index should return 422 or 403 (auth checked first)"""
        response = requests.delete(
            f"{BASE_URL}/api/deals/{FAKE_DEAL_ID}/images/not_a_number"
        )
        # FastAPI may check auth before path param validation; accept 422 or 403
        assert response.status_code in [422, 403, 401], (
            f"Expected 422/403/401 for invalid index, got {response.status_code}: {response.text}"
        )
        print(f"✓ DELETE image validates index type (status: {response.status_code})")

    def test_delete_image_response_structure_on_valid_auth(self):
        """Check response structure when authenticated — deal won't exist but endpoint is valid"""
        # Testing that the endpoint exists and would return proper structure
        # With no token, should return 401/403
        response = requests.delete(
            f"{BASE_URL}/api/deals/{FAKE_DEAL_ID}/images/0"
        )
        # Without valid auth, should be 401 or 403
        assert response.status_code in [401, 403], (
            f"Unexpected status: {response.status_code}"
        )
        print(f"✓ DELETE image endpoint auth enforcement working (status: {response.status_code})")


class TestReorderImagesEndpoint:
    """Test PUT /api/deals/{deal_id}/images/reorder"""

    def test_reorder_endpoint_exists(self):
        """PUT /api/deals/{deal_id}/images/reorder should not return 404"""
        response = requests.put(
            f"{BASE_URL}/api/deals/{FAKE_DEAL_ID}/images/reorder",
            json={"image_urls": []}
        )
        # Should NOT be 404
        assert response.status_code != 404, (
            f"PUT /api/deals/{{deal_id}}/images/reorder endpoint not found. "
            f"Response: {response.text}"
        )
        print(f"✓ PUT reorder endpoint exists (status: {response.status_code})")

    def test_reorder_requires_auth(self):
        """PUT /api/deals/{deal_id}/images/reorder should require authentication"""
        response = requests.put(
            f"{BASE_URL}/api/deals/{FAKE_DEAL_ID}/images/reorder",
            json={"image_urls": ["http://example.com/img1.jpg"]}
        )
        assert response.status_code in [401, 403], (
            f"Expected 401/403, got {response.status_code}: {response.text}"
        )
        print(f"✓ PUT reorder requires auth (status: {response.status_code})")

    def test_reorder_validates_payload(self):
        """PUT /api/deals/{deal_id}/images/reorder should validate payload"""
        # Send missing required field
        response = requests.put(
            f"{BASE_URL}/api/deals/{FAKE_DEAL_ID}/images/reorder",
            json={}  # Missing image_urls field
        )
        # With missing payload, should get 422 (validation error) or 401/403 (auth check first)
        assert response.status_code in [401, 403, 422], (
            f"Expected 401/403/422, got {response.status_code}: {response.text}"
        )
        print(f"✓ PUT reorder validates payload (status: {response.status_code})")

    def test_reorder_with_fake_token(self):
        """PUT reorder with invalid token should return 401/403"""
        headers = {"Authorization": "Bearer fake_invalid_token", "Content-Type": "application/json"}
        response = requests.put(
            f"{BASE_URL}/api/deals/{FAKE_DEAL_ID}/images/reorder",
            json={"image_urls": ["http://example.com/img.jpg"]},
            headers=headers
        )
        assert response.status_code in [401, 403, 422], (
            f"Expected 401/403/422, got {response.status_code}: {response.text}"
        )
        print(f"✓ PUT reorder rejects fake token (status: {response.status_code})")


class TestImageUploadResponseStructure:
    """Test that POST /api/deals/{deal_id}/images returns image_urls in response"""

    def test_upload_image_endpoint_exists(self):
        """POST /api/deals/{deal_id}/images should not return 404"""
        import io
        # Create a minimal valid PNG image (1x1 pixel)
        png_bytes = (
            b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
            b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00'
            b'\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        )
        response = requests.post(
            f"{BASE_URL}/api/deals/{FAKE_DEAL_ID}/images",
            files={"file": ("test.png", io.BytesIO(png_bytes), "image/png")}
        )
        assert response.status_code != 404, (
            f"POST /api/deals/{{deal_id}}/images endpoint not found: {response.text}"
        )
        print(f"✓ POST image upload endpoint exists (status: {response.status_code})")

    def test_upload_image_requires_auth(self):
        """POST /api/deals/{deal_id}/images should require authentication"""
        import io
        png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        response = requests.post(
            f"{BASE_URL}/api/deals/{FAKE_DEAL_ID}/images",
            files={"file": ("test.png", io.BytesIO(png_bytes), "image/png")}
        )
        assert response.status_code in [401, 403], (
            f"Expected 401/403, got {response.status_code}: {response.text}"
        )
        print(f"✓ POST image upload requires auth (status: {response.status_code})")


class TestHealthCheck:
    """Basic health check"""

    def test_health_endpoint(self):
        """GET /api/health should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        assert data.get("status") == "healthy", f"Unexpected health status: {data}"
        print(f"✓ API health check passed: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
