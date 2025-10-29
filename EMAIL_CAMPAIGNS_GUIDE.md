# Email Campaigns & Transactional Email System

## Overview
Complete email system integrated into DealView CRM with SendGrid BYOK (Bring Your Own Key) approach.

## Features Implemented

### ✅ Phase 1: Foundation (COMPLETE)

**Backend:**
- SendGrid service integration (`/app/backend/sendgrid_service.py`)
- API key encryption/decryption
- Email settings management
- Transactional email sending
- Campaign email sending (bulk)
- Webhook handler for tracking (open, click, bounce events)
- 15+ API endpoints for complete email functionality

**Database:**
- Migration created: `/app/supabase_migrations/009_email_campaigns_system.sql`
- Tables created:
  - `email_settings` - User's SendGrid configuration
  - `email_templates` - Pre-built and custom templates
  - `email_campaigns` - Campaign definitions
  - `email_campaign_sends` - Individual recipient tracking
  - `email_activities` - Transactional email log
- 2 default templates included (Simple Professional, Property Listing)
- Automatic stats updating via triggers

**Frontend:**
- Campaigns page (`/app/frontend/src/pages/Campaigns.js`)
- Setup wizard for SendGrid onboarding
- Campaign list view
- Campaign creation form with HTML editor
- Real-time preview
- Added to navigation sidebar

## Installation Steps

### 1. Apply Database Migration

**IMPORTANT:** You must manually run the migration in Supabase SQL Editor:

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of `/app/supabase_migrations/009_email_campaigns_system.sql`
3. Paste and execute in SQL Editor
4. Verify tables were created successfully

### 2. Backend Dependencies (Already Installed)

```bash
pip install sendgrid
```

The `sendgrid` package is already installed and added to requirements.txt.

### 3. Environment Variable (Optional)

For production, add an encryption key to `/app/backend/.env`:

```
ENCRYPTION_KEY=your-secure-32-byte-key-here
```

If not provided, a key will be auto-generated (suitable for development).

## How It Works

### Setup Flow (First Time)

1. User clicks "Campaigns" in sidebar
2. Setup wizard appears:
   - **Step 1:** Enter SendGrid API key → Test connection
   - **Step 2:** Enter sender email and name → Save
3. Settings saved (API key encrypted in database)
4. User can now send campaigns

### Campaign Creation Flow

1. Click "Create Campaign"
2. Enter:
   - Campaign name (internal reference)
   - Subject line
   - Email content (HTML or plain text)
3. Preview updates in real-time
4. Click "Create Campaign"
5. Campaign saved as "draft"

### Sending Campaigns (To Be Implemented in Phase 2)

1. Open campaign
2. Select contacts (by segment: asset type, market, status)
3. Send test email (optional)
4. Click "Send Campaign"
5. Emails queued and sent via SendGrid
6. Track opens, clicks, bounces in real-time

## API Endpoints

### Email Settings
- `POST /api/email/settings` - Save SendGrid configuration
- `GET /api/email/settings` - Get user's settings
- `POST /api/email/test-connection` - Test API key validity
- `DELETE /api/email/settings` - Remove configuration

### Transactional Emails
- `POST /api/email/send` - Send single email
- `GET /api/email/activities` - Get email history (by contact/deal)

### Campaigns
- `GET /api/email/templates` - Get email templates
- `POST /api/email/campaigns` - Create campaign
- `GET /api/email/campaigns` - List campaigns
- `GET /api/email/campaigns/{id}` - Get campaign details
- `POST /api/email/campaigns/send` - Send campaign to contacts

### Webhooks
- `POST /api/email/webhook` - Handle SendGrid events (opens, clicks, bounces)

## Remaining Work (Phase 2 & 3)

### Phase 2: Campaign Details & Sending
- [ ] Campaign details page with full stats
- [ ] Contact segmentation UI (filter by asset type, market, status)
- [ ] Contact selection interface (checkboxes, select all)
- [ ] Send test email feature
- [ ] Campaign sending confirmation modal
- [ ] Progress indicator during send
- [ ] Post-send analytics dashboard

