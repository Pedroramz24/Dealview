"""
Portal Collaborators — Invite team members to manage portals.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from utils.db import get_supabase
from utils.auth_helpers import security, get_user_id
from utils.portal_access import verify_portal_access
import logging
import uuid

router = APIRouter(prefix="/portals/{portal_id}/collaborators", tags=["Portal Collaborators"])
logger = logging.getLogger(__name__)


class CollaboratorAdd(BaseModel):
    user_id: str
    role: str = "manager"


async def _verify_portal_owner(portal_id: str, user_id: str):
    """Only the portal owner can manage collaborators."""
    supabase = get_supabase()
    result = supabase.table('portals').select('broker_id').eq('id', portal_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Portal not found")
    if result.data[0]['broker_id'] != user_id:
        raise HTTPException(status_code=403, detail="Only the portal owner can manage team access")


@router.get("")
async def list_collaborators(portal_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """List all team members with access to this portal."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)
    await verify_portal_access(portal_id, user_id)

    collabs = supabase.table('portal_collaborators').select('*').eq('portal_id', portal_id).order('added_at', desc=True).execute()
    collaborators = collabs.data or []

    # Enrich with user profile info
    user_ids = [c['user_id'] for c in collaborators]
    profiles = {}
    if user_ids:
        prof_result = supabase.table('user_profiles').select('id, full_name, email, avatar_url').in_('id', user_ids).execute()
        for p in (prof_result.data or []):
            profiles[p['id']] = p

    for c in collaborators:
        profile = profiles.get(c['user_id'], {})
        c['full_name'] = profile.get('full_name', 'Unknown')
        c['email'] = profile.get('email', '')
        c['avatar_url'] = profile.get('avatar_url')

    return {"success": True, "collaborators": collaborators}


@router.post("")
async def add_collaborator(portal_id: str, body: CollaboratorAdd, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Add a team member as a portal collaborator. Only portal owner can do this."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)
    await _verify_portal_owner(portal_id, user_id)

    if body.user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a collaborator — you are the owner")

    # Verify target user is on the same team
    owner_profile = supabase.table('user_profiles').select('team_id').eq('id', user_id).execute()
    target_profile = supabase.table('user_profiles').select('team_id, full_name, email').eq('id', body.user_id).execute()

    if not target_profile.data:
        raise HTTPException(status_code=404, detail="User not found")

    owner_team = (owner_profile.data[0] if owner_profile.data else {}).get('team_id')
    target_team = target_profile.data[0].get('team_id')

    if not owner_team or owner_team != target_team:
        raise HTTPException(status_code=403, detail="User must be on the same team")

    # Check if already a collaborator
    existing = supabase.table('portal_collaborators').select('id').eq(
        'portal_id', portal_id
    ).eq('user_id', body.user_id).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="User already has access to this portal")

    collab_data = {
        "id": str(uuid.uuid4()),
        "portal_id": portal_id,
        "user_id": body.user_id,
        "role": body.role,
        "added_by": user_id,
    }
    result = supabase.table('portal_collaborators').insert(collab_data).execute()
    collab = result.data[0] if result.data else collab_data

    # Enrich with profile
    collab['full_name'] = target_profile.data[0].get('full_name', 'Unknown')
    collab['email'] = target_profile.data[0].get('email', '')

    return {"success": True, "collaborator": collab}


@router.delete("/{target_user_id}")
async def remove_collaborator(portal_id: str, target_user_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Remove a team member's portal access. Only portal owner can do this."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)
    await _verify_portal_owner(portal_id, user_id)

    result = supabase.table('portal_collaborators').delete().eq(
        'portal_id', portal_id
    ).eq('user_id', target_user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Collaborator not found")

    return {"success": True, "message": "Collaborator removed"}
