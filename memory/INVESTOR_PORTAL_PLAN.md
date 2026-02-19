# Off-Market Investor Portal — Build Plan

## 1. Executive Summary

A new subsystem inside DealLinked that lets brokers create private, gated deal rooms ("portals") for investor clients. Investors access a read-only, map-based experience via access code. Brokers gain deal-level and investor-level behavioral intelligence (views, saves, downloads).

---

## 2. Existing System Inventory (What We're Building On)

### Database Tables (Supabase/PostgreSQL)
`deals`, `deal_documents`, `contacts`, `contact_deal_links`, `contact_tags`, `pipelines`, `pipeline_stages`, `teams`, `team_members`, `user_profiles`, `calendar_events`

### Auth System
- Broker auth: Supabase Auth (JWT). Verified via `auth_helpers.py` → direct HTTP call to `supabase/auth/v1/user`.
- All existing API routes use `HTTPBearer` dependency that expects a Supabase JWT.
- **Investor auth will be entirely separate** — access codes, not Supabase users.

### Frontend Components of Note
| Component | Lines | Relevance |
|---|---|---|
| `MapView.js` | 2,257 | The map experience to replicate (read-only) |
| `DealDetails.js` | 1,147 | The deal detail page to replicate (presentation mode) |
| `PublicShare.js` | 253 | Existing read-only deal view — useful pattern reference |
| `MainLayout.js` | 243 | Sidebar layout — portal needs its own minimal layout |

### Key Architectural Facts
- MapView.js is a monolith (2,257 lines) — heavy coupling with broker actions (add deal, edit, pipeline controls, contact management). Cannot be reused as-is. Need a clean read-only fork.
- DealDetails.js has inline editing throughout (`onBlur` save on every field). Also cannot be reused as-is.
- PublicShare.js is the closest existing pattern — a public, read-only single-deal view. Good reference for the portal detail page.
- Documents are stored in Supabase Storage bucket `deal-documents`. Public URLs are generated. Portal doc downloads will need to go through a logging proxy.

---

## 3. Open Architectural Decisions (Must Resolve Before Build)

### Decision 1: Investor Session Token Mechanism
**Options:**
- **A) Self-issued JWT** — Backend generates a JWT on access code validation, stores in localStorage. Backend validates JWT on every request. Simple, stateless, fast.
- **B) Opaque session ID** — Backend generates a random session token, stores in `portal_sessions` table. Every request does a DB lookup. Allows instant revocation (delete row = dead session).

**Recommendation:** Option B (opaque session). The spec requires instant revocation when broker clicks "Revoke." JWTs are valid until expiry — you'd need a revocation list anyway, which negates the benefit. An opaque token + DB check is simpler and guarantees instant invalidation.

### Decision 2: Investor Portal Frontend Architecture
**Options:**
- **A) Separate route tree, same React app** — `/portal/:portalId` routes live in the same SPA. Investor has a separate layout with no sidebar. Broker and investor code ship in one bundle.
- **B) Separate SPA / micro-frontend** — Completely separate build/entry point for investor experience.

**Recommendation:** Option A. The portal is lightweight UI. Shipping a second SPA adds build complexity for minimal gain. A separate route tree under `/portal` with its own layout component is clean enough.

### Decision 3: Deal Data Projection for Investors
**Question:** Which deal fields are visible to investors? The full deal schema includes `owner_id`, `pipeline_id`, `pipeline_stage_id`, `team_id`, `status`, `notes` — all broker-internal.

**Recommendation:** Define an explicit allowlist. The backend portal endpoint should SELECT only the presentation-safe columns:
`title, address, city, state, zip_code, latitude, longitude, asset_type, asking_price, size_sqft, lot_size, year_built, occupancy, zoning, noi, cap_rate, annual_income, annual_expenses, image_url, image_urls`

Exclude: `owner_id, team_id, pipeline_id, pipeline_stage_id, status, notes, created_at, updated_at`

