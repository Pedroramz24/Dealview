-- AI Operations Dashboard - Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/ygezobmpewthqvsfqrbk/sql

-- ============================================
-- 1. CALENDAR EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('meeting', 'deadline', 'reminder', 'call', 'site_visit', 'other')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    location TEXT,
    attendees JSONB DEFAULT '[]'::jsonb,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    all_day BOOLEAN DEFAULT false,
    reminder_minutes INTEGER DEFAULT 15,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_deal_id ON calendar_events(deal_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);

-- RLS Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar events"
    ON calendar_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar events"
    ON calendar_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events"
    ON calendar_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events"
    ON calendar_events FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================
-- 2. DEAL MILESTONES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS deal_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    milestone_type TEXT NOT NULL CHECK (milestone_type IN ('contract_signed', 'deposit_received', 'inspection', 'financing_approved', 'closing', 'custom')),
    due_date TIMESTAMPTZ NOT NULL,
    completed_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deal_milestones_deal_id ON deal_milestones(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_milestones_user_id ON deal_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_milestones_due_date ON deal_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_deal_milestones_status ON deal_milestones(status);

-- RLS Policies
ALTER TABLE deal_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deal milestones"
    ON deal_milestones FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deal milestones"
    ON deal_milestones FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deal milestones"
    ON deal_milestones FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deal milestones"
    ON deal_milestones FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================
-- 3. AI PRIORITY QUEUE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_priority_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority_score DECIMAL(5,2) NOT NULL,
    priority_level TEXT NOT NULL CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    action_type TEXT NOT NULL CHECK (action_type IN ('follow_up', 'review_deal', 'schedule_meeting', 'update_contact', 'complete_milestone', 'other')),
    related_deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    related_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    related_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
    related_milestone_id UUID REFERENCES deal_milestones(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_priority_queue_user_id ON ai_priority_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_priority_queue_priority_score ON ai_priority_queue(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_priority_queue_completed ON ai_priority_queue(completed);
CREATE INDEX IF NOT EXISTS idx_ai_priority_queue_due_date ON ai_priority_queue(due_date);

-- RLS Policies
ALTER TABLE ai_priority_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own priority items"
    ON ai_priority_queue FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own priority items"
    ON ai_priority_queue FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own priority items"
    ON ai_priority_queue FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own priority items"
    ON ai_priority_queue FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================
-- 4. AUTO-UPDATE TRIGGERS
-- ============================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deal_milestones_updated_at BEFORE UPDATE ON deal_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_priority_queue_updated_at BEFORE UPDATE ON ai_priority_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN 
    RAISE NOTICE '✅ AI Operations Dashboard tables created successfully!';
    RAISE NOTICE '   - calendar_events';
    RAISE NOTICE '   - deal_milestones';
    RAISE NOTICE '   - ai_priority_queue';
END $$;