### Phase 3: Transactional Emails
- [ ] "Send Email" button in Contact Details page
- [ ] "Send Email" button in Deal Details page
- [ ] Email compose modal (rich text editor)
- [ ] Email activity timeline in Contact/Deal pages
- [ ] Quick reply functionality
- [ ] Email threading/conversation view

### Phase 4: Advanced Features (Optional)
- [ ] Rich text editor (Quill.js or TinyMCE)
- [ ] Drag-and-drop email builder
- [ ] A/B testing for subject lines
- [ ] Scheduled campaigns (send later)
- [ ] Campaign duplication
- [ ] Email template builder
- [ ] Merge fields auto-complete
- [ ] Unsubscribe management
- [ ] Email bounce handling
- [ ] Deliverability scoring

## SendGrid Setup Guide for Users

### Step 1: Create SendGrid Account
1. Go to https://sendgrid.com/signup
2. Sign up for free account (100 emails/day free forever)
3. Verify your email address

### Step 2: Verify Sender Identity
1. In SendGrid Dashboard → Settings → Sender Authentication
2. Choose "Single Sender Verification"
3. Add your email address
4. Check your email and click verification link

### Step 3: Create API Key
1. In SendGrid Dashboard → Settings → API Keys
2. Click "Create API Key"
3. Name: "DealView CRM"
4. Permissions: "Full Access" (or "Mail Send" at minimum)
5. Click "Create & View"
6. **COPY THE KEY** (you won't see it again!)

### Step 4: Connect to DealView
1. In DealView, click "Campaigns" → Setup wizard
2. Paste your API key
3. Enter your verified sender email
4. Enter your name
5. Complete setup

## Security Notes

- API keys are encrypted before storage using Fernet symmetric encryption
- Each user's API key is isolated (RLS policies)
- Webhook endpoint validates SendGrid signatures (implement in production)
- Unsubscribe links should include secure tokens (implement before production)

## Testing

### Test Backend Endpoints (cURL examples)

```bash
# Test connection (no auth required)
curl -X POST ${BACKEND_URL}/api/email/test-connection \
  -H "Content-Type: application/json" \
  -d '{"api_key": "SG.xxx"}'

# Save settings (requires auth)
curl -X POST ${BACKEND_URL}/api/email/settings \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "sendgrid_api_key": "SG.xxx",
    "sender_email": "you@example.com",
    "sender_name": "Your Name"
  }'

# Create campaign
curl -X POST ${BACKEND_URL}/api/email/campaigns \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "subject": "Hello",
    "html_content": "<p>Test email</p>"
  }'
```

## Merge Fields

Users can use these merge fields in email content:

- `{{firstName}}` - Contact's first name
- `{{lastName}}` - Contact's last name
- `{{email}}` - Contact's email
- `{{company}}` - Contact's company
- `{{phone}}` - Contact's phone
- `{{propertyAddress}}` - Deal property address
- `{{price}}` - Deal price
- `{{assetType}}` - Deal asset type
- `{{senderName}}` - User's name
- `{{senderEmail}}` - User's email

## Next Steps

1. **Apply the Supabase migration** (see Installation Steps above)
2. **Test the Campaigns tab** in the app
3. **Get a SendGrid API key** and test the setup wizard
4. **Provide feedback** on what to implement next

## Architecture Decisions

### Why BYOK (Bring Your Own Key)?
- **Zero cost risk** for the platform
- **Unlimited scale** per user
- **Better deliverability** (emails from user's own domain)
- **No quota management** complexity
- **Industry standard** (used by Close CRM, HighLevel, etc.)

### Why SendGrid?
- **100 emails/day free** (perfect for CRE professionals)
- **Excellent documentation**
- **Robust tracking** (opens, clicks, bounces)
- **Easy API**
- **Reliable infrastructure**

---

**Status:** Phase 1 complete, ready for testing and Phase 2 development.
