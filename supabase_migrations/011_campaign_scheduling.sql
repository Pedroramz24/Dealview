-- Add scheduling support to email campaigns
-- This enables scheduled and batch campaigns

-- Add batch scheduling fields to email_campaigns table
ALTER TABLE public.email_campaigns 
ADD COLUMN IF NOT EXISTS batch_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS batch_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS batch_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS batch_emails_per_day INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS batch_current_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS batch_last_sent_date DATE;

-- Add timezone field for scheduling
ALTER TABLE public.email_campaigns
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Chicago';

-- Create scheduled_campaigns_queue table for managing scheduled sends
CREATE TABLE IF NOT EXISTS public.scheduled_campaigns_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.email_campaigns ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts ON DELETE CASCADE NOT NULL,
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'queued', -- 'queued', 'processing', 'sent', 'failed'
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Batch tracking
  batch_group INTEGER, -- For grouping batch sends
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_scheduled_queue_status ON public.scheduled_campaigns_queue(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_queue_scheduled_for ON public.scheduled_campaigns_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_queue_campaign_id ON public.scheduled_campaigns_queue(campaign_id);

-- RLS Policies
ALTER TABLE public.scheduled_campaigns_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled sends"
  ON public.scheduled_campaigns_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.email_campaigns
      WHERE email_campaigns.id = scheduled_campaigns_queue.campaign_id
      AND email_campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own scheduled sends"
  ON public.scheduled_campaigns_queue FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.email_campaigns
      WHERE email_campaigns.id = scheduled_campaigns_queue.campaign_id
      AND email_campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "System can update scheduled sends"
  ON public.scheduled_campaigns_queue FOR UPDATE
  USING (true); -- Allow system updates for processing

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.scheduled_campaigns_queue TO authenticated;

-- Function to get next batch of emails to send
CREATE OR REPLACE FUNCTION get_ready_scheduled_emails(batch_size INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID,
  campaign_id UUID,
  contact_id UUID,
  scheduled_for TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sq.id,
    sq.campaign_id,
    sq.contact_id,
    sq.scheduled_for
  FROM public.scheduled_campaigns_queue sq
  WHERE sq.status = 'queued'
    AND sq.scheduled_for <= NOW()
  ORDER BY sq.scheduled_for ASC
  LIMIT batch_size;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON TABLE public.scheduled_campaigns_queue IS 'Queue for managing scheduled and batch email campaigns';
