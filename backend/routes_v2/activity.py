"""
DealLinked CRM V2 - Deal Activity Routes
Activity log tracking for deals
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

from utils.db import get_supabase
from utils.auth_helpers import security, get_user_id

router = APIRouter(prefix="/deals", tags=["Activity"])
logger = logging.getLogger(__name__)


class ActivityCreate(BaseModel):
    action: str
    description: str = ""
    metadata: Optional[dict] = {}


async def log_activity(deal_id: str, user_id: str, action: str, description: str = "", metadata: dict = None):
    """Helper to log deal activity from other routes."""
    supabase = get_supabase()
    try:
        supabase.table('deal_activity').insert({
            "deal_id": deal_id,
            "user_id": user_id,
            "action": action,
            "description": description,
            "metadata": metadata or {},
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")


@router.get("/{deal_id}/activity")
async def get_deal_activity(
    deal_id: str,
    limit: int = 50,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get activity log for a deal."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)

        # Verify access
        deal = supabase.table('deals').select('owner_id, team_id').eq('id', deal_id).single().execute()
        if not deal.data:
            raise HTTPException(status_code=404, detail="Deal not found")

        is_owner = deal.data['owner_id'] == user_id
        is_team = False
        if not is_owner and deal.data.get('team_id'):
            profile = supabase.table('user_profiles').select('team_id').eq('id', user_id).execute()
            is_team = profile.data and profile.data[0].get('team_id') == deal.data['team_id']

        if not is_owner and not is_team:
            raise HTTPException(status_code=403, detail="Access denied")

        result = supabase.table('deal_activity') \
            .select('*') \
            .eq('deal_id', deal_id) \
            .order('created_at', desc=True) \
            .limit(limit) \
            .execute()

        # Enrich with user names
        activities = result.data or []
        user_ids = list(set(a['user_id'] for a in activities))
        user_map = {}
        if user_ids:
            profiles = supabase.table('user_profiles').select('id, full_name, email').in_('id', user_ids).execute()
            for p in (profiles.data or []):
                user_map[p['id']] = p.get('full_name') or p.get('email', 'Unknown')

        for a in activities:
            a['user_name'] = user_map.get(a['user_id'], 'Unknown')

        return {"success": True, "activities": activities}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get activity error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch activity")


@router.post("/{deal_id}/activity")
async def create_activity(
    deal_id: str,
    activity: ActivityCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Manually log a deal activity (e.g., a note or comment)."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)

        deal = supabase.table('deals').select('owner_id, team_id').eq('id', deal_id).single().execute()
        if not deal.data:
            raise HTTPException(status_code=404, detail="Deal not found")

        is_owner = deal.data['owner_id'] == user_id
        is_team = False
        if not is_owner and deal.data.get('team_id'):
            profile = supabase.table('user_profiles').select('team_id').eq('id', user_id).execute()
            is_team = profile.data and profile.data[0].get('team_id') == deal.data['team_id']

        if not is_owner and not is_team:
            raise HTTPException(status_code=403, detail="Access denied")

        result = supabase.table('deal_activity').insert({
            "deal_id": deal_id,
            "user_id": user_id,
            "action": activity.action,
            "description": activity.description,
            "metadata": activity.metadata or {},
        }).execute()

        return {"success": True, "activity": result.data[0] if result.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create activity error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create activity")
