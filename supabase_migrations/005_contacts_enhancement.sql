-- =====================================================
-- Contacts Enhancement Migration
-- Adds advanced fields and contact-deal linking
-- =====================================================

-- Add new fields to contacts table
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS contact_types JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS asset_type_focus JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS markets JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active_contact',
ADD COLUMN IF NOT EXISTS last_followup_date DATE,
ADD COLUMN IF NOT EXISTS next_action_date DATE,
ADD COLUMN IF NOT EXISTS lead_source TEXT,
ADD COLUMN IF NOT EXISTS owner_address TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- Create contact_deal_links junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.contact_deal_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES public.contacts ON DELETE CASCADE NOT NULL,
  deal_id UUID REFERENCES public.deals ON DELETE CASCADE NOT NULL,
  relationship_type TEXT DEFAULT 'contact',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Prevent duplicate links
  UNIQUE(contact_id, deal_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS contact_deal_links_contact_id_idx ON public.contact_deal_links(contact_id);
CREATE INDEX IF NOT EXISTS contact_deal_links_deal_id_idx ON public.contact_deal_links(deal_id);

-- Enable RLS on contact_deal_links
ALTER TABLE public.contact_deal_links ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view links for contacts/deals they own
CREATE POLICY "Users can view contact-deal links" ON public.contact_deal_links
  FOR SELECT USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE owner_id = auth.uid()
    )
    OR
    deal_id IN (
      SELECT id FROM public.deals WHERE owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can create links for their own contacts/deals
CREATE POLICY "Users can create contact-deal links" ON public.contact_deal_links
  FOR INSERT WITH CHECK (
    contact_id IN (
      SELECT id FROM public.contacts WHERE owner_id = auth.uid()
    )
    AND
    deal_id IN (
      SELECT id FROM public.deals WHERE owner_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete links for their own contacts/deals
CREATE POLICY "Users can delete contact-deal links" ON public.contact_deal_links
  FOR DELETE USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE owner_id = auth.uid()
    )
    OR
    deal_id IN (
      SELECT id FROM public.deals WHERE owner_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.contact_deal_links TO authenticated;

-- =====================================================
-- DONE!
-- Run this script in Supabase SQL Editor
-- Contact enhancements and linking system ready
-- =====================================================
