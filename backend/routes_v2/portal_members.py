"""
Investor Portal - Portal Members Management
Invite investors, manage access codes, revoke/restore access.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from utils.db import get_supabase
from utils.auth_helpers import security, get_user_id
from utils.portal_access import verify_portal_access
import logging
import uuid
import secrets
import string

router = APIRouter(prefix="/portals/{portal_id}/members", tags=["Portal Members"])
logger = logging.getLogger(__name__)


def _generate_access_code(length: int = 8) -> str:
    """Generate a unique alphanumeric access code."""
    alphabet = string.ascii_uppercase + string.digits
    # Remove ambiguous characters (0/O, 1/I/L)
    alphabet = alphabet.replace('O', '').replace('0', '').replace('I', '').replace('L', '').replace('1', '')
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class MemberCreate(BaseModel):
    name: str
    email: Optional[str] = None


async def _verify_portal_owner(portal_id: str, user_id: str):
    """Only the portal owner can manage collaborators — kept for owner-only ops."""
    supabase = get_supabase()
    result = supabase.table('portals').select('broker_id').eq('id', portal_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Portal not found")
    if result.data[0]['broker_id'] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")


@router.get("")
async def list_members(portal_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """List all members of a portal with status info."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)
    await verify_portal_access(portal_id, user_id)

    result = supabase.table('portal_members').select(
        'id, portal_id, name, email, access_code, status, invited_at, activated_at, revoked_at'
    ).eq('portal_id', portal_id).order('invited_at', desc=True).execute()

    return {"success": True, "members": result.data or []}


@router.post("")
async def create_member(portal_id: str, body: MemberCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Invite a new investor to the portal. Returns the access code."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)
    await verify_portal_access(portal_id, user_id)

    # Generate unique access code (retry on collision)
    for _ in range(5):
        code = _generate_access_code()
        existing = supabase.table('portal_members').select('id').eq('access_code', code).execute()
        if not existing.data:
            break
    else:
        raise HTTPException(status_code=500, detail="Failed to generate unique code")

    member_data = {
        "id": str(uuid.uuid4()),
        "portal_id": portal_id,
        "name": body.name.strip(),
        "email": body.email.strip() if body.email else None,
        "access_code": code,
        "status": "invited"
    }
    result = supabase.table('portal_members').insert(member_data).execute()
    member = result.data[0] if result.data else member_data

    return {"success": True, "member": member}


@router.post("/{member_id}/regenerate-code")
async def regenerate_code(portal_id: str, member_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Generate a new access code for a member. Invalidates all existing sessions."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)
    await verify_portal_access(portal_id, user_id)

    # Verify member exists in this portal
    member = supabase.table('portal_members').select('id, status').eq('id', member_id).eq('portal_id', portal_id).execute()
    if not member.data:
        raise HTTPException(status_code=404, detail="Member not found")

    # Generate new code
    for _ in range(5):
        code = _generate_access_code()
        existing = supabase.table('portal_members').select('id').eq('access_code', code).execute()
        if not existing.data:
            break

    # Update code and invalidate all sessions
    supabase.table('portal_members').update({
        "access_code": code,
        "status": "invited"
    }).eq('id', member_id).execute()

    supabase.table('portal_sessions').update({"is_valid": False}).eq('member_id', member_id).execute()

    return {"success": True, "access_code": code}


@router.put("/{member_id}/revoke")
async def revoke_member(portal_id: str, member_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Revoke an investor's access. Instantly invalidates all sessions."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)
    await verify_portal_access(portal_id, user_id)

    member = supabase.table('portal_members').select('id').eq('id', member_id).eq('portal_id', portal_id).execute()
    if not member.data:
        raise HTTPException(status_code=404, detail="Member not found")

    supabase.table('portal_members').update({
        "status": "revoked",
        "revoked_at": "now()"
    }).eq('id', member_id).execute()

    # Kill all sessions immediately
    supabase.table('portal_sessions').update({"is_valid": False}).eq('member_id', member_id).execute()

    return {"success": True, "message": "Access revoked"}


@router.put("/{member_id}/restore")
async def restore_member(portal_id: str, member_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Restore a revoked investor. Generates a new access code."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)
    await verify_portal_access(portal_id, user_id)

    member = supabase.table('portal_members').select('id, status').eq('id', member_id).eq('portal_id', portal_id).execute()
    if not member.data:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.data[0]['status'] != 'revoked':
        raise HTTPException(status_code=400, detail="Member is not revoked")

    # New code on restore
    for _ in range(5):
        code = _generate_access_code()
        existing = supabase.table('portal_members').select('id').eq('access_code', code).execute()
        if not existing.data:
            break

    supabase.table('portal_members').update({
        "status": "invited",
        "access_code": code,
        "revoked_at": None
    }).eq('id', member_id).execute()

    return {"success": True, "access_code": code}
