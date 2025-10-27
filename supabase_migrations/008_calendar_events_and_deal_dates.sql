-- Migration: Calendar Events and Enhanced Deal Date Tracking
-- Description: Adds calendar_events table and new date fields to deals table for milestone tracking

-- Add new date fields to deals table for comprehensive milestone tracking
ALTER TABLE deals ADD COLUMN IF NOT EXISTS earnest_money_deadline DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS feasibility_start_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS feasibility_end_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS title_commitment_due_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS appraisal_due_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS survey_received_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS inspection_due_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS financing_contingency_date DATE;

-- Create calendar_events table for standalone calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) NOT NULL, -- 'milestone', 'follow_up', 'reminder', 'general', 'meeting'
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT false,
  
  -- Optional links to other entities
  related_deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  related_contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Status and completion tracking
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled', 'overdue'
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Reminder settings (for future notification integration)
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_minutes_before INTEGER DEFAULT 60, -- minutes before event to remind
  
  -- Color customization (optional override of default type colors)
  color VARCHAR(20), -- hex color code
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_owner_id ON calendar_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_related_deal_id ON calendar_events(related_deal_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_related_contact_id ON calendar_events(related_contact_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);

-- Enable Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
-- Users can only see their own calendar events
CREATE POLICY "Users can view own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid() = owner_id);

-- Users can insert their own calendar events
CREATE POLICY "Users can insert own calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can update their own calendar events
CREATE POLICY "Users can update own calendar events"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = owner_id);

-- Users can delete their own calendar events
CREATE POLICY "Users can delete own calendar events"
  ON calendar_events FOR DELETE
  USING (auth.uid() = owner_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_events_updated_at_trigger
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();

-- Create indexes on new deal date fields for calendar queries
CREATE INDEX IF NOT EXISTS idx_deals_earnest_money_deadline ON deals(earnest_money_deadline);
CREATE INDEX IF NOT EXISTS idx_deals_feasibility_end_date ON deals(feasibility_end_date);
CREATE INDEX IF NOT EXISTS idx_deals_title_commitment_due_date ON deals(title_commitment_due_date);
CREATE INDEX IF NOT EXISTS idx_deals_appraisal_due_date ON deals(appraisal_due_date);
CREATE INDEX IF NOT EXISTS idx_deals_target_close_date ON deals(target_close_date);

-- Add comments for documentation
COMMENT ON TABLE calendar_events IS 'Stores standalone calendar events and allows linking to deals/contacts';
COMMENT ON COLUMN calendar_events.event_type IS 'Type of event: milestone, follow_up, reminder, general, meeting';
COMMENT ON COLUMN calendar_events.status IS 'Event status: pending, completed, cancelled, overdue';
COMMENT ON COLUMN deals.earnest_money_deadline IS 'Deadline for earnest money deposit';
COMMENT ON COLUMN deals.feasibility_start_date IS 'Start date of feasibility period';
COMMENT ON COLUMN deals.feasibility_end_date IS 'End date of feasibility period';
COMMENT ON COLUMN deals.title_commitment_due_date IS 'Due date for title commitment';
COMMENT ON COLUMN deals.appraisal_due_date IS 'Due date for property appraisal';
COMMENT ON COLUMN deals.survey_received_date IS 'Date when survey was received';
