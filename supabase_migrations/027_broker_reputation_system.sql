-- =====================================================
-- Broker Reputation Engine
-- Phase 3: Deal lifecycle, feedback, and quality scoring
-- =====================================================

-- =====================================================
-- 1. Deal Lifecycle Events
-- =====================================================
CREATE TABLE IF NOT EXISTS public.deal_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'published', 'nda_signed', 'loi_submitted', 'under_contract', 'closed', 'withdrawn'
  event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  initiated_by UUID REFERENCES auth.users(id), -- Who triggered this event
  
  -- Event-specific metadata
  metadata JSONB DEFAULT '{}',
  
  -- For withdrawals
  withdrawal_reason TEXT, -- 'seller_not_ready', 'owner_denied', 'deal_fell_through', 'pricing_issues', 'other'
  withdrawal_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deal_lifecycle_events_deal_id_idx ON public.deal_lifecycle_events(deal_id);
CREATE INDEX IF NOT EXISTS deal_lifecycle_events_type_idx ON public.deal_lifecycle_events(event_type);
CREATE INDEX IF NOT EXISTS deal_lifecycle_events_date_idx ON public.deal_lifecycle_events(event_date DESC);

COMMENT ON TABLE public.deal_lifecycle_events IS 'Tracks deal progression from published to closed/withdrawn';
COMMENT ON COLUMN public.deal_lifecycle_events.event_type IS 'Type of lifecycle event';
COMMENT ON COLUMN public.deal_lifecycle_events.withdrawal_reason IS 'Categorized reason if deal withdrawn';


-- =====================================================
-- 2. Broker Reputation Scores
-- =====================================================
CREATE TABLE IF NOT EXISTS public.broker_reputation (
  broker_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Quality Score (0-100)
  quality_score INTEGER DEFAULT 50 CHECK (quality_score >= 0 AND quality_score <= 100),
  
  -- Performance Metrics
  avg_response_time_hours DECIMAL DEFAULT 0,
  total_deals_published INTEGER DEFAULT 0,
  closed_deals_count INTEGER DEFAULT 0,
  dead_deal_count INTEGER DEFAULT 0,
  dead_deal_ratio DECIMAL DEFAULT 0 CHECK (dead_deal_ratio >= 0 AND dead_deal_ratio <= 1),
  
  -- Deal Progression Metrics
  nda_to_loi_rate DECIMAL DEFAULT 0,
  loi_to_contract_rate DECIMAL DEFAULT 0,
  contract_to_close_rate DECIMAL DEFAULT 0,
  
  -- Verified Listings
  verified_listing_count INTEGER DEFAULT 0,
  
  -- Feedback Scores
  avg_seller_engagement_score DECIMAL DEFAULT 0, -- 0-1
  avg_terms_accuracy_score DECIMAL DEFAULT 0, -- 0-1
  positive_feedback_count INTEGER DEFAULT 0,
  negative_feedback_count INTEGER DEFAULT 0,
  
  -- Throttling
  max_active_listings INTEGER DEFAULT 100,
  requires_manual_approval BOOLEAN DEFAULT false,
  
  -- Badges (computed flags)
  is_trusted_broker BOOLEAN DEFAULT false,
  is_verified_track_record BOOLEAN DEFAULT false,
  is_fast_responder BOOLEAN DEFAULT false,
  
  -- Timestamps
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS broker_reputation_quality_score_idx ON public.broker_reputation(quality_score DESC);
CREATE INDEX IF NOT EXISTS broker_reputation_trusted_idx ON public.broker_reputation(is_trusted_broker) WHERE is_trusted_broker = true;

COMMENT ON TABLE public.broker_reputation IS 'Aggregate reputation scores and metrics for brokers';
COMMENT ON COLUMN public.broker_reputation.quality_score IS 'Overall quality score 0-100 (drives visibility and throttling)';
COMMENT ON COLUMN public.broker_reputation.dead_deal_ratio IS 'Ratio of withdrawn/dead deals to total published';


-- =====================================================
-- 3. Structured Deal Feedback
-- =====================================================
CREATE TABLE IF NOT EXISTS public.deal_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Binary/Ternary Questions
  seller_engaged BOOLEAN, -- Was seller actually engaged?
  terms_accurate BOOLEAN, -- Did deal terms match posting?
  would_recommend BOOLEAN, -- Would you work with this broker again?
  
  -- Optional Comment (private, not published)
  optional_comment TEXT,
  
  -- Metadata
  interaction_type TEXT, -- 'offer_submitted', 'loi_negotiated', 'deal_closed', 'deal_dead'
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent spam: one feedback per buyer per deal
  UNIQUE(buyer_id, deal_id)
);

