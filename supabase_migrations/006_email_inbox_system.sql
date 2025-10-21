-- =====================================================
-- Email Inbox System - Database Schema
-- Supports Gmail/Outlook OAuth integration
-- =====================================================

-- Email connections (OAuth tokens for user email accounts)
CREATE TABLE IF NOT EXISTS public.email_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  provider TEXT NOT NULL, -- 'gmail' or 'outlook'
  email_address TEXT NOT NULL,
  
  -- OAuth tokens (should be encrypted in production)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Connection status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- One connection per user per provider
  UNIQUE(user_id, provider)
);

-- Email threads (conversation grouping)
CREATE TABLE IF NOT EXISTS public.email_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  connection_id UUID REFERENCES public.email_connections ON DELETE CASCADE NOT NULL,
  
  -- Thread identification
  provider_thread_id TEXT NOT NULL, -- Gmail thread ID or Graph conversation ID
  subject TEXT,
  
  -- Participants
  participants JSONB DEFAULT '[]', -- Array of email addresses
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  message_count INTEGER DEFAULT 0,
  
  -- CRM associations
  contact_id UUID REFERENCES public.contacts ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals ON DELETE SET NULL,
  
  -- Timestamps
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  UNIQUE(connection_id, provider_thread_id)
);

-- Email messages (individual emails in threads)
CREATE TABLE IF NOT EXISTS public.email_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID REFERENCES public.email_threads ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  -- Message identification
  provider_message_id TEXT NOT NULL, -- Gmail message ID or Graph message ID
  
  -- Email content
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails JSONB NOT NULL, -- Array of email addresses
  cc_emails JSONB DEFAULT '[]',
  bcc_emails JSONB DEFAULT '[]',
  
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  
  -- AI features
  ai_summary TEXT,
  ai_action_items JSONB DEFAULT '[]',
  ai_sentiment TEXT,
  
  -- Status
  is_from_user BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  UNIQUE(thread_id, provider_message_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS email_connections_user_id_idx ON public.email_connections(user_id);
CREATE INDEX IF NOT EXISTS email_threads_user_id_idx ON public.email_threads(user_id);
CREATE INDEX IF NOT EXISTS email_threads_contact_id_idx ON public.email_threads(contact_id);
CREATE INDEX IF NOT EXISTS email_threads_deal_id_idx ON public.email_threads(deal_id);
CREATE INDEX IF NOT EXISTS email_threads_last_message_idx ON public.email_threads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS email_messages_thread_id_idx ON public.email_messages(thread_id);
CREATE INDEX IF NOT EXISTS email_messages_sent_at_idx ON public.email_messages(sent_at DESC);

-- Enable RLS
ALTER TABLE public.email_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_connections
CREATE POLICY "Users can view own email connections" ON public.email_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email connections" ON public.email_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email connections" ON public.email_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email connections" ON public.email_connections
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for email_threads
CREATE POLICY "Users can view own email threads" ON public.email_threads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email threads" ON public.email_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email threads" ON public.email_threads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email threads" ON public.email_threads
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for email_messages
CREATE POLICY "Users can view own email messages" ON public.email_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email messages" ON public.email_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email messages" ON public.email_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_messages TO authenticated;

-- Triggers for updated_at
CREATE TRIGGER update_email_connections_updated_at
  BEFORE UPDATE ON public.email_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_email_threads_updated_at
  BEFORE UPDATE ON public.email_threads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- DONE!
-- Run this script in Supabase SQL Editor
-- Email inbox system tables ready
-- =====================================================
