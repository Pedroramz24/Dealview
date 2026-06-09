"""
Investor Portal - Investor-Facing API
Authentication, deal browsing, document downloads, saved deals, activity logging.
All endpoints use X-Portal-Session header — NO Supabase JWT.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from datetime import datetime, timezone
from utils.db import get_supabase
from utils.portal_auth import verify_portal_session, verify_portal_session_flexible
import logging
import uuid
import secrets

router = APIRouter(prefix="/portal/{portal_id}", tags=["Investor Portal"])
logger = logging.getLogger(__name__)

# Presentation-safe deal fields (same allowlist as portal_deals.py)
SAFE_DEAL_FIELDS = (
    "id, title, address, city, state, zip_code, latitude, longitude, "
    "asset_type, asking_price, size_sqft, lot_size, year_built, occupancy, "
    "zoning, noi, cap_rate, annual_income, annual_expenses, image_url, image_urls, notes"
)

# Document fields safe for investors (strip owner_id)
SAFE_DOC_FIELDS = "id, deal_id, file_name, file_url, file_type, file_size, uploaded_at"


class PortalAuth(BaseModel):
    name: str
    access_code: str


# ============================================================================
# AUTHENTICATION
# ============================================================================

@router.post("/auth")
async def authenticate_investor(portal_id: str, body: PortalAuth):
    """Validate name + access code. Create persistent session. Return token."""
    supabase = get_supabase()

    # Verify portal exists
    portal = supabase.table('portals').select('id, name').eq('id', portal_id).execute()
    if not portal.data:
        raise HTTPException(status_code=404, detail="Portal not found")

    # Find member by access code within this portal
    member = supabase.table('portal_members').select(
        'id, name, status, access_code'
    ).eq('portal_id', portal_id).eq('access_code', body.access_code.strip().upper()).execute()

    if not member.data:
        raise HTTPException(status_code=401, detail="Invalid access code")

    m = member.data[0]

    # Check name matches (case-insensitive)
    if m['name'].lower().strip() != body.name.lower().strip():
        raise HTTPException(status_code=401, detail="Name does not match")

    # Check not revoked
    if m['status'] == 'revoked':
        raise HTTPException(status_code=403, detail="Access has been revoked")

    # Activate member if first login
    if m['status'] == 'invited':
        supabase.table('portal_members').update({
            "status": "active",
            "activated_at": datetime.now(timezone.utc).isoformat()
        }).eq('id', m['id']).execute()

    # Create session token
    session_token = secrets.token_urlsafe(48)
    supabase.table('portal_sessions').insert({
        "id": str(uuid.uuid4()),
        "member_id": m['id'],
        "portal_id": portal_id,
        "session_token": session_token,
        "is_valid": True
    }).execute()

    return {
        "success": True,
        "session_token": session_token,
        "member_name": m['name'],
        "portal_name": portal.data[0]['name']
    }


# ============================================================================
# DEAL BROWSING
# ============================================================================

@router.get("/deals")
async def list_investor_deals(
    portal_id: str,
    session: dict = Depends(verify_portal_session)
):
    """List all deals in this portal with safe fields + asset type filters."""
    if session['portal_id'] != portal_id:
        raise HTTPException(status_code=403, detail="Session does not match portal")

    supabase = get_supabase()

    # Get deal IDs in this portal
    links = supabase.table('portal_deals').select('deal_id').eq('portal_id', portal_id).execute()
    deal_ids = [row['deal_id'] for row in (links.data or [])]

    if not deal_ids:
        return {"success": True, "deals": [], "asset_types": []}

    # Fetch deals with safe fields only
    deals = supabase.table('deals').select(SAFE_DEAL_FIELDS).in_('id', deal_ids).execute()
    deal_list = deals.data or []

    # Get investor's saved deal IDs for this portal
    saved = supabase.table('portal_saved_deals').select('deal_id').eq(
        'member_id', session['member_id']
    ).eq('portal_id', portal_id).execute()
    saved_ids = set(row['deal_id'] for row in (saved.data or []))

    # Annotate deals with is_saved flag
    for deal in deal_list:
        deal['is_saved'] = deal['id'] in saved_ids

    # Build asset type filter list
    asset_types = sorted(set(d['asset_type'] for d in deal_list if d.get('asset_type')))

    return {"success": True, "deals": deal_list, "asset_types": asset_types}


@router.get("/deals/{deal_id}")
async def get_investor_deal(
    portal_id: str,
    deal_id: str,
    session: dict = Depends(verify_portal_session)
):
    """Get a single deal with full presentation details + documents."""
    if session['portal_id'] != portal_id:
        raise HTTPException(status_code=403, detail="Session does not match portal")

    supabase = get_supabase()

    # Verify deal is in this portal
    link = supabase.table('portal_deals').select('id').eq(
        'portal_id', portal_id
    ).eq('deal_id', deal_id).execute()
    if not link.data:
        raise HTTPException(status_code=404, detail="Deal not found in this portal")

    # Fetch deal with safe fields
    deal_result = supabase.table('deals').select(SAFE_DEAL_FIELDS).eq('id', deal_id).execute()
    if not deal_result.data:
        raise HTTPException(status_code=404, detail="Deal not found")

    deal = deal_result.data[0]

    # Fetch broker/agent info (the deal owner's profile)
    owner_id_result = supabase.table('deals').select('owner_id').eq('id', deal_id).execute()
    if owner_id_result.data:
        owner_id = owner_id_result.data[0]['owner_id']
        agent_profile = supabase.table('user_profiles').select(
            'full_name, email, phone, avatar_url, company'
        ).eq('id', owner_id).execute()
        if agent_profile.data:
            deal['agent'] = agent_profile.data[0]

    # Fetch documents (strip owner_id)
    docs = supabase.table('deal_documents').select(SAFE_DOC_FIELDS).eq('deal_id', deal_id).execute()
    deal['documents'] = docs.data or []

    # Check if saved
    saved = supabase.table('portal_saved_deals').select('id').eq(
        'member_id', session['member_id']
    ).eq('deal_id', deal_id).eq('portal_id', portal_id).execute()
    deal['is_saved'] = bool(saved.data)

    # Log the view
    supabase.table('portal_activity').insert({
        "id": str(uuid.uuid4()),
        "portal_id": portal_id,
        "member_id": session['member_id'],
        "deal_id": deal_id,
        "action": "view_deal"
    }).execute()

    return {"success": True, "deal": deal}


# ============================================================================
# DOCUMENT DOWNLOAD (logged proxy)
# ============================================================================

@router.get("/deals/{deal_id}/documents/{doc_id}/download")
async def download_document(
    portal_id: str,
    deal_id: str,
    doc_id: str,
    session: dict = Depends(verify_portal_session_flexible)
):
    """Log the download and redirect to the file URL."""
    if session['portal_id'] != portal_id:
        raise HTTPException(status_code=403, detail="Session does not match portal")

    supabase = get_supabase()

    # Verify deal is in this portal
    link = supabase.table('portal_deals').select('id').eq(
        'portal_id', portal_id
    ).eq('deal_id', deal_id).execute()
    if not link.data:
        raise HTTPException(status_code=404, detail="Deal not found in this portal")

    # Get document
    doc = supabase.table('deal_documents').select('id, file_url, file_name').eq(
        'id', doc_id
    ).eq('deal_id', deal_id).execute()
    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")

    file_url = doc.data[0]['file_url']

    # Log the download
    supabase.table('portal_activity').insert({
        "id": str(uuid.uuid4()),
        "portal_id": portal_id,
        "member_id": session['member_id'],
        "deal_id": deal_id,
        "document_id": doc_id,
        "action": "download_document",
        "metadata": {"file_name": doc.data[0]['file_name']}
    }).execute()

    return RedirectResponse(url=file_url, status_code=302)


# ============================================================================
# SAVED DEALS (watchlist)
# ============================================================================

@router.get("/saved")
async def list_saved_deals(
    portal_id: str,
    session: dict = Depends(verify_portal_session)
):
    """Get investor's saved deals for this portal."""
    if session['portal_id'] != portal_id:
        raise HTTPException(status_code=403, detail="Session does not match portal")

    supabase = get_supabase()

    saved = supabase.table('portal_saved_deals').select('deal_id').eq(
        'member_id', session['member_id']
    ).eq('portal_id', portal_id).execute()
    deal_ids = [row['deal_id'] for row in (saved.data or [])]

    if not deal_ids:
        return {"success": True, "deals": []}

    deals = supabase.table('deals').select(SAFE_DEAL_FIELDS).in_('id', deal_ids).execute()
    deal_list = deals.data or []
    for deal in deal_list:
        deal['is_saved'] = True

    return {"success": True, "deals": deal_list}


