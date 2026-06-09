# DealLinked CRE CRM - Product Requirements Document

## Original Problem Statement
A full-stack Commercial Real Estate (CRE) CRM application with React frontend, Python/FastAPI backend, and Supabase database.

## Architecture
- **Frontend:** React, Shadcn UI, sonner toasts, lucide-react icons, MapLibre GL JS, DOMPurify
- **Backend:** Python/FastAPI
- **Database:** Supabase (PostgreSQL) with RLS and integrated Storage
- **Auth:** Supabase JWT (main app), X-Portal-Session (investor portal)

## Completed Features
- Critical Dates Timeline, Milestone toggle fix, Teams page redesign, Toast overhaul
- N+1 query optimization, Deal default privacy, Contact form save fix
- Pipeline card styling (subtle borders, gaps, glassmorphic border removed)
- Map SVG teardrop markers, Login duplicate button fix
- Portal Deal Detail — Mobile-first LoopNet/Crexi redesign
- Code quality: XSS sanitization (DOMPurify), hook deps, empty catches, array keys, secrets removed
- Inline Create Contact on Deal Details page
- **Map Performance Optimization** — All sidebar operations (field edits, pipeline/stage changes, image uploads, visibility toggles) use optimistic local state updates via `updateDealInState()`. No `fetchDeals()` or `fetchTeamData()` called from sidebar. Memory leak fix (cleanup useEffect). (Apr 2026)
- **Map Position Persistence** — Map no longer jumps when toggling share/private. `handleToggleTeamVisibility` uses optimistic `setTeamDeals()` instead of `fetchTeamData()`. (Apr 2026)
- **Visibility Toggle on Deal Details** — Added "Share with Team" / "Make Private" toggle button on the full Deal Details page (`/deals/:dealId`). Previously only available on the map sidebar. (Apr 2026)
- **Code Quality Audit v2** (Feb 2026):
  - Removed hardcoded Supabase URL fallbacks from `test_timeline_api.py`, `test_timeline_features_v2.py`, `test_backlog_features.py`
  - Fixed empty catch blocks in `PortalDealDetail.js` (added console.error logging)
  - Replaced array index keys with stable keys in `PortalDealDetail.js`, `DealDetails.js`, `Contacts.js`, `LandingPageNew.js` (10 instances)
  - Fixed missing hook dependencies in 5 critical files (`Team.js`, `Settings.js`, `PortalMap.js`, `PortalDetail.js`, `Pipeline.js`) using `useCallback` — removed all `eslint-disable-line` suppressions
