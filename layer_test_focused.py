#!/usr/bin/env python3
"""
Focused Layer Management API Testing
Tests only the layer management endpoints
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "https://property-pipeline-8.preview.emergentagent.com/api"
TEST_CREDENTIALS = {
    "email": "pedro@test.com",
    "password": "password123"
}

def authenticate():
    """Authenticate and get access token"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=TEST_CREDENTIALS,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            print("✅ Authentication successful")
            return headers
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Authentication error: {str(e)}")
        return None

def test_layer_registry(headers):
    """Test GET /api/layers/registry"""
    print("\n1. Testing Layer Registry...")
    try:
        response = requests.get(f"{BASE_URL}/layers/registry", headers=headers, timeout=15)
        
        if response.status_code == 200:
            data = response.json()
            layers = data.get("layers", {})
            print(f"✅ Registry returned {len(layers)} layers")
            
            expected_layers = ["counties", "city_limits", "fema_floodplain", "sa_zoning", "saws_water", "txdot_projects"]
            found_layers = list(layers.keys())
            missing = [l for l in expected_layers if l not in found_layers]
            
            if not missing:
                print("✅ All 6 expected layers found")
                return True
            else:
                print(f"❌ Missing layers: {missing}")
                return False
        else:
            print(f"❌ Registry failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Registry error: {str(e)}")
        return False

def test_counties_query(headers):
    """Test counties query with San Antonio bbox"""
    print("\n2. Testing Counties Query...")
    bbox = "-98.7,29.2,-98.3,29.6"
    
    try:
        response = requests.get(
            f"{BASE_URL}/layers/counties/query",
            params={"bbox": bbox},
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("type") == "FeatureCollection":
                features = data.get("features", [])
                print(f"✅ Counties query returned {len(features)} features")
                
                # Look for Bexar County
                bexar_found = False
                for feature in features:
                    county_name = feature.get("properties", {}).get("CNTY_NM", "")
                    if "bexar" in county_name.lower():
                        bexar_found = True
                        print(f"✅ Found Bexar County: {county_name}")
                        break
                
                return True
            else:
                print(f"❌ Invalid GeoJSON response: {data.get('type', 'missing type')}")
                return False
        else:
            print(f"❌ Counties query failed: {response.status_code}")
            print(f"   Error: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ Counties query error: {str(e)}")
        return False

def test_fema_floodplain_query(headers):
    """Test FEMA floodplain query"""
    print("\n3. Testing FEMA Floodplain Query...")
    bbox = "-98.7,29.2,-98.3,29.6"
    
    try:
        response = requests.get(
            f"{BASE_URL}/layers/fema_floodplain/query",
            params={"bbox": bbox},
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("type") == "FeatureCollection":
                features = data.get("features", [])
                print(f"✅ FEMA query returned {len(features)} features")
                return True
            else:
                print(f"❌ Invalid GeoJSON response: {data.get('type', 'missing type')}")
                return False
        else:
            print(f"❌ FEMA query failed: {response.status_code}")
            print(f"   Error: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ FEMA query error: {str(e)}")
        return False

def test_sa_zoning_query(headers):
    """Test San Antonio zoning query"""
    print("\n4. Testing San Antonio Zoning Query...")
    bbox = "-98.7,29.2,-98.3,29.6"
    
    try:
        response = requests.get(
            f"{BASE_URL}/layers/sa_zoning/query",
            params={"bbox": bbox},
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("type") == "FeatureCollection":
                features = data.get("features", [])
                print(f"✅ SA Zoning query returned {len(features)} features")
                
                # Show some zoning codes
                if features:
                    zoning_codes = []
                    for feature in features[:3]:
                        code = feature.get("properties", {}).get("ZONING_CODE") or feature.get("properties", {}).get("ZONE_CODE") or "Unknown"
                        if code not in zoning_codes:
                            zoning_codes.append(code)
                    print(f"   Sample zoning codes: {zoning_codes}")
                
                return True
            else:
                print(f"❌ Invalid GeoJSON response: {data.get('type', 'missing type')}")
                return False
        else:
            print(f"❌ SA Zoning query failed: {response.status_code}")
            print(f"   Error: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ SA Zoning query error: {str(e)}")
        return False

def test_counties_identify(headers):
    """Test counties identify at San Antonio coordinates"""
    print("\n5. Testing Counties Identify...")
    lat, lon = 29.4241, -98.4936
    
    try:
        response = requests.get(
            f"{BASE_URL}/layers/counties/identify",
            params={"lat": lat, "lon": lon},
            headers=headers,
            timeout=15
        )
        
        if response.status_code == 200:
            data = response.json()
            features = data.get("features", [])
            count = data.get("count", 0)
            
            if count > 0:
                print(f"✅ Identify returned {count} features")
                
                # Check first feature
                if features and "attributes" in features[0]:
                    attrs = features[0]["attributes"]
                    county_name = attrs.get("CNTY_NM", "Unknown")
                    print(f"   Identified county: {county_name}")
                
                return True
            else:
                print(f"❌ No features identified at coordinates ({lat}, {lon})")
                return False
        else:
            print(f"❌ Identify failed: {response.status_code}")
            print(f"   Error: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ Identify error: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("FOCUSED LAYER MANAGEMENT API TESTING")
    print("=" * 60)
    
    # Authenticate
    headers = authenticate()
    if not headers:
        print("❌ Cannot proceed without authentication")
        return False
    
    # Run tests
    results = []
    results.append(test_layer_registry(headers))
    results.append(test_counties_query(headers))
    results.append(test_fema_floodplain_query(headers))
    results.append(test_sa_zoning_query(headers))
    results.append(test_counties_identify(headers))
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Tests Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All layer management APIs are working correctly!")
    else:
        print(f"⚠️  {total - passed} tests failed - see details above")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)