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
│   ├── routes_v2/         # All API routes (deals, contacts, pipelines, teams, calendar, etc.)
│   ├── utils/             # DB helpers, auth helpers
│   └── server.py          # FastAPI app entry
├── frontend/
│   ├── src/
│   │   ├── pages/         # DealDetails, MapView, Pipeline, Contacts, Calendar, Team, Settings, Landing, Login
│   │   ├── components/ui/ # Shadcn/UI components
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

### Pages (ALL DONE)
- **Landing Page:** Dark theme hero with "Get Started" CTA
- **Login/Signup:** Supabase auth with email/password
- **Map View:** Satellite/street toggle, deal markers, click-to-add, search with geocoding, team deals overlay
- **Deal Details:** Full property view with inline editing, image carousel, document upload
- **Pipeline/Kanban:** Drag-and-drop deal stages
- **Contacts:** Contact CRUD with smart tags side panel
- **Calendar:** Event creation and management
- **Team:** Team member management
- **Settings:** Profile settings

### Dec 2025 - Deal Details & Map Side Panel Overhaul (DONE)
- **Always-on inline editing:** All deal fields are always editable inputs — no edit/save toggle button
- **Image carousel:** Navigation arrows (prev/next), thumbnail strip, counter badge
- **Image upload:** "Add Images" button on DealDetails, "Add" button on MapView side panel
- **All fields visible:** Every deal field renders even when empty (with placeholders)
- **Auto-save on blur:** Field changes save automatically when user tabs/clicks away
- **Pipeline/Stage dropdowns:** Working on both DealDetails and MapView side panel
- **Document upload:** Drag-and-drop zone with file browse fallback
- **MapView side panel:** Full refactor — image carousel, inline editing, all property fields, notes textarea

### Key API Endpoints
- `GET/POST /api/deals` — List/Create deals
- `GET/PUT/DELETE /api/deals/{id}` — Deal CRUD
- `POST /api/deals/{id}/images` — Image upload
- `POST /api/deals/{id}/documents` — Document upload
- `GET/POST /api/contacts` — Contact CRUD
- `GET/POST /api/pipelines` — Pipeline/Stage CRUD
- `GET/POST /api/teams` — Team CRUD
- `GET/POST /api/calendar/events` — Calendar events
- `GET /api/geocode/autocomplete` — Address search
- `GET /api/geocode/reverse` — Reverse geocoding

## Prioritized Backlog

### P0 (Next)
- Map tile prefetching for smoother performance
- Full E2E test of complete app flow

### P1
- CSV contact import
- Document preview modal

### P2
- Recurring calendar events
- Team performance metrics
