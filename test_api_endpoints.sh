#!/bin/bash
# Deployment Audit - API Endpoint Testing Script
# Tests all backend endpoints with authentication and authorization checks

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="https://crm-simplify-1.preview.emergentagent.com"
USER_EMAIL="contact@pedroarmando.com"
USER_PASS="Flin141812$"

echo "======================================"
echo "DEPLOYMENT AUDIT - API TESTING"
echo "======================================"
echo ""

# Get authentication token
echo "🔑 Authenticating..."
TOKEN=$(python3 << 'EOF'
from supabase import create_client
url = "https://ygezobmpewthqvsfqrbk.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"
supabase = create_client(url, key)
try:
    response = supabase.auth.sign_in_with_password({"email": "contact@pedroarmando.com", "password": "Flin141812$"})
    if response.session:
        print(response.session.access_token)
    else:
        print("ERROR")
except Exception as e:
    print(f"ERROR: {e}")
EOF
)

if [ "$TOKEN" = "ERROR" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Authentication failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"
echo ""

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Helper function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_code=$3
    local description=$4
    local data=$5
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "Testing: $description ... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            "$API_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            "$API_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC} (Expected $expected_code, got $http_code)"
        echo "   Response: $body"
        FAILED=$((FAILED + 1))
    fi
}

echo "======================================"
echo "PHASE 1: AUTHENTICATION ENDPOINTS"
echo "======================================"
echo ""

test_endpoint "GET" "/api/auth/me" "200" "Get current user"

echo ""
echo "======================================"
echo "PHASE 2: DEAL ENDPOINTS"
echo "======================================"
echo ""

test_endpoint "GET" "/api/deals" "200" "List all deals"

echo ""
echo "======================================"
echo "PHASE 3: DASHBOARD ENDPOINTS"
echo "======================================"
echo ""

test_endpoint "GET" "/api/dashboard/stats" "200" "Get dashboard stats"
test_endpoint "GET" "/api/dashboard/news" "200" "Get dashboard news"

echo ""
echo "======================================"
echo "PHASE 4: TEAM ENDPOINTS"
echo "======================================"
echo ""

test_endpoint "GET" "/api/teams" "200" "Get user teams"

echo ""
echo "======================================"
echo "PHASE 5: MESSAGING ENDPOINTS"  
echo "======================================"
echo ""

test_endpoint "GET" "/api/messages/conversations" "200" "Get conversations"
test_endpoint "GET" "/api/messages/unread-count" "200" "Get unread count"

echo ""
echo "======================================"
echo "PHASE 6: MARKETPLACE ENDPOINTS"
echo "======================================"
echo ""

test_endpoint "GET" "/api/marketplace/deals" "200" "Get marketplace deals"
test_endpoint "GET" "/api/marketplace/saved-deals" "200" "Get saved deals"
test_endpoint "GET" "/api/marketplace/filters" "200" "Get marketplace filters"

echo ""
echo "======================================"
echo "PHASE 7: ROLES & PERMISSIONS"
echo "======================================"
echo ""

test_endpoint "GET" "/api/roles/my-roles" "200" "Get my roles"
test_endpoint "GET" "/api/roles/my-permissions" "200" "Get my permissions"

echo ""
echo "======================================"
echo "PHASE 8: UNAUTHENTICATED ACCESS TESTS"
echo "======================================"
echo ""

echo -n "Testing: Unauthenticated deal access should fail ... "
unauth_response=$(curl -s -w "\n%{http_code}" "$API_URL/api/deals" 2>&1)
unauth_code=$(echo "$unauth_response" | tail -1)
if [ "$unauth_code" = "401" ] || [ "$unauth_code" = "403" ]; then
    echo -e "${GREEN}✅ PASS${NC} (Properly blocked with HTTP $unauth_code)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC} (Should return 401/403, got $unauth_code)"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

echo ""
echo "======================================"
echo "TEST SUMMARY"
echo "======================================"
echo ""
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
fi
