#!/usr/bin/env python3
"""
Comprehensive Backend Testing for DealLinked CRM Review Request
Tests backend APIs related to the reported issues
"""

import requests
import json
from datetime import datetime
import sys
from supabase import create_client
import os
from dotenv import load_dotenv

# Load environment
load_dotenv('/app/backend/.env')

# Configuration
BASE_URL = "https://mapwise-crm.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "email": "contact@pedroarmando.com",
    "password": "Flin141812$"
}

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_ANON_KEY']

class ComprehensiveReviewTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.headers = {}
        self.test_results = []
        self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
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
    
    def authenticate(self):
        """Authenticate with Supabase"""
        try:
            result = self.supabase.auth.sign_in_with_password({
                'email': TEST_CREDENTIALS['email'],
                'password': TEST_CREDENTIALS['password']
            })
            
            if result.session:
                self.token = result.session.access_token
                self.headers = {"Authorization": f"Bearer {self.token}"}
                user_id = result.user.id
                self.log_result("Authentication", True, f"Successfully logged in as {TEST_CREDENTIALS['email']}", f"User ID: {user_id}")
                return True
            else:
                self.log_result("Authentication", False, "No session returned")
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
    
    # ========== DATA VERIFICATION TESTS ==========
    
    def test_check_existing_deals(self):
        """DATA VERIFICATION #6: Check existing deals for pipeline_id and pipeline_stage_id"""
        try:
            response = requests.get(
                f"{self.base_url}/deals",
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                deals = response.json()
                total_deals = len(deals)
                
                # Check for pipeline assignments
                deals_with_pipeline = [d for d in deals if d.get('pipeline_id')]
                deals_with_stage = [d for d in deals if d.get('pipeline_stage_id')]
                
                # Check specific deal mentioned in review request
                specific_deal = next((d for d in deals if d.get('id') == '99f88b90-1389-446f-8b26-d1d094b96c1e'), None)
                
                details = {
                    'total_deals': total_deals,
                    'deals_with_pipeline_id': len(deals_with_pipeline),
                    'deals_with_pipeline_stage_id': len(deals_with_stage),
                    'specific_deal_99f88b90': {
                        'found': specific_deal is not None,
                        'has_pipeline_id': specific_deal.get('pipeline_id') if specific_deal else None,
                        'has_pipeline_stage_id': specific_deal.get('pipeline_stage_id') if specific_deal else None,
                        'title': specific_deal.get('title') if specific_deal else None
                    }
                }
                
                if total_deals == 0:
                    self.log_result(
                        "Check Existing Deals",
                        False,
                        "No deals found in database",
                        details
                    )
                elif specific_deal and specific_deal.get('pipeline_id') and specific_deal.get('pipeline_stage_id'):
                    self.log_result(
                        "Check Existing Deals",
                        True,
                        f"Found {total_deals} deals. Specific deal 99f88b90 has pipeline assignment.",
                        details
                    )
                else:
                    self.log_result(
                        "Check Existing Deals",
                        False,
                        f"Found {total_deals} deals but pipeline assignments may be missing",
                        details
                    )
                
                return deals
            else:
                self.log_result(
                    "Check Existing Deals",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:500]
                )
                return []
                
        except Exception as e:
            self.log_result("Check Existing Deals", False, f"Request error: {str(e)}")
            return []
    
    def test_check_map_properties(self):
        """DATA VERIFICATION #7: Check map_properties table for converted properties"""
        try:
            # Query Supabase directly for map_properties
            result = self.supabase.table('map_properties').select('id, address, status, deal_id, converted').execute()
            
            if result.data:
                total_properties = len(result.data)
                converted_properties = [p for p in result.data if p.get('status') == 'converted' or p.get('converted') == True]
                properties_with_deal_id = [p for p in result.data if p.get('deal_id')]
                
                # Check specific property mentioned in review request
                specific_property = next((p for p in result.data if p.get('id') == 'd91f1ccf-fe86-496a-bb62-6e3c495d677b'), None)
                
                details = {
                    'total_properties': total_properties,
                    'converted_properties': len(converted_properties),
                    'properties_with_deal_id': len(properties_with_deal_id),
                    'specific_property_d91f1ccf': {
                        'found': specific_property is not None,
                        'status': specific_property.get('status') if specific_property else None,
                        'deal_id': specific_property.get('deal_id') if specific_property else None,
                        'address': specific_property.get('address') if specific_property else None
                    }
                }
                
                if specific_property and specific_property.get('deal_id'):
                    self.log_result(
                        "Check Map Properties",
                        True,
                        f"Found {total_properties} properties. Specific property d91f1ccf has deal_id populated.",
                        details
                    )
                else:
                    self.log_result(
                        "Check Map Properties",
                        False,
                        f"Found {total_properties} properties but specific property may not have deal_id",
                        details
                    )
                
                return result.data
            else:
                self.log_result(
                    "Check Map Properties",
                    False,
                    "No properties found in map_properties table",
                    "Table may be empty or query failed"
                )
                return []
                
        except Exception as e:
            self.log_result("Check Map Properties", False, f"Query error: {str(e)}")
            return []
    
    # ========== PROPERTY TO DEAL CONVERSION TEST ==========
    
    def test_property_to_deal_conversion(self):
        """PRIORITY 1 TEST #2: Property to Deal Conversion - Pipeline Assignment"""
        try:
            # First, get available properties from map-crm
            response = requests.get(
                f"{self.base_url}/map-crm/properties",
                headers=self.headers,
                params={'status': 'available', 'limit': 10},
                timeout=15
            )
            
            if response.status_code != 200:
                self.log_result(
                    "Property to Deal Conversion",
                    False,
                    f"Failed to fetch properties - status {response.status_code}",
                    response.text[:500]
                )
                return
            
            properties = response.json()
            
            if not properties:
                self.log_result(
                    "Property to Deal Conversion",
                    False,
                    "No available properties to test conversion",
                    "Need at least one property with status='available'"
                )
                return
            
            # Select first available property
            test_property = properties[0]
            property_id = test_property['id']
            
            # Get user's pipelines
            pipelines_response = requests.get(
                f"{self.base_url}/pipelines",
                headers=self.headers,
                timeout=15
            )
            
            if pipelines_response.status_code != 200:
                self.log_result(
                    "Property to Deal Conversion",
                    False,
                    "Failed to fetch pipelines",
                    pipelines_response.text[:500]
                )
                return
            
            pipelines_data = pipelines_response.json()
            pipelines = pipelines_data.get('pipelines', [])
            
            if not pipelines:
                self.log_result(
                    "Property to Deal Conversion",
                    False,
                    "User has no pipelines - cannot test pipeline assignment",
                    "User needs at least one pipeline"
                )
                return
            
            # Use first pipeline
            test_pipeline = pipelines[0]
            pipeline_id = test_pipeline['id']
            
            # Convert property to deal
            convert_response = requests.post(
                f"{self.base_url}/map-crm/properties/{property_id}/convert-to-deal",
                headers=self.headers,
                json={'pipeline_id': pipeline_id},
                timeout=15
            )
            
            if convert_response.status_code == 200:
                convert_data = convert_response.json()
                deal_id = convert_data.get('deal_id')
                
                # Verify the created deal has pipeline_id and pipeline_stage_id
                deal_response = requests.get(
                    f"{self.base_url}/deals/{deal_id}",
                    headers=self.headers,
                    timeout=15
                )
                
                if deal_response.status_code == 200:
                    deal = deal_response.json()
                    
                    has_pipeline_id = deal.get('pipeline_id') is not None
                    has_pipeline_stage_id = deal.get('pipeline_stage_id') is not None
                    
                    if has_pipeline_id and has_pipeline_stage_id:
                        self.log_result(
                            "Property to Deal Conversion",
                            True,
                            f"✅ CONVERSION SUCCESSFUL: Property {property_id} converted to deal {deal_id} with pipeline assignment",
                            {
                                'property_id': property_id,
                                'property_address': test_property.get('address'),
                                'deal_id': deal_id,
                                'pipeline_id': deal.get('pipeline_id'),
                                'pipeline_stage_id': deal.get('pipeline_stage_id'),
                                'deal_title': deal.get('title')
                            }
                        )
                    else:
                        self.log_result(
                            "Property to Deal Conversion",
                            False,
                            f"❌ PIPELINE ASSIGNMENT MISSING: Deal created but missing pipeline fields",
                            {
                                'deal_id': deal_id,
                                'has_pipeline_id': has_pipeline_id,
                                'has_pipeline_stage_id': has_pipeline_stage_id,
                                'deal_data': deal
                            }
                        )
                else:
                    self.log_result(
                        "Property to Deal Conversion",
                        False,
                        f"Deal created but failed to retrieve - status {deal_response.status_code}",
                        deal_response.text[:500]
                    )
            elif convert_response.status_code == 400:
                # Property may already be converted
                self.log_result(
                    "Property to Deal Conversion",
                    False,
                    "Property already converted or conversion failed",
                    convert_response.json()
                )
            else:
                self.log_result(
                    "Property to Deal Conversion",
                    False,
                    f"Conversion failed with status {convert_response.status_code}",
                    convert_response.text[:500]
                )
                
        except Exception as e:
            self.log_result("Property to Deal Conversion", False, f"Test error: {str(e)}")
    
    # ========== DEAL RETRIEVAL TEST ==========
    
    def test_get_specific_deal(self):
        """Test retrieving specific deal mentioned in review request"""
        deal_id = '99f88b90-1389-446f-8b26-d1d094b96c1e'
        
        try:
            response = requests.get(
                f"{self.base_url}/deals/{deal_id}",
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                deal = response.json()
                
                self.log_result(
                    "Get Specific Deal",
                    True,
                    f"Successfully retrieved deal {deal_id}",
                    {
                        'title': deal.get('title'),
                        'address': deal.get('address'),
                        'pipeline_id': deal.get('pipeline_id'),
                        'pipeline_stage_id': deal.get('pipeline_stage_id'),
                        'status': deal.get('status'),
                        'asset_type': deal.get('asset_type')
                    }
                )
            elif response.status_code == 404:
                self.log_result(
                    "Get Specific Deal",
                    False,
                    f"Deal {deal_id} not found",
                    "This deal may not exist or user doesn't have access"
                )
            else:
                self.log_result(
                    "Get Specific Deal",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:500]
                )
                
        except Exception as e:
            self.log_result("Get Specific Deal", False, f"Request error: {str(e)}")
    
    # ========== PIPELINE ENDPOINTS TEST ==========
    
    def test_get_pipelines(self):
        """Test GET /api/pipelines endpoint"""
        try:
            response = requests.get(
                f"{self.base_url}/pipelines",
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                pipelines = data.get('pipelines', [])
                
                if pipelines:
                    # Check if pipelines have stages
                    pipelines_with_stages = [p for p in pipelines if p.get('pipeline_stages')]
                    
                    self.log_result(
                        "Get Pipelines",
                        True,
                        f"Successfully retrieved {len(pipelines)} pipelines",
                        {
                            'total_pipelines': len(pipelines),
                            'pipelines_with_stages': len(pipelines_with_stages),
                            'pipeline_names': [p.get('name') for p in pipelines]
                        }
                    )
                    
                    return pipelines
                else:
                    self.log_result(
                        "Get Pipelines",
                        False,
                        "No pipelines found for user",
                        "User needs at least one pipeline"
                    )
                    return []
            else:
                self.log_result(
                    "Get Pipelines",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:500]
                )
                return []
                
        except Exception as e:
            self.log_result("Get Pipelines", False, f"Request error: {str(e)}")
            return []
    
    # ========== MAP CRM PROPERTIES TEST ==========
    
    def test_get_map_crm_properties(self):
        """Test GET /api/map-crm/properties endpoint"""
        try:
            response = requests.get(
                f"{self.base_url}/map-crm/properties",
                headers=self.headers,
                params={'limit': 100},
                timeout=15
            )
            
            if response.status_code == 200:
                properties = response.json()
                
                # Analyze property statuses
                status_counts = {}
                for prop in properties:
                    status = prop.get('status', 'unknown')
                    status_counts[status] = status_counts.get(status, 0) + 1
                
                self.log_result(
                    "Get Map CRM Properties",
                    True,
                    f"Successfully retrieved {len(properties)} properties",
                    {
                        'total_properties': len(properties),
                        'status_breakdown': status_counts
                    }
                )
                
                return properties
            else:
                self.log_result(
                    "Get Map CRM Properties",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:500]
                )
                return []
                
        except Exception as e:
            self.log_result("Get Map CRM Properties", False, f"Request error: {str(e)}")
            return []
    
    # ========== DASHBOARD STATS TEST ==========
    
    def test_dashboard_stats(self):
        """Test GET /api/dashboard/stats endpoint"""
        try:
            response = requests.get(
                f"{self.base_url}/dashboard/stats",
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                stats = response.json()
                
                self.log_result(
                    "Dashboard Stats",
                    True,
                    "Successfully retrieved dashboard statistics",
                    {
                        'total_pipeline_value': stats.get('total_pipeline_value'),
                        'total_deals': stats.get('total_deals'),
                        'avg_deal_size': stats.get('avg_deal_size')
                    }
                )
            else:
                self.log_result(
                    "Dashboard Stats",
                    False,
                    f"Failed with status {response.status_code}",
                    response.text[:500]
                )
                
        except Exception as e:
            self.log_result("Dashboard Stats", False, f"Request error: {str(e)}")
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"\nTotal Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n" + "="*80)
            print("FAILED TESTS:")
            print("="*80)
            for result in self.test_results:
                if not result['success']:
                    print(f"\n❌ {result['test']}")
                    print(f"   {result['message']}")
                    if result['details']:
                        print(f"   Details: {result['details']}")
        
        print("\n" + "="*80)

def main():
    print("="*80)
    print("DEALLINKED CRM - COMPREHENSIVE BACKEND TESTING")
    print("="*80)
    print(f"Test User: {TEST_CREDENTIALS['email']}")
    print(f"API Base URL: {BASE_URL}")
    print("="*80)
    
    tester = ComprehensiveReviewTester()
    
    # Authenticate
    if not tester.authenticate():
        print("\n❌ Authentication failed. Cannot proceed with tests.")
        sys.exit(1)
    
    print("\n" + "="*80)
    print("RUNNING TESTS...")
    print("="*80)
    
    # Run all tests
    tester.test_get_pipelines()
    tester.test_check_existing_deals()
    tester.test_check_map_properties()
    tester.test_get_specific_deal()
    tester.test_get_map_crm_properties()
    tester.test_property_to_deal_conversion()
    tester.test_dashboard_stats()
    
    # Print summary
    tester.print_summary()

if __name__ == "__main__":
    main()
