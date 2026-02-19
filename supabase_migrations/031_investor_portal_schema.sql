-- Off-Market Investor Portal Schema
-- Phase 1: All 6 new tables (additive, no existing table changes)

-- 1. Portals - broker-created deal rooms
CREATE TABLE IF NOT EXISTS portals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_portals_broker_id ON portals(broker_id);

-- 2. Portal Deals - which deals appear in which portal
CREATE TABLE IF NOT EXISTS portal_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id UUID NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(portal_id, deal_id)
);

CREATE INDEX idx_portal_deals_portal_id ON portal_deals(portal_id);
CREATE INDEX idx_portal_deals_deal_id ON portal_deals(deal_id);

-- 3. Portal Members - invited investors
CREATE TABLE IF NOT EXISTS portal_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id UUID NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    access_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'revoked')),
    invited_at TIMESTAMPTZ DEFAULT now(),
    activated_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_portal_members_portal_id ON portal_members(portal_id);
CREATE INDEX idx_portal_members_access_code ON portal_members(access_code);

-- 4. Portal Sessions - persistent investor sessions (opaque token)
CREATE TABLE IF NOT EXISTS portal_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES portal_members(id) ON DELETE CASCADE,
    portal_id UUID NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    is_valid BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_portal_sessions_token ON portal_sessions(session_token);
CREATE INDEX idx_portal_sessions_member_id ON portal_sessions(member_id);

-- 5. Portal Activity - behavioral tracking
CREATE TABLE IF NOT EXISTS portal_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id UUID NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES portal_members(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    document_id UUID REFERENCES deal_documents(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('view_deal', 'save_deal', 'unsave_deal', 'download_document')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_portal_activity_portal_id ON portal_activity(portal_id);
CREATE INDEX idx_portal_activity_member_id ON portal_activity(member_id);
CREATE INDEX idx_portal_activity_deal_id ON portal_activity(deal_id);

-- 6. Portal Saved Deals - investor watchlist
CREATE TABLE IF NOT EXISTS portal_saved_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES portal_members(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    portal_id UUID NOT NULL REFERENCES portals(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(member_id, deal_id, portal_id)
);

CREATE INDEX idx_portal_saved_deals_member_id ON portal_saved_deals(member_id);

-- Enable RLS on all new tables
ALTER TABLE portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_saved_deals ENABLE ROW LEVEL SECURITY;

-- RLS policies: service_role bypasses RLS, so backend access works.
-- These policies are for direct client access (which we don't use, but good practice).
CREATE POLICY "Brokers manage own portals" ON portals FOR ALL USING (broker_id = auth.uid());
CREATE POLICY "Portal deals via portal owner" ON portal_deals FOR ALL USING (
    portal_id IN (SELECT id FROM portals WHERE broker_id = auth.uid())
);
CREATE POLICY "Portal members via portal owner" ON portal_members FOR ALL USING (
    portal_id IN (SELECT id FROM portals WHERE broker_id = auth.uid())
);
CREATE POLICY "Portal sessions via portal owner" ON portal_sessions FOR ALL USING (
    portal_id IN (SELECT id FROM portals WHERE broker_id = auth.uid())
);
CREATE POLICY "Portal activity via portal owner" ON portal_activity FOR ALL USING (
    portal_id IN (SELECT id FROM portals WHERE broker_id = auth.uid())
);
CREATE POLICY "Portal saved deals via portal owner" ON portal_saved_deals FOR ALL USING (
    portal_id IN (SELECT id FROM portals WHERE broker_id = auth.uid())
);

-- Updated_at trigger for portals
CREATE OR REPLACE FUNCTION update_portals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER portals_updated_at
    BEFORE UPDATE ON portals
    FOR EACH ROW
    EXECUTE FUNCTION update_portals_updated_at();
