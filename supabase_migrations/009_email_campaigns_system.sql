-- =====================================================
-- Email Campaigns & Transactional Email System
-- SendGrid BYOK Integration
-- =====================================================

-- =====================================================
-- TABLE: email_settings
-- Stores user's SendGrid API key (encrypted)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- SendGrid Configuration
  sendgrid_api_key TEXT NOT NULL, -- Encrypted in application layer
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  
  -- Status
  is_verified BOOLEAN DEFAULT false,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Policies for email_settings
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email settings"
  ON public.email_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email settings"
  ON public.email_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email settings"
  ON public.email_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email settings"
  ON public.email_settings FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: email_templates
-- Pre-built and custom email templates
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  
  -- Template Info
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'default', 'custom', 'listing', 'follow-up'
  
  -- Template Content
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  
  -- Metadata
  is_default BOOLEAN DEFAULT false, -- System templates
  thumbnail_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Policies for email_templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates and defaults"
  ON public.email_templates FOR SELECT
  USING (auth.uid() = user_id OR is_default = true);

CREATE POLICY "Users can insert their own templates"
  ON public.email_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.email_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.email_templates FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: email_campaigns
-- Campaign definitions and metadata
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Campaign Info
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  
  -- Content
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  template_id UUID REFERENCES public.email_templates ON DELETE SET NULL,
  
  -- Targeting
  segment_filters JSONB, -- Stores contact filters (asset_type, market, status)
  
  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'paused'
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Stats
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS Policies for email_campaigns
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaigns"
  ON public.email_campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns"
  ON public.email_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON public.email_campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
  ON public.email_campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: email_campaign_sends
-- Individual email sends for each campaign recipient
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_campaign_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.email_campaigns ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts ON DELETE CASCADE NOT NULL,
  
  -- SendGrid Data
  sendgrid_message_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
  
  -- Events
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  
  -- Error tracking
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for faster campaign lookups
CREATE INDEX idx_campaign_sends_campaign_id ON public.email_campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_contact_id ON public.email_campaign_sends(contact_id);

-- RLS Policies for email_campaign_sends
ALTER TABLE public.email_campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaign sends"
  ON public.email_campaign_sends FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.email_campaigns
      WHERE email_campaigns.id = email_campaign_sends.campaign_id
      AND email_campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own campaign sends"
  ON public.email_campaign_sends FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.email_campaigns
      WHERE email_campaigns.id = email_campaign_sends.campaign_id
      AND email_campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own campaign sends"
  ON public.email_campaign_sends FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.email_campaigns
      WHERE email_campaigns.id = email_campaign_sends.campaign_id
      AND email_campaigns.user_id = auth.uid()
    )
  );

-- =====================================================
-- TABLE: email_activities
-- Transactional emails log (1-to-1 communication)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Related Records
  contact_id UUID REFERENCES public.contacts ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals ON DELETE CASCADE,
  
  -- Email Data
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  
  -- Recipients
  to_email TEXT NOT NULL,
  to_name TEXT,
  cc_emails TEXT[], -- Array of CC emails
  bcc_emails TEXT[], -- Array of BCC emails
  
  -- SendGrid Data
  sendgrid_message_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
  
  -- Events
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  
  -- Error tracking
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for faster lookups
CREATE INDEX idx_email_activities_user_id ON public.email_activities(user_id);
CREATE INDEX idx_email_activities_contact_id ON public.email_activities(contact_id);
CREATE INDEX idx_email_activities_deal_id ON public.email_activities(deal_id);

-- RLS Policies for email_activities
ALTER TABLE public.email_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email activities"
  ON public.email_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email activities"
  ON public.email_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email activities"
  ON public.email_activities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email activities"
  ON public.email_activities FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- Insert Default Email Templates
-- =====================================================

