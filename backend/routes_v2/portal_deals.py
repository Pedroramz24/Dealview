"""
Investor Portal - Portal Deals Management
Add/remove CRM deals to/from a portal.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List
from utils.db import get_supabase
from utils.auth_helpers import security, get_user_id
from utils.portal_access import verify_portal_access
import logging
import uuid

router = APIRouter(prefix="/portals/{portal_id}/deals", tags=["Portal Deals"])
logger = logging.getLogger(__name__)

# Presentation-safe deal fields (never leak broker internals)
SAFE_DEAL_FIELDS = (
    "id, title, address, city, state, zip_code, latitude, longitude, "
    "asset_type, asking_price, size_sqft, lot_size, year_built, occupancy, "
    "zoning, noi, cap_rate, annual_income, annual_expenses, image_url, image_urls"
)


class AddDeals(BaseModel):
    deal_ids: List[str]


@router.get("")
async def list_portal_deals(portal_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """List all deals in a portal with presentation-safe fields + asset type summary."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)
    await verify_portal_access(portal_id, user_id)

    # Get deal IDs in this portal
    links = supabase.table('portal_deals').select('deal_id').eq('portal_id', portal_id).execute()
    deal_ids = [row['deal_id'] for row in (links.data or [])]

    if not deal_ids:
        return {"success": True, "deals": [], "asset_types": []}

    # Fetch deals with safe fields only
    deals_result = supabase.table('deals').select(SAFE_DEAL_FIELDS).in_('id', deal_ids).execute()
    deals = deals_result.data or []

    # Build asset type summary for filter UI
    asset_types = sorted(set(d['asset_type'] for d in deals if d.get('asset_type')))

    return {"success": True, "deals": deals, "asset_types": asset_types}


@router.post("")
async def add_deals_to_portal(portal_id: str, body: AddDeals, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Add one or more deals to a portal."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)
    await verify_portal_access(portal_id, user_id)

    # Verify all deals belong to the broker
    for deal_id in body.deal_ids:
        deal = supabase.table('deals').select('owner_id').eq('id', deal_id).execute()
        if not deal.data or deal.data[0]['owner_id'] != user_id:
            raise HTTPException(status_code=403, detail=f"Deal {deal_id} not found or not owned by you")

    # Upsert portal_deals rows (ignore duplicates via unique constraint)
    rows = [{"id": str(uuid.uuid4()), "portal_id": portal_id, "deal_id": did} for did in body.deal_ids]
    supabase.table('portal_deals').upsert(rows, on_conflict='portal_id,deal_id').execute()

    return {"success": True, "added": len(body.deal_ids)}


@router.delete("/{deal_id}")
async def remove_deal_from_portal(portal_id: str, deal_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Remove a deal from a portal."""
    supabase = get_supabase()
    user_id = await get_user_id(credentials)
    await verify_portal_access(portal_id, user_id)

    supabase.table('portal_deals').delete().eq('portal_id', portal_id).eq('deal_id', deal_id).execute()
    return {"success": True, "message": "Deal removed from portal"}
