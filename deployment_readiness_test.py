#!/usr/bin/env python3
"""
COMPREHENSIVE BACKEND DEPLOYMENT READINESS VERIFICATION
Tests all critical endpoints for production deployment
"""

import requests
import json
from datetime import datetime
import sys
import time
import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv('/app/backend/.env')

# Configuration
BASE_URL = "https://mockdata-hub.preview.emergentagent.com/api"
TEST_USER = {
    "email": "contact@pedroarmando.com",
    "password": "Flin141812$"
}

# Supabase configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY')

class DeploymentReadinessTest:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.headers = {}
        self.test_results = []
        self.response_times = []
        self.created_resources = {
            'deals': [],
            'pipelines': [],
            'messages': []
        }
        
    def log_result(self, test_name, success, message, details=None, response_time=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "response_time": response_time,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        time_str = f" ({response_time:.3f}s)" if response_time else ""
        print(f"{status}: {test_name}{time_str}")
        if message:
            print(f"   {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, **kwargs):
        """Make HTTP request and track response time"""
        start_time = time.time()
        try:
            url = f"{self.base_url}{endpoint}"
            kwargs['timeout'] = kwargs.get('timeout', 10)
            response = getattr(requests, method.lower())(url, **kwargs)
            response_time = time.time() - start_time
            self.response_times.append(response_time)
            return response, response_time
        except Exception as e:
            response_time = time.time() - start_time
            raise
    
    # ==================== AUTHENTICATION ====================
    
    def test_authentication(self):
        """Test 1: Authentication Flow"""
        print("\n" + "="*60)
        print("1. AUTHENTICATION")
        print("="*60)
        
        try:
            start_time = time.time()
            
            # Use Supabase client for authentication
            supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            
            # Sign in with password
            result = supabase.auth.sign_in_with_password({
                'email': TEST_USER['email'],
                'password': TEST_USER['password']
            })
            
            resp_time = time.time() - start_time
            self.response_times.append(resp_time)
            
            if result.session and result.session.access_token:
                self.token = result.session.access_token
                self.headers = {"Authorization": f"Bearer {self.token}"}
                user_id = result.user.id if result.user else "unknown"
                self.log_result(
                    "Authentication",
                    True,
                    f"Successfully logged in. User ID: {user_id}",
                    response_time=resp_time
                )
                return True
            else:
                self.log_result(
                    "Authentication",
                    False,
                    "Login failed - no session returned",
                    None,
                    resp_time
                )
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Error: {str(e)}")
            return False
    
    # ==================== DEALS API - FULL CRUD ====================
    
    def test_deals_crud(self):
        """Test 2: Deals API - Complete CRUD Flow"""
        print("\n" + "="*60)
        print("2. DEALS API - FULL CRUD TESTING")
        print("="*60)
        
        # CREATE Deal with all required fields matching actual schema
        deal_data = {
            "title": "Test Deal - Deployment Verification",
            "address": "123 Test Street, San Antonio, TX 78201",
            "asset_type": "Office",
            "price": 2500000,
            "latitude": 29.4241,
            "longitude": -98.4936,
            "size": 15000,
            "description": "Test deal for deployment readiness verification"
        }
        
        try:
            response, resp_time = self.make_request(
                'POST',
                '/deals',
                json=deal_data,
                headers=self.headers
            )
            
            if response.status_code in [200, 201]:
                deal = response.json()
                deal_id = deal.get('id')
                self.created_resources['deals'].append(deal_id)
                self.log_result(
                    "Create Deal",
                    True,
                    f"Deal created successfully. ID: {deal_id}",
                    response_time=resp_time
                )
            else:
                self.log_result(
                    "Create Deal",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text,
                    resp_time
                )
                return False
        except Exception as e:
            self.log_result("Create Deal", False, f"Error: {str(e)}")
            return False
        
        # GET All Deals
        try:
            response, resp_time = self.make_request(
                'GET',
                '/deals',
                headers=self.headers
            )
            
            if response.status_code == 200:
                deals = response.json()
                self.log_result(
                    "List Deals",
                    True,
                    f"Retrieved {len(deals)} deals",
                    response_time=resp_time
                )
            else:
                self.log_result(
                    "List Deals",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text,
                    resp_time
                )
        except Exception as e:
            self.log_result("List Deals", False, f"Error: {str(e)}")
        
        # GET Single Deal
        try:
            response, resp_time = self.make_request(
                'GET',
                f'/deals/{deal_id}',
                headers=self.headers
            )
            
            if response.status_code == 200:
                deal = response.json()
                # Verify price field
                price = deal.get('price')
                self.log_result(
                    "Get Single Deal",
                    True,
                    f"Retrieved deal. Price: ${price:,.0f}" if price else "Retrieved deal",
                    response_time=resp_time
                )
            else:
                self.log_result(
                    "Get Single Deal",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text,
                    resp_time
                )
        except Exception as e:
            self.log_result("Get Single Deal", False, f"Error: {str(e)}")
        
        # UPDATE Deal
        update_data = {
            "price": 2750000,
            "description": "Updated test deal"
        }
        
        try:
            response, resp_time = self.make_request(
                'PUT',
                f'/deals/{deal_id}',
                json=update_data,
                headers=self.headers
            )
            
            if response.status_code == 200:
                updated_deal = response.json()
                self.log_result(
                    "Update Deal",
                    True,
                    f"Deal updated. New price: ${updated_deal.get('price', 0):,.0f}",
                    response_time=resp_time
                )
            else:
                self.log_result(
                    "Update Deal",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text,
                    resp_time
                )
        except Exception as e:
            self.log_result("Update Deal", False, f"Error: {str(e)}")
        
        # DELETE Deal (cleanup)
        try:
            response, resp_time = self.make_request(
                'DELETE',
                f'/deals/{deal_id}',
                headers=self.headers
            )
            
            if response.status_code in [200, 204]:
                self.log_result(
                    "Delete Deal",
                    True,
                    "Deal deleted successfully",
                    response_time=resp_time
                )
                self.created_resources['deals'].remove(deal_id)
            else:
                self.log_result(
                    "Delete Deal",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text,
                    resp_time
                )
        except Exception as e:
            self.log_result("Delete Deal", False, f"Error: {str(e)}")
        
        return True
    
    # ==================== DEAL MOVEMENT & PIPELINE ====================
    
    def test_deal_movement(self):
        """Test 3: Deal Movement & Pipeline Integration"""
        print("\n" + "="*60)
        print("3. DEAL MOVEMENT & PIPELINE INTEGRATION")
        print("="*60)
        
        # First, get user's pipelines
        try:
            response, resp_time = self.make_request(
                'GET',
                '/pipelines',
                headers=self.headers
            )
            
            if response.status_code == 200:
                pipelines = response.json()
                if not pipelines:
                    self.log_result(
                        "Get Pipelines",
                        False,
                        "No pipelines found for user",
                        response_time=resp_time
                    )
                    return False
                
                pipeline = pipelines[0]
                pipeline_id = pipeline.get('id')
                stages = pipeline.get('pipeline_stages', [])
                
                self.log_result(
                    "Get Pipelines",
                    True,
                    f"Retrieved {len(pipelines)} pipelines. First pipeline has {len(stages)} stages",
                    response_time=resp_time
                )
                
                if len(stages) < 2:
                    self.log_result(
                        "Pipeline Stages",
                        False,
                        "Pipeline needs at least 2 stages to test movement"
                    )
                    return False
                
                # Create a test deal with correct field names
                deal_data = {
                    "title": "Test Deal - Movement",
                    "address": "456 Pipeline Test Ave, San Antonio, TX",
                    "asset_type": "Retail",
                    "price": 1500000,
                    "latitude": 29.4241,
                    "longitude": -98.4936,
                    "pipeline_id": pipeline_id,
                    "pipeline_stage_id": stages[0]['id']
                }
                
                response, resp_time = self.make_request(
                    'POST',
                    '/deals',
                    json=deal_data,
                    headers=self.headers
                )
                
                if response.status_code in [200, 201]:
                    deal = response.json()
                    deal_id = deal.get('id')
                    self.created_resources['deals'].append(deal_id)
                    
                    # Move deal to next stage
                    move_data = {
                        "pipeline_stage_id": stages[1]['id']
                    }
                    
                    response, resp_time = self.make_request(
                        'PUT',
                        f'/deals/{deal_id}/move',
                        json=move_data,
                        headers=self.headers
                    )
                    
                    if response.status_code == 200:
                        updated_deal = response.json()
                        new_stage_id = updated_deal.get('pipeline_stage_id')
                        self.log_result(
                            "Move Deal Between Stages",
                            new_stage_id == stages[1]['id'],
                            f"Deal moved to stage: {stages[1]['name']}" if new_stage_id == stages[1]['id'] else "Stage ID mismatch",
                            response_time=resp_time
                        )
                    else:
                        self.log_result(
                            "Move Deal Between Stages",
                            False,
                            f"Failed with status {response.status_code}",
                            response.text,
                            resp_time
                        )
                    
                    # Cleanup
                    try:
                        self.make_request('DELETE', f'/deals/{deal_id}', headers=self.headers)
                        self.created_resources['deals'].remove(deal_id)
                    except:
                        pass
                else:
                    self.log_result(
                        "Create Deal for Movement",
                        False,
                        f"Failed with status {response.status_code}",
                        response.text,
                        resp_time
                    )
                    return False
                    
            else:
                self.log_result(
                    "Get Pipelines",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text,
                    resp_time
                )
                return False
                
        except Exception as e:
            self.log_result("Deal Movement", False, f"Error: {str(e)}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
            return False
        
        return True
    
    # ==================== MARKETPLACE PUBLISHING ====================
    
    def test_marketplace_publishing(self):
        """Test 4: Marketplace Publishing Flow"""
        print("\n" + "="*60)
        print("4. MARKETPLACE PUBLISHING FLOW")
        print("="*60)
        
        # Create a deal to publish with correct field names
        deal_data = {
            "deal_title": "Test Marketplace Deal",
            "property_address": "789 Market Street, San Antonio, TX",
            "asset_type": "Industrial",
            "asking_price": 3000000,
            "building_size": 20000,
            "latitude": 29.4241,
            "longitude": -98.4936,
            "description": "Test deal for marketplace publishing"
        }
        
        try:
            response, resp_time = self.make_request(
                'POST',
                '/deals',
                json=deal_data,
                headers=self.headers
            )
            
            if response.status_code in [200, 201]:
                deal = response.json()
                deal_id = deal.get('id')
                self.created_resources['deals'].append(deal_id)
                
                # Publish to marketplace
                response, resp_time = self.make_request(
                    'POST',
                    f'/deals/{deal_id}/publish',
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    completeness = result.get('completeness_score', 0)
                    approval_status = result.get('approval_status')
                    
                    self.log_result(
                        "Publish Deal to Marketplace",
                        True,
                        f"Deal published. Completeness: {completeness}%, Status: {approval_status}",
                        response_time=resp_time
                    )
                else:
                    self.log_result(
                        "Publish Deal to Marketplace",
                        False,
                        f"Failed with status {response.status_code}",
                        response.text,
                        resp_time
                    )
                
                # Cleanup
                try:
                    self.make_request('DELETE', f'/deals/{deal_id}', headers=self.headers)
                    self.created_resources['deals'].remove(deal_id)
                except:
                    pass
            else:
                self.log_result(
                    "Create Deal for Publishing",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text,
                    resp_time
                )
                
        except Exception as e:
            self.log_result("Marketplace Publishing", False, f"Error: {str(e)}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
    
    # ==================== PIPELINE MANAGEMENT ====================
    
    def test_pipeline_management(self):
        """Test 5: Pipeline Management"""
        print("\n" + "="*60)
        print("5. PIPELINE MANAGEMENT")
        print("="*60)
        
        # List Pipelines
        try:
            response, resp_time = self.make_request(
                'GET',
                '/pipelines',
                headers=self.headers
            )
            
            if response.status_code == 200:
                pipelines = response.json()
                self.log_result(
                    "List Pipelines",
                    True,
                    f"Retrieved {len(pipelines)} pipelines",
                    response_time=resp_time
                )
                
                if pipelines:
                    pipeline_id = pipelines[0].get('id')
                    
                    # Get Pipeline Stages
                    try:
                        response, resp_time = self.make_request(
                            'GET',
                            f'/pipelines/{pipeline_id}/stages',
                            headers=self.headers
                        )
                        
                        if response.status_code == 200:
                            stages = response.json()
                            self.log_result(
                                "Get Pipeline Stages",
                                True,
                                f"Retrieved {len(stages)} stages",
                                response_time=resp_time
                            )
                        else:
                            self.log_result(
                                "Get Pipeline Stages",
                                False,
                                f"Failed with status {response.status_code}",
                                response.text,
                                resp_time
                            )
                    except Exception as e:
                        self.log_result("Get Pipeline Stages", False, f"Error: {str(e)}")
                    
                    # Update Pipeline
                    try:
                        update_data = {"name": pipelines[0].get('name', 'Test Pipeline')}
                        response, resp_time = self.make_request(
                            'PUT',
                            f'/pipelines/{pipeline_id}',
                            json=update_data,
                            headers=self.headers
                        )
                        
                        if response.status_code == 200:
                            self.log_result(
                                "Update Pipeline",
                                True,
                                "Pipeline updated successfully",
                                response_time=resp_time
                            )
                        else:
                            self.log_result(
                                "Update Pipeline",
                                False,
                                f"Failed with status {response.status_code}",
                                response.text,
                                resp_time
                            )
                    except Exception as e:
                        self.log_result("Update Pipeline", False, f"Error: {str(e)}")
                
            else:
                self.log_result(
                    "List Pipelines",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text,
                    resp_time
                )
                
        except Exception as e:
            self.log_result("Pipeline Management", False, f"Error: {str(e)}")
            import traceback
            print(f"   Traceback: {traceback.format_exc()}")
    
    # ==================== MESSAGING SYSTEM ====================
    
    def test_messaging_system(self):
        """Test 6: Messaging System"""
        print("\n" + "="*60)
        print("6. MESSAGING SYSTEM")
        print("="*60)
        
        # List Conversations
        try:
            response, resp_time = self.make_request(
                'GET',
                '/messages/conversations',
                headers=self.headers
            )
            
            if response.status_code == 200:
                conversations = response.json()
                self.log_result(
                    "List Conversations",
                    True,
                    f"Retrieved {len(conversations)} conversations",
                    response_time=resp_time
                )
            else:
                self.log_result(
                    "List Conversations",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text,
                    resp_time
                )
                
        except Exception as e:
            self.log_result("Messaging System", False, f"Error: {str(e)}")
    
    # ==================== TEAMS & COLLABORATION ====================
    
    def test_teams_collaboration(self):
        """Test 7: Teams & Collaboration"""
        print("\n" + "="*60)
        print("7. TEAMS & COLLABORATION")
        print("="*60)
        
        # Get User's Teams
        try:
            response, resp_time = self.make_request(
                'GET',
                '/teams',
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                teams = data.get('teams', [])
                self.log_result(
                    "Get User Teams",
                    True,
                    f"Retrieved {len(teams)} teams",
                    response_time=resp_time
                )
                
                if teams:
                    team_id = teams[0].get('id')
                    
                    # Get Team Stats
                    response, resp_time = self.make_request(
                        'GET',
                        f'/teams/{team_id}/stats',
                        headers=self.headers
                    )
                    
                    if response.status_code == 200:
                        stats = response.json()
                        team_stats = stats.get('team_stats', {})
                        self.log_result(
                            "Get Team Stats",
                            True,
                            f"Active deals: {team_stats.get('total_active_deals', 0)}, Pipeline: ${team_stats.get('total_pipeline_value', 0):,.0f}",
                            response_time=resp_time
                        )
                    else:
                        self.log_result(
                            "Get Team Stats",
                            False,
                            f"Failed with status {response.status_code}",
                            response.text,
                            resp_time
                        )
                    
                    # Get Team Members
                    response, resp_time = self.make_request(
                        'GET',
                        f'/teams/{team_id}/members',
                        headers=self.headers
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        members = data.get('members', [])
                        self.log_result(
                            "Get Team Members",
                            True,
                            f"Retrieved {len(members)} team members",
                            response_time=resp_time
                        )
                    else:
                        self.log_result(
                            "Get Team Members",
                            False,
                            f"Failed with status {response.status_code}",
                            response.text,
                            resp_time
                        )
                
            else:
                self.log_result(
                    "Get User Teams",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text,
                    resp_time
                )
                
        except Exception as e:
            self.log_result("Teams & Collaboration", False, f"Error: {str(e)}")
    
    # ==================== ADMIN FUNCTIONS ====================
    
    def test_admin_functions(self):
        """Test 8: Admin Functions"""
        print("\n" + "="*60)
        print("8. ADMIN FUNCTIONS")
        print("="*60)
        
        # Get Pending Deals (Admin)
        try:
            response, resp_time = self.make_request(
                'GET',
                '/admin/pending-deals',
                headers=self.headers
            )
            
            if response.status_code == 200:
                deals = response.json()
                self.log_result(
                    "Get Pending Deals (Admin)",
                    True,
                    f"Retrieved {len(deals)} pending deals",
                    response_time=resp_time
                )
            elif response.status_code == 403:
                self.log_result(
                    "Get Pending Deals (Admin)",
                    True,
                    "Correctly rejected non-admin user (403)",
                    response_time=resp_time
                )
            else:
                self.log_result(
                    "Get Pending Deals (Admin)",
                    False,
                    f"Unexpected status {response.status_code}",
                    response.text,
                    resp_time
                )
                
        except Exception as e:
            self.log_result("Admin Functions", False, f"Error: {str(e)}")
        
        # Get Admin Stats
        try:
            response, resp_time = self.make_request(
                'GET',
                '/admin/stats',
                headers=self.headers
            )
            
            if response.status_code == 200:
                stats = response.json()
                self.log_result(
                    "Get Admin Stats",
                    True,
                    f"Retrieved admin statistics",
                    response_time=resp_time
                )
            elif response.status_code == 403:
                self.log_result(
                    "Get Admin Stats",
                    True,
                    "Correctly rejected non-admin user (403)",
                    response_time=resp_time
                )
            else:
                self.log_result(
                    "Get Admin Stats",
                    False,
                    f"Unexpected status {response.status_code}",
                    response.text,
                    resp_time
                )
                
        except Exception as e:
            self.log_result("Admin Stats", False, f"Error: {str(e)}")
    
    # ==================== ONBOARDING & ROLES ====================
    
    def test_onboarding_roles(self):
        """Test 9: Onboarding & Roles"""
        print("\n" + "="*60)
        print("9. ONBOARDING & ROLES")
        print("="*60)
        
        # Get Onboarding Status
        try:
            response, resp_time = self.make_request(
                'GET',
                '/onboarding/status',
                headers=self.headers
            )
            
            if response.status_code == 200:
                status = response.json()
                self.log_result(
                    "Get Onboarding Status",
                    True,
                    f"Onboarding status retrieved",
                    response_time=resp_time
                )
            else:
                self.log_result(
                    "Get Onboarding Status",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text,
                    resp_time
                )
                
        except Exception as e:
            self.log_result("Onboarding Status", False, f"Error: {str(e)}")
        
        # Get Verification Status
        try:
            response, resp_time = self.make_request(
                'GET',
                '/onboarding/verification-status',
                headers=self.headers
            )
            
            if response.status_code == 200:
                status = response.json()
                self.log_result(
                    "Get Verification Status",
                    True,
                    f"Verification status retrieved",
                    response_time=resp_time
                )
            else:
                self.log_result(
                    "Get Verification Status",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text,
                    resp_time
                )
                
        except Exception as e:
            self.log_result("Verification Status", False, f"Error: {str(e)}")
    
    # ==================== ERROR HANDLING ====================
    
    def test_error_handling(self):
        """Test 10: Error Handling"""
        print("\n" + "="*60)
        print("10. ERROR HANDLING")
        print("="*60)
        
        # Test with invalid token
        try:
            invalid_headers = {"Authorization": "Bearer invalid_token_12345"}
            response, resp_time = self.make_request(
                'GET',
                '/deals',
                headers=invalid_headers
            )
            
            if response.status_code == 401:
                self.log_result(
                    "Invalid Token (401)",
                    True,
                    "Correctly rejected invalid token",
                    response_time=resp_time
                )
            else:
                self.log_result(
                    "Invalid Token (401)",
                    False,
                    f"Expected 401, got {response.status_code}",
                    response.text,
                    resp_time
                )
                
        except Exception as e:
            self.log_result("Invalid Token Test", False, f"Error: {str(e)}")
        
        # Test with missing resource (404)
        try:
            response, resp_time = self.make_request(
                'GET',
                '/deals/00000000-0000-0000-0000-000000000000',
                headers=self.headers
            )
            
            if response.status_code == 404:
                self.log_result(
                    "Missing Resource (404)",
                    True,
                    "Correctly returned 404 for missing deal",
                    response_time=resp_time
                )
            else:
                self.log_result(
                    "Missing Resource (404)",
                    False,
                    f"Expected 404, got {response.status_code}",
                    response.text,
                    resp_time
                )
                
        except Exception as e:
            self.log_result("Missing Resource Test", False, f"Error: {str(e)}")
    
    # ==================== PERFORMANCE BENCHMARKS ====================
    
    def test_performance(self):
        """Test 11: Performance Benchmarks"""
        print("\n" + "="*60)
        print("11. PERFORMANCE BENCHMARKS")
        print("="*60)
        
        if not self.response_times:
            self.log_result("Performance", False, "No response times recorded")
            return
        
        avg_time = sum(self.response_times) / len(self.response_times)
        max_time = max(self.response_times)
        min_time = min(self.response_times)
        
        # Check if all responses are under 2 seconds
        slow_responses = [t for t in self.response_times if t > 2.0]
        
        self.log_result(
            "Average Response Time",
            avg_time < 0.5,
            f"{avg_time:.3f}s (Target: <0.5s)"
        )
        
        self.log_result(
            "Maximum Response Time",
            max_time < 2.0,
            f"{max_time:.3f}s (Target: <2.0s)"
        )
        
        self.log_result(
            "Minimum Response Time",
            True,
            f"{min_time:.3f}s"
        )
        
        if slow_responses:
            self.log_result(
                "Slow Responses",
                False,
                f"{len(slow_responses)} responses exceeded 2 seconds"
            )
        else:
            self.log_result(
                "Slow Responses",
                True,
                "All responses under 2 seconds"
            )
    
    # ==================== MAIN TEST RUNNER ====================
    
    def run_all_tests(self):
        """Run all deployment readiness tests"""
        print("\n" + "="*70)
        print("COMPREHENSIVE BACKEND DEPLOYMENT READINESS VERIFICATION")
        print("="*70)
        print(f"Test User: {TEST_USER['email']}")
        print(f"Backend URL: {BASE_URL}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run tests in sequence
        if not self.test_authentication():
            print("\n❌ CRITICAL: Authentication failed. Cannot proceed with tests.")
            return self.generate_report()
        
        self.test_deals_crud()
        self.test_deal_movement()
        self.test_marketplace_publishing()
        self.test_pipeline_management()
        self.test_messaging_system()
        self.test_teams_collaboration()
        self.test_admin_functions()
        self.test_onboarding_roles()
        self.test_error_handling()
        self.test_performance()
        
        return self.generate_report()
    
    def generate_report(self):
        """Generate final deployment readiness report"""
        print("\n" + "="*70)
        print("DEPLOYMENT READINESS REPORT")
        print("="*70)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - passed_tests
        pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n📊 OVERALL PASS RATE: {passed_tests}/{total_tests} tests passed ({pass_rate:.1f}%)")
        
        # Critical Failures
        critical_failures = [r for r in self.test_results if not r['success']]
        if critical_failures:
            print(f"\n❌ CRITICAL FAILURES ({len(critical_failures)}):")
            for failure in critical_failures:
                print(f"   • {failure['test']}: {failure['message']}")
        else:
            print("\n✅ NO CRITICAL FAILURES")
        
        # Performance Summary
        if self.response_times:
            avg_time = sum(self.response_times) / len(self.response_times)
            max_time = max(self.response_times)
            print(f"\n⚡ PERFORMANCE SUMMARY:")
            print(f"   • Average Response Time: {avg_time:.3f}s")
            print(f"   • Maximum Response Time: {max_time:.3f}s")
            print(f"   • Total Requests: {len(self.response_times)}")
        
        # Final Verdict
        print(f"\n{'='*70}")
        if pass_rate >= 95 and not any('Authentication' in r['test'] for r in critical_failures):
            print("✅ FINAL VERDICT: DEPLOYMENT READY")
            print("   Backend is ready for production load")
        elif pass_rate >= 80:
            print("⚠️  FINAL VERDICT: FIXES REQUIRED")
            print("   Some non-critical issues need attention")
        else:
            print("❌ FINAL VERDICT: NOT READY FOR DEPLOYMENT")
            print("   Critical issues must be resolved")
        print("="*70)
        
        return {
            'total_tests': total_tests,
            'passed': passed_tests,
            'failed': failed_tests,
            'pass_rate': pass_rate,
            'critical_failures': critical_failures,
            'deployment_ready': pass_rate >= 95
        }

if __name__ == "__main__":
    tester = DeploymentReadinessTest()
    result = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if result['deployment_ready'] else 1)
