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
BASE_URL = "https://map-crm.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "email": "pedro@test.com",
    "password": "password123"
}

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.headers = {}
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
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("BACKEND API TESTING - Layer Management APIs")
        print("=" * 60)
        print(f"Testing against: {self.base_url}")
        print(f"Test credentials: {TEST_CREDENTIALS['email']}")
        print()
        
        # Step 1: Authenticate
        if not self.authenticate():
            print("❌ Authentication failed - cannot proceed with tests")
            return False
        
        print()
        
        # Layer Management API Tests
        print("LAYER MANAGEMENT API TESTS")
        print("-" * 40)
        
        # Test 1: Layer Registry
        self.test_layer_registry()
        print()
        
        # Test 2: Counties Query
        self.test_counties_query()
        print()
        
        # Test 3: FEMA Floodplain Query
        self.test_fema_floodplain_query()
        print()
        
        # Test 4: San Antonio Zoning Query
        self.test_sa_zoning_query()
        print()
        
        # Test 5: Counties Identify
        self.test_counties_identify()
        print()
        
        # Deal API Tests (Legacy)
        print("DEAL API TESTS (Legacy)")
        print("-" * 40)
        
        # Step 2: Test GET all deals
        deals = self.test_get_all_deals()
        print()
        
        # Step 3: Test GET individual deal
        self.test_get_individual_deal(deals)
        print()
        
        # Step 4: Test POST create new deal
        self.test_create_new_deal()
        print()
        
        # Step 5: Test model validation
        self.test_model_validation()
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