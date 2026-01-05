# Production Deployment - Supabase Configuration

## 🎯 Production Domain

**Your Production URL:** https://deallinked.com

---

## ✅ Supabase Authentication Settings

### 1. Site URL

Go to: https://ygezobmpewthqvsfqrbk.supabase.co → Settings → Authentication → URL Configuration

**Set Site URL to:**
```
https://deallinked.com
```

### 2. Redirect URLs

**Add these to the Redirect URLs whitelist:**

```
https://deallinked.com/**
https://deallinked.com/reset-password
https://deallinked.com/login
https://deallinked.com/workspace
https://deallinked.com/workspace/dashboard
https://deallinked.com/marketplace
https://deallinked.com/internal/map-crm
https://deallinked.com/share/*
```

**Why the wildcard (/**):**
- Catches all routes in your application
- Allows Supabase to redirect to any page after auth

---

## 🔧 Environment Variables Updated

**Frontend (.env):**
```
REACT_APP_BACKEND_URL=https://deallinked.com
```

**Backend (.env):**
```
FRONTEND_URL=https://deallinked.com
```

**Services restarted to apply changes.**

---

## 🧪 Testing Production Password Reset

### Step 1: Update Supabase (You Do This)
1. Go to Supabase Dashboard
2. Settings → Authentication → URL Configuration
3. Update Site URL to: `https://deallinked.com`
4. Add redirect URLs (listed above)
5. Save

### Step 2: Test Flow
1. Go to: https://deallinked.com/login
2. Click "Forgot Password"
3. Enter email
4. Check inbox
5. Click reset link
6. **Should redirect to:** `https://deallinked.com/reset-password`
7. Enter new password
8. Login successfully

---

## 🎯 What Happens After You Update Supabase

**Password Reset Emails Will Contain:**
```
Click here to reset your password:
https://deallinked.com/reset-password?token=...
```

**Instead of old:**
```
https://propertyvis-app-old.preview.emergentagent.com/reset-password?token=...
```

---

## ⚠️ Important Notes

**1. DNS Propagation:**
- Changes may take 5-10 minutes to propagate
- Test with a fresh incognito window

**2. Email Template:**
- Supabase automatically uses `{{ .SiteURL }}` in email templates
- No need to edit email templates manually

**3. OAuth (If Using):**
- If you add Google/GitHub login later, add OAuth callback URLs too:
  - `https://deallinked.com/auth/callback`

---

## ✅ Checklist

After updating Supabase Site URL:

- [ ] Site URL = `https://deallinked.com`
- [ ] Redirect URLs include all routes above
- [ ] Click **Save** in Supabase dashboard
- [ ] Wait 5 minutes for propagation
- [ ] Test password reset flow
- [ ] Verify email redirects to `https://deallinked.com/reset-password`
- [ ] Confirm new password works

---

## 🚀 Production URLs Summary

| Service | URL |
|---------|-----|
| Production App | https://deallinked.com |
| Login | https://deallinked.com/login |
| Reset Password | https://deallinked.com/reset-password |
| Workspace | https://deallinked.com/workspace |
| Marketplace | https://deallinked.com/marketplace |
| DealVisor | https://deallinked.com/internal/map-crm |
| Supabase | https://ygezobmpewthqvsfqrbk.supabase.co |

**Environment variables updated and services restarted!** ✅