CREATE INDEX IF NOT EXISTS deal_feedback_broker_id_idx ON public.deal_feedback(broker_id);
CREATE INDEX IF NOT EXISTS deal_feedback_deal_id_idx ON public.deal_feedback(deal_id);
CREATE INDEX IF NOT EXISTS deal_feedback_submitted_at_idx ON public.deal_feedback(submitted_at DESC);

COMMENT ON TABLE public.deal_feedback IS 'Private structured feedback from buyers about broker interactions';
COMMENT ON COLUMN public.deal_feedback.seller_engaged IS 'Was the seller truly committed to selling?';
COMMENT ON COLUMN public.deal_feedback.terms_accurate IS 'Did the deal terms materially match what was posted?';


-- =====================================================
-- 4. Seller Commitment Verification
-- =====================================================
-- Add columns to deals table
ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS seller_commitment_level TEXT, -- 'signed_listing', 'written_auth', 'verbal_maybe'
  ADD COLUMN IF NOT EXISTS commitment_proof_url TEXT, -- Link to uploaded proof document
  ADD COLUMN IF NOT EXISTS commitment_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commitment_verified_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS deals_commitment_level_idx ON public.deals(seller_commitment_level) WHERE is_published = true;

COMMENT ON COLUMN public.deals.seller_commitment_level IS 'Level of seller commitment: signed_listing, written_auth, or verbal_maybe';
COMMENT ON COLUMN public.deals.commitment_proof_url IS 'URL to uploaded proof of commitment (listing agreement, authorization letter)';


-- =====================================================
-- 5. Response Time Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.broker_response_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inquiry_id UUID, -- Reference to marketplace inquiry
  inquiry_received_at TIMESTAMPTZ NOT NULL,
  response_sent_at TIMESTAMPTZ NOT NULL,
  response_time_hours DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS broker_response_times_broker_id_idx ON public.broker_response_times(broker_id);
CREATE INDEX IF NOT EXISTS broker_response_times_date_idx ON public.broker_response_times(inquiry_received_at DESC);

-- Auto-calculate response time
CREATE OR REPLACE FUNCTION calculate_response_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.response_time_hours := EXTRACT(EPOCH FROM (NEW.response_sent_at - NEW.inquiry_received_at)) / 3600;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_response_time_trigger ON public.broker_response_times;
CREATE TRIGGER calculate_response_time_trigger
  BEFORE INSERT ON public.broker_response_times
  FOR EACH ROW
  EXECUTE FUNCTION calculate_response_time();


-- =====================================================
-- 6. Reputation Calculation Function
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_broker_reputation(target_broker_id UUID)
RETURNS JSONB AS $$
DECLARE
  rep_record RECORD;
  lifecycle_stats RECORD;
  feedback_stats RECORD;
  response_stats RECORD;
  quality_score INTEGER;
  dead_ratio DECIMAL;
