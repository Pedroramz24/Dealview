#!/usr/bin/env python3
"""
Marketplace Backend API Testing
Tests marketplace filters, deals browsing, and deal detail endpoints
"""

import requests
import json
from datetime import datetime
import sys

# Configuration
BASE_URL = "https://dealflow-connect-2.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "email": "contact@pedroarmando.com",
    "password": "Flin141812$"
}

class MarketplaceTester:
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
        """Authenticate with Supabase credentials"""
        try:
            from supabase import create_client
            import os
            from dotenv import load_dotenv
            
            load_dotenv('/app/backend/.env')
            
            supabase_url = os.environ['SUPABASE_URL']
            supabase_key = os.environ['SUPABASE_ANON_KEY']
            
            supabase = create_client(supabase_url, supabase_key)
            
            # Try to sign in with Supabase
            result = supabase.auth.sign_in_with_password({
                'email': TEST_CREDENTIALS['email'],
                'password': TEST_CREDENTIALS['password']
            })
            
            if result.session:
                self.token = result.session.access_token
                self.headers = {"Authorization": f"Bearer {self.token}"}
                self.log_result("Authentication", True, f"Successfully logged in as {TEST_CREDENTIALS['email']} via Supabase")
                return True
            else:
                self.log_result("Authentication", False, "No session returned from Supabase")
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Supabase authentication error: {str(e)}")
            return False
    
    def test_marketplace_filters(self):
        """Test GET /api/marketplace/filters - Should return comprehensive asset types"""
        try:
            response = requests.get(
                f"{self.base_url}/marketplace/filters",
                headers=self.headers,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["user_preferences", "available_filters"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result(
                        "Marketplace Filters - Structure", 
                        False, 
                        f"Response missing required fields: {missing_fields}",
                        f"Response keys: {list(data.keys())}"
                    )
                    return None
                
                available_filters = data.get("available_filters", {})
                asset_types = available_filters.get("asset_types", [])
                markets = available_filters.get("markets", [])
                strategies = available_filters.get("strategies", [])
                
                # Check for comprehensive asset types (should have 60+ types)
                comprehensive_types_found = [
                    "Office - Class A", "Office - Class B", "Office - Class C",
                    "Retail - Shopping Center", "Industrial - Warehouse",
                    "Land - Commercial", "Multifamily - Garden Style"
                ]
                
                found_comprehensive = [t for t in comprehensive_types_found if t in asset_types]
                
                if len(asset_types) >= 50 and len(found_comprehensive) >= 5:
                    self.log_result(
                        "Marketplace Filters - Asset Types", 
                        True, 
                        f"✅ COMPREHENSIVE ASSET TYPES WORKING: Found {len(asset_types)} asset types including subtypes",
                        f"Sample comprehensive types: {found_comprehensive}"
                    )
                elif len(asset_types) >= 10:
                    self.log_result(
                        "Marketplace Filters - Asset Types", 
                        False, 
                        f"Asset types returned but not comprehensive enough: {len(asset_types)} types (expected 50+)",
                        f"Missing comprehensive subtypes like 'Office - Class A', 'Retail - Shopping Center', etc. Found: {asset_types[:10]}"
                    )
                else:
                    self.log_result(
                        "Marketplace Filters - Asset Types", 
                        False, 
                        f"Too few asset types returned: {len(asset_types)} (expected 60+)",
                        f"Asset types: {asset_types}"
                    )
                
                # Check markets
                if len(markets) > 0:
                    self.log_result(
                        "Marketplace Filters - Markets", 
                        True, 
                        f"Markets filter working: {len(markets)} markets available",
                        f"Markets: {markets}"
                    )
                else:
                    self.log_result(
                        "Marketplace Filters - Markets", 
                        False, 
                        "No markets returned",
                        "Expected markets like Austin, San Antonio, etc."
                    )
                
                # Check strategies
                if len(strategies) > 0:
                    self.log_result(
                        "Marketplace Filters - Strategies", 
                        True, 
                        f"Strategies filter working: {len(strategies)} strategies available",
                        f"Strategies: {strategies}"
                    )
                else:
                    self.log_result(
                        "Marketplace Filters - Strategies", 
                        False, 
                        "No strategies returned",
                        "Expected strategies like Core, Value Add, etc."
                    )
                
                return data
                
            else:
                self.log_result(
                    "Marketplace Filters", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                return None
                
        except Exception as e:
            self.log_result("Marketplace Filters", False, f"Request error: {str(e)}")
            return None
    
    def test_marketplace_deals_no_filters(self):
        """Test GET /api/marketplace/deals - Browse all deals without filters"""
        try:
            response = requests.get(
                f"{self.base_url}/marketplace/deals",
                headers=self.headers,
                timeout=20
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["deals", "count", "offset", "limit"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result(
                        "Marketplace Deals - No Filters", 
                        False, 
                        f"Response missing required fields: {missing_fields}",
                        f"Response keys: {list(data.keys())}"
                    )
                    return None
                
                deals = data.get("deals", [])
                count = data.get("count", 0)
                
                if count > 0 and len(deals) > 0:
                    # Check first deal structure
                    first_deal = deals[0]
                    required_deal_fields = ["id", "title", "address", "public_price", "public_asset_type", "public_market"]
                    missing_deal_fields = [field for field in required_deal_fields if field not in first_deal]
                    
                    if missing_deal_fields:
                        self.log_result(
                            "Marketplace Deals - No Filters", 
                            False, 
                            f"Deals returned but missing required fields: {missing_deal_fields}",
                            f"First deal keys: {list(first_deal.keys())}"
                        )
                    else:
                        # Check for showcase deals (Austin/San Antonio)
                        austin_deals = [d for d in deals if 'austin' in d.get('public_market', '').lower()]
                        sa_deals = [d for d in deals if 'san antonio' in d.get('public_market', '').lower()]
                        
                        self.log_result(
                            "Marketplace Deals - No Filters", 
                            True, 
                            f"Successfully retrieved {count} marketplace deals",
                            f"Austin deals: {len(austin_deals)}, San Antonio deals: {len(sa_deals)}"
                        )
                    
                    return deals
                else:
                    self.log_result(
                        "Marketplace Deals - No Filters", 
                        False, 
                        "No deals returned from marketplace",
                        "Expected at least 6 showcase deals (Austin/San Antonio properties)"
                    )
                    return []
                
            else:
                self.log_result(
                    "Marketplace Deals - No Filters", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                return None
                
        except Exception as e:
            self.log_result("Marketplace Deals - No Filters", False, f"Request error: {str(e)}")
            return None
    
    def test_marketplace_deals_with_filters(self):
        """Test GET /api/marketplace/deals with various filters"""
        
        # Test 1: Filter by asset type
        try:
            response = requests.get(
                f"{self.base_url}/marketplace/deals",
                headers=self.headers,
                params={"asset_type": "Office - Class A"},
                timeout=20
            )
            
            if response.status_code == 200:
                data = response.json()
                deals = data.get("deals", [])
                
                # Verify all deals match the filter
                mismatched = [d for d in deals if d.get('public_asset_type') != "Office - Class A"]
                
                if len(mismatched) == 0:
                    self.log_result(
                        "Marketplace Deals - Asset Type Filter", 
                        True, 
                        f"Asset type filter working: {len(deals)} 'Office - Class A' deals returned",
                        "All deals match the filter"
                    )
                else:
                    self.log_result(
                        "Marketplace Deals - Asset Type Filter", 
                        False, 
                        f"Filter not working correctly: {len(mismatched)} deals don't match filter",
                        f"Expected 'Office - Class A', found: {[d.get('public_asset_type') for d in mismatched[:3]]}"
                    )
            else:
                self.log_result(
                    "Marketplace Deals - Asset Type Filter", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                
        except Exception as e:
            self.log_result("Marketplace Deals - Asset Type Filter", False, f"Request error: {str(e)}")
        
        # Test 2: Filter by market
        try:
            response = requests.get(
                f"{self.base_url}/marketplace/deals",
                headers=self.headers,
                params={"market": "Austin"},
                timeout=20
            )
            
            if response.status_code == 200:
                data = response.json()
                deals = data.get("deals", [])
                
                # Verify all deals match the filter
                mismatched = [d for d in deals if d.get('public_market') != "Austin"]
                
                if len(mismatched) == 0:
                    self.log_result(
                        "Marketplace Deals - Market Filter", 
                        True, 
                        f"Market filter working: {len(deals)} Austin deals returned",
                        "All deals match the filter"
                    )
                else:
                    self.log_result(
                        "Marketplace Deals - Market Filter", 
                        False, 
                        f"Filter not working correctly: {len(mismatched)} deals don't match filter",
                        f"Expected 'Austin', found: {[d.get('public_market') for d in mismatched[:3]]}"
                    )
            else:
                self.log_result(
                    "Marketplace Deals - Market Filter", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                
        except Exception as e:
            self.log_result("Marketplace Deals - Market Filter", False, f"Request error: {str(e)}")
        
        # Test 3: Filter by price range
        try:
            response = requests.get(
                f"{self.base_url}/marketplace/deals",
                headers=self.headers,
                params={"min_price": 1000000, "max_price": 5000000},
                timeout=20
            )
            
            if response.status_code == 200:
                data = response.json()
                deals = data.get("deals", [])
                
                # Verify all deals are within price range
                out_of_range = [
                    d for d in deals 
                    if d.get('public_price') and (d.get('public_price') < 1000000 or d.get('public_price') > 5000000)
                ]
                
                if len(out_of_range) == 0:
                    self.log_result(
                        "Marketplace Deals - Price Range Filter", 
                        True, 
                        f"Price range filter working: {len(deals)} deals between $1M-$5M returned",
                        "All deals within price range"
                    )
                else:
                    self.log_result(
                        "Marketplace Deals - Price Range Filter", 
                        False, 
                        f"Filter not working correctly: {len(out_of_range)} deals outside price range",
                        f"Out of range prices: {[d.get('public_price') for d in out_of_range[:3]]}"
                    )
            else:
                self.log_result(
                    "Marketplace Deals - Price Range Filter", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                
        except Exception as e:
            self.log_result("Marketplace Deals - Price Range Filter", False, f"Request error: {str(e)}")
    
    def test_deal_detail_endpoint(self, deals):
        """Test GET /api/marketplace/deals/{deal_id} - Critical: Test for infinite loading bug"""
        if not deals or len(deals) == 0:
            self.log_result(
                "Deal Detail Endpoint", 
                False, 
                "No deals available to test deal detail endpoint",
                "Need at least one published deal in marketplace"
            )
            return
        
        # Test with first deal
        test_deal = deals[0]
        deal_id = test_deal.get('id')
        deal_title = test_deal.get('title', 'Unknown')
        
        try:
            print(f"\n🔍 Testing deal detail for: {deal_title} (ID: {deal_id})")
            
            response = requests.get(
                f"{self.base_url}/marketplace/deals/{deal_id}",
                headers=self.headers,
                timeout=30  # Increased timeout to detect hanging
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                if "deal" not in data:
                    self.log_result(
                        "Deal Detail Endpoint - Structure", 
                        False, 
                        "Response missing 'deal' field",
                        f"Response keys: {list(data.keys())}"
                    )
                    return
                
                deal = data.get("deal", {})
                
                # Verify deal has required fields
                required_fields = ["id", "title", "address", "public_price", "description"]
                missing_fields = [field for field in required_fields if field not in deal]
                
                if missing_fields:
                    self.log_result(
                        "Deal Detail Endpoint - Data Completeness", 
                        False, 
                        f"Deal missing required fields: {missing_fields}",
                        f"Deal keys: {list(deal.keys())}"
                    )
                else:
                    # Check for property facts
                    property_facts_fields = ["size", "lot_size", "public_asset_type"]
                    facts_present = [field for field in property_facts_fields if field in deal and deal.get(field)]
                    
                    # Check for financials
                    financial_fields = ["public_price"]
                    financials_present = [field for field in financial_fields if field in deal and deal.get(field)]
                    
                    # Check for location
                    location_fields = ["latitude", "longitude"]
                    location_present = [field for field in location_fields if field in deal and deal.get(field)]
                    
                    self.log_result(
                        "Deal Detail Endpoint - Complete Load", 
                        True, 
                        f"✅ NO INFINITE LOADING: Deal detail loaded successfully for '{deal_title}'",
                        f"Property facts: {len(facts_present)}/{len(property_facts_fields)}, Financials: {len(financials_present)}/{len(financial_fields)}, Location: {len(location_present)}/{len(location_fields)}"
                    )
                    
                    # Test response time (should be fast, not hanging)
                    response_time = response.elapsed.total_seconds()
                    if response_time > 10:
                        self.log_result(
                            "Deal Detail Endpoint - Response Time", 
                            False, 
                            f"Response time too slow: {response_time:.2f}s (may indicate loading issues)",
                            "Expected < 10s response time"
                        )
                    else:
                        self.log_result(
                            "Deal Detail Endpoint - Response Time", 
                            True, 
                            f"Response time good: {response_time:.2f}s",
                            "No hanging or infinite loading detected"
                        )
                
            elif response.status_code == 404:
                self.log_result(
                    "Deal Detail Endpoint", 
                    False, 
                    f"Deal not found (404) - deal may not be published or approved",
                    f"Deal ID: {deal_id}"
                )
            else:
                self.log_result(
                    "Deal Detail Endpoint", 
                    False, 
                    f"Failed with status {response.status_code}", 
                    response.text[:500] if response.text else "No response text"
                )
                
        except requests.exceptions.Timeout:
            self.log_result(
                "Deal Detail Endpoint", 
                False, 
                "❌ CRITICAL: Request timed out after 30s - INFINITE LOADING BUG DETECTED",
                f"Deal ID: {deal_id} - Endpoint is hanging and not returning response"
            )
        except Exception as e:
            self.log_result("Deal Detail Endpoint", False, f"Request error: {str(e)}")
    
    def test_multiple_deal_details(self, deals):
        """Test multiple deal details to ensure consistent behavior"""
        if not deals or len(deals) < 3:
            self.log_result(
                "Multiple Deal Details", 
                False, 
                f"Not enough deals to test multiple details (need 3, have {len(deals) if deals else 0})",
                "Need at least 3 published deals"
            )
            return
        
        success_count = 0
        fail_count = 0
        
        for i, deal in enumerate(deals[:3]):  # Test first 3 deals
            deal_id = deal.get('id')
            deal_title = deal.get('title', 'Unknown')
            
            try:
                response = requests.get(
                    f"{self.base_url}/marketplace/deals/{deal_id}",
                    headers=self.headers,
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "deal" in data and data["deal"].get("id") == deal_id:
                        success_count += 1
                        print(f"  ✅ Deal {i+1}/3: {deal_title} loaded successfully")
                    else:
                        fail_count += 1
                        print(f"  ❌ Deal {i+1}/3: {deal_title} - invalid response structure")
                else:
                    fail_count += 1
                    print(f"  ❌ Deal {i+1}/3: {deal_title} - status {response.status_code}")
                    
            except requests.exceptions.Timeout:
                fail_count += 1
                print(f"  ❌ Deal {i+1}/3: {deal_title} - TIMEOUT (infinite loading)")
            except Exception as e:
                fail_count += 1
                print(f"  ❌ Deal {i+1}/3: {deal_title} - error: {str(e)}")
        
        if success_count == 3:
            self.log_result(
                "Multiple Deal Details", 
                True, 
                f"All 3 deal details loaded successfully - no infinite loading issues",
                f"Success: {success_count}/3"
            )
        else:
            self.log_result(
                "Multiple Deal Details", 
                False, 
                f"Some deal details failed to load: {fail_count}/3 failures",
                f"Success: {success_count}/3, Failures: {fail_count}/3"
            )
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("MARKETPLACE BACKEND TEST SUMMARY")
        print("="*80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"\nTotal Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n" + "="*80)
        
        return passed_tests, failed_tests

def main():
    print("="*80)
    print("MARKETPLACE BACKEND API TESTING")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {TEST_CREDENTIALS['email']}")
    print("="*80 + "\n")
    
    tester = MarketplaceTester()
    
    # Step 1: Authenticate
    if not tester.authenticate():
        print("\n❌ Authentication failed. Cannot proceed with tests.")
        return
    
    print("\n" + "-"*80)
    print("TESTING MARKETPLACE FILTERS")
    print("-"*80)
    
    # Step 2: Test marketplace filters
    filters_data = tester.test_marketplace_filters()
    
    print("\n" + "-"*80)
    print("TESTING MARKETPLACE DEALS BROWSING")
    print("-"*80)
    
    # Step 3: Test marketplace deals without filters
    deals = tester.test_marketplace_deals_no_filters()
    
    # Step 4: Test marketplace deals with filters
    tester.test_marketplace_deals_with_filters()
    
    print("\n" + "-"*80)
    print("TESTING DEAL DETAIL ENDPOINT (CRITICAL: Infinite Loading Bug)")
    print("-"*80)
    
    # Step 5: Test deal detail endpoint (critical for infinite loading bug)
    if deals and len(deals) > 0:
        tester.test_deal_detail_endpoint(deals)
        tester.test_multiple_deal_details(deals)
    else:
        print("\n⚠️  No deals available to test deal detail endpoint")
    
    # Print summary
    passed, failed = tester.print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    main()
