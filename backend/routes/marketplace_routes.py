"""Marketplace browsing and publishing routes for DealLinked."""
from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone
import logging

from models.marketplace import SavedDeal, SavedDealCreate, DealView
from models import Deal
from utils.auth_helpers import get_current_user_supabase, security
from utils.db import get_supabase

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])
logger = logging.getLogger(__name__)


@router.get("/deals")
async def browse_marketplace_deals(
    market: Optional[str] = Query(None, description="Filter by market/city"),
    asset_type: Optional[str] = Query(None, description="Filter by asset type"),
    strategy: Optional[str] = Query(None, description="Filter by strategy"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    min_size: Optional[float] = Query(None, description="Minimum size (sqft)"),
    max_size: Optional[float] = Query(None, description="Maximum size (sqft)"),
    sort_by: str = Query("published_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    limit: int = Query(50, le=100, description="Results per page"),
    offset: int = Query(0, description="Pagination offset"),
    user = Depends(get_current_user_supabase)
):
    """
    Browse published deals in the Marketplace.
    Requires active membership.
    
    Filters are applied based on user's buy_box_preferences by default.
    """
    supabase = get_supabase()
    
    try:
        # Build query - only published and approved deals
        query = supabase.table('deals').select(
            'id, title, address, city, state, '
            'public_asset_type, public_market, public_price, public_strategy, '
            'size, lot_size, '
            'image_url, '
            'description, '
            'marketplace_views_count, marketplace_inquiries_count, marketplace_saves_count, '
            'published_at, latitude, longitude'
        ).eq('is_published', True).eq('public_status', 'published').eq('approval_status', 'approved')
        
        # Apply filters
        if market:
            query = query.eq('public_market', market)
        if asset_type:
            query = query.eq('public_asset_type', asset_type)
        if strategy:
            query = query.eq('public_strategy', strategy)
        if min_price:
            query = query.gte('public_price', min_price)
        if max_price:
            query = query.lte('public_price', max_price)
        if min_size:
            query = query.gte('size', min_size)
        if max_size:
            query = query.lte('size', max_size)
        
        # Apply sorting
        query = query.order(sort_by, desc=(sort_order == 'desc'))
        
        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        
        return {
            "deals": result.data,
            "count": len(result.data),
            "offset": offset,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Error browsing marketplace: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch marketplace deals"
        )


@router.get("/deals/{deal_id}")
async def get_marketplace_deal_detail(
    deal_id: str,
    user = Depends(get_current_user_supabase)
):
    """
    Get detailed information about a published deal.
    Records a view for analytics.
    """
    supabase = get_supabase()
    
    try:
        # Fetch deal (without owner join for now)
        deal_result = supabase.table('deals').select('*').eq(
            'id', deal_id
        ).eq('is_published', True).eq('public_status', 'published').eq('approval_status', 'approved').single().execute()
        
        if not deal_result.data:
            raise HTTPException(status_code=404, detail="Deal not found or not published")
        
        # Record view asynchronously (don't wait for it)
        try:
            supabase.table('marketplace_deal_views').insert({
                'deal_id': deal_id,
                'user_id': str(user.id),
                'viewed_at': datetime.now(timezone.utc).isoformat()
            }).execute()
        except Exception as view_error:
            logger.warning(f"Failed to record view: {str(view_error)}")
        
        return {"deal": deal_result.data}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching deal detail: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch deal details"
        )


@router.post("/deals/{deal_id}/save")
async def save_deal(
    deal_id: str,
    save_data: SavedDealCreate,
    user = Depends(get_current_user_supabase)
):
    """Save/bookmark a deal for later."""
    supabase = get_supabase()
    
    try:
        # Verify deal exists and is published
        deal_check = supabase.table('deals').select('id').eq('id', deal_id).eq('is_published', True).single().execute()
        
        if not deal_check.data:
            raise HTTPException(status_code=404, detail="Deal not found or not published")
        
        # Save the deal
        result = supabase.table('marketplace_saved_deals').insert({
            'user_id': str(user.id),
            'deal_id': deal_id,
            'notes': save_data.notes,
            'saved_at': datetime.now(timezone.utc).isoformat()
        }).execute()
        
        return {"success": True, "saved_deal": result.data[0]}
        
    except Exception as e:
        if 'duplicate' in str(e).lower() or 'unique' in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already saved this deal"
            )
        logger.error(f"Error saving deal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save deal"
        )


@router.delete("/deals/{deal_id}/save")
async def unsave_deal(
    deal_id: str,
    user = Depends(get_current_user_supabase)
):
    """Remove a deal from saved/bookmarked deals."""
    supabase = get_supabase()
    
    try:
        result = supabase.table('marketplace_saved_deals').delete().eq(
            'user_id', str(user.id)
        ).eq('deal_id', deal_id).execute()
        
        return {"success": True, "message": "Deal removed from saved list"}
        
    except Exception as e:
        logger.error(f"Error unsaving deal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unsave deal"
        )


@router.get("/saved-deals")
async def get_saved_deals(
    user = Depends(get_current_user_supabase)
):
    """Get user's saved/bookmarked deals."""
    supabase = get_supabase()
    
    try:
        result = supabase.table('marketplace_saved_deals').select(
            '*, deal:deal_id(id, title, address, public_price, public_asset_type, image_url, public_market)'
        ).eq('user_id', str(user.id)).order('saved_at', desc=True).execute()
        
        return {
            "saved_deals": result.data,
            "count": len(result.data)
        }
        
    except Exception as e:
        logger.error(f"Error fetching saved deals: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch saved deals"
        )


@router.get("/markets")
async def get_available_markets(user = Depends(get_current_user_supabase)):
    """Get list of markets with available published deals."""
    supabase = get_supabase()
    
    try:
        result = supabase.table('deals').select(
            'public_market'
        ).eq('is_published', True).eq('public_status', 'published').execute()
        
        # Get unique markets
        markets = list(set([d['public_market'] for d in result.data if d.get('public_market')]))
        markets.sort()
        
        return {"markets": markets, "count": len(markets)}
        
    except Exception as e:
        logger.error(f"Error fetching markets: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch markets"
        )


@router.get("/filters")
async def get_marketplace_filters(user = Depends(get_current_user_supabase)):
    """
    Get available filter options (markets, asset types, strategies).
    Returns user's buy_box_preferences as defaults.
    """
    supabase = get_supabase()
    
    try:
        # Get user's buy box preferences
        profile = supabase.table('user_profiles').select('buy_box_preferences').eq('id', str(user.id)).single().execute()
        buy_box = profile.data.get('buy_box_preferences', {}) if profile.data else {}
        
        # Get distinct values from published deals
        deals = supabase.table('deals').select(
            'public_market, public_asset_type, public_strategy'
        ).eq('is_published', True).eq('public_status', 'published').execute()
        
        markets = list(set([d['public_market'] for d in deals.data if d.get('public_market')]))
        asset_types = list(set([d['public_asset_type'] for d in deals.data if d.get('public_asset_type')]))
        strategies = list(set([d['public_strategy'] for d in deals.data if d.get('public_strategy')]))
        
        return {
            "user_preferences": buy_box,
            "available_filters": {
                "markets": sorted(markets),
                "asset_types": sorted(asset_types),
                "strategies": sorted(strategies)
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching filters: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch filter options"
        )