-- Template 1: Simple Professional
INSERT INTO public.email_templates (name, description, category, subject, html_content, plain_text_content, is_default)
VALUES (
  'Simple Professional',
  'Clean, professional template for general use',
  'default',
  'Property Opportunity',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 3px solid #00b8d4; padding-bottom: 20px; margin-bottom: 20px; }
    .content { padding: 20px 0; }
    .footer { border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="color: #00b8d4; margin: 0;">{{subject}}</h2>
    </div>
    <div class="content">
      <p>Hi {{firstName}},</p>
      <p>{{message}}</p>
      <p>Best regards,<br>{{senderName}}</p>
    </div>
    <div class="footer">
      <p>{{senderName}} | {{senderEmail}}</p>
    </div>
  </div>
</body>
</html>',
  'Hi {{firstName}},

{{message}}

Best regards,
{{senderName}}',
  true
);

-- Template 2: Property Listing
INSERT INTO public.email_templates (name, description, category, subject, html_content, plain_text_content, is_default)
VALUES (
  'Property Listing',
  'Showcase commercial properties with details',
  'listing',
  'New Listing: {{propertyAddress}}',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
    .property-card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .property-header { border-bottom: 3px solid #00b8d4; padding-bottom: 15px; margin-bottom: 20px; }
    .property-title { color: #00b8d4; font-size: 24px; margin: 0 0 10px 0; }
    .property-details { margin: 20px 0; }
    .detail-row { padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #666; }
    .cta-button { display: inline-block; padding: 12px 30px; background: #00b8d4; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="property-card">
      <div class="property-header">
        <h1 class="property-title">{{propertyAddress}}</h1>
        <p style="color: #666; margin: 0;">{{assetType}} | {{city}}, {{state}}</p>
      </div>
      <div class="property-details">
        <div class="detail-row">
          <span class="detail-label">Price:</span> {{price}}
        </div>
        <div class="detail-row">
          <span class="detail-label">Size:</span> {{size}} SF
        </div>
        <div class="detail-row">
          <span class="detail-label">Cap Rate:</span> {{capRate}}%
        </div>
      </div>
      <p>{{description}}</p>
      <a href="{{dealLink}}" class="cta-button">View Full Details</a>
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
        <p>Contact me for more information:<br>
        {{senderName}}<br>
        {{senderEmail}}</p>
      </div>
    </div>
  </div>
</body>
</html>',
  'NEW LISTING: {{propertyAddress}}
{{assetType}} | {{city}}, {{state}}

Price: {{price}}
Size: {{size}} SF
Cap Rate: {{capRate}}%

{{description}}

View full details: {{dealLink}}

Contact: {{senderName}} | {{senderEmail}}',
  true
);

-- =====================================================
-- Functions for email statistics updates
-- =====================================================

-- Function to update campaign stats when a send event occurs
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campaign statistics based on send status
  UPDATE public.email_campaigns
  SET
    total_sent = (SELECT COUNT(*) FROM public.email_campaign_sends WHERE campaign_id = NEW.campaign_id AND status != 'pending'),
    total_delivered = (SELECT COUNT(*) FROM public.email_campaign_sends WHERE campaign_id = NEW.campaign_id AND status IN ('delivered', 'opened', 'clicked')),
    total_opened = (SELECT COUNT(*) FROM public.email_campaign_sends WHERE campaign_id = NEW.campaign_id AND opened_at IS NOT NULL),
    total_clicked = (SELECT COUNT(*) FROM public.email_campaign_sends WHERE campaign_id = NEW.campaign_id AND clicked_at IS NOT NULL),
    total_bounced = (SELECT COUNT(*) FROM public.email_campaign_sends WHERE campaign_id = NEW.campaign_id AND status = 'bounced'),
    total_failed = (SELECT COUNT(*) FROM public.email_campaign_sends WHERE campaign_id = NEW.campaign_id AND status = 'failed'),
    updated_at = NOW()
  WHERE id = NEW.campaign_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update campaign stats on send updates
CREATE TRIGGER on_campaign_send_update
  AFTER UPDATE ON public.email_campaign_sends
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_stats();

-- =====================================================
-- COMPLETE
-- =====================================================
