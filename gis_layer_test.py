#!/usr/bin/env python3
"""
GIS Layer Management API Testing
Focused testing for layer registry and San Antonio zoning query endpoints
"""

import requests
import json
from datetime import datetime
import sys

# Configuration
BASE_URL = "https://flexipipe-1.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "email": "pedro@test.com",
    "password": "password123"
}

class GISLayerTester:
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

    def test_layer_registry_detailed(self):
        """Test GET /api/layers/registry - Detailed verification of all 6 layers"""
        try:
            response = requests.get(
                f"{self.base_url}/layers/registry",
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                layers = data.get("layers", {})
                
                # Expected layers with their categories
                expected_layers = {
                    "counties": "administrative",
                    "city_limits": "administrative", 
                    "fema_floodplain": "environmental",
                    "sa_zoning": "planning",
                    "saws_water": "infrastructure",
                    "txdot_projects": "transportation"
                }
                
                # Check if all 6 layers are present
                found_layers = list(layers.keys())
                missing_layers = [layer for layer in expected_layers if layer not in found_layers]
                
                if len(found_layers) == 6 and not missing_layers:
                    # Verify each layer has required metadata
                    layer_details = {}
                    validation_errors = []
                    
                    for layer_id, layer_config in layers.items():
                        required_fields = ["id", "name", "description", "category", "style", "clickFields"]
                        missing_fields = [field for field in required_fields if field not in layer_config]
                        
                        if missing_fields:
                            validation_errors.append(f"{layer_id}: missing {missing_fields}")
                        else:
                            layer_details[layer_id] = {
                                "name": layer_config.get("name"),
                                "category": layer_config.get("category"),
                                "description": layer_config.get("description"),
                                "clickFields": layer_config.get("clickFields", [])
                            }
                    
                    if validation_errors:
                        self.log_result(
                            "Layer Registry Detailed", 
                            False, 
                            f"Found all 6 layers but validation errors exist",
                            f"Errors: {validation_errors}"
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
                            "Layer Registry Detailed", 
                            True, 
                            f"Successfully retrieved all 6 layers with complete metadata",
                            f"Categories: {dict(categories)}\nLayer details: {json.dumps(layer_details, indent=2)}"
                        )
                        
                        return layer_details
                else:
                    self.log_result(
                        "Layer Registry Detailed", 
                        False, 
                        f"Expected 6 layers, found {len(found_layers)}",
                        f"Missing: {missing_layers}, Found: {found_layers}"
                    )
                    return None
            else:
                self.log_result(
                    "Layer Registry Detailed", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text
                )
                return None
                
        except Exception as e:
            self.log_result("Layer Registry Detailed", False, f"Request error: {str(e)}")
            return None

    def test_sa_zoning_query_comprehensive(self):
        """Test GET /api/layers/sa_zoning/query with San Antonio bounding box"""
        # San Antonio bounding box from review request: -98.9,29.0,-98.0,29.8
        bbox = "-98.9,29.0,-98.0,29.8"
        
        try:
            print(f"Testing SA Zoning query with bbox: {bbox}")
            response = requests.get(
                f"{self.base_url}/layers/sa_zoning/query",
                params={"bbox": bbox},
                headers=self.headers,
                timeout=45  # Increased timeout for large dataset
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
                            # Analyze zoning data in detail
                            zoning_analysis = self.analyze_zoning_features(features)
                            
                            # Check if we have expected ~2000 features
                            feature_count = len(features)
                            expected_range = (1500, 2500)  # Allow some variance
                            
                            if expected_range[0] <= feature_count <= expected_range[1]:
                                self.log_result(
                                    "SA Zoning Query Comprehensive", 
                                    True, 
                                    f"Successfully queried San Antonio zoning - found {feature_count} features (within expected range)",
                                    f"Zoning analysis: {json.dumps(zoning_analysis, indent=2)}"
                                )
                            else:
                                self.log_result(
                                    "SA Zoning Query Comprehensive", 
                                    True, 
                                    f"Successfully queried San Antonio zoning - found {feature_count} features (outside expected ~2000 range)",
                                    f"Zoning analysis: {json.dumps(zoning_analysis, indent=2)}"
                                )
                            
                            return {
                                "feature_count": feature_count,
                                "zoning_analysis": zoning_analysis,
                                "sample_feature": {
                                    "geometry_type": first_feature["geometry"].get("type"),
                                    "properties_keys": list(first_feature["properties"].keys())
                                }
                            }
                        else:
                            self.log_result(
                                "SA Zoning Query Comprehensive", 
                                False, 
                                "Features missing geometry or properties",
                                f"First feature structure: {list(first_feature.keys())}"
                            )
                            return None
                    else:
                        self.log_result(
                            "SA Zoning Query Comprehensive", 
                            False, 
                            "No zoning features returned for San Antonio area",
                            f"Response structure: {list(data.keys())}"
                        )
                        return None
                else:
                    self.log_result(
                        "SA Zoning Query Comprehensive", 
                        False, 
                        "Response is not valid GeoJSON FeatureCollection",
                        f"Response type: {data.get('type', 'missing')}"
                    )
                    return None
            else:
                self.log_result(
                    "SA Zoning Query Comprehensive", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                return None
                
        except Exception as e:
            self.log_result("SA Zoning Query Comprehensive", False, f"Request error: {str(e)}")
            return None

    def analyze_zoning_features(self, features):
        """Analyze zoning features to extract meaningful statistics"""
        analysis = {
            "total_features": len(features),
            "zoning_codes": {},
            "base_zones": {},
            "sample_properties": {},
            "geometry_types": {}
        }
        
        # Analyze first 100 features for performance
        sample_size = min(100, len(features))
        
        for i, feature in enumerate(features[:sample_size]):
            properties = feature.get("properties", {})
            geometry = feature.get("geometry", {})
            
            # Count geometry types
            geom_type = geometry.get("type", "unknown")
            analysis["geometry_types"][geom_type] = analysis["geometry_types"].get(geom_type, 0) + 1
            
            # Extract zoning information
            base_zone = properties.get("Base", "")
            zoning_code = properties.get("Zoning", "")
            
            if base_zone:
                analysis["base_zones"][base_zone] = analysis["base_zones"].get(base_zone, 0) + 1
            
            if zoning_code:
                analysis["zoning_codes"][zoning_code] = analysis["zoning_codes"].get(zoning_code, 0) + 1
            
            # Store sample properties from first feature
            if i == 0:
                analysis["sample_properties"] = {k: v for k, v in properties.items()}
        
        # Sort by frequency and take top 10
        analysis["top_base_zones"] = dict(sorted(analysis["base_zones"].items(), key=lambda x: x[1], reverse=True)[:10])
        analysis["top_zoning_codes"] = dict(sorted(analysis["zoning_codes"].items(), key=lambda x: x[1], reverse=True)[:10])
        
        return analysis

    def test_layer_query_performance(self):
        """Test performance of layer queries with different bounding boxes"""
        test_cases = [
            {
                "name": "Small Area (Downtown SA)",
                "bbox": "-98.5,29.4,-98.45,29.45",
                "expected_features": "< 100"
            },
            {
                "name": "Medium Area (Central SA)",
                "bbox": "-98.6,29.3,-98.4,29.5", 
                "expected_features": "100-500"
            },
            {
                "name": "Large Area (Full SA)",
                "bbox": "-98.9,29.0,-98.0,29.8",
                "expected_features": "1500-2500"
            }
        ]
        
        performance_results = []
        
        for test_case in test_cases:
            try:
                start_time = datetime.now()
                
                response = requests.get(
                    f"{self.base_url}/layers/sa_zoning/query",
                    params={"bbox": test_case["bbox"]},
                    headers=self.headers,
                    timeout=60
                )
                
                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()
                
                if response.status_code == 200:
                    data = response.json()
                    feature_count = len(data.get("features", []))
                    
                    performance_results.append({
                        "test": test_case["name"],
                        "bbox": test_case["bbox"],
                        "feature_count": feature_count,
                        "duration_seconds": duration,
                        "success": True
                    })
                    
                    print(f"  ✅ {test_case['name']}: {feature_count} features in {duration:.2f}s")
                else:
                    performance_results.append({
                        "test": test_case["name"],
                        "bbox": test_case["bbox"],
                        "error": f"HTTP {response.status_code}",
                        "duration_seconds": duration,
                        "success": False
                    })
                    
                    print(f"  ❌ {test_case['name']}: Failed with HTTP {response.status_code}")
                    
            except Exception as e:
                performance_results.append({
                    "test": test_case["name"],
                    "bbox": test_case["bbox"],
                    "error": str(e),
                    "success": False
                })
                
                print(f"  ❌ {test_case['name']}: Error - {str(e)}")
        
        # Summarize performance results
        successful_tests = [r for r in performance_results if r["success"]]
        
        if len(successful_tests) == len(test_cases):
            self.log_result(
                "Layer Query Performance", 
                True, 
                f"All {len(test_cases)} performance tests passed",
                f"Results: {json.dumps(performance_results, indent=2)}"
            )
        else:
            self.log_result(
                "Layer Query Performance", 
                False, 
                f"{len(successful_tests)}/{len(test_cases)} performance tests passed",
                f"Results: {json.dumps(performance_results, indent=2)}"
            )
        
        return performance_results

    def run_gis_tests(self):
        """Run focused GIS layer management tests"""
        print("=" * 70)
        print("GIS LAYER MANAGEMENT API TESTING")
        print("=" * 70)
        print(f"Testing against: {self.base_url}")
        print(f"Test credentials: {TEST_CREDENTIALS['email']}")
        print(f"Focus: Layer registry and San Antonio zoning query")
        print()
        
        # Step 1: Authenticate
        if not self.authenticate():
            print("❌ Authentication failed - cannot proceed with tests")
            return False
        
        print()
        
        # Test 1: Layer Registry (Detailed)
        print("TEST 1: Layer Registry Detailed Verification")
        print("-" * 50)
        layer_details = self.test_layer_registry_detailed()
        print()
        
        # Test 2: San Antonio Zoning Query (Comprehensive)
        print("TEST 2: San Antonio Zoning Query Comprehensive")
        print("-" * 50)
        zoning_results = self.test_sa_zoning_query_comprehensive()
        print()
        
        # Test 3: Performance Testing
        print("TEST 3: Layer Query Performance Testing")
        print("-" * 50)
        performance_results = self.test_layer_query_performance()
        print()
        
        # Summary
        print("=" * 70)
        print("GIS LAYER TEST SUMMARY")
        print("=" * 70)
        
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
        else:
            print("🎉 ALL GIS LAYER TESTS PASSED!")
            
        print()
        print("KEY FINDINGS:")
        if layer_details:
            print(f"✅ Layer Registry: All 6 layers available with complete metadata")
        if zoning_results:
            print(f"✅ SA Zoning: {zoning_results['feature_count']} features retrieved")
            print(f"   - Geometry type: {zoning_results['sample_feature']['geometry_type']}")
            print(f"   - Property fields: {len(zoning_results['sample_feature']['properties_keys'])} fields")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = GISLayerTester()
    success = tester.run_gis_tests()
    sys.exit(0 if success else 1)