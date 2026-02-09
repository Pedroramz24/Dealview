# DealLinked CRM - Product Requirements Document

## Original Problem Statement
Complete ground-up rebuild of "DealLinked CRM" — a CRE (Commercial Real Estate) deal management platform. Keep: Map View, Property Details, Pipeline/Kanban, Contacts, Team tab, Landing/Login pages, Calendar. Remove: Marketplace, Command Center, DealVisor, AI operations, complex map layers.

## Tech Stack
- **Frontend:** React, React Router, react-map-gl, MapLibre GL JS, Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Geocoding:** Radar.io
- **Styling:** Custom design system (dark theme)

## Architecture
```
/app/
├── backend/
│   ├── routes_v2/         # All API routes
│   ├── utils/             # DB + auth helpers (get_user_id via direct HTTP)
│   └── server.py          # FastAPI app + document/image upload routes
├── frontend/
│   ├── src/
│   │   ├── pages/         # All page components
│   │   ├── components/ui/ # Shadcn/UI
│   │   └── styles/        # Design system
│   └── .env
└── memory/
    └── PRD.md
```

## What's Been Implemented

### Core Infrastructure (DONE)
- Supabase database with RLS policies and triggers
- FastAPI V2 backend with all CRUD endpoints
- React frontend with dark theme design system
- User signup/login with Supabase Auth
- Team creation and management
- Auth token verification via direct HTTP (avoids supabase-py singleton contamination)

### Pages (ALL DONE)
- **Landing Page:** Dark theme hero with "Get Started" CTA
- **Login/Signup:** Supabase auth with email/password
- **Dashboard:** Stats overview
- **Map View:** Satellite/street toggle, deal markers, click-to-add, tile prefetching, side panel with inline editing
- **Deal Details:** Inline editing, image carousel, document upload + preview modal
- **Pipeline/Kanban:** Drag-and-drop deal stages
- **Contacts:** CRUD, smart tags side panel, CSV import
- **Calendar:** Event creation and management
- **Team:** Team member management
- **Settings:** Profile settings

### Key Features
- **Always-on inline editing** on DealDetails and MapView side panel
- **Image carousel** with navigation arrows and thumbnails
- **Document preview modal** (PDF iframe, image viewer, download fallback)
- **CSV contact import** with column auto-mapping and preview
- **Map tile prefetching** with 300-tile cache and zoom+1 preloading
- **Auto-save on blur** for all editable fields

### Key API Endpoints
- `GET/POST /api/deals` — Deal CRUD
- `GET/PUT/DELETE /api/deals/{id}` — Single deal ops
- `POST /api/deals/{id}/images` — Image upload
- `POST /api/deals/{id}/documents` — Document upload
- `GET/POST /api/contacts` — Contact CRUD
- `POST /api/contacts/bulk-import` — CSV bulk import
- `GET/POST /api/pipelines` — Pipeline/Stage CRUD
- `GET/POST /api/teams` — Team CRUD
- `GET/POST /api/calendar/events` — Calendar events

### Bug Fixes
- **Auth singleton contamination** (Dec 2025): supabase.auth.get_user() was changing PostgREST headers from service_role to user JWT, causing empty query results. Fixed by moving token verification to direct HTTP calls in auth_helpers.py.

## Recent Changes
- **Feb 2026:** Pipeline stage columns now use full screen width (flex: 1, minWidth: 250px) instead of fixed 280px columns. The "Add Stage" placeholder is compact when stages exist.
- **Signup disabled** for private launch (POST /api/auth/signup returns 403)
- **Inline contact management** added to map side panel
- **Map optimizations:** Vector tile overlays, parallel ESRI loading, tuned MapLibre cache
- **Hotels & Medical** added to asset type lists

## Prioritized Backlog

### P2
- Admin approval system for signups
- Dynamic asset type management UI
- Recurring calendar events
- Team performance metrics
- Quick stats dashboard enhancement
- Deal activity timeline
- Code cleanup: remove dead signup form code from Login.js
