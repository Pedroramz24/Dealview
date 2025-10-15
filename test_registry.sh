#!/bin/bash

# Get backend URL from frontend .env
BACKEND_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

# Login
echo "Logging in..."
TOKEN=$(curl -s -X POST "${BACKEND_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"pedro@test.com","password":"password123"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "Getting layer registry..."
curl -s "${BACKEND_URL}/api/layers/registry" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | grep -A 3 "sa_zoning"
