# Gmail Inbox Integration - Setup Guide

## Phase 1: Database Migration

### Step 1: Apply Email Tables Migration

1. Go to Supabase Dashboard → SQL Editor
2. Open `/app/supabase_migrations/006_email_inbox_system.sql`
3. Copy the entire script
4. Paste into SQL Editor
5. Click **Run**
6. Verify success message

This creates:
- `email_connections` - Stores OAuth tokens for user email accounts
- `email_threads` - Email conversation threads
- `email_messages` - Individual emails
- All with proper RLS policies for user isolation

---

## Phase 2: Google Cloud Setup (Required)

### Step 2: Create Google Cloud Project

1. Go to: https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Project name: "DealView CRM"
4. Click "Create"

### Step 3: Enable Gmail API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on "Gmail API"
4. Click "Enable"

### Step 4: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (for testing) or "Internal" (if Google Workspace)
3. Click "Create"
4. Fill in:
   - **App name**: DealView CRM
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click "Save and Continue"
6. **Scopes**: Click "Add or Remove Scopes"
   - Search and add:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
   - Click "Update"
7. Click "Save and Continue"
8. **Test users** (if External): Add your Gmail address
9. Click "Save and Continue"

### Step 5: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Name: "DealView CRM Web Client"
5. **Authorized redirect URIs**: Add:
   - `https://mapwise-crm.preview.emergentagent.com/api/email/oauth-callback`
   - `http://localhost:8001/api/email/oauth-callback` (for testing)
6. Click "Create"
7. **Download JSON** - Click the download icon
8. Save the file as `google_credentials.json`

### Step 6: Provide Credentials to Backend

**You'll need to provide me with:**
- The contents of `google_credentials.json` file

**OR** just the:
- `client_id`
- `client_secret`

I'll add these to the backend `.env` file.

---

## What Happens Next

Once you complete these steps and provide the credentials, I'll:

1. ✅ Install Gmail API libraries in backend
2. ✅ Implement OAuth flow endpoints
3. ✅ Create Inbox UI tab
4. ✅ Implement email reading
5. ✅ Implement email sending
6. ✅ Test the complete flow

---

## Important Notes

**OAuth Consent Screen Status:**
- **Testing mode**: Can add up to 100 test users
- **Production mode**: Requires Google verification (7-14 days)
- Start with Testing mode for development

**Scopes Needed:**
- `gmail.readonly` - Read emails
- `gmail.send` - Send emails
- `gmail.modify` - Mark as read/unread, archive

**Security:**
- OAuth tokens stored in Supabase (encrypted)
- Refresh tokens allow long-term access
- Users can revoke access anytime from Google account settings

---

## Ready to Proceed?

**Please complete Steps 2-6 above and provide:**
1. ✅ Confirmation that SQL migration ran successfully
2. ✅ Google OAuth credentials (client_id and client_secret)

**Then I'll implement the complete Gmail inbox integration!**
