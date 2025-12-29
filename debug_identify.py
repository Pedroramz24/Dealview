#!/usr/bin/env python3
"""
Debug the counties identify issue
"""

import requests

BASE_URL = "https://deployops-1.preview.emergentagent.com/api"
TEST_CREDENTIALS = {"email": "pedro@test.com", "password": "password123"}

# Authenticate
response = requests.post(f"{BASE_URL}/auth/login", json=TEST_CREDENTIALS)
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Test identify with different tolerances
lat, lon = 29.4241, -98.4936
tolerances = [0.001, 0.01, 0.1, 1.0]

print(f"Testing identify at coordinates: {lat}, {lon}")
print("=" * 50)

for tolerance in tolerances:
    print(f"\nTesting with tolerance: {tolerance}")
    
    response = requests.get(
        f"{BASE_URL}/layers/counties/identify",
        params={"lat": lat, "lon": lon, "tolerance": tolerance},
        headers=headers,
        timeout=15
    )
    
    if response.status_code == 200:
        data = response.json()
        count = data.get("count", 0)
        print(f"  Status: 200, Features: {count}")
        
        if count > 0:
            features = data.get("features", [])
            if features and "attributes" in features[0]:
                attrs = features[0]["attributes"]
                county_name = attrs.get("CNTY_NM", "Unknown")
                print(f"  County: {county_name}")
            break
    else:
        print(f"  Status: {response.status_code}")
        print(f"  Error: {response.text[:100]}")

# Also test a direct query to see what counties are available
print(f"\n\nTesting direct query around the point...")
bbox = f"{lon-0.1},{lat-0.1},{lon+0.1},{lat+0.1}"

response = requests.get(
    f"{BASE_URL}/layers/counties/query",
    params={"bbox": bbox},
    headers=headers,
    timeout=30
)

if response.status_code == 200:
    data = response.json()
    features = data.get("features", [])
    print(f"Counties in area: {len(features)}")
    
    for feature in features:
        county_name = feature.get("properties", {}).get("CNTY_NM", "Unknown")
        print(f"  - {county_name}")
else:
    print(f"Query failed: {response.status_code}")