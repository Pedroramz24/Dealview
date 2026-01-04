import requests

SUPABASE_URL = "https://ygezobmpewthqvsfqrbk.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZXpvYm1wZXd0aHF2c2ZxcmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDYzOTEsImV4cCI6MjA3NTQ4MjM5MX0.iEPttGHUCNl-_eyoEP291EruFBmD50MsXhW6Z2udFX0"
EMAIL = "contact@pedroarmando.com"
PASSWORD = "Flin141812$"

# Authenticate
auth_response = requests.post(
    f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
    json={"email": EMAIL, "password": PASSWORD},
    headers={
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
    }
)

token = auth_response.json().get('access_token')

# Query with count header to get total count
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/map_properties",
    headers={
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Prefer": "count=exact"
    },
    params={"select": "id", "limit": 1}
)

# The count is in the Content-Range header
content_range = response.headers.get('Content-Range', '')
print(f"Content-Range header: {content_range}")

if content_range:
    # Format is like "0-0/1344"
    total = content_range.split('/')[-1]
    print(f"\n✅ Total properties in database: {total}")
else:
    print("Could not determine total count")