### Decision 4: Document Download Logging
**Options:**
- **A) Proxy all downloads through backend** — Investor hits `/api/portal/documents/{id}/download`, backend logs the event, then redirects to the Supabase storage URL.
- **B) Serve docs directly, log via frontend beacon** — Investor gets the URL directly, JS fires a `POST /api/portal/activity` on click.

**Recommendation:** Option A. Proxy guarantees the log is recorded even if JS fails. Also prevents investors from bookmarking direct storage URLs that bypass logging.

### Decision 5: Portal URL Structure
**Question:** What does the investor-facing URL look like?

**Recommendation:** `/portal/{portal_id}` — the portal_id is a UUID. Investor navigates here, enters name + access code. After auth, they stay on this URL. Subroutes: `/portal/{portal_id}/deal/{deal_id}` for detail views.

---

## 4. New Data Model

### New Tables

```
portals
├── id (uuid, PK)
├── broker_id (uuid, FK → auth.users)
├── name (text)
├── created_at (timestamptz)
└── updated_at (timestamptz)

portal_deals
├── id (uuid, PK)
├── portal_id (uuid, FK → portals)
├── deal_id (uuid, FK → deals)
├── added_at (timestamptz)
└── UNIQUE(portal_id, deal_id)

portal_members
├── id (uuid, PK)
├── portal_id (uuid, FK → portals)
├── name (text)
├── email (text, nullable)
├── access_code (text, unique, indexed)
├── status (text: 'invited' | 'active' | 'revoked')
├── invited_at (timestamptz)
├── activated_at (timestamptz, nullable)
└── revoked_at (timestamptz, nullable)

portal_sessions
├── id (uuid, PK)
├── member_id (uuid, FK → portal_members)
├── portal_id (uuid, FK → portals)
├── session_token (text, unique, indexed)
├── created_at (timestamptz)
└── is_valid (boolean, default true)

portal_activity
├── id (uuid, PK)
├── portal_id (uuid, FK → portals)
├── member_id (uuid, FK → portal_members)
├── deal_id (uuid, FK → deals, nullable)
├── document_id (uuid, FK → deal_documents, nullable)
├── action (text: 'view_deal' | 'save_deal' | 'unsave_deal' | 'download_document')
├── metadata (jsonb, nullable)
└── created_at (timestamptz)

portal_saved_deals
├── id (uuid, PK)
├── member_id (uuid, FK → portal_members)
├── deal_id (uuid, FK → deals)
├── portal_id (uuid, FK → portals)
├── saved_at (timestamptz)
└── UNIQUE(member_id, deal_id, portal_id)
```

### Existing Tables — No Schema Changes Required
The `deals` and `deal_documents` tables are read from, not modified. Portal is an overlay system — it references deals, doesn't alter them.

---

## 5. Phased Build Plan

### Phase 1: Backend Foundation + Broker Portal CRUD
**Goal:** Broker can create/manage portals, add/remove deals, and manage investor members — all from new API endpoints. No frontend yet.

**Backend work:**
- Supabase migrations: Create all 6 new tables with RLS policies
- `routes_v2/portals.py` — Broker-facing CRUD:
  - `POST /api/portals` — Create portal
  - `GET /api/portals` — List broker's portals
  - `GET /api/portals/{id}` — Get portal with deal count + member count
  - `PUT /api/portals/{id}` — Update portal name
  - `DELETE /api/portals/{id}` — Delete portal (cascade members, sessions, activity)
- `routes_v2/portal_deals.py` — Deal assignment:
  - `GET /api/portals/{id}/deals` — List deals in portal (with asset_type summary for filter generation)
  - `POST /api/portals/{id}/deals` — Add deal(s) to portal (accept array of deal_ids)
  - `DELETE /api/portals/{id}/deals/{deal_id}` — Remove deal from portal
