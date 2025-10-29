# SendGrid Setup Troubleshooting Guide

## Common Issues & Solutions

### ❌ Error: "HTTP Error 403: Forbidden"

**Cause:** Your API key doesn't have the right permissions.

**Solution:**
1. Go to SendGrid → Settings → API Keys
2. Find your "DealView CRM" key
3. Click the 3 dots → "Edit API Key Details"
4. Under "API Key Permissions":
   - **Option A (Recommended):** Select **"Full Access"** radio button
   - **Option B (Minimum):** Select "Restricted Access" and enable:
     - ✅ Mail Send (Full Access)
     - ✅ Template Engine (Read Access) - optional
5. Click "Update Key"
6. Try testing again in DealView

**Important:** You can't see the key value after creation, but you CAN edit its permissions!

---

### ❌ Error: "Invalid API key"

**Cause:** The API key wasn't copied correctly or is incorrect.

**Solutions:**
1. **Double-check the key:**
   - Should start with `SG.`
   - Usually 69 characters long
   - Contains letters, numbers, dots, and dashes
   - Example format: `SG.aBcDeFgHiJkLmNoPqRsTuVwXyZ.1234567890abcdefghij`

2. **Create a new key:**
   - If unsure, create a fresh API key
   - Be sure to select "Full Access" this time
   - Copy immediately (you won't see it again!)

---

### ❌ Error: "Connection timeout"

**Cause:** Network issue or SendGrid is down (rare).

**Solutions:**
1. Check your internet connection
2. Try again in a few seconds
3. Check SendGrid status: https://status.sendgrid.com/

---

### ❌ Can't Find API Keys Page

**Direct Link:** https://app.sendgrid.com/settings/api_keys

Or navigate manually:
1. Log into SendGrid
2. Click "Settings" in left sidebar (gear icon)
3. Click "API Keys"

---

### ✅ Best Practices for API Key Creation

**When creating your API key:**

1. **Name:** Use "DealView CRM" or similar to remember what it's for
2. **Permissions:** Choose "Full Access" (simplest and most reliable)
3. **Copy Immediately:** You'll only see the key once! Copy it before closing.
4. **Store Safely:** Keep a backup copy in a password manager (optional)

**Why "Full Access"?**
- Simplest setup (no permission troubleshooting)
- Required for advanced features (templates, webhooks)
- Still secure (only you have the key)

If you're security-conscious, "Restricted Access" with "Mail Send" permission works too, but requires more setup.

---

### 🔐 Is My API Key Secure?

**Yes!** Your API key is:
- ✅ Encrypted before storage in the database
- ✅ Never shown in the UI after setup
- ✅ Never logged or exposed
- ✅ Isolated per user (RLS policies)
- ✅ Only used to send emails on your behalf

**You can revoke access anytime:**
1. Go to SendGrid → Settings → API Keys
2. Find your key
3. Click 3 dots → "Delete API Key"
4. The key stops working immediately

---

### 🆘 Still Having Issues?

**Quick Fixes:**
1. Make sure you're logged into SendGrid
2. Verify your SendGrid account is active (check email for verification)
3. Try creating a completely new API key with "Full Access"
4. Clear your browser cache and try again

**Get Help:**
- SendGrid Support: https://support.sendgrid.com/
- Check SendGrid docs: https://docs.sendgrid.com/

---

## Quick Reference: API Key Permissions

| Permission Level | What It Does | Recommended? |
|-----------------|--------------|--------------|
| **Full Access** | Can do everything | ✅ **Yes** - Easiest |
| **Restricted: Mail Send** | Can only send emails | ⚠️ Works, but limited |
| **Read Access Only** | Can't send emails | ❌ Won't work |
| **No Permissions** | Key is useless | ❌ Won't work |

---

## What Happens After Successful Setup?

Once your API key is validated:
1. ✅ Your settings are saved securely
2. ✅ You can create email campaigns
3. ✅ You can send emails from within DealView
4. ✅ Email tracking works automatically
5. ✅ You get 100 free emails/day from SendGrid

---

**Need to start over?**
Just click "Setup Email" again in the Campaigns tab!
