"""
DealLinked CRM V2 - Asset Type Management Routes
Dynamic asset type CRUD for user customization
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import logging

from utils.db import get_supabase
from utils.auth_helpers import security, get_user_id

router = APIRouter(prefix="/asset-types", tags=["Asset Types"])
logger = logging.getLogger(__name__)

DEFAULT_ASSET_TYPES = [
    {"name": "Office", "color": "#3b82f6", "sort_order": 0},
    {"name": "Retail", "color": "#10b981", "sort_order": 1},
    {"name": "Industrial", "color": "#f59e0b", "sort_order": 2},
    {"name": "Multifamily", "color": "#8b5cf6", "sort_order": 3},
    {"name": "Land", "color": "#ec4899", "sort_order": 4},
    {"name": "Mixed Use", "color": "#06b6d4", "sort_order": 5},
    {"name": "Hotels", "color": "#a855f7", "sort_order": 6},
    {"name": "Medical", "color": "#14b8a6", "sort_order": 7},
    {"name": "Gas Stations", "color": "#e879f9", "sort_order": 8},
    {"name": "Other", "color": "#6b7280", "sort_order": 9},
]


class AssetTypeCreate(BaseModel):
    name: str
    color: Optional[str] = "#6b7280"


class AssetTypeUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


@router.get("")
async def get_asset_types(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get all asset types for the user. Initializes defaults if none exist."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)

        result = supabase.table('asset_types') \
            .select('*') \
            .eq('owner_id', user_id) \
            .order('sort_order') \
            .execute()

        types = result.data or []

        # Initialize defaults if empty
        if not types:
            for d in DEFAULT_ASSET_TYPES:
                supabase.table('asset_types').insert({
                    "owner_id": user_id,
                    "name": d["name"],
                    "color": d["color"],
                    "sort_order": d["sort_order"],
                    "is_default": True,
                }).execute()

            result = supabase.table('asset_types') \
                .select('*') \
                .eq('owner_id', user_id) \
                .order('sort_order') \
                .execute()
            types = result.data or []

        return {"success": True, "asset_types": types}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get asset types error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch asset types")


@router.post("")
async def create_asset_type(
    asset_type: AssetTypeCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new custom asset type."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)

        # Get max sort_order
        existing = supabase.table('asset_types') \
            .select('sort_order') \
            .eq('owner_id', user_id) \
            .order('sort_order', desc=True) \
            .limit(1) \
            .execute()
        next_order = (existing.data[0]['sort_order'] + 1) if existing.data else 0

        result = supabase.table('asset_types').insert({
            "owner_id": user_id,
            "name": asset_type.name,
            "color": asset_type.color,
            "sort_order": next_order,
            "is_default": False,
        }).execute()

        return {"success": True, "asset_type": result.data[0] if result.data else None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create asset type error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create asset type")


@router.put("/{type_id}")
async def update_asset_type(
    type_id: str,
    asset_type: AssetTypeUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update an asset type."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)

        update_data = {}
        if asset_type.name is not None:
            update_data["name"] = asset_type.name
        if asset_type.color is not None:
            update_data["color"] = asset_type.color

        result = supabase.table('asset_types') \
            .update(update_data) \
            .eq('id', type_id) \
            .eq('owner_id', user_id) \
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Asset type not found")

        return {"success": True, "asset_type": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update asset type error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update asset type")


@router.delete("/{type_id}")
async def delete_asset_type(
    type_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a custom asset type."""
    supabase = get_supabase()
    try:
        user_id = await get_user_id(credentials)

        supabase.table('asset_types') \
            .delete() \
            .eq('id', type_id) \
            .eq('owner_id', user_id) \
            .execute()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete asset type error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete asset type")
