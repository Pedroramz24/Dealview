# Supabase Password Reset - Production Configuration

## 🎯 EXACT URLs to Add to Supabase

### Your Supabase Project
https://ygezobmpewthqvsfqrbk.supabase.co

---

## Step-by-Step Instructions

### 1. Go to Supabase Dashboard
- Click this link: https://ygezobmpewthqvsfqrbk.supabase.co
- Log in with your Supabase account

### 2. Navigate to URL Configuration
- Left sidebar → Click **Settings** (⚙️ gear icon)
- Click **Authentication**
- Scroll to **URL Configuration** section

### 3. Update Site URL

**Find the field labeled "Site URL"**

**DELETE the old URL and enter EXACTLY this:**
```
https://deallinked.com
```

**Do NOT include trailing slash, wildcards, or /reset-password**
- ✅ Correct: `https://deallinked.com`
- ❌ Wrong: `https://deallinked.com/`
- ❌ Wrong: `https://deallinked.com/**`

### 4. Add Redirect URLs

**Find the field labeled "Redirect URLs"**

**Add these URLs (one per line):**
```
https://deallinked.com/**
https://deallinked.com/reset-password
https://deallinked.com/login  
https://deallinked.com/workspace
https://deallinked.com/marketplace
https://deallinked.com/internal/map-crm
```

**Format:** Each URL on its own line

### 5. Click SAVE

**CRITICAL:** Click the **Save** button at the bottom of the page

Wait 5 minutes for changes to propagate.

---

## 🧪 Testing

### After saving Supabase settings:

1. **Clear browser cache** (important!)
2. Go to: https://deallinked.com/login
3. Click "Forgot password?"
4. Enter email: `contact@pedroarmando.com`
5. Check email inbox
6. **Click the reset link in email**
7. **Expected:** Redirects to `https://deallinked.com/reset-password?token=...`
8. **If still wrong:** Check Supabase Site URL was saved correctly

---

## ⚠️ Common Mistakes

1. **Trailing slash:** `https://deallinked.com/` ❌
   - Use: `https://deallinked.com` ✅

2. **Forgot to click Save** ❌
   - Must click Save button after changes ✅

3. **Using old browser cache** ❌
   - Clear cache or use incognito ✅

4. **Wrong field:** Editing "API URL" instead of "Site URL" ❌
   - Update "Site URL" field specifically ✅

---

## 📸 Visual Guide

**What you should see in Supabase:**

```
URL Configuration
─────────────────

Site URL
┌─────────────────────────────────────┐
│ https://deallinked.com              │
└─────────────────────────────────────┘

Redirect URLs
┌─────────────────────────────────────┐
│ https://deallinked.com/**           │
│ https://deallinked.com/reset-password│
│ https://deallinked.com/login        │
│ https://deallinked.com/workspace    │
│ https://deallinked.com/marketplace  │
│ https://deallinked.com/internal/map-crm│
└─────────────────────────────────────┘

[Save] button ← CLICK THIS
```

---

## ✅ Environment Variables (Already Updated)

**Frontend:** REACT_APP_BACKEND_URL = `https://deallinked.com` ✅
**Backend:** FRONTEND_URL = `https://deallinked.com` ✅
**Services:** Restarted ✅

---

## 🎯 Why This Happens

Supabase uses **Site URL** to build password reset links in emails:
```
https://[SITE_URL]/reset-password?token=xyz
```

If Site URL = old preview URL → Email links go to old site
If Site URL = deallinked.com → Email links go to production ✅

---

**After you update Supabase, test immediately and let me know if it works!**
