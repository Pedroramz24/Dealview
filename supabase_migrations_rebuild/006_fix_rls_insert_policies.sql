-- ============================================================================
-- FIX RLS INSERT POLICIES FOR CONTACTS, CONTACT_TAGS, PIPELINES
-- ============================================================================
-- Run this in Supabase SQL Editor to fix INSERT operations for new users
-- ============================================================================

-- DROP existing policies and recreate with proper INSERT WITH CHECK
-- This is needed because FOR ALL USING doesn't properly handle INSERTs

-- 1. FIX CONTACTS TABLE
DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
DROP POLICY IF EXISTS "contacts_select_own" ON contacts;
DROP POLICY IF EXISTS "contacts_insert_own" ON contacts;
DROP POLICY IF EXISTS "contacts_update_own" ON contacts;
DROP POLICY IF EXISTS "contacts_delete_own" ON contacts;

-- Create separate policies for each operation
CREATE POLICY "contacts_select_own" ON contacts 
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "contacts_insert_own" ON contacts 
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "contacts_update_own" ON contacts 
FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "contacts_delete_own" ON contacts 
FOR DELETE USING (owner_id = auth.uid());

-- 2. FIX CONTACT_TAGS TABLE
DROP POLICY IF EXISTS "Users can manage own tags" ON contact_tags;
DROP POLICY IF EXISTS "contact_tags_select_own" ON contact_tags;
DROP POLICY IF EXISTS "contact_tags_insert_own" ON contact_tags;
DROP POLICY IF EXISTS "contact_tags_update_own" ON contact_tags;
DROP POLICY IF EXISTS "contact_tags_delete_own" ON contact_tags;

CREATE POLICY "contact_tags_select_own" ON contact_tags 
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "contact_tags_insert_own" ON contact_tags 
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "contact_tags_update_own" ON contact_tags 
FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "contact_tags_delete_own" ON contact_tags 
FOR DELETE USING (owner_id = auth.uid());

-- 3. FIX PIPELINES TABLE
DROP POLICY IF EXISTS "Users can manage own pipelines" ON pipelines;
DROP POLICY IF EXISTS "pipelines_select_own" ON pipelines;
DROP POLICY IF EXISTS "pipelines_insert_own" ON pipelines;
DROP POLICY IF EXISTS "pipelines_update_own" ON pipelines;
DROP POLICY IF EXISTS "pipelines_delete_own" ON pipelines;

CREATE POLICY "pipelines_select_own" ON pipelines 
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "pipelines_insert_own" ON pipelines 
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "pipelines_update_own" ON pipelines 
FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "pipelines_delete_own" ON pipelines 
FOR DELETE USING (owner_id = auth.uid());

-- 4. FIX PIPELINE_STAGES TABLE
DROP POLICY IF EXISTS "Users can view own pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "Users can manage own pipeline stages" ON pipeline_stages;
DROP POLICY IF EXISTS "pipeline_stages_select_own" ON pipeline_stages;
DROP POLICY IF EXISTS "pipeline_stages_insert_own" ON pipeline_stages;
DROP POLICY IF EXISTS "pipeline_stages_update_own" ON pipeline_stages;
DROP POLICY IF EXISTS "pipeline_stages_delete_own" ON pipeline_stages;

CREATE POLICY "pipeline_stages_select_own" ON pipeline_stages 
FOR SELECT USING (pipeline_id IN (SELECT id FROM pipelines WHERE owner_id = auth.uid()));

CREATE POLICY "pipeline_stages_insert_own" ON pipeline_stages 
FOR INSERT WITH CHECK (pipeline_id IN (SELECT id FROM pipelines WHERE owner_id = auth.uid()));

CREATE POLICY "pipeline_stages_update_own" ON pipeline_stages 
FOR UPDATE USING (pipeline_id IN (SELECT id FROM pipelines WHERE owner_id = auth.uid()));

CREATE POLICY "pipeline_stages_delete_own" ON pipeline_stages 
FOR DELETE USING (pipeline_id IN (SELECT id FROM pipelines WHERE owner_id = auth.uid()));

-- 5. FIX CALENDAR_EVENTS TABLE
DROP POLICY IF EXISTS "Users can manage own events" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_select_own" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert_own" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_update_own" ON calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete_own" ON calendar_events;

CREATE POLICY "calendar_events_select_own" ON calendar_events 
FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "calendar_events_insert_own" ON calendar_events 
FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "calendar_events_update_own" ON calendar_events 
FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "calendar_events_delete_own" ON calendar_events 
FOR DELETE USING (owner_id = auth.uid());

-- 6. FIX CONTACT_DEAL_LINKS TABLE  
DROP POLICY IF EXISTS "Users can manage own contact-deal links" ON contact_deal_links;
DROP POLICY IF EXISTS "contact_deal_links_select_own" ON contact_deal_links;
DROP POLICY IF EXISTS "contact_deal_links_insert_own" ON contact_deal_links;
DROP POLICY IF EXISTS "contact_deal_links_update_own" ON contact_deal_links;
DROP POLICY IF EXISTS "contact_deal_links_delete_own" ON contact_deal_links;

CREATE POLICY "contact_deal_links_select_own" ON contact_deal_links 
FOR SELECT USING (
    contact_id IN (SELECT id FROM contacts WHERE owner_id = auth.uid())
    OR deal_id IN (SELECT id FROM deals WHERE owner_id = auth.uid())
);

CREATE POLICY "contact_deal_links_insert_own" ON contact_deal_links 
FOR INSERT WITH CHECK (
    contact_id IN (SELECT id FROM contacts WHERE owner_id = auth.uid())
    OR deal_id IN (SELECT id FROM deals WHERE owner_id = auth.uid())
);

CREATE POLICY "contact_deal_links_update_own" ON contact_deal_links 
FOR UPDATE USING (
    contact_id IN (SELECT id FROM contacts WHERE owner_id = auth.uid())
    OR deal_id IN (SELECT id FROM deals WHERE owner_id = auth.uid())
);

CREATE POLICY "contact_deal_links_delete_own" ON contact_deal_links 
FOR DELETE USING (
    contact_id IN (SELECT id FROM contacts WHERE owner_id = auth.uid())
    OR deal_id IN (SELECT id FROM deals WHERE owner_id = auth.uid())
);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- DONE! RLS policies fixed for: 
-- contacts, contact_tags, pipelines, pipeline_stages, calendar_events, contact_deal_links
-- ============================================================================
