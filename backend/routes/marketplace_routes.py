"""Marketplace browsing and publishing routes for DealLinked."""
from fastapi import APIRouter, HTTPException, Depends, Query, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone
import logging
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.marketplace import SavedDeal, SavedDealCreate, DealView
from models import Deal
from models.ncnd import (
    NCNDSignatureCreate, NCNDStatus, NCNDSignatureResponse, generate_ncnd_text
)
from utils.auth_helpers import get_current_user_supabase, security
from utils.db import get_supabase
from constants.asset_types import COMPREHENSIVE_ASSET_TYPES, LEGACY_ASSET_TYPES, ALL_ASSET_TYPES

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
        # Include owner_id and seller_commitment_level for ranking
        query = supabase.table('deals').select(
            'id, title, address, city, state, owner_id, '
            'public_asset_type, public_market, public_price, public_strategy, '
            'size, lot_size, '
            'image_url, '
            'description, '
            'seller_commitment_level, '
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
        
        # Apply sorting (default by published_at, but can be overridden)
        query = query.order(sort_by, desc=(sort_order == 'desc'))
        
        # Apply pagination
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        
        # Fetch broker quality scores for all deals and sort by quality
        deals_with_scores = []
        for deal in result.data:
            broker_quality = 50  # Default for new brokers
            commitment_priority = 2  # Default priority
            
            # Get broker reputation
            if deal.get('owner_id'):
                try:
                    rep_result = supabase.table('broker_reputation').select('quality_score').eq(
                        'broker_id', deal['owner_id']
                    ).single().execute()
                    if rep_result.data:
                        broker_quality = rep_result.data.get('quality_score', 50)
                except:
                    pass
            
            # Determine commitment priority (higher = better)
            commitment_level = deal.get('seller_commitment_level')
            if commitment_level == 'signed_listing':
                commitment_priority = 3
            elif commitment_level == 'written_auth':
                commitment_priority = 2
            elif commitment_level == 'verbal_maybe':
                commitment_priority = 1
            
            deals_with_scores.append({
                **deal,
                'broker_quality_score': broker_quality,
                'commitment_priority': commitment_priority
            })
        
        # Sort by commitment priority first, then broker quality, then published date
        deals_with_scores.sort(
            key=lambda x: (
                x['commitment_priority'],
                x['broker_quality_score'],
                x.get('published_at', '')
            ),
            reverse=True
        )
        
        return {
            "deals": deals_with_scores,
            "count": len(deals_with_scores),
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
    Returns comprehensive asset types list and user's buy_box_preferences as defaults.
    """
    supabase = get_supabase()
    
    try:
        # Get user's buy box preferences
        profile = supabase.table('user_profiles').select('buy_box_preferences').eq('id', str(user.id)).single().execute()
        buy_box = profile.data.get('buy_box_preferences', {}) if profile.data else {}
        
        # Get distinct values from published deals for markets and strategies
        deals = supabase.table('deals').select(
            'public_market, public_asset_type, public_strategy'
        ).eq('is_published', True).eq('public_status', 'published').execute()
        
        markets = list(set([d['public_market'] for d in deals.data if d.get('public_market')]))
        # Get asset types from deals but also include all comprehensive types
        deal_asset_types = list(set([d['public_asset_type'] for d in deals.data if d.get('public_asset_type')]))
        # Combine and deduplicate: prioritize comprehensive types, then add any custom types from deals
        all_types = sorted(list(set(COMPREHENSIVE_ASSET_TYPES + deal_asset_types)))
        strategies = list(set([d['public_strategy'] for d in deals.data if d.get('public_strategy')]))
        
        return {
            "user_preferences": buy_box,
            "available_filters": {
                "markets": sorted(markets) if markets else ["Austin", "San Antonio", "Dallas", "Houston"],
                "asset_types": all_types,
                "strategies": sorted(strategies) if strategies else ["Core", "Core Plus", "Value Add", "Opportunistic"]
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching filters: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch filter options"
        )


# ============================================================
# NCND Digital Signature Endpoints
# ============================================================

@router.get("/deals/{deal_id}/ncnd-status", response_model=NCNDStatus)
async def get_ncnd_status(
    deal_id: str,
    user = Depends(get_current_user_supabase)
):
    """
    Check if user has signed NCND for this deal.
    Returns signature status including expiration.
    """
    supabase = get_supabase()
    
    try:
        # Check if deal exists and requires NCND
        deal_result = supabase.table('deals').select(
            'id, ncnd_required'
        ).eq('id', deal_id).eq('is_published', True).single().execute()
        
        if not deal_result.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        requires_signature = deal_result.data.get('ncnd_required', True)
        
        # Check for existing active signature
        signature_result = supabase.table('ncnd_signatures').select('*').eq(
            'user_id', str(user.id)
        ).eq('deal_id', deal_id).eq('is_active', True).execute()
        
        if signature_result.data and len(signature_result.data) > 0:
            signature = signature_result.data[0]
            expires_at = datetime.fromisoformat(signature['expires_at'].replace('Z', '+00:00'))
            is_expired = expires_at < datetime.now(timezone.utc)
            
            return NCNDStatus(
                has_signed=True,
                is_expired=is_expired,
                signature=signature,
                requires_signature=requires_signature
            )
        
        return NCNDStatus(
            has_signed=False,
            is_expired=False,
            signature=None,
            requires_signature=requires_signature
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking NCND status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check NCND status"
        )


@router.post("/deals/{deal_id}/sign-ncnd", response_model=NCNDSignatureResponse)
async def sign_ncnd(
    deal_id: str,
    signature_data: NCNDSignatureCreate,
    request: Request,
    user = Depends(get_current_user_supabase)
):
    """
    Sign NCND agreement for a deal.
    Records signature with user info, IP, and timestamp.
    """
    supabase = get_supabase()
    
    try:
        # Get deal details
        deal_result = supabase.table('deals').select(
            'id, address, city, state'
        ).eq('id', deal_id).eq('is_published', True).single().execute()
        
        if not deal_result.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        # Get user profile details
        profile_result = supabase.table('user_profiles').select(
            'first_name, last_name, email'
        ).eq('id', str(user.id)).single().execute()
        
        if not profile_result.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        profile = profile_result.data
        user_full_name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
        user_email = profile.get('email', user.email)
        
        # Format property address
        deal = deal_result.data
        property_address = f"{deal.get('address', '')}, {deal.get('city', '')}, {deal.get('state', '')}"
        
        # Generate agreement text with filled fields
        agreement_text = generate_ncnd_text(property_address, user_full_name)
        
        # Get client IP and user agent
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent', '')
        
        # Check for existing signature (deactivate if exists)
        existing = supabase.table('ncnd_signatures').select('id').eq(
            'user_id', str(user.id)
        ).eq('deal_id', deal_id).eq('is_active', True).execute()
        
        if existing.data and len(existing.data) > 0:
            # Deactivate old signature
            supabase.table('ncnd_signatures').update({
                'is_active': False
            }).eq('id', existing.data[0]['id']).execute()
        
        # Create new signature
        now = datetime.now(timezone.utc)
        signature_record = {
            'user_id': str(user.id),
            'deal_id': deal_id,
            'property_address': property_address,
            'user_full_name': user_full_name,
            'user_email': user_email,
            'signature_data': signature_data.signature_data,
            'ip_address': client_ip,
            'user_agent': user_agent,
            'agreement_text': agreement_text,
            'signed_at': now.isoformat(),
            'is_active': True
        }
        
        result = supabase.table('ncnd_signatures').insert(signature_record).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create signature"
            )
        
        created_signature = result.data[0]
        expires_at = datetime.fromisoformat(created_signature['expires_at'].replace('Z', '+00:00'))
        
        # Update deal signature count
        try:
            supabase.rpc('increment_ncnd_count', {'deal_id': deal_id}).execute()
        except:
            # If function doesn't exist, do manual update
            current_count = supabase.table('deals').select('ncnd_signatures_count').eq('id', deal_id).single().execute()
            new_count = (current_count.data.get('ncnd_signatures_count', 0) or 0) + 1
            supabase.table('deals').update({'ncnd_signatures_count': new_count}).eq('id', deal_id).execute()
        
        return NCNDSignatureResponse(
            success=True,
            message="NCND agreement signed successfully",
            signature_id=created_signature['id'],
            expires_at=expires_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error signing NCND: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sign NCND: {str(e)}"
        )


@router.get("/deals/{deal_id}/ncnd-text")
async def get_ncnd_text(
    deal_id: str,
    user = Depends(get_current_user_supabase)
):
    """
    Get the NCND agreement text with user and property details filled in.
    Used by frontend to display the agreement before signing.
    """
    supabase = get_supabase()
    
    try:
        # Get deal details
        deal_result = supabase.table('deals').select(
            'id, address, city, state'
        ).eq('id', deal_id).eq('is_published', True).single().execute()
        
        if not deal_result.data:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        # Get user profile
        profile_result = supabase.table('user_profiles').select(
            'first_name, last_name'
        ).eq('id', str(user.id)).single().execute()
        
        if not profile_result.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        profile = profile_result.data
        user_full_name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
        
        # Format property address
        deal = deal_result.data
        property_address = f"{deal.get('address', '')}, {deal.get('city', '')}, {deal.get('state', '')}"
        
        # Generate agreement text
        agreement_text = generate_ncnd_text(property_address, user_full_name)
        
        return {
            "agreement_text": agreement_text,
            "property_address": property_address,
            "user_full_name": user_full_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching NCND text: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch NCND text"
        )

