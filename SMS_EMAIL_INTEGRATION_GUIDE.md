# SMS & Email Integration Guide for DealView CRM

## Overview

This guide outlines the technical approach for integrating SMS and Email functionality into your CRM, enabling direct communication with contacts from the application.

---

## 📧 Email Integration Options

### Option 1: SendGrid (Recommended)
**Why:** Reliable, scalable, great deliverability, generous free tier

**Features:**
- Send transactional emails
- Email templates
- Tracking (opens, clicks)
- Analytics dashboard
- 100 emails/day free

**Implementation:**
```javascript
// Backend: server.py
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

@app.post("/api/contacts/{contact_id}/send-email")
async def send_email(contact_id: str, subject: str, message: str):
    contact = await get_contact(contact_id)
    
    email_message = Mail(
        from_email='your-email@dealview.com',
        to_emails=contact.email,
        subject=subject,
        html_content=message
    )
    
    sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
    response = sg.send(email_message)
    
    # Log email in database
    await log_communication(contact_id, 'email', subject, message)
    
    return {"status": "sent"}
```

**Cost:** Free (100/day), then $15/month (40K emails)

---

### Option 2: AWS SES
**Why:** Cost-effective for high volume, excellent deliverability

**Features:**
- $0.10 per 1,000 emails
- Highly scalable
- Good for bulk sending
- Requires domain verification

**Best For:** High-volume operations (1000+ emails/month)

---

### Option 3: Resend (Modern Alternative)
**Why:** Developer-friendly, modern API, React email templates

**Features:**
- Beautiful email templates with React
- Built-in analytics
- Simple API
- 3,000 emails/month free

**Best For:** Modern developer experience

---

## 📱 SMS Integration Options

### Option 1: Twilio (Recommended)
**Why:** Industry standard, reliable, feature-rich

**Features:**
- SMS/MMS sending
- Phone number provisioning
- Delivery tracking
- Two-way messaging
- International support

**Implementation:**
```javascript
// Backend: server.py
from twilio.rest import Client

@app.post("/api/contacts/{contact_id}/send-sms")
async def send_sms(contact_id: str, message: str):
    contact = await get_contact(contact_id)
    
    client = Client(
        os.environ.get('TWILIO_ACCOUNT_SID'),
        os.environ.get('TWILIO_AUTH_TOKEN')
    )
    
    sms = client.messages.create(
        body=message,
        from_=os.environ.get('TWILIO_PHONE_NUMBER'),
        to=contact.phone
    )
    
    # Log SMS in database
    await log_communication(contact_id, 'sms', None, message)
    
    return {"status": "sent", "sid": sms.sid}
```

**Cost:** $1/month per phone number + $0.0079 per SMS

---

### Option 2: MessageBird
**Why:** International focus, competitive pricing

**Features:**
- Global SMS coverage
- Voice calls
- WhatsApp integration
- Omnichannel inbox

**Best For:** International operations

---

## 🏗️ Architecture Recommendations

### Backend Changes Needed

**1. Create Communications Log Table:**
```sql
CREATE TABLE public.communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals ON DELETE SET NULL,
  
  type TEXT NOT NULL, -- 'email', 'sms', 'call'
  direction TEXT NOT NULL, -- 'outbound', 'inbound'
  subject TEXT, -- For emails
  message TEXT,
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'opened'
  
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE
);
```

**2. Add API Endpoints:**
- `POST /api/contacts/{contact_id}/send-email`
- `POST /api/contacts/{contact_id}/send-sms`
- `POST /api/deals/{deal_id}/send-bulk-email` (to all linked contacts)
- `GET /api/contacts/{contact_id}/communications` (history)

**3. Add Environment Variables:**
```
# .env
SENDGRID_API_KEY=SG.xxxxx
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+15125550100
```

---

### Frontend Changes Needed

**1. Add Communication Modal:**
```jsx
// components/SendEmailModal.js
- Subject field
- Rich text editor for message
- Template selection dropdown
- Send button
- Delivery status indicator
```

**2. Add Quick Action Buttons:**
```jsx
// In Contact Details Panel
<Button onClick={() => openEmailModal(contact)}>
  <Mail /> Send Email
</Button>
<Button onClick={() => openSMSModal(contact)}>
  <Phone /> Send SMS
</Button>
```

**3. Add Communications Timeline:**
```jsx
// Show in Contact Details
<Timeline>
  {communications.map(comm => (
    <TimelineItem>
      <Icon type={comm.type} />
      <p>{comm.subject || comm.message}</p>
      <span>{formatDate(comm.sent_at)}</span>
      <Badge>{comm.status}</Badge>
    </TimelineItem>
  ))}
</Timeline>
```