- `routes_v2/portal_members.py` — Member management:
  - `GET /api/portals/{id}/members` — List members with status
  - `POST /api/portals/{id}/members` — Create member (generates access code, returns it)
  - `POST /api/portals/{id}/members/{member_id}/regenerate-code` — New code, invalidates old
  - `PUT /api/portals/{id}/members/{member_id}/revoke` — Revoke access (invalidates all sessions)
  - `PUT /api/portals/{id}/members/{member_id}/restore` — Restore access (generates new code)

**Test criteria:** All endpoints return correct data via curl. Access code generation produces unique 8-char alphanumeric codes.

---

### Phase 2: Investor Authentication + Portal Data API
**Goal:** Investor can authenticate with access code and fetch portal data through a separate API path.

**Backend work:**
- New auth helper: `verify_portal_session(token)` — looks up `portal_sessions` table, returns `{member_id, portal_id}` or 401.
- `routes_v2/portal_investor.py` — Investor-facing endpoints (no Supabase JWT required):
  - `POST /api/portal/{portal_id}/auth` — Validate name + access code. Create session. Return session token. Flip member status from 'invited' → 'active'.
  - `GET /api/portal/{portal_id}/deals` — Returns deals with presentation-safe fields only. Includes distinct asset_types list for filter UI.
  - `GET /api/portal/{portal_id}/deals/{deal_id}` — Single deal detail (presentation fields + documents list)
  - `GET /api/portal/{portal_id}/deals/{deal_id}/documents/{doc_id}/download` — Log download, redirect to file URL.
  - `POST /api/portal/{portal_id}/activity` — Log a view event (called when investor opens a deal).
  - `GET /api/portal/{portal_id}/saved` — Get investor's saved deals.
  - `POST /api/portal/{portal_id}/saved/{deal_id}` — Save deal.
  - `DELETE /api/portal/{portal_id}/saved/{deal_id}` — Unsave deal.
- All investor endpoints use a custom `X-Portal-Session` header (or Bearer token) instead of Supabase JWT.

**Test criteria:** Full auth flow works via curl: get code → authenticate → fetch deals → save deal → download doc (logged). Revoke member → next request returns 401.

---

### Phase 3: Broker Portal Management UI
**Goal:** New "Portals" page in the CRM sidebar where brokers create and manage portals.

**Frontend work:**
- Add "Portals" nav item to `MainLayout.js` sidebar (between Team and Calendar)
- New page: `src/pages/Portals.js` — List of broker's portals with create button
- New page: `src/pages/PortalDetail.js` — Two-tab layout:
  - **Deals tab:** Searchable list of all broker's CRM deals. Toggle switch per deal to add/remove from portal. Shows which deals are currently in the portal.
  - **Members tab:** Table of invited investors (name, email, status badge, invite date). Actions: copy access code, regenerate code, revoke/restore toggle. "Add Member" button opens a simple name+email form.
- Add route: `/portals` and `/portals/:portalId`

**Test criteria:** Broker can create portal, add deals via toggle, invite member, copy access code, revoke and restore access.

---

### Phase 4: Investor Portal Frontend (Map + Deal View)
**Goal:** The investor-facing read-only map experience.

**Frontend work:**
- New layout: `src/components/PortalLayout.js` — Minimal chrome. No sidebar. Logo + portal name + "Saved Deals" toggle + asset type filter + logout.
- New page: `src/pages/PortalLogin.js` — Name + access code form at `/portal/{portalId}`
- New page: `src/pages/PortalMap.js` — Read-only map:
  - Uses same MapLibre + ESRI satellite tiles as CRM map
  - Deal pins from portal deals endpoint
  - Asset type filter bar (auto-populated from data)
  - Click pin → side panel with read-only deal summary
  - Save/unsave heart icon on each deal
  - "Saved Deals" toggle filters to saved only
- New page: `src/pages/PortalDealDetail.js` — Read-only deal detail:
  - Image carousel, property details, documents list
  - Document download buttons (routed through logging proxy)
  - No edit fields, no pipeline, no contacts
  - Modeled after `PublicShare.js` but richer
