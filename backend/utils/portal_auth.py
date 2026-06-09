"""
Investor Portal - Portal Auth Helper
Verifies opaque session tokens for investor access.
Completely separate from Supabase JWT auth used by brokers.
"""
from fastapi import HTTPException, Header, Query
from typing import Optional
from utils.db import get_supabase
import logging

logger = logging.getLogger(__name__)


async def verify_portal_session(x_portal_session: str = Header(...)) -> dict:
    """Verify an investor's portal session token.
    Returns {member_id, portal_id} or raises 401.
    Checks is_valid flag for instant revocation support."""
    return await _validate_token(x_portal_session)


async def verify_portal_session_flexible(
    x_portal_session: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
) -> dict:
    """Same as verify_portal_session but also accepts ?token= query param.
    Used for endpoints opened via window.open() (file downloads) where
    the browser cannot send custom request headers."""
    session_token = x_portal_session or token
    if not session_token:
        raise HTTPException(status_code=401, detail="Session token required")
    return await _validate_token(session_token)


async def _validate_token(session_token: str) -> dict:
    """Shared validation logic — looks up token in portal_sessions table."""
    supabase = get_supabase()
    try:
        result = supabase.table('portal_sessions').select(
            'member_id, portal_id, is_valid'
        ).eq('session_token', session_token).execute()

        if not result.data:
            raise HTTPException(status_code=401, detail="Invalid session")

        session = result.data[0]
        if not session['is_valid']:
            raise HTTPException(status_code=401, detail="Session revoked")

        return {
            "member_id": session['member_id'],
            "portal_id": session['portal_id']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Portal session verification error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
