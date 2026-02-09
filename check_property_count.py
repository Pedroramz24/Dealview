import requests

SUPABASE_URL = "https://ygezobmpewthqvsfqrbk.supabase.co"
EMAIL = "contact@pedroarmando.com"
PASSWORD = "Flin141812$"
BASE_URL = "https://contact-mgmt-v1.preview.emergentagent.com/api"

# Authenticate
auth_response = requests.post(
    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
    json={"email": EMAIL, "password": PASSWORD},
    headers={
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0",
        "Content-Type": "application/json"
    }
)

token = auth_response.json().get('access_token')

# Try to get all properties with different limits
for limit in [1000, 2000, 5000, 10000]:
    response = requests.get(
        f"{BASE_URL}/map-crm/properties",
        headers={"Authorization": f"Bearer {token}"},
        params={"limit": limit}
    )
    count = len(response.json())
    print(f"Limit {limit}: Got {count} properties")
    if count < limit:
        print(f"  -> Actual total appears to be {count}")
        break
