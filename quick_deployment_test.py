#!/usr/bin/env python3
"""
ULTRA-QUICK BACKEND DEPLOYMENT CHECK
Tests 4 critical deal operations for deployment readiness
"""
import requests
import time
import json
from typing import Dict, List

# Configuration
BASE_URL = "https://commercial-crm.preview.emergentagent.com/api"
SUPABASE_URL = "https://ygezobmpewthqvsfqrbk.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"
EMAIL = "contact@pedroarmando.com"
PASSWORD = "Flin141812$"

class DeploymentTester:
    def __init__(self):
        self.token = None
        self.results = []
        self.times = []
        
    def login(self) -> bool:
        """Authenticate with Supabase and get token"""
        try:
            # Use Supabase Auth API
            response = requests.post(
                f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
                json={"email": EMAIL, "password": PASSWORD},
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                },
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {str(e)}")
            return False
    
    def headers(self) -> Dict:
        """Get auth headers"""
        return {"Authorization": f"Bearer {self.token}"}
    
    def test_create_deal(self) -> tuple:
        """Test 1: Create Deal"""
        print("\n1️⃣  Testing CREATE DEAL...")
        start = time.time()
        
        try:
            payload = {
                "title": "Final Test",
                "address": "123 Test St",
                "asset_type": "Office",
                "asking_price": 1000000
            }
            
            response = requests.post(
                f"{BASE_URL}/deals",
                json=payload,
                headers=self.headers(),
                timeout=10
            )
            
            elapsed = time.time() - start
            self.times.append(elapsed)
            
            if response.status_code in [200, 201]:
                deal = response.json()
                deal_id = deal.get("id")
                print(f"   ✅ CREATE DEAL - Success ({elapsed:.2f}s)")
                print(f"   Deal ID: {deal_id}")
                return True, deal_id, None
            else:
                error = f"Status {response.status_code}: {response.text[:200]}"
                print(f"   ❌ CREATE DEAL - Failed")
                print(f"   Error: {error}")
                return False, None, error
                
        except Exception as e:
            elapsed = time.time() - start
            self.times.append(elapsed)
            error = str(e)
            print(f"   ❌ CREATE DEAL - Exception: {error}")
            return False, None, error
    
    def test_list_deals(self) -> tuple:
        """Test 2: List Deals"""
        print("\n2️⃣  Testing LIST DEALS...")
        start = time.time()
        
        try:
            response = requests.get(
                f"{BASE_URL}/deals",
                headers=self.headers(),
                timeout=10
            )
            
            elapsed = time.time() - start
            self.times.append(elapsed)
            
            if response.status_code == 200:
                deals = response.json()
                count = len(deals) if isinstance(deals, list) else 0
                print(f"   ✅ LIST DEALS - Success ({elapsed:.2f}s)")
                print(f"   Found {count} deals")
                return True, None, None
            else:
                error = f"Status {response.status_code}: {response.text[:200]}"
                print(f"   ❌ LIST DEALS - Failed")
                print(f"   Error: {error}")
                return False, None, error
                
        except Exception as e:
            elapsed = time.time() - start
            self.times.append(elapsed)
            error = str(e)
            print(f"   ❌ LIST DEALS - Exception: {error}")
            return False, None, error
    
    def test_update_deal(self, deal_id: str) -> tuple:
        """Test 3: Update Deal"""
        print("\n3️⃣  Testing UPDATE DEAL...")
        start = time.time()
        
        try:
            payload = {"asking_price": 1100000}
            
            response = requests.put(
                f"{BASE_URL}/deals/{deal_id}",
                json=payload,
                headers=self.headers(),
                timeout=10
            )
            
            elapsed = time.time() - start
            self.times.append(elapsed)
            
            if response.status_code == 200:
                deal = response.json()
                new_price = deal.get("asking_price")
                print(f"   ✅ UPDATE DEAL - Success ({elapsed:.2f}s)")
                print(f"   New price: ${new_price:,.0f}")
                return True, None, None
            else:
                error = f"Status {response.status_code}: {response.text[:200]}"
                print(f"   ❌ UPDATE DEAL - Failed")
                print(f"   Error: {error}")
                return False, None, error
                
        except Exception as e:
            elapsed = time.time() - start
            self.times.append(elapsed)
            error = str(e)
            print(f"   ❌ UPDATE DEAL - Exception: {error}")
            return False, None, error
    
    def test_delete_deal(self, deal_id: str) -> tuple:
        """Test 4: Delete Deal"""
        print("\n4️⃣  Testing DELETE DEAL...")
        start = time.time()
        
        try:
            response = requests.delete(
                f"{BASE_URL}/deals/{deal_id}",
                headers=self.headers(),
                timeout=10
            )
            
            elapsed = time.time() - start
            self.times.append(elapsed)
            
            if response.status_code in [200, 204]:
                print(f"   ✅ DELETE DEAL - Success ({elapsed:.2f}s)")
                return True, None, None
            else:
                error = f"Status {response.status_code}: {response.text[:200]}"
                print(f"   ❌ DELETE DEAL - Failed")
                print(f"   Error: {error}")
                return False, None, error
                
        except Exception as e:
            elapsed = time.time() - start
            self.times.append(elapsed)
            error = str(e)
            print(f"   ❌ DELETE DEAL - Exception: {error}")
            return False, None, error
    
    def run(self):
        """Run all tests"""
        print("=" * 60)
        print("🚀 ULTRA-QUICK BACKEND DEPLOYMENT CHECK")
        print("=" * 60)
        
        # Login
        print("\n🔐 Authenticating...")
        if not self.login():
            print("\n❌ FINAL VERDICT: NOT READY - Authentication failed")
            return
        print("   ✅ Authenticated successfully")
        
        # Test 1: Create Deal
        success_create, deal_id, error_create = self.test_create_deal()
        self.results.append(("CREATE", success_create, error_create))
        
        # Test 2: List Deals
        success_list, _, error_list = self.test_list_deals()
        self.results.append(("LIST", success_list, error_list))
        
        # Test 3 & 4: Update and Delete (only if create succeeded)
        if success_create and deal_id:
            success_update, _, error_update = self.test_update_deal(deal_id)
            self.results.append(("UPDATE", success_update, error_update))
            
            success_delete, _, error_delete = self.test_delete_deal(deal_id)
            self.results.append(("DELETE", success_delete, error_delete))
        else:
            print("\n⚠️  Skipping UPDATE and DELETE tests (CREATE failed)")
            self.results.append(("UPDATE", False, "Skipped - CREATE failed"))
            self.results.append(("DELETE", False, "Skipped - CREATE failed"))
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print final summary"""
        print("\n" + "=" * 60)
        print("📊 SUMMARY")
        print("=" * 60)
        
        for operation, success, error in self.results:
            status = "✅" if success else "❌"
            print(f"{status} {operation:10} - {'PASS' if success else 'FAIL'}")
            if error and not error.startswith("Skipped"):
                print(f"   Error: {error[:100]}")
        
        # Performance
        if self.times:
            avg_time = sum(self.times) / len(self.times)
            print(f"\n⏱️  Average Response Time: {avg_time:.2f}s")
        
        # Final Verdict
        all_passed = all(success for _, success, _ in self.results)
        print("\n" + "=" * 60)
        if all_passed:
            print("✅ FINAL VERDICT: READY FOR DEPLOYMENT")
        else:
            failed_count = sum(1 for _, success, _ in self.results if not success)
            print(f"❌ FINAL VERDICT: NOT READY ({failed_count}/4 tests failed)")
        print("=" * 60)


if __name__ == "__main__":
    tester = DeploymentTester()
    tester.run()
