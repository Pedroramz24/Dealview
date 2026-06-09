"""
Shared portal access verification.
Checks if a user is the portal owner OR a portal collaborator.
"""
from fastapi import HTTPException
from utils.db import get_supabase


async def verify_portal_access(portal_id: str, user_id: str) -> dict:
    """
    Verify user has access to the portal (owner or collaborator).
    Returns the portal row on success.
    """
    supabase = get_supabase()
    result = supabase.table('portals').select('id, broker_id, name').eq('id', portal_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Portal not found")

    portal = result.data[0]
    if portal['broker_id'] == user_id:
        return portal

    collab = supabase.table('portal_collaborators').select('id').eq(
        'portal_id', portal_id
    ).eq('user_id', user_id).execute()
    if collab.data:
        return portal

    raise HTTPException(status_code=403, detail="Access denied")
