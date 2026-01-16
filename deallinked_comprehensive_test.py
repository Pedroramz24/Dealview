#!/usr/bin/env python3
"""
DealLinked CRM Comprehensive Backend Testing
Tests all backend APIs for the review request
"""

import requests
import json
import time
from datetime import datetime
import sys

# Configuration
BASE_URL = "https://mapwise-crm.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "email": "contact@pedroarmando.com",
    "password": "Flin141812$"
}

class DealLinkedTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.headers = {}
        self.test_results = []
        self.user_id = None
        
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
        print(f"\n{status}: {test_name}")
        print(f"   {message}")
        if details:
            print(f"   Details: {details}")
    
    def authenticate_supabase(self):
        """Authenticate with Supabase"""
        try:
            from supabase import create_client
            import os
            from dotenv import load_dotenv
            
            load_dotenv('/app/backend/.env')
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_ANON_KEY']
            
            supabase = create_client(supabase_url, supabase_key)
            
            # Sign in
            result = supabase.auth.sign_in_with_password({
                'email': TEST_CREDENTIALS['email'],
                'password': TEST_CREDENTIALS['password']
            })
            
            if result.session:
                self.token = result.session.access_token
                self.headers = {"Authorization": f"Bearer {self.token}"}
                self.user_id = result.user.id if result.user else None
                self.log_result(
                    "Authentication", 
                    True, 
                    f"Successfully authenticated as {TEST_CREDENTIALS['email']}",
                    f"User ID: {self.user_id}, Token length: {len(self.token)} chars"
                )
                return True
            else:
                self.log_result("Authentication", False, "No session returned")
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    # ========== TEST 1: Dashboard Performance Test ==========
    
    def test_dashboard_stats_performance(self):
        """Test GET /api/dashboard/stats - Performance should be < 2.5s"""
        try:
            start_time = time.time()
            
            response = requests.get(
                f"{self.base_url}/dashboard/stats",
                headers=self.headers,
                timeout=30
            )
            
            end_time = time.time()
            response_time = end_time - start_time
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ["total_pipeline_value", "total_deals", "avg_deal_size", "asset_type_distribution", "stage_counts"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result(
                        "Dashboard Stats Performance",
                        False,
                        f"Response missing fields: {missing_fields}",
                        f"Response time: {response_time:.2f}s"
                    )
                    return None
                
                # Check performance
                performance_ok = response_time < 2.5
                
                self.log_result(
                    "Dashboard Stats Performance",
                    performance_ok,
                    f"Response time: {response_time:.2f}s (target: < 2.5s)",
                    f"Total deals: {data.get('total_deals', 0)}, Pipeline value: ${data.get('total_pipeline_value', 0):,.2f}"
                )
                
                return data
            else:
                self.log_result(
                    "Dashboard Stats Performance",
                    False,
                    f"Failed with status {response.status_code}",
                    f"Response time: {response_time:.2f}s, Error: {response.text[:200]}"
                )
                return None
                
        except Exception as e:
            self.log_result("Dashboard Stats Performance", False, f"Request error: {str(e)}")
            return None
    
    # ========== TEST 2: Bulk Actions - CSV Export Test ==========
    
    def test_map_crm_properties_list(self):
        """Test GET /api/map-crm/properties - Get properties for bulk actions"""
        try:
            response = requests.get(
                f"{self.base_url}/map-crm/properties",
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                properties = data.get("properties", [])
                
                self.log_result(
                    "Map CRM Properties List",
                    True,
                    f"Successfully retrieved {len(properties)} properties",
                    f"Total count: {data.get('total', 0)}"
                )
                
                return properties
            else:
                self.log_result(
                    "Map CRM Properties List",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:200]
                )
                return []
                
        except Exception as e:
            self.log_result("Map CRM Properties List", False, f"Request error: {str(e)}")
            return []
    
    def test_bulk_export_csv(self, properties):
        """Test POST /api/map-crm/properties/bulk-export - CSV export"""
        if not properties or len(properties) < 3:
            self.log_result(
                "Bulk CSV Export",
                False,
                "Not enough properties to test bulk export (need at least 3)",
                f"Available properties: {len(properties)}"
            )
            return
        
        # Select first 5 properties
        selected_ids = [p.get('id') for p in properties[:5] if p.get('id')]
        
        if len(selected_ids) < 3:
            self.log_result(
                "Bulk CSV Export",
                False,
                "Not enough valid property IDs",
                f"Found {len(selected_ids)} valid IDs"
            )
            return
        
        try:
            response = requests.post(
                f"{self.base_url}/map-crm/properties/bulk-export",
                json={"property_ids": selected_ids},
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                # Check if response is CSV
                content_type = response.headers.get('Content-Type', '')
                
                if 'csv' in content_type.lower() or 'text/csv' in content_type.lower():
                    csv_content = response.text
                    lines = csv_content.split('\n')
                    
                    # Check CSV structure
                    if len(lines) > 1:
                        header = lines[0]
                        data_rows = [line for line in lines[1:] if line.strip()]
                        
                        # Verify columns
                        expected_columns = ['address', 'city', 'price', 'size']
                        header_lower = header.lower()
                        missing_columns = [col for col in expected_columns if col not in header_lower]
                        
                        if missing_columns:
                            self.log_result(
                                "Bulk CSV Export",
                                False,
                                f"CSV missing expected columns: {missing_columns}",
                                f"Header: {header}"
                            )
                        else:
                            self.log_result(
                                "Bulk CSV Export",
                                True,
                                f"CSV export successful with {len(data_rows)} properties",
                                f"Columns: {header.split(',')[:5]}, File size: {len(csv_content)} bytes"
                            )
                    else:
                        self.log_result(
                            "Bulk CSV Export",
                            False,
                            "CSV file is empty or has no data rows",
                            f"Lines: {len(lines)}"
                        )
                else:
                    # Might be JSON response
                    try:
                        data = response.json()
                        if 'csv' in data or 'data' in data:
                            self.log_result(
                                "Bulk CSV Export",
                                True,
                                "CSV export returned as JSON",
                                f"Response keys: {list(data.keys())}"
                            )
                        else:
                            self.log_result(
                                "Bulk CSV Export",
                                False,
                                f"Unexpected response format: {content_type}",
                                f"Response: {response.text[:200]}"
                            )
                    except:
                        self.log_result(
                            "Bulk CSV Export",
                            False,
                            f"Unexpected content type: {content_type}",
                            f"Response: {response.text[:200]}"
                        )
            else:
                self.log_result(
                    "Bulk CSV Export",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:200]
                )
                
        except Exception as e:
            self.log_result("Bulk CSV Export", False, f"Request error: {str(e)}")
    
    # ========== TEST 3: Bulk Actions - Claim Properties Test ==========
    
    def test_bulk_claim_properties(self, properties):
        """Test POST /api/map-crm/properties/bulk-claim - Claim multiple properties"""
        if not properties or len(properties) < 3:
            self.log_result(
                "Bulk Claim Properties",
                False,
                "Not enough properties to test bulk claim (need at least 3)",
                f"Available properties: {len(properties)}"
            )
            return
        
        # Select first 3 unclaimed properties
        unclaimed = [p for p in properties if not p.get('claimed_by')]
        selected_ids = [p.get('id') for p in unclaimed[:3] if p.get('id')]
        
        if len(selected_ids) < 1:
            self.log_result(
                "Bulk Claim Properties",
                False,
                "No unclaimed properties available to test",
                "All properties are already claimed"
            )
            return
        
        try:
            response = requests.post(
                f"{self.base_url}/map-crm/properties/bulk-claim",
                json={"property_ids": selected_ids},
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                success_count = data.get('success_count', 0)
                failed_count = data.get('failed_count', 0)
                
                if success_count > 0:
                    self.log_result(
                        "Bulk Claim Properties",
                        True,
                        f"Successfully claimed {success_count} properties",
                        f"Failed: {failed_count}, Total attempted: {len(selected_ids)}"
                    )
                else:
                    self.log_result(
                        "Bulk Claim Properties",
                        False,
                        "No properties were claimed",
                        f"Failed: {failed_count}, Errors: {data.get('errors', [])}"
                    )
            else:
                self.log_result(
                    "Bulk Claim Properties",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:200]
                )
                
        except Exception as e:
            self.log_result("Bulk Claim Properties", False, f"Request error: {str(e)}")
    
    # ========== TEST 4: Pipeline & Stage Persistence Test ==========
    
    def test_get_pipelines(self):
        """Test GET /api/pipelines - Get available pipelines"""
        try:
            response = requests.get(
                f"{self.base_url}/pipelines",
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                pipelines = data.get("pipelines", [])
                
                if len(pipelines) > 0:
                    self.log_result(
                        "Get Pipelines",
                        True,
                        f"Successfully retrieved {len(pipelines)} pipelines",
                        f"Pipelines: {[p.get('name') for p in pipelines]}"
                    )
                    return pipelines
                else:
                    self.log_result(
                        "Get Pipelines",
                        False,
                        "No pipelines found",
                        "User needs at least one pipeline configured"
                    )
                    return []
            else:
                self.log_result(
                    "Get Pipelines",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:200]
                )
                return []
                
        except Exception as e:
            self.log_result("Get Pipelines", False, f"Request error: {str(e)}")
            return []
    
    def test_get_deals(self):
        """Test GET /api/deals - Get user's deals"""
        try:
            response = requests.get(
                f"{self.base_url}/deals",
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                deals = response.json()
                
                self.log_result(
                    "Get Deals",
                    True,
                    f"Successfully retrieved {len(deals)} deals",
                    f"First deal: {deals[0].get('title') if deals else 'N/A'}"
                )
                return deals
            else:
                self.log_result(
                    "Get Deals",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:200]
                )
                return []
                
        except Exception as e:
            self.log_result("Get Deals", False, f"Request error: {str(e)}")
            return []
    
    def test_update_deal_pipeline_stage(self, deals, pipelines):
        """Test PUT /api/deals/{id} - Update pipeline and stage, verify persistence"""
        if not deals or len(deals) == 0:
            self.log_result(
                "Update Deal Pipeline/Stage",
                False,
                "No deals available to test pipeline/stage update",
                "Create at least one deal first"
            )
            return
        
        if not pipelines or len(pipelines) == 0:
            self.log_result(
                "Update Deal Pipeline/Stage",
                False,
                "No pipelines available to test",
                "Configure at least one pipeline first"
            )
            return
        
        # Select first deal
        deal = deals[0]
        deal_id = deal.get('id')
        original_pipeline = deal.get('pipeline_id')
        original_stage = deal.get('pipeline_stage_id')
        
        # Select a different pipeline
        target_pipeline = pipelines[0] if len(pipelines) > 0 else None
        if not target_pipeline:
            self.log_result(
                "Update Deal Pipeline/Stage",
                False,
                "No target pipeline available",
                "Need at least one pipeline"
            )
            return
        
        target_pipeline_id = target_pipeline.get('id')
        pipeline_stages = target_pipeline.get('pipeline_stages', [])
        
        if not pipeline_stages or len(pipeline_stages) == 0:
            self.log_result(
                "Update Deal Pipeline/Stage",
                False,
                "Target pipeline has no stages",
                f"Pipeline: {target_pipeline.get('name')}"
            )
            return
        
        target_stage_id = pipeline_stages[0].get('id')
        
        try:
            # Update deal with new pipeline and stage
            update_data = {
                "pipeline_id": target_pipeline_id,
                "pipeline_stage_id": target_stage_id
            }
            
            response = requests.put(
                f"{self.base_url}/deals/{deal_id}",
                json=update_data,
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                updated_deal = response.json()
                
                # Verify update
                if updated_deal.get('pipeline_id') == target_pipeline_id and updated_deal.get('pipeline_stage_id') == target_stage_id:
                    # Now retrieve the deal again to verify persistence
                    time.sleep(0.5)  # Small delay
                    
                    verify_response = requests.get(
                        f"{self.base_url}/deals/{deal_id}",
                        headers=self.headers,
                        timeout=15
                    )
                    
                    if verify_response.status_code == 200:
                        verified_deal = verify_response.json()
                        
                        if verified_deal.get('pipeline_id') == target_pipeline_id and verified_deal.get('pipeline_stage_id') == target_stage_id:
                            self.log_result(
                                "Update Deal Pipeline/Stage",
                                True,
                                "Pipeline and stage updated and persisted successfully",
                                f"Pipeline: {target_pipeline.get('name')}, Stage: {pipeline_stages[0].get('name')}"
                            )
                        else:
                            self.log_result(
                                "Update Deal Pipeline/Stage",
                                False,
                                "Pipeline/stage did not persist after retrieval",
                                f"Expected: pipeline={target_pipeline_id}, stage={target_stage_id}, Got: pipeline={verified_deal.get('pipeline_id')}, stage={verified_deal.get('pipeline_stage_id')}"
                            )
                    else:
                        self.log_result(
                            "Update Deal Pipeline/Stage",
                            False,
                            f"Failed to verify persistence - status {verify_response.status_code}",
                            verify_response.text[:200]
                        )
                else:
                    self.log_result(
                        "Update Deal Pipeline/Stage",
                        False,
                        "Update response does not reflect changes",
                        f"Expected: pipeline={target_pipeline_id}, stage={target_stage_id}, Got: pipeline={updated_deal.get('pipeline_id')}, stage={updated_deal.get('pipeline_stage_id')}"
                    )
            else:
                self.log_result(
                    "Update Deal Pipeline/Stage",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:200]
                )
                
        except Exception as e:
            self.log_result("Update Deal Pipeline/Stage", False, f"Request error: {str(e)}")
    
    # ========== TEST 5: Property-to-Deal Conversion Test ==========
    
    def test_property_to_deal_conversion(self, properties):
        """Test POST /api/map-crm/properties/{id}/convert - Convert property to deal"""
        if not properties or len(properties) == 0:
            self.log_result(
                "Property to Deal Conversion",
                False,
                "No properties available to test conversion",
                "Need at least one unconverted property"
            )
            return None
        
        # Find an unconverted property
        unconverted = [p for p in properties if not p.get('converted_to_deal_id')]
        
        if not unconverted or len(unconverted) == 0:
            self.log_result(
                "Property to Deal Conversion",
                False,
                "No unconverted properties available",
                "All properties are already converted to deals"
            )
            return None
        
        property_to_convert = unconverted[0]
        property_id = property_to_convert.get('id')
        
        try:
            response = requests.post(
                f"{self.base_url}/map-crm/properties/{property_id}/convert",
                json={},
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                deal_id = data.get('deal_id')
                
                if deal_id:
                    # Verify the deal was created
                    time.sleep(0.5)
                    
                    deal_response = requests.get(
                        f"{self.base_url}/deals/{deal_id}",
                        headers=self.headers,
                        timeout=15
                    )
                    
                    if deal_response.status_code == 200:
                        deal = deal_response.json()
                        
                        self.log_result(
                            "Property to Deal Conversion",
                            True,
                            f"Successfully converted property to deal",
                            f"Deal ID: {deal_id}, Title: {deal.get('title')}, Address: {deal.get('address')}"
                        )
                        return deal
                    else:
                        self.log_result(
                            "Property to Deal Conversion",
                            False,
                            "Conversion succeeded but deal not found",
                            f"Deal ID: {deal_id}, Status: {deal_response.status_code}"
                        )
                        return None
                else:
                    self.log_result(
                        "Property to Deal Conversion",
                        False,
                        "Conversion response missing deal_id",
                        f"Response: {data}"
                    )
                    return None
            else:
                self.log_result(
                    "Property to Deal Conversion",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:200]
                )
                return None
                
        except Exception as e:
            self.log_result("Property to Deal Conversion", False, f"Request error: {str(e)}")
            return None
    
    # ========== TEST 6: Data Integrity Test ==========
    
    def test_data_integrity(self):
        """Test data persistence - Create, update, and verify data persists"""
        try:
            # Create a test deal
            test_deal_data = {
                "title": "Data Integrity Test Deal",
                "address": "123 Test Street, San Antonio, TX 78201",
                "city": "San Antonio",
                "state": "TX",
                "zip_code": "78201",
                "asset_type": "Office",
                "asking_price": 1500000,
                "size": 10000,
                "description": "Test deal for data integrity verification"
            }
            
            create_response = requests.post(
                f"{self.base_url}/deals",
                json=test_deal_data,
                headers=self.headers,
                timeout=15
            )
            
            if create_response.status_code != 200:
                self.log_result(
                    "Data Integrity Test",
                    False,
                    f"Failed to create test deal - status {create_response.status_code}",
                    create_response.text[:200]
                )
                return
            
            created_deal = create_response.json()
            deal_id = created_deal.get('id')
            
            # Update the deal
            update_data = {
                "asking_price": 1750000,
                "description": "Updated description for data integrity test"
            }
            
            update_response = requests.put(
                f"{self.base_url}/deals/{deal_id}",
                json=update_data,
                headers=self.headers,
                timeout=15
            )
            
            if update_response.status_code != 200:
                self.log_result(
                    "Data Integrity Test",
                    False,
                    f"Failed to update test deal - status {update_response.status_code}",
                    update_response.text[:200]
                )
                return
            
            # Retrieve the deal to verify persistence
            time.sleep(0.5)
            
            verify_response = requests.get(
                f"{self.base_url}/deals/{deal_id}",
                headers=self.headers,
                timeout=15
            )
            
            if verify_response.status_code == 200:
                verified_deal = verify_response.json()
                
                # Check if updates persisted
                if verified_deal.get('asking_price') == 1750000 and "Updated description" in verified_deal.get('description', ''):
                    self.log_result(
                        "Data Integrity Test",
                        True,
                        "Data integrity verified - all changes persisted correctly",
                        f"Deal ID: {deal_id}, Price: ${verified_deal.get('asking_price'):,}"
                    )
                    
                    # Clean up - delete test deal
                    requests.delete(
                        f"{self.base_url}/deals/{deal_id}",
                        headers=self.headers,
                        timeout=15
                    )
                else:
                    self.log_result(
                        "Data Integrity Test",
                        False,
                        "Data did not persist correctly",
                        f"Expected price: 1750000, Got: {verified_deal.get('asking_price')}"
                    )
            else:
                self.log_result(
                    "Data Integrity Test",
                    False,
                    f"Failed to verify data - status {verify_response.status_code}",
                    verify_response.text[:200]
                )
                
        except Exception as e:
            self.log_result("Data Integrity Test", False, f"Request error: {str(e)}")
    
    # ========== Summary ==========
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("DEALLINKED CRM COMPREHENSIVE BACKEND TEST SUMMARY")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"\nTotal Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n" + "-"*80)
            print("FAILED TESTS:")
            print("-"*80)
            for result in self.test_results:
                if not result['success']:
                    print(f"\n❌ {result['test']}")
                    print(f"   {result['message']}")
                    if result['details']:
                        print(f"   {result['details']}")
        
        print("\n" + "="*80)
        
        return passed_tests, failed_tests
    
    def run_all_tests(self):
        """Run all comprehensive tests"""
        print("="*80)
        print("DEALLINKED CRM COMPREHENSIVE BACKEND TESTING")
        print("="*80)
        print(f"Base URL: {self.base_url}")
        print(f"Test User: {TEST_CREDENTIALS['email']}")
        print("="*80)
        
        # Authenticate
        if not self.authenticate_supabase():
            print("\n❌ Authentication failed. Cannot proceed with tests.")
            return
        
        print("\n" + "="*80)
        print("RUNNING BACKEND API TESTS")
        print("="*80)
        
        # Test 1: Dashboard Performance
        print("\n### TEST 1: Dashboard Performance ###")
        dashboard_stats = self.test_dashboard_stats_performance()
        
        # Test 2 & 3: Bulk Actions
        print("\n### TEST 2 & 3: Bulk Actions (CSV Export & Claim) ###")
        properties = self.test_map_crm_properties_list()
        if properties:
            self.test_bulk_export_csv(properties)
            self.test_bulk_claim_properties(properties)
        
        # Test 4: Pipeline & Stage Persistence
        print("\n### TEST 4: Pipeline & Stage Persistence ###")
        pipelines = self.test_get_pipelines()
        deals = self.test_get_deals()
        if pipelines and deals:
            self.test_update_deal_pipeline_stage(deals, pipelines)
        
        # Test 5: Property-to-Deal Conversion
        print("\n### TEST 5: Property-to-Deal Conversion ###")
        if properties:
            self.test_property_to_deal_conversion(properties)
        
        # Test 6: Data Integrity
        print("\n### TEST 6: Data Integrity ###")
        self.test_data_integrity()
        
        # Print summary
        passed, failed = self.print_summary()
        
        return passed, failed

if __name__ == "__main__":
    tester = DealLinkedTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)
