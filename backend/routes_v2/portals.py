"""
Investor Portal - Broker Portal CRUD
Create, list, update, delete portals.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from utils.db import get_supabase
from utils.auth_helpers import security, get_user_id
import logging
import uuid

from utils.portal_access import verify_portal_access

router = APIRouter(prefix="/portals", tags=["Portals"])
logger = logging.getLogger(__name__)


class PortalCreate(BaseModel):
    name: str


class PortalUpdate(BaseModel):
    name: str


@router.get("")
async def list_portals(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """List all portals owned by the current broker + portals shared with them."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)

    # Owned portals
    owned = supabase.table('portals').select('*').eq(
        'broker_id', user_id
    ).order('created_at', desc=True).execute()
    portals = owned.data or []
    owned_ids = {p['id'] for p in portals}

    # Portals where user is a collaborator
    collabs = supabase.table('portal_collaborators').select('portal_id').eq('user_id', user_id).execute()
    collab_portal_ids = [c['portal_id'] for c in (collabs.data or []) if c['portal_id'] not in owned_ids]
    if collab_portal_ids:
        shared = supabase.table('portals').select('*').in_('id', collab_portal_ids).execute()
        for p in (shared.data or []):
            p['is_collaborator'] = True
            portals.append(p)

    # Batch fetch deal and member counts
    portal_ids = [p['id'] for p in portals]
    deal_counts = {}
    member_counts = {}
    if portal_ids:
        all_portal_deals = supabase.table('portal_deals').select('portal_id').in_('portal_id', portal_ids).execute()
        for pd in (all_portal_deals.data or []):
            deal_counts[pd['portal_id']] = deal_counts.get(pd['portal_id'], 0) + 1

        all_portal_members = supabase.table('portal_members').select('portal_id').in_('portal_id', portal_ids).execute()
        for pm in (all_portal_members.data or []):
            member_counts[pm['portal_id']] = member_counts.get(pm['portal_id'], 0) + 1

    for p in portals:
        p['deal_count'] = deal_counts.get(p['id'], 0)
        p['member_count'] = member_counts.get(p['id'], 0)

    return {"success": True, "portals": portals}


@router.get("/{portal_id}")
async def get_portal(portal_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get a single portal with counts. Accessible by owner or collaborator."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)

    # Verify access (owner OR collaborator)
    await verify_portal_access(portal_id, user_id)

    # Fetch full portal data
    result = supabase.table('portals').select('*').eq('id', portal_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Portal not found")

    portal = result.data[0]
    portal['is_collaborator'] = portal['broker_id'] != user_id

    dc = supabase.table('portal_deals').select('id', count='exact').eq('portal_id', portal_id).execute()
    mc = supabase.table('portal_members').select('id', count='exact').eq('portal_id', portal_id).execute()
    portal['deal_count'] = dc.count if dc.count is not None else len(dc.data or [])
    portal['member_count'] = mc.count if mc.count is not None else len(mc.data or [])

    return {"success": True, "portal": portal}


@router.post("")
async def create_portal(body: PortalCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new portal."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)

    data = {
        "id": str(uuid.uuid4()),
        "broker_id": user_id,
        "name": body.name.strip()
    }
    result = supabase.table('portals').insert(data).execute()
    portal = result.data[0] if result.data else data

    return {"success": True, "portal": portal}


@router.put("/{portal_id}")
async def update_portal(portal_id: str, body: PortalUpdate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Rename a portal."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)

    existing = supabase.table('portals').select('broker_id').eq('id', portal_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Portal not found")
    if existing.data[0]['broker_id'] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    result = supabase.table('portals').update({"name": body.name.strip()}).eq('id', portal_id).execute()
    return {"success": True, "portal": result.data[0] if result.data else None}


@router.delete("/{portal_id}")
async def delete_portal(portal_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a portal. Cascade handles deals, members, sessions, activity."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)

    existing = supabase.table('portals').select('broker_id').eq('id', portal_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Portal not found")
    if existing.data[0]['broker_id'] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    supabase.table('portals').delete().eq('id', portal_id).execute()
    return {"success": True, "message": "Portal deleted"}
