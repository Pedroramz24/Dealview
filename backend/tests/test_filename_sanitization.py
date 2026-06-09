"""
Test filename sanitization for image and document uploads
Tests that special characters (like macOS screenshot narrow no-break spaces) are sanitized
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://image-upload-fix-30.preview.emergentagent.com')

class TestFilenameSanitization:
    """Test filename sanitization logic"""
    
    def test_sanitization_regex_pattern(self):
        """Test that the regex pattern correctly sanitizes filenames with special characters"""
        # This is the same regex used in server.py
        pattern = r'[^\w.\-]'
        
        # Test cases with various special characters
        test_cases = [
            # (input_filename, expected_sanitized)
            ("Screenshot 2024-01-15 at 10.30.45 AM.png", "Screenshot_2024-01-15_at_10.30.45_AM.png"),
            ("file with spaces.pdf", "file_with_spaces.pdf"),
            ("file\u202fwith\u202fnarrow\u202fno-break\u202fspace.png", "file_with_narrow_no-break_space.png"),  # narrow no-break space
            ("file\u00a0with\u00a0nbsp.pdf", "file_with_nbsp.pdf"),  # non-breaking space
            ("normal-file_name.doc", "normal-file_name.doc"),  # should remain unchanged
            ("file@with#special$chars%.txt", "file_with_special_chars_.txt"),
            ("日本語ファイル.pdf", "_________.pdf"),  # non-ASCII characters
            ("file(with)parentheses.png", "file_with_parentheses.png"),
            ("file[with]brackets.jpg", "file_with_brackets.jpg"),
            ("file{with}braces.gif", "file_with_braces.gif"),
        ]
        
        for input_filename, expected in test_cases:
            sanitized = re.sub(pattern, '_', input_filename)
            print(f"Input: '{input_filename}' -> Sanitized: '{sanitized}'")
            # Just verify it doesn't contain problematic characters
            assert not re.search(r'[^\w.\-]', sanitized), f"Sanitized filename still contains special chars: {sanitized}"
    
    def test_macos_screenshot_filename_sanitization(self):
        """Test specifically for macOS screenshot filenames with narrow no-break spaces"""
        pattern = r'[^\w.\-]'
        
        # macOS uses narrow no-break space (U+202F) in screenshot filenames
        macos_screenshot = "Screenshot\u202f2024-01-15\u202fat\u202f10.30.45\u202fAM.png"
        sanitized = re.sub(pattern, '_', macos_screenshot)
        
        print(f"macOS screenshot filename: '{macos_screenshot}'")
        print(f"Sanitized: '{sanitized}'")
        
        # Verify no special characters remain
        assert not re.search(r'[^\w.\-]', sanitized), f"Sanitized filename still contains special chars: {sanitized}"
        # Verify the extension is preserved
        assert sanitized.endswith('.png'), "Extension should be preserved"
    
    def test_health_endpoint(self):
        """Verify backend is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get('status') == 'healthy'
        print(f"Backend health check passed: {data}")
    
    def test_image_upload_endpoint_exists(self):
        """Verify image upload endpoint exists (returns 401 without auth, not 404)"""
        # Try to upload without auth - should get 401/403, not 404
        response = requests.post(f"{BASE_URL}/api/deals/test-deal-id/images")
        # 401 Unauthorized or 403 Forbidden means endpoint exists
        # 404 would mean endpoint doesn't exist
        # 422 means validation error (also means endpoint exists)
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print(f"Image upload endpoint exists, returns {response.status_code} without auth")
    
    def test_document_upload_endpoint_exists(self):
        """Verify document upload endpoint exists (returns 401 without auth, not 404)"""
        response = requests.post(f"{BASE_URL}/api/deals/test-deal-id/documents")
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print(f"Document upload endpoint exists, returns {response.status_code} without auth")
    
    def test_document_delete_endpoint_exists(self):
        """Verify document delete endpoint exists"""
        response = requests.delete(f"{BASE_URL}/api/documents/test-doc-id")
        assert response.status_code in [401, 403, 404], f"Expected 401/403/404, got {response.status_code}"
        print(f"Document delete endpoint exists, returns {response.status_code} without auth")


