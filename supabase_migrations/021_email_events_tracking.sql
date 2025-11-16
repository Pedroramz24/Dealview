-- =====================================================
-- Email Events Tracking Table
-- Captures SendGrid webhook events for campaign analytics
-- =====================================================

-- Create email_events table to track deliveries, opens, clicks, bounces
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.email_campaigns ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts ON DELETE SET NULL,
  
  -- Event details from SendGrid
  event_type TEXT NOT NULL, -- 'delivered', 'open', 'click', 'bounce', 'spam_report', 'unsubscribe'
  email TEXT NOT NULL,
  sendgrid_message_id TEXT,
  sendgrid_event_id TEXT UNIQUE, -- Prevent duplicate events
  
  -- Additional data
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  url TEXT, -- For click events
  user_agent TEXT, -- For open/click events
  ip_address TEXT, -- For open/click events
  bounce_reason TEXT, -- For bounce events
  bounce_type TEXT, -- 'hard' or 'soft'
  
  -- Metadata
  raw_event JSONB, -- Store full webhook payload for debugging
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS email_events_campaign_id_idx ON public.email_events(campaign_id);
CREATE INDEX IF NOT EXISTS email_events_contact_id_idx ON public.email_events(contact_id);
CREATE INDEX IF NOT EXISTS email_events_event_type_idx ON public.email_events(event_type);
CREATE INDEX IF NOT EXISTS email_events_timestamp_idx ON public.email_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS email_events_sendgrid_message_id_idx ON public.email_events(sendgrid_message_id);

-- RLS Policies
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Users can only see events for their own campaigns
CREATE POLICY email_events_select_own ON public.email_events
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM public.email_campaigns WHERE user_id = auth.uid()
    )
  );

-- Only system can insert events (webhook endpoint uses service key)
CREATE POLICY email_events_insert_service ON public.email_events
  FOR INSERT
  WITH CHECK (true); -- Webhook uses service role key

-- Comment for documentation
COMMENT ON TABLE public.email_events IS 'Tracks email delivery and engagement events from SendGrid webhooks for campaign analytics';
