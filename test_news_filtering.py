#!/usr/bin/env python3
"""
NEWS FILTERING DEBUG TEST - IMMEDIATE INVESTIGATION
User is seeing "No articles found in San Antonio & Texas" message.
This test will show EXACTLY what the backend is returning.
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
    """Get auth token"""
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=TEST_CREDENTIALS,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print("✅ Authentication successful")
            return token
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Authentication error: {str(e)}")
        return None

def test_news_endpoint(token):
    """Test the news endpoint and show FULL response"""
    print("\n" + "="*80)
    print("TESTING: GET /api/dashboard/news")
    print("="*80)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        print("\n📡 Making request to news endpoint...")
        response = requests.get(
            f"{BASE_URL}/dashboard/news",
            headers=headers,
            timeout=30
        )
        
        print(f"\n📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Show full response structure
            print("\n📦 FULL RESPONSE STRUCTURE:")
            print(json.dumps(data, indent=2))
            
            # Extract key information
            articles = data.get("articles", [])
            count = data.get("count", 0)
            cached = data.get("cached", False)
            stats = data.get("stats", {})
            
            print("\n" + "="*80)
            print("ARTICLE COUNT ANALYSIS")
            print("="*80)
            print(f"Total articles returned: {count}")
            print(f"Articles array length: {len(articles)}")
            print(f"Cached: {cached}")
            
            if stats:
                print(f"\nFiltering Stats:")
                print(f"  - Local (Texas/San Antonio): {stats.get('local', 0)}")
                print(f"  - Macro-Economic: {stats.get('macro', 0)}")
                print(f"  - Total checked: {stats.get('total_checked', 0)}")
            
            # Show each article in detail
            if articles:
                print("\n" + "="*80)
                print(f"ARTICLE DETAILS ({len(articles)} articles)")
                print("="*80)
                
                for idx, article in enumerate(articles, 1):
                    print(f"\n--- Article {idx} ---")
                    print(f"Title: {article.get('title', 'N/A')}")
                    print(f"Source: {article.get('source', 'N/A')}")
                    print(f"Relevance Type: {article.get('relevanceType', 'N/A')}")
                    print(f"Published: {article.get('publishedAt', 'N/A')}")
                    print(f"URL: {article.get('url', 'N/A')}")
                    
                    description = article.get('description', 'N/A')
                    print(f"Description (first 100 chars): {description[:100]}...")
                    print(f"Description length: {len(description)} chars")
            else:
                print("\n⚠️  WARNING: Articles array is EMPTY!")
                print("This is why user sees 'No articles found' message")
            
            # Check for error field
            if data.get('error'):
                print("\n⚠️  ERROR FIELD PRESENT - RSS feeds may have failed")
            
            return articles
            
        else:
            print(f"\n❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"\n❌ Request error: {str(e)}")
        return None

def check_backend_logs():
    """Remind to check backend logs"""
    print("\n" + "="*80)
    print("BACKEND LOGS CHECK")
    print("="*80)
    print("\nTo see filtering messages, run:")
    print("  tail -n 100 /var/log/supervisor/backend.out.log | grep -E '(FILTERING|EXCLUDED|LOCAL|MACRO)'")
    print("\nOr check full backend logs:")
    print("  tail -n 200 /var/log/supervisor/backend.out.log")

def main():
    print("="*80)
    print("NEWS FILTERING DEBUG TEST - IMMEDIATE INVESTIGATION")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print(f"Test User: {TEST_CREDENTIALS['email']}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Step 1: Authenticate
    token = authenticate()
    if not token:
        print("\n❌ Cannot proceed without authentication")
        return
    
    # Step 2: Test news endpoint
    articles = test_news_endpoint(token)
    
    # Step 3: Provide diagnosis
    print("\n" + "="*80)
    print("DIAGNOSIS")
    print("="*80)
    
    if articles is None:
        print("\n❌ CRITICAL: Could not fetch news data from backend")
        print("   Possible causes:")
        print("   - Backend service is down")
        print("   - Network connectivity issue")
        print("   - Authentication problem")
    elif len(articles) == 0:
        print("\n❌ CRITICAL: Backend returned 0 articles")
        print("   Possible causes:")
        print("   a) RSS feeds are not responding (all 5 feeds down)")
        print("   b) Filtering is too strict (excluding all articles)")
        print("   c) Cache is empty and feeds failed to fetch")
        print("\n   NEXT STEPS:")
        print("   1. Check backend logs for RSS feed errors")
        print("   2. Verify filtering keywords are not too restrictive")
        print("   3. Test RSS feed URLs manually")
    else:
        print(f"\n✅ Backend returned {len(articles)} articles")
        print("   If user still sees 'No articles found', the issue is in:")
        print("   - Frontend filtering logic")
        print("   - Frontend state management")
        print("   - Frontend rendering logic")
    
    # Step 4: Remind about backend logs
    check_backend_logs()
    
    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80)

if __name__ == "__main__":
    main()
