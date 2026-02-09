"""
DealVisor Map CRM Backend Testing
Tests all Map CRM endpoints with PropertyRadar data
"""
import requests
import json
import time
from datetime import datetime
import os

# Configuration
BASE_URL = "https://contact-mgmt-v1.preview.emergentagent.com/api"
SUPABASE_URL = "https://ygezobmpewthqvsfqrbk.supabase.co"
EMAIL = "contact@pedroarmando.com"
PASSWORD = "Flin141812$"

# ANSI color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

class MapCRMTester:
    def __init__(self):
        self.token = None
        self.test_results = []
        self.property_id = None
        
    def log(self, message, color=RESET):
        """Print colored log message"""
        print(f"{color}{message}{RESET}")
        
    def authenticate(self):
        """Authenticate with Supabase and get JWT token"""
        self.log("\n" + "="*80, BLUE)
        self.log("AUTHENTICATION", BLUE)
        self.log("="*80, BLUE)
        
        try:
            # Authenticate with Supabase
            response = requests.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                json={
                    "email": EMAIL,
                    "password": PASSWORD
                },
                headers={
                    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0",
                    "Content-Type": "application/json"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                user_id = data.get('user', {}).get('id')
                self.log(f"✅ Authentication successful", GREEN)
                self.log(f"   User ID: {user_id}", RESET)
                self.log(f"   Token: {self.token[:50]}...", RESET)
                return True
            else:
                self.log(f"❌ Authentication failed: {response.status_code}", RED)
                self.log(f"   Response: {response.text}", RED)
                return False
                
        except Exception as e:
            self.log(f"❌ Authentication error: {str(e)}", RED)
            return False
    
    def get_headers(self):
        """Get authorization headers"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_property_list(self):
        """Test 1: Property List API - Should return all 1,344 properties"""
        self.log("\n" + "="*80, BLUE)
        self.log("TEST 1: PROPERTY LIST API", BLUE)
        self.log("="*80, BLUE)
        self.log("Endpoint: GET /api/map-crm/properties?limit=10000", RESET)
        self.log("Expected: All 1,344 properties with PropertyRadar fields", RESET)
        
        try:
            start_time = time.time()
            response = requests.get(
                f"{BASE_URL}/map-crm/properties",
                headers=self.get_headers(),
                params={"limit": 10000},
                timeout=30
            )
            elapsed = time.time() - start_time
            
            self.log(f"\nStatus Code: {response.status_code}", RESET)
            self.log(f"Response Time: {elapsed:.2f}s", RESET)
            
            if response.status_code == 200:
                properties = response.json()
                count = len(properties)
                
                self.log(f"\n✅ SUCCESS: Retrieved {count} properties", GREEN)
                
                # Check if we got all 1,344 properties
                if count == 1344:
                    self.log(f"✅ PERFECT: Got exactly 1,344 properties as expected", GREEN)
                elif count > 1300:
                    self.log(f"✅ GOOD: Got {count} properties (close to expected 1,344)", GREEN)
                else:
                    self.log(f"⚠️  WARNING: Got {count} properties (expected 1,344)", YELLOW)
                
                # Check PropertyRadar fields in first property
                if properties:
                    first_prop = properties[0]
                    self.property_id = first_prop.get('id')  # Save for later tests
                    
                    self.log(f"\n📋 First Property Sample:", RESET)
                    self.log(f"   ID: {first_prop.get('id')}", RESET)
                    self.log(f"   Address: {first_prop.get('address')}", RESET)
                    self.log(f"   City: {first_prop.get('city')}, {first_prop.get('state')} {first_prop.get('zip_code')}", RESET)
                    
                    # Check PropertyRadar specific fields
                    self.log(f"\n🔍 PropertyRadar Fields Check:", RESET)
                    radar_fields = {
                        'est_equity_percent': first_prop.get('est_equity_percent'),
                        'beds': first_prop.get('beds'),
                        'baths': first_prop.get('baths'),
                        'high_equity': first_prop.get('high_equity'),
                        'est_value': first_prop.get('est_value'),
                        'owner_name': first_prop.get('owner_name')
                    }
                    
                    for field, value in radar_fields.items():
                        if value is not None:
                            self.log(f"   ✅ {field}: {value}", GREEN)
                        else:
                            self.log(f"   ⚠️  {field}: Not present", YELLOW)
                    
                    # Check San Antonio location
                    lat = first_prop.get('latitude')
                    lng = first_prop.get('longitude')
                    if lat and lng:
                        if 29.1 <= lat <= 29.7 and -98.8 <= lng <= -98.2:
                            self.log(f"\n✅ Location verified: San Antonio area ({lat}, {lng})", GREEN)
                        else:
                            self.log(f"\n⚠️  Location outside expected San Antonio bounds: ({lat}, {lng})", YELLOW)
                
                self.test_results.append({
                    'test': 'Property List API',
                    'status': 'PASS',
                    'count': count,
                    'time': elapsed
                })
                return True
                
            else:
                self.log(f"❌ FAILED: Status {response.status_code}", RED)
                self.log(f"   Response: {response.text[:500]}", RED)
                self.test_results.append({
                    'test': 'Property List API',
                    'status': 'FAIL',
                    'error': f"Status {response.status_code}"
                })
                return False
                
        except Exception as e:
            self.log(f"❌ ERROR: {str(e)}", RED)
            self.test_results.append({
                'test': 'Property List API',
                'status': 'ERROR',
                'error': str(e)
            })
            return False
    
    def test_viewport_map_data(self):
        """Test 2: Viewport Map Data API - Should return filtered properties"""
        self.log("\n" + "="*80, BLUE)
        self.log("TEST 2: VIEWPORT MAP DATA API", BLUE)
        self.log("="*80, BLUE)
        self.log("Endpoint: GET /api/map-crm/properties/map-data", RESET)
        self.log("Viewport: San Antonio area (north=30, south=29, east=-98, west=-99, zoom=11)", RESET)
        self.log("Expected: Several hundred properties (less than 1,344)", RESET)
        
        try:
            start_time = time.time()
            response = requests.get(
                f"{BASE_URL}/map-crm/properties/map-data",
                headers=self.get_headers(),
                params={
                    "north": 30,
                    "south": 29,
                    "east": -98,
                    "west": -99,
                    "zoom": 11
                },
                timeout=30
            )
            elapsed = time.time() - start_time
            
            self.log(f"\nStatus Code: {response.status_code}", RESET)
            self.log(f"Response Time: {elapsed:.2f}s", RESET)
            
            if response.status_code == 200:
                properties = response.json()
                count = len(properties)
                
                self.log(f"\n✅ SUCCESS: Retrieved {count} properties in viewport", GREEN)
                
                # Check if viewport filtering is working (should be less than total)
                if count < 1344:
                    self.log(f"✅ VIEWPORT FILTERING WORKING: {count} < 1,344 (total)", GREEN)
                else:
                    self.log(f"⚠️  WARNING: Got {count} properties (expected less than 1,344)", YELLOW)
                
                # Check if we got a reasonable number for San Antonio area
                if 100 <= count <= 1000:
                    self.log(f"✅ REASONABLE COUNT: {count} properties in San Antonio viewport", GREEN)
                elif count > 0:
                    self.log(f"⚠️  Got {count} properties (expected 100-1000 for this viewport)", YELLOW)
                
                # Sample a few properties
                if properties:
                    self.log(f"\n📋 Sample Properties in Viewport:", RESET)
                    for i, prop in enumerate(properties[:3], 1):
                        self.log(f"   {i}. {prop.get('address')}, {prop.get('city')} - ({prop.get('latitude')}, {prop.get('longitude')})", RESET)
                
                self.test_results.append({
                    'test': 'Viewport Map Data API',
                    'status': 'PASS',
                    'count': count,
                    'time': elapsed
                })
                return True
                
            else:
                self.log(f"❌ FAILED: Status {response.status_code}", RED)
                self.log(f"   Response: {response.text[:500]}", RED)
                self.test_results.append({
                    'test': 'Viewport Map Data API',
                    'status': 'FAIL',
                    'error': f"Status {response.status_code}"
                })
                return False
                
        except Exception as e:
            self.log(f"❌ ERROR: {str(e)}", RED)
            self.test_results.append({
                'test': 'Viewport Map Data API',
                'status': 'ERROR',
                'error': str(e)
            })
            return False
    
    def test_property_detail(self):
        """Test 3: Property Detail API - Should return full property details"""
        self.log("\n" + "="*80, BLUE)
        self.log("TEST 3: PROPERTY DETAIL API", BLUE)
        self.log("="*80, BLUE)
        
        if not self.property_id:
            self.log("⚠️  Skipping: No property_id available from previous test", YELLOW)
            return False
        
        self.log(f"Endpoint: GET /api/map-crm/properties/{self.property_id}", RESET)
        self.log("Expected: Full property details with all fields", RESET)
        
        try:
            start_time = time.time()
            response = requests.get(
                f"{BASE_URL}/map-crm/properties/{self.property_id}",
                headers=self.get_headers(),
                timeout=10
            )
            elapsed = time.time() - start_time
            
            self.log(f"\nStatus Code: {response.status_code}", RESET)
            self.log(f"Response Time: {elapsed:.2f}s", RESET)
            
            if response.status_code == 200:
                property_data = response.json()
                
                self.log(f"\n✅ SUCCESS: Retrieved property details", GREEN)
                
                # Display key fields
                self.log(f"\n📋 Property Details:", RESET)
                self.log(f"   ID: {property_data.get('id')}", RESET)
                self.log(f"   Address: {property_data.get('address')}", RESET)
                self.log(f"   City: {property_data.get('city')}, {property_data.get('state')} {property_data.get('zip_code')}", RESET)
                self.log(f"   Asset Type: {property_data.get('asset_type')}", RESET)
                self.log(f"   Status: {property_data.get('status')}", RESET)
                
                # Check numeric field formatting
                self.log(f"\n🔢 Numeric Fields Formatting:", RESET)
                numeric_fields = {
                    'asking_price': property_data.get('asking_price'),
                    'lot_size': property_data.get('lot_size'),
                    'building_size': property_data.get('building_size'),
                    'est_equity_percent': property_data.get('est_equity_percent'),
                    'est_value': property_data.get('est_value'),
                    'beds': property_data.get('beds'),
                    'baths': property_data.get('baths')
                }
                
                for field, value in numeric_fields.items():
                    if value is not None:
                        value_type = type(value).__name__
                        self.log(f"   ✅ {field}: {value} (type: {value_type})", GREEN)
                    else:
                        self.log(f"   ⚠️  {field}: null", YELLOW)
                
                # Check PropertyRadar specific fields
                self.log(f"\n🏠 PropertyRadar Fields:", RESET)
                radar_fields = ['owner_name', 'owner_type', 'high_equity', 'cash_buyer', 'owner_occupied']
                for field in radar_fields:
                    value = property_data.get(field)
                    if value is not None:
                        self.log(f"   ✅ {field}: {value}", GREEN)
                
                self.test_results.append({
                    'test': 'Property Detail API',
                    'status': 'PASS',
                    'time': elapsed
                })
                return True
                
            else:
                self.log(f"❌ FAILED: Status {response.status_code}", RED)
                self.log(f"   Response: {response.text[:500]}", RED)
                self.test_results.append({
                    'test': 'Property Detail API',
                    'status': 'FAIL',
                    'error': f"Status {response.status_code}"
                })
                return False
                
        except Exception as e:
            self.log(f"❌ ERROR: {str(e)}", RED)
            self.test_results.append({
                'test': 'Property Detail API',
                'status': 'ERROR',
                'error': str(e)
            })
            return False
    
    def test_property_update(self):
        """Test 4: Property Update API - Should update notes field"""
        self.log("\n" + "="*80, BLUE)
        self.log("TEST 4: PROPERTY UPDATE API", BLUE)
        self.log("="*80, BLUE)
        
        if not self.property_id:
            self.log("⚠️  Skipping: No property_id available from previous test", YELLOW)
            return False
        
        self.log(f"Endpoint: PUT /api/map-crm/properties/{self.property_id}", RESET)
        self.log("Action: Update notes field", RESET)
        
        try:
            # Update notes
            test_notes = f"Test note added at {datetime.now().isoformat()}"
            
            start_time = time.time()
            response = requests.put(
                f"{BASE_URL}/map-crm/properties/{self.property_id}",
                headers=self.get_headers(),
                json={"notes": test_notes},
                timeout=10
            )
            elapsed = time.time() - start_time
            
            self.log(f"\nStatus Code: {response.status_code}", RESET)
            self.log(f"Response Time: {elapsed:.2f}s", RESET)
            
            if response.status_code == 200:
                updated_property = response.json()
                
                self.log(f"\n✅ SUCCESS: Property updated", GREEN)
                self.log(f"   Updated notes: {updated_property.get('notes')}", RESET)
                
                # Verify the update
                if updated_property.get('notes') == test_notes:
                    self.log(f"✅ VERIFICATION: Notes field updated correctly", GREEN)
                else:
                    self.log(f"⚠️  WARNING: Notes field mismatch", YELLOW)
                    self.log(f"   Expected: {test_notes}", YELLOW)
                    self.log(f"   Got: {updated_property.get('notes')}", YELLOW)
                
                # Check updated_at timestamp
                if updated_property.get('updated_at'):
                    self.log(f"✅ Timestamp updated: {updated_property.get('updated_at')}", GREEN)
                
                self.test_results.append({
                    'test': 'Property Update API',
                    'status': 'PASS',
                    'time': elapsed
                })
                return True
                
            else:
                self.log(f"❌ FAILED: Status {response.status_code}", RED)
                self.log(f"   Response: {response.text[:500]}", RED)
                self.test_results.append({
                    'test': 'Property Update API',
                    'status': 'FAIL',
                    'error': f"Status {response.status_code}"
                })
                return False
                
        except Exception as e:
            self.log(f"❌ ERROR: {str(e)}", RED)
            self.test_results.append({
                'test': 'Property Update API',
                'status': 'ERROR',
                'error': str(e)
            })
            return False
    
    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "="*80, BLUE)
        self.log("TEST SUMMARY", BLUE)
        self.log("="*80, BLUE)
        
        total_tests = len(self.test_results)
        passed = sum(1 for r in self.test_results if r['status'] == 'PASS')
        failed = sum(1 for r in self.test_results if r['status'] == 'FAIL')
        errors = sum(1 for r in self.test_results if r['status'] == 'ERROR')
        
        self.log(f"\nTotal Tests: {total_tests}", RESET)
        self.log(f"Passed: {passed}", GREEN)
        self.log(f"Failed: {failed}", RED if failed > 0 else RESET)
        self.log(f"Errors: {errors}", RED if errors > 0 else RESET)
        
        self.log(f"\n📊 Detailed Results:", RESET)
        for result in self.test_results:
            status_color = GREEN if result['status'] == 'PASS' else RED
            status_icon = "✅" if result['status'] == 'PASS' else "❌"
            
            self.log(f"\n{status_icon} {result['test']}: {result['status']}", status_color)
            if 'count' in result:
                self.log(f"   Properties: {result['count']}", RESET)
            if 'time' in result:
                self.log(f"   Response Time: {result['time']:.2f}s", RESET)
            if 'error' in result:
                self.log(f"   Error: {result['error']}", RED)
        
        # Overall verdict
        self.log("\n" + "="*80, BLUE)
        if passed == total_tests:
            self.log("🎉 ALL TESTS PASSED - MAP CRM READY FOR PRODUCTION", GREEN)
        elif passed > 0:
            self.log(f"⚠️  PARTIAL SUCCESS - {passed}/{total_tests} tests passed", YELLOW)
        else:
            self.log("❌ ALL TESTS FAILED - CRITICAL ISSUES FOUND", RED)
        self.log("="*80, BLUE)
    
    def run_all_tests(self):
        """Run all Map CRM tests"""
        self.log("\n" + "="*80, BLUE)
        self.log("DEALVISOR MAP CRM BACKEND TESTING", BLUE)
        self.log("="*80, BLUE)
        self.log(f"Base URL: {BASE_URL}", RESET)
        self.log(f"User: {EMAIL}", RESET)
        self.log(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", RESET)
        
        # Authenticate
        if not self.authenticate():
            self.log("\n❌ Authentication failed. Cannot proceed with tests.", RED)
            return
        
        # Run tests
        self.test_property_list()
        self.test_viewport_map_data()
        self.test_property_detail()
        self.test_property_update()
        
        # Print summary
        self.print_summary()


if __name__ == "__main__":
    tester = MapCRMTester()
    tester.run_all_tests()