BEGIN
  -- Get current reputation or create new
  SELECT * INTO rep_record FROM public.broker_reputation WHERE broker_id = target_broker_id;
  
  IF rep_record IS NULL THEN
    INSERT INTO public.broker_reputation (broker_id) VALUES (target_broker_id)
    RETURNING * INTO rep_record;
  END IF;
  
  -- Calculate lifecycle stats
  SELECT 
    COUNT(*) FILTER (WHERE e.event_type = 'published') as total_published,
    COUNT(*) FILTER (WHERE e.event_type = 'closed') as closed_count,
    COUNT(*) FILTER (WHERE e.event_type = 'withdrawn') as withdrawn_count,
    COUNT(*) FILTER (WHERE e.event_type = 'nda_signed') as nda_count,
    COUNT(*) FILTER (WHERE e.event_type = 'loi_submitted') as loi_count,
    COUNT(*) FILTER (WHERE e.event_type = 'under_contract') as contract_count
  INTO lifecycle_stats
  FROM public.deal_lifecycle_events e
  JOIN public.deals d ON e.deal_id = d.id
  WHERE d.owner_id = target_broker_id;
  
  -- Calculate feedback stats
  SELECT 
    AVG(CASE WHEN seller_engaged THEN 1 ELSE 0 END) as avg_seller_engaged,
    AVG(CASE WHEN terms_accurate THEN 1 ELSE 0 END) as avg_terms_accurate,
    COUNT(*) FILTER (WHERE would_recommend = true) as positive_count,
    COUNT(*) FILTER (WHERE would_recommend = false) as negative_count
  INTO feedback_stats
  FROM public.deal_feedback
  WHERE broker_id = target_broker_id;
  
  -- Calculate response time
  SELECT AVG(response_time_hours) INTO response_stats
  FROM public.broker_response_times
  WHERE broker_id = target_broker_id;
  
  -- Calculate dead deal ratio
  dead_ratio := CASE 
    WHEN lifecycle_stats.total_published > 0 THEN 
      lifecycle_stats.withdrawn_count::DECIMAL / lifecycle_stats.total_published
    ELSE 0
  END;
  
  -- Calculate quality score (0-100)
  quality_score := 50; -- Start at 50
  
  -- Response time (20 points max)
  IF response_stats IS NOT NULL AND response_stats > 0 THEN
    quality_score := quality_score + LEAST(20, 20 - (response_stats::INTEGER / 2));
  END IF;
  
  -- Deal progression (30 points max)
  IF lifecycle_stats.closed_count > 0 THEN
    quality_score := quality_score + LEAST(30, lifecycle_stats.closed_count * 3);
  END IF;
  
  -- Penalty for dead deals (up to -20 points)
  quality_score := quality_score - (dead_ratio * 20)::INTEGER;
  
  -- Feedback bonus (20 points max)
  IF feedback_stats.avg_terms_accurate IS NOT NULL THEN
    quality_score := quality_score + (feedback_stats.avg_terms_accurate * 20)::INTEGER;
  END IF;
  
  -- Bounds check
  quality_score := GREATEST(0, LEAST(100, quality_score));
  
  -- Determine badges
  DECLARE
    is_trusted BOOLEAN := quality_score >= 70 AND lifecycle_stats.closed_count >= 3;
    is_verified BOOLEAN := lifecycle_stats.closed_count >= 5;
    is_fast BOOLEAN := response_stats IS NOT NULL AND response_stats < 12;
  BEGIN
    -- Update reputation
    UPDATE public.broker_reputation SET
      quality_score = quality_score,
      avg_response_time_hours = COALESCE(response_stats, 0),
      total_deals_published = COALESCE(lifecycle_stats.total_published, 0),
      closed_deals_count = COALESCE(lifecycle_stats.closed_count, 0),
      dead_deal_count = COALESCE(lifecycle_stats.withdrawn_count, 0),
      dead_deal_ratio = dead_ratio,
      avg_seller_engagement_score = COALESCE(feedback_stats.avg_seller_engaged, 0),
      avg_terms_accuracy_score = COALESCE(feedback_stats.avg_terms_accurate, 0),
      positive_feedback_count = COALESCE(feedback_stats.positive_count, 0),
      negative_feedback_count = COALESCE(feedback_stats.negative_count, 0),
      is_trusted_broker = is_trusted,
      is_verified_track_record = is_verified,
      is_fast_responder = is_fast,
      max_active_listings = CASE 
        WHEN quality_score < 40 THEN 5
        WHEN quality_score < 70 THEN 20
        ELSE 100
      END,
      requires_manual_approval = quality_score < 40,
      last_calculated_at = NOW(),
      updated_at = NOW()
    WHERE broker_id = target_broker_id;
  END;
  
  RETURN jsonb_build_object(
    'broker_id', target_broker_id,
    'quality_score', quality_score,
    'success', true
  );
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- 7. RLS Policies
-- =====================================================

-- Deal Lifecycle Events
ALTER TABLE public.deal_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lifecycle events for own deals"
  ON public.deal_lifecycle_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deals 
      WHERE id = deal_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create lifecycle events for own deals"
  ON public.deal_lifecycle_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals 
      WHERE id = deal_id AND owner_id = auth.uid()
    )
  );

-- Broker Reputation (Public Read)
ALTER TABLE public.broker_reputation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view broker reputation"
  ON public.broker_reputation FOR SELECT
  USING (true);

-- Deal Feedback (Private)
ALTER TABLE public.deal_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON public.deal_feedback FOR SELECT
  USING (buyer_id = auth.uid() OR broker_id = auth.uid());

CREATE POLICY "Users can submit feedback"
  ON public.deal_feedback FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

-- Response Times
ALTER TABLE public.broker_response_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can view own response times"
  ON public.broker_response_times FOR SELECT
  USING (broker_id = auth.uid());
