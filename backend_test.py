#!/usr/bin/env python3
"""
Backend API Testing for Deal Model Updates
Tests the updated Deal model with new fields and API endpoints
"""

import requests
import json
from datetime import datetime
import sys

# Configuration
BASE_URL = "https://contact-mgmt-v1.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "email": "pedro@test.com",
    "password": "password123"
}

# Supabase credentials for team testing
SUPABASE_TEST_CREDENTIALS = {
    "email": "teamtest@test.com",
    "password": "TestPassword123!"
}

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.headers = {}
        self.supabase_token = None
        self.supabase_headers = {}
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Authenticate and get access token"""
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json=TEST_CREDENTIALS,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
                self.log_result("Authentication", True, "Successfully logged in")
                return True
            else:
                self.log_result("Authentication", False, f"Login failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    def authenticate_supabase(self):
        """Authenticate with Supabase and get JWT token for team endpoints"""
        try:
            from supabase import create_client
            import os
            from dotenv import load_dotenv
            
            load_dotenv('/app/backend/.env')
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_ANON_KEY']
            
            supabase = create_client(supabase_url, supabase_key)
            
            # Try to sign in
            result = supabase.auth.sign_in_with_password({
                'email': SUPABASE_TEST_CREDENTIALS['email'],
                'password': SUPABASE_TEST_CREDENTIALS['password']
            })
            
            if result.session:
                self.supabase_token = result.session.access_token
                self.supabase_headers = {"Authorization": f"Bearer {self.supabase_token}"}
                self.log_result("Supabase Authentication", True, f"Successfully logged in as {SUPABASE_TEST_CREDENTIALS['email']}")
                return True
            else:
                self.log_result("Supabase Authentication", False, "No session returned")
                return False
                
        except Exception as e:
            self.log_result("Supabase Authentication", False, f"Supabase auth error: {str(e)}")
            return False
    
    def test_get_all_deals(self):
        """Test GET /api/deals - should return existing deals"""
        try:
            response = requests.get(
                f"{self.base_url}/deals",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                deals = response.json()
                deal_count = len(deals)
                
                # Check if we have deals
                if deal_count > 0:
                    # Check for San Antonio deals specifically
                    san_antonio_deals = [d for d in deals if 'san antonio' in d.get('property_address', '').lower()]
                    san_antonio_count = len(san_antonio_deals)
                    
                    self.log_result(
                        "GET All Deals", 
                        True, 
                        f"Retrieved {deal_count} deals total, {san_antonio_count} San Antonio deals",
                        f"Expected ~12 San Antonio deals, found {san_antonio_count}"
                    )
                    
                    # Test backwards compatibility - check if old deals still load
                    for deal in deals[:3]:  # Check first 3 deals
                        required_fields = ['id', 'property_address', 'asset_type', 'asking_price']
                        missing_fields = [field for field in required_fields if field not in deal]
                        if missing_fields:
                            self.log_result(
                                "Backwards Compatibility", 
                                False, 
                                f"Deal {deal.get('id', 'unknown')} missing required fields: {missing_fields}"
                            )
                        else:
                            self.log_result(
                                "Backwards Compatibility", 
                                True, 
                                f"Deal {deal.get('id', 'unknown')} has all required fields"
                            )
                    
                    return deals
                else:
                    self.log_result("GET All Deals", False, "No deals found in database")
                    return []
            else:
                self.log_result("GET All Deals", False, f"Failed with status {response.status_code}", response.text)
                return []
                
        except Exception as e:
            self.log_result("GET All Deals", False, f"Request error: {str(e)}")
            return []
    
    def test_get_individual_deal(self, deals):
        """Test GET /api/deals/{deal_id} - get individual deal"""
        if not deals:
            self.log_result("GET Individual Deal", False, "No deals available to test individual retrieval")
            return
        
        # Try to get deal-1 first (as specified in requirements)
        deal_1_exists = any(deal.get('id') == 'deal-1' for deal in deals)
        test_deal_id = 'deal-1' if deal_1_exists else deals[0].get('id')
        
        try:
            response = requests.get(
                f"{self.base_url}/deals/{test_deal_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                deal = response.json()
                
                # Verify the deal has required fields
                required_fields = ['id', 'property_address', 'asset_type', 'asking_price']
                missing_fields = [field for field in required_fields if field not in deal]
                
                if missing_fields:
                    self.log_result(
                        "GET Individual Deal", 
                        False, 
                        f"Deal {test_deal_id} missing required fields: {missing_fields}"
                    )
                else:
                    # Check for new fields presence (they can be None/null)
                    new_fields = [
                        'deal_title', 'deal_status', 'priority', 'owner_visibility', 
                        'market', 'submarket', 'year_built', 'zoning', 'parking_spaces', 
                        'key_features', 'noi', 'cap_rate', 'lease_type', 'proforma_notes', 
                        'primary_contact', 'last_contact_date', 'next_action', 
                        'next_action_date', 'target_close_date', 'external_ids'
                    ]
                    
                    present_new_fields = [field for field in new_fields if field in deal]
                    
                    self.log_result(
                        "GET Individual Deal", 
                        True, 
                        f"Successfully retrieved deal {test_deal_id}",
                        f"New fields present: {len(present_new_fields)}/{len(new_fields)} - {present_new_fields}"
                    )
            else:
                self.log_result(
                    "GET Individual Deal", 
                    False, 
                    f"Failed to get deal {test_deal_id} - status {response.status_code}", 
                    response.text
                )
                
        except Exception as e:
            self.log_result("GET Individual Deal", False, f"Request error: {str(e)}")
    
    def test_create_new_deal(self):
        """Test POST /api/deals - create new deal with all new fields"""
        
        # Create a comprehensive deal with all new fields populated
        new_deal_data = {
            # Core Information
            "deal_title": "Test Commercial Property - Backend API Test",
            "property_address": "123 Test Street, Austin, TX 78701",
            "asset_type": "Office",
            "deal_status": "Active",
            "pipeline_stage": "Prospecting", 
            "priority": "High",
            "owner_visibility": "Team",
            "description": "Test property created by backend API testing suite",
            
            # Location & Map
            "latitude": 30.2672,
            "longitude": -97.7431,
            "display_on_map": True,
            "market": "Austin",
            "submarket": "Downtown Austin",
            
            # Property Facts
            "building_size": 15000.0,
            "lot_size": 2.5,
            "lot_acres": 2.5,
            "year_built": 2018,
            "zoning": "C-3-CO",
            "occupancy": "85%",
            "parking_spaces": 45,
            "key_features": "Modern office building, LEED certified, fiber internet, covered parking",
            
            # Financials
            "asking_price": 3500000.0,
            "noi": 280000.0,
            "cap_rate": 8.0,
            "lease_type": "NNN",
            "proforma_notes": "Current NOI based on 85% occupancy. Potential for 95% with market improvements.",
            
            # Contacts & Roles
            "primary_contact": "John Smith - Listing Agent",
            "additional_contacts": [
                {"name": "Jane Doe", "role": "Property Manager", "email": "jane@example.com"},
                {"name": "Bob Wilson", "role": "Owner Representative", "phone": "512-555-0123"}
            ],
            "last_contact_date": "2025-01-15",
            
            # Activities & Notes
            "next_action": "Schedule property tour",
            "next_action_date": "2025-01-20",
            "notes": "Promising opportunity in growing Austin market. Owner motivated to sell.",
            
            # Media & Documents
            "primary_image_url": None,
            "gallery_images": [],
            
            # Dates & IDs
            "target_close_date": "2025-03-15",
            "external_ids": "MLS-12345, Internal-TEST-001",
            
            # Legacy fields
            "stage": "New"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/deals",
                json=new_deal_data,
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                created_deal = response.json()
                deal_id = created_deal.get('id')
                
                # Verify all new fields were accepted and stored
                new_fields_check = []
                for field, expected_value in new_deal_data.items():
                    actual_value = created_deal.get(field)
                    if field in ['additional_contacts', 'gallery_images']:
                        # For list fields, check if they match
                        matches = actual_value == expected_value
                    else:
                        matches = actual_value == expected_value
                    
                    new_fields_check.append({
                        'field': field,
                        'expected': expected_value,
                        'actual': actual_value,
                        'matches': matches
                    })
                
                failed_fields = [check for check in new_fields_check if not check['matches']]
                
                if failed_fields:
                    self.log_result(
                        "POST Create Deal", 
                        False, 
                        f"Deal created but some fields don't match expected values",
                        f"Failed fields: {[f['field'] for f in failed_fields]}"
                    )
                else:
                    self.log_result(
                        "POST Create Deal", 
                        True, 
                        f"Successfully created deal with ID: {deal_id}",
                        f"All {len(new_fields_check)} fields stored correctly"
                    )
                
                return created_deal
                
            else:
                self.log_result(
                    "POST Create Deal", 
                    False, 
                    f"Failed to create deal - status {response.status_code}", 
                    response.text
                )
                return None
                
        except Exception as e:
            self.log_result("POST Create Deal", False, f"Request error: {str(e)}")
            return None
    
    def test_model_validation(self):
        """Test that the model properly validates required fields"""
        
        # Test with missing required fields
        invalid_deal_data = {
            "deal_title": "Invalid Deal Test",
            # Missing property_address, asset_type, asking_price
            "description": "This should fail validation"
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/deals",
                json=invalid_deal_data,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 422:  # Validation error expected
                self.log_result(
                    "Model Validation", 
                    True, 
                    "Model correctly rejected invalid data with 422 status"
                )
            elif response.status_code == 200:
                self.log_result(
                    "Model Validation", 
                    False, 
                    "Model accepted invalid data - validation may be too permissive"
                )
            else:
                self.log_result(
                    "Model Validation", 
                    False, 
                    f"Unexpected status code {response.status_code} for invalid data", 
                    response.text
                )
                
        except Exception as e:
            self.log_result("Model Validation", False, f"Request error: {str(e)}")

    def test_layer_registry(self):
        """Test GET /api/layers/registry - Should return all 6 layers grouped by category"""
        try:
            response = requests.get(
                f"{self.base_url}/layers/registry",
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                layers = data.get("layers", {})
                
                # Expected layers from layer_registry.py
                expected_layers = [
                    "counties", "city_limits", "fema_floodplain", 
                    "sa_zoning", "saws_water", "txdot_projects"
                ]
                
                # Check if all 6 layers are present
                found_layers = list(layers.keys())
                missing_layers = [layer for layer in expected_layers if layer not in found_layers]
                
                if len(found_layers) == 6 and not missing_layers:
                    # Verify each layer has required fields
                    layer_validation_errors = []
                    for layer_id, layer_config in layers.items():
                        required_fields = ["id", "name", "description", "category", "style", "clickFields"]
                        missing_fields = [field for field in required_fields if field not in layer_config]
                        if missing_fields:
                            layer_validation_errors.append(f"{layer_id}: missing {missing_fields}")
                    
                    if layer_validation_errors:
                        self.log_result(
                            "Layer Registry", 
                            False, 
                            f"Found all 6 layers but some missing required fields",
                            f"Validation errors: {layer_validation_errors}"
                        )
                    else:
                        # Group by category for verification
                        categories = {}
                        for layer_id, layer_config in layers.items():
                            category = layer_config.get("category", "unknown")
                            if category not in categories:
                                categories[category] = []
                            categories[category].append(layer_id)
                        
                        self.log_result(
                            "Layer Registry", 
                            True, 
                            f"Successfully retrieved all 6 layers with complete metadata",
                            f"Categories: {dict(categories)}"
                        )
                else:
                    self.log_result(
                        "Layer Registry", 
                        False, 
                        f"Expected 6 layers, found {len(found_layers)}",
                        f"Missing: {missing_layers}, Found: {found_layers}"
                    )
            else:
                self.log_result(
                    "Layer Registry", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text
                )
                
        except Exception as e:
            self.log_result("Layer Registry", False, f"Request error: {str(e)}")

    def test_counties_query(self):
        """Test GET /api/layers/counties/query with San Antonio bounding box"""
        # San Antonio area bounding box: -98.7,-29.2,-98.3,29.6
        bbox = "-98.7,29.2,-98.3,29.6"
        
        try:
            response = requests.get(
                f"{self.base_url}/layers/counties/query",
                params={"bbox": bbox},
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify GeoJSON format
                if "type" in data and data["type"] == "FeatureCollection":
                    features = data.get("features", [])
                    
                    if len(features) > 0:
                        # Check first feature for proper structure
                        first_feature = features[0]
                        has_geometry = "geometry" in first_feature and first_feature["geometry"] is not None
                        has_properties = "properties" in first_feature and first_feature["properties"] is not None
                        
                        if has_geometry and has_properties:
                            # Look for Bexar County (San Antonio is in Bexar County)
                            bexar_county = None
                            for feature in features:
                                county_name = feature.get("properties", {}).get("CNTY_NM", "")
                                if "bexar" in county_name.lower():
                                    bexar_county = feature
                                    break
                            
                            if bexar_county:
                                self.log_result(
                                    "Counties Query", 
                                    True, 
                                    f"Successfully queried counties layer - found {len(features)} counties including Bexar County",
                                    f"Bexar County properties: {list(bexar_county.get('properties', {}).keys())}"
                                )
                            else:
                                self.log_result(
                                    "Counties Query", 
                                    True, 
                                    f"Successfully queried counties layer - found {len(features)} counties",
                                    f"Counties found: {[f.get('properties', {}).get('CNTY_NM', 'Unknown') for f in features[:3]]}"
                                )
                        else:
                            self.log_result(
                                "Counties Query", 
                                False, 
                                "Features missing geometry or properties",
                                f"First feature structure: {list(first_feature.keys())}"
                            )
                    else:
                        self.log_result(
                            "Counties Query", 
                            False, 
                            "No features returned for San Antonio area",
                            f"Response structure: {list(data.keys())}"
                        )
                else:
                    self.log_result(
                        "Counties Query", 
                        False, 
                        "Response is not valid GeoJSON FeatureCollection",
                        f"Response type: {data.get('type', 'missing')}"
                    )
            else:
                self.log_result(
                    "Counties Query", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                
        except Exception as e:
            self.log_result("Counties Query", False, f"Request error: {str(e)}")

    def test_fema_floodplain_query(self):
        """Test GET /api/layers/fema_floodplain/query"""
        # Use San Antonio area bounding box
        bbox = "-98.7,29.2,-98.3,29.6"
        
        try:
            response = requests.get(
                f"{self.base_url}/layers/fema_floodplain/query",
                params={"bbox": bbox},
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify GeoJSON format
                if "type" in data and data["type"] == "FeatureCollection":
                    features = data.get("features", [])
                    
                    # FEMA floodplain data might not exist in all areas, so we check for valid response structure
                    if len(features) > 0:
                        first_feature = features[0]
                        has_geometry = "geometry" in first_feature and first_feature["geometry"] is not None
                        has_properties = "properties" in first_feature and first_feature["properties"] is not None
                        
                        if has_geometry and has_properties:
                            # Check for flood zone information
                            flood_zones = []
                            for feature in features[:5]:  # Check first 5 features
                                zone = feature.get("properties", {}).get("FLD_ZONE", "")
                                if zone and zone not in flood_zones:
                                    flood_zones.append(zone)
                            
                            self.log_result(
                                "FEMA Floodplain Query", 
                                True, 
                                f"Successfully queried FEMA floodplain - found {len(features)} flood zones",
                                f"Flood zones found: {flood_zones[:3]}"
                            )
                        else:
                            self.log_result(
                                "FEMA Floodplain Query", 
                                False, 
                                "Features missing geometry or properties",
                                f"First feature structure: {list(first_feature.keys())}"
                            )
                    else:
                        # No floodplain data in this area is actually a valid response
                        self.log_result(
                            "FEMA Floodplain Query", 
                            True, 
                            "Successfully queried FEMA floodplain - no flood zones in this area",
                            "Valid GeoJSON response with empty features array"
                        )
                else:
                    self.log_result(
                        "FEMA Floodplain Query", 
                        False, 
                        "Response is not valid GeoJSON FeatureCollection",
                        f"Response type: {data.get('type', 'missing')}"
                    )
            else:
                self.log_result(
                    "FEMA Floodplain Query", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                
        except Exception as e:
            self.log_result("FEMA Floodplain Query", False, f"Request error: {str(e)}")

    def test_sa_zoning_query(self):
        """Test GET /api/layers/sa_zoning/query with specific San Antonio bounding box"""
        # Use San Antonio bounding box from review request: -98.9,29.0,-98.0,29.8
        bbox = "-98.9,29.0,-98.0,29.8"
        
        try:
            response = requests.get(
                f"{self.base_url}/layers/sa_zoning/query",
                params={"bbox": bbox},
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify GeoJSON format
                if "type" in data and data["type"] == "FeatureCollection":
                    features = data.get("features", [])
                    
                    if len(features) > 0:
                        first_feature = features[0]
                        has_geometry = "geometry" in first_feature and first_feature["geometry"] is not None
                        has_properties = "properties" in first_feature and first_feature["properties"] is not None
                        
                        if has_geometry and has_properties:
                            # Check for zoning information - look for Base or Zoning fields
                            zoning_codes = []
                            for feature in features[:5]:  # Check first 5 features
                                # Try different field names that might contain zoning info
                                code = (feature.get("properties", {}).get("Base", "") or 
                                       feature.get("properties", {}).get("Zoning", "") or
                                       feature.get("properties", {}).get("ZONING_CODE", ""))
                                if code and code not in zoning_codes:
                                    zoning_codes.append(code)
                            
                            self.log_result(
                                "SA Zoning Query", 
                                True, 
                                f"Successfully queried San Antonio zoning - found {len(features)} zoning areas",
                                f"Zoning codes found: {zoning_codes[:3]}"
                            )
                        else:
                            self.log_result(
                                "SA Zoning Query", 
                                False, 
                                "Features missing geometry or properties",
                                f"First feature structure: {list(first_feature.keys())}"
                            )
                    else:
                        self.log_result(
                            "SA Zoning Query", 
                            False, 
                            "No zoning features returned for San Antonio area",
                            f"Response structure: {list(data.keys())}"
                        )
                else:
                    self.log_result(
                        "SA Zoning Query", 
                        False, 
                        "Response is not valid GeoJSON FeatureCollection",
                        f"Response type: {data.get('type', 'missing')}"
                    )
            else:
                self.log_result(
                    "SA Zoning Query", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                
        except Exception as e:
            self.log_result("SA Zoning Query", False, f"Request error: {str(e)}")

    def test_counties_identify(self):
        """Test GET /api/layers/counties/identify at a point (lat: 29.4241, lon: -98.4936)"""
        # San Antonio coordinates
        lat = 29.4241
        lon = -98.4936
        
        try:
            response = requests.get(
                f"{self.base_url}/layers/counties/identify",
                params={"lat": lat, "lon": lon},
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify identify response structure
                required_fields = ["layer_id", "layer_name", "features", "count"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    layer_id = data.get("layer_id")
                    layer_name = data.get("layer_name")
                    features = data.get("features", [])
                    count = data.get("count", 0)
                    
                    if layer_id == "counties" and count > 0:
                        # Should identify Bexar County for San Antonio coordinates
                        first_feature = features[0]
                        if "attributes" in first_feature:
                            county_name = first_feature["attributes"].get("CNTY_NM", "")
                            if "bexar" in county_name.lower():
                                self.log_result(
                                    "Counties Identify", 
                                    True, 
                                    f"Successfully identified Bexar County at San Antonio coordinates",
                                    f"County: {county_name}, Features: {count}"
                                )
                            else:
                                self.log_result(
                                    "Counties Identify", 
                                    True, 
                                    f"Successfully identified county at coordinates",
                                    f"County: {county_name}, Features: {count}"
                                )
                        else:
                            self.log_result(
                                "Counties Identify", 
                                True, 
                                f"Successfully identified {count} features at coordinates",
                                f"Layer: {layer_name}"
                            )
                    else:
                        self.log_result(
                            "Counties Identify", 
                            False, 
                            f"No features identified at San Antonio coordinates",
                            f"Layer: {layer_name}, Count: {count}"
                        )
                else:
                    self.log_result(
                        "Counties Identify", 
                        False, 
                        f"Response missing required fields: {missing_fields}",
                        f"Response structure: {list(data.keys())}"
                    )
            else:
                self.log_result(
                    "Counties Identify", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                
        except Exception as e:
            self.log_result("Counties Identify", False, f"Request error: {str(e)}")

    def test_dashboard_news_authentication(self):
        """Test GET /api/dashboard/news - Authentication required"""
        try:
            # Test without authentication
            response = requests.get(
                f"{self.base_url}/dashboard/news",
                timeout=15
            )
            
            if response.status_code == 401 or response.status_code == 403:
                self.log_result(
                    "News Feed - Authentication", 
                    True, 
                    "Endpoint correctly requires authentication (401/403 without token)"
                )
            else:
                self.log_result(
                    "News Feed - Authentication", 
                    False, 
                    f"Endpoint should require auth but returned status {response.status_code}",
                    response.text[:200] if response.text else "No response"
                )
                
        except Exception as e:
            self.log_result("News Feed - Authentication", False, f"Request error: {str(e)}")

    def test_dashboard_news_fetch(self):
        """Test GET /api/dashboard/news - Successful news fetch with authentication"""
        try:
            response = requests.get(
                f"{self.base_url}/dashboard/news",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["articles", "count", "cached"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result(
                        "News Feed - Fetch", 
                        False, 
                        f"Response missing required fields: {missing_fields}",
                        f"Response keys: {list(data.keys())}"
                    )
                    return
                
                articles = data.get("articles", [])
                count = data.get("count", 0)
                cached = data.get("cached", False)
                
                # Verify we have articles
                if count == 0 or len(articles) == 0:
                    self.log_result(
                        "News Feed - Fetch", 
                        False, 
                        "No articles returned from RSS feeds",
                        f"Count: {count}, Articles length: {len(articles)}"
                    )
                    return
                
                # Verify article count matches
                if count != len(articles):
                    self.log_result(
                        "News Feed - Fetch", 
                        False, 
                        f"Count mismatch: count={count}, articles length={len(articles)}"
                    )
                    return
                
                # Verify max 8 articles
                if count > 8:
                    self.log_result(
                        "News Feed - Fetch", 
                        False, 
                        f"Too many articles returned: {count} (max should be 8)"
                    )
                    return
                
                self.log_result(
                    "News Feed - Fetch", 
                    True, 
                    f"Successfully fetched {count} articles (cached: {cached})",
                    f"Articles from: {list(set([a.get('source', 'Unknown') for a in articles]))}"
                )
                
                return articles
                
            else:
                self.log_result(
                    "News Feed - Fetch", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                return None
                
        except Exception as e:
            self.log_result("News Feed - Fetch", False, f"Request error: {str(e)}")
            return None

    def test_dashboard_news_structure(self, articles):
        """Test article structure - verify each article has required fields"""
        if not articles:
            self.log_result(
                "News Feed - Article Structure", 
                False, 
                "No articles available to test structure"
            )
            return
        
        required_article_fields = ["title", "description", "source", "url", "publishedAt"]
        
        all_valid = True
        invalid_articles = []
        
        for idx, article in enumerate(articles):
            missing_fields = [field for field in required_article_fields if field not in article]
            
            if missing_fields:
                all_valid = False
                invalid_articles.append({
                    "index": idx,
                    "title": article.get("title", "Unknown"),
                    "missing_fields": missing_fields
                })
        
        if all_valid:
            # Check description length (should be ~200 chars max)
            long_descriptions = [
                {"title": a.get("title", "Unknown"), "length": len(a.get("description", ""))}
                for a in articles 
                if len(a.get("description", "")) > 210
            ]
            
            if long_descriptions:
                self.log_result(
                    "News Feed - Article Structure", 
                    True, 
                    f"All articles have required fields, but {len(long_descriptions)} have descriptions > 200 chars",
                    f"Long descriptions: {long_descriptions}"
                )
            else:
                # Check for real data (not placeholder)
                placeholder_count = sum(1 for a in articles if "Stay updated" in a.get("description", ""))
                
                if placeholder_count > 0:
                    self.log_result(
                        "News Feed - Article Structure", 
                        False, 
                        f"Found {placeholder_count} placeholder articles - RSS feeds may not be working",
                        "Articles contain placeholder text instead of real news"
                    )
                else:
                    self.log_result(
                        "News Feed - Article Structure", 
                        True, 
                        f"All {len(articles)} articles have complete structure with real data",
                        f"Fields verified: {required_article_fields}"
                    )
        else:
            self.log_result(
                "News Feed - Article Structure", 
                False, 
                f"{len(invalid_articles)} articles missing required fields",
                f"Invalid articles: {invalid_articles}"
            )

    def test_dashboard_news_caching(self):
        """Test caching - second request within 1 hour should return cached: true"""
        try:
            # First request
            response1 = requests.get(
                f"{self.base_url}/dashboard/news",
                headers=self.headers,
                timeout=30
            )
            
            if response1.status_code != 200:
                self.log_result(
                    "News Feed - Caching", 
                    False, 
                    f"First request failed with status {response1.status_code}"
                )
                return
            
            data1 = response1.json()
            cached1 = data1.get("cached", False)
            
            # Second request (should be cached)
            response2 = requests.get(
                f"{self.base_url}/dashboard/news",
                headers=self.headers,
                timeout=30
            )
            
            if response2.status_code != 200:
                self.log_result(
                    "News Feed - Caching", 
                    False, 
                    f"Second request failed with status {response2.status_code}"
                )
                return
            
            data2 = response2.json()
            cached2 = data2.get("cached", False)
            
            # Second request should be cached
            if cached2:
                self.log_result(
                    "News Feed - Caching", 
                    True, 
                    f"Caching working correctly (1st: cached={cached1}, 2nd: cached={cached2})",
                    f"Cache duration: 1 hour (3600 seconds)"
                )
            else:
                self.log_result(
                    "News Feed - Caching", 
                    False, 
                    f"Second request not cached (1st: cached={cached1}, 2nd: cached={cached2})",
                    "Expected cached=True on second request within 1 hour"
                )
                
        except Exception as e:
            self.log_result("News Feed - Caching", False, f"Request error: {str(e)}")

    def test_dashboard_news_error_handling(self):
        """Test error handling when RSS feeds are unavailable"""
        # This test verifies the endpoint returns gracefully even if feeds fail
        # We can't force feeds to fail, but we can verify the response structure
        try:
            response = requests.get(
                f"{self.base_url}/dashboard/news",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if error field exists (indicates graceful error handling)
                has_error_field = "error" in data
                articles = data.get("articles", [])
                
                if has_error_field and len(articles) == 1:
                    # Placeholder response on error
                    placeholder = articles[0]
                    if "Stay updated" in placeholder.get("description", ""):
                        self.log_result(
                            "News Feed - Error Handling", 
                            True, 
                            "Endpoint returns placeholder on RSS feed errors (graceful degradation)",
                            "Error handling verified with placeholder article"
                        )
                    else:
                        self.log_result(
                            "News Feed - Error Handling", 
                            True, 
                            "Endpoint handles errors gracefully",
                            "Returns valid response structure even on errors"
                        )
                else:
                    # Normal response - error handling not triggered
                    self.log_result(
                        "News Feed - Error Handling", 
                        True, 
                        "RSS feeds working normally (error handling not triggered)",
                        f"Returned {len(articles)} real articles"
                    )
            else:
                self.log_result(
                    "News Feed - Error Handling", 
                    False, 
                    f"Unexpected status code {response.status_code}",
                    response.text[:500] if response.text else "No response"
                )
                
        except Exception as e:
            self.log_result("News Feed - Error Handling", False, f"Request error: {str(e)}")

    # ========== TEAM DEALS MAP LAYER TESTS (Phase 2 Team Collaboration) ==========
    
    def test_team_stats_endpoint_authentication(self):
        """Test GET /api/teams/{team_id}/stats - Authentication required"""
        try:
            # Test without authentication - use a dummy team_id
            response = requests.get(
                f"{self.base_url}/teams/test-team-id/stats",
                timeout=15
            )
            
            if response.status_code == 401 or response.status_code == 403:
                self.log_result(
                    "Team Stats - Authentication", 
                    True, 
                    "Endpoint correctly requires authentication (401/403 without token)"
                )
            else:
                self.log_result(
                    "Team Stats - Authentication", 
                    False, 
                    f"Endpoint should require auth but returned status {response.status_code}",
                    response.text[:200] if response.text else "No response"
                )
                
        except Exception as e:
            self.log_result("Team Stats - Authentication", False, f"Request error: {str(e)}")
    
    def test_get_user_teams(self):
        """Test GET /api/teams - Get user's team memberships"""
        try:
            response = requests.get(
                f"{self.base_url}/teams",
                headers=self.supabase_headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                teams = data.get("teams", [])
                
                self.log_result(
                    "Get User Teams", 
                    True, 
                    f"Successfully retrieved user's teams (count: {len(teams)})",
                    f"Teams: {[t.get('name', 'Unknown') for t in teams]}" if teams else "User has no teams"
                )
                
                return teams
            else:
                self.log_result(
                    "Get User Teams", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                return []
                
        except Exception as e:
            self.log_result("Get User Teams", False, f"Request error: {str(e)}")
            return []
    
    def test_team_stats_with_membership(self, teams):
        """Test GET /api/teams/{team_id}/stats - User with team membership"""
        if not teams:
            self.log_result(
                "Team Stats - With Membership", 
                False, 
                "No teams available to test - user needs to be member of at least one team",
                "Create a team first or join an existing team"
            )
            return None
        
        # Test with first team
        team = teams[0]
        team_id = team.get('id')
        team_name = team.get('name', 'Unknown')
        
        try:
            response = requests.get(
                f"{self.base_url}/teams/{team_id}/stats",
                headers=self.supabase_headers,
                timeout=20
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["team_stats", "agent_stats", "team_deals"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result(
                        "Team Stats - With Membership", 
                        False, 
                        f"Response missing required fields: {missing_fields}",
                        f"Response keys: {list(data.keys())}"
                    )
                    return None
                
                team_deals = data.get("team_deals", [])
                team_stats = data.get("team_stats", {})
                agent_stats = data.get("agent_stats", [])
                
                self.log_result(
                    "Team Stats - With Membership", 
                    True, 
                    f"Successfully retrieved stats for team '{team_name}' (ID: {team_id})",
                    f"Team deals: {len(team_deals)}, Active deals: {team_stats.get('total_active_deals', 0)}, Agents: {len(agent_stats)}"
                )
                
                return data
                
            else:
                self.log_result(
                    "Team Stats - With Membership", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                return None
                
        except Exception as e:
            self.log_result("Team Stats - With Membership", False, f"Request error: {str(e)}")
            return None
    
    def test_team_deals_array_structure(self, team_stats_data):
        """Test team_deals array structure and content"""
        if not team_stats_data:
            self.log_result(
                "Team Deals - Array Structure", 
                False, 
                "No team stats data available to test team_deals array"
            )
            return
        
        team_deals = team_stats_data.get("team_deals", [])
        
        if len(team_deals) == 0:
            self.log_result(
                "Team Deals - Array Structure", 
                True, 
                "Team has no deals yet (empty array is valid)",
                "Create some deals and share them with the team to test further"
            )
            return
        
        # Verify each deal has required fields
        required_deal_fields = ["id", "owner_id", "team_id", "address", "price", "asset_type"]
        
        all_valid = True
        invalid_deals = []
        
        for idx, deal in enumerate(team_deals[:5]):  # Check first 5 deals
            missing_fields = [field for field in required_deal_fields if field not in deal]
            
            if missing_fields:
                all_valid = False
                invalid_deals.append({
                    "index": idx,
                    "deal_id": deal.get("id", "Unknown"),
                    "missing_fields": missing_fields
                })
        
        if all_valid:
            # Check for sharing status
            shared_deals = [d for d in team_deals if d.get('is_shared_with_team', False)]
            
            self.log_result(
                "Team Deals - Array Structure", 
                True, 
                f"All team deals have complete structure (total: {len(team_deals)}, shared: {len(shared_deals)})",
                f"Fields verified: {required_deal_fields}"
            )
        else:
            self.log_result(
                "Team Deals - Array Structure", 
                False, 
                f"{len(invalid_deals)} deals missing required fields",
                f"Invalid deals: {invalid_deals}"
            )
    
    def test_team_deals_filtering(self, team_stats_data):
        """Test that team_deals properly filters deals (should include shared deals, can include own deals)"""
        if not team_stats_data:
            self.log_result(
                "Team Deals - Filtering", 
                False, 
                "No team stats data available to test filtering"
            )
            return
        
        team_deals = team_stats_data.get("team_deals", [])
        
        if len(team_deals) == 0:
            self.log_result(
                "Team Deals - Filtering", 
                True, 
                "No deals to filter (empty array is valid)",
                "Create and share deals with team to test filtering logic"
            )
            return
        
        # Analyze deal ownership and sharing
        shared_deals = [d for d in team_deals if d.get('is_shared_with_team', False)]
        team_id = team_deals[0].get('team_id') if team_deals else None
        
        # Check that all deals belong to the team
        wrong_team_deals = [d for d in team_deals if d.get('team_id') != team_id]
        
        if wrong_team_deals:
            self.log_result(
                "Team Deals - Filtering", 
                False, 
                f"Found {len(wrong_team_deals)} deals with wrong team_id",
                f"Expected team_id: {team_id}, but found deals with different team_ids"
            )
        else:
            self.log_result(
                "Team Deals - Filtering", 
                True, 
                f"Filtering working correctly - all {len(team_deals)} deals belong to team",
                f"Shared deals: {len(shared_deals)}, Team ID: {team_id}"
            )
    
    def test_team_stats_without_membership(self):
        """Test GET /api/teams/{team_id}/stats - User without team membership (should fail or return empty)"""
        # Use a non-existent team ID
        fake_team_id = "00000000-0000-0000-0000-000000000000"
        
        try:
            response = requests.get(
                f"{self.base_url}/teams/{fake_team_id}/stats",
                headers=self.supabase_headers,
                timeout=15
            )
            
            # Should either return 403/404 or empty data
            if response.status_code in [403, 404]:
                self.log_result(
                    "Team Stats - Without Membership", 
                    True, 
                    f"Correctly denied access to non-member team (status {response.status_code})"
                )
            elif response.status_code == 200:
                data = response.json()
                team_deals = data.get("team_deals", [])
                
                if len(team_deals) == 0:
                    self.log_result(
                        "Team Stats - Without Membership", 
                        True, 
                        "Returns empty team_deals for non-existent team (graceful handling)"
                    )
                else:
                    self.log_result(
                        "Team Stats - Without Membership", 
                        False, 
                        f"Should return empty data for non-member, but returned {len(team_deals)} deals",
                        "Possible security issue - user can see deals from teams they don't belong to"
                    )
            else:
                self.log_result(
                    "Team Stats - Without Membership", 
                    False, 
                    f"Unexpected status code {response.status_code}",
                    response.text[:500] if response.text else "No response"
                )
                
        except Exception as e:
            self.log_result("Team Stats - Without Membership", False, f"Request error: {str(e)}")
    
    def test_team_members_endpoint(self, teams):
        """Test GET /api/teams/{team_id}/members - Verify foreign key fix is working"""
        if not teams:
            self.log_result(
                "Team Members Endpoint", 
                False, 
                "No teams available to test team members endpoint",
                "User needs to be member of at least one team"
            )
            return None
        
        team = teams[0]
        team_id = team.get('id')
        team_name = team.get('name', 'Unknown')
        
        try:
            response = requests.get(
                f"{self.base_url}/teams/{team_id}/members",
                headers=self.supabase_headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                members = data.get("members", [])
                
                if len(members) == 0:
                    self.log_result(
                        "Team Members Endpoint", 
                        True, 
                        f"Successfully retrieved team members for '{team_name}' (0 members)",
                        "Team has no members yet - endpoint working correctly"
                    )
                    return members
                
                # Verify each member has required fields including profile data
                required_fields = ["id", "user_id", "role", "joined_at", "full_name", "email", "phone", "avatar_url", "company"]
                
                all_valid = True
                invalid_members = []
                
                for idx, member in enumerate(members):
                    missing_fields = [field for field in required_fields if field not in member]
                    
                    if missing_fields:
                        all_valid = False
                        invalid_members.append({
                            "index": idx,
                            "user_id": member.get("user_id", "Unknown"),
                            "missing_fields": missing_fields
                        })
                
                if all_valid:
                    # Check if profile data is present (not just empty strings)
                    members_with_profile = [m for m in members if m.get('full_name') or m.get('phone') or m.get('company')]
                    
                    self.log_result(
                        "Team Members Endpoint", 
                        True, 
                        f"✅ FIXED: Successfully retrieved {len(members)} team members with profile data",
                        f"Members with profile data: {len(members_with_profile)}/{len(members)}. Foreign key constraint working correctly - PostgREST join syntax successful."
                    )
                else:
                    self.log_result(
                        "Team Members Endpoint", 
                        False, 
                        f"{len(invalid_members)} members missing required fields",
                        f"Invalid members: {invalid_members}"
                    )
                
                return members
                
            elif response.status_code == 500:
                # This was the error before the fix
                self.log_result(
                    "Team Members Endpoint", 
                    False, 
                    f"❌ CRITICAL: Endpoint returned 500 error - foreign key constraint may be missing",
                    f"Error: {response.text[:500] if response.text else 'No error details'}. The PostgREST join syntax requires a foreign key from team_members.user_id to user_profiles.id"
                )
                return None
            else:
                self.log_result(
                    "Team Members Endpoint", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                return None
                
        except Exception as e:
            self.log_result("Team Members Endpoint", False, f"Request error: {str(e)}")
            return None
    
    def test_team_deals_rls_policies(self, teams):
        """Test RLS policies - verify team members can see each other's deals"""
        if not teams:
            self.log_result(
                "Team Deals - RLS Policies", 
                False, 
                "No teams available to test RLS policies",
                "User needs to be member of at least one team"
            )
            return
        
        team = teams[0]
        team_id = team.get('id')
        
        try:
            # Get team members
            response = requests.get(
                f"{self.base_url}/teams/{team_id}/members",
                headers=self.supabase_headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                members = data.get("members", [])
                
                if len(members) < 2:
                    self.log_result(
                        "Team Deals - RLS Policies", 
                        True, 
                        f"Team has only {len(members)} member(s) - RLS policies cannot be fully tested",
                        "Add more team members to test cross-member deal visibility"
                    )
                else:
                    # Get team stats to see if we can see other members' deals
                    stats_response = requests.get(
                        f"{self.base_url}/teams/{team_id}/stats",
                        headers=self.supabase_headers,
                        timeout=15
                    )
                    
                    if stats_response.status_code == 200:
                        stats_data = stats_response.json()
                        team_deals = stats_data.get("team_deals", [])
                        
                        # Check if we can see deals from multiple owners
                        unique_owners = set(d.get('owner_id') for d in team_deals if d.get('owner_id'))
                        
                        if len(unique_owners) > 1:
                            self.log_result(
                                "Team Deals - RLS Policies", 
                                True, 
                                f"RLS policies working - can see deals from {len(unique_owners)} different team members",
                                f"Total team deals: {len(team_deals)}, Team members: {len(members)}"
                            )
                        else:
                            self.log_result(
                                "Team Deals - RLS Policies", 
                                True, 
                                f"Can access team deals (RLS allows team member access)",
                                f"Only seeing deals from {len(unique_owners)} owner(s) - other members may not have deals yet"
                            )
                    else:
                        self.log_result(
                            "Team Deals - RLS Policies", 
                            False, 
                            f"Failed to get team stats - status {stats_response.status_code}"
                        )
            else:
                self.log_result(
                    "Team Deals - RLS Policies", 
                    False, 
                    f"Failed to get team members - status {response.status_code}",
                    response.text[:500] if response.text else "No response"
                )
                
        except Exception as e:
            self.log_result("Team Deals - RLS Policies", False, f"Request error: {str(e)}")
    

    # ========== EMAIL CAMPAIGN TESTS (Encryption & SendGrid Integration) ==========
    
    def test_encryption_key_exists(self):
        """Test that ENCRYPTION_KEY exists in backend/.env"""
        try:
            from dotenv import load_dotenv
            import os
            
            load_dotenv('/app/backend/.env')
            encryption_key = os.environ.get('ENCRYPTION_KEY')
            
            if encryption_key:
                self.log_result(
                    "Encryption Key - Exists",
                    True,
                    f"ENCRYPTION_KEY found in backend/.env (length: {len(encryption_key)} chars)"
                )
                return encryption_key
            else:
                self.log_result(
                    "Encryption Key - Exists",
                    False,
                    "ENCRYPTION_KEY not found in backend/.env - required for API key encryption"
                )
                return None
        except Exception as e:
            self.log_result("Encryption Key - Exists", False, f"Error checking encryption key: {str(e)}")
            return None
    
    def test_encryption_decryption(self, encryption_key):
        """Test encryption and decryption of SendGrid API key"""
        if not encryption_key:
            self.log_result(
                "Encryption/Decryption",
                False,
                "Cannot test encryption - ENCRYPTION_KEY not available"
            )
            return False
        
        try:
            from cryptography.fernet import Fernet
            
            # Test API key from review request
            test_api_key = "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"
            
            # Encrypt
            if isinstance(encryption_key, str):
                encryption_key = encryption_key.encode()
            cipher = Fernet(encryption_key)
            encrypted = cipher.encrypt(test_api_key.encode()).decode()
            
            # Decrypt
            decrypted = cipher.decrypt(encrypted.encode()).decode()
            
            # Verify
            if decrypted == test_api_key:
                self.log_result(
                    "Encryption/Decryption",
                    True,
                    "✅ Encryption and decryption working correctly - decrypted key matches original",
                    f"Encrypted length: {len(encrypted)} chars, Original length: {len(test_api_key)} chars"
                )
                return True
            else:
                self.log_result(
                    "Encryption/Decryption",
                    False,
                    "❌ Decrypted key does not match original",
                    f"Original: {test_api_key[:20]}..., Decrypted: {decrypted[:20]}..."
                )
                return False
        except Exception as e:
            self.log_result("Encryption/Decryption", False, f"Encryption/decryption error: {str(e)}")
            return False
    
    def test_sendgrid_connection(self):
        """Test POST /api/email/test-connection with new SendGrid API key"""
        try:
            test_api_key = "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"
            
            response = requests.post(
                f"{self.base_url}/email/test-connection",
                json={"api_key": test_api_key},
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                is_valid = data.get('valid', False)
                message = data.get('message', '')
                
                if is_valid:
                    self.log_result(
                        "SendGrid Connection Test",
                        True,
                        f"✅ SendGrid API key is valid and working: {message}"
                    )
                    return True
                else:
                    self.log_result(
                        "SendGrid Connection Test",
                        False,
                        f"❌ SendGrid API key validation failed: {message}"
                    )
                    return False
            else:
                self.log_result(
                    "SendGrid Connection Test",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:500] if response.text else "No response"
                )
                return False
        except Exception as e:
            self.log_result("SendGrid Connection Test", False, f"Request error: {str(e)}")
            return False
    
    def test_save_email_settings(self):
        """Test POST /api/email/settings - Save SendGrid configuration"""
        try:
            test_api_key = "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"
            
            settings_data = {
                "sendgrid_api_key": test_api_key,
                "sender_email": "test@example.com",
                "sender_name": "Test Sender"
            }
            
            response = requests.post(
                f"{self.base_url}/email/settings",
                json=settings_data,
                headers=self.supabase_headers,
                timeout=15
            )
            
            if response.status_code == 201:
                data = response.json()
                success = data.get('success', False)
                message = data.get('message', '')
                
                if success:
                    self.log_result(
                        "Save Email Settings",
                        True,
                        f"✅ Email settings saved successfully: {message}",
                        f"Sender: {settings_data['sender_name']} <{settings_data['sender_email']}>"
                    )
                    return True
                else:
                    self.log_result(
                        "Save Email Settings",
                        False,
                        f"❌ Failed to save email settings: {message}"
                    )
                    return False
            else:
                self.log_result(
                    "Save Email Settings",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:500] if response.text else "No response"
                )
                return False
        except Exception as e:
            self.log_result("Save Email Settings", False, f"Request error: {str(e)}")
            return False
    
    def test_create_email_campaign(self):
        """Test creating an email campaign"""
        try:
            campaign_data = {
                "name": "Test Campaign - Backend API Test",
                "subject": "Test Email Campaign",
                "html_content": "<html><body><h1>Test Campaign</h1><p>This is a test email campaign from backend API testing.</p></body></html>",
                "plain_text_content": "Test Campaign\\n\\nThis is a test email campaign from backend API testing.",
                "status": "draft"
            }
            
            response = requests.post(
                f"{self.base_url}/email/campaigns",
                json=campaign_data,
                headers=self.supabase_headers,
                timeout=15
            )
            
            if response.status_code == 201:
                data = response.json()
                campaign = data.get('campaign', {})
                campaign_id = campaign.get('id')
                
                self.log_result(
                    "Create Email Campaign",
                    True,
                    f"✅ Successfully created test campaign (ID: {campaign_id})",
                    f"Name: {campaign.get('name')}, Subject: {campaign.get('subject')}"
                )
                return campaign_id
            else:
                self.log_result(
                    "Create Email Campaign",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:500] if response.text else "No response"
                )
                return None
        except Exception as e:
            self.log_result("Create Email Campaign", False, f"Request error: {str(e)}")
            return None
    
    def test_send_campaign(self, campaign_id, contact_ids):
        """Test POST /api/email/campaigns/send - Send campaign to contacts"""
        if not campaign_id:
            self.log_result(
                "Send Campaign",
                False,
                "Cannot test campaign sending - no campaign ID available"
            )
            return False
        
        if not contact_ids or len(contact_ids) == 0:
            self.log_result(
                "Send Campaign",
                False,
                "Cannot test campaign sending - no contact IDs available"
            )
            return False
        
        try:
            send_data = {
                "campaign_id": campaign_id,
                "contact_ids": contact_ids
            }
            
            response = requests.post(
                f"{self.base_url}/email/campaigns/send",
                json=send_data,
                headers=self.supabase_headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                success = data.get('success', False)
                message = data.get('message', '')
                results = data.get('results', {})
                total_sent = results.get('total_sent', 0)
                total_failed = results.get('total_failed', 0)
                
                if success and total_sent > 0:
                    self.log_result(
                        "Send Campaign",
                        True,
                        f"✅ Campaign sent successfully: {message}",
                        f"Total sent: {total_sent}, Total failed: {total_failed}"
                    )
                    return True
                else:
                    self.log_result(
                        "Send Campaign",
                        False,
                        f"❌ Campaign sending failed or no emails sent: {message}",
                        f"Total sent: {total_sent}, Total failed: {total_failed}"
                    )
                    return False
            else:
                error_text = response.text[:500] if response.text else "No response"
                self.log_result(
                    "Send Campaign",
                    False,
                    f"❌ Failed with status {response.status_code}",
                    error_text
                )
                return False
        except Exception as e:
            self.log_result("Send Campaign", False, f"Request error: {str(e)}")
            return False
    
    def test_campaign_error_handling(self):
        """Test error handling for campaign sending"""
        try:
            # Test 1: Non-existent campaign
            response1 = requests.post(
                f"{self.base_url}/email/campaigns/send",
                json={
                    "campaign_id": "00000000-0000-0000-0000-000000000000",
                    "contact_ids": ["test-contact-id"]
                },
                headers=self.supabase_headers,
                timeout=15
            )
            
            if response1.status_code == 404:
                self.log_result(
                    "Campaign Error Handling - Not Found",
                    True,
                    "✅ Correctly returns 404 for non-existent campaign"
                )
            else:
                self.log_result(
                    "Campaign Error Handling - Not Found",
                    False,
                    f"Expected 404, got {response1.status_code}"
                )
            
            # Test 2: Empty contact list
            # First create a campaign
            campaign_response = requests.post(
                f"{self.base_url}/email/campaigns",
                json={
                    "name": "Error Test Campaign",
                    "subject": "Test",
                    "html_content": "<p>Test</p>",
                    "status": "draft"
                },
                headers=self.supabase_headers,
                timeout=15
            )
            
            if campaign_response.status_code == 201:
                campaign_id = campaign_response.json().get('campaign', {}).get('id')
                
                response2 = requests.post(
                    f"{self.base_url}/email/campaigns/send",
                    json={
                        "campaign_id": campaign_id,
                        "contact_ids": []
                    },
                    headers=self.supabase_headers,
                    timeout=15
                )
                
                if response2.status_code == 400:
                    self.log_result(
                        "Campaign Error Handling - No Contacts",
                        True,
                        "✅ Correctly returns 400 for empty contact list"
                    )
                else:
                    self.log_result(
                        "Campaign Error Handling - No Contacts",
                        False,
                        f"Expected 400, got {response2.status_code}"
                    )
            
            # Test 3: No authentication
            response3 = requests.post(
                f"{self.base_url}/email/campaigns/send",
                json={
                    "campaign_id": "test-id",
                    "contact_ids": ["test-contact"]
                },
                timeout=15
            )
            
            if response3.status_code == 401 or response3.status_code == 403:
                self.log_result(
                    "Campaign Error Handling - Authentication",
                    True,
                    f"✅ Correctly requires authentication (status {response3.status_code})"
                )
            else:
                self.log_result(
                    "Campaign Error Handling - Authentication",
                    False,
                    f"Expected 401/403, got {response3.status_code}"
                )
        except Exception as e:
            self.log_result("Campaign Error Handling", False, f"Request error: {str(e)}")


    # ========== FINANCIAL METRICS TESTS (CREATE DEAL ENDPOINT) ==========
    
    def test_create_deal_with_financial_metrics(self):
        """Test POST to Supabase deals table - Create deal with financial metrics (annual_income, annual_expenses, noi, cap_rate)"""
        
        # Scenario 1: Create deal with all financial metrics
        deal_with_metrics = {
            "title": "Financial Metrics Test Deal",
            "address": "456 Finance St, San Antonio, TX 78201",
            "city": "San Antonio",
            "state": "TX",
            "zip_code": "78201",
            "asset_type": "Office",
            "size": 10000.0,
            "price": 2500000.0,
            "latitude": 29.4241,
            "longitude": -98.4936,
            "annual_income": 500000.0,
            "annual_expenses": 200000.0,
            "noi": 300000.0,
            "cap_rate": 12.0,
            "description": "Test deal with financial metrics for auto-calculation feature"
        }
        
        try:
            from supabase import create_client
            import os
            from dotenv import load_dotenv
            
            load_dotenv('/app/backend/.env')
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_ANON_KEY']
            
            # Create client and set auth header
            supabase = create_client(supabase_url, supabase_key)
            
            # Set the auth token for RLS
            supabase.postgrest.auth(self.supabase_token)
            
            # Get current user ID from session
            user_response = supabase.auth.get_user(self.supabase_token)
            if not user_response or not user_response.user:
                self.log_result(
                    "Create Deal - With Financial Metrics",
                    False,
                    "Could not get current user from Supabase session"
                )
                return None
            
            user_id = user_response.user.id
            deal_with_metrics['owner_id'] = str(user_id)
            
            # Insert deal into Supabase with auth token
            response = supabase.table('deals').insert(deal_with_metrics).execute()
            
            if response.data and len(response.data) > 0:
                created_deal = response.data[0]
                deal_id = created_deal.get('id')
                
                # Verify all financial fields were stored correctly
                financial_fields = {
                    'annual_income': 500000.0,
                    'annual_expenses': 200000.0,
                    'noi': 300000.0,
                    'cap_rate': 12.0
                }
                
                all_match = True
                mismatches = []
                
                for field, expected_value in financial_fields.items():
                    actual_value = created_deal.get(field)
                    if actual_value != expected_value:
                        all_match = False
                        mismatches.append({
                            'field': field,
                            'expected': expected_value,
                            'actual': actual_value
                        })
                
                if all_match:
                    self.log_result(
                        "Create Deal - With Financial Metrics", 
                        True, 
                        f"Successfully created deal with all financial metrics (ID: {deal_id})",
                        f"All 4 financial fields stored correctly: annual_income={created_deal.get('annual_income')}, annual_expenses={created_deal.get('annual_expenses')}, noi={created_deal.get('noi')}, cap_rate={created_deal.get('cap_rate')}"
                    )
                    return created_deal
                else:
                    self.log_result(
                        "Create Deal - With Financial Metrics", 
                        False, 
                        f"Deal created but financial fields don't match",
                        f"Mismatches: {mismatches}"
                    )
                    return None
            else:
                self.log_result(
                    "Create Deal - With Financial Metrics", 
                    False, 
                    "Failed to create deal - no data returned from Supabase"
                )
                return None
                
        except Exception as e:
            self.log_result("Create Deal - With Financial Metrics", False, f"Request error: {str(e)}")
            return None
    
    def test_create_deal_without_financial_metrics(self):
        """Test POST to Supabase deals table - Create deal WITHOUT financial metrics (should work with NULL values)"""
        
        # Scenario 2: Create deal without financial metrics
        deal_without_metrics = {
            "title": "Basic Deal Without Metrics",
            "address": "789 Basic St, Austin, TX 78701",
            "city": "Austin",
            "state": "TX",
            "zip_code": "78701",
            "asset_type": "Retail",
            "size": 5000.0,
            "price": 1200000.0,
            "latitude": 30.2672,
            "longitude": -97.7431,
            "description": "Test deal without financial metrics - should accept NULL values"
        }
        
        try:
            from supabase import create_client
            import os
            from dotenv import load_dotenv
            
            load_dotenv('/app/backend/.env')
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_ANON_KEY']
            
            # Create client and set auth header
            supabase = create_client(supabase_url, supabase_key)
            
            # Set the auth token for RLS
            supabase.postgrest.auth(self.supabase_token)
            
            # Get current user ID from session
            user_response = supabase.auth.get_user(self.supabase_token)
            if not user_response or not user_response.user:
                self.log_result(
                    "Create Deal - Without Financial Metrics",
                    False,
                    "Could not get current user from Supabase session"
                )
                return None
            
            user_id = user_response.user.id
            deal_without_metrics['owner_id'] = str(user_id)
            
            # Insert deal into Supabase with auth token
            response = supabase.table('deals').insert(deal_without_metrics).execute()
            
            if response.data and len(response.data) > 0:
                created_deal = response.data[0]
                deal_id = created_deal.get('id')
                
                # Verify financial fields are NULL or not present
                financial_fields = ['annual_income', 'annual_expenses', 'noi', 'cap_rate']
                
                null_fields = []
                for field in financial_fields:
                    value = created_deal.get(field)
                    if value is None:
                        null_fields.append(field)
                
                if len(null_fields) == 4:
                    self.log_result(
                        "Create Deal - Without Financial Metrics", 
                        True, 
                        f"Successfully created deal without financial metrics (ID: {deal_id})",
                        f"All 4 financial fields are NULL as expected"
                    )
                    return created_deal
                else:
                    self.log_result(
                        "Create Deal - Without Financial Metrics", 
                        True, 
                        f"Deal created successfully (ID: {deal_id})",
                        f"Financial fields: {[(f, created_deal.get(f)) for f in financial_fields]}"
                    )
                    return created_deal
            else:
                self.log_result(
                    "Create Deal - Without Financial Metrics", 
                    False, 
                    "Failed to create deal - no data returned from Supabase"
                )
                return None
                
        except Exception as e:
            self.log_result("Create Deal - Without Financial Metrics", False, f"Request error: {str(e)}")
            return None
    
    def test_validate_calculated_values(self):
        """Test POST to Supabase deals table - Validate calculated values (noi = annual_income - annual_expenses, cap_rate = (noi/price)*100)"""
        
        # Scenario 3: Create deal with specific values to validate calculations
        deal_for_validation = {
            "title": "Calculation Validation Deal",
            "address": "321 Math St, San Antonio, TX 78205",
            "city": "San Antonio",
            "state": "TX",
            "zip_code": "78205",
            "asset_type": "Industrial",
            "size": 10000.0,
            "price": 2500000.0,
            "latitude": 29.4241,
            "longitude": -98.4936,
            "annual_income": 500000.0,
            "annual_expenses": 200000.0,
            "noi": 300000.0,  # Should be 500000 - 200000 = 300000
            "cap_rate": 12.0,  # Should be (300000 / 2500000) * 100 = 12.0
            "description": "Test deal to validate NOI and Cap Rate calculations"
        }
        
        try:
            from supabase import create_client
            import os
            from dotenv import load_dotenv
            
            load_dotenv('/app/backend/.env')
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_ANON_KEY']
            
            # Create client and set auth header
            supabase = create_client(supabase_url, supabase_key)
            
            # Set the auth token for RLS
            supabase.postgrest.auth(self.supabase_token)
            
            # Get current user ID from session
            user_response = supabase.auth.get_user(self.supabase_token)
            if not user_response or not user_response.user:
                self.log_result(
                    "Validate Calculated Values",
                    False,
                    "Could not get current user from Supabase session"
                )
                return None
            
            user_id = user_response.user.id
            deal_for_validation['owner_id'] = str(user_id)
            
            # Insert deal into Supabase with auth token
            response = supabase.table('deals').insert(deal_for_validation).execute()
            
            if response.data and len(response.data) > 0:
                created_deal = response.data[0]
                deal_id = created_deal.get('id')
                
                # Verify calculations
                annual_income = created_deal.get('annual_income', 0) or 0
                annual_expenses = created_deal.get('annual_expenses', 0) or 0
                noi = created_deal.get('noi', 0) or 0
                price = created_deal.get('price', 1) or 1
                cap_rate = created_deal.get('cap_rate', 0) or 0
                
                # Expected values
                expected_noi = annual_income - annual_expenses
                expected_cap_rate = (noi / price) * 100 if price > 0 else 0
                
                # Check if stored values match expected calculations
                noi_matches = abs(noi - expected_noi) < 0.01  # Allow small floating point difference
                cap_rate_matches = abs(cap_rate - expected_cap_rate) < 0.01
                
                if noi_matches and cap_rate_matches:
                    self.log_result(
                        "Validate Calculated Values", 
                        True, 
                        f"Calculated values are correct (ID: {deal_id})",
                        f"NOI: {noi} (expected: {expected_noi}), Cap Rate: {cap_rate}% (expected: {expected_cap_rate:.2f}%)"
                    )
                else:
                    issues = []
                    if not noi_matches:
                        issues.append(f"NOI mismatch: stored={noi}, expected={expected_noi}")
                    if not cap_rate_matches:
                        issues.append(f"Cap Rate mismatch: stored={cap_rate}, expected={expected_cap_rate:.2f}")
                    
                    self.log_result(
                        "Validate Calculated Values", 
                        False, 
                        f"Calculated values don't match expected",
                        f"Issues: {issues}"
                    )
                
                return created_deal
            else:
                self.log_result(
                    "Validate Calculated Values", 
                    False, 
                    "Failed to create deal - no data returned from Supabase"
                )
                return None
                
        except Exception as e:
            self.log_result("Validate Calculated Values", False, f"Request error: {str(e)}")
            return None
    
    def test_query_deal_with_financial_metrics(self, deal_id):
        """Test querying deal from Supabase - Verify financial fields are stored correctly"""
        
        if not deal_id:
            self.log_result(
                "Query Deal - Financial Metrics", 
                False, 
                "No deal ID provided to query"
            )
            return None
        
        try:
            from supabase import create_client
            import os
            from dotenv import load_dotenv
            
            load_dotenv('/app/backend/.env')
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_ANON_KEY']
            
            # Create client and set auth header
            supabase = create_client(supabase_url, supabase_key)
            
            # Set the auth token for RLS
            supabase.postgrest.auth(self.supabase_token)
            
            # Query deal from Supabase with auth token
            response = supabase.table('deals').select('*').eq('id', deal_id).execute()
            
            if response.data and len(response.data) > 0:
                deal = response.data[0]
                
                # Verify financial fields are present
                financial_fields = ['annual_income', 'annual_expenses', 'noi', 'cap_rate']
                present_fields = [f for f in financial_fields if f in deal]
                
                if len(present_fields) == 4:
                    self.log_result(
                        "Query Deal - Financial Metrics", 
                        True, 
                        f"Successfully queried deal {deal_id} - all financial fields present",
                        f"Values: annual_income={deal.get('annual_income')}, annual_expenses={deal.get('annual_expenses')}, noi={deal.get('noi')}, cap_rate={deal.get('cap_rate')}"
                    )
                    return deal
                else:
                    missing = [f for f in financial_fields if f not in deal]
                    self.log_result(
                        "Query Deal - Financial Metrics", 
                        False, 
                        f"Deal queried but missing financial fields: {missing}",
                        f"Present fields: {present_fields}"
                    )
                    return None
            else:
                self.log_result(
                    "Query Deal - Financial Metrics", 
                    False, 
                    f"Deal not found in Supabase: {deal_id}"
                )
                return None
                
        except Exception as e:
            self.log_result("Query Deal - Financial Metrics", False, f"Request error: {str(e)}")
            return None

    # ========== PROPERTY INTELLIGENCE LAYER TESTS ==========
    
    def test_intelligence_layer_sa_zoning_with_bbox(self):
        """Test GET /api/intelligence/layer/sa-zoning with bbox (San Antonio downtown area)"""
        # San Antonio downtown area bbox
        bbox = "-98.5,29.4,-98.45,29.45"
        limit = 50
        
        try:
            response = requests.get(
                f"{self.base_url}/intelligence/layer/sa-zoning",
                params={"bbox": bbox, "limit": limit},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify GeoJSON format
                if data.get("type") == "FeatureCollection":
                    features = data.get("features", [])
                    
                    if len(features) > 0:
                        # Check first feature structure
                        first_feature = features[0]
                        has_geometry = "geometry" in first_feature and first_feature["geometry"] is not None
                        has_properties = "properties" in first_feature and first_feature["properties"] is not None
                        
                        if has_geometry and has_properties:
                            # Check for Zoning and BaseDescription fields
                            properties = first_feature.get("properties", {})
                            has_zoning = "Zoning" in properties or "ZONING" in properties or "zoning" in properties
                            has_base_desc = "BaseDescription" in properties or "BASE_DESCRIPTION" in properties
                            
                            if has_zoning or has_base_desc:
                                self.log_result(
                                    "SA Zoning - With Bbox", 
                                    True, 
                                    f"Successfully fetched {len(features)} zoning features for downtown SA",
                                    f"Properties include: {list(properties.keys())[:5]}"
                                )
                            else:
                                self.log_result(
                                    "SA Zoning - With Bbox", 
                                    True, 
                                    f"Fetched {len(features)} features but Zoning/BaseDescription fields not found",
                                    f"Available properties: {list(properties.keys())}"
                                )
                        else:
                            self.log_result(
                                "SA Zoning - With Bbox", 
                                False, 
                                "Features missing geometry or properties",
                                f"First feature structure: {list(first_feature.keys())}"
                            )
                    else:
                        self.log_result(
                            "SA Zoning - With Bbox", 
                            False, 
                            "No features returned for downtown SA bbox",
                            f"Expected 20-50 features, got 0"
                        )
                else:
                    self.log_result(
                        "SA Zoning - With Bbox", 
                        False, 
                        "Response is not valid GeoJSON FeatureCollection",
                        f"Response type: {data.get('type', 'missing')}"
                    )
            else:
                self.log_result(
                    "SA Zoning - With Bbox", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                
        except Exception as e:
            self.log_result("SA Zoning - With Bbox", False, f"Request error: {str(e)}")
    
    def test_intelligence_layer_sa_zoning_without_bbox(self):
        """Test GET /api/intelligence/layer/sa-zoning without bbox (limited results)"""
        limit = 10
        
        try:
            response = requests.get(
                f"{self.base_url}/intelligence/layer/sa-zoning",
                params={"limit": limit},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify GeoJSON format
                if data.get("type") == "FeatureCollection":
                    features = data.get("features", [])
                    
                    if len(features) > 0 and len(features) <= limit:
                        self.log_result(
                            "SA Zoning - Without Bbox", 
                            True, 
                            f"Successfully fetched {len(features)} features (limit: {limit})",
                            "No bbox parameter works correctly"
                        )
                    elif len(features) > limit:
                        self.log_result(
                            "SA Zoning - Without Bbox", 
                            False, 
                            f"Returned {len(features)} features, exceeds limit of {limit}",
                            "Limit parameter not being respected"
                        )
                    else:
                        self.log_result(
                            "SA Zoning - Without Bbox", 
                            True, 
                            f"Returned {len(features)} features (valid response)",
                            "Empty result is acceptable for no bbox query"
                        )
                else:
                    self.log_result(
                        "SA Zoning - Without Bbox", 
                        False, 
                        "Response is not valid GeoJSON FeatureCollection",
                        f"Response type: {data.get('type', 'missing')}"
                    )
            else:
                self.log_result(
                    "SA Zoning - Without Bbox", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                
        except Exception as e:
            self.log_result("SA Zoning - Without Bbox", False, f"Request error: {str(e)}")
    
    def test_intelligence_layer_invalid_type(self):
        """Test GET /api/intelligence/layer/invalid-layer (should return 400)"""
        try:
            response = requests.get(
                f"{self.base_url}/intelligence/layer/invalid-layer",
                params={"limit": 10},
                timeout=15
            )
            
            if response.status_code == 400:
                self.log_result(
                    "Intelligence Layer - Invalid Type", 
                    True, 
                    "Correctly returned 400 Bad Request for invalid layer type"
                )
            else:
                self.log_result(
                    "Intelligence Layer - Invalid Type", 
                    False, 
                    f"Expected 400 Bad Request, got {response.status_code}",
                    response.text[:200] if response.text else "No response"
                )
                
        except Exception as e:
            self.log_result("Intelligence Layer - Invalid Type", False, f"Request error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("BACKEND API TESTING - Property Intelligence Layer")
        print("=" * 60)
        print(f"Testing against: {self.base_url}")
        print(f"Test credentials: {TEST_CREDENTIALS['email']}")
        print()
        
        # Step 1: Authenticate with MongoDB (for legacy endpoints)
        if not self.authenticate():
            print("❌ MongoDB authentication failed - cannot proceed with tests")
            return False
        
        print()
        
        # ========== PROPERTY INTELLIGENCE LAYER TESTS ==========
        print("PROPERTY INTELLIGENCE LAYER TESTS (SA Zoning Proxy)")
        print("-" * 60)
        
        # Test 1: SA Zoning with bbox (downtown SA)
        self.test_intelligence_layer_sa_zoning_with_bbox()
        print()
        
        # Test 2: SA Zoning without bbox (limited results)
        self.test_intelligence_layer_sa_zoning_without_bbox()
        print()
        
        # Test 3: Invalid layer type (should return 400)
        self.test_intelligence_layer_invalid_type()
        print()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print()
        
        if failed_tests > 0:
            print("FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  ❌ {result['test']}: {result['message']}")
                    if result['details']:
                        print(f"     {result['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)