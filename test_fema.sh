#!/bin/bash
BACKEND_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
TOKEN=$(curl -s -X POST "${BACKEND_URL}/api/auth/login" -H "Content-Type: application/json" -d '{"email":"pedro@test.com","password":"password123"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "=== Testing /api/layers/registry ==="
curl -s "${BACKEND_URL}/api/layers/registry" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | grep -A 10 "fema_floodplain"

echo ""
echo "=== Testing /api/layers/fema_floodplain/query ===" 
curl -s "${BACKEND_URL}/api/layers/fema_floodplain/query?bbox=-98.5,29.4,-98.4,29.5" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"Features: {len(d.get('features', []))}\"); print(f\"Type: {d.get('type', 'unknown')}\")"
