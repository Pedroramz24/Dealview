"""
Test Document Upload and Delete Endpoints
Tests for:
- POST /api/deals/{deal_id}/documents - Upload document
- GET /api/deals/{deal_id}/documents - List documents
- DELETE /api/documents/{document_id} - Delete document (doc uploader OR deal owner)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDocumentEndpoints:
    """Test document upload, list, and delete endpoints"""
    
    def test_upload_document_requires_auth(self):
        """POST /api/deals/{deal_id}/documents should require authentication"""
        # Use a fake deal_id
        deal_id = "00000000-0000-0000-0000-000000000000"
        response = requests.post(
            f"{BASE_URL}/api/deals/{deal_id}/documents",
            files={"file": ("test.txt", b"test content", "text/plain")}
        )
        # Should return 403 (Forbidden) or 401 (Unauthorized) without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"✓ POST /api/deals/{{deal_id}}/documents requires auth (status: {response.status_code})")
    
    def test_list_documents_requires_auth(self):
        """GET /api/deals/{deal_id}/documents should require authentication"""
        deal_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(f"{BASE_URL}/api/deals/{deal_id}/documents")
        # Should return 403 (Forbidden) or 401 (Unauthorized) without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/deals/{{deal_id}}/documents requires auth (status: {response.status_code})")
    
    def test_delete_document_requires_auth(self):
        """DELETE /api/documents/{document_id} should require authentication"""
        doc_id = "00000000-0000-0000-0000-000000000000"
        response = requests.delete(f"{BASE_URL}/api/documents/{doc_id}")
        # Should return 403 (Forbidden) or 401 (Unauthorized) without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"✓ DELETE /api/documents/{{document_id}} requires auth (status: {response.status_code})")
    
    def test_upload_document_endpoint_exists(self):
        """Verify POST /api/deals/{deal_id}/documents endpoint exists"""
        deal_id = "test-deal-id"
        response = requests.post(
            f"{BASE_URL}/api/deals/{deal_id}/documents",
            files={"file": ("test.txt", b"test content", "text/plain")}
        )
        # Should NOT return 404 (endpoint exists)
        assert response.status_code != 404, f"Endpoint not found: POST /api/deals/{{deal_id}}/documents"
        print(f"✓ POST /api/deals/{{deal_id}}/documents endpoint exists (status: {response.status_code})")
    
    def test_list_documents_endpoint_exists(self):
        """Verify GET /api/deals/{deal_id}/documents endpoint exists"""
        deal_id = "test-deal-id"
        response = requests.get(f"{BASE_URL}/api/deals/{deal_id}/documents")
        # Should NOT return 404 (endpoint exists)
        assert response.status_code != 404, f"Endpoint not found: GET /api/deals/{{deal_id}}/documents"
        print(f"✓ GET /api/deals/{{deal_id}}/documents endpoint exists (status: {response.status_code})")
    
    def test_delete_document_endpoint_exists(self):
        """Verify DELETE /api/documents/{document_id} endpoint exists"""
        doc_id = "test-doc-id"
        response = requests.delete(f"{BASE_URL}/api/documents/{doc_id}")
        # Should NOT return 404 (endpoint exists)
        assert response.status_code != 404, f"Endpoint not found: DELETE /api/documents/{{document_id}}"
        print(f"✓ DELETE /api/documents/{{document_id}} endpoint exists (status: {response.status_code})")


class TestHealthCheck:
    """Basic health check to verify API is running"""
    
    def test_health_endpoint(self):
        """GET /api/health should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        assert data.get("status") == "healthy", f"Unexpected health status: {data}"
        print(f"✓ API health check passed: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