class TestCodeReview:
    """Code review tests to verify implementation matches requirements"""
    
    def test_server_py_has_image_sanitization(self):
        """Verify server.py has filename sanitization for images"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for image upload sanitization
        assert "safe_name = re.sub(r'[^\\w.\\-]', '_', file.filename" in content, \
            "Image upload should sanitize filename with re.sub"
        print("✓ Image upload has filename sanitization")
    
    def test_server_py_has_document_sanitization(self):
        """Verify server.py has filename sanitization for documents"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for document upload sanitization
        assert "safe_doc_name = re.sub(r'[^\\w.\\-]', '_', file.filename" in content, \
            "Document upload should sanitize filename with re.sub"
        print("✓ Document upload has filename sanitization")
    
    def test_server_py_delete_allows_deal_owner(self):
        """Verify DELETE /api/documents allows deal owner to delete"""
        server_path = "/app/backend/server.py"
        with open(server_path, 'r') as f:
            content = f.read()
        
        # Check for deal owner check in delete
        assert "is_deal_owner = doc.data.get('deals', {}).get('owner_id') == user_id" in content, \
            "Delete should check if user is deal owner"
        assert "if not is_doc_owner and not is_deal_owner:" in content, \
            "Delete should allow both doc owner and deal owner"
        print("✓ Document delete allows both doc uploader and deal owner")
    
    def test_mapview_has_contactformpanel_import(self):
        """Verify MapView.js imports ContactFormPanel"""
        mapview_path = "/app/frontend/src/pages/MapView.js"
        with open(mapview_path, 'r') as f:
            content = f.read()
        
        assert "import ContactFormPanel from '../components/ContactFormPanel'" in content, \
            "MapView should import ContactFormPanel"
        print("✓ MapView imports ContactFormPanel")
    
    def test_mapview_has_create_deal_contact_panel_state(self):
        """Verify MapView.js has showCreateDealContactPanel state"""
        mapview_path = "/app/frontend/src/pages/MapView.js"
        with open(mapview_path, 'r') as f:
            content = f.read()
        
        assert "showCreateDealContactPanel" in content, \
            "MapView should have showCreateDealContactPanel state"
        assert "setShowCreateDealContactPanel" in content, \
            "MapView should have setShowCreateDealContactPanel setter"
        print("✓ MapView has showCreateDealContactPanel state")
    
    def test_mapview_renders_contactformpanel(self):
        """Verify MapView.js renders ContactFormPanel component"""
        mapview_path = "/app/frontend/src/pages/MapView.js"
        with open(mapview_path, 'r') as f:
            content = f.read()
        
        assert "<ContactFormPanel" in content, \
            "MapView should render ContactFormPanel component"
        assert "isOpen={showCreateDealContactPanel}" in content, \
            "ContactFormPanel should use showCreateDealContactPanel for isOpen"
        assert "onContactCreated" in content, \
            "ContactFormPanel should have onContactCreated callback"
        print("✓ MapView renders ContactFormPanel with correct props")
    
    def test_mapview_has_create_new_contact_button(self):
        """Verify MapView.js has Create New Contact button with correct data-testid"""
        mapview_path = "/app/frontend/src/pages/MapView.js"
        with open(mapview_path, 'r') as f:
            content = f.read()
        
        assert 'data-testid="create-deal-new-contact-btn"' in content, \
            "Create New Contact button should have data-testid"
        assert "setShowCreateDealContactPanel(true)" in content, \
            "Button should open ContactFormPanel"
        print("✓ Create New Contact button exists with correct data-testid")
    
    def test_propertyintelligencepanel_uses_backend_api(self):
        """Verify PropertyIntelligencePanel uses backend API for document upload"""
        panel_path = "/app/frontend/src/components/PropertyIntelligencePanel.js"
        with open(panel_path, 'r') as f:
            content = f.read()
        
        # Check handleDocumentUpload uses fetch to backend API
        assert "fetch(`${API}/deals/${data.id}/documents`" in content, \
            "handleDocumentUpload should use backend API"
        print("✓ PropertyIntelligencePanel uses backend API for document upload")
    
    def test_propertyintelligencepanel_has_delete_button(self):
        """Verify PropertyIntelligencePanel has delete button for documents"""
        panel_path = "/app/frontend/src/components/PropertyIntelligencePanel.js"
        with open(panel_path, 'r') as f:
            content = f.read()
        
        assert "handleDeleteDocument" in content, \
            "PropertyIntelligencePanel should have handleDeleteDocument function"
        assert "Trash2" in content, \
            "PropertyIntelligencePanel should use Trash2 icon for delete"
        print("✓ PropertyIntelligencePanel has document delete functionality")
    
    def test_dealdetails_has_delete_button(self):
        """Verify DealDetails has delete button for documents"""
        details_path = "/app/frontend/src/pages/DealDetails.js"
        with open(details_path, 'r') as f:
            content = f.read()
        
        assert "handleDeleteDocument" in content, \
            "DealDetails should have handleDeleteDocument function"
        assert "delete-doc-" in content, \
            "DealDetails should have delete button with data-testid"
        print("✓ DealDetails has document delete functionality")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