@router.post("/saved/{deal_id}")
async def save_deal(
    portal_id: str,
    deal_id: str,
    session: dict = Depends(verify_portal_session)
):
    """Save a deal to investor's watchlist."""
    if session['portal_id'] != portal_id:
        raise HTTPException(status_code=403, detail="Session does not match portal")

    supabase = get_supabase()

    # Verify deal is in this portal
    link = supabase.table('portal_deals').select('id').eq(
        'portal_id', portal_id
    ).eq('deal_id', deal_id).execute()
    if not link.data:
        raise HTTPException(status_code=404, detail="Deal not found in this portal")

    # Upsert (ignore if already saved)
    supabase.table('portal_saved_deals').upsert({
        "id": str(uuid.uuid4()),
        "member_id": session['member_id'],
        "deal_id": deal_id,
        "portal_id": portal_id
    }, on_conflict='member_id,deal_id,portal_id').execute()

    # Log activity
    supabase.table('portal_activity').insert({
        "id": str(uuid.uuid4()),
        "portal_id": portal_id,
        "member_id": session['member_id'],
        "deal_id": deal_id,
        "action": "save_deal"
    }).execute()

    return {"success": True, "message": "Deal saved"}


@router.delete("/saved/{deal_id}")
async def unsave_deal(
    portal_id: str,
    deal_id: str,
    session: dict = Depends(verify_portal_session)
):
    """Remove a deal from investor's watchlist."""
    if session['portal_id'] != portal_id:
        raise HTTPException(status_code=403, detail="Session does not match portal")

    supabase = get_supabase()

    supabase.table('portal_saved_deals').delete().eq(
        'member_id', session['member_id']
    ).eq('deal_id', deal_id).eq('portal_id', portal_id).execute()

    # Log activity
    supabase.table('portal_activity').insert({
        "id": str(uuid.uuid4()),
        "portal_id": portal_id,
        "member_id": session['member_id'],
        "deal_id": deal_id,
        "action": "unsave_deal"
    }).execute()

    return {"success": True, "message": "Deal unsaved"}