- Portal session stored in localStorage. Checked on every page load.
- Add routes: `/portal/:portalId`, `/portal/:portalId/deal/:dealId`

**Test criteria:** Investor can log in with code, see map with deal pins, filter by asset type, open deal, view details, save deals, download documents. Zero edit capabilities anywhere.

---

### Phase 5: Broker Intelligence Dashboards
**Goal:** Deal-centric and investor-centric analytics views.

**Backend work:**
- `GET /api/portals/{id}/deals/{deal_id}/intelligence` — Returns ranked list of investors who viewed this deal: view count, saved status, documents downloaded.
- `GET /api/portals/members/{member_id}/profile` — Returns investor's cross-portal activity: portals, deals viewed, deals saved, documents downloaded.

**Frontend work:**
- **Deal Intelligence View:** Accessible from the Deals tab in PortalDetail. Click a deal → slide panel showing investor engagement rankings.
- **Investor Profile View:** Accessible from the Members tab. Click an investor → slide panel showing their full behavioral profile across portals.

**Test criteria:** After simulated investor activity (views, saves, downloads), broker sees accurate engagement data in both views.

---

## 6. Potential Conflicts & Risks

### Risk 1: MapView.js Monolith
The CRM MapView is 2,257 lines with deeply embedded broker actions. The investor PortalMap must NOT import or extend it — must be a clean, purpose-built read-only component. Estimated 400-600 lines (just pins, filters, side panel, no editing).

### Risk 2: DealDetails.js Inline Editing
Every field in DealDetails has `onBlur` save handlers. The portal detail page must be a separate component, not a "read-only mode" flag on the existing one. Mixing modes in a 1,147-line component will create bugs.

### Risk 3: Auth Middleware Collision
All existing routes use `Depends(security)` which expects Supabase JWT. Investor routes need a different auth dependency. Must ensure the new `verify_portal_session` dependency is used exclusively on investor endpoints and never mixed with `get_user_id`.

### Risk 4: RLS Policies
Investor API queries use `service_role` key (via the existing `get_supabase()` helper) — RLS is bypassed. This is acceptable because the backend explicitly controls which deal fields and which deals are returned. However, the `portal_deals` join is the security boundary — must never return deals not in the portal.

### Risk 5: Session Invalidation Race Condition
When broker revokes an investor, all active sessions must be invalidated. If the investor has the portal open, their next API call must fail. The opaque session token + DB check handles this naturally — `is_valid = false` on all sessions for that member.

### Risk 6: Document URL Leakage
Supabase Storage public URLs don't expire. Once an investor downloads a document, they have the URL forever. If this is a concern, use Supabase signed URLs (time-limited) instead of public URLs. This is a product decision, not a technical blocker.

---

## 7. Migration Strategy

All 6 new tables are additive. No existing tables are modified. No existing columns change. Zero risk to current CRM functionality. Migrations can be applied independently and rolled back without affecting existing data.

---

## 8. Estimated Scope

| Phase | Effort | New Files | Dependencies |
|---|---|---|---|
| Phase 1: Backend Foundation | Medium | 3 route files, 1 migration | None |
| Phase 2: Investor Auth + API | Medium | 1 route file, 1 auth helper | Phase 1 |
| Phase 3: Broker Portal UI | Medium | 2 pages, 1 nav update | Phase 1 |
| Phase 4: Investor Portal Frontend | Large | 4 components/pages, 1 layout | Phase 2 |
| Phase 5: Intelligence Dashboards | Medium | 2 API endpoints, 2 UI panels | Phase 1-4 |

Phases 1-2 (backend) can be built and tested independently before any frontend work begins.
Phase 3 (broker UI) and Phase 4 (investor UI) can be built in parallel once backend is complete.
Phase 5 depends on all prior phases.