---

## 💡 Feature Recommendations

### Phase 1: Basic Sending
- Send individual emails
- Send individual SMS
- Log all communications
- Simple message templates

### Phase 2: Advanced Features
- Email templates with variables ({{contact_name}}, {{property_address}})
- Bulk email to contact groups
- Email open tracking
- SMS delivery status
- Two-way SMS conversations

### Phase 3: Automation
- Automated follow-up sequences
- Scheduled sends
- Drip campaigns
- Email triggers (e.g., when deal enters "Offer Sent" stage)

---

## 💰 Cost Estimates

### For Small Team (1-5 users):
**Email (SendGrid):**
- 0-100 emails/day: **FREE**
- 100-40,000/month: **$15/month**

**SMS (Twilio):**
- Phone number: **$1/month**
- 100 SMS/month: **$0.79**
- 500 SMS/month: **$3.95**

**Total:** ~$5-20/month

### For Growing Team (5-20 users):
- Email: **$15-50/month**
- SMS: **$10-30/month**
- **Total:** ~$25-80/month

---

## 🚀 Implementation Steps

### Step 1: Choose Providers
1. Email: SendGrid (recommended) or Resend
2. SMS: Twilio (recommended)

### Step 2: Get API Keys
1. Sign up for SendGrid → Get API key
2. Sign up for Twilio → Get Account SID, Auth Token, Phone Number

### Step 3: Database Migration
1. Create `communications` table (see schema above)
2. Add RLS policies for user isolation

### Step 4: Backend Integration
1. Install libraries: `pip install sendgrid twilio`
2. Add environment variables
3. Create API endpoints
4. Add communication logging

### Step 5: Frontend UI
1. Add "Send Email" and "Send SMS" buttons
2. Create send modals
3. Add communications timeline
4. Implement delivery status tracking

### Step 6: Testing
1. Test sending to your own email/phone
2. Verify logging works
3. Test delivery tracking
4. Test error handling

---

## 🛡️ Security & Compliance

### Best Practices:
- ✅ Never expose API keys in frontend
- ✅ All API calls go through backend
- ✅ Rate limiting to prevent abuse
- ✅ Validate phone numbers before sending SMS
- ✅ Validate email addresses
- ✅ Unsubscribe links in bulk emails (required by law)
- ✅ Respect contact preferences (don't spam)

### Compliance:
- **CAN-SPAM Act** (Email): Include unsubscribe, physical address
- **TCPA** (SMS): Get explicit consent before texting
- **GDPR** (if EU contacts): Get consent, honor opt-outs

---

## 🎨 UI/UX Recommendations

### In Contact Details Panel:
```
┌─────────────────────────────┐
│ John Doe                    │
│ Principal @ ABC Realty      │
│                             │
│ [📧 Send Email] [📱 Send SMS]│
│                             │
│ Recent Communications:      │
│ ✅ Email sent 2d ago        │
│ ✅ SMS sent 5d ago          │
│ ✅ Email opened 1w ago      │
└─────────────────────────────┘
```

### Send Email Modal:
```
┌──────────────────────┐
│ Send Email           │
├──────────────────────┤
│ To: john@abc.com     │
│ Subject: [________]  │
│                      │
│ Template: [Follow-up▼]│
│                      │
│ Message:             │
│ [Rich text editor]   │
│                      │
│ [Cancel] [Send 📧]   │
└──────────────────────┘
```

---

## 📋 Next Steps

### To Implement SMS/Email:

1. **Decide on providers**
   - Which email service? (SendGrid, Resend, AWS SES)
   - Which SMS service? (Twilio, MessageBird)

2. **Get API credentials**
   - Sign up and obtain keys

3. **Apply database migration**
   - Create communications table

4. **I'll implement:**
   - Backend endpoints
   - Frontend UI components
   - Logging and tracking
   - Templates and automation

**Estimated time:** 3-4 hours for basic implementation

---

## 🤔 Questions to Consider:

1. **Volume expectations:**
   - How many emails per month?
   - How many SMS per month?

2. **Use cases:**
   - Manual one-off messages?
   - Automated follow-ups?
   - Bulk campaigns?

3. **Budget:**
   - What monthly budget for communications?

4. **Priority:**
   - Email only?
   - SMS only?
   - Both?

---

**Would you like me to implement this? If so, which providers should we use?**
