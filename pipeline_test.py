#!/usr/bin/env python3
"""
Pipeline Management API Testing
Tests all 10 new pipeline endpoints with comprehensive scenarios
"""

import requests
import json
from datetime import datetime
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

# Configuration
BASE_URL = "https://terraintel-map.preview.emergentagent.com/api"

# Use existing test user with known credentials
TEST_USER_EMAIL = "teamtest@test.com"
TEST_USER_PASSWORD = "TestPassword123!"

class PipelineTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.headers = {}
        self.test_results = []
        self.test_user_email = None
        self.test_user_id = None
        self.created_pipeline_id = None
        self.created_stage_ids = []
        self.second_user_token = None
        self.second_user_headers = {}
        
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
            if isinstance(details, dict) or isinstance(details, list):
                print(f"   Details: {json.dumps(details, indent=2)}")
            else:
                print(f"   Details: {details}")
    
    def authenticate_supabase(self, email=None, password=None, is_second_user=False):
        """Authenticate with Supabase and get JWT token"""
        try:
            from supabase import create_client
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_ANON_KEY']
            
            supabase = create_client(supabase_url, supabase_key)
            
            # Use provided credentials or default test user
            if not email:
                email = TEST_USER_EMAIL
                password = TEST_USER_PASSWORD
            
            # Sign in
            result = supabase.auth.sign_in_with_password({
                'email': email,
                'password': password
            })
            
            if result.session:
                if not is_second_user:
                    self.token = result.session.access_token
                    self.test_user_id = result.user.id
                    self.headers = {"Authorization": f"Bearer {self.token}"}
                    self.test_user_email = email
                else:
                    # This is second user
                    self.second_user_token = result.session.access_token
                    self.second_user_headers = {"Authorization": f"Bearer {self.second_user_token}"}
                
                self.log_result("Supabase Authentication", True, f"Authenticated as {email}")
                return True
            else:
                self.log_result("Supabase Authentication", False, "No session returned")
                return False
                    
        except Exception as e:
            self.log_result("Supabase Authentication", False, f"Auth error: {str(e)}")
            import traceback
            print(f"Full error: {traceback.format_exc()}")
            return False
    
    def test_1_get_pipelines(self):
        """Test 1: GET /api/pipelines - Fetch all pipelines"""
        try:
            response = requests.get(
                f"{self.base_url}/pipelines",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'pipelines' in data:
                    pipelines = data['pipelines']
                    
                    # Check for default "Off-Market" pipeline
                    default_pipeline = None
                    for p in pipelines:
                        if p.get('is_default') and p.get('name') == 'Off-Market':
                            default_pipeline = p
                            break
                    
                    if default_pipeline:
                        # Check if pipeline_stages data is included
                        has_stages = 'pipeline_stages' in default_pipeline
                        self.log_result(
                            "Test 1: GET /api/pipelines",
                            True,
                            f"Found {len(pipelines)} pipeline(s) including default 'Off-Market' pipeline",
                            {
                                "pipeline_count": len(pipelines),
                                "default_pipeline": default_pipeline.get('name'),
                                "includes_stages": has_stages,
                                "response_structure": "success: true, pipelines: [...]"
                            }
                        )
                        return True
                    else:
                        self.log_result(
                            "Test 1: GET /api/pipelines",
                            False,
                            "Default 'Off-Market' pipeline not found",
                            {"pipelines": pipelines}
                        )
                        return False
                else:
                    self.log_result(
                        "Test 1: GET /api/pipelines",
                        False,
                        "Invalid response structure",
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Test 1: GET /api/pipelines",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Test 1: GET /api/pipelines", False, f"Error: {str(e)}")
            return False
    
    def test_2_create_pipeline(self):
        """Test 2: POST /api/pipelines - Create new pipeline"""
        try:
            pipeline_data = {
                'name': 'Listings',
                'description': 'Listing opportunities',
                'color': '#f59e0b',
                'icon': 'home'
            }
            
            response = requests.post(
                f"{self.base_url}/pipelines",
                data=pipeline_data,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'pipeline' in data:
                    pipeline = data['pipeline']
                    self.created_pipeline_id = pipeline.get('id')
                    
                    # Verify all fields
                    checks = {
                        'name': pipeline.get('name') == 'Listings',
                        'description': pipeline.get('description') == 'Listing opportunities',
                        'color': pipeline.get('color') == '#f59e0b',
                        'icon': pipeline.get('icon') == 'home',
                        'display_order': pipeline.get('display_order') == 1,  # Should be 1 after default
                        'is_default': pipeline.get('is_default') == False
                    }
                    
                    all_passed = all(checks.values())
                    
                    self.log_result(
                        "Test 2: POST /api/pipelines",
                        all_passed,
                        "Pipeline created successfully" if all_passed else "Pipeline created but some fields incorrect",
                        {
                            "pipeline_id": self.created_pipeline_id,
                            "field_checks": checks,
                            "pipeline": pipeline
                        }
                    )
                    return all_passed
                else:
                    self.log_result(
                        "Test 2: POST /api/pipelines",
                        False,
                        "Invalid response structure",
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Test 2: POST /api/pipelines",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Test 2: POST /api/pipelines", False, f"Error: {str(e)}")
            return False
    
    def test_3_create_stages(self):
        """Test 3: POST /api/pipelines/{id}/stages - Create stages"""
        if not self.created_pipeline_id:
            self.log_result("Test 3: Create Stages", False, "No pipeline ID available (Test 2 failed)")
            return False
        
        try:
            stages_to_create = [
                {'name': 'Pitch', 'color': '#94a3b8', 'stage_weight': 0.1},
                {'name': 'Listing Agreement', 'color': '#60a5fa', 'stage_weight': 0.3},
                {'name': 'Marketing', 'color': '#10b981', 'stage_weight': 0.5}
            ]
            
            created_stages = []
            all_success = True
            
            for idx, stage_data in enumerate(stages_to_create):
                response = requests.post(
                    f"{self.base_url}/pipelines/{self.created_pipeline_id}/stages",
                    data=stage_data,
                    headers=self.headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and 'stage' in data:
                        stage = data['stage']
                        self.created_stage_ids.append(stage.get('id'))
                        
                        # Verify display_order is correct
                        expected_order = idx
                        actual_order = stage.get('display_order')
                        
                        created_stages.append({
                            'name': stage.get('name'),
                            'display_order': actual_order,
                            'expected_order': expected_order,
                            'order_correct': actual_order == expected_order
                        })
                    else:
                        all_success = False
                else:
                    all_success = False
            
            self.log_result(
                "Test 3: POST /api/pipelines/{id}/stages",
                all_success and len(created_stages) == 3,
                f"Created {len(created_stages)}/3 stages successfully",
                {"stages": created_stages}
            )
            return all_success and len(created_stages) == 3
            
        except Exception as e:
            self.log_result("Test 3: Create Stages", False, f"Error: {str(e)}")
            return False
    
    def test_4_get_stages(self):
        """Test 4: GET /api/pipelines/{id}/stages - Fetch stages"""
        if not self.created_pipeline_id:
            self.log_result("Test 4: Get Stages", False, "No pipeline ID available")
            return False
        
        try:
            response = requests.get(
                f"{self.base_url}/pipelines/{self.created_pipeline_id}/stages",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'stages' in data:
                    stages = data['stages']
                    
                    # Verify all 3 stages returned
                    if len(stages) == 3:
                        # Verify ordered by display_order
                        is_ordered = all(
                            stages[i].get('display_order', -1) <= stages[i+1].get('display_order', -1)
                            for i in range(len(stages) - 1)
                        )
                        
                        self.log_result(
                            "Test 4: GET /api/pipelines/{id}/stages",
                            is_ordered,
                            f"Retrieved {len(stages)} stages, ordered correctly: {is_ordered}",
                            {"stages": [s.get('name') for s in stages]}
                        )
                        return is_ordered
                    else:
                        self.log_result(
                            "Test 4: GET /api/pipelines/{id}/stages",
                            False,
                            f"Expected 3 stages, got {len(stages)}",
                            stages
                        )
                        return False
                else:
                    self.log_result(
                        "Test 4: GET /api/pipelines/{id}/stages",
                        False,
                        "Invalid response structure",
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Test 4: GET /api/pipelines/{id}/stages",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Test 4: Get Stages", False, f"Error: {str(e)}")
            return False
    
    def test_5_update_pipeline(self):
        """Test 5: PUT /api/pipelines/{id} - Update pipeline"""
        if not self.created_pipeline_id:
            self.log_result("Test 5: Update Pipeline", False, "No pipeline ID available")
            return False
        
        try:
            update_data = {'color': '#ec4899'}
            
            response = requests.put(
                f"{self.base_url}/pipelines/{self.created_pipeline_id}",
                data=update_data,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'pipeline' in data:
                    pipeline = data['pipeline']
                    
                    # Verify color updated and other fields unchanged
                    color_updated = pipeline.get('color') == '#ec4899'
                    name_unchanged = pipeline.get('name') == 'Listings'
                    
                    self.log_result(
                        "Test 5: PUT /api/pipelines/{id}",
                        color_updated and name_unchanged,
                        "Pipeline updated successfully",
                        {
                            "color_updated": color_updated,
                            "name_unchanged": name_unchanged,
                            "new_color": pipeline.get('color')
                        }
                    )
                    return color_updated and name_unchanged
                else:
                    self.log_result(
                        "Test 5: PUT /api/pipelines/{id}",
                        False,
                        "Invalid response structure",
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Test 5: PUT /api/pipelines/{id}",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Test 5: Update Pipeline", False, f"Error: {str(e)}")
            return False
    
    def test_6_update_stage(self):
        """Test 6: PUT /api/stages/{id} - Update stage"""
        if not self.created_stage_ids:
            self.log_result("Test 6: Update Stage", False, "No stage IDs available")
            return False
        
        try:
            # Update first stage (Pitch)
            stage_id = self.created_stage_ids[0]
            update_data = {
                'name': 'Initial Pitch',
                'stage_weight': 0.15
            }
            
            response = requests.put(
                f"{self.base_url}/stages/{stage_id}",
                data=update_data,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and 'stage' in data:
                    stage = data['stage']
                    
                    # Verify updates
                    name_updated = stage.get('name') == 'Initial Pitch'
                    weight_updated = stage.get('stage_weight') == 0.15
                    
                    self.log_result(
                        "Test 6: PUT /api/stages/{id}",
                        name_updated and weight_updated,
                        "Stage updated successfully",
                        {
                            "name_updated": name_updated,
                            "weight_updated": weight_updated,
                            "stage": stage
                        }
                    )
                    return name_updated and weight_updated
                else:
                    self.log_result(
                        "Test 6: PUT /api/stages/{id}",
                        False,
                        "Invalid response structure",
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Test 6: PUT /api/stages/{id}",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Test 6: Update Stage", False, f"Error: {str(e)}")
            return False
    
    def test_7_validation_tests(self):
        """Test 7: Validation - Max pipelines, max stages, delete default"""
        results = {}
        
        # Test 7a: Try to create 6th pipeline (should fail)
        try:
            # First, create 3 more pipelines to reach limit
            for i in range(3):
                requests.post(
                    f"{self.base_url}/pipelines",
                    data={'name': f'Test Pipeline {i+2}', 'color': '#000000', 'icon': 'briefcase'},
                    headers=self.headers,
                    timeout=10
                )
            
            # Now try to create 6th
            response = requests.post(
                f"{self.base_url}/pipelines",
                data={'name': 'Sixth Pipeline', 'color': '#000000', 'icon': 'briefcase'},
                headers=self.headers,
                timeout=10
            )
            
            results['max_pipelines'] = response.status_code == 400
            
        except Exception as e:
            results['max_pipelines'] = False
        
        # Test 7b: Try to create 11th stage (should fail)
        if self.created_pipeline_id:
            try:
                # Create 7 more stages (we already have 3)
                for i in range(7):
                    requests.post(
                        f"{self.base_url}/pipelines/{self.created_pipeline_id}/stages",
                        data={'name': f'Stage {i+4}', 'color': '#000000', 'stage_weight': 0.5},
                        headers=self.headers,
                        timeout=10
                    )
                
                # Try to create 11th
                response = requests.post(
                    f"{self.base_url}/pipelines/{self.created_pipeline_id}/stages",
                    data={'name': 'Eleventh Stage', 'color': '#000000', 'stage_weight': 0.5},
                    headers=self.headers,
                    timeout=10
                )
                
                results['max_stages'] = response.status_code == 400
                
            except Exception as e:
                results['max_stages'] = False
        else:
            results['max_stages'] = False
        
        # Test 7c: Try to delete default pipeline (should fail)
        try:
            # Get default pipeline ID
            response = requests.get(
                f"{self.base_url}/pipelines",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                default_pipeline = None
                for p in data.get('pipelines', []):
                    if p.get('is_default'):
                        default_pipeline = p
                        break
                
                if default_pipeline:
                    delete_response = requests.delete(
                        f"{self.base_url}/pipelines/{default_pipeline['id']}",
                        headers=self.headers,
                        timeout=10
                    )
                    results['delete_default'] = delete_response.status_code == 400
                else:
                    results['delete_default'] = False
            else:
                results['delete_default'] = False
                
        except Exception as e:
            results['delete_default'] = False
        
        all_passed = all(results.values())
        self.log_result(
            "Test 7: Validation Tests",
            all_passed,
            "All validation tests passed" if all_passed else "Some validation tests failed",
            results
        )
        return all_passed
    
    def test_8_delete_stage(self):
        """Test 8: DELETE /api/stages/{id} - Delete stage"""
        if not self.created_stage_ids or len(self.created_stage_ids) < 2:
            self.log_result("Test 8: Delete Stage", False, "Not enough stage IDs available")
            return False
        
        try:
            # Delete the last stage (Marketing)
            stage_id = self.created_stage_ids[-1]
            
            response = requests.delete(
                f"{self.base_url}/stages/{stage_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    # Verify stage count decreased
                    get_response = requests.get(
                        f"{self.base_url}/pipelines/{self.created_pipeline_id}/stages",
                        headers=self.headers,
                        timeout=10
                    )
                    
                    if get_response.status_code == 200:
                        stages_data = get_response.json()
                        # Should have 9 stages now (we created 10 total, deleted 1)
                        stage_count = len(stages_data.get('stages', []))
                        
                        self.log_result(
                            "Test 8: DELETE /api/stages/{id}",
                            True,
                            f"Stage deleted successfully, stage count: {stage_count}",
                            {"deleted_stage_id": stage_id}
                        )
                        return True
                    else:
                        self.log_result(
                            "Test 8: DELETE /api/stages/{id}",
                            False,
                            "Could not verify stage count after deletion"
                        )
                        return False
                else:
                    self.log_result(
                        "Test 8: DELETE /api/stages/{id}",
                        False,
                        "Invalid response structure",
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Test 8: DELETE /api/stages/{id}",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Test 8: Delete Stage", False, f"Error: {str(e)}")
            return False
    
    def test_9_delete_pipeline(self):
        """Test 9: DELETE /api/pipelines/{id} - Delete pipeline and verify CASCADE"""
        if not self.created_pipeline_id:
            self.log_result("Test 9: Delete Pipeline", False, "No pipeline ID available")
            return False
        
        try:
            # Delete the Listings pipeline
            response = requests.delete(
                f"{self.base_url}/pipelines/{self.created_pipeline_id}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    # Verify pipeline is gone
                    get_pipelines = requests.get(
                        f"{self.base_url}/pipelines",
                        headers=self.headers,
                        timeout=10
                    )
                    
                    if get_pipelines.status_code == 200:
                        pipelines_data = get_pipelines.json()
                        pipelines = pipelines_data.get('pipelines', [])
                        
                        # Check pipeline is not in list
                        pipeline_exists = any(p.get('id') == self.created_pipeline_id for p in pipelines)
                        
                        # Verify default pipeline still exists
                        default_exists = any(p.get('is_default') for p in pipelines)
                        
                        # Try to get stages (should return empty or 404)
                        get_stages = requests.get(
                            f"{self.base_url}/pipelines/{self.created_pipeline_id}/stages",
                            headers=self.headers,
                            timeout=10
                        )
                        
                        stages_deleted = get_stages.status_code == 200 and len(get_stages.json().get('stages', [])) == 0
                        
                        success = not pipeline_exists and default_exists and stages_deleted
                        
                        self.log_result(
                            "Test 9: DELETE /api/pipelines/{id}",
                            success,
                            "Pipeline deleted with CASCADE" if success else "Pipeline deletion incomplete",
                            {
                                "pipeline_deleted": not pipeline_exists,
                                "default_still_exists": default_exists,
                                "stages_cascaded": stages_deleted
                            }
                        )
                        return success
                    else:
                        self.log_result(
                            "Test 9: DELETE /api/pipelines/{id}",
                            False,
                            "Could not verify pipeline deletion"
                        )
                        return False
                else:
                    self.log_result(
                        "Test 9: DELETE /api/pipelines/{id}",
                        False,
                        "Invalid response structure",
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Test 9: DELETE /api/pipelines/{id}",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Test 9: Delete Pipeline", False, f"Error: {str(e)}")
            return False
    
    def test_10_cross_user_security(self):
        """Test 10: Cross-user security - RLS policies"""
        try:
            # Use second existing user (ricardo@uriahrealestate.com has a pipeline)
            second_email = "ricardo@uriahrealestate.com"
            # We don't know the password, so we'll test differently
            
            # Get pipelines for first user
            response = requests.get(
                f"{self.base_url}/pipelines",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                first_user_pipelines = response.json().get('pipelines', [])
                
                # Verify all pipelines belong to first user
                all_belong_to_user = all(
                    p.get('owner_id') == self.test_user_id for p in first_user_pipelines
                )
                
                # Use Supabase admin to verify other users have pipelines too
                from supabase import create_client
                supabase_url = os.environ['SUPABASE_URL']
                supabase_service_key = os.environ['SUPABASE_SERVICE_KEY']
                supabase_admin = create_client(supabase_url, supabase_service_key)
                
                # Get all pipelines from database
                all_pipelines = supabase_admin.table('pipelines').select('*').execute()
                
                # Check that there are pipelines from other users
                other_users_have_pipelines = any(
                    p['owner_id'] != self.test_user_id for p in all_pipelines.data
                )
                
                # RLS is working if:
                # 1. First user only sees their own pipelines
                # 2. Other users have pipelines in the database
                rls_working = all_belong_to_user and other_users_have_pipelines
                
                self.log_result(
                    "Test 10: Cross-User Security",
                    rls_working,
                    "RLS policies working - users can only see their own pipelines" if rls_working else "RLS may have issues",
                    {
                        "first_user_pipeline_count": len(first_user_pipelines),
                        "all_pipelines_belong_to_user": all_belong_to_user,
                        "other_users_have_pipelines": other_users_have_pipelines,
                        "total_pipelines_in_db": len(all_pipelines.data)
                    }
                )
                return rls_working
            else:
                self.log_result(
                    "Test 10: Cross-User Security",
                    False,
                    f"Request failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Test 10: Cross-User Security", False, f"Error: {str(e)}")
            import traceback
            print(f"Full error: {traceback.format_exc()}")
            return False
    
    def run_all_tests(self):
        """Run all pipeline tests in sequence"""
        print("\n" + "="*80)
        print("PIPELINE MANAGEMENT API TESTING")
        print("="*80)
        
        # Authenticate
        if not self.authenticate_supabase():
            print("\n❌ Authentication failed. Cannot proceed with tests.")
            return
        
        # Run tests in order
        tests = [
            self.test_1_get_pipelines,
            self.test_2_create_pipeline,
            self.test_3_create_stages,
            self.test_4_get_stages,
            self.test_5_update_pipeline,
            self.test_6_update_stage,
            self.test_7_validation_tests,
            self.test_8_delete_stage,
            self.test_9_delete_pipeline,
            self.test_10_cross_user_security
        ]
        
        for test in tests:
            test()
        
        # Summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        passed = sum(1 for r in self.test_results if r['success'])
        total = len(self.test_results)
        
        print(f"\nTotal Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        # List failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print("\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['message']}")
        else:
            print("\n✅ All tests passed!")
        
        print("\n" + "="*80)

if __name__ == "__main__":
    tester = PipelineTester()
    tester.run_all_tests()
