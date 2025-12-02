-- =====================================================
-- DealLinked Marketplace: Interaction Tables
-- Phase 2: Messages, Inquiries, Offers, Saved Deals, Views
-- =====================================================

-- =====================================================
-- TABLE: marketplace_saved_deals
-- Users can save/bookmark deals for later
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketplace_saved_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  deal_id UUID REFERENCES public.deals ON DELETE CASCADE NOT NULL,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  notes TEXT,
  UNIQUE(user_id, deal_id)
);

CREATE INDEX IF NOT EXISTS saved_deals_user_id_idx ON public.marketplace_saved_deals(user_id, saved_at DESC);
CREATE INDEX IF NOT EXISTS saved_deals_deal_id_idx ON public.marketplace_saved_deals(deal_id);

-- RLS Policies
ALTER TABLE public.marketplace_saved_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved deals" 
  ON public.marketplace_saved_deals FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save deals" 
  ON public.marketplace_saved_deals FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave deals" 
  ON public.marketplace_saved_deals FOR DELETE 
  USING (auth.uid() = user_id);

-- =====================================================
-- TABLE: marketplace_deal_views
-- Track when users view deals (for analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketplace_deal_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES public.deals ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS deal_views_deal_id_idx ON public.marketplace_deal_views(deal_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS deal_views_user_id_idx ON public.marketplace_deal_views(user_id, viewed_at DESC);

-- RLS Policies
ALTER TABLE public.marketplace_deal_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert views (for tracking)
CREATE POLICY "Anyone can record deal views" 
  ON public.marketplace_deal_views FOR INSERT 
  WITH CHECK (true);

-- Brokers can view stats for their deals
CREATE POLICY "Brokers can view own deal stats" 
  ON public.marketplace_deal_views FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.deals 
      WHERE deals.id = marketplace_deal_views.deal_id 
      AND deals.owner_id = auth.uid()
    )
  );

-- =====================================================
-- TABLE: marketplace_inquiries
-- Initial inquiries from buyers to brokers
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketplace_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES public.deals ON DELETE CASCADE NOT NULL,
  inquirer_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  broker_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- 'new', 'responded', 'closed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS inquiries_deal_id_idx ON public.marketplace_inquiries(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_broker_id_idx ON public.marketplace_inquiries(broker_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_inquirer_id_idx ON public.marketplace_inquiries(inquirer_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.marketplace_inquiries ENABLE ROW LEVEL SECURITY;

-- Users can view inquiries they sent or received
CREATE POLICY "Users can view own inquiries" 
  ON public.marketplace_inquiries FOR SELECT 
  USING (auth.uid() = inquirer_id OR auth.uid() = broker_id);

-- Users can send inquiries
CREATE POLICY "Users can send inquiries" 
  ON public.marketplace_inquiries FOR INSERT 
  WITH CHECK (auth.uid() = inquirer_id);

-- Brokers can update inquiry status
CREATE POLICY "Brokers can update inquiry status" 
  ON public.marketplace_inquiries FOR UPDATE 
  USING (auth.uid() = broker_id);

-- =====================================================
-- TABLE: marketplace_messages
-- Real-time chat between buyers and brokers
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketplace_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL, -- Groups messages by user pair + deal
  sender_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  deal_id UUID REFERENCES public.deals ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.marketplace_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS messages_recipient_unread_idx ON public.marketplace_messages(recipient_id, read, created_at DESC) WHERE read = false;
CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.marketplace_messages(sender_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.marketplace_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages" 
  ON public.marketplace_messages FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send messages
CREATE POLICY "Users can send messages" 
  ON public.marketplace_messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- Users can mark their received messages as read
CREATE POLICY "Users can update received messages" 
  ON public.marketplace_messages FOR UPDATE 
  USING (auth.uid() = recipient_id);

-- =====================================================
-- TABLE: marketplace_offers
-- Formal offers from buyers to brokers
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketplace_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID REFERENCES public.deals ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  broker_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  offer_amount DECIMAL NOT NULL,
  terms TEXT,
  contingencies TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'countered', 'withdrawn'
  counter_amount DECIMAL,
  counter_terms TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS offers_deal_id_idx ON public.marketplace_offers(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS offers_broker_id_idx ON public.marketplace_offers(broker_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS offers_buyer_id_idx ON public.marketplace_offers(buyer_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.marketplace_offers ENABLE ROW LEVEL SECURITY;

-- Users can view offers they made or received
CREATE POLICY "Users can view own offers" 
  ON public.marketplace_offers FOR SELECT 
  USING (auth.uid() = buyer_id OR auth.uid() = broker_id);

-- Buyers can submit offers
CREATE POLICY "Buyers can submit offers" 
  ON public.marketplace_offers FOR INSERT 
  WITH CHECK (auth.uid() = buyer_id);

-- Brokers and buyers can update their offers
CREATE POLICY "Users can update own offers" 
  ON public.marketplace_offers FOR UPDATE 
  USING (auth.uid() = buyer_id OR auth.uid() = broker_id);

-- =====================================================
-- FUNCTIONS: Update marketplace counters
-- =====================================================

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_deal_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.deals 
  SET marketplace_views_count = marketplace_views_count + 1
  WHERE id = NEW.deal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_deal_view
  AFTER INSERT ON public.marketplace_deal_views
  FOR EACH ROW EXECUTE FUNCTION increment_deal_view_count();

-- Function to update inquiry count
CREATE OR REPLACE FUNCTION update_deal_inquiry_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.deals 
    SET marketplace_inquiries_count = marketplace_inquiries_count + 1
    WHERE id = NEW.deal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_inquiry_created
  AFTER INSERT ON public.marketplace_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_deal_inquiry_count();

-- Function to update saved count
CREATE OR REPLACE FUNCTION update_deal_saved_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.deals 
    SET marketplace_saves_count = marketplace_saves_count + 1
    WHERE id = NEW.deal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.deals 
    SET marketplace_saves_count = GREATEST(0, marketplace_saves_count - 1)
    WHERE id = OLD.deal_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_deal_saved_changed
  AFTER INSERT OR DELETE ON public.marketplace_saved_deals
  FOR EACH ROW EXECUTE FUNCTION update_deal_saved_count();

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE public.marketplace_saved_deals IS 'Deals saved/bookmarked by users for later';
COMMENT ON TABLE public.marketplace_deal_views IS 'Analytics: tracks when users view deals';
COMMENT ON TABLE public.marketplace_inquiries IS 'Initial inquiries from buyers to brokers';
COMMENT ON TABLE public.marketplace_messages IS 'Real-time chat messages between users';
COMMENT ON TABLE public.marketplace_offers IS 'Formal offers submitted by buyers';