- **Pipeline Side Panel** (Feb 2026): Clicking a deal card in the Pipeline page now opens the PropertyIntelligencePanel side panel for inline editing, instead of navigating to `/deals/:id`. Enables full deal management without leaving the Pipeline view.
- **Public Share Agent Card** (Feb 2026): The shared deal page (`/share/:dealId`) now shows a Listing Agent card (deal owner's profile with avatar, name, company, Call/Email buttons) instead of buyer/seller contact information. Backend strips `contact_deal_links` and returns `agent` profile from `user_profiles`.
- **Unified Side Panel** (Feb 2026):
  - PropertyIntelligencePanel moved to **right side** of screen
  - Save button changed from gradient to **solid red**
  - Pipeline: card click → side panel; eye icon → full deal details page (`/deals/:id`)
  - **MapView sidebar replaced** with unified PropertyIntelligencePanel (reduced MapView from 2400 to 1838 lines)
  - Both Pipeline and Map now use the same panel component for cohesive UX
- **PublicShare Redesigned** (Feb 2026): Completely rewritten to match the PortalDealDetail layout — title block, hero photo carousel, listing agent card, 4-column property overview grid, description section, document downloads, location map with property marker
- **Image Upload in Side Panel** (Feb 2026): Added image upload functionality directly in PropertyIntelligencePanel
- **Visibility Toggle in Side Panel** (Feb 2026): Added Team/Private toggle button to PropertyIntelligencePanel header
- **Inline Contact Editing** (Feb 2026): Contacts linked to a deal can now be edited directly in the side panel (name, email, phone, company) without navigating to the Contacts page
- **Custom Pipeline/Stage Dropdowns** (Feb 2026): Replaced native `<select>` elements with custom dropdown components in PropertyIntelligencePanel to fix rendering issues in fixed-position dark panels. Custom dropdowns with proper z-index, dark theme styling, stage color dots, and click-outside-to-close behavior.

- **Dynamic Page Titles** (Feb 2026): Browser tab titles are now dynamic and branded. Shared property links show "DealLinked - {Property Name}", investor portal pages show "DealLinked - Client Portal", and the default title is "DealLinked" (was "Dealview - Commercial Real Estate CRM").

- **Code Quality Audit v3** (Feb 2026):
  - Backend test secrets: Replaced all hardcoded passwords in 8 test files with `os.environ.get("TEST_DEFAULT_PASSWORD")` fallbacks; centralized shared fixtures in `conftest.py`
  - Frontend Login.js: Replaced hardcoded `'placeholder'` password with `crypto.randomUUID()` for request-access signup
  - Frontend hook dependencies: Fixed stale closure risks in `Team.js` (loadData, loadTeamStats) and `Settings.js` (loadUserData) — added missing deps to useEffect arrays
  - Frontend array-index keys: Replaced `key={idx}` with stable keys in `CommandCenter.js` (6), `LandingPage.js` (4), `CSVImport.js` (1)
  - XSS via dangerouslySetInnerHTML: Confirmed already mitigated with DOMPurify.sanitize() in all 6 instances (Campaigns.js, CampaignWizard.js, CampaignDetails.js)

- **Create Deal Panel Unified** (Feb 2026): Create Deal side panel on CRM Map now matches PropertyIntelligencePanel styling (position: fixed, width: 500px, glass-morphism). ContactFormPanel repositioned to slide in from the right adjacent to the side panel (was opening on the left). Fixed Edit Full Details navigation from /workspace/deals/:id (non-existent route causing dashboard redirect) to /deals/:id.

- **Delete Deal Bug Fix** (Feb 2026): Fixed PropertyIntelligencePanel delete — was using direct Supabase client (blocked by RLS), now routes through `DELETE /api/deals/{deal_id}` backend endpoint with auth token.
- **Portal Team Collaboration** (Feb 2026): Team members can now be invited to manage client portals. New `portal_collaborators` table, 3 new API endpoints (`GET/POST/DELETE /api/portals/{portal_id}/collaborators`). PortalDetail page has a new "Team Access" tab for inviting/removing team members. Collaborators can manage portal members and deals. Portals list shows "Shared" badge for portals shared with the user. Portal access verification updated across all portal routes (deals, members, intelligence) to grant access to both owners and collaborators.

- **Map Performance Fix** (Feb 2026): Switched both CRM Map (MapView.js) and Portal Map (PortalMap.js) from controlled React state (viewState+onMove causing re-renders every frame) to uncontrolled (initialViewState + mapRef.flyTo). Removed all CSS transitions, blur filters, and drop-shadows from map markers. Maps now handle viewport natively on the GPU.
- **Contact Edit Panel** (Feb 2026): Clicking "Edit" on a linked contact in PropertyIntelligencePanel now opens the full ContactFormPanel (same as "Create New Contact") with pre-filled data instead of inline text fields.
- **Deal Data Persistence** (Feb 2026): handleMarkerClick now updates selectedDeal with the complete API response, ensuring all saved deal details display correctly when clicking a marker.

- **Document Upload in Side Panel** (Feb 2026): PropertyIntelligencePanel document operations (upload, fetch, delete) switched from direct Supabase client to backend API endpoints (`POST/GET /api/deals/{id}/documents`, `DELETE /api/documents/{id}`). Upload button now works from the side panel on both CRM Map and Pipeline pages.
- **Document Delete** (Feb 2026): Added delete buttons (Trash2 icon) to both the PropertyIntelligencePanel side panel and the DealDetails page. Backend DELETE endpoint updated to allow both the document uploader and the deal owner to delete documents.

- **Image Upload Filename Fix** (Feb 2026): Fixed "failed to load images" error caused by special characters in filenames (macOS screenshot names with narrow no-break spaces U+202F, spaces, parentheses). Backend now sanitizes filenames with `re.sub(r'[^\w.\-]', '_', filename)` before Supabase Storage upload — applied to both image and document uploads.
- **Create Deal Contact Panel** (Feb 2026): "Create New Contact" in the Create Deal side panel now opens the same `ContactFormPanel` component used for editing contacts, replacing the inline form fields. Consistent UX across all contact creation/editing flows.

- **Image Management & Save Sync** (Feb 2026):
  - Added image delete button (trash icon) on main carousel image in DealDetails page and PropertyIntelligencePanel side panel.
  - Added thumbnail strip to PropertyIntelligencePanel with per-image X delete buttons.
  - Added per-thumbnail X delete button + ← → reorder arrows to DealDetails page thumbnail strip.
  - New backend endpoints: `DELETE /api/deals/{deal_id}/images/{image_index}` and `PUT /api/deals/{deal_id}/images/reorder`.
  - Fixed critical field-name bugs in PropertyIntelligencePanel.handleSave: `price` → `asking_price`, `size` → `size_sqft` — edits to these fields now save correctly.
  - Fixed price-per-sqft calculations in PropertyIntelligencePanel to use correct `asking_price` and `size_sqft` field names.
  - Fixed MapView.js and Pipeline.js handlePanelUpdate to re-fetch the deal from API after a save, keeping parent state fully in sync with DB.
  - Fixed server.py POST /api/deals/{id}/images to return `image_urls` array (was only returning singular `image_url`).
  - handleMoveImage in DealDetails now reverts optimistic state on API failure.

## Reverted Features
- Light/Dark theme toggle — reverted per user request

## Backlog
- **P2:** Refactor Contacts.js (~1700 lines), CampaignWizard.js (2218 lines) — user deprioritized
- **P3:** Python complexity refactoring, type hint coverage — user deprioritized
- **Note:** localStorage security (move to httpOnly cookies) deferred as architectural change

## Code Quality Audit v4 (Feb 2026)
- **XSS via dangerouslySetInnerHTML**: Confirmed all 6 instances (Campaigns.js:1407/1960, CampaignWizard.js:1372/2001/2033, CampaignDetails.js:291) already properly wrapped with `DOMPurify.sanitize()`. Static analyzer flagged these as false positives.
- **Hook Dependencies**: Team.js, Settings.js, PortalMap.js, PublicShare.js all use correctly empty/minimal deps arrays — external deps are module-level constants (BACKEND_URL, supabase) that never change. False positives from static analyzer.
- **Python Undefined Variables**: `ruff --select F821` passes clean across all backend files — no actual undefined variable issues.
- **Empty Catch Block**: Fixed Pipeline.js line 648 — added `console.error` logging to silent catch in handlePanelUpdate.
- **Array Index Keys**: Fixed 7 instances across 4 files: PropertyIntelligencePanel.js (image thumbnails → URL key, phone numbers → phone.number, officers → officer.name), ImageCarousel.js (both SwiperSlide maps → image URL), EnhancedPublishWizard.js (highlights → composite key), LLCLookupModal.js (officers → officer.name, phones → phone.number).
